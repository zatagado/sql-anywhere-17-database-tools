import { workspace } from 'vscode';
import { DataSource } from '../manager/connectionManager';
import { DatabaseObjectType } from '../manager/sqlManager';
import { openDatabaseObject } from '../components/preview/preview';
import { openObjectDetails } from '../components/details/details';

type OpenAction = 'preview' | 'details';

const openActionConfigKey: Record<DatabaseObjectType, string> = {
    [DatabaseObjectType.Table]: 'tables',
    [DatabaseObjectType.View]: 'views',
    [DatabaseObjectType.Procedure]: 'procedures'
};

/** Opens an object using the webview configured for its type: the preview document or the details webview. */
export async function openObject(
    dataSource: DataSource,
    type: DatabaseObjectType,
    objectName: string
): Promise<void> {
    const action = workspace.getConfiguration('sql-anywhere-17-database-tools.openAction')
        .get<OpenAction>(openActionConfigKey[type], 'preview');
    if (action === 'details') {
        await openObjectDetails(dataSource, type, objectName);
    }
    else {
        await openDatabaseObject(dataSource, type, objectName);
    }
}
