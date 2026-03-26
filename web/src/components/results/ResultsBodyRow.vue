<script setup lang="ts">
import ResultsBodyCell from './ResultsBodyCell.vue';
defineProps({
    row: Array<{ [key: string]: string | number | boolean }>
})
</script>

<template>
  <tr>
    <!-- TODO work on this stuff -->
    <ResultsBodyCell v-for="(cell, key) in row" :key="key" :column="columns.find(column => column.name === key)" :value="cell" />
  </tr>
</template>

<style scoped></style>
