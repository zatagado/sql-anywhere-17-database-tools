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
        <span>
            {{ value }}
        </span>
    </td>
</template>

<style scoped>
td {
    text-align: left;
    padding: 16px 20px;
    min-width: 100px;
}

tr td {
    border-top: 1px solid #ccc;
}

td span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
