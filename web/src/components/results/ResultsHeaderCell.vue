<script setup lang="ts">
import { ColumnDefinition } from 'odbc';
defineProps({
    column: ColumnDefinition
})
</script>

<template>
    <th 
        class="border border-gray-300"
    >{{ column!.name }}</th>
</template>

<style scoped></style>
