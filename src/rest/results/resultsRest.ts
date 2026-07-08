import * as odbc from 'odbc';
import { ConnectionManager, DataSource } from '../../manager/connectionManager';

export class ResultsRest {
    static executeScript(
        dataSource: DataSource,
        sql: string,
        updateRecent: boolean = true,
        queryOptions: odbc.QueryOptions = {}
    ): Promise<odbc.Result<unknown>[]> {
        return ConnectionManager.execute(dataSource, sql, updateRecent, queryOptions);
    }
}
