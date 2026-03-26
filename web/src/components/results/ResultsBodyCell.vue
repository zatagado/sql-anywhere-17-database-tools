<script setup lang="ts">
defineProps({
    value: {  
        type: [String, Number],
        required: true
    }
})
</script>

<template>
  <td class="border border-gray-300">{{ value }}</td>
</template>

<style scoped></style>
