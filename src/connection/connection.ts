import * as odbc from 'odbc';

// type DataSource = {
//     name: string;
//     connectionPool: odbc.Pool | null;
// };

// export class Connection {

//     private dataSources: DataSource[] = [
//         {
//             name: 'MySQL',
//             connectionPool: null
//         }
//     ];

//     getDataSources() {
//         // TODO
//         return this.dataSources.map(dataSource => dataSource.name);
//     }

//     async createConnectionPool(dataSourceName: string) {
//         // TODO call when the user opens the tree view
//         const dataSource = this.dataSources.find(dataSource => dataSource.name === dataSourceName);

//         if (!dataSource) {
//             throw new Error(`DataSource ${dataSourceName} not found`);
//         }

//         dataSource.connectionPool = await odbc.pool(`DSN=${dataSourceName}`);
//         return dataSource.connectionPool;
//     }
// }
// TODO need to redesign this

export class ConnectionManager {
    private stack: DataSource[] = [];

    execute(name: string, query: string) {
        let dataSource = this.stack.find(dataSource => dataSource.getName() === name);

        if (dataSource) {
            this.stack = this.stack.filter(dataSource => dataSource.getName() !== name);
            this.stack.push(dataSource);
        } else {
            try {
                dataSource = new DataSource(name);
                this.stack.push(dataSource);
            } catch (error) {
                throw new Error(`Failed to create data source ${name}: ${error}`);
            }
        }

        // TODO
        return dataSource.execute(query);
    }
}

export class DataSource {
    private name: string;
    private pool!: odbc.Pool;

    constructor(name: string) {
        this.name = name;
        this.createPool(name);
    }

    getName() {
        return this.name;
    }

    getPool(): odbc.Pool {
        return this.pool;
    }

    private async createPool(name: string) {
        this.pool = await odbc.pool(`DSN=${name}`);
    }
}