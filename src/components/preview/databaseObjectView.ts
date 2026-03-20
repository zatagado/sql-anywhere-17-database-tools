import {
    DatabaseObjectViewRest
} from '../../rest/preview/databaseObjectViewRest';
import {
    ObjectItem
} from '../navigation/databaseTree';
import {
    commands,
    Event,
    EventEmitter,
    ExtensionContext,
    TextDocumentContentProvider,
    Uri,
    window,
    workspace
} from 'vscode';

export function databaseObjectVirtualDocument(context: ExtensionContext) {
    context.subscriptions.push(workspace.registerTextDocumentContentProvider('virtualSQL', new DatabaseObjectVirtualDocument()));

    context.subscriptions.push(commands.registerCommand('sql-anywhere-17-database-tools.openVirtualDocument', async () => {
        const what = await window.showInputBox({ placeHolder: 'Test SQL Virtual Document' });
        if (what) {
            const uri = Uri.parse(`virtualSQL:${what}.sql`);
            const doc = await workspace.openTextDocument(uri);
            await window.showTextDocument(doc, { preview: false });
        }
    }));
}

export async function viewObject(node: ObjectItem) {
    // TODO use the rest function to get the content of the object
    const view = await DatabaseObjectViewRest.getView(node.parentNode.parentNode.dataSource, node.label as string);
    // show text document.
}

// export function openDatabaseObjectVirtualDocument(dataSource: DataSource, objectName: string, objectType: )

export class DatabaseObjectVirtualDocument implements TextDocumentContentProvider {

    private _onDidChangeEmitter: EventEmitter<Uri> = new EventEmitter<Uri>();
    readonly onDidChange: Event<Uri> = this._onDidChangeEmitter.event;

    provideTextDocumentContent(uri: Uri): string {
        return this.showVirtualSql({ text: uri.path });
    }

    private showVirtualSql(options: { text: string }): string {
        const { text } = options;
        return text;
    }
}