import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { Result } from 'odbc';
import { SqlManager } from '../../manager/sqlManager';

export class DatabaseObjectViewRest {
    static async getView(dataSource: DataSource, viewName: string): Promise<Result<unknown>> {
        const viewQuery = SqlManager.getSqlQueries(dataSource.getType())!.preview.databaseObject.view;
        return ConnectionManager.prepare(dataSource, viewQuery, false).then(preparedStatement => {
            preparedStatement.bind('viewName', viewName);
            return preparedStatement.execute();
        });
    }

    static async getProcedure(dataSource: DataSource, procedureName: string): Promise<Result<unknown>> {
        const procedureQuery = SqlManager.getSqlQueries(dataSource.getType())!.preview.databaseObject.procedure;
        return ConnectionManager.prepare(dataSource, procedureQuery, false).then(preparedStatement => {
            preparedStatement.bind('procedureName', procedureName);
            return preparedStatement.execute();
        });
    }
}
