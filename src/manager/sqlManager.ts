import {
    ExtensionContext,
    Uri,
    workspace
} from "vscode";

export interface Sql {
    name: string;
    navigation?: {
        databaseTree?: {
            tables?: string;
            views?: string;
            procedures?: string;
        };
    };
}

export class SqlManager {

    private static context: ExtensionContext;
    private static sqlFiles: Map<string, Sql> = new Map();

    static async load(context: ExtensionContext) {
        this.context = context;
        const sqlFolderUri = Uri.joinPath(this.context.extensionUri, 'src', 'sql');
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

    static getSqlQueries(sqlType: string): Sql {
        const sqlFile = this.sqlFiles.get(sqlType);
        if (sqlFile) {
            return sqlFile;
        }
        throw new Error(`SQL type ${sqlType} not found`);
    }

}
