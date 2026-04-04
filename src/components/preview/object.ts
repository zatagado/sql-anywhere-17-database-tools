import {
    ConnectionManager,
    DataSource
} from '../../manager/connectionManager';
import {
    DatabaseObjectViewRest
} from '../../rest/preview/databaseObjectViewRest';
import { DatabaseObjectType } from '../../manager/sqlManager';
import {
    Disposable,
    EventEmitter,
    TextDocumentContentProvider,
    Uri,
    window,
    workspace
} from 'vscode';

const viewDocumentScheme = 'virtualViewSQL';
const procedureDocumentScheme = 'virtualProcedureSQL';

/** Opens a view or procedure document the same way as the database tree (tables are not previewed yet). */
export async function openDatabaseObject(
    dataSource: DataSource,
    type: DatabaseObjectType,
    objectName: string
): Promise<void> {
    switch (type) {
        case DatabaseObjectType.View: {
            const uri = Uri.parse(`${viewDocumentScheme}:${dataSource.getName()}/${objectName}.sql`);
            const doc = await workspace.openTextDocument(uri);
            await window.showTextDocument(doc, { preview: true });
            return;
        }
        case DatabaseObjectType.Procedure: {
            const uri = Uri.parse(`${procedureDocumentScheme}:${dataSource.getName()}/${objectName}.sql`);
            const doc = await workspace.openTextDocument(uri);
            await window.showTextDocument(doc, { preview: true });
            return;
        }
        default:
            return;
    }
}

export function activate(): Disposable[] {
    class ViewProvider implements TextDocumentContentProvider {
        static readonly scheme = viewDocumentScheme;

        _onDidChangeEmitter = new EventEmitter<Uri>();
        onDidChange = this._onDidChangeEmitter.event;

        async provideTextDocumentContent(uri: Uri): Promise<string> {
            // Example uri: virtualViewSQL:databaseName/viewName.sql
            const parts = uri.path.split('/');
            // Get the database name
            const databaseName = parts[0];
            // Get the view name without the .sql extension
            const viewName = parts[1].substring(0, parts[1].length - 4);
            return DatabaseObjectViewRest.getView(ConnectionManager.getDataSource(databaseName)!, viewName).then(
                result => result[0] as { ViewDefinition: string }).then(view => view.ViewDefinition);
        }
    }

    class ProcedureProvider implements TextDocumentContentProvider {
        static readonly scheme = procedureDocumentScheme;

        _onDidChangeEmitter = new EventEmitter<Uri>();
        onDidChange = this._onDidChangeEmitter.event;

        async provideTextDocumentContent(uri: Uri): Promise<string> {
            const parts = uri.path.split('/');
            const databaseName = parts[0];
            const procedureName = parts[1].substring(0, parts[1].length - 4);
            const procedure = (await DatabaseObjectViewRest.getProcedure(ConnectionManager.getDataSource(databaseName)!, procedureName))[0] as { ProcedureDefinition: string };
            return procedure.ProcedureDefinition;
        }
    }

    const subscriptions: Disposable[] = [];
    subscriptions.push(workspace.registerTextDocumentContentProvider(ViewProvider.scheme, new ViewProvider()));
    subscriptions.push(workspace.registerTextDocumentContentProvider(ProcedureProvider.scheme, new ProcedureProvider()));
    return subscriptions;
}