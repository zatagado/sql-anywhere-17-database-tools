<script setup lang="ts">
import ResultsBodyRow from './ResultsBodyRow.vue';
import { Result } from 'odbc';
defineProps({
    rows: Result<unknown>
})
</script>

<template>
    <tbody>
        <ResultsBodyRow v-for="(row, index) in rows" :key="index" :columns="rows!.columns" :row="row" />
    </tbody>
</template>

<style scoped></style>
