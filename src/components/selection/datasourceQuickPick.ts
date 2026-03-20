import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { SqlManager } from '../../manager/sqlManager';
import {
    QuickPickItem,
    Disposable,
    QuickInputButton,
    QuickInput,
    ExtensionContext,
    QuickInputButtons,
    Uri,
    window,
    workspace,
} from 'vscode';

export class DatasourceSelection {

    static async selectDatasource(context: ExtensionContext) {
        const dataSources = ConnectionManager.getDataSources().map(dataSource => ({ label: dataSource.getName() }));
        const dataSourceTypes = SqlManager.getSqlTypes().map(type => ({ label: type }));
        const title = 'Connect to Datasource';

        interface State {
            dataSource: string;
            dataSourceType: string;
        }
    
        async function collectInputs() {
            const state = {} as Partial<State>;
            await DatasourceQuickPick.run(input => selectDatasource(input, state));
            return state as State;
        }
    
        async function selectDatasource(input: DatasourceQuickPick, state: Partial<State>) {
            const selection: QuickPickItem = await input.showQuickPick({
                title,
                placeholder: 'Select or enter a datasource',
                items: dataSources,
                searchInput: true
            });
            const dataSource = ConnectionManager.getDataSources().find(
                dataSource => dataSource.getName() === selection.label);
            if (dataSource) {
                state.dataSource = dataSource.getName();
                state.dataSourceType = dataSource.getType();
            }
            else {
                state.dataSource = selection.label;
                return (input: DatasourceQuickPick) => selectDatasourceType(input, state);
            }
        }
    
        async function selectDatasourceType(input: DatasourceQuickPick, state: Partial<State>) {
            const selection: QuickPickItem = await input.showQuickPick({
                title,
                placeholder: 'Select a datasource type',
                items: dataSourceTypes
            });
            state.dataSourceType = selection.label;
        }
    
        async function validateDatasource(dataSource: DataSource) {
            try {
                await dataSource.getConnection();
                return true;
            } catch (error) {
                return false;
            }
        }

        const state = await collectInputs();
        const dataSource = ConnectionManager.getDataSource(state.dataSource) ??
            new DataSource(state.dataSource, state.dataSourceType);
        if (dataSource.isConnected()) {
            ConnectionManager.saveDataSource(dataSource);
            return dataSource;
        }
        else if (await validateDatasource(dataSource)) {
            ConnectionManager.saveDataSource(dataSource);
            window.showInformationMessage(`Connected to ${dataSource.getName()}`);
            return dataSource;
        }
        else {
            window.showErrorMessage(`Failed to connect to ${dataSource.getName()}`);
            return null;
        }
    }

    static async removeDatasource(context: ExtensionContext): Promise<string | null> {
        const dataSources = ConnectionManager.getDataSources().map(dataSource => ({ label: dataSource.getName() }));

        interface State {
            dataSource: string;
        }

        async function collectInputs() {
            const state = {} as Partial<State>;
            await DatasourceQuickPick.run(input => removeDatasource(input, state));
            return state as State;
        }

        async function removeDatasource(input: DatasourceQuickPick, state: Partial<State>) {
            const selection: QuickPickItem = await input.showQuickPick({
                title: 'Remove Datasource',
                placeholder: 'Select a datasource to remove',
                items: dataSources
            });
            state.dataSource = selection.label;
        }

        if (ConnectionManager.getDataSources().length === 0) {
            window.showWarningMessage('No saved datasources to remove.');
            return null;
        }

        const state = await collectInputs();
        const dataSource = ConnectionManager.getDataSource(state.dataSource);
        if (!dataSource) {
            return null;
        }
        try {
            ConnectionManager.removeDataSource(dataSource);
            window.showInformationMessage(`Removed datasource ${dataSource.getName()}`);
            return dataSource.getName();
        } catch (error) {
            window.showErrorMessage(`Could not remove datasource ${dataSource.getName()}`);
            return null;
        }
    }
}

class InputFlowAction {
    static back = new InputFlowAction();
}

type InputStep = (input: DatasourceQuickPick) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
    title: string;
    placeholder: string;
    items: T[];
    activeItem?: T;
    searchInput?:boolean;
}

class DatasourceQuickPick {

    static async run(start: InputStep) {
        const input = new DatasourceQuickPick();
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
        { title, items, placeholder, searchInput }: P) {
        const disposables: Disposable[] = [];
        try {
            return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
                let quickPickItems = [...items];
                const searchItem = { label: '' } as T;
                const input = window.createQuickPick<T>();
                input.title = title;
                input.placeholder = placeholder;
                input.items = quickPickItems;
                input.buttons = [
                    ...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
                ];
                // TODO how to add the search item to the end of the search results?
                disposables.push(
                    input.onDidTriggerButton(item => {
                        if (item === QuickInputButtons.Back) {
                            reject(InputFlowAction.back);
                        } else {
                            resolve((item as any));
                        }
                    }),
                    input.onDidChangeSelection(items => resolve(items[0])),
                    ...(searchInput ? [input.onDidChangeValue(value => {
                        if (quickPickItems.includes(searchItem)) {
                            quickPickItems = quickPickItems.filter(item => item !== searchItem);
                            input.items = quickPickItems;
                        }
                        if (value.length > 0) {
                            searchItem.label = value;
                            quickPickItems.push(searchItem);
                            input.items = quickPickItems;
                        }
                    })] : [])
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