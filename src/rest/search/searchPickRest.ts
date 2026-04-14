import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { Result } from 'odbc';
import { SqlManager } from '../../manager/sqlManager';

export class SearchPickRest {
    static async getTables(dataSource: DataSource): Promise<Result<unknown>> {
        const tableQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.searchPick.tables;
        return ConnectionManager.executeAll(dataSource, tableQuery, false);
    }

    static async getViews(dataSource: DataSource): Promise<Result<unknown>> {
        const viewQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.searchPick.views;
        return ConnectionManager.executeAll(dataSource, viewQuery, false);
    }

    static async getProcedures(dataSource: DataSource): Promise<Result<unknown>> {
        const procQuery = SqlManager.getSqlQueries(dataSource.getType())!.navigation.searchPick.procedures;
        return ConnectionManager.executeAll(dataSource, procQuery, false);
    }
}
