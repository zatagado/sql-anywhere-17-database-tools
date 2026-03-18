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

    private createTypesNodes(databaseNode: DatabaseItem): Promise<DatabaseItem[]> {
        return Promise.resolve([
            new DatabaseItem(
                databaseNode.extensionRoot,
                'Tables',
                databaseNode.dataSource,
                TreeItemCollapsibleState.Collapsed,
                undefined,
                async (typesNode: DatabaseItem): Promise<DatabaseItem[]> => {
                    try {
                        const rows = await DatabaseTreeRest.getTables(typesNode.dataSource, 50, 0);
                        return rows
                            .map(row => {
                                const r = row as Record<string, unknown>;
                                return String(r.TableName ?? r.tablename ?? '');
                            })
                            .filter(name => name.length > 0)
                            .map(tableName => new DatabaseItem(
                                databaseNode.extensionRoot,
                                tableName,
                                typesNode.dataSource,
                                TreeItemCollapsibleState.None,
                                undefined,
                                undefined
                            ));
                    } catch {
                        return [];
                    }
                }
            ),
            new DatabaseItem(
                databaseNode.extensionRoot,
                'Views',
                databaseNode.dataSource,
                TreeItemCollapsibleState.Collapsed,
                undefined,
                async (typesNode: DatabaseItem): Promise<DatabaseItem[]> => {
                    // ConnectionManager.execute(typesNode.dataSource, 'SELECT * FROM sys.views').then(views => {
                    //     return views.map(view => new DatabaseItem(
                    //         databaseNode.extensionRoot,
                    //         view.getName(),
                    //         view,
                    //         TreeItemCollapsibleState.Collapsed,
                    //         undefined,
                    //         undefined
                    //     ));
                    // });
                    return [];
                }
            ),
            new DatabaseItem(
                databaseNode.extensionRoot,
                'Procedures',
                databaseNode.dataSource,
                TreeItemCollapsibleState.Collapsed,
                undefined,
                async (typesNode: DatabaseItem): Promise<DatabaseItem[]> => {
                    return [];
                }
            )
        ]);
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
        public readonly getChildren?: (parentNode: DatabaseItem) => Promise<DatabaseItem[]>
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
