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

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <link rel="stylesheet" href="${cssSrc}" />
            </head>
            <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="app"></div>
                <script>
                    const vscode = acquireVsCodeApi();
                    window.__vscodeApi__ = vscode;
                    window.__VSCODE_WEBVIEW_VIEW__ = 'queryResults';
                    window.addEventListener('load', function () {
                        vscode.postMessage({ type: 'onWebviewReady' });
                    });
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
        if (resultEntry.panels.length === 0) {
            await window.showTextDocument(editor.document, {
                viewColumn: editor.viewColumn ?? ViewColumn.Active
            });
            await commands.executeCommand('workbench.action.newGroupBelow');
            const newPanel = window.createWebviewPanel('webview', panelTitle,
                { viewColumn: ViewColumn.Active },
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            newPanel.onDidDispose(() => {
                const entry = Results.map.get(document);
                if (!entry) {
                    return;
                }
                entry.panels = entry.panels.filter(mapPanel => mapPanel !== newPanel);
                if (entry.panels.length === 0) {
                    entry.dataSource = null;
                }
            });
            newPanel.webview.html = getResultsWebviewHtml(newPanel, context.extensionUri);
            resultEntry.panels.push(newPanel);
        }
        else {
            // Dispose of all panels that are not the first one.
            while (resultEntry.panels.length > 1) {
                resultEntry.panels.pop()!.dispose();
            }
            resultEntry.panels = [resultEntry.panels[0]!];
            resultEntry.panels[0]!.title = panelTitle;
        }

        const panel = resultEntry.panels[0]!;
        panel.reveal(panel.viewColumn, false);
        panel.webview.postMessage({ type: 'onQueryLoading' });

        ResultsRest.executeScript(dataSource, queries, !hadExistingDataSource).then(result => {
            panel.webview.postMessage({
                type: 'onQueryResult',
                rows: result,
                columns: result.columns,
                count: result.count,
                statement: result.statement,
                return: result.return,
                parameters: result.parameters
            });
        }, err => {
            panel.webview.postMessage({
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
            const dataSource = await selectDatasource(context);
            await execute(dataSource!);
        })
    ];
}