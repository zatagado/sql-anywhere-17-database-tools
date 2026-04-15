<script setup lang="ts">
import ResultsBodyCell from './ResultsBodyCell.vue';
defineProps<{
    rowIndex: number
    columns: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean,
        sort?: 'asc' | 'desc' | null,
    }[]
    row: Record<string, string | number | boolean | null>
}>()


</script>

<template>
    <tr class="contents" :class="{ 'alt': rowIndex % 2 === 0 }">
        <td class="index-cell">
            <span>{{ rowIndex + 1 }}</span>
        </td>
        <ResultsBodyCell
            v-for="column in columns"
            :key="column.name"
            :column="column"
            :value="row[column.name]!"
        />
        <td class="filler-cell"></td>
    </tr>
</template>

<style scoped>
td.index-cell {
    border-right: 1px solid var(--vscode-editorWidget-border);
    box-sizing: border-box;
    left: 0;
    position: sticky;
    text-align: right;
    padding: 5px 10px 5px 0px;
    z-index: 2;
}

td {
    border-top: 1px solid var(--vscode-editorWidget-border);
    text-align: left;
    padding: 5px 20px;
}

td.filler-cell {
    border-left: 1px solid var(--vscode-editorWidget-border);
    padding: 0;
}
</style>

<style>
td.index-cell {
    background: var(--vscode-editor-background);
}

tr.alt td {
    background: color-mix(in srgb, var(--vscode-editor-background) 90%, rgb(0 0 0) 10%);
}

body.vscode-light tr.alt td {
    background: color-mix(in srgb, var(--vscode-editor-background) 98.5%, rgb(0 0 0) 1.5%);
}

td.index-cell span {
    color: color-mix(in srgb, var(--vscode-editor-foreground) 60%, rgb(0 0 0) 40%);
}

body.vscode-light td.index-cell span {
    color: color-mix(in srgb, var(--vscode-editor-foreground) 40%, rgb(255 255 255) 60%);
}
</style>
