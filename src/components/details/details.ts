import {
    Disposable,
    ExtensionContext,
    WebviewPanel,
    Uri,
    commands,
    window,
    ViewColumn
} from 'vscode';
import { getWebviewHtml, waitForWebviewReady, DatabaseObjectType } from '../../shared/webviewUtils';
import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { DetailsRest } from '../../rest/details/detailsRest';
import {
    tableDocumentScheme,
    viewDocumentScheme,
    procedureDocumentScheme,
    viewDetailsPanelType,
    tableDetailsPanelType,
    procedureDetailsPanelType
} from '../preview/preview';

// TODO we will need to make sure this can handle when we separate the tabs and move them around
export class Details {
    static map = new Map<string, WebviewPanel>();
}

export async function openObjectDetails(
    dataSource: DataSource,
    type: DatabaseObjectType,
    objectName: string
): Promise<void> {
    await commands.executeCommand('_sql-anywhere-17-database-tools.info.details', dataSource, type, objectName);
}

export function activate(context: ExtensionContext): Disposable[] {
    async function detailsView(dataSource: DataSource, type: DatabaseObjectType, objectName: string) {
        const panelTitle = `${dataSource.getName()} - ${objectName}`;
        let panelType: string;
        switch (type) {
            case DatabaseObjectType.View:
                panelType = viewDetailsPanelType;
                break;
            case DatabaseObjectType.Table:
                panelType = tableDetailsPanelType;
                break;
            case DatabaseObjectType.Procedure:
                panelType = procedureDetailsPanelType;
                break;
            default:
                return;
        }
        const key = `${dataSource.getName()} ${type} ${objectName}`;
        const existingPanel = Details.map.get(key);
        if (existingPanel) {
            existingPanel.reveal(existingPanel.viewColumn ?? ViewColumn.Active);
            return;
        }

        const panel = window.createWebviewPanel(panelType, panelTitle,
            { viewColumn: ViewColumn.Active },
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        panel.iconPath = {
            light: Uri.joinPath(context.extensionUri, 'resources', 'light', 'object-details.svg'),
            dark: Uri.joinPath(context.extensionUri, 'resources', 'dark', 'object-details.svg')
        };

        Details.map.set(key, panel);
        panel.onDidDispose(() => {
            if (Details.map.get(key) === panel) {
                Details.map.delete(key);
            }
        });

        panel.webview.html = getWebviewHtml(panel, context.extensionUri, 'objectDetails');
        await waitForWebviewReady(panel);

        panel.webview.postMessage({
            type: 'onResultType',
            databaseObjectType: type
        });

        DetailsRest.getColumns(dataSource, objectName, type).then(columns => {
            const columnsArray = Array.from(columns);
            panel.webview.postMessage({
                type: 'onResultDetails',
                databaseObjectType: type,
                tab: 'columns',
                columns: columns.columns,
                count: columnsArray.length,
                statement: columns.statement,
                return: columns.return,
                parameters: columns.parameters,
                truncated: columns.truncated ?? false
            });
            panel.webview.postMessage({
                type: 'onResultRows',
                tab: 'columns',
                rows: columnsArray,
                count: columnsArray.length,
                startIndex: 0
            });
        }).catch((err: unknown) => {
            panel.webview.postMessage({
                type: 'onError',
                tab: 'columns',
                message: err instanceof Error ? err.message : String(err)
            });
        });

        if (type === DatabaseObjectType.Table) {
            DetailsRest.getConstraints(dataSource, objectName, type).then(constraints => {
                const constraintsArray = Array.from(constraints);
                panel.webview.postMessage({
                    type: 'onResultDetails',
                    databaseObjectType: type,
                    tab: 'constraints',
                    columns: constraints.columns,
                    count: constraintsArray.length,
                    statement: constraints.statement,
                    return: constraints.return,
                    parameters: constraints.parameters,
                    truncated: constraints.truncated ?? false
                });
                panel.webview.postMessage({
                    type: 'onResultRows',
                    tab: 'constraints',
                    rows: constraintsArray,
                    count: constraintsArray.length,
                    startIndex: 0
                });
            }).catch((err: unknown) => {
                panel.webview.postMessage({
                    type: 'onError',
                    tab: 'constraints',
                    message: err instanceof Error ? err.message : String(err)
                });
            });

            DetailsRest.getReferencingConstraints(dataSource, objectName, type).then(referencingConstraints => {
                const referencingConstraintsArray = Array.from(referencingConstraints);
                panel.webview.postMessage({
                    type: 'onResultDetails',
                    databaseObjectType: type,
                    tab: 'referencingConstraints',
                    columns: referencingConstraints.columns,
                    count: referencingConstraintsArray.length,
                    statement: referencingConstraints.statement,
                    return: referencingConstraints.return,
                    parameters: referencingConstraints.parameters,
                    truncated: referencingConstraints.truncated ?? false
                });
                panel.webview.postMessage({
                    type: 'onResultRows',
                    tab: 'referencingConstraints',
                    rows: referencingConstraintsArray,
                    count: referencingConstraintsArray.length,
                    startIndex: 0
                });
            }).catch((err: unknown) => {
                panel.webview.postMessage({
                    type: 'onError',
                    tab: 'referencingConstraints',
                    message: err instanceof Error ? err.message : String(err)
                });
            });
        }

        DetailsRest.getPrivileges(dataSource, objectName, type).then(privileges => {
            const privilegesArray = Array.from(privileges);
            panel.webview.postMessage({
                type: 'onResultDetails',
                databaseObjectType: type,
                tab: 'privileges',
                columns: privileges.columns,
                count: privilegesArray.length,
                statement: privileges.statement,
                return: privileges.return,
                parameters: privileges.parameters,
                truncated: privileges.truncated ?? false
            });
            panel.webview.postMessage({
                type: 'onResultRows',
                tab: 'privileges',
                rows: privilegesArray,
                count: privilegesArray.length,
                startIndex: 0
            });
        }).catch((err: unknown) => {
            panel.webview.postMessage({
                type: 'onError',
                tab: 'privileges',
                message: err instanceof Error ? err.message : String(err)
            });
        });
    }

    async function detailsViewForDocument() {
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        const uri = editor.document.uri;
        let type: DatabaseObjectType;
        if (uri.scheme === tableDocumentScheme) {
            type = DatabaseObjectType.Table;
        }
        else if (uri.scheme === viewDocumentScheme) {
            type = DatabaseObjectType.View;
        }
        else if (uri.scheme === procedureDocumentScheme) {
            type = DatabaseObjectType.Procedure;
        }
        else {
            return;
        }

        const parts = uri.path.split('/');
        const databaseName = parts[0];
        const objectName = parts[1].substring(0, parts[1].length - 4);
        const dataSource = ConnectionManager.getDataSource(databaseName);
        if (!dataSource) {
            return;
        }

        await detailsView(dataSource, type, objectName);
    }

    return [
        commands.registerCommand('_sql-anywhere-17-database-tools.info.details', detailsView),
        commands.registerCommand('sql-anywhere-17-database-tools.info.openDocumentDetails', detailsViewForDocument)
    ];
}
