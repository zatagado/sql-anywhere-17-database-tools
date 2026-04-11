<script setup lang="ts">
const props = defineProps<{
    column: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean,
        sort?: 'asc' | 'desc' | null,
    },
    value: string | number | boolean,
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
}

td span.string {
    text-align: left;
    white-space: pre;
}

td span.numeric {
    text-align: right;
    white-space: nowrap;
}
</style>
