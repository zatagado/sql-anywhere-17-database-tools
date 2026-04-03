import { commands, Disposable, ExtensionContext, window, workspace } from 'vscode';

export async function openScratchDocument(text?: string): Promise<void> {
    const doc = await workspace.openTextDocument({ language: 'sql', content: text ?? '' });
    await window.showTextDocument(doc);
}

export function activate(_context: ExtensionContext): Disposable[] {
    return [commands.registerCommand('sql-anywhere-17-database-tools.newScratchSqlFile',
        (text?: string) => openScratchDocument(text))];
}