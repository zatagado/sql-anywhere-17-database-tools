<script setup lang="ts">
import DummyBodyRow from './DummyBodyRow.vue';
import ResultsBodyRow from './ResultsBodyRow.vue';
import VirtualBodyRow from './VirtualBodyRow.vue';
import type { Result } from 'odbc';
import { nextTick, onMounted, ref, watch } from 'vue';
const props = defineProps<{
    queryResult: Result<unknown>
    virtualTableParamaters: {
        scrollTop: number,
        innerHeight: number,
        headerHeight: number
    }
}>();

const paddingRows = 10;
const rowHeight = ref(0);
const rowHeightReady = ref(false);

const virtualRows = ref<unknown[]>([]);
const virtualTopRowHeight = ref(0);
const virtualBottomRowHeight = ref(0);
const startRowIndex = ref(0);
watch(
    [() => props.virtualTableParamaters, rowHeight],
    () => {
        const scrollTopPadded = props.virtualTableParamaters.scrollTop - (rowHeight.value * paddingRows);
        const scrollTopBounded = Math.max(0, scrollTopPadded);
        const scrollBottom = props.virtualTableParamaters.scrollTop + props.virtualTableParamaters.innerHeight
            - props.virtualTableParamaters.headerHeight;
        const scrollBottomPadded = scrollBottom + (rowHeight.value * paddingRows);
        const scrollBottomBounded = Math.min(scrollBottomPadded, props.queryResult.length * rowHeight.value);
        const startRow = Math.floor(scrollTopBounded / rowHeight.value);
        const endRow = Math.ceil(scrollBottomBounded / rowHeight.value);

        virtualRows.value = props.queryResult.slice(startRow, endRow);
        virtualTopRowHeight.value = rowHeight.value * startRow;
        virtualBottomRowHeight.value = rowHeight.value * (props.queryResult.length - endRow);
        startRowIndex.value = startRow;
    },
    { deep: true }
);

async function measureProbeRow() {
    await nextTick();
    document.querySelector('tbody tr.dummy-body-row')?.querySelectorAll('td').forEach((td) => {
        rowHeight.value = (td as HTMLElement).getBoundingClientRect().height;
    });
    rowHeightReady.value = true;
}

onMounted(() => {
    if (props.queryResult.length === 0) {
        rowHeightReady.value = true;
        return;
    }
    measureProbeRow();
});
</script>
<template>
    <tbody class="contents">
        <DummyBodyRow
            v-if="rowHeight === 0 && queryResult.length > 0"
            :columns="queryResult.columns"
        />
        <template v-if="rowHeight > 0">
            <VirtualBodyRow :columns="queryResult.columns" :height="virtualTopRowHeight"/>
            <!-- @vue-ignore -->
            <ResultsBodyRow v-for="(row, index) in virtualRows"
                :key="index + startRowIndex"
                :rowIndex="index + startRowIndex"
                :columns="queryResult!.columns"
                :row="row"
            />
            <VirtualBodyRow :columns="queryResult.columns" :height="virtualBottomRowHeight"/>
        </template>
    </tbody>
</template>
