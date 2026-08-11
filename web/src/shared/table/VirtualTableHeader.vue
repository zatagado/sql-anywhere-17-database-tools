<script setup lang="ts">
import { computed, onMounted, onUnmounted, onUpdated, ref, useTemplateRef } from 'vue';
import VirtualTableHeaderCell from './VirtualTableHeaderCell.vue';
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
    innerHeight: number
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

const head = useTemplateRef<HTMLTableSectionElement>('head');
let resizeObserver: ResizeObserver;

function measureHeader() {
    function setHeaderHeight() {
        const height = (head.value?.querySelector('th') as HTMLElement).getBoundingClientRect().height;
        if (height > 0) {
            headerHeight.value = height;
            resizeObserver?.disconnect();
            return true;
        }
        return false;
    }

    if (!setHeaderHeight()) {
        resizeObserver = new ResizeObserver(setHeaderHeight);
        resizeObserver.observe(head.value?.querySelector('th') as HTMLElement);
    }
}

onMounted(() => {
    measureHeader();
});

onUnmounted(() => {
    resizeObserver?.disconnect();
});

onUpdated(resizeColumn);

const resizeHandleStyle = computed(() => ({ height: `${headerHeight.value}px` }));

</script>
<template>
    <thead ref="head" class="contents">
        <tr class="contents">
            <th class="header index"></th>
            <VirtualTableHeaderCell
                v-for="(column, index) in columnProps"
                :key="index"
                :element="column.ref"
                :activeIndex="activeIndex"
                :column="column.def"
                :index="index"
                :mouseDown="mouseDown"
                :resizeHandleStyle="resizeHandleStyle"
                @sort="emit('sort', $event)"
            />
            <th class="header filler"></th>
        </tr>
    </thead>
</template>

<style scoped>
.header {
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    position: sticky;
    top: 0;
}

.header.index {
    border-right: 1px solid var(--vscode-panel-border);
    box-sizing: border-box;
    left: 0;
    padding: 8px 10px 8px 10px;
    width: 100%;
    z-index: 4;
}

.header.filler {
    border-left: 1px solid var(--vscode-panel-border);
    padding: 0;
    z-index: 2;
}
</style>
