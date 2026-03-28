<script setup lang="ts">
defineProps({
    value: {  
        type: [String, Number],
        required: true
    }
})
</script>

<template>
    <td>
        <span>{{ value }}</span>
    </td>
</template>

<style scoped></style>
