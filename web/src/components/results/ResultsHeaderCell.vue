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
    <th :ref="element">
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
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    border-left: 1px solid var(--vscode-editorWidget-border);
    min-width: 100px;
    padding: 8px 20px 8px 20px;
    position: sticky;
    text-align: left;
    top: 0;
    z-index: 2;
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

.resize-handle.active {
    border-color: var(--vscode-inputOption-activeBackground);
}
</style>
