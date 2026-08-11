import {
    ConnectionManager,
    DataSource
} from '../../manager/connectionManager';
import {
    DatabaseObjectViewRest
} from '../../rest/preview/databaseObjectViewRest';
import { DatabaseObjectType } from '../../manager/sqlManager';
import {
    commands,
    Disposable,
    EventEmitter,
    TabInputText,
    TextDocumentContentProvider,
    Uri,
    window,
    workspace
} from 'vscode';

export const tableDocumentScheme = 'virtualTableSQL';
export const viewDocumentScheme = 'virtualViewSQL';
export const procedureDocumentScheme = 'virtualProcedureSQL';

export const viewDetailsPanelType = 'viewDetails';
export const tableDetailsPanelType = 'tableDetails';
export const procedureDetailsPanelType = 'procedureDetails';

export async function openDatabaseObject(
    dataSource: DataSource,
    type: DatabaseObjectType,
    objectName: string
): Promise<void> {
    let scheme: string;
    switch (type) {
        case DatabaseObjectType.Table:
            scheme = tableDocumentScheme;
            break;
        case DatabaseObjectType.View:
            scheme = viewDocumentScheme;
            break;
        case DatabaseObjectType.Procedure:
            scheme = procedureDocumentScheme;
            break;
        default:
            return;
    }

    const uri = Uri.parse(`${scheme}:${dataSource.getName()}/${objectName}.sql`);
    
    // Check if the document is already open in any tab group
    const allTabs = window.tabGroups.all.flatMap(tabGroup => tabGroup.tabs);
    const existingTab = allTabs.find(tab => {
        return tab.input instanceof TabInputText && tab.input.uri.toString() === uri.toString();
    });
    
    if (existingTab) {
        await window.showTextDocument(uri, {
            viewColumn: existingTab.group.viewColumn, 
            preserveFocus: false, 
            preview: true 
        });
    } else {
        const document = await workspace.openTextDocument(uri);
        await window.showTextDocument(document, { preview: true });
    }
}

function detailsPanelObjectType(viewType: string): DatabaseObjectType | undefined {
    // The tab API may report the view type with a host prefix, so match on the suffix.
    if (viewType.endsWith(viewDetailsPanelType)) {
        return DatabaseObjectType.View;
    }
    if (viewType.endsWith(procedureDetailsPanelType)) {
        return DatabaseObjectType.Procedure;
    }
    if (viewType.endsWith(tableDetailsPanelType)) {
        return DatabaseObjectType.Table;
    }
    return undefined;
}

async function documentForDetailsView(): Promise<void> {
    const activeTab = window.tabGroups.activeTabGroup.activeTab;
    const input = activeTab?.input;
    if (!input || typeof input !== 'object' || !('viewType' in input) || typeof input.viewType !== 'string') {
        return;
    }

    const type = detailsPanelObjectType(input.viewType);
    if (type === undefined) {
        return;
    }

    // The panel title is `${dataSource.getName()} - ${objectName}`.
    const separatorChars = ' - ';
    const separatorIndex = activeTab!.label.lastIndexOf(separatorChars);
    const databaseName = activeTab!.label.substring(0, separatorIndex);
    const objectName = activeTab!.label.substring(separatorIndex + separatorChars.length);

    const dataSource = ConnectionManager.getDataSource(databaseName);
    if (!dataSource) {
        return;
    }

    await openDatabaseObject(dataSource, type, objectName);
}

export function activate(): Disposable[] {
    class TableProvider implements TextDocumentContentProvider {
        static readonly scheme = tableDocumentScheme;

        _onDidChangeEmitter = new EventEmitter<Uri>();
        onDidChange = this._onDidChangeEmitter.event;

        async provideTextDocumentContent(uri: Uri): Promise<string> {
            const separatorIndex = uri.path.lastIndexOf('/');
            const databaseName = uri.path.substring(0, separatorIndex);
            const tableName = uri.path.substring(separatorIndex + 1, uri.path.length - 4);
            const tableRow = (await DatabaseObjectViewRest.getTable(
                ConnectionManager.getDataSource(databaseName)!, tableName))[0] as unknown[];
            return tableRow[0] as string;
        }
    }

    class ViewProvider implements TextDocumentContentProvider {
        static readonly scheme = viewDocumentScheme;

        _onDidChangeEmitter = new EventEmitter<Uri>();
        onDidChange = this._onDidChangeEmitter.event;

        async provideTextDocumentContent(uri: Uri): Promise<string> {
            const separatorIndex = uri.path.lastIndexOf('/');
            const databaseName = uri.path.substring(0, separatorIndex);
            const viewName = uri.path.substring(separatorIndex + 1, uri.path.length - 4);
            return DatabaseObjectViewRest.getView(ConnectionManager.getDataSource(databaseName)!, viewName).then(
                result => (result[0] as unknown[])[0] as string);
        }
    }

    class ProcedureProvider implements TextDocumentContentProvider {
        static readonly scheme = procedureDocumentScheme;

        _onDidChangeEmitter = new EventEmitter<Uri>();
        onDidChange = this._onDidChangeEmitter.event;

        async provideTextDocumentContent(uri: Uri): Promise<string> {
            const separatorIndex = uri.path.lastIndexOf('/');
            const databaseName = uri.path.substring(0, separatorIndex);
            const procedureName = uri.path.substring(separatorIndex + 1, uri.path.length - 4);
            const procedureRow = (await DatabaseObjectViewRest.getProcedure(
                ConnectionManager.getDataSource(databaseName)!, procedureName))[0] as unknown[];
            return procedureRow[0] as string;
        }
    }

    return [
        workspace.registerTextDocumentContentProvider(TableProvider.scheme, new TableProvider()),
        workspace.registerTextDocumentContentProvider(ViewProvider.scheme, new ViewProvider()),
        workspace.registerTextDocumentContentProvider(ProcedureProvider.scheme, new ProcedureProvider()),
        commands.registerCommand('sql-anywhere-17-database-tools.preview.openDetailsDocument', documentForDetailsView)
    ];
}
