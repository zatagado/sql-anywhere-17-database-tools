<script setup lang="ts">
import { ref, watch } from 'vue';

export type TabType = {
    id: string;
    name: string;
};

const props = defineProps<{
    tabs: TabType[];
}>();

const activeTabId = ref(props.tabs[0]?.id);

watch(() => props.tabs, (newVal) => {
    if (!activeTabId.value && newVal.length > 0 && newVal[0] !== undefined) {
        activeTabId.value = newVal[0].id;
    }
});

</script>

<template>
    <div class="tab-links">
        <div style="display: flex; flex-direction: row; margin: 5px;">
            <div
                v-for="tab in props.tabs"
                :key="tab.id"
                class="tab-link"
                :class="{ 'tab-link-active': activeTabId === tab.id }"
                style="min-width: 100px; text-align: center; user-select: none;"
                @click="activeTabId = tab.id"
            >
                {{ tab.name }}
            </div>
        </div>
    </div>
    <div style="width: 100%; flex: 1 1 auto; min-height: 0; position: relative;">
        <div
            v-for="tab in props.tabs"
            v-show="activeTabId === tab.id"
            :id="tab.id"
            :key="tab.id"
            style="width: 100%; height: 100%; position: absolute;"
        >
            <div style="width: 100%; height: 100%;">
                <slot :name="tab.id"></slot>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tab-links {
    display: flex;
    flex-direction: row;
    border-bottom: 1px solid var(--vscode-panel-border);
}

.tab-link {
    padding: 8px;
    cursor: pointer;
}

.tab-link-active {
    background-color: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
    border-radius: 2px;
}
</style>
