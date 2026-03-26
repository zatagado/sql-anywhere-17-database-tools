<script setup lang="ts">
defineProps({
    value: {  
        type: [String, Number],
        required: true
    }
})
</script>

<template>
  <td>{{ value }}</td>
</template>

<style scoped></style>
