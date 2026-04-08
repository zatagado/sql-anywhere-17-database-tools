<script setup lang="ts">
defineProps<{
    columns: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean,
    }[]
}>();
</script>

<template>
    <tr class="contents dummy-body-row" aria-hidden="true">
        <td class="index-cell"><span>0</span></td>
        <td
            v-for="column in columns"
            :key="column.name"
            class="dummy-data-cell"
        >
            <span>&nbsp;</span>
        </td>
        <td class="filler-cell"></td>
    </tr>
</template>

<style scoped>
.dummy-body-row td {
    border-top: 1px solid var(--vscode-editorWidget-border);
    box-sizing: border-box;
    opacity: 0;
    padding: 5px 20px;
    pointer-events: none;
    text-align: left;
}

.dummy-body-row td.index-cell {
    border-right: 1px solid var(--vscode-editorWidget-border);
    left: 0;
    min-width: 50px;
    position: sticky;
    text-align: right;
    padding: 5px 10px 5px 0;
    z-index: 2;
}

.dummy-body-row td.dummy-data-cell {
    border-left: 1px solid var(--vscode-editorWidget-border);
}

.dummy-body-row td.filler-cell {
    border-left: 1px solid var(--vscode-editorWidget-border);
    padding: 0;
}
</style>
