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
            <th class="bg-gray-500 sticky top-0"></th>
            <ResultsHeaderCell v-for="column in columns" :key="column.name" :column="column" />
        </tr>
    </thead>
</template>

<style scoped></style>
