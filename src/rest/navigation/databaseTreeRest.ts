import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { SqlManager } from '../../manager/sqlManager';

const PARAM = /(?<=\$)\w+/g;

export class DatabaseTreeRest {

    static async getTables(dataSource: DataSource, limit: number, offset: number): Promise<unknown[]> {
        // TODO redo this slop code
        const queries = SqlManager.getSqlQueries(dataSource.getType());
        const tableSql = queries.navigation?.databaseTree?.tables;
        if (!tableSql) {
            throw new Error(`No tables navigation SQL for type "${dataSource.getType()}"`);
        }

        const paramNames = [...new Set(tableSql.match(PARAM) ?? [])];
        const values: Record<string, number> = {
            limit,
            offset,
            start_at: offset + 1,
        };

        const prepared = await ConnectionManager.prepare(dataSource, tableSql);
        for (const name of paramNames) {
            if (!(name in values)) {
                throw new Error(`Unhandled tables query parameter: $${name}`);
            }
            prepared.bind(name, values[name]!);
        }

        const result = await prepared.execute();
        return [...result];
    }

    getViews() {
    }

    getProcedures() {
    }
}
