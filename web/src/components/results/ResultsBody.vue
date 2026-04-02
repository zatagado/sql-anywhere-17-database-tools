<script setup lang="ts">
import ResultsBodyRow from './ResultsBodyRow.vue';
import type { Result } from 'odbc';
defineProps<{
    queryResult: Result<unknown>
}>()

// TODO need to make virtualized rows.
// TODO when the window is resized, additional rows should be added or removed. window.addEventListener('resize', () => { ... })
// TODO First measure the height of a single row, then calculate based on the window height the number of rows to render.
// TODO must maintain the position of the rows when the window is resized.
// TODO find a way to fake the scrollbar

</script>
<template>
    <tbody class="contents">
        <!-- @vue-ignore -->
        <ResultsBodyRow v-for="(row, index) in queryResult" :key="index" :rowIndex="index" :columns="queryResult!.columns" :row="row" />
    </tbody>
</template>
