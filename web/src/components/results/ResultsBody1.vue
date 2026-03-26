<script setup lang="ts">
import ResultsBodyRow from './ResultsBodyRow1.vue';
defineProps({
    rows: Array<Array<string | number>>
})
</script>

<template>
    <tbody>
        <ResultsBodyRow v-for="row in rows" :key="row[0]" :row="row" />
    </tbody>
</template>

<style scoped></style>
