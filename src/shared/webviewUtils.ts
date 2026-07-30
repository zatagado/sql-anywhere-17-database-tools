import {
    Uri
} from "vscode";
import { WebviewPanel } from "vscode";

export enum DatabaseObjectType {
    Table = 'Tables',
    View = 'Views',
    Procedure = 'Procedures',
}

export function getWebviewHtml(panel: WebviewPanel, extensionUri: Uri, name: string): string {
    const scriptSrc = panel.webview.asWebviewUri(Uri.joinPath(extensionUri, 'web', 'dist', 'assets', 'index.js'));
    const cssSrc = panel.webview.asWebviewUri(Uri.joinPath(extensionUri, 'web', 'dist', 'assets', 'index.css'));
    const loadingSvg = panel.webview.asWebviewUri(Uri.joinPath(extensionUri, 'web', 'resources', 'loading.svg'));

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <link rel="stylesheet" href="${cssSrc}" />
                <style>
                    html, body { height: 100%; margin: 0; }
                    #app { min-height: 100%; }
                    .webview-boot {
                        box-sizing: border-box;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        min-height: 100vh;
                        padding: 1rem;
                    }
                    .webview-boot-spinner {
                        width: 48px;
                        height: 48px;
                        flex-shrink: 0;
                        background-color: var(--vscode-foreground);
                        mask-image: url('${loadingSvg}');
                        mask-position: center;
                        mask-repeat: no-repeat;
                        mask-size: contain;
                        animation: webview-boot-spin 0.9s linear infinite;
                    }
                    @keyframes webview-boot-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                </style>
            </head>
            <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="app">
                    <div class="webview-boot">
                        <div class="webview-boot-spinner"></div>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    window.__vscodeApi__ = vscode;
                    window.__VSCODE_WEBVIEW_VIEW__ = '${name}';
                </script>
                <script type="module" src="${scriptSrc}"></script>
            </body>
        </html>
    `;
}

export function waitForWebviewReady(panel: WebviewPanel): Promise<void> {
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