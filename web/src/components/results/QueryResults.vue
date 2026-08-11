<script setup lang="ts">
import VirtualTable from '../../shared/table/VirtualTable.vue';
import { computed, ref } from 'vue';
import LoadingSpinner from '../../shared/loading/LoadingSpinner.vue';
import type { QueryResult, QueryResultDetails } from '../../utils.ts';
import { handleMessageType } from '../../utils.ts';

const isLoading = ref(true);
const error = ref<string>();

const details = ref<QueryResultDetails>();
const rows = ref<unknown[]>();
const rowsCount = ref<number>(0);
const data = ref<QueryResult>();

const rowCountLabel = computed(() => {
    if (!data.value) {
        return '';
    }

    const count = data.value.length;
    const label = count === 1 ? 'Row' : 'Rows';

    return data.value.truncated ? `${count}+ ${label}` : `${count} ${label}`;
});

window.addEventListener('message', (event) => {
    const message = event.data;

    handleMessageType(
        message,
        isLoading,
        error,
        details,
        rows,
        rowsCount,
        data
    );
});
</script>

<template>
    <div class="query-results-root w-full min-w-0 h-full min-h-0">
        <LoadingSpinner v-if="isLoading" />
        <template v-else>
            <div
                v-if="data && data.columns.length > 0"
                class="results-with-footer"
            >
                <VirtualTable
                    class="results-table-area"
                    :data="data"
                    :enable-tooltip="true"
                    :null-placeholder="data.nullPlaceholder"
                />
                <div class="row-count-footer">{{ rowCountLabel }}</div>
            </div>
            <div v-else-if="error" class="error-msg">{{ error }}</div>
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
