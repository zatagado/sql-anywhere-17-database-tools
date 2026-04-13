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

// TODO index column width should be based on number of digits to the result count
const indexColumn = 'minmax(50px, max-content)';
const fillerColumn = 'minmax(0, 1fr)';

// TODO column widths should be based on the data types and sizes of the data
const columnWidths = ref<number[]>(
    Array.from({ length: props.queryResult.columns.length }, () => defaultColumnWidth)
);
// TODO column widths should be based on the data types and sizes of the data
const tableStyle = computed(() => ({
    gridTemplateColumns: [indexColumn, ...columnWidths.value.map((width) => `${width}px`), fillerColumn].join(' ')
}));

const sortState = ref<{ column: string | null; direction: SortDirection }>({
    column: null,
    direction: null
});

// TODO there is an issue where sorting with multiple of the same column will sort both, but they may have different data
function onSortColumn(sort: { column: Column; index: number }) {
    function compare(a: unknown, b: unknown, dataType: number): number {
        switch (dataType) {
            case 4:
            case 5:
                return Number(a) - Number(b);
            default:
                return String(a ?? '').localeCompare(String(b ?? ''));
        }
    }

    if (sortState.value.column === sort.column.name) {
        let direction: SortDirection;
        switch (sortState.value.direction) {
            case 'asc':
                direction = 'desc';
                break;
            case 'desc':
                direction = null;
                break;
            default:
                direction = 'asc';
                break;
        }

        sortState.value = {
            column: sort.column.name,
            direction: direction
        };
    }
    else {
        sortState.value = { column: sort.column.name, direction: 'asc' };
    }

    const direction = sortState.value.direction === 'asc' ? 1 : -1;
    const dataType = sort.column.dataType;
    const key = sort.column.name;
    const rows = props.queryResult;

    rows.sort((rowA, rowB) =>
        direction * compare(
            (rowA as Record<string, unknown>)[key],
            (rowB as Record<string, unknown>)[key],
            dataType
        ));
    for (let i = 0; i < rows.columns.length; i++) {
        const column = rows.columns[i] as Column;
        column.sort = sort.index === i ? sortState.value.direction : null;
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
        <ResultsBody
            :query-result="queryResult"
            :virtual-table-paramaters="{ scrollTop, innerHeight, headerHeight, sortState }"
        />
    </table>
</template>

<style scoped>
.results-table-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    /* Overflow anchor prevents scroll top jumping vertically when scrolled horizontally. */
    overflow-anchor: none;
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
