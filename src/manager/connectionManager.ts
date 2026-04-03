import * as odbc from 'odbc';
import { ExtensionContext } from 'vscode';

let lastOdbcDebugLogMs = Date.now();

function odbcDebugLog(message: string): void {
    const now = Date.now();
    const deltaMs = now - lastOdbcDebugLogMs;
    lastOdbcDebugLogMs = now;
    console.log(`[odbc] ${message} (+${deltaMs}ms since last log)`);
}

/** Return a pooled connection to the node-odbc pool (`close` is the pool’s recycle hook). */
function releaseConnection(connection: odbc.Connection): Promise<void> {
    return connection.close().catch(() => undefined);
}

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
        const name = dataSource.getName();
        odbcDebugLog(`ConnectionManager.prepare start "${name}"`);
        return dataSource.getConnection().then(connection =>
            PreparedStatement.create(connection, query).catch(() => {
                odbcDebugLog(`ConnectionManager.prepare create failed "${name}", reconnect`);
                return dataSource.reconnect().then(newConnection => PreparedStatement.create(newConnection, query));
            }).then(ps => {
                odbcDebugLog(`ConnectionManager.prepare done "${name}"`);
                return ps;
            })
        );
    }

    static execute(dataSource: DataSource, query: string, updateRecent: boolean = true): Promise<odbc.Result<unknown>> {
        if (updateRecent) {
            this.updateRecentStack(dataSource);
        }
        const name = dataSource.getName();
        odbcDebugLog(`ConnectionManager.execute start "${name}"`);
        return dataSource.getConnection().then(connection => {
            odbcDebugLog(`ConnectionManager.execute query start "${name}"`);
            const queryStartMs = Date.now();
            return connection.query(query).then(
                result => {
                    odbcDebugLog(
                        `ConnectionManager.execute query done "${name}" queryTime=${Date.now() - queryStartMs}ms`
                    );
                    return releaseConnection(connection).then(() => result);
                },
                () => {
                    odbcDebugLog(
                        `ConnectionManager.execute query failed "${name}" after ${Date.now() - queryStartMs}ms, reconnect`
                    );
                    return releaseConnection(connection).then(() =>
                        dataSource.reconnect().then(newConnection => {
                            odbcDebugLog(`ConnectionManager.execute retry query start "${name}"`);
                            const retryStartMs = Date.now();
                            return newConnection.query(query).then(
                                r => {
                                    odbcDebugLog(
                                        `ConnectionManager.execute retry query done "${name}" queryTime=${Date.now() - retryStartMs}ms`
                                    );
                                    return releaseConnection(newConnection).then(() => r);
                                },
                                err => releaseConnection(newConnection).then(() => Promise.reject(err))
                            );
                        })
                    );
                }
            );
        });
    }
}

export class DataSource {
    private static readonly MAX_RECONNECT_ATTEMPTS = 3;
    private static readonly RECONNECT_DELAY_MS = 1000;
    /** `pool.close()` can block for minutes on a dead ODBC pool; cap wait so reconnect can create a new pool. */
    private static readonly POOL_CLOSE_TIMEOUT_MS = 15_000;

    private name: string;
    private type: string;
    private pool?: Promise<odbc.Pool>;

    constructor(name: string, type: string) {
        this.name = name;
        this.type = type;
    }

    private async getPool(): Promise<odbc.Pool> {
        odbcDebugLog(`getPool start "${this.name}"`);
        if (!this.pool) {
            odbcDebugLog(`getPool creating new pool "${this.name}"`);
            this.pool = odbc.pool(`DSN=${this.name}`);
        }
        const pool = await this.pool;
        odbcDebugLog(`getPool done "${this.name}"`);
        return pool;
    }

    private async disposePool(): Promise<void> {
        if (this.pool === undefined) {
            return;
        }
        odbcDebugLog(`disposePool close start "${this.name}"`);
        const poolPromise = this.pool;
        try {
            const pool = await poolPromise;
            await Promise.race([
                pool.close(),
                new Promise<never>((_, reject) =>
                    setTimeout(
                        () => reject(new Error(`pool.close timeout after ${DataSource.POOL_CLOSE_TIMEOUT_MS}ms`)),
                        DataSource.POOL_CLOSE_TIMEOUT_MS
                    ))
            ]);
        } catch {
            // close error or timeout — still drop the pool reference
        }
        this.pool = undefined;
        odbcDebugLog(`disposePool close finished "${this.name}"`);
    }

    isConnected(): boolean {
        return this.pool !== undefined;
    }

    async reconnect(): Promise<odbc.Connection> {
        await this.disposePool();

        for (let attempt = 0; attempt < DataSource.MAX_RECONNECT_ATTEMPTS; attempt++) {
            if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, DataSource.RECONNECT_DELAY_MS));
            }
            try {
                const pool = await this.getPool();
                odbcDebugLog(`reconnect pool.connect start "${this.name}"`);
                const connection = await pool.connect();
                odbcDebugLog(`reconnect pool.connect done "${this.name}"`);
                return connection;
            } catch (err) {
                await this.disposePool();
            }
        }

        throw new Error(`Failed to reconnect to datasource "${this.name}"
            after ${DataSource.MAX_RECONNECT_ATTEMPTS} attempts`);
    }

    getConnection(): Promise<odbc.Connection> {
        return this.getPool().then(pool => {
            odbcDebugLog(`pool.connect start "${this.name}"`);
            return pool.connect().then(connection => {
                odbcDebugLog(`pool.connect done "${this.name}"`);
                return connection;
            });
        });
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
        odbcDebugLog('PreparedStatement createStatement start');
        return connection.createStatement().then(statement => {
            odbcDebugLog('PreparedStatement createStatement done');
            odbcDebugLog('PreparedStatement prepare start');
            const preparedStatement = new PreparedStatement(statement, query);
            return preparedStatement.statement.prepare(query.replace(/\$\w+/gm, '?')).then(() => {
                odbcDebugLog('PreparedStatement prepare done');
                return preparedStatement;
            });
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

        const values = Array.from(this.parameters.values()).sort(
            (a, b) => a.position - b.position).map(parameterData => parameterData.value);
        odbcDebugLog('PreparedStatement bind start');
        return this.statement.bind(values).then(() => {
            odbcDebugLog('PreparedStatement bind done');
            odbcDebugLog('PreparedStatement execute start');
            return this.statement.execute().then(
                result => {
                    odbcDebugLog('PreparedStatement execute done');
                    this.statement.close(); // TODO not sure if closing is necessary, or at the end and add explicit close method to prepared statement class
                    return result;
                },
                err => {
                    odbcDebugLog('PreparedStatement execute failed');
                    this.statement.close();
                    throw err;
                }
            );
        });
    }
}