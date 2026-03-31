<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue';
import ResultsHeaderCell from './ResultsHeaderCell.vue';
type Column = {
    name: string,
    dataType: number,
    dataTypeName: string,
    columnSize: number,
    decimalDigits: number,
    nullable: boolean,
    sort: 'asc' | 'desc' | null,
};

const props = defineProps<{
    columns: Column[],
    tableElement: HTMLTableElement | undefined
}>();

const emit = defineEmits<{
    sort: [{ column: Column, index: number }]
}>();

const minCellWidth = 100;
const defaultColumnWidth = 150;
const indexColumn = '50px';
const fillerColumn = 'minmax(0, 1fr)';
const tableHeight = ref<number | 'auto'>('auto');
const activeIndex = ref<number | null>(null);
const columnProps = props.columns.map((column) => ({
    def: column,
    ref: ref<HTMLTableCellElement>()
}))

function mouseUp() {
    activeIndex.value = null;
    removeListeners();
}

function mouseDown(index: number) {
    activeIndex.value = index;
}

function mouseMove(event: MouseEvent) {
    const gridColumns = columnProps.map((column, index) => {
        if (activeIndex.value === index) {
            const width = event.clientX - (column.ref.value?.getBoundingClientRect().left ?? 0);
            if (width >= minCellWidth) {
                return `${width}px`;
            }
        }

        return `${column.ref.value?.offsetWidth ?? defaultColumnWidth}px`;
    });

    props.tableElement!.style.gridTemplateColumns = [indexColumn, ...gridColumns, fillerColumn].join(' ');
}

function resizeColumn() {
    if (props.tableElement) {
        tableHeight.value = props.tableElement.offsetHeight;
    }

    if (activeIndex.value !== null) {
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
    }
}

function removeListeners() {
    window.removeEventListener('mousemove', mouseMove);
    window.removeEventListener('mouseup', mouseUp);
}

onMounted(resizeColumn);

onUpdated(resizeColumn);

const resizeHandleStyle = computed(() => ({ height: typeof tableHeight.value === 'number' ?
    `${tableHeight.value}px` : tableHeight.value }));

</script>
<template>
    <thead class="contents">
        <tr class="contents">
            <th class="results-header index"></th>
            <ResultsHeaderCell
                v-for="(column, index) in columnProps"
                :key="column.def.name"
                :element="column.ref"
                :activeIndex="activeIndex"
                :column="column.def"
                :index="index"
                :mouseDown="mouseDown"
                :resizeHandleStyle="resizeHandleStyle"
                @sort="emit('sort', $event)"
            />
            <th class="results-header filler"></th>
        </tr>
    </thead>
</template>

<style scoped>
.results-header {
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    position: sticky;
    top: 0;
}

.results-header.index {
    border-right: 1px solid var(--vscode-editorWidget-border);
    left: 0;
    z-index: 3;
}

.results-header.filler {
    border-left: 1px solid var(--vscode-editorWidget-border);
    padding: 0;
    z-index: 2;
}
</style>
