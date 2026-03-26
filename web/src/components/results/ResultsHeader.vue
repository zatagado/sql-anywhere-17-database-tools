<script setup lang="ts">
import ResultsHeaderCell from './ResultsHeaderCell.vue';
defineProps({
    columns: Array<string>
})
</script>

<template>
    <thead>
        <tr>
            <ResultsHeaderCell v-for="column in columns" :key="column" :value="column" />
        </tr>
    </thead>
</template>

<style scoped></style>
