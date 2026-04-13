<script setup lang="ts">
import { ref, watch } from 'vue';
const props = defineProps<{
    column: {
        name: string,
        dataType: number,
        dataTypeName: string,
        columnSize: number,
        decimalDigits: number,
        nullable: boolean,
        sort?: 'asc' | 'desc' | null,
    },
    value: string | number | boolean,
}>()

function getTextClass(dataType: number) {
    switch (dataType) {
        case 4:
        case 5:
            return 'numeric';
        default:
            return 'string';
    }
}
const textClass = getTextClass(props.column.dataType);
const nullClass = ref('');
const formattedValue = ref<string | number | boolean>('');

watch(() => props.value, () => {
    nullClass.value = props.value === null ? 'italic' : '';
    formattedValue.value = props.value ? props.value : '(NULL)';
}, { immediate: true });
</script>

<template>
    <td>
        <span :class="[textClass, nullClass]">{{ formattedValue }}</span>
    </td>
</template>

<style scoped>
td {
    border-left: 1px solid var(--vscode-editorWidget-border);
}

td span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
}

td span.string {
    text-align: left;
    white-space: pre;
}

td span.numeric {
    text-align: right;
    white-space: nowrap;
}

td span.italic {
    font-style: italic;
}
</style>
