import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { Result } from 'odbc';
import { SqlManager } from '../../manager/sqlManager';

export class DatabaseTreeRest {
    static getTables(dataSource: DataSource): Promise<Result<unknown>> {
        const tableQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.databaseTree.tables;
        return ConnectionManager.executeAll(dataSource, tableQuery, false);
    }

    static getViews(dataSource: DataSource): Promise<Result<unknown>> {
        const viewQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.databaseTree.views;
        return ConnectionManager.executeAll(dataSource, viewQuery, false);
    }

    static getProcedures(dataSource: DataSource): Promise<Result<unknown>> {
        const procQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.databaseTree.procedures;
        return ConnectionManager.executeAll(dataSource, procQuery, false);
    }
}
