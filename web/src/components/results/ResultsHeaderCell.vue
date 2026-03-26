<script setup lang="ts">
defineProps({
    value: {
        type: String,
        required: true
    }
})
</script>

<template>
    <th>{{ value }}</th>
</template>

<style scoped></style>
