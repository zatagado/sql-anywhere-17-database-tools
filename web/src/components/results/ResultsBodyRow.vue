<script setup lang="ts">
import ResultsBodyCell from './ResultsBodyCell.vue';
import type { ColumnDefinition } from 'odbc';
defineProps<{
    columns: ColumnDefinition[]
    row: Array<{ [key: string]: string | number | boolean }>
}>()
debugger;
</script>

<template>
  <tr>
    <!-- TODO work on this stuff -->
     <!-- @vue-ignore -->
    <ResultsBodyCell v-for="(cell, key) in row" :key="key" :column="columns.find(column => column.name === key)" :value="cell" />
  </tr>
</template>

<style scoped></style>
