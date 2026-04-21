<script setup lang="ts">
import { ref, watch } from 'vue';
import { isNumericSqlDataType } from '../../utils';

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
    value: string | number | boolean | null,
}>()

function getTextClass(dataType: number) {
    return isNumericSqlDataType(dataType) ? 'numeric' : 'string';
}
const textClass = getTextClass(props.column.dataType);
const nullClass = ref('');
const formattedValue = ref<string | number | boolean>('');

watch(() => props.value, () => {
    nullClass.value = props.value == null ? 'italic' : '';
    formattedValue.value = props.value == null ? '(NULL)' : props.value;
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
