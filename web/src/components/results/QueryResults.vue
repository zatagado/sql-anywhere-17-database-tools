<script setup lang="ts">
import ResultsTable from './ResultsTable.vue';
import type { Result } from 'odbc';
import { ref } from 'vue';

const loading = ref(true);
const queryError = ref<string>();
const queryResult = ref<Result<unknown>>();

window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
        case 'onQueryLoading': {
            loading.value = true;
            queryError.value = undefined;
            queryResult.value = undefined;
            break;
        }
        case 'onQueryResult': {
            loading.value = false;
            queryError.value = undefined;
            queryResult.value = Object.assign(message.rows, {
                columns: message.columns,
                count: message.count,
                statement: message.statement,
                return: message.return,
                parameters: message.parameters
            }) as Result<unknown>;
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
    <div class="w-full min-w-0 h-full min-h-0">
        <div v-if="loading" class="loading-container" role="status">
            <div class="loading-spinner"/>
        </div>
        <ResultsTable v-else-if="queryResult && queryResult.length > 0" :queryResult="queryResult" />
        <div v-else-if="queryError" class="error-msg">{{ queryError }}</div>
        <div v-else class="empty-msg" role="status">No result set.</div>
    </div>
</template>

<style scoped>
.loading-container {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 100%;
    padding: 1rem;
}

.loading-spinner {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    background-color: var(--vscode-foreground);
    mask-image: url('../../../resources/dark/loading.svg');
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

.empty-msg,
.error-msg {
    padding: 1rem;
    font: 14px Consolas, "Courier New", monospace;
}

.empty-msg {
    color: var(--vscode-foreground);
}

.error-msg {
    color: var(--vscode-errorForeground);
    white-space: pre-wrap;
}
</style>
