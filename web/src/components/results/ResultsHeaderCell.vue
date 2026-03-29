<script setup lang="ts">
import type { CSSProperties, VNodeRef } from 'vue';
defineProps<{
    element: VNodeRef | undefined,
    activeIndex: number | null,
    column: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean
    }
    index: number,
    mouseDown: (index: number) => void,
    resizeHandleStyle: CSSProperties
}>()
</script>

<template>
    <th class="sticky top-0" :ref="element">
        <span>{{ column.name }}</span>
        <div
            class="resize-handle"
            :class="{ active: activeIndex === index }"
            @mousedown="mouseDown(index)"
            :style="resizeHandleStyle"
        />
    </th>
</template>

<!-- <style scoped>
.resize-handle:hover {
    border-color: #ccc;
}

.resize-handle.active {
    border-color: #517ea5;
}
</style> -->
