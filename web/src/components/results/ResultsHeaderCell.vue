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
        <span>
            {{ column.name }}
        </span>
        <div
            class="resize-handle"
            :class="{ active: activeIndex === index }"
            @mousedown="mouseDown(index)"
            :style="resizeHandleStyle"
        />
    </th>
</template>

<style scoped>
th {
    text-align: left;
    padding: 16px 20px;
    min-width: 100px;
}

th span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.resize-handle {
    border-right: 2px solid transparent;
    cursor: col-resize;
    display: block;
    position: absolute;
    right: 0;
    top: 0;
    user-select: none;
    width: 7px;
    z-index: 1;
}

/* Disable hover when mouse is down */
.resize-handle:hover {
    border-color: #ccc;
}

.resize-handle.active {
    border-color: #517ea5;
}
</style>
