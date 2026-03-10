import * as odbc from 'odbc';

export class ConnectionManager {
    private stack: DataSource[] = [];

    private getDataSource(name: string, updateRecent: boolean = true): DataSource {
        let dataSource = this.stack.find(dataSource => dataSource.getName() === name);

        if (dataSource) {
            if (updateRecent) {
                this.stack = this.stack.filter(dataSource => dataSource.getName() !== name);
                this.stack.push(dataSource);
                // Limit the stack to 6 items
            }
        } else {
            try {
                dataSource = new DataSource(name);
                if (updateRecent) {
                    this.stack.push(dataSource);
                }
            } catch (error) {
                throw new Error(`Failed to create data source ${name}: ${error}`);
            }
        }

        return dataSource;
    }

    getDataSourceNames(): string[] {
        return this.stack.map(dataSource => dataSource.getName());
    }

    execute(name: string, query: string, updateRecent: boolean = true): Promise<odbc.Result<unknown>> {
        return this.getDataSource(name, updateRecent).getConnection().then(connection => connection.query(query));
    }
}

export class DataSource {
    private name: string;
    private pool!: odbc.Pool;

    constructor(name: string) {
        this.name = name;
    }

    private async getPool(): Promise<odbc.Pool> {
        if (this.pool) {
            return Promise.resolve(this.pool);
        }
        else {
            return odbc.pool(`DSN=${this.name}`).then(pool => {
                this.pool = pool;
                return pool;
            });
        }
    }

    getConnection(): Promise<odbc.Connection> {
        return this.getPool().then(pool => pool.connect());
    }

    getName() {
        return this.name;
    }
}