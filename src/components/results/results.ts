import {
    commands,
    Disposable,
    ExtensionContext,
    TextEditor,
    ViewColumn,
    Uri,
    WebviewPanel,
    window,
    workspace
} from 'vscode';
import { DataSource } from '../../manager/connectionManager';
import { selectDatasource } from '../selection/datasourcePick';
import { ResultsRest } from '../../rest/results/resultsRest';

export type ResultsEntry = {
    editor: TextEditor;
    dataSource: DataSource;
    panels: WebviewPanel[];
};

export class Results {
    static map = new Map<string, ResultsEntry>();
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

export function activate(context: ExtensionContext): Disposable[] {

    async function resultsView(selectedDataSource: DataSource | null = null) {
        // TODO depending on the number of queries, create multiple panels
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const editorKey = document.fileName;
        const file = Uri.file(document.fileName);
        const shortName = file.path.split('/').pop()!;
        // TODO get the short name. if it already exists, change both panel titles to the workspace relative path.
        const queries: string = document.getText(editor.selection.isEmpty ? undefined : editor.selection);

        let resultEntry: ResultsEntry | undefined = Results.map.get(editorKey);
        const hadExistingDataSource = resultEntry?.dataSource !== undefined;
        let dataSource: DataSource | null = selectedDataSource ?? resultEntry?.dataSource ?? null;
        if (!dataSource) {
            dataSource = await selectDatasource(context);
            if (!dataSource) {
                return;
            }
        }

        if (!resultEntry) {
            const sqlDocumentUri = document.uri.toString();
            const onThisSqlDocumentClosed = workspace.onDidCloseTextDocument(doc => {
                if (doc.uri.toString() !== sqlDocumentUri) {
                    return;
                }
                if (!Results.map.has(editorKey)) {
                    return;
                }
                Results.map.delete(editorKey);
                onThisSqlDocumentClosed.dispose(); // TODO does this dispose for just the one document, or all of them?
            });
            context.subscriptions.push(onThisSqlDocumentClosed);

            resultEntry = {
                editor: editor,
                dataSource: dataSource,
                panels: []
            };
            Results.map.set(editorKey, resultEntry);
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
                const entry = Results.map.get(editorKey);
                if (!entry) {
                    return;
                }
                entry.panels = entry.panels.filter(mapPanel => mapPanel !== newPanel);
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
                message: ResultsRest.formatExecutionError(err)
            });
        });
    }

    async function execute() {
        await resultsView();
    }

    async function executeWithDatasource() {
        const dataSource = await selectDatasource(context);
        await resultsView(dataSource);
    }

    return [
        commands.registerCommand('sql-anywhere-17-database-tools.execute', execute),
        commands.registerCommand('sql-anywhere-17-database-tools.executeWithDatasource', executeWithDatasource)
    ];
}