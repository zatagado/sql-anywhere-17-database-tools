<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ColumnDefinition, Result } from 'odbc';
import ResultsHeader from './ResultsHeader.vue';
import ResultsBody from './ResultsBody.vue';

const props = defineProps<{
    queryResult: Result<unknown>
}>();

type SortDirection = 'asc' | 'desc' | null;
type Column = ColumnDefinition & { sort: SortDirection };

const emit = defineEmits<{
    sortColumn: [{ column: Column; index: number }]
}>();

const columnsForHeader = computed(() => props.queryResult.columns as Column[]);

const tableElement = ref<HTMLTableElement>();

const defaultColumnWidth = 150;
const indexColumn = '50px';
const fillerColumn = 'minmax(0, 1fr)';
const tableStyle = computed(() => ({
    gridTemplateColumns: [indexColumn, ...props.queryResult.columns.map(() => `${defaultColumnWidth}px`), fillerColumn].join(' ')
}));

const sortState = ref<{ column: string | null; direction: SortDirection }>({
    column: null,
    direction: null
});

function onSortColumn(sort: { column: Column; index: number }) {

    function compare(a: unknown, b: unknown, dataType: number): number {
        if (dataType === 4) {
            return Number(a) - Number(b);
        }
        return String(a ?? '').localeCompare(String(b ?? ''));
    }

    if (sortState.value.column === sort.column.name) {
        sortState.value = {
            column: sort.column.name,
            direction:
                sortState.value.direction === 'asc'
                    ? 'desc'
                    : sortState.value.direction === 'desc'
                      ? null
                      : 'asc'
        };
    }
    else {
        sortState.value = { column: sort.column.name, direction: 'asc' };
    }

    const direction = sortState.value.direction === 'asc' ? 1 : -1;
    const dataType = sort.column.dataType;
    const key = sort.column.name;
    const rows = props.queryResult;
    // Shared Result<unknown> from the extension: sort rows and attach sort UI state in place.
    rows.sort((rowA, rowB) =>
        direction * compare(
            (rowA as Record<string, unknown>)[key],
            (rowB as Record<string, unknown>)[key],
            dataType
        ));
    for (const column of rows.columns as Column[]) {
        column.sort = sortState.value.column !== null &&
            column.name === sortState.value.column ? sortState.value.direction : null;
    }

    const columnAfter = rows.columns[sort.index] as Column;
    emit('sortColumn', { column: columnAfter, index: sort.index });
}

</script>

<template>
    <table
        class="grid min-w-full w-full"
        @dragstart.prevent
        ref="tableElement"
        :style="tableStyle"
    >
        <ResultsHeader :columns="columnsForHeader" :table-element="tableElement" @sort="onSortColumn" />
        <ResultsBody :queryResult="queryResult" />
    </table>
</template>

<style>
td span {
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
}

th span {
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
    font-weight: 700;
}
</style>
