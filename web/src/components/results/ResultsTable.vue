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

const scrollTop = ref(0);
const innerHeight = ref(window.innerHeight);
const headerHeight = ref(0);
const defaultColumnWidth = 150;
const indexColumn = 'minmax(50px, max-content)';
const fillerColumn = 'minmax(0, 1fr)';
const columnWidths = ref<number[]>(
    Array.from({ length: props.queryResult.columns.length }, () => defaultColumnWidth)
);
const tableStyle = computed(() => ({
    gridTemplateColumns: [indexColumn, ...columnWidths.value.map((width) => `${width}px`), fillerColumn].join(' ')
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

function onResize() {
    innerHeight.value = window.innerHeight;
}

window.addEventListener('resize', onResize);

const blocked = ref(false);
const timeout = ref<number | null>(null);
const currentScrollTop = ref(0);
function onThrottledScroll(e: Event) {
    currentScrollTop.value = (e.currentTarget as HTMLElement).scrollTop;
    if (timeout.value) {
        clearTimeout(timeout.value);
    }
    timeout.value = setTimeout(() => {
        scrollTop.value = currentScrollTop.value;
    }, 100);
    if (blocked.value) {
        return;
    }
    blocked.value = true;
    setTimeout(() => (blocked.value = false), 100);
    scrollTop.value = currentScrollTop.value;
}


</script>

<template>
    <table
        class="grid min-w-full w-full results-table-scroll"
        @dragstart.prevent
        @scroll="onThrottledScroll"
        :style="tableStyle"
    >
        <ResultsHeader
            v-model:header-height="headerHeight"
            v-model:column-widths="columnWidths"
            :columns="columnsForHeader"
            :inner-height="innerHeight"
            @sort="onSortColumn"
        />
        <ResultsBody :query-result="queryResult" :virtual-table-paramaters="{ scrollTop, innerHeight, headerHeight }" />
    </table>
</template>

<style scoped>
/* display:grid on <table> makes it a normal scroll container; tbody scroll alone is not possible. */
.results-table-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    /* Avoid stretching implicit grid rows to fill the scroll area when there are few rows */
    align-content: start;
}
</style>

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
