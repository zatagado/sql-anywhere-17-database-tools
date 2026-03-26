<script setup lang="ts">
import { ColumnDefinition } from 'odbc';
import ResultsHeaderCell from './ResultsHeaderCell.vue';
defineProps({
    columns: Array<ColumnDefinition>
})
</script>

<template>
    <thead>
        <tr>
            <ResultsHeaderCell v-for="column in columns" :key="column.name" :value="column.name" />
        </tr>
    </thead>
</template>

<style scoped></style>
