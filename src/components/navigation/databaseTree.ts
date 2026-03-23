import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { DatabaseTreeRest } from '../../rest/navigation/databaseTreeRest';
import {
    Command,
    Event,
    EventEmitter,
    ExtensionContext,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    Uri,
} from 'vscode';

export enum DatabaseObjectType {
    Table = 'Table',
    View = 'View',
    Procedure = 'Procedure',
}

export class DatabaseTree implements TreeDataProvider<DatabaseTreeItem> {

    public static context: ExtensionContext;

    private _onDidChangeTreeData: EventEmitter<DatabaseTreeItem | undefined | void> = new EventEmitter<DatabaseTreeItem | undefined | void>();
    readonly onDidChangeTreeData: Event<DatabaseTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    // TODO event that opens a virtual document, 

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
        this.iconPath = {
            light: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'light', 'database.svg'),
            dark: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'dark', 'database.svg'),
        };
    }

    getChildren(): Promise<TypesItem[]> {
        return Promise.resolve([
            new TypesItem(
                DatabaseObjectType.Table,
                TreeItemCollapsibleState.Collapsed,
                {
                    light: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'light', 'folder.svg'),
                    dark: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'dark', 'folder.svg'),
                },
                this,
            ),
            new TypesItem(
                DatabaseObjectType.View,
                TreeItemCollapsibleState.Collapsed,
                {
                    light: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'light', 'folder.svg'),
                    dark: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'dark', 'folder.svg'),
                },
                this,
            ),
            new TypesItem(
                DatabaseObjectType.Procedure,
                TreeItemCollapsibleState.Collapsed,
                {
                    light: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'light', 'folder.svg'),
                    dark: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'dark', 'folder.svg'),
                },
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
        iconPath: { light: Uri; dark: Uri },
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
                const rows = await DatabaseTreeRest.getTables(this.parentNode.dataSource, 10000, 0);
                return rows.map((row => {
                    const table = row as { TableName: string };
                    return new ObjectItem(
                        table.TableName,
                        TreeItemCollapsibleState.None,
                        {
                            light: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'light', 'table.svg'),
                            dark: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'dark', 'table.svg'),
                        },
                        this,
                        {
                            command: 'databaseObjectView.open',
                            title: ''
                        }
                    );
                }));
            }
            case DatabaseObjectType.View: {
                const rows = await DatabaseTreeRest.getViews(this.parentNode.dataSource, 10000, 0);
                return rows.map((row => {
                    const view = row as { ViewName: string };
                    return new ObjectItem(
                        view.ViewName,
                        TreeItemCollapsibleState.None,
                        {
                            light: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'light', 'view.svg'),
                            dark: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'dark', 'view.svg'),
                        },
                        this,
                        {
                            command: 'databaseObjectView.open',
                            title: ''
                        }
                    );
                }));
            }
            case DatabaseObjectType.Procedure: {
                const rows = await DatabaseTreeRest.getProcedures(this.parentNode.dataSource, 10000, 0);
                return rows.map((row => {
                    const procedure = row as { ProcedureName: string };
                    return new ObjectItem(
                        procedure.ProcedureName,
                        TreeItemCollapsibleState.None,
                        {
                            light: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'light', 'procedure.svg'),
                            dark: Uri.joinPath(DatabaseTree.context.extensionUri, 'resources', 'dark', 'procedure.svg'),
                        },
                        this,
                        {
                            command: 'databaseObjectView.open',
                            title: ''
                        }
                    );
                }));
            }
        }
    }
}

export class ObjectItem extends DatabaseTreeItem {
    
    public readonly parentNode: TypesItem;

    constructor(
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        iconPath: { light: Uri, dark: Uri },
        parentNode: TypesItem,
        public readonly command?: Command
    ) {
        super(label, collapsibleState);
        this.iconPath = iconPath;
        this.parentNode = parentNode;
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