import * as vscode from 'vscode';

export class DatabaseTree implements vscode.TreeDataProvider<DatabaseItem> {
    private databaseNodes: any[] = [];

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly workspaceRoot: string | undefined,
    ) { }

    refresh(): void {

    }

    getTreeItem(element: DatabaseItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DatabaseItem): Thenable<DatabaseItem[]> {
        // TODO list the connections from the previous session

        // getChildren: () => {
        //     return [{
        //         type: 'tables',
        //         label: () => {
        //             return 'Tables';
        //         },
        //         icon: () => {
        //             return 'tables.svg';
        //         },
        //         getChildren: () => {
        //             return null;
        //         }
        //     }, {
        //         type: 'views',
        //         label: () => {
        //             return 'Views';
        //         },
        //         icon: () => {
        //             return 'views.svg';
        //         },
        //         getChildren: () => {
        //             return null;
        //         }
        //     }, {
        //         type: 'procedures',
        //         label: () => {
        //             return 'Procedures';
        //         },
        //         icon: () => {
        //             return 'procedures.svg';
        //         },
        //         getChildren: () => {
        //             return null;
        //         }
        //     }]
        // }

        // return Promise.resolve([]);
        if (element) {
            return Promise.resolve([]);
        }
        else {
            // TODO
            // const previousTreeDatasources = this.context.globalState.get('databaseTreeDatasources') as string[];
            return Promise.resolve(this.getDatasourceNodes());
        }
    }

    private getDatasourceNodes(): any[] {
        let previousTreeDatasources = this.context.globalState.get('databaseTreeDatasources') as string[];
        // TODO may want to serialize the state of the nodes to see if they are collapsed or expanded
        
        previousTreeDatasources = ['TF - SAMM 1'];
        return previousTreeDatasources.map(dataSourceName => 
            new DatabaseItem(
                this.context.extensionUri,
                dataSourceName,
                vscode.TreeItemCollapsibleState.Collapsed
            )
        );
    }
}

export class DatabaseItem extends vscode.TreeItem {
    constructor(
        extensionRoot: vscode.Uri,
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);

        this.tooltip = 'Tooltip';
        this.description = 'SQL Anywhere 17';

        this.iconPath = {
            light: vscode.Uri.joinPath(extensionRoot, 'resources', 'light', 'dependency.svg'),
            dark: vscode.Uri.joinPath(extensionRoot, 'resources', 'dark', 'dependency.svg'),
        };
    }
}
