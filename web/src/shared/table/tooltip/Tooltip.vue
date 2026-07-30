<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, watch, toValue, type MaybeRefOrGetter } from 'vue';

const props = defineProps<{
    text: string;
    hoverElement: MaybeRefOrGetter<HTMLElement | null | undefined>;
}>();

const visible = ref(false);
const position = ref({ x: 0, y: 0 });

const TOOLTIP_Z_INDEX = '5';
const SHOW_DELAY_MS = 1000;
const TOOLTIP_OFFSET = 12;

watch(() => toValue(props.hoverElement), (element, _, onCleanup) => {
    if (!element) {
        return;
    }

    const stackParent = element.parentElement;
    let showTimer: ReturnType<typeof setTimeout> | undefined;

    const clearShowTimer = () => {
        if (showTimer !== undefined) {
            clearTimeout(showTimer);
            showTimer = undefined;
        }
    };

    const updatePosition = (event: MouseEvent) => {
        position.value = { x: event.clientX, y: event.clientY };
    };

    const startShowTimer = () => {
        clearShowTimer();
        showTimer = setTimeout(() => {
            showTimer = undefined;
            visible.value = true;
        }, SHOW_DELAY_MS);
    };

    const onEnter = (event: MouseEvent) => {
        updatePosition(event);
        if (stackParent) {
            stackParent.style.zIndex = TOOLTIP_Z_INDEX;
        }
        startShowTimer();
    };

    const onLeave = () => {
        clearShowTimer();
        if (stackParent) {
            stackParent.style.zIndex = '';
        }
        visible.value = false;
    };

    const onMouseMove = (event: MouseEvent) => {
        if (!visible.value) {
            updatePosition(event);
            startShowTimer();
        }
    };

    element.addEventListener('mouseenter', onEnter);
    element.addEventListener('mouseleave', onLeave);
    element.addEventListener('mousemove', onMouseMove);

    onCleanup(() => {
        clearShowTimer();
        element.removeEventListener('mouseenter', onEnter);
        element.removeEventListener('mouseleave', onLeave);
        element.removeEventListener('mousemove', onMouseMove);
        if (stackParent) {
            stackParent.style.zIndex = '';
        }
        visible.value = false;
    });
}, { immediate: true });
</script>

<template>
    <span
        class="results-tooltip"
        :class="{ visible }"
        :style="{
            left: `${position.x + TOOLTIP_OFFSET}px`,
            top: `${position.y + TOOLTIP_OFFSET}px`,
        }"
    >{{ text }}</span>
</template>

<style scoped>
.results-tooltip {
    background-color: var(--vscode-editorHoverWidget-background, #252526);
    border: 1px solid var(--vscode-editorHoverWidget-border, #454545);
    border-radius: 4px;
    color: var(--vscode-editorHoverWidget-foreground, #ccc);
    padding: 4px 8px;
    pointer-events: none;
    position: fixed;
    visibility: hidden;
    white-space: nowrap;
    z-index: 10;
}

.results-tooltip.visible {
    visibility: visible;
}
</style>
