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
}
