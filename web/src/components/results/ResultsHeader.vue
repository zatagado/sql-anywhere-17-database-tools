<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue';
import ResultsHeaderCell from './ResultsHeaderCell.vue';
const props = defineProps<{
    columns: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean
    }[],
    tableElement: HTMLTableElement | undefined
}>()

const minCellWidth = 100;
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
            const width = event.clientX - (column.ref.value?.offsetLeft ?? 0);
            if (width >= minCellWidth) {
                return `${width}px`;
            }
        }
        return `${column.ref.value?.offsetWidth ?? 0}px`;
    });

    props.tableElement!.style.gridTemplateColumns = gridColumns.join(' ');
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
    <thead>
        <tr>
            <!-- <th></th> -->
            <ResultsHeaderCell
                v-for="(column, index) in columnProps"
                :key="column.def.name"
                :element="column.ref"
                :activeIndex="activeIndex"
                :column="column.def"
                :index="index"
                :mouseDown="mouseDown"
                :resizeHandleStyle="resizeHandleStyle"
            />
        </tr>
    </thead>
</template>

<style scoped></style>
