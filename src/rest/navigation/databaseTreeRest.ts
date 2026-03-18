import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { Result } from 'odbc';
import { SqlManager } from '../../manager/sqlManager';


export class DatabaseTreeRest {

    static async getTables(dataSource: DataSource, limit: number, offset: number): Promise<Result<unknown>> {
        const tableQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.databaseTree.tables;
        return ConnectionManager.prepare(dataSource, tableQuery, false).then(preparedStatement => {
            preparedStatement.bind('offset', offset);
            preparedStatement.bind('limit', limit);
            return preparedStatement.execute();
        });
    }

    static async getViews(dataSource: DataSource, limit: number, offset: number): Promise<Result<unknown>> {
        const viewQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.databaseTree.views;
        return ConnectionManager.prepare(dataSource, viewQuery, false).then(preparedStatement => {
            preparedStatement.bind('offset', offset);
            preparedStatement.bind('limit', limit);
            return preparedStatement.execute();
        });
    }

    static async getProcedures(dataSource: DataSource, limit: number, offset: number): Promise<Result<unknown>> {
        const procQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.databaseTree.procedures;
        return ConnectionManager.prepare(dataSource, procQuery, false).then(preparedStatement => {
            preparedStatement.bind('offset', offset);
            preparedStatement.bind('limit', limit);
            return preparedStatement.execute();
        });
    }
}
