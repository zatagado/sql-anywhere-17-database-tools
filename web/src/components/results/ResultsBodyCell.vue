<script setup lang="ts">
const props = defineProps<{
    column: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean
    },
    value: {  
        type: [String, Number],
        required: true
    }
}>()

const textClass = props.column.dataType === 4 ? 'numeric' : 'string'; // TODO add helper function for this
</script>

<template>
    <td>
        <span :class="textClass">{{ value }}</span>
    </td>
</template>

<style scoped>
td {
    border-left: 1px solid var(--vscode-editorWidget-border);
}

td span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.numeric {
    text-align: right;
}

.string {
    text-align: left;
}
</style>
