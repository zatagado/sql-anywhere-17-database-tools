import * as vscode from 'vscode';
import * as odbc from 'odbc';
import { ConnectionManager } from './manager/connectionManager';
import { DatabaseTree } from './components/navigation/databaseTree';
import { datasourceQuickPick } from './components/selection/datasourceQuickPick';
import { SqlManager } from './manager/sqlManager';

export function activate(context: vscode.ExtensionContext) {

    SqlManager.loadSqlLanguages(context);
    ConnectionManager.loadDataSources(context);

    let webview = vscode.commands.registerCommand('sql-anywhere-17-database-tools.namasteworld', () => {

        let panel = vscode.window.createWebviewPanel("webview", "Vue", vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "web", "dist")],
        });

        // Use stable asset paths (see vite.config.ts build.rollupOptions.output)
        let scriptSrc = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "web", "dist", "assets", "index.js"));
        let cssSrc = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "web", "dist", "assets", "index.css"));

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="${cssSrc}" />
            </head>
            <body>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="app"></div>
                <script src="${scriptSrc}"></script>
            </body>
            </html>
        `;
    });

    context.subscriptions.push(webview);

    let disposable = vscode.commands.registerCommand('sql-anywhere-17-database-tools.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World!');

        const connectionString = 'DSN=MySQL;';
        const connection = odbc.connect(connectionString, (error, connection) => {
            connection.query('SELECT * FROM Persons;', (error, result) => {
                if (error) { console.error(error); }
                console.log(result);
            });
        });
    });

    context.subscriptions.push(disposable);

    const editCommand = vscode.commands.registerCommand('sql-anywhere-17-database-tools.edit', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            vscode.window.showInformationMessage('Edit SQL', editor.document.uri.fsPath);
        }
    });
    context.subscriptions.push(editCommand);

    // TODO start actual code
    const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0)
        ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined);
    const databaseTreeProvider = new DatabaseTree(context, rootPath);
    vscode.window.registerTreeDataProvider('databaseTree', databaseTreeProvider);

    vscode.commands.registerCommand('databaseTree.addDatasource', () => datasourceQuickPick(context));
}

export function deactivate() { }