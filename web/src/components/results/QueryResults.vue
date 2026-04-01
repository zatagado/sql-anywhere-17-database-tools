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
    <div class="w-full min-w-0">
        <div v-if="loading" class="loading-msg" role="status">
            Running query…
        </div>
        <ResultsTable v-else-if="queryResult" :queryResult="queryResult" />
        <div v-else-if="queryError" class="error-msg">{{ queryError }}</div>
        <div v-else>No result set for this query.</div>
    </div>
</template>

<style scoped>
.loading-msg,
.error-msg {
    padding: 1rem;
    color: var(--vscode-foreground);
    font-size: 13px;
}
.error-msg {
    color: var(--vscode-errorForeground, var(--vscode-foreground));
    white-space: pre-wrap;
}
</style>
