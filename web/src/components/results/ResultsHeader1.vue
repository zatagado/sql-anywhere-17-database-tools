<script setup lang="ts">
import ResultsHeaderCell from './ResultsHeaderCell1.vue';
defineProps({
    columns: Array<string>
})
</script>

<template>
    <thead>
        <ResultsHeaderCell v-for="column in columns" :key="column" :value="column" />
    </thead>
</template>

<style scoped></style>
