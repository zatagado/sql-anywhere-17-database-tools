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
        this.stack.unshift(newDataSource);
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
            this.stack.unshift(dataSource);
        }
        else {
            throw new Error(`DataSource ${dataSource.getName()} not found in stack`);
        }
    }

    static prepare(dataSource: DataSource, query: string, updateRecent: boolean = true): Promise<PreparedStatement> {
        if (updateRecent) {
            this.updateRecentStack(dataSource);
        }
        return dataSource.getConnection().then(connection =>
            PreparedStatement.create(connection, query).catch(() =>
                dataSource.reconnect().then(newConnection => PreparedStatement.create(newConnection, query))
            )
        );
    }

    static execute(dataSource: DataSource, query: string, updateRecent: boolean = true): Promise<odbc.Result<unknown>> {
        if (updateRecent) {
            this.updateRecentStack(dataSource);
        }
        // TODO look into the cursor
        return dataSource.getConnection().then(connection =>
            connection.query(query).catch(() =>
                dataSource.reconnect().then(newConnection => newConnection.query(query))
            )
        );
    }
}

export class DataSource {
    private static readonly MAX_RECONNECT_ATTEMPTS = 3;
    private static readonly RECONNECT_DELAY_MS = 1000;

    private name: string;
    private type: string;
    private pool?: Promise<odbc.Pool>;

    constructor(name: string, type: string) {
        this.name = name;
        this.type = type;
    }

    private async getPool(): Promise<odbc.Pool> {
        this.pool = this.pool ?? odbc.pool(`DSN=${this.name}`);
        return this.pool;
    }

    private disposePool(): void {
        this.pool?.then(pool => pool.close());
        this.pool = undefined;
    }

    isConnected(): boolean {
        return this.pool !== undefined;
    }

    async reconnect(): Promise<odbc.Connection> {
        this.disposePool();

        for (let attempt = 0; attempt < DataSource.MAX_RECONNECT_ATTEMPTS; attempt++) {
            if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, DataSource.RECONNECT_DELAY_MS));
            }
            try {
                const pool = await this.getPool();
                const connection = await pool.connect();
                return connection;
            } catch (err) {
                this.disposePool();
            }
        }

        throw new Error(`Failed to reconnect to datasource "${this.name}"
            after ${DataSource.MAX_RECONNECT_ATTEMPTS} attempts`);
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
            return preparedStatement.statement.prepare(query.replace(/\$\w+/gm, '?')).then(() => preparedStatement);
        });
    }

    bind(parameter: string, value: any) {
        const parameterData = this.parameters.get(parameter);
        if (!parameterData) {
            throw new Error(`Parameter ${parameter} not found in query`);
        }
        parameterData.value = value;
    }

    execute(): Promise<odbc.Result<unknown>> {
        if (Array.from(this.parameters.values()).some(parameterData => parameterData.value === undefined)) {
            throw new Error('Not all parameters are bound');
        }

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
                )
            );
    }
}