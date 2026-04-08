<script setup lang="ts">
import DummyBodyRow from './DummyBodyRow.vue';
import ResultsBodyRow from './ResultsBodyRow.vue';
import VirtualBodyRow from './VirtualBodyRow.vue';
import type { Result } from 'odbc';
import { computed, nextTick, onMounted, ref } from 'vue';
const props = defineProps<{
    queryResult: Result<unknown>
    virtualTableParamaters: {
        scrollTop: number,
        innerHeight: number,
        headerHeight: number
    }
}>();

// TODO could consolidate this to make it more efficient, this is just for ease of reading
const rowHeight = ref(0);
const rowHeightReady = ref(false);
const paddingRows = 5;

const scrollTop = computed(() => props.virtualTableParamaters.scrollTop);
const scrollBottom = computed(() => props.virtualTableParamaters.scrollTop + props.virtualTableParamaters.innerHeight -
    props.virtualTableParamaters.headerHeight);

const scrollTopPadded = computed(() => scrollTop.value - (rowHeight.value * paddingRows));
const scrollBottomPadded = computed(() => scrollBottom.value + (rowHeight.value * paddingRows));

const scrollTopBounded = computed(() => Math.max(0, scrollTopPadded.value));
const scrollBottomBounded = computed(() => Math.min(scrollBottomPadded.value, props.queryResult.length * rowHeight.value));

const startRowIndex = computed(() => Math.floor(scrollTopBounded.value / rowHeight.value));
const endRowIndex = computed(() => Math.ceil(scrollBottomBounded.value / rowHeight.value));

const virtualRows = computed(() => props.queryResult.slice(startRowIndex.value, endRowIndex.value));

const virtualTopRowHeight = computed(() => rowHeight.value * startRowIndex.value);
const virtualBottomRowHeight = computed(() => rowHeight.value * (props.queryResult.length - endRowIndex.value));

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
            v-if="!rowHeightReady && queryResult.length > 0"
            :columns="queryResult.columns"
        />
        <template v-if="rowHeightReady">
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
