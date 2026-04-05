<script setup lang="ts">
import ResultsBodyRow from './ResultsBodyRow.vue';
import VirtualBodyRow from './VirtualBodyRow.vue';
import type { Result } from 'odbc';
import { computed, onMounted, ref } from 'vue';
const props = defineProps<{
    queryResult: Result<unknown>
    virtualTableParamaters: {
        scrollTop: number,
        innerHeight: number,
        headerHeight: number
    }
}>();
// could change to render rows based on scroll speed
const rowHeight = ref(0);
const visibleTableHeight = computed(() => props.virtualTableParamaters.innerHeight -
    props.virtualTableParamaters.headerHeight);
const scrollTop = computed(() => Math.min(props.virtualTableParamaters.scrollTop,
    Math.max(0, (rowHeight.value * props.queryResult.length) - visibleTableHeight.value)));
const startRowIndex = computed(() => Math.floor(scrollTop.value / rowHeight.value));
const endRowIndex = computed(() => Math.ceil((scrollTop.value + visibleTableHeight.value) /
    rowHeight.value));
const virtualTopRowHeight = computed(() => rowHeight.value * startRowIndex.value);
const virtualBottomRowHeight = computed(() => rowHeight.value * (props.queryResult.length - endRowIndex.value));
const virtualRows = computed(() => props.queryResult.slice(startRowIndex.value, endRowIndex.value));
onMounted(() => {
    rowHeight.value = (document.querySelector('tbody')!.children[1]!.firstChild as HTMLElement)
        .getBoundingClientRect().height;
});
</script>
<template>
    <tbody class="contents">
        <VirtualBodyRow :columns="queryResult.columns" :height="virtualTopRowHeight"/>
        <!-- @vue-ignore -->
        <ResultsBodyRow v-for="(row, index) in virtualRows"
            :key="index + startRowIndex"
            :rowIndex="index + startRowIndex"
            :columns="queryResult!.columns"
            :row="row"
        />
        <VirtualBodyRow :columns="queryResult.columns" :height="virtualBottomRowHeight"/>
    </tbody>
</template>
