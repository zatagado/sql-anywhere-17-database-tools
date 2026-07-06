<script setup lang="ts">
import ResultsTable from './ResultsTable.vue';
import type { ColumnDefinition, Result } from 'odbc';
import { computed, ref } from 'vue';

const loading = ref(true);
const queryError = ref<string>();

type QueryResultDetails = {
    columns: ColumnDefinition[];
    count: number;
    statement: string;
    return: number;
    parameters: Array<number | string>;
    truncated: boolean;
    maxRows: number;
};

type QueryResult = Result<unknown> & { truncated?: boolean };

const queryResultDetails = ref<QueryResultDetails>();
const queryResultRows = ref<unknown[]>();
const queryResultRowsCount = ref<number>(0);
const queryResult = ref<QueryResult>();

const rowCountLabel = computed(() => {
    if (!queryResult.value) {
        return '';
    }

    const count = queryResult.value.length;
    const label = count === 1 ? 'Row' : 'Rows';

    return queryResult.value.truncated ? `${count}+ ${label}` : `${count} ${label}`;
});

window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
        case 'onQueryLoading': {
            loading.value = true;
            queryError.value = undefined;
            queryResultDetails.value = undefined;
            queryResultRows.value = undefined;
            queryResultRowsCount.value = 0;
            queryResult.value = undefined;
            break;
        }
        case 'onQueryResultDetails': {
            queryResultDetails.value = Object.assign({}, {
                columns: message.columns,
                count: message.count,
                statement: message.statement,
                return: message.return,
                parameters: message.parameters,
                truncated: message.truncated ?? false,
                maxRows: message.maxRows
            });
            break;
        }
        case 'onQueryResultRows': {
            if (!queryResultRows.value) {
                queryResultRows.value = new Array<unknown>(message.count);
            }

            for (let i = 0; i < message.rows.length; i++) {
                queryResultRows.value[message.startIndex + i] = message.rows[i];
            }
            queryResultRowsCount.value += message.rows.length;

            if (queryResultRowsCount.value === message.count) {
                queryResult.value = Object.assign(
                    queryResultRows.value, queryResultDetails.value) as QueryResult;
                loading.value = false;
                queryError.value = undefined;
                debugger;
            }
            break;
        }
        case 'onQueryError': {
            loading.value = false;
            queryResult.value = undefined;
            queryError.value = message.message as string;
            break;
        }
    }
});
</script>

<template>
    <div class="query-results-root w-full min-w-0 h-full min-h-0">
        <div v-if="loading" class="loading-container">
            <div class="loading-spinner"/>
        </div>
        <template v-else>
            <div
                v-if="queryResult && queryResult.columns.length > 0"
                class="results-with-footer"
            >
                <ResultsTable class="results-table-area" :queryResult="queryResult" />
                <div class="row-count-footer">{{ rowCountLabel }}</div>
            </div>
            <div v-else-if="queryError" class="error-msg">{{ queryError }}</div>
            <div v-else class="empty-msg">No result set.</div>
        </template>
    </div>
</template>

<style scoped>
/* Fill webview height so non-fixed content can grow; loading uses fixed overlay below. */
.query-results-root {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 100%;
    height: 100%;
}

.results-with-footer {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
}

.results-table-area {
    flex: 1 1 auto;
    min-height: 0;
}

/* todo might need to change the color of the background */
.row-count-footer {
    flex-shrink: 0;
    box-sizing: border-box;
    height: calc(var(--vscode-editor-font-size) + 0.75rem);
    padding: 0.375rem 0.5rem 0;
    border-top: 1px solid var(--vscode-panel-border);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--vscode-descriptionForeground, var(--vscode-foreground));
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    line-height: 1;
}

.loading-container {
    position: fixed;
    inset: 0;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 1rem;
}

.loading-spinner {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    background-color: var(--vscode-foreground);
    mask-image: url('../../../resources/loading.svg');
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: contain;
    animation: loading-spin 0.9s linear infinite;
}

@keyframes loading-spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.empty-msg, .error-msg {
    padding: 1rem;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
}

.empty-msg {
    color: var(--vscode-foreground);
}

.error-msg {
    color: var(--vscode-errorForeground);
    white-space: pre-wrap;
}
</style>
