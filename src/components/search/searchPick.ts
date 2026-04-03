import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { DatabaseObjectType } from '../../manager/sqlManager';
import { openDatabaseObject } from '../preview/object';
import { SearchPickRest } from '../../rest/search/searchPickRest';
import {
    QuickPickItem,
    Disposable,
    QuickInput,
    ExtensionContext,
    QuickInputButtons,
    commands,
    ProgressLocation,
    window
} from 'vscode';

export type SearchPickResult = {
    dataSource: DataSource;
    type: DatabaseObjectType;
    name: string;
};

interface SearchObjectItem extends QuickPickItem {
    objectType: DatabaseObjectType;
    objectName: string;
}

async function loadObjectItems(dataSource: DataSource): Promise<SearchObjectItem[]> {
    const [tablesResult, viewsResult, proceduresResult] = await Promise.all([
        SearchPickRest.getTables(dataSource),
        SearchPickRest.getViews(dataSource),
        SearchPickRest.getProcedures(dataSource)
    ]);

    const items: SearchObjectItem[] = [];

    for (const row of tablesResult) {
        const name = String((row as Record<string, unknown>).TableName ?? '');
        if (name.length > 0) {
            items.push({
                label: name,
                description: DatabaseObjectType.Table,
                objectType: DatabaseObjectType.Table,
                objectName: name
            });
        }
    }

    for (const row of viewsResult) {
        const name = String((row as Record<string, unknown>).ViewName ?? '');
        if (name.length > 0) {
            items.push({
                label: name,
                description: DatabaseObjectType.View,
                objectType: DatabaseObjectType.View,
                objectName: name
            });
        }
    }

    for (const row of proceduresResult) {
        const name = String((row as Record<string, unknown>).ProcedureName ?? '');
        if (name.length > 0) {
            items.push({
                label: name,
                description: DatabaseObjectType.Procedure,
                objectType: DatabaseObjectType.Procedure,
                objectName: name
            });
        }
    }

    items.sort((a, b) => a.label.localeCompare(b.label));
    return items;
}

export async function pickSearchObject(_context: ExtensionContext): Promise<SearchPickResult | null> {
    const title = 'Search objects';

    interface State {
        dataSource?: DataSource;
        type?: DatabaseObjectType;
        name?: string;
    }

    async function collectInputs() {
        const state: State = {};
        await SearchQuickPick.run(input => selectDatasource(input, state));
        return state;
    }

    async function selectDatasource(input: SearchQuickPick, state: State) {
        const selection: QuickPickItem = await input.showQuickPick({
            title,
            placeholder: 'Select a datasource',
            items: ConnectionManager.getDataSources().map(dataSource => ({ label: dataSource.getName() }))
        });
        const dataSource = ConnectionManager.getDataSource(selection.label);
        if (dataSource) {
            state.dataSource = dataSource;
            return (inputNext: SearchQuickPick) => selectObject(inputNext, state);
        }
    }

    async function selectObject(input: SearchQuickPick, state: State) {
        const dataSource = state.dataSource!;
        const objectItems = await window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: `Loading objects (${dataSource.getName()})…`,
                cancellable: false
            },
            () => loadObjectItems(dataSource)
        );

        if (objectItems.length === 0) {
            window.showWarningMessage('No tables, views, or procedures were returned for this datasource.');
            return;
        }

        const selection: SearchObjectItem = await input.showQuickPick({
            title: `Search — ${dataSource.getName()}`,
            placeholder: 'Select a database object...',
            items: objectItems
        });

        state.type = selection.objectType;
        state.name = selection.objectName;
    }

    if (ConnectionManager.getDataSources().length === 0) {
        window.showWarningMessage('No datasources. Add one from the database tree first.');
        return null;
    }

    const state = await collectInputs();
    if (state.dataSource === undefined || state.type === undefined || state.name === undefined) {
        return null;
    }

    return {
        dataSource: state.dataSource,
        type: state.type,
        name: state.name
    };
}

export function activate(context: ExtensionContext): Disposable[] {
    return [
        commands.registerCommand('sql-anywhere-17-database-tools.search', async () => {
            const result = await pickSearchObject(context);
            if (result) {
                await openDatabaseObject(result.dataSource, result.type, result.name);
            }
        })
    ];
}

class InputFlowAction {
    static back = new InputFlowAction();
}

type InputStep = (input: SearchQuickPick) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
    title: string;
    placeholder: string;
    items: T[];
    activeItem?: T;
}

class SearchQuickPick {

    static async run(start: InputStep) {
        const input = new SearchQuickPick();
        return input.stepThrough(start);
    }

    private current?: QuickInput;
    private steps: InputStep[] = [];

    private async stepThrough(start: InputStep) {
        let step: InputStep | void = start;
        while (step) {
            this.steps.push(step);
            if (this.current) {
                this.current.enabled = false;
                this.current.busy = true;
            }
            try {
                step = await step(this);
            } catch (err) {
                if (err === InputFlowAction.back) {
                    this.steps.pop();
                    step = this.steps.pop();
                } else {
                    throw err;
                }
            }
        }
        if (this.current) {
            this.current.dispose();
        }
    }

    async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>(
        { title, items, placeholder }: P) {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                const input = window.createQuickPick<T>();
                input.title = title;
                input.placeholder = placeholder;
                input.items = [...items];
                input.buttons = [
                    ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
                ];
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve((item as any));
                        }
                    }),
                    input.onDidChangeSelection(items => resolve(items[0]))
                );
                if (this.current) {
                    this.current.dispose();
                }
                this.current = input;
                this.current.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }
}
