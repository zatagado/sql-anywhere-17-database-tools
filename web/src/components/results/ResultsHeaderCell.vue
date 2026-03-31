<script setup lang="ts">
import type { CSSProperties, VNodeRef } from 'vue';

const props = defineProps<{
    element: VNodeRef | undefined,
    activeIndex: number | null,
    column: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean,
        sort: 'asc' | 'desc' | null,
    }
    index: number,
    mouseDown: (index: number) => void,
    resizeHandleStyle: CSSProperties
}>();

const emit = defineEmits<{
    sort: [{ column: typeof props.column, index: number }]
}>();

function onSortClick() {
    emit('sort', { column: props.column, index: props.index });
}
</script>

<template>
    <th :ref="element">
        <button type="button" @click="onSortClick">
            <span class="header-label">
                {{ column.name }}
            </span>
            <Transition name="sort-chevron">
                <span
                    v-if="column.sort !== null"
                    class="sort-chevron"
                    :class="{ desc: column.sort === 'desc' }"
                />
            </Transition>
        </button>
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
    position: sticky;
    text-align: left;
    top: 0;
    z-index: 2;
}

button {
    align-items: center;
    display: flex;
    gap: 4px;
    height: 100%;
    margin-left: auto;
    margin-right: auto;
    min-width: 0;
    text-align: left;
    width: calc(100% - 10px);
}

button:focus {
    outline: none;
}

.header-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    padding: 8px 0 8px 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sort-chevron-enter-from,
.sort-chevron-leave-to {
    opacity: 0;
}

.sort-chevron {
    background-color: currentColor;
    flex-shrink: 0;
    height: 17px;
    margin: 0 10px;
    mask-image: url('../../../resources/carat.svg');
    mask-position: center;
    mask-repeat: no-repeat;
    mask-size: contain;
    transition: opacity 0.1s ease-out, transform 0.1s ease;
    width: 17px;
}

.sort-chevron.desc {
    transform: rotate(180deg);
}

.resize-handle {
    border-right: 2px solid transparent;
    cursor: col-resize;
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
