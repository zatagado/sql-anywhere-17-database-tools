import * as odbc from 'odbc';
import { ExtensionContext } from 'vscode';

export class ConnectionManager {

    // TODO removing a datasource should trigger an event that tree will need to subscribe to

    private static context: ExtensionContext;
    private static stack: DataSource[] = [];

    static load(context: ExtensionContext): DataSource[] {
        this.context = context;
        this.stack = (this.context.globalState.get('dataSources') as { name: string, type: string }[] ?? []).map(
            dataSource => new DataSource(dataSource.name, dataSource.type));
        return this.stack;
    }

    static saveDataSource(dataSource: DataSource | string): void {
        let newDataSource: DataSource;
        if (typeof dataSource === 'string') {
            newDataSource = this.stack.find(otherDataSource => otherDataSource.getName() === dataSource)!;
            if (!newDataSource) {
                throw new Error(`DataSource ${dataSource} not found in stack`);
            }
        }
        else {
            newDataSource = dataSource;
        }
        if (this.stack.some(otherDataSource => otherDataSource.getName() === newDataSource.getName())) {
            this.stack = this.stack.filter(otherDataSource => otherDataSource.getName() !== newDataSource.getName());
        }
        this.stack.push(newDataSource);
        this.context.globalState.update('dataSources', this.stack);
    }

    static removeDataSource(dataSource: DataSource | string): void {
        let dataSourceToRemove: DataSource;
        if (typeof dataSource === 'string') {
            dataSourceToRemove = this.stack.find(otherDataSource => otherDataSource.getName() === dataSource)!;
            if (!dataSourceToRemove) {
                throw new Error(`DataSource ${dataSource} not found in stack`);
            }
        }
        else {
            dataSourceToRemove = dataSource;
        }
        this.stack = this.stack.filter(otherDataSource => otherDataSource.getName() !== dataSourceToRemove.getName());
        this.context.globalState.update('dataSources', this.stack);
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

    static prepare(dataSource: DataSource, query: string, updateRecent: boolean = true): Promise<PreparedStatement> {
        if (updateRecent) {
            this.updateRecentStack(dataSource);
        }
        return dataSource.getConnection().then(connection => PreparedStatement.create(connection, query));
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

export class PreparedStatement {
    private statement: odbc.Statement;
    private parameters: Map<string, { position: number, value: any }>;

    constructor(statement: odbc.Statement, query: string) {
        this.statement = statement;
        this.parameters = new Map<string, { position: number, value: any }>();
        query.match(/(?<=\$)\w+/gm)?.forEach(parameter => {
            this.parameters.set(parameter, { position: this.parameters.size + 1, value: undefined });
        });
    }

    static create(connection: odbc.Connection, query: string): Promise<PreparedStatement> {
        return connection.createStatement().then(statement => {
            const preparedStatement = new PreparedStatement(statement, query);
            return preparedStatement.prepare(query).then(() => preparedStatement);
        });
    }

    private prepare(query: string): Promise<void> {
        return this.statement.prepare(query.replace(/\$\w+/gm, '?'));
    }

    bind(parameter: string, value: any) {
        const parameterData = this.parameters.get(parameter);
        if (!parameterData) {
            throw new Error(`Parameter ${parameter} not found in query`);
        }
        parameterData.value = value;
    }

    execute(): Promise<odbc.Result<unknown>> {
        if (Array.from(this.parameters.values()).every(parameterData => parameterData.value !== undefined)) {
            return this.statement.bind(Array.from(this.parameters.values()).sort(
                (a, b) => a.position - b.position).map(parameterData => parameterData.value)).then(
                    () => this.statement.execute().then(
                        result => {
                            this.statement.close(); // TODO not sure if closing is necessary, or at the end and add explicit close method to prepared statement class
                            return result;
                        },
                        err => {
                            this.statement.close();
                            throw err;
                        }
                    ));
        }
        else {
            throw new Error('Not all parameters are bound');
        }
    }
}