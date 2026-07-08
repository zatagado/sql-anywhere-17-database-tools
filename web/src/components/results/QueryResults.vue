<script setup lang="ts">
import ResultsTable from './ResultsTable.vue';
import type { ColumnDefinition, Result } from 'odbc';
import { computed, onMounted, ref } from 'vue';

const loading = ref(true);
const queryError = ref<string>();

type QueryResult = Result<unknown> & { truncated?: boolean };

const queryResult = ref<QueryResult>();
const activeGeneration = ref(0);

function adoptGeneration(generation: number | undefined): boolean {
    if (typeof generation !== 'number') {
        return true;
    }
    if (generation < activeGeneration.value) {
        return false;
    }
    activeGeneration.value = generation;
    return true;
}

function applyQueryResult(
    generation: number | undefined,
    columns: ColumnDefinition[],
    rows: unknown[],
    details: {
        statement: string;
        return: number;
        parameters: Array<number | string>;
        truncated: boolean;
    }
) {
    if (!adoptGeneration(generation)) {
        return;
    }

    queryResult.value = Object.assign(rows, {
        columns,
        count: rows.length,
        statement: details.statement,
        return: details.return,
        parameters: details.parameters,
        truncated: details.truncated,
    }) as QueryResult;
    loading.value = false;
    queryError.value = undefined;
}

const rowCountLabel = computed(() => {
    if (!queryResult.value) {
        return '';
    }

    const count = queryResult.value.length;
    const label = count === 1 ? 'Row' : 'Rows';

    return queryResult.value.truncated ? `${count}+ ${label}` : `${count} ${label}`;
});

onMounted(() => {
    window.__vscodeApi__?.postMessage({ type: 'onWebviewReady' });
});

window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
        case 'onQueryLoading': {
            if (typeof message.generation !== 'number' || message.generation <= activeGeneration.value) {
                break;
            }
            activeGeneration.value = message.generation;
            loading.value = true;
            queryError.value = undefined;
            queryResult.value = undefined;
            break;
        }
        case 'onQueryResult': {
            applyQueryResult(message.generation, message.columns ?? [], message.rows ?? [], {
                statement: message.statement,
                return: message.return,
                parameters: message.parameters,
                truncated: message.truncated ?? false,
            });
            break;
        }
        case 'onQueryError': {
            if (!adoptGeneration(message.generation)) {
                break;
            }
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
