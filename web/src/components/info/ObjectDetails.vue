<script setup lang="ts">
import { ref } from 'vue';
import type { ColumnDefinition } from 'odbc';
import TabSet from '../../shared/tabs/TabSet.vue';
import type { TabType } from '../../shared/tabs/TabSet.vue';
import VirtualTable from '@/shared/table/VirtualTable.vue';
import LoadingSpinner from '../../shared/loading/LoadingSpinner.vue';
import type { QueryResult, QueryResultDetails } from '../../utils.ts';
import { handleMessageType } from '../../utils.ts';

function applyColumnLabels(columns: unknown, labels: string[]): unknown {
    return (columns as ColumnDefinition[]).map((column, index) => ({
        ...column,
        name: labels[index] ?? column.name
    }));
}

const columnsLoading = ref(true);
const constraintsLoading = ref(true);
const referencingConstraintsLoading = ref(true);
const privilegesLoading = ref(true);

const columnsError = ref<string>();
const constraintsError = ref<string>();
const referencingConstraintsError = ref<string>();
const privilegesError = ref<string>();

const columnsDetails = ref<QueryResultDetails>();
const constraintsDetails = ref<QueryResultDetails>();
const referencingConstraintsDetails = ref<QueryResultDetails>();
const privilegesDetails = ref<QueryResultDetails>();

const columnsRows = ref<unknown[]>();
const constraintsRows = ref<unknown[]>();
const referencingConstraintsRows = ref<unknown[]>();
const privilegesRows = ref<unknown[]>();

const columnsRowsCount = ref<number>(0);
const constraintsRowsCount = ref<number>(0);
const referencingConstraintsRowsCount = ref<number>(0);
const privilegesRowsCount = ref<number>(0);

const columnsData = ref<QueryResult>();
const constraintsData = ref<QueryResult>();
const referencingConstraintsData = ref<QueryResult>();
const privilegesData = ref<QueryResult>();
const tabs = ref<TabType[]>([]);

window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'onResultType') {
        switch (message.databaseObjectType) {
            case 'Tables':
                tabs.value = [
                    { id: 'columns', name: 'Columns' },
                    { id: 'constraints', name: 'Constraints' },
                    { id: 'referencing-constraints', name: 'Referencing Constraints' },
                    { id: 'privileges', name: 'Privileges' }
                ];
                break;
            case 'Views':
                tabs.value = [
                    { id: 'columns', name: 'Columns' },
                    { id: 'privileges', name: 'Privileges' }
                ];
                break;
            case 'Procedures':
                tabs.value = [
                    { id: 'privileges', name: 'Privileges' }
                ];
                break;
            default:
                tabs.value = [];
                break;
        }
        return;
    }

    let tabLoading;
    let tabError;
    let tabDetails;
    let tabRows;
    let tabRowsCount;
    let tabData;

    switch (message.tab) {
        case 'columns': {
            switch (message.databaseObjectType) {
                case 'Tables':
                    message.columns = applyColumnLabels(message.columns, ['Primary Key', 'Name', 'Data Type', 'Size', 'Scale', 'Null', 'Default']);
                    break;
                case 'Views':
                    message.columns = applyColumnLabels(message.columns, ['Name', 'Data Type', 'Allows Null']);
                    break;
            }

            tabLoading = columnsLoading;
            tabError = columnsError;
            tabDetails = columnsDetails;
            tabRows = columnsRows;
            tabRowsCount = columnsRowsCount;
            tabData = columnsData;
            break;
        }
        case 'constraints': {
            switch (message.databaseObjectType) {
                case 'Tables':
                    message.columns = applyColumnLabels(message.columns, ['Name', 'Constraint Type', 'Unique', 'Columns']);
                    break;
            }

            tabLoading = constraintsLoading;
            tabError = constraintsError;
            tabDetails = constraintsDetails;
            tabRows = constraintsRows;
            tabRowsCount = constraintsRowsCount;
            tabData = constraintsData;
            break;
        }
        case 'referencingConstraints': {
            switch (message.databaseObjectType) {
                case 'Tables':
                    message.columns = applyColumnLabels(
                        message.columns,
                        ['Name', 'Table Owner', 'Table', 'Unique', 'Columns']
                    );
                    break;
            }

            tabLoading = referencingConstraintsLoading;
            tabError = referencingConstraintsError;
            tabDetails = referencingConstraintsDetails;
            tabRows = referencingConstraintsRows;
            tabRowsCount = referencingConstraintsRowsCount;
            tabData = referencingConstraintsData;
            break;
        }
        case 'privileges': {
            switch (message.databaseObjectType) {
                case 'Tables':
                    message.columns = applyColumnLabels(message.columns, ['Grantee', 'Grantor', 'Select', 'Insert', 'Delete', 'Update', 'Alter', 'Reference']);
                    break;
                case 'Views':
                    message.columns = applyColumnLabels(message.columns, ['Grantee', 'Grantor', 'Select', 'Insert', 'Delete', 'Update']);
                    break;
                case 'Procedures':
                    message.columns = applyColumnLabels(message.columns, ['Grantee', 'Execute']);
                    break;
            }

            tabLoading = privilegesLoading;
            tabError = privilegesError;
            tabDetails = privilegesDetails;
            tabRows = privilegesRows;
            tabRowsCount = privilegesRowsCount;
            tabData = privilegesData;
            break;
        }
        default: {
            return;
        }
    }

    handleMessageType(
        message,
        tabLoading,
        tabError,
        tabDetails,
        tabRows,
        tabRowsCount,
        tabData
    );
});
</script>

<template>
    <TabSet :tabs="tabs">
        <template #columns>
            <div class="tab-content">
                <LoadingSpinner v-if="columnsLoading" />
                <div v-else-if="columnsError" class="error-msg">{{ columnsError }}</div>
                <VirtualTable v-else-if="columnsData" class="tab-content-table" :data="columnsData" :enable-tooltip="false" />
                <div v-else class="empty-msg">No columns data available</div>
            </div>
        </template>
        <template #constraints>
            <div class="tab-content">
                <LoadingSpinner v-if="constraintsLoading" />
                <div v-else-if="constraintsError" class="error-msg">{{ constraintsError }}</div>
                <VirtualTable v-else-if="constraintsData" class="tab-content-table" :data="constraintsData" :enable-tooltip="false" />
                <div v-else class="empty-msg">No constraints data available</div>
            </div>
        </template>
        <template #referencing-constraints>
            <div class="tab-content">
                <LoadingSpinner v-if="referencingConstraintsLoading" />
                <div v-else-if="referencingConstraintsError" class="error-msg">{{ referencingConstraintsError }}</div>
                <VirtualTable
                    v-else-if="referencingConstraintsData"
                    class="tab-content-table"
                    :data="referencingConstraintsData"
                    :enable-tooltip="false"
                />
                <div v-else class="empty-msg">No referencing constraints data available</div>
            </div>
        </template>
        <template #privileges>
            <div class="tab-content">
                <LoadingSpinner v-if="privilegesLoading" />
                <div v-else-if="privilegesError" class="error-msg">{{ privilegesError }}</div>
                <VirtualTable v-else-if="privilegesData" class="tab-content-table" :data="privilegesData" :enable-tooltip="false" />
                <div v-else class="empty-msg">No privileges data available</div>
            </div>
        </template>
    </TabSet>
</template>

<style scoped>

.tab-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.tab-content-table {
    flex: 1 1 auto;
    min-height: 0;
}

.empty-msg, .error-msg {
    padding: 1rem;
    font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size);
}

.empty-msg {
    color: var(--vscode-foreground);
}

.error-msg {
    color: var(--vscode-errorForeground);
    white-space: pre-wrap;
}
</style>
