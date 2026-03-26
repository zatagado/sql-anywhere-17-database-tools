import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { Result } from 'odbc';

export class ResultsRest {
    static executeScript(dataSource: DataSource, sql: string): Promise<Result<unknown>> {
        return ConnectionManager.execute(dataSource, sql, true);
    }

    static executeTest(dataSource: DataSource): Promise<Result<unknown>> {
        return ConnectionManager.execute(dataSource, 'select * from persons;', true);
    }
}
