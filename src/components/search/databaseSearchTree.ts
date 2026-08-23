import {
    ExtensionContext,
    Uri,
    WebviewView,
    WebviewViewProvider
} from 'vscode';
import { getWebviewHtml } from '../../shared/webviewUtils';

export class DatabaseSearchViewProvider implements WebviewViewProvider {
    constructor(private readonly context: ExtensionContext) { }

    resolveWebviewView(webviewView: WebviewView): void {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                Uri.joinPath(this.context.extensionUri, 'web')
            ]
        };
        webviewView.webview.html = getWebviewHtml(
            webviewView,
            this.context.extensionUri,
            'databaseSearch'
        );

        // Add extension-side handlers here as the search view grows.
        // webviewView.webview.onDidReceiveMessage(message => { ... });
    }
}
