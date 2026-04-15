import * as databaseTree from './components/navigation/databaseTree';
import * as datasourcePick from './components/selection/datasourcePick';
import * as databaseObject from './components/preview/object';
import * as results from './components/results/results';
import * as scratch from './components/results/scratch';
import * as searchPick from './components/search/searchPick';
import * as connectionManager from './manager/connectionManager';
import * as sqlManager from './manager/sqlManager';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    sqlManager.SqlManager.activate(context);
    connectionManager.ConnectionManager.activate(context);

    const databaseTreeProvider = new databaseTree.DatabaseTree(context);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('databaseTreeStandalone', databaseTreeProvider),
        vscode.window.registerTreeDataProvider('databaseTreeExplorer', databaseTreeProvider),
        vscode.commands.registerCommand('sql-anywhere-17-database-tools.datasource.addDatasource',
            () => datasourcePick.selectDatasource(context).then(dataSource => {
                if (dataSource) {
                    databaseTreeProvider.addDatabase(dataSource);
                }
            })),
        vscode.commands.registerCommand('_sql-anywhere-17-database-tools.databaseTree.removeDatasource', (node: databaseTree.DatabaseItem) =>
            databaseTreeProvider.removeDatabase(node)),
        vscode.commands.registerCommand('_sql-anywhere-17-database-tools.databaseTree.refresh', () => databaseTreeProvider.refresh()),
        vscode.commands.registerCommand('sql-anywhere-17-database-tools.datasource.removeDatasource',
            () => datasourcePick.removeDatasource(context)),
        ...databaseObject.activate(),
        ...databaseTree.activate(),
        ...results.activate(context),
        ...scratch.activate(context),
        ...searchPick.activate(context),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('sql-anywhere-17-database-tools.connection.usePooling')) {
                connectionManager.ConnectionManager.reload();
            }
        })
    );
}

export function deactivate() { }