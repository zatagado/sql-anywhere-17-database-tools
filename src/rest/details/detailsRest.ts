import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { Result } from 'odbc';
import { SqlManager } from '../../manager/sqlManager';
import { DatabaseObjectType } from '../../shared/webviewUtils';

export class DetailsRest {
    static async getColumns(dataSource: DataSource, objectName: string, type: DatabaseObjectType): Promise<Result<unknown>> {
        const queries = SqlManager.getSqlQueries(dataSource.getType())!.details;
        let columnsQuery: string;

        switch (type) {
            case DatabaseObjectType.Table:
                columnsQuery = queries.table.columns;
                break;
            case DatabaseObjectType.View:
                columnsQuery = queries.view.columns;
                break;
            case DatabaseObjectType.Procedure:
                throw new Error('Procedures do not have columns');
            default:
                throw new Error(`Unknown object type: ${type}`);
        }

        return ConnectionManager.prepare(dataSource, columnsQuery, false).then(preparedStatement => {
            preparedStatement.bind('objectName', objectName);
            return preparedStatement.execute();
        });
    }

    static async getConstraints(dataSource: DataSource, objectName: string, type: DatabaseObjectType): Promise<Result<unknown>> {
        const constraintsQuery = SqlManager.getSqlQueries(dataSource.getType())!.details.table.constraints;
        if (type !== DatabaseObjectType.Table) {
            throw new Error('Only tables have constraints');
        }

        return ConnectionManager.prepare(dataSource, constraintsQuery, false).then(preparedStatement => {
            preparedStatement.bind('objectName', objectName);
            return preparedStatement.execute();
        });
    }

    static async getReferencingConstraints(
        dataSource: DataSource,
        objectName: string,
        type: DatabaseObjectType
    ): Promise<Result<unknown>> {
        const referencingConstraintsQuery =
            SqlManager.getSqlQueries(dataSource.getType())!.details.table.referencingConstraints;
        if (type !== DatabaseObjectType.Table) {
            throw new Error('Only tables have referencing constraints');
        }

        return ConnectionManager.prepare(dataSource, referencingConstraintsQuery, false).then(preparedStatement => {
            preparedStatement.bind('objectName', objectName);
            return preparedStatement.execute();
        });
    }

    static async getPrivileges(dataSource: DataSource, objectName: string, type: DatabaseObjectType): Promise<Result<unknown>> {
        const queries = SqlManager.getSqlQueries(dataSource.getType())!.details;
        let privilegesQuery: string;

        switch (type) {
            case DatabaseObjectType.Table:
                privilegesQuery = queries.table.privileges;
                break;
            case DatabaseObjectType.View:
                privilegesQuery = queries.view.privileges;
                break;
            case DatabaseObjectType.Procedure:
                privilegesQuery = queries.procedure.privileges;
                break;
            default:
                throw new Error(`Unknown object type: ${type}`);
        }

        return ConnectionManager.prepare(dataSource, privilegesQuery, false).then(preparedStatement => {
            preparedStatement.bind('objectName', objectName);
            return preparedStatement.execute();
        });
    }
}
