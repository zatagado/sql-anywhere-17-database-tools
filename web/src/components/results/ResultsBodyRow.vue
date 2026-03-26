<script setup lang="ts">
import ResultsBodyCell from './ResultsBodyCell.vue';
defineProps({
    row: Array<string | number>
})
</script>

<template>
  <tr>
    <ResultsBodyCell v-for="cell in row" :key="cell" :value="cell" />
  </tr>
</template>

<style scoped></style>
