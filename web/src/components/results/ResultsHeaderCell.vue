<script setup lang="ts">
import type { ColumnDefinition } from 'odbc';
defineProps<{
    column: ColumnDefinition
}>()
</script>

<template>
    <th class="bg-gray-500 sticky top-0">
        <span class="truncate">{{ column!.name }}</span>
    </th>
</template>

<style scoped></style>
