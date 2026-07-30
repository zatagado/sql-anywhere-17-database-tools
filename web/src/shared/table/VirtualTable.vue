<script setup lang="ts">
import { computed, provide, ref } from 'vue';
import type { ColumnDefinition, Result } from 'odbc';
import VirtualTableHeader from './VirtualTableHeader.vue';
import VirtualTableBody from './VirtualTableBody.vue';
import { isNumericSqlDataType, type ResultRow } from '../../utils.ts';

const props = defineProps<{
    data: Result<unknown>
    enableTooltip?: boolean
    nullPlaceholder?: string
}>();
provide('enableTooltip', props.enableTooltip ?? false);
provide('nullPlaceholder', props.nullPlaceholder ?? '(NULL)');

type SortDirection = 'asc' | 'desc' | null;
type Column = ColumnDefinition & { sort: SortDirection };

const emit = defineEmits<{
    sortColumn: [{ column: Column; index: number }]
}>();

const columnsForHeader = computed(() => props.data.columns as Column[]);

const scrollTop = ref(0);
const innerHeight = ref(window.innerHeight);
const headerHeight = ref(0);

const fillerColumn = 'minmax(0, 1fr)';

const padding = 6;
const maxColumnWidth = 64;
const indexPadding = 20;

function getCellFont(): string {
    const style = getComputedStyle(document.documentElement);
    const size = style.getPropertyValue('--vscode-editor-font-size');
    const family = style.getPropertyValue('--vscode-editor-font-family');
    return `${size} ${family}`;
}

function calculateIndexColumnWidth(data: Result<unknown>): number {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = getCellFont();
    const charWidth = context.measureText('0').width;
    canvas.remove();

    const count = data.length;
    const digits = count <= 0 ? 1 : String(count).length;
    return charWidth * digits + indexPadding;
}

const indexColumnWidth = ref(calculateIndexColumnWidth(props.data));

function calculateColumnWidths(data: Result<unknown>) {
    function getLongestValue(columnIndex: number, column: Column, data: Result<unknown>): number {
        let max = column.name.length;
        for (const row of data) {
            const length = String((row as ResultRow)[columnIndex] ?? '').length;
            if (length > max) {
                max = length;
            }
        }
        return max;
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context!.font = getCellFont();

    // All characters will be in a monospace font so just measure a single character
    const charWidth = context?.measureText('0').width;
    canvas.remove();

    return data.columns.map((column, columnIndex) =>
        charWidth! * Math.min(getLongestValue(columnIndex, column as Column, data) + padding, maxColumnWidth));
}

const columnWidths = ref<number[]>(calculateColumnWidths(props.data));

const tableStyle = computed(() => ({
    gridTemplateColumns: [`${indexColumnWidth.value}px`, ...columnWidths.value.map((width) => `${width}px`), fillerColumn].join(' ')
}));

const sortState = ref<{ columnIndex: number | null; direction: SortDirection }>({
    columnIndex: null,
    direction: null
});

function onSortColumn(sort: { column: Column; index: number }) {
    function compare(a: unknown, b: unknown, dataType: number): number {
        if (isNumericSqlDataType(dataType)) {
            return Number(a) - Number(b);
        }
        return String(a ?? '').localeCompare(String(b ?? ''));
    }

    if (sortState.value.columnIndex === sort.index) {
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
            columnIndex: sort.index,
            direction: direction
        };
    }
    else {
        sortState.value = { columnIndex: sort.index, direction: 'asc' };
    }

    const direction = sortState.value.direction === 'asc' ? 1 : -1;
    const dataType = sort.column.dataType;
    const columnIndex = sort.index;
    const rows = props.data;

    rows.sort((rowA, rowB) =>
        direction * compare(
            (rowA as ResultRow)[columnIndex],
            (rowB as ResultRow)[columnIndex],
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
        <VirtualTableHeader
            v-model:header-height="headerHeight"
            v-model:column-widths="columnWidths"
            :columns="columnsForHeader"
            :inner-height="innerHeight"
            :enable-tooltip="props.enableTooltip"
            @sort="onSortColumn"
        />
        <VirtualTableBody
            :data="data"
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
