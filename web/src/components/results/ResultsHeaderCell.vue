<script setup lang="ts">
import type { CSSProperties, Ref } from 'vue';
const props = defineProps<{
    column: {
        text: string,
        ref: Ref<HTMLTableCellElement>
    },
    index: number,
    handleStyle: CSSProperties
}>()

const handleClass = computed(() => ({ active: props.index === props.activeIndex ? 'active' : 'idle' }));
</script>

<template>
    <th :ref="column.ref">

    </th>
</template>

<style scoped></style>
