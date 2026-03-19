import {
    Event,
    EventEmitter,
    ExtensionContext,
    TextDocumentContentProvider,
    Uri,
    workspace
} from 'vscode';
import { show } from 'sqlvirtualdocument';
export function databaseObjectVirtualDocument(context: ExtensionContext) {
    context.subscriptions.push(workspace.registerTextDocumentContentProvider('virtualSQL', new DatabaseObjectVirtualDocument()));
}

// export interface SqlVirtualDocument {
//     text: string;
//     wrap?: boolean;
//     wrapLength?: number;
//     mode?: 'b' | 'd' | 'g' | 'p' | 's' | 't' | 'w' | 'y';
// }

// export function show(options: SqlVirtualDocument): string;

export class DatabaseObjectVirtualDocument implements TextDocumentContentProvider {

    private _onDidChangeEmitter: EventEmitter<Uri> = new EventEmitter<Uri>();
    readonly onDidChange: Event<Uri> = this._onDidChangeEmitter.event;

    provideTextDocumentContent(uri: Uri): string {
        return show({ text: uri.path});
    }
}