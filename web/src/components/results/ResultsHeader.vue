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
    innerHeight: number,
}>();

const headerHeight = defineModel<number>('headerHeight', { default: 0 });
const columnWidths = defineModel<number[]>('columnWidths', { required: true });

const emit = defineEmits<{
    sort: [{ column: Column, index: number }]
}>();

const minCellWidth = 100;
const defaultColumnWidth = 150;
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
    columnWidths.value = columnWidths.value.map((_, index) => {
        const column = columnProps[index]!;
        if (activeIndex.value === index) {
            const width = event.clientX - (column.ref.value?.getBoundingClientRect().left ?? 0);
            if (width >= minCellWidth) {
                return width;
            }
        }
        return column.ref.value?.offsetWidth ?? defaultColumnWidth;
    });
}

function resizeColumn() {
    if (activeIndex.value !== null) {
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
    }
}

function removeListeners() {
    window.removeEventListener('mousemove', mouseMove);
    window.removeEventListener('mouseup', mouseUp);
}

function measureHeader() {
    headerHeight.value = (document.querySelector('thead')!.firstChild!.firstChild as HTMLElement)
        .getBoundingClientRect().height;
}

onMounted(() => {
    measureHeader();
});

onUpdated(resizeColumn);

const resizeHandleStyle = computed(() => ({ height: `${headerHeight.value}px` }));

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
    box-sizing: border-box;
    left: 0;
    padding: 8px 10px 8px 10px;
    width: 100%;
    z-index: 4;
}

.results-header.filler {
    border-left: 1px solid var(--vscode-editorWidget-border);
    padding: 0;
    z-index: 2;
}
</style>
