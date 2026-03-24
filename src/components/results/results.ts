import { ConnectionManager, DataSource } from '../../manager/connectionManager';
import { ResultsRest } from '../../rest/results/resultsRest';
import { commands, Disposable, window } from 'vscode';
import type { Result } from 'odbc';

function resolveDataSource(): DataSource | undefined {
    const sources = ConnectionManager.getDataSources();
    if (sources.length === 0) {
        window.showErrorMessage('No datasource configured. Add a datasource first.');
        return undefined;
    }
    return sources[0];
}

/** Prefer ODBC diagnostic records; `Error.message` is often only "[odbc] Error executing the sql statement". */
function formatOdbcExecutionError(err: unknown): string {
    if (err instanceof Error && 'odbcErrors' in err) {
        const odbcErrors = (err as Error & { odbcErrors?: Array<{ state: string; message: string; code: number }> })
            .odbcErrors;
        if (odbcErrors && odbcErrors.length > 0) {
            return odbcErrors
                .map(e => `[${e.state}] ${e.message}`.trim())
                .join('; ');
        }
    }
    if (err instanceof Error) {
        return err.message;
    }
    return String(err);
}

function formatQueryResult(result: Result<unknown>): string {
    const lines: string[] = [];
    lines.push(`${result.count} row(s)`);
    if (result.length === 0) {
        return lines.join('\n');
    }
    const columnNames =
        result.columns?.map(c => c.name) ??
        (typeof result[0] === 'object' && result[0] !== null
            ? Object.keys(result[0] as object)
            : []);
    lines.push(columnNames.join('\t'));
    for (const row of result) {
        if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
            const r = row as Record<string, unknown>;
            lines.push(columnNames.map(c => String(r[c] ?? '')).join('\t'));
        }
        else {
            lines.push(String(row));
        }
    }
    return lines.join('\n');
}

export function activate(): Disposable[] {
    const outputChannel = window.createOutputChannel('SQL Anywhere results');

    async function runSqlFromActiveEditor(): Promise<void> {
        const editor = window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'sql') {
            window.showWarningMessage('Open a SQL editor to run SQL.');
            return;
        }

        const sql = editor.document.getText().trim();
        if (!sql) {
            window.showWarningMessage('The SQL document is empty.');
            return;
        }

        const dataSource = resolveDataSource();
        if (!dataSource) {
            return;
        }

        try {
            const result = await ResultsRest.executeScript(dataSource, sql);
            outputChannel.clear();
            outputChannel.appendLine(`-- ${dataSource.getName()} (${dataSource.getType()})`);
            outputChannel.appendLine('');
            outputChannel.appendLine(formatQueryResult(result));
            outputChannel.show(true);
        } catch (err) {
            const message = formatOdbcExecutionError(err);
            window.showErrorMessage(`SQL execution failed: ${message}`);
            outputChannel.clear();
            outputChannel.appendLine('SQL execution failed');
            outputChannel.appendLine(message);
            outputChannel.show(true);
            console.error('[results.runSqlFromActiveEditor]', err);
        }
    }

    return [commands.registerCommand('sql-anywhere-17-database-tools.execute', runSqlFromActiveEditor), outputChannel];
}
