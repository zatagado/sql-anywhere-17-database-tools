import * as databaseTree from './components/navigation/databaseTree';
import * as datasourcePick from './components/selection/datasourcePick';
import * as databaseObjectView from './components/preview/objectView';
import * as results from './components/results/results';
import * as test from './components/results/test';
import * as connectionManager from './manager/connectionManager';
import * as sqlManager from './manager/sqlManager';
import * as vscode from 'vscode';

import * as resultsRest from './rest/results/resultsRest'; // TODO remove this

export function activate(context: vscode.ExtensionContext) {
    // TODO rename these to activate
    sqlManager.SqlManager.load(context);
    connectionManager.ConnectionManager.load(context);

    resultsRest.ResultsRest.executeTest(connectionManager.ConnectionManager.getDataSources()[0]);

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
        ...databaseObjectView.activate(),
        ...results.activate(context),
        ...test.activate(context)
    );
}

export function deactivate() { }