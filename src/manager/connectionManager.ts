import * as odbc from 'odbc';
import { ExtensionContext, ProgressLocation, window, workspace } from 'vscode';

const LOADING_RESPONSE_TIMEOUT_MS = 5000;

export class ConnectionManager {

    // TODO removing a datasource should trigger an event that tree will need to subscribe to

    private static context: ExtensionContext;
    private static stack: DataSource[] = [];

    static activate(context: ExtensionContext): DataSource[] {
        this.context = context;
        this.stack = (this.context.globalState.get('dataSources') as { name: string, type: string }[] ?? []).map(
            dataSource => new DataSource(dataSource.name, dataSource.type));
        return this.stack;
    }

    static reload(): void {
        this.stack.forEach(dataSource => dataSource.disconnect());
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

    static getMaxResultRows(): number {
        return workspace.getConfiguration('sql-anywhere-17-database-tools.results')
            .get<number>('maxRows')!;
    }

    static getQueryTimeout(): number {
        return workspace.getConfiguration('sql-anywhere-17-database-tools.results')
            .get<number>('timeout')!;
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
        return dataSource.getConnectionWithRetry().then(connection =>
            PreparedStatement.create(connection, query)
        );
    }

    static execute(dataSource: DataSource, query: string,
        updateRecent: boolean = true): Promise<odbc.Result<unknown>[]> {
        if (updateRecent) {
            this.updateRecentStack(dataSource);
        }

        const queryOptions: odbc.QueryOptions = {
            multipleResultSets: true,
            maxRows: this.getMaxResultRows()
        };
        return this.withTimeout(dataSource, dataSource.getConnectionWithRetry().then(connection =>
            connection.query(query, queryOptions)
        ).then(raw => raw as odbc.Result<unknown>[]));
    }

    private static withTimeout<T>(
        dataSource: DataSource, promise: Promise<T>
    ): Promise<T> {
        let hasCompleted = false;
        promise.then(() => hasCompleted = true).catch(() => hasCompleted = true);
        new Promise((_, reject) => {
            setTimeout(() => {
                if (!hasCompleted) {
                    reject(new Error('Loading'));
                }
            }, LOADING_RESPONSE_TIMEOUT_MS);
        }).catch(err => {
            if (err instanceof Error && err.message === 'Loading') {
                window.withProgress({
                    location: ProgressLocation.Notification,
                    title: `${dataSource.getName()} is taking longer than expected to get results...`,
                }, () => promise);
            }
            else {
                throw err;
            }
        });
        return promise;
    }

    static executeAll(dataSource: DataSource, query: string, updateRecent: boolean = true): Promise<odbc.Result<unknown>> {
        if (updateRecent) {
            this.updateRecentStack(dataSource);
        }

        const queryOptions: odbc.QueryOptions = {
            maxRows: this.getMaxResultRows()
        };
        return this.withTimeout(dataSource, dataSource.getConnectionWithRetry().then(connection =>
            connection.query(query, queryOptions)
        ));
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
        this.pool = this.pool ?? odbc.pool({
            connectionString: `DSN=${this.name}`,
            fetchArray: true
        });
        return this.pool;
    }

    private disposePool(): void {
        this.pool?.then(pool => pool.close());
        this.pool = undefined;
    }

    private static getUsePooling(): boolean {
        return workspace.getConfiguration('sql-anywhere-17-database-tools.connection').get<boolean>('usePooling')!;
    }

    isConnected(): boolean {
        return !DataSource.getUsePooling() || this.pool !== undefined;
    }

    private getDirectConnection(): Promise<odbc.Connection> {
        return odbc.connect({
            connectionString: `DSN=${this.name}`,
            fetchArray: true
        });
    }

    getConnection(): Promise<odbc.Connection> {
        return DataSource.getUsePooling() ? this.getPool().then(pool => pool.connect()) : this.getDirectConnection();
    }

    async getConnectionWithRetry(): Promise<odbc.Connection> {
        for (let attempt = 0; attempt < DataSource.MAX_RECONNECT_ATTEMPTS; attempt++) {
            try {
                return this.getConnection();
            } catch (err) {
                if (DataSource.getUsePooling()) {
                    this.disposePool();
                }
            }
            await new Promise(resolve => setTimeout(resolve, DataSource.RECONNECT_DELAY_MS));
        }

        throw new Error(`Failed to reconnect to datasource "${this.name}"
            after ${DataSource.MAX_RECONNECT_ATTEMPTS} attempts`);
    }

    disconnect(): Promise<void> | undefined {
        const pool = this.pool;
        this.pool = undefined;
        return pool?.then(pool => pool.close());
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
                            this.statement.close();
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
