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

export class DatabaseTree implements TreeDataProvider<DatabaseItem> {

    private _onDidChangeTreeData: EventEmitter<DatabaseItem | undefined | void> = new EventEmitter<DatabaseItem | undefined | void>();
    readonly onDidChangeTreeData: Event<DatabaseItem | undefined | void> = this._onDidChangeTreeData.event;

    private databaseNodes: DatabaseItem[] = [];

    constructor(
        private readonly context: ExtensionContext
    ) {
        const previousTreeDatasources = this.context.workspaceState.get('databaseTreeDatabases') as string[] ?? [];
        this.databaseNodes = previousTreeDatasources.map(dataSourceName => new DatabaseItem(
            this.context.extensionUri,
            dataSourceName,
            TreeItemCollapsibleState.Collapsed,
            ConnectionManager.getDataSource(dataSourceName)!,
            this.createTypesNodes
        ));
    }

    refresh(node?: DatabaseItem): void {
        this._onDidChangeTreeData.fire(node);
    }

    getTreeItem(node: DatabaseItem): TreeItem {
        return node;
    }

    getChildren(node?: DatabaseItem): Thenable<DatabaseItem[]> {
        if (node) {
            if (node.getChildren) {
                return node.getChildren(node);
            }
            else {
                return Promise.resolve([]);
            }
        }
        else {
            return Promise.resolve(this.databaseNodes);
        }
    }

    addDatabase(dataSource: DataSource): void {
        // TODO do not allow duplicates, may need to queue additions while loading
        this.databaseNodes.push(new DatabaseItem(
            this.context.extensionUri,
            dataSource.getName(),
            TreeItemCollapsibleState.Collapsed,
            dataSource,
            this.createTypesNodes
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

    public readonly extensionRoot: Uri;

    constructor(
        extensionRoot: Uri,
        label: string,
        collapsibleState: TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        this.extensionRoot = extensionRoot;
    }

    contextValue = 'databaseTreeItem';
}

export class DatabaseItem extends DatabaseTreeItem {
    public readonly dataSource: DataSource;

    constructor(
        extensionRoot: Uri,
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        dataSource: DataSource
    ) {
        super(extensionRoot, label, collapsibleState);

        this.dataSource = dataSource;

        this.iconPath = {
            light: Uri.joinPath(extensionRoot, 'resources', 'light', 'dependency.svg'),
            dark: Uri.joinPath(extensionRoot, 'resources', 'dark', 'dependency.svg'),
        };
    }

    getChildren(): Promise<TypesItem[]> {
        return Promise.resolve([
            new TypesItem(
                this.extensionRoot,
                'Tables',
                TreeItemCollapsibleState.Collapsed,
                this,
            ),
            new TypesItem(
                this.extensionRoot,
                'Views',
                TreeItemCollapsibleState.Collapsed,
                this,
            ),
            new TypesItem(
                this.extensionRoot,
                'Procedures',
                TreeItemCollapsibleState.Collapsed,
                this,
            )
        ]);
    }
}

export class TypesItem extends DatabaseTreeItem {

    enum DatabaseObjectType {
        Tables = 'Tables',
        Views = 'Views',
        Procedures = 'Procedures'
    }

    public readonly parentNode: DatabaseItem;

    constructor(
        extensionRoot: Uri,
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        parentNode: DatabaseItem,
    ) {
        super(extensionRoot, label, collapsibleState);

        this.parentNode = parentNode;
    }

    getChildren(): Promise<ObjectItem[]> {
        if (this.parentNode.label === 'Tables') {
            try {
                const rows = await DatabaseTreeRest.getTables(typesNode.dataSource, 10000, 0);
                return rows.map((row: unknown) => {
                    const o = row as Record<string, string>;
                    return new ObjectItem(
                        this.parentNode.extensionRoot,
                        o.TableName ?? o.TABLENAME ?? '',
                        TreeItemCollapsibleState.None,
                        this.parentNode
                    );
                });
            } catch {
                return [];
            }
        }
}

export class ObjectItem extends DatabaseTreeItem {
    
    public readonly parentNode: TypesItem;
    public readonly command?: Command;

    constructor(
        extensionRoot: Uri,
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        parentNode: TypesItem,
        command?: Command
    ) {
        super(extensionRoot, label, collapsibleState, undefined);

        this.parentNode = parentNode;
        this.command = command;
    }
}