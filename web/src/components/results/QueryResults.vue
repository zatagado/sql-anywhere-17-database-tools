<script setup lang="ts">
import ResultsTable from './ResultsTable.vue';
import type { Result } from 'odbc';
import { ref } from 'vue';

const queryResult = ref<Result<unknown>>();
window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'onQueryResult') {
        queryResult.value = Object.assign(message.rows, {
            columns: message.columns,
            count: message.count,
            statement: message.statement,
            return: message.return,
            parameters: message.parameters
        }) as Result<unknown>;
    }
});
</script>

<template>
    <div class="w-full min-w-0">
        <ResultsTable v-if="queryResult" :queryResult="queryResult" />
        <div v-else>No result set for this query.</div>
    </div>
</template>

<style scoped></style>
