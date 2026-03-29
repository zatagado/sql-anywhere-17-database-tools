<script setup lang="ts">
import ResultsBodyCell from './ResultsBodyCell.vue';
import type { ColumnDefinition } from 'odbc';
defineProps<{
    rowIndex: number
    columns: ColumnDefinition[]
    row: Array<{ [key: string]: string | number | boolean }>
}>()
</script>

<template>
    <tr class="contents">
        <!-- <td>{{ rowIndex + 1 }}</td> -->
        <!-- @vue-ignore -->
        <ResultsBodyCell v-for="column in columns" :key="column.name" :value="row[column.name]" />
    </tr>
</template>

<style scoped></style>
