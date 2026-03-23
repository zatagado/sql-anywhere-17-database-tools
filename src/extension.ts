import * as databaseTree from './components/navigation/databaseTree';
import * as datasourcePick from './components/selection/datasourcePick';
import * as databaseObjectView from './components/preview/databaseObjectView';
import * as connectionManager from './manager/connectionManager';
import * as sqlManager from './manager/sqlManager';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // TODO rename these to activate
    sqlManager.SqlManager.load(context);
    connectionManager.ConnectionManager.load(context);

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

    const databaseTreeProvider = new databaseTree.DatabaseTree(context);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('databaseTree', databaseTreeProvider),
        vscode.commands.registerCommand('databaseTree.addDatasource',
            () => datasourcePick.selectDatasource(context).then(dataSource => {
                if (dataSource) {
                    databaseTreeProvider.addDatabase(dataSource);
                }
            })),
        vscode.commands.registerCommand('_databaseTree.removeDatasource', (node: databaseTree.DatabaseItem) =>
            databaseTreeProvider.removeDatabase(node)),
        vscode.commands.registerCommand('databaseTree.refresh', () => databaseTreeProvider.refresh()),
        vscode.commands.registerCommand('sql-anywhere-17-database-tools.removeDatasource',
            () => datasourcePick.removeDatasource(context)),
        ...databaseObjectView.activate()
    );
}

export function deactivate() { }