<script setup lang="ts">
import ResultsBodyRow from './ResultsBodyRow.vue';
import type { Result } from 'odbc';
defineProps<{
    queryResult: Result<unknown>
}>()
</script>

<template>
    <tbody>
        <!-- @vue-ignore -->
        <ResultsBodyRow v-for="(row, index) in queryResult" :key="index" :columns="queryResult!.columns" :row="row" />
    </tbody>
</template>

<style scoped></style>
