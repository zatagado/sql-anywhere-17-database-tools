import * as odbc from 'odbc';
import { ExtensionContext } from 'vscode';

export class ConnectionManager {

    private static stack: DataSource[] = [];

    static loadDataSources(context: ExtensionContext): DataSource[] {
        this.stack = (context.globalState.get('dataSources') as { name: string, type: string }[] ?? []).map(
            dataSource => new DataSource(dataSource.name, dataSource.type));
        return this.stack;
    }

    static saveDataSource(dataSource: DataSource, context: ExtensionContext) {
        if (this.stack.some(otherDataSource => 
            otherDataSource.getName() === dataSource.getName() && otherDataSource.getType() === dataSource.getType())) {
            this.stack = this.stack.filter(otherDataSource => otherDataSource.getName() !== dataSource.getName());
        }
        this.stack.push(dataSource);
        context.globalState.update('dataSources', this.stack);
    }

    static getDataSources(): DataSource[] {
        return this.stack;
    }

    static getDataSource(name: string): DataSource | undefined {
        return this.stack.find(dataSource => dataSource.getName() === name);
    }

    private static updateRecentStack(dataSource: DataSource) {
        if (this.stack.some(otherDataSource => 
            otherDataSource.getName() === dataSource.getName() && otherDataSource.getType() === dataSource.getType())) {
            this.stack = this.stack.filter(otherDataSource => otherDataSource.getName() !== dataSource.getName());
        }
        else {
            throw new Error(`DataSource ${dataSource.getName()} not found in stack`);
        }
    }

    static execute(dataSource: DataSource, query: string, updateRecent: boolean = true): Promise<odbc.Result<unknown>> {
        if (updateRecent) {
            this.updateRecentStack(dataSource);
        }
        return dataSource.getConnection().then(connection =>
            connection.query(query).then(
                result => {
                    connection.close();
                    return result;
                },
                err => {
                    connection.close();
                    throw err;
                }
            )
        );
    }
}

export class DataSource {
    private name: string;
    private type: string;
    private pool!: odbc.Pool;

    constructor(name: string, type: string) {
        this.name = name;
        this.type = type;
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

    isConnected(): boolean {
        return this.pool !== undefined;
    }

    getConnection(): Promise<odbc.Connection> {
        return this.getPool().then(pool => pool.connect());
    }

    getName() {
        return this.name;
    }

    getType() {
        return this.type;
    }
}