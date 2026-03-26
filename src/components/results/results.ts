import {
    commands,
    Disposable,
    ExtensionContext,
    ViewColumn,
    Uri,
    WebviewPanel,
    window
} from 'vscode';

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

export function activate(context: ExtensionContext): Disposable[] {

    function resultsView() {
        const panel = window.createWebviewPanel('webview', 'Vue', ViewColumn.One, {
            enableScripts: true
        });

        panel.webview.html = getResultsWebviewHtml(panel, context.extensionUri);

        const messageSub = panel.webview.onDidReceiveMessage((message: { type?: string; message?: string } & Record<string, unknown>) => {
            switch (message.type) {
                case 'onWebviewReady':
                    console.log('[results webview] ready');
                    panel.webview.postMessage({ type: 'extension-ack', message: 'Extension received onWebviewReady' });
                    break;
                case 'logFromVue':
                    console.log('[results webview] from Vue:', message.message ?? message);
                    break;
                default:
                    console.log('[results webview]', message);
            }
        });
        panel.onDidDispose(() => messageSub.dispose());
    }

    return [commands.registerCommand('sql-anywhere-17-database-tools.results', resultsView)];
}