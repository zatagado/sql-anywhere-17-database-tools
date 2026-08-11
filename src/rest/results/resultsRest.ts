import * as odbc from 'odbc';
import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { CancellationTokenSource } from 'vscode';

export class ResultsRest {
    static executeScript(
        dataSource: DataSource,
        sql: string,
        updateRecent: boolean = true,
        queryOptions: odbc.QueryOptions = {},
        cancellationTokenSource: CancellationTokenSource = new CancellationTokenSource()
    ): Promise<odbc.Result<unknown>[]> {
        return ConnectionManager.execute(dataSource, sql, updateRecent, queryOptions, cancellationTokenSource);
    }
}
