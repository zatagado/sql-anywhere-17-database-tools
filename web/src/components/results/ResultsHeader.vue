<script setup lang="ts">
import type { ColumnDefinition } from 'odbc';
import ResultsHeaderCell from './ResultsHeaderCell.vue';
defineProps<{
    columns: ColumnDefinition[]
}>()
</script>

<template>
    <thead>
        <tr>
            <ResultsHeaderCell v-for="column in columns" :key="column.name" :column="column" />
        </tr>
    </thead>
</template>

<style scoped></style>
