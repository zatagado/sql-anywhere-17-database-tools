import { DatabaseItem, DatabaseTree } from './components/navigation/databaseTree';
import { DatasourceSelection } from './components/selection/datasourceQuickPick';
import { databaseObjectVirtualDocument } from './components/preview/databaseObjectVirtualDocument';
import { ConnectionManager, DataSource } from './manager/connectionManager';
import { SqlManager } from './manager/sqlManager';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    SqlManager.load(context);
    ConnectionManager.load(context);

    // let webview = vscode.commands.registerCommand('sql-anywhere-17-database-tools.namasteworld', () => {

    //     let panel = vscode.window.createWebviewPanel("webview", "Vue", vscode.ViewColumn.One, {
    //         enableScripts: true,
    //         localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "web", "dist")],
    //     });

    //     // Use stable asset paths (see vite.config.ts build.rollupOptions.output)
    //     let scriptSrc = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "web", "dist", "assets", "index.js"));
    //     let cssSrc = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "web", "dist", "assets", "index.css"));

    //     panel.webview.html = `
    //         <!DOCTYPE html>
    //         <html lang="en">
    //         <head>
    //             <meta charset="UTF-8">
    //             <meta name="viewport" content="width=device-width, initial-scale=1.0">
    //             <link rel="stylesheet" href="${cssSrc}" />
    //         </head>
    //         <body>
    //             <noscript>You need to enable JavaScript to run this app.</noscript>
    //             <div id="app"></div>
    //             <script src="${scriptSrc}"></script>
    //         </body>
    //         </html>
    //     `;
    // });

    // context.subscriptions.push(webview);

    // const editCommand = vscode.commands.registerCommand('sql-anywhere-17-database-tools.edit', () => {
    //     const editor = vscode.window.activeTextEditor;
    //     if (editor) {
    //         vscode.window.showInformationMessage('Edit SQL', editor.document.uri.fsPath);
    //     }
    // });
    // context.subscriptions.push(editCommand);

    // TODO start actual code
    const databaseTreeProvider = new DatabaseTree(context);
    vscode.window.registerTreeDataProvider('databaseTree', databaseTreeProvider);

    // TODO the result of this gets added to the database tree
    vscode.commands.registerCommand('databaseTree.addDatasource', 
        () => DatasourceSelection.selectDatasource(context).then(dataSource => {
            if (dataSource) {
                databaseTreeProvider.addDatabase(dataSource);
            }
        }));
    vscode.commands.registerCommand('databaseTree.removeDatasource', (node: DatabaseItem) => 
        databaseTreeProvider.removeDatabase(node));
    vscode.commands.registerCommand('databaseTree.refresh', () => databaseTreeProvider.refresh());

    vscode.commands.registerCommand('sql-anywhere-17-database-tools.removeDatasource',
        () => DatasourceSelection.removeDatasource(context));

    databaseObjectVirtualDocument(context);
}

export function deactivate() { }