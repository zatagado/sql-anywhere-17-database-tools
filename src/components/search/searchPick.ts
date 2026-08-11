import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { DatabaseObjectType } from '../../manager/sqlManager';
import { openObject } from '../../shared/openObject';
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
import { Result } from 'odbc';

export type SearchPickResult = {
    dataSource: DataSource;
    type: DatabaseObjectType;
    name: string;
};

interface SearchObjectItem extends QuickPickItem {
    objectType: DatabaseObjectType;
    objectName: string;
}

function loadTypeObjectItems(dataSource: DataSource, type: DatabaseObjectType): Promise<SearchObjectItem[]> {
    switch (type) {
        case DatabaseObjectType.Table: {
            return SearchPickRest.getTables(dataSource).then(tablesResult => loadObjectItems(tablesResult, [], []));
        }
        case DatabaseObjectType.View: {
            return SearchPickRest.getViews(dataSource).then(viewsResult => loadObjectItems([], viewsResult, []));
        }
        case DatabaseObjectType.Procedure: {
            return SearchPickRest.getProcedures(dataSource).then(proceduresResult => loadObjectItems([], [], proceduresResult));
        }
    }
}

function loadAllObjectItems(dataSource: DataSource): Promise<SearchObjectItem[]> {
    return Promise.all([
        SearchPickRest.getTables(dataSource),
        SearchPickRest.getViews(dataSource),
        SearchPickRest.getProcedures(dataSource)
    ]).then(results => {
        const [tablesResult, viewsResult, proceduresResult] = results;
        return loadObjectItems(tablesResult, viewsResult, proceduresResult);  
    });
}

async function loadObjectItems(tablesResult: Result<unknown> | [],
    viewsResult: Result<unknown> | [], proceduresResult: Result<unknown> | []): Promise<SearchObjectItem[]> {

    const items: SearchObjectItem[] = [];

    for (const row of tablesResult) {
        const name = String((row as unknown[])[0] ?? '');
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
        const name = String((row as unknown[])[0] ?? '');
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
        const name = String((row as unknown[])[0] ?? '');
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

export async function pickSearchObject(_context: ExtensionContext, dataSource: DataSource | undefined,
    type: DatabaseObjectType | undefined): Promise<SearchPickResult | null> {
    const title = 'Search objects';

    interface State {
        dataSource?: DataSource;
        type?: DatabaseObjectType;
        name?: string;
    }

    async function collectInputs(state: State) {
        if (dataSource) {
            await SearchQuickPick.run(input => selectObject(input, state));
        }
        else {
            await SearchQuickPick.run(input => selectDatasource(input, state));
        }
        return state;
    }

    async function selectDatasource(input: SearchQuickPick, state: State) {
        const selection: QuickPickItem = await input.showQuickPick({
            title,
            placeholder: 'Select a datasource',
            items: ConnectionManager.getDataSources().map(dataSource => ({ label: dataSource.getName() }))
        });
        const dataSource = ConnectionManager.getDataSource(selection.label, true);
        if (dataSource) {
            state.dataSource = dataSource;
            return (inputNext: SearchQuickPick) => selectObject(inputNext, state);
        }
    }

    async function selectObject(input: SearchQuickPick, state: State) {
        const dataSource = state.dataSource!;
        let objectItems;
        try {
            if (state.type) {
                objectItems = await loadTypeObjectItems(dataSource, state.type!);
            }
            else {
                objectItems = await loadAllObjectItems(dataSource);
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            window.showErrorMessage(message);
            return;
        }

        if (objectItems.length === 0) {
            window.showWarningMessage(`No tables, views, or procedures were returned for datasource ${dataSource.getName()}.`);
            return;
        }

        const selection: SearchObjectItem = await input.showQuickPick({
            title: `Search ${state.type ? state.type + ' ' : ''}– ${dataSource.getName()}`,
            placeholder: `Select a database ${state.type ? state.type.toLowerCase().replace(/s$/, '') : 'object'}...`,
            items: objectItems
        });

        state.type = selection.objectType;
        state.name = selection.objectName;
    }

    if (ConnectionManager.getDataSources().length === 0) {
        window.showWarningMessage('No datasources. Add one from the database tree first.');
        return null;
    }

    const state = await collectInputs({ dataSource: dataSource, type: type });
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
        commands.registerCommand('sql-anywhere-17-database-tools.search', async (dataSource?, type?) => {
            const result = await pickSearchObject(context, dataSource, type);
            if (result) {
                await openObject(result.dataSource, result.type, result.name);
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
