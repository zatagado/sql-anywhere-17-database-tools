import {
    commands,
    Disposable,
    ExtensionContext,
    TextEditor,
    ViewColumn,
    Uri,
    WebviewPanel,
    window,
    workspace,
    TextDocument
} from 'vscode';
import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { selectDatasource } from '../selection/datasourcePick';
import { ResultsRest } from '../../rest/results/resultsRest';
import { NodeOdbcError } from 'odbc';
import { SqlManager } from '../../manager/sqlManager';

const ROW_BATCH_SIZE = 1000000;

function getMaxResultRows(): number {
    return workspace.getConfiguration('sql-anywhere-17-database-tools.results').get<number>('maxRows', 10000);
}

function waitForWebviewReady(panel: WebviewPanel, timeoutMs = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
            console.warn('[sql-anywhere-17-database-tools] webview ready timeout, continuing anyway');
            settle('resolve');
        }, timeoutMs);

        const settle = (action: 'resolve' | 'reject', error?: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeout);
            messageSub.dispose();
            disposeSub.dispose();
            if (action === 'resolve') {
                resolve();
            } else {
                reject(error);
            }
        };

        const messageSub = panel.webview.onDidReceiveMessage((msg: { type?: string }) => {
            if (msg?.type === 'onWebviewReady') {
                settle('resolve');
            }
        });
        const disposeSub = panel.onDidDispose(() => {
            settle('reject', new Error('Webview was closed before it became ready'));
        });
    });
}

function createResultsPanel(
    context: ExtensionContext,
    title: string,
    viewColumn: ViewColumn,
    document: TextDocument
): { panel: WebviewPanel; ready: Promise<void> } {
    const panel = window.createWebviewPanel('webview', title, { viewColumn }, {
        enableScripts: true,
        retainContextWhenHidden: true
    });
    panel.iconPath = {
        light: Uri.joinPath(context.extensionUri, 'resources', 'light', 'result-set.svg'),
        dark: Uri.joinPath(context.extensionUri, 'resources', 'dark', 'result-set.svg')
    };
    panel.onDidDispose(() => {
        const entry = Results.map.get(document);
        if (!entry) {
            return;
        }
        entry.panels = entry.panels.filter(mapPanel => mapPanel !== panel);
        if (entry.panels.length === 0) {
            entry.dataSource = null;
        }
    });
    const ready = waitForWebviewReady(panel);
    panel.webview.html = getResultsWebviewHtml(panel, context.extensionUri);
    panel.webview.postMessage({ type: 'checkReady' });
    return { panel, ready };
}

export type ResultsEntry = {
    editor: TextEditor;
    dataSource: DataSource | null;
    panels: WebviewPanel[];
    queryGeneration: number;
};

export class Results {
    static map = new Map<TextDocument, ResultsEntry>();
}

function getResultsWebviewHtml(panel: WebviewPanel, extensionUri: Uri): string {
    const scriptSrc = panel.webview.asWebviewUri(Uri.joinPath(extensionUri, 'web', 'dist', 'assets', 'index.js'));
    const cssSrc = panel.webview.asWebviewUri(Uri.joinPath(extensionUri, 'web', 'dist', 'assets', 'index.css'));
    const loadingSvg = panel.webview.asWebviewUri(Uri.joinPath(extensionUri, 'web', 'resources', 'loading.svg'));

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <link rel="stylesheet" href="${cssSrc}" />
                <style>
                    html, body { height: 100%; margin: 0; }
                    #app { min-height: 100%; }
                    .results-webview-boot {
                        box-sizing: border-box;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        min-height: 100vh;
                        padding: 1rem;
                    }
                    .results-webview-boot-spinner {
                        width: 48px;
                        height: 48px;
                        flex-shrink: 0;
                        background-color: var(--vscode-foreground);
                        mask-image: url('${loadingSvg}');
                        mask-position: center;
                        mask-repeat: no-repeat;
                        mask-size: contain;
                        animation: results-webview-boot-spin 0.9s linear infinite;
                    }
                    @keyframes results-webview-boot-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="app">
                    <div class="results-webview-boot">
                        <div class="results-webview-boot-spinner"></div>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    window.__vscodeApi__ = vscode;
                    window.__VSCODE_WEBVIEW_VIEW__ = 'queryResults';
                </script>
                <script type="module" src="${scriptSrc}"></script>
            </body>
            </html>`;
}

// TODO make a class to keep track of the results views and their editors. if an existing editor is passed in, clear all unused panels for that editor.
// TODO make it a map of the full path of the file to the panel.

export async function selectObject(dataSource: DataSource, objectName: string): Promise<void> {
    const sql = SqlManager.getSqlQueries(dataSource.getType())!
        .results.selectFromObject.replace('$objectName', objectName);
    await commands.executeCommand('sql-anywhere-17-database-tools.newScratchSqlFile', sql);
    await commands.executeCommand('sql-anywhere-17-database-tools.results.execute', dataSource);
}

function formatExecutionError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'odbcErrors' in error) {
        return (error as NodeOdbcError).odbcErrors.map(e => `[${e.state}] ${e.message}`).join('\n');
    }
    return (error as Error).message;
}

export function activate(context: ExtensionContext): Disposable[] {

    async function resultsView(selectedDataSource: DataSource | null = null) {
        // TODO depending on the number of queries, create multiple panels
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'sql') {
            return;
        }

        const file = Uri.file(document.fileName);
        const shortName = file.path.split('/').pop()!;
        // TODO get the short name. if it already exists, change both panel titles to the workspace relative path.
        const queries: string = document.getText(editor.selection.isEmpty ? undefined : editor.selection);

        let resultEntry: ResultsEntry | undefined = Results.map.get(document);
        const hadExistingDataSource = (resultEntry?.dataSource ?? null) !== null;
        let dataSource: DataSource | null = selectedDataSource ?? resultEntry?.dataSource ?? null;
        if (!dataSource) {
            dataSource = await selectDatasource(context);
            if (!dataSource) {
                return;
            }
        }

        if (resultEntry) {
            resultEntry.dataSource = dataSource;
        }
        else {
            const sqlDocumentUri = document.uri.toString();
            const onThisSqlDocumentClosed = workspace.onDidCloseTextDocument(doc => {
                if (doc.uri.toString() !== sqlDocumentUri) {
                    return;
                }
                if (!Results.map.has(document)) {
                    return;
                }
                Results.map.delete(document);
                onThisSqlDocumentClosed.dispose(); // TODO does this dispose for just the one document, or all of them?
            });
            context.subscriptions.push(onThisSqlDocumentClosed);

            resultEntry = {
                editor: editor,
                dataSource: dataSource,
                panels: [],
                queryGeneration: 0
            };
            Results.map.set(document, resultEntry);
        }

        resultEntry.queryGeneration += 1;
        const queryGeneration = resultEntry.queryGeneration;

        // Need to create at least one panel to indicate we are loading.
        const panelTitle = `${dataSource.getName()} - ${shortName}`;
        let firstPanelReady: Promise<void> | undefined;
        if (resultEntry.panels.length === 0) {
            await window.showTextDocument(editor.document, {
                viewColumn: editor.viewColumn ?? ViewColumn.Active
            });
            await commands.executeCommand('workbench.action.newGroupBelow');
            const { panel, ready } = createResultsPanel(
                context,
                panelTitle,
                ViewColumn.Active,
                document
            );
            firstPanelReady = ready;
            resultEntry.panels.push(panel);
        }
        else {
            // Dispose of all panels that are not the first one.
            while (resultEntry.panels.length > 1) {
                resultEntry.panels.pop()!.dispose();
            }
            resultEntry.panels = [resultEntry.panels[0]!];
            resultEntry.panels[0]!.title = panelTitle;
        }

        const firstPanel = resultEntry.panels[0]!;
        firstPanel.reveal(firstPanel.viewColumn!, false);

        const postToPanel = (panel: WebviewPanel, message: object) => {
            if (queryGeneration === resultEntry!.queryGeneration) {
                panel.webview.postMessage({ ...message, generation: queryGeneration });
            }
        };

        try {
            if (firstPanelReady) {
                await firstPanelReady;
            }
            if (queryGeneration !== resultEntry.queryGeneration) {
                return;
            }
            postToPanel(firstPanel, { type: 'onQueryLoading' });
        } catch (e) {
            postToPanel(firstPanel, {
                type: 'onQueryError',
                message: formatExecutionError(e)
            });
            return;
        }

        ResultsRest.executeScript(dataSource, queries, !hadExistingDataSource,
            { maxRows: getMaxResultRows() }).then(async resultSets => {
            if (queryGeneration !== resultEntry!.queryGeneration) {
                return;
            }
            try {
                const additionalReadyPromises: Promise<void>[] = [];
                for (let i = 1; i < resultSets.length; i++) {
                    const { panel, ready } = createResultsPanel(
                        context,
                        `${panelTitle} (${i + 1})`,
                        firstPanel.viewColumn!,
                        document
                    );
                    additionalReadyPromises.push(ready);
                    resultEntry!.panels.push(panel);
                }

                await Promise.all(additionalReadyPromises);
                if (queryGeneration !== resultEntry!.queryGeneration) {
                    return;
                }

                firstPanel.reveal(firstPanel.viewColumn ?? ViewColumn.Active, false);

                for (const panel of resultEntry!.panels) {
                    postToPanel(panel, { type: 'onQueryLoading' });
                }

                for (let i = 0; i < resultSets.length; i++) {
                    if (queryGeneration !== resultEntry!.queryGeneration) {
                        return;
                    }
                    const panel = resultEntry!.panels[i]!;
                    const resultSet = resultSets[i];
                    const rows = Array.from(resultSet);
                    const rowCount = rows.length;

                    postToPanel(panel, {
                        type: 'onQueryResultDetails',
                        columns: resultSet.columns,
                        count: rowCount,
                        statement: resultSet.statement,
                        return: resultSet.return,
                        parameters: resultSet.parameters,
                        truncated: resultSet.truncated ?? false
                    });

                    if (rowCount === 0) {
                        postToPanel(panel, {
                            type: 'onQueryResultRows',
                            rows: [],
                            count: rowCount,
                            startIndex: 0,
                        });
                    } else {
                        for (let j = 0; j < rows.length; j += ROW_BATCH_SIZE) {
                            postToPanel(panel, {
                                type: 'onQueryResultRows',
                                rows: rows.slice(j, j + ROW_BATCH_SIZE),
                                count: rowCount,
                                startIndex: j,
                            });
                        }
                    }
                }
            } catch (e) {
                postToPanel(firstPanel, {
                    type: 'onQueryError',
                    message: formatExecutionError(e)
                });
            }
        }, err => {
            if (queryGeneration !== resultEntry!.queryGeneration) {
                return;
            }
            postToPanel(firstPanel, {
                type: 'onQueryError',
                message: formatExecutionError(err)
            });
        });
    }

    async function execute(dataSource?: DataSource) {
        if (!(dataSource instanceof DataSource)) {
            dataSource = undefined;
        }
        await resultsView(dataSource);
    }

    return [
        commands.registerCommand('sql-anywhere-17-database-tools.results.execute', execute),
        commands.registerCommand('sql-anywhere-17-database-tools.results.executeWithDatasource', async () => {
            if (window.activeTextEditor?.document.languageId === 'sql') {
                const dataSource = await selectDatasource(context);
                await execute(dataSource!);
            }
        })
    ];
}