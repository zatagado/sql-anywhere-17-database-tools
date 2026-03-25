import {
    commands,
    Disposable,
    ExtensionContext,
    ViewColumn,
    Uri,
    WebviewPanel,
    window
} from 'vscode';
import { ConnectionManager } from '../../manager/connectionManager';
import { ResultsRest } from '../../rest/results/resultsRest';

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

// export function activate(context: ExtensionContext): Disposable[] {

//     function resultsView() {
//         const panel = window.createWebviewPanel('webview', 'Vue', ViewColumn.One, {
//             enableScripts: true
//         });

//         panel.webview.html = getResultsWebviewHtml(panel, context.extensionUri);

//         const messageSub = panel.webview.onDidReceiveMessage((message: { type?: string; message?: string } & Record<string, unknown>) => {
//             switch (message.type) {
//                 case 'onWebviewReady':
//                     console.log('[results webview] ready');
//                     panel.webview.postMessage({ type: 'extension-ack', message: 'Extension received onWebviewReady' });
//                     break;
//                 case 'logFromVue':
//                     console.log('[results webview] from Vue:', message.message ?? message);
//                     break;
//                 default:
//                     console.log('[results webview]', message);
//             }
//         });
//         panel.onDidDispose(() => messageSub.dispose());
//     }

//     return [commands.registerCommand('sql-anywhere-17-database-tools.results', resultsView)];
// }


// TODO make a class to keep track of the results views and their editors. if an existing editor is passed in, clear all unused panels for that editor.
// TODO make it a map of the full path of the file to the panel.

export function activate(context: ExtensionContext): Disposable[] {

    function resultsView() {
        // TODO depending on the number of queries, create multiple panels
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const file = Uri.file(document.fileName);
        const shortName = file.path.split('/').pop();
        // TODO get the short name. if it already exists, change both panel titles to the workspace relative path.
        const queries: string = document.getText(editor.selection.isEmpty ? undefined : editor.selection);
        
        const dataSource = ConnectionManager.getDataSources()[0];
        if (!dataSource) {
            return;
        }
        const panelTitle = `${dataSource.getName()} - ${shortName}`;
        // TODO figure out where the viewcolumn should be based on the document position.
        const panel = window.createWebviewPanel('webview', panelTitle, ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });

        panel.webview.html = getResultsWebviewHtml(panel, context.extensionUri);

        ResultsRest.executeScript(dataSource, queries).then(result => {
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

    return [commands.registerCommand('sql-anywhere-17-database-tools.execute', resultsView)];
}