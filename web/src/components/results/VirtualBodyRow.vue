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

const virtualRowStyle = computed(() => ({ height: props.height ? `${props.height}px` : 'auto' }));
</script>
<template>
    <tr class="contents">
        <td class="virtual-index-cell" :style="virtualRowStyle"></td>
        <td v-for="column in columns" :key="column.name"></td>
        <td></td>
    </tr>
</template>
<style scoped>
td {
    padding: 0;
}

.virtual-index-cell {
    box-sizing: border-box;
    min-width: 50px;
}
</style>