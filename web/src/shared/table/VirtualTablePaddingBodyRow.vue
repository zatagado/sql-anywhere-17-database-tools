<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
    columns: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean,
    }[]
    height: number
}>()

const paddingRowStyle = computed(() => ({ height: props.height ? `${props.height}px` : 'auto' }));
</script>
<template>
    <tr class="contents">
        <td class="padding-row-index-cell" :style="paddingRowStyle"></td>
        <td v-for="(_column, columnIndex) in columns" :key="columnIndex"></td>
        <td></td>
    </tr>
</template>
<style scoped>
td {
    padding: 0;
}

.padding-row-index-cell {
    box-sizing: border-box;
}
</style>