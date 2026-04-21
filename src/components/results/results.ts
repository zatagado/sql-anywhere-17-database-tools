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
import { DataSource } from '../../manager/connectionManager';
import { selectDatasource } from '../selection/datasourcePick';
import { ResultsRest } from '../../rest/results/resultsRest';
import { NodeOdbcError } from 'odbc';
import { SqlManager } from '../../manager/sqlManager';

function waitForWebviewReady(panel: WebviewPanel): Promise<void> {
    return new Promise((resolve, reject) => {
        const messageSub = panel.webview.onDidReceiveMessage((msg: { type?: string }) => {
            if (msg?.type === 'onWebviewReady') {
                messageSub.dispose();
                disposeSub.dispose();
                resolve();
            }
        });
        const disposeSub = panel.onDidDispose(() => {
            messageSub.dispose();
            reject(new Error('Webview was closed before it became ready'));
        });
    });
}

export type ResultsEntry = {
    editor: TextEditor;
    dataSource: DataSource | null;
    panels: WebviewPanel[];
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
                panels: []
            };
            Results.map.set(document, resultEntry);
        }

        // Need to create at least one panel to indicate we are loading.
        const panelTitle = `${dataSource.getName()} - ${shortName}`;
        let createdFirstPanel = false;
        if (resultEntry.panels.length === 0) {
            await window.showTextDocument(editor.document, {
                viewColumn: editor.viewColumn ?? ViewColumn.Active
            });
            await commands.executeCommand('workbench.action.newGroupBelow');
            const panel = window.createWebviewPanel('webview', panelTitle,
                { viewColumn: ViewColumn.Active },
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
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
            panel.webview.html = getResultsWebviewHtml(panel, context.extensionUri);
            resultEntry.panels.push(panel);
            createdFirstPanel = true;
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

        try {
            if (createdFirstPanel) {
                await waitForWebviewReady(firstPanel);
            }
            firstPanel.webview.postMessage({ type: 'onQueryLoading' });
        } catch (e) {
            firstPanel.webview.postMessage({
                type: 'onQueryError',
                message: formatExecutionError(e)
            });
            return;
        }

        ResultsRest.executeScript(dataSource, queries, !hadExistingDataSource).then(async resultSets => {
            try {
                for (let i = 1; i < resultSets.length; i++) {
                    const panel = window.createWebviewPanel('webview', `${panelTitle} (${i + 1})`,
                        { viewColumn: firstPanel.viewColumn! },
                        {
                            enableScripts: true,
                            retainContextWhenHidden: true
                        }
                    );
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
                    panel.webview.html = getResultsWebviewHtml(panel, context.extensionUri);
                    resultEntry.panels.push(panel);
                }

                await Promise.all(resultEntry.panels.slice(1).map(loadingPanel => waitForWebviewReady(loadingPanel)));

                firstPanel.reveal(firstPanel.viewColumn ?? ViewColumn.Active, false);

                for (let i = 0; i < resultSets.length; i++) {
                    const panel = resultEntry.panels[i]!;
                    panel.webview.postMessage({
                        type: 'onQueryResult',
                        rows: Array.from(resultSets[i]),
                        columns: resultSets[i].columns,
                        count: resultSets[i].count,
                        statement: resultSets[i].statement,
                        return: resultSets[i].return,
                        parameters: resultSets[i].parameters
                    });
                }
            } catch (e) {
                firstPanel.webview.postMessage({
                    type: 'onQueryError',
                    message: formatExecutionError(e)
                });
            }
        }, err => {
            firstPanel.webview.postMessage({
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