import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { Result } from 'odbc';

export class ResultsRest {
    static executeScript(dataSource: DataSource, sql: string, updateRecent: boolean = true): Promise<Result<unknown>> {
        return ConnectionManager.execute(dataSource, sql, updateRecent);
    }
}
