import { Disposable, ExtensionContext, QuickInputButton, QuickInput, QuickPickItem, Uri, window } from "vscode";

export async function datasourceQuickPick(context: ExtensionContext) {

    let current: QuickInput;

    class MyButton implements QuickInputButton {
       constructor(public iconPath: { light: Uri, dark: Uri }, public tooltip: string) { }
    }

    const datasources: QuickPickItem[] = ['TF - SAMM 2', 'TF - SAMM 1'].map(label => ({ label }));

    // TODO Add a button to add the typed datasource, Add a button to the bottom to take the user to a file where the datasources are saved 
    async function showQuickPick(): Promise<QuickPickItem> {
        const disposables: Disposable[] = [];
        try {
            return await new Promise((resolve, reject) => {
                const input = window.createQuickPick();
                input.title = 'Connect to Datasource';
                input.placeholder = 'Select or enter a datasource';
                input.items = datasources;
                disposables.push(
                    input.onDidChangeSelection(items => resolve(items[0]))
                );
                if (current) {
                    current.dispose();
                }
                current = input;
                input.show();
            });
        }
        finally {
            disposables.forEach(disposable => disposable.dispose());
        }
    }

    async function validateDatasource(datasource: String) {
        // TODO validate the datasource by connecting to the database
        return false;
    }

    async function run() {
        // TODO select the datasource
        const datasource = (await showQuickPick()).label;
        current.dispose();
        if (await validateDatasource(datasource)) {
            return datasource;
        }
        window.showErrorMessage(`Unable to connect to ${datasource}`);
        return false;
    }

    await run();
}