import * as vscode from 'vscode';

// const treeNodes: any = {
//     type: 'database',
//     label: (dataSourceName: string) => {
//         return dataSourceName;
//     },
//     icon: () => {
//         // TODO the function should return the icon of the database
//         return 'database.svg';
//     },
//     children: [{
//         type: 'tables',
//         label: () => {
//             return 'Tables';
//         },
//         icon: () => {
//             // TODO the function should return the icon of the tables
//             return 'tables.svg';
//         },
//         children: {
//             type: 'table',
//             label: (dataSourceName: string, parentItem: DatabaseItem) => {
//                 // TODO
//                 return 'table';
//             },
//             icon: () => {
//                 return 'table.svg';
//             },
//             onClick: () => {
//                 console.log('table clicked');
//             }
//         }
//     }, {
//         type: 'views',
//         label: () => {
//             return 'Views';
//         },
//         icon: () => {
//             // TODO the function should return the icon of the views
//             return 'views.svg';
//         },
//         children: {
//             type: 'view',
//             label: (dataSourceName: string, parentItem: DatabaseItem) => {
//                 // TODO
//                 return 'view';
//             },
//             onClick: () => {
//                 console.log('view clicked');
//             }
//         }
//     }, {
//         type: 'procedures',
//         label: () => {
//             return 'Procedures';
//         },
//         icon: () => {
//             // TODO the function should return the icon of the procedures
//             return 'procedures.svg';
//         },
//         children: {
//             type: 'procedure',
//             label: (dataSourceName: string, parentItem: DatabaseItem) => {
//                 // TODO
//                 return 'procedure';
//             },
//             onClick: () => {
//                 console.log('procedure clicked');
//             }
//         }
//     }]
// }

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
        
        previousTreeDatasources = ['SAMMDev'];
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
        this.description = 'Description';

        this.iconPath = {
            light: vscode.Uri.joinPath(extensionRoot, 'resources', 'light', 'dependency.svg'),
            dark: vscode.Uri.joinPath(extensionRoot, 'resources', 'dark', 'dependency.svg'),
        };
    }
}
