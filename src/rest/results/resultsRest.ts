import * as odbc from 'odbc';
import { ConnectionManager, DataSource } from '../../manager/connectionManager';

export class ResultsRest {
    static formatExecutionError(err: unknown): string {
        if (typeof err === 'object' && err !== null && 'odbcErrors' in err) {
            const odbcErrors = (err as odbc.NodeOdbcError).odbcErrors;
            if (odbcErrors?.length) {
                return odbcErrors.map(e => `[${e.state}] ${e.message}`).join('\n');
            }
        }
        if (err instanceof Error) {
            return err.message;
        }
        return String(err);
    }

    static executeScript(dataSource: DataSource, sql: string, updateRecent: boolean = true): Promise<odbc.Result<unknown>> {
        return ConnectionManager.execute(dataSource, sql, updateRecent);
    }
}
