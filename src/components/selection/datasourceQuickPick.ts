import { ExtensionContext, QuickInputButton, QuickPickItem, Uri } from "vscode";

export async function datasourceQuickPick(context: ExtensionContext) {

    class MyButton implements QuickInputButton {
       constructor(public iconPath: { light: Uri, dark: Uri }, public tooltip: string) { }
    }

    const addDatasourceButton = new MyButton({
        dark: Uri.file(context.asAbsolutePath('resources/dark/add.svg')),
        light: Uri.file(context.asAbsolutePath('resources/light/add.svg')),
    }, 'Add New Datasource');

    const datasources: QuickPickItem[] = ['TF - SAMM 1', 'TF - SAMM 2'].map(label => ({ label }));

    interface State {
        title: string;
        step: number;
        totalSteps: number;
        datasource: QuickPickItem | string;
        runtime: QuickPickItem;
    }

    async function collectInpu
}