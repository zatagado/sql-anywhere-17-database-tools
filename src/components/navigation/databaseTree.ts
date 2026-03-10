import * as vscode from 'vscode';

const treeNodes: any = {
    label: () => {
        // TODO the function should return the label of the database
        return 'Database';
    },
    type: 'database',
    icon: () => {
        // TODO the function should return the icon of the database
        return 'database.svg';
    },
    children: [{
        label: () => {
            return 'Tables';
        },
        type: 'tables',
        icon: () => {
            // TODO the function should return the icon of the tables
            return 'tables.svg';
        },
        children: {
            type: 'table',
            onClick: () => {
                console.log('table clicked');
            }
        }
    }, {
        label: () => {
            return 'Views';
        },
        type: 'views',
        icon: () => {
            // TODO the function should return the icon of the views
            return 'views.svg';
        },
        children: {
            type: 'view',
            onClick: () => {
                console.log('view clicked');
            }
        }
    }, {
        label: () => {
            return 'Procedures';
        },
        type: 'procedures',
        icon: () => {
            // TODO the function should return the icon of the procedures
            return 'procedures.svg';
        },
        children: {
            type: 'procedure',
            onClick: () => {
                console.log('procedure clicked');
            }
        }
    }]
}

export class DatabaseTree implements vscode.TreeDataProvider<DatabaseItem> {


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

        return Promise.resolve([]);
    }

    private classify(parent: DatabaseItem): String[] {
        
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
        }
    }
}

export class 