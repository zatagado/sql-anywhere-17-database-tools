import {
    ConnectionManager
} from '../../manager/connectionManager';
import {
    DatabaseObjectViewRest
} from '../../rest/preview/databaseObjectViewRest';
import {
    DatabaseObjectType,
    ObjectItem
} from '../navigation/databaseTree';
import {
    commands,
    Disposable,
    EventEmitter,
    TextDocumentContentProvider,
    Uri,
    window,
    workspace
} from 'vscode';

export function activate(): Disposable[] {
    class ViewProvider implements TextDocumentContentProvider {
        static readonly scheme = 'virtualViewSQL';

        _onDidChangeEmitter = new EventEmitter<Uri>();
        onDidChange = this._onDidChangeEmitter.event;

        async provideTextDocumentContent(uri: Uri): Promise<string> {
            // Example uri: virtualViewSQL:databaseName/viewName.sql
            const parts = uri.path.split('/');
            // Get the database name
            const databaseName = parts[0];
            // Get the view name without the .sql extension
            const viewName = parts[1].substring(0, parts[1].length - 4);
            const view = (await DatabaseObjectViewRest.getView(ConnectionManager.getDataSource(databaseName)!, viewName))[0] as { ViewDefinition: string };
            return view.ViewDefinition; 
        }
    }

    async function openView(node: ObjectItem) {
        const uri = Uri.parse(`${ViewProvider.scheme}:${node.getDataSource().getName()}/${node.label}.sql`);
        const doc = await workspace.openTextDocument(uri);
        await window.showTextDocument(doc, { preview: false });
    }

    async function openObjectItem(node: ObjectItem) {
        switch (node.getType()) {
            case DatabaseObjectType.View:
                return openView(node);
            default:
                return;
        }
    }
        
    const subscriptions: Disposable[] = [];
    subscriptions.push(workspace.registerTextDocumentContentProvider(ViewProvider.scheme, new ViewProvider()));
    subscriptions.push(commands.registerCommand('databaseObjectView.open', (node: ObjectItem) => openObjectItem(node)));
    return subscriptions;
}