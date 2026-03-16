import {
    ExtensionContext,
    Uri,
    workspace
} from "vscode";

interface Sql {
    name: string;
}

export class SqlManager {

    private static sqlFiles: Map<string, Sql> = new Map();

    static async loadSqlLanguages(content: ExtensionContext) {
        const sqlFolderUri = Uri.joinPath(content.extensionUri, 'src', 'sql');
        const sqlFileUris = await workspace.fs.readDirectory(sqlFolderUri).then(files => 
            files.map(file => Uri.joinPath(sqlFolderUri, file[0])));
        await sqlFileUris.forEach(async fileUri => {
            const json = JSON.parse(new TextDecoder().decode(await workspace.fs.readFile(fileUri)));
            this.sqlFiles.set(json.name, json);
        });
    }

    static getSqlTypes(): string[] {
        return Array.from(this.sqlFiles.keys());
    }

}
