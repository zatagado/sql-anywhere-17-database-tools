<script setup lang="ts">
import VirtualTableDummyBodyRow from './VirtualTableDummyBodyRow.vue';
import VirtualTableBodyRow from './VirtualTableBodyRow.vue';
import VirtualTablePaddingBodyRow from './VirtualTablePaddingBodyRow.vue';
import type { Result } from 'odbc';
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
const props = defineProps<{
    data: Result<unknown>
    virtualTableParamaters: {
        scrollTop: number,
        innerHeight: number,
        headerHeight: number,
        sortState: { columnIndex: number | null; direction: 'asc' | 'desc' | null }
    }
}>();

const paddingRows = 10;
const rowHeight = ref(0);
const rowHeightReady = ref(false);

const virtualRows = ref<unknown[]>([]);
const virtualTopRowHeight = ref(0);
const virtualBottomRowHeight = ref(0);
const startRowIndex = ref(0);

function updateVirtualRows() {
    const scrollTopPadded = props.virtualTableParamaters.scrollTop - (rowHeight.value * paddingRows);
    const scrollTopBounded = Math.max(0, scrollTopPadded);
    const scrollBottom = props.virtualTableParamaters.scrollTop + props.virtualTableParamaters.innerHeight
        - props.virtualTableParamaters.headerHeight;
    const scrollBottomPadded = scrollBottom + (rowHeight.value * paddingRows);
    const scrollBottomBounded = Math.min(scrollBottomPadded, props.data.length * rowHeight.value);
    const startRow = Math.floor(scrollTopBounded / rowHeight.value);
    const endRow = Math.ceil(scrollBottomBounded / rowHeight.value);

    virtualRows.value = props.data.slice(startRow, endRow);
    virtualTopRowHeight.value = rowHeight.value * startRow;
    virtualBottomRowHeight.value = rowHeight.value * (props.data.length - endRow);
    startRowIndex.value = startRow;
}

watch(
    [() => props.virtualTableParamaters, rowHeight],
    updateVirtualRows,
    { deep: true }
);

const body = useTemplateRef<HTMLTableSectionElement>('body');
let resizeObserver: ResizeObserver;

async function measureProbeRow() {
    await nextTick();
    function setRowHeight() {
        const height = (body.value?.querySelector('tr.dummy-body-row td') as HTMLElement).getBoundingClientRect().height;
        if (height > 0) {
            rowHeight.value = height;
            rowHeightReady.value = true;
            resizeObserver?.disconnect();
            return true;
        }
        return false;
    }

    if (!setRowHeight()) {
        resizeObserver = new ResizeObserver(setRowHeight)
        resizeObserver.observe(body.value?.querySelector('tr.dummy-body-row td') as HTMLElement);
    }
}

onMounted(() => {
    if (props.data.length === 0) {
        rowHeightReady.value = true;
        return;
    }
    measureProbeRow();
});

onUnmounted(() => {
    resizeObserver?.disconnect();
});
</script>
<template>
    <tbody ref="body" class="contents">
        <VirtualTableDummyBodyRow
            v-if="rowHeight === 0 && data.length > 0"
            :columns="data.columns"
        />
        <template v-if="rowHeight > 0">
            <VirtualTablePaddingBodyRow :columns="data.columns" :height="virtualTopRowHeight"/>
            <!-- @vue-ignore -->
            <VirtualTableBodyRow v-for="(row, index) in virtualRows"
                :key="index + startRowIndex"
                :rowIndex="index + startRowIndex"
                :columns="data.columns"
                :row="row"
            />
            <VirtualTablePaddingBodyRow :columns="data.columns" :height="virtualBottomRowHeight"/>
        </template>
    </tbody>
</template>
