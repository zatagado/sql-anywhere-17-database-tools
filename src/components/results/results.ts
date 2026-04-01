import {
    commands,
    Disposable,
    ExtensionContext,
    TextEditor,
    ViewColumn,
    Uri,
    WebviewPanel,
    window
} from 'vscode';
import { DataSource } from '../../manager/connectionManager';
import { selectDatasource } from '../selection/datasourcePick';
import { ResultsRest } from '../../rest/results/resultsRest';

export class Results {
    static map = new Map<string, { editor: TextEditor, dataSource: DataSource }>();
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

        const existingResult = Results.map.get(editorKey);
        let dataSource: DataSource | null = selectedDataSource ?? existingResult?.dataSource ?? null;
        if (!dataSource) {
            dataSource = await selectDatasource(context);
        }

        if (!dataSource) {
            return;
        }
        Results.map.set(editorKey, { editor, dataSource });
        const panelTitle = `${dataSource.getName()} - ${shortName}`;
        // TODO figure out where the viewcolumn should be based on the document position.
        const panel = window.createWebviewPanel('webview', panelTitle, ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });

        panel.webview.html = getResultsWebviewHtml(panel, context.extensionUri);

        ResultsRest.executeScript(dataSource, queries, existingResult ? false : true).then(result => {
            panel.webview.postMessage({
                type: 'onQueryResult',
                rows: result,
                columns: result.columns,
                count: result.count,
                statement: result.statement,
                return: result.return,
                parameters: result.parameters
            });
        });
    }

    async function execute() {
        await resultsView(null);
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