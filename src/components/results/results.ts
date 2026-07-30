import {
    commands,
    Disposable,
    ExtensionContext,
    TabInputWebview,
    TextEditor,
    ViewColumn,
    Uri,
    WebviewPanel,
    window,
    workspace,
    TextDocument,
    CancellationTokenSource
} from 'vscode';
import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { selectDatasource } from '../selection/datasourcePick';
import { ResultsRest } from '../../rest/results/resultsRest';
import odbc, { NodeOdbcError } from 'odbc';
import { SqlManager } from '../../manager/sqlManager';
import { getWebviewHtml, waitForWebviewReady } from '../../shared/webviewUtils';
import {
    tableDocumentScheme,
    viewDocumentScheme,
    tableDetailsPanelType,
    viewDetailsPanelType
} from '../preview/preview';

const ROW_BATCH_SIZE = 100000;

function getMaxResultRows(): number {
    return workspace.getConfiguration('sql-anywhere-17-database-tools.results').get<number>('maxRows', 10000);
}

function getNullPlaceholder(): string {
    return workspace.getConfiguration('sql-anywhere-17-database-tools.results')
        .get<string>('nullPlaceholder', '(NULL)');
}

export type ResultsEntry = {
    dataSource: DataSource | null,
    panels: WebviewPanel[],
    cancellationTokenSource: CancellationTokenSource | null
};

export class Results {
    static map = new Map<TextDocument, ResultsEntry>();
}

export async function selectObject(dataSource: DataSource, objectName: string): Promise<void> {
    const sql = SqlManager.getSqlQueries(dataSource.getType())!
        .results.selectFromObject.replace('$objectName', objectName);
    await commands.executeCommand('sql-anywhere-17-database-tools.newScratchSqlFile', sql);
    await commands.executeCommand('sql-anywhere-17-database-tools.results.execute', dataSource);
}

function formatExecutionError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'odbcErrors' in error) {
        return (error as NodeOdbcError).odbcErrors.map(e => `[${e.state}] ${e.message}`).join('\n');
    }
    return (error as Error).message;
}

function formatResultSet(resultSet: odbc.Result<unknown>): odbc.Result<unknown> {
    function formatBigInt(resultSet: odbc.Result<unknown>): odbc.Result<unknown> {
        for (let i = 0; i < resultSet.columns.length; i++) {
            if (resultSet.columns[i].dataTypeName === 'SQL_BIGINT') {
                for (let j = 0; j < resultSet.length; j++) {
                    const row = resultSet[j] as unknown[];
                    row[i] = String(row[i]);
                }
            }
        }
        return resultSet;
    }

    return formatBigInt(resultSet);
}

export function activate(context: ExtensionContext): Disposable[] {

    async function getDataSource(selectedDataSource: DataSource | undefined, resultEntry: ResultsEntry | undefined) {
        let dataSource: DataSource | null = selectedDataSource ?? resultEntry?.dataSource ?? null;
        if (!dataSource) {
            dataSource = await selectDatasource(context);
            if (!dataSource) {
                return null;
            }
        }
        return dataSource;
    }

    function loadResults(dataSource: DataSource, queries: string, hasExistingDataSource: boolean, cancellationTokenSource: CancellationTokenSource) {
        return ResultsRest.executeScript(dataSource, queries, !hasExistingDataSource, { maxRows: getMaxResultRows() }, cancellationTokenSource);
    }

    async function showInitialLoadingPanel(panelTitle: string, document: TextDocument, resultEntry: ResultsEntry) {
        // Need to create at least one panel to indicate we are loading.
        let createdFirstPanel = false;
        if (resultEntry.panels.length === 0) {
            const panel = window.createWebviewPanel('queryResults', panelTitle,
                { viewColumn: ViewColumn.Active },
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            panel.iconPath = {
                light: Uri.joinPath(context.extensionUri, 'resources', 'light', 'result-set.svg'),
                dark: Uri.joinPath(context.extensionUri, 'resources', 'dark', 'result-set.svg')
            };

            panel.onDidDispose(() => {
                const entry = Results.map.get(document);
                if (!entry) {
                    return;
                }
                entry.panels = entry.panels.filter(mapPanel => mapPanel !== panel);
                if (entry.panels.length === 0) {
                    entry.dataSource = null;
                }
                entry.cancellationTokenSource?.cancel();
            });
            panel.webview.html = getWebviewHtml(panel, context.extensionUri, 'queryResults');
            resultEntry.panels.push(panel);
            createdFirstPanel = true;
        }
        else {
            // Dispose of all panels that are not the first one.
            while (resultEntry.panels.length > 1) {
                resultEntry.panels.pop()!.dispose();
            }
            resultEntry.panels = [resultEntry.panels[0]!];
            resultEntry.panels[0]!.title = panelTitle;
        }

        const firstPanel = resultEntry.panels[0]!;
        firstPanel.reveal(firstPanel.viewColumn!, false);

        try {
            if (createdFirstPanel) {
                await waitForWebviewReady(firstPanel);
            }
            firstPanel.webview.postMessage({ type: 'onLoading' });
        } catch (e) {
            firstPanel.webview.postMessage({
                type: 'onError',
                message: formatExecutionError(e)
            });
            return;
        }

        return firstPanel;
    }

    async function showRemainingPanels(firstPanel: WebviewPanel, document: TextDocument,
        resultEntry: ResultsEntry, resultSets: odbc.Result<unknown>[]) {

        function createResultPanel(index: number): WebviewPanel {
            const panel = window.createWebviewPanel('queryResults', `${firstPanel.title} (${index + 1})`,
                { viewColumn: firstPanel.viewColumn! },
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            panel.iconPath = {
                light: Uri.joinPath(context.extensionUri, 'resources', 'light', 'result-set.svg'),
                dark: Uri.joinPath(context.extensionUri, 'resources', 'dark', 'result-set.svg')
            };
            panel.webview.html = getWebviewHtml(panel, context.extensionUri, 'queryResults');
            return panel;
        }
        
        function postResultSet(panel: WebviewPanel, resultSet: odbc.Result<unknown>) {
            const rows = Array.from(formatResultSet(resultSet));
            panel.webview.postMessage({
                type: 'onResultDetails',
                columns: resultSet.columns,
                count: rows.length,
                statement: resultSet.statement,
                return: resultSet.return,
                parameters: resultSet.parameters,
                nullPlaceholder: getNullPlaceholder(),
                truncated: resultSet.truncated ?? false
            });
        
            if (rows.length === 0) {
                panel.webview.postMessage({
                    type: 'onResultRows',
                    rows: [],
                    count: rows.length,
                    startIndex: 0,
                });
            } else {
                for (let j = 0; j < rows.length; j += ROW_BATCH_SIZE) {
                    panel.webview.postMessage({
                        type: 'onResultRows',
                        rows: rows.slice(j, j + ROW_BATCH_SIZE),
                        count: rows.length,
                        startIndex: j,
                    });
                }
            }
        }

        try {
            postResultSet(firstPanel, resultSets[0]);
            for (let i = 1; i < resultSets.length; i++) {
                const panel = createResultPanel(i);
                const resultSet = resultSets[i];
                let ready = false;

                panel.onDidChangeViewState(e => {
                    const panel = e.webviewPanel;
                    if (!panel.visible || ready) {
                        return;
                    }
                    resultEntry.panels.splice(i, 1);
                    panel.dispose();

                    const reloadedPanel = createResultPanel(i);
                    reloadedPanel.webview.onDidReceiveMessage((msg: { type?: string }) => {
                        if (msg?.type === 'onWebviewReady') {
                            postResultSet(reloadedPanel, resultSet);
                        }
                    });

                    reloadedPanel.onDidDispose(() => {
                        const entry = Results.map.get(document);
                        if (!entry) {
                            return;
                        }
                        entry.panels = entry.panels.filter(mapPanel => mapPanel !== reloadedPanel);
                        if (entry.panels.length === 0) {
                            entry.dataSource = null;
                        }
                    });

                    resultEntry.panels.splice(i, 0, reloadedPanel);
                });

                panel.webview.onDidReceiveMessage((msg: { type?: string }) => {
                    if (msg?.type === 'onWebviewReady') {
                        postResultSet(panel, resultSet);
                        ready = true;
                    }
                });

                panel.onDidDispose(() => {
                    const entry = Results.map.get(document);
                    if (!entry) {
                        return;
                    }
                    entry.panels = entry.panels.filter(mapPanel => mapPanel !== panel);
                    if (entry.panels.length === 0) {
                        entry.dataSource = null;
                    }
                });

                resultEntry.panels.push(panel);
            }

            firstPanel.reveal(firstPanel.viewColumn ?? ViewColumn.Active, false);
        } catch (e) {
            firstPanel.webview.postMessage({
                type: 'onError',
                message: formatExecutionError(e)
            });
        }
    }

    async function getSingleFileResults(selectedDataSource: DataSource | undefined) {
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }
        
        const document = editor.document;
        if (document.languageId !== 'sql') {
            return;
        }

        const file = Uri.file(document.fileName);
        const fileShortName = file.path.split('/').pop()!;
        const queries: string = document.getText(editor.selection.isEmpty ? undefined : editor.selection);

        let resultEntry: ResultsEntry | undefined = Results.map.get(document);
        const hasExistingDataSource = (resultEntry?.dataSource ?? null) !== null; // Is this different from Boolean(resultEntry?.dataSource)
        const dataSource = await getDataSource(selectedDataSource, resultEntry);
        if (!dataSource) {
            return;
        }

        const cancellationTokenSource = new CancellationTokenSource();
        if (resultEntry) {
            resultEntry.dataSource = dataSource;
            resultEntry.cancellationTokenSource?.cancel();
            resultEntry.cancellationTokenSource = cancellationTokenSource;
        }
        else {
            const sqlDocumentUri = document.uri.toString();
            const onThisSqlDocumentClosed = workspace.onDidCloseTextDocument(doc => {
                if (doc.uri.toString() !== sqlDocumentUri) {
                    return;
                }
                if (!Results.map.has(document)) {
                    return;
                }
                Results.map.delete(document);
                onThisSqlDocumentClosed.dispose();
            });
            context.subscriptions.push(onThisSqlDocumentClosed);

            resultEntry = {
                dataSource: dataSource,
                panels: [],
                cancellationTokenSource: cancellationTokenSource
            };
            Results.map.set(document, resultEntry);
        }

        const resultsPromise = loadResults(dataSource, queries, hasExistingDataSource, cancellationTokenSource);
        
        // if it doesnt exist, create a new group below first
        if (resultEntry.panels.length === 0) {
            await window.showTextDocument(document, {
                viewColumn: editor.viewColumn ?? ViewColumn.Active
            });
            await commands.executeCommand('workbench.action.newGroupBelow');
        }
        const panelTitle = `${dataSource.getName()} - ${fileShortName}`;
        const firstPanel = await showInitialLoadingPanel(panelTitle, document, resultEntry);
        if (!firstPanel) {
            return;
        }
        resultsPromise
            .then(resultSets => showRemainingPanels(firstPanel, document, resultEntry, resultSets))
            .catch(error => {
                firstPanel.webview.postMessage({
                    type: 'onError',
                    message: formatExecutionError(error)
                });
            });
    }

    async function getMultipleFileResults(dataSource: DataSource, document: TextDocument, queries: string) {
        if (document.languageId !== 'sql') {
            return;
        }

        const file = Uri.file(document.fileName);
        const fileShortName = file.path.split('/').pop()!;

        let resultEntry: ResultsEntry | undefined = Results.map.get(document);
        const hasExistingDataSource = (resultEntry?.dataSource ?? null) !== null; // Is this different from Boolean(resultEntry?.dataSource)

        const cancellationTokenSource = new CancellationTokenSource();
        if (resultEntry) {
            resultEntry.dataSource = dataSource;
            resultEntry.cancellationTokenSource?.cancel();
            resultEntry.cancellationTokenSource = cancellationTokenSource;
        }
        else {
            const sqlDocumentUri = document.uri.toString();
            const onThisSqlDocumentClosed = workspace.onDidCloseTextDocument(doc => {
                if (doc.uri.toString() !== sqlDocumentUri) {
                    return;
                }
                if (!Results.map.has(document)) {
                    return;
                }
                Results.map.delete(document);
                onThisSqlDocumentClosed.dispose();
            });
            context.subscriptions.push(onThisSqlDocumentClosed);

            resultEntry = {
                dataSource: dataSource,
                panels: [],
                cancellationTokenSource: cancellationTokenSource
            };
            Results.map.set(document, resultEntry);
        }

        const resultsPromise = loadResults(dataSource, queries, hasExistingDataSource, cancellationTokenSource);

        const panelTitle = `${dataSource.getName()} - ${fileShortName}`;
        const firstPanel = await showInitialLoadingPanel(panelTitle, document, resultEntry);
        if (!firstPanel) {
            return;
        }
        resultsPromise
            .then(resultSets => showRemainingPanels(firstPanel, document, resultEntry, resultSets))
            .catch(err => {
                firstPanel.webview.postMessage({
                    type: 'onError',
                    message: formatExecutionError(err)
                });
            });
    }

    async function execute(dataSource?: DataSource) {
        if (!(dataSource instanceof DataSource)) {
            dataSource = undefined;
        }

        await getSingleFileResults(dataSource);
    }

    async function executeExplorer(_: Uri, uris: Uri[]) {
        const documents = await Promise.all(uris.map(uri => workspace.openTextDocument(uri)));

        let dataSources = documents.map(document => {
            const resultEntry: ResultsEntry | undefined = Results.map.get(document);
            if (resultEntry) {
                return resultEntry.dataSource;
            }
            else {
                return null;
            }
        });
        
        if (dataSources.some(dataSource => !dataSource)) {
            const dataSource = await selectDatasource(context);
            if (!dataSource) {
                return null;
            }

            // Spread this datasource accross an array the same size
            dataSources = dataSources.map(_ => dataSource);
        }

        for (let i = 0; i < documents.length; i++) {
            const dataSource = dataSources[i];
            const document = documents[i];
            const queries = document.getText();
            getMultipleFileResults(dataSource!, document, queries);
        }
    }

    async function selectFromDetailsView(): Promise<void> {
        const activeTab = window.tabGroups.activeTabGroup.activeTab;
        const input = activeTab?.input;
        if (!(input instanceof TabInputWebview)) {
            return;
        }

        if (!input.viewType.endsWith(tableDetailsPanelType)
            && !input.viewType.endsWith(viewDetailsPanelType)) {
            return;
        }

        // The panel title is `${dataSource.getName()} - ${objectName}`.
        const [databaseName, objectName] = activeTab!.label.split(' - ');

        const dataSource = ConnectionManager.getDataSource(databaseName);
        if (!dataSource) {
            return;
        }

        await selectObject(dataSource, objectName);
    }

    async function selectFromDocument(): Promise<void> {
        const editor = window.activeTextEditor;
        if (!editor) {
            return;
        }

        const uri = editor.document.uri;
        if (uri.scheme !== tableDocumentScheme && uri.scheme !== viewDocumentScheme) {
            return;
        }

        // Example uri: virtualTableSQL:databaseName/objectName.sql
        const parts = uri.path.split('/');
        const databaseName = parts[0];
        const objectName = parts[1].substring(0, parts[1].length - 4);

        const dataSource = ConnectionManager.getDataSource(databaseName);
        if (!dataSource) {
            return;
        }

        await selectObject(dataSource, objectName);
    }

    return [
        commands.registerCommand('sql-anywhere-17-database-tools.results.execute', execute),
        commands.registerCommand('sql-anywhere-17-database-tools.results.executeWithDatasource', async () => {
            if (window.activeTextEditor?.document.languageId === 'sql') {
                const dataSource = await selectDatasource(context);
                await execute(dataSource!);
            }
        }),
        commands.registerCommand('sql-anywhere-17-database-tools.results.executeExplorer', executeExplorer),
        commands.registerCommand('sql-anywhere-17-database-tools.results.selectFromDetails', selectFromDetailsView),
        commands.registerCommand('sql-anywhere-17-database-tools.results.selectFromDocument', selectFromDocument)
    ];

}
