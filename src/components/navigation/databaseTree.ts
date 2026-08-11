import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { DatabaseObjectType } from '../../manager/sqlManager';
import { openObject } from '../../shared/openObject';
import { DatabaseTreeRest } from '../../rest/navigation/databaseTreeRest';
import { openObjectDetails } from '../details/details';
import { openDatabaseObject } from '../preview/preview';
import { selectObject } from '../results/results';
import {
    Command,
    commands,
    Disposable,
    Event,
    EventEmitter,
    ExtensionContext,
    ThemeIcon,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
} from 'vscode';

export class DatabaseTree implements TreeDataProvider<DatabaseTreeItem> {

    public static context: ExtensionContext;

    private _onDidChangeTreeData: EventEmitter<DatabaseTreeItem | undefined | void> = new EventEmitter<DatabaseTreeItem | undefined | void>();
    readonly onDidChangeTreeData: Event<DatabaseTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private databaseNodes: DatabaseItem[] = [];

    constructor(
        private readonly context: ExtensionContext
    ) {
        DatabaseTree.context = context;

        const previousTreeDatasources = this.context.workspaceState.get('databaseTreeDatabases') as string[] ?? [];
        this.databaseNodes = previousTreeDatasources.map(dataSourceName => new DatabaseItem(
            dataSourceName,
            TreeItemCollapsibleState.Collapsed,
            ConnectionManager.getDataSource(dataSourceName)!
        ));
    }

    refresh(node?: DatabaseTreeItem): void {
        this._onDidChangeTreeData.fire(node);
    }

    getTreeItem(node: DatabaseTreeItem): TreeItem {
        return node;
    }

    getChildren(node?: DatabaseTreeItem): Thenable<DatabaseTreeItem[]> {
        if (!node) {
            return Promise.resolve(this.databaseNodes);
        }
        else {
            if (node instanceof DatabaseItem) {
                return node.getChildren();
            }
            else if (node instanceof TypesItem) {
                return node.getChildren();
            }
            else {
                return Promise.resolve([]);
            }
        }
    }

    addDatabase(dataSource: DataSource): void {
        if (this.databaseNodes.some(databaseNode => databaseNode.dataSource.getName() === dataSource.getName())) {
            return;
        }
        this.databaseNodes.push(new DatabaseItem(
            dataSource.getName(),
            TreeItemCollapsibleState.Collapsed,
            dataSource
        ));
        this.refresh();
        this.context.workspaceState.update('databaseTreeDatabases', this.databaseNodes.map(database => database.label));
    }

    removeDatabase(node: DatabaseItem): void {
        this.databaseNodes = this.databaseNodes.filter(databaseNode => databaseNode !== node);
        this.refresh();
        this.context.workspaceState.update('databaseTreeDatabases', this.databaseNodes.map(database => database.label));
    }
}

export class DatabaseTreeItem extends TreeItem {

    constructor(
        label: string,
        collapsibleState: TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

export class DatabaseItem extends DatabaseTreeItem {

    public readonly dataSource: DataSource;

    constructor(
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        dataSource: DataSource
    ) {
        super(label, collapsibleState);

        this.dataSource = dataSource;
        this.iconPath = new ThemeIcon('sqla-database');
    }

    getChildren(): Promise<TypesItem[]> {
        return Promise.resolve([
            new TypesItem(
                DatabaseObjectType.Table,
                TreeItemCollapsibleState.Collapsed,
                new ThemeIcon('sqla-folder'),
                this,
            ),
            new TypesItem(
                DatabaseObjectType.View,
                TreeItemCollapsibleState.Collapsed,
                new ThemeIcon('sqla-folder'),
                this,
            ),
            new TypesItem(
                DatabaseObjectType.Procedure,
                TreeItemCollapsibleState.Collapsed,
                new ThemeIcon('sqla-folder'),
                this,
            )
        ]);
    }

    contextValue = 'databaseItem';
}

export class TypesItem extends DatabaseTreeItem {

    public readonly type: DatabaseObjectType;
    public readonly parentNode: DatabaseItem;

    constructor(
        type: DatabaseObjectType,
        collapsibleState: TreeItemCollapsibleState,
        iconPath: ThemeIcon,
        parentNode: DatabaseItem,
    ) {
        super(type, collapsibleState);

        this.type = type;
        this.iconPath = iconPath;
        this.parentNode = parentNode;
    }

    async getChildren(): Promise<ObjectItem[]> {
        switch (this.type) {
            case DatabaseObjectType.Table: {
                const rows = await DatabaseTreeRest.getTables(this.parentNode.dataSource);
                return rows.map((row => {
                    const tableName = (row as unknown[])[0] as string;
                    return new ObjectItem(
                        tableName,
                        TreeItemCollapsibleState.None,
                        new ThemeIcon('sqla-table'),
                        this,
                        {
                            command: '_sql-anywhere-17-database-tools.databaseTree.openObject',
                            title: ''
                        }
                    );
                }));
            }
            case DatabaseObjectType.View: {
                const rows = await DatabaseTreeRest.getViews(this.parentNode.dataSource);
                return rows.map((row => {
                    const viewName = (row as unknown[])[0] as string;
                    return new ObjectItem(
                        viewName,
                        TreeItemCollapsibleState.None,
                        new ThemeIcon('sqla-view'),
                        this,
                        {
                            command: '_sql-anywhere-17-database-tools.databaseTree.openObject',
                            title: ''
                        }
                    );
                }));
            }
            case DatabaseObjectType.Procedure: {
                const rows = await DatabaseTreeRest.getProcedures(this.parentNode.dataSource);
                return rows.map((row => {
                    const procedureName = (row as unknown[])[0] as string;
                    return new ObjectItem(
                        procedureName,
                        TreeItemCollapsibleState.None,
                        new ThemeIcon('sqla-procedure'),
                        this,
                        {
                            command: '_sql-anywhere-17-database-tools.databaseTree.openObject',
                            title: ''
                        }
                    );
                }));
            }
        }
    }

    contextValue = 'typesItem';
}

export class ObjectItem extends DatabaseTreeItem {
    
    public readonly parentNode: TypesItem;

    constructor(
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        iconPath: ThemeIcon,
        parentNode: TypesItem,
        public readonly command?: Command
    ) {
        super(label, collapsibleState);
        this.iconPath = iconPath;
        this.parentNode = parentNode;
        if (parentNode.type === DatabaseObjectType.Table) {
            this.contextValue = 'tableObjectItem';
        }
        else if (parentNode.type === DatabaseObjectType.View) {
            this.contextValue = 'viewObjectItem';
        }
        else if (parentNode.type === DatabaseObjectType.Procedure) {
            this.contextValue = 'procedureObjectItem';
        }
        if (this.command) {
            this.command.arguments = [this];
        }
    }

    public getDataSource(): DataSource {
        return this.parentNode.parentNode.dataSource;
    }

    public getType(): DatabaseObjectType {
        return this.parentNode.type;
    }
}

export function activate(): Disposable[] {
    return [
        commands.registerCommand('_sql-anywhere-17-database-tools.databaseTree.searchDatasource', (node: DatabaseItem) =>
            commands.executeCommand('sql-anywhere-17-database-tools.search',
                ConnectionManager.getDataSource(node.label as string))),
        commands.registerCommand('_sql-anywhere-17-database-tools.databaseTree.searchType', (node: TypesItem) =>
            commands.executeCommand('sql-anywhere-17-database-tools.search',
                ConnectionManager.getDataSource(node.parentNode.label as string), node.type)),
        commands.registerCommand('_sql-anywhere-17-database-tools.databaseTree.openObject', (node: ObjectItem) =>
            openObject(node.getDataSource(), node.getType(), node.label as string)),
        commands.registerCommand('_sql-anywhere-17-database-tools.databaseTree.select',
            (node: ObjectItem) => selectObject(node.getDataSource(), node.label as string)),
        commands.registerCommand('_sql-anywhere-17-database-tools.databaseTree.preview', (node: ObjectItem) =>
            openDatabaseObject(node.getDataSource(), node.getType(), node.label as string)),
        commands.registerCommand('_sql-anywhere-17-database-tools.databaseTree.details', (node: ObjectItem) =>
            openObjectDetails(node.getDataSource(), node.getType(), node.label as string))
    ];
}
