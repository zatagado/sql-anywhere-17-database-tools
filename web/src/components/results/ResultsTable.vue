<script setup lang="ts">
import ResultsHeader from './ResultsHeader.vue';
import ResultsBody from './ResultsBody.vue';
defineProps({})

const header = [
    'id',
    'name',
    'value',
]

const body = [
    [1, 'John Doe', 100],
    [2, 'Jane Doe', 200],
    [3, 'John Doe', 300],
]
</script>

<template>
    <table>
        <ResultsHeader :columns="header" />
        <ResultsBody :rows="body" />
    </table>
</template>

<style scoped></style>
