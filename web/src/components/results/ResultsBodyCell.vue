<script setup lang="ts">
defineProps({
    value: {  
        type: [String, Number],
        required: true
    }
})
</script>

<template>
    <td class="border border-gray-300 ">
        <span class="truncate">{{ value }}</span>
    </td>
</template>

<style scoped></style>
