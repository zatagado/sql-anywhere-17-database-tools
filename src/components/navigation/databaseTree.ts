import { ConnectionManager, DataSource } from '../../manager/connectionManager';
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
            ConnectionManager.getDataSource(dataSourceName)!,
            TreeItemCollapsibleState.Collapsed,
            undefined,
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
                return Promise.resolve(node.getChildren(node));
            }
            else {
                return Promise.resolve([]);
            }
        }
        else {
            return Promise.resolve(this.databaseNodes);
        }
    }

    private createTypesNodes(parentNode: DatabaseItem): DatabaseItem[] {
        return [
            new DatabaseItem(
                parentNode.extensionRoot,
                'Tables',
                parentNode.dataSource,
                TreeItemCollapsibleState.Collapsed,
                undefined,
                (parentNode: DatabaseItem): DatabaseItem[] => {
                    return [];
                }
            ),
            new DatabaseItem(
                parentNode.extensionRoot,
                'Views',
                parentNode.dataSource,
                TreeItemCollapsibleState.Collapsed,
                undefined,
                (parentNode: DatabaseItem): DatabaseItem[] => {
                    return [];
                }
            ),
            new DatabaseItem(
                parentNode.extensionRoot,
                'Procedures',
                parentNode.dataSource,
                TreeItemCollapsibleState.Collapsed,
                undefined,
                (parentNode: DatabaseItem): DatabaseItem[] => {
                    return [];
                }
            )
        ];
    }

    addDatabase(dataSource: DataSource): void {
        this.databaseNodes.push(new DatabaseItem(
            this.context.extensionUri,
            dataSource.getName(),
            dataSource,
            TreeItemCollapsibleState.Collapsed,
            undefined,
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

export class DatabaseItem extends TreeItem {

    constructor(
        public readonly extensionRoot: Uri,
        public readonly label: string,
        public readonly dataSource: DataSource,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly command?: Command,
        public readonly getChildren?: (parentNode: DatabaseItem) => DatabaseItem[]
    ) {
        super(label, collapsibleState);

        this.dataSource = dataSource;

        this.iconPath = {
            light: Uri.joinPath(extensionRoot, 'resources', 'light', 'dependency.svg'),
            dark: Uri.joinPath(extensionRoot, 'resources', 'dark', 'dependency.svg'),
        };
    }

    contextValue = 'databaseItem';
}
