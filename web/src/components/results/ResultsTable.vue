<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Result } from 'odbc';
import ResultsHeader from './ResultsHeader.vue';
import ResultsBody from './ResultsBody.vue';
const emit = defineEmits<{
    sortColumn: [{ column: Column, index: number }]
}>();

/** Base ODBC column metadata (no sort until `buildQueryResult` adds `sort`). */
const columnsMeta = [
    { name: 'PersonId', dataType: 4, dataTypeName: 'SQL_INTEGER', columnSize: 10, decimalDigits: 0, nullable: true },
    { name: 'FirstName', dataType: 12, dataTypeName: 'SQL_VARCHAR', columnSize: 255, decimalDigits: 0, nullable: true },
    { name: 'LastName', dataType: 12, dataTypeName: 'SQL_VARCHAR', columnSize: 255, decimalDigits: 0, nullable: true }
];

type SortDirection = 'asc' | 'desc' | null;
type Column = (typeof columnsMeta)[number] & { sort: SortDirection };
type Row = (typeof tableContent)[number];

/** ODBC `Result` extends `Array`; mock it with a real array plus metadata so `v-for` and typings match. */
const tableContent = [
    { PersonId: 1, FirstName: 'Luthen', LastName: 'Rael' },
    { PersonId: 2, FirstName: 'Cassian', LastName: 'Andor' },
    { PersonId: 3, FirstName: 'Leia', LastName: 'Organa' },
    { PersonId: 4, FirstName: 'Han', LastName: 'Solo' },
    { PersonId: 5, FirstName: 'Luke', LastName: 'Skywalker' },
    { PersonId: 6, FirstName: 'Ben', LastName: 'Solo' },
    { PersonId: 7, FirstName: 'Boba', LastName: 'Fett' },
    { PersonId: 8, FirstName: 'Jabba', LastName: 'Hutt' },
    { PersonId: 9, FirstName: 'Darth', LastName: 'Vader' },
    { PersonId: 10, FirstName: 'This is an extremely long first name that should be truncated by ellipsis in the table cell. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ', LastName: 'Palpatine' },
    { PersonId: 11, FirstName: 'Yoda', LastName: '' },
    { PersonId: 12, FirstName: 'Obi-Wan', LastName: 'Kenobi' },
    { PersonId: 13, FirstName: 'Anakin', LastName: 'Skywalker' },
    { PersonId: 14, FirstName: 'Padme', LastName: 'Amidala' },
    { PersonId: 15, FirstName: 'Mace', LastName: 'Windu' },
    { PersonId: 16, FirstName: 'Qui-Gon', LastName: 'Jinn' },
    { PersonId: 17, FirstName: 'Jango', LastName: 'Fett' },
    { PersonId: 18, FirstName: 'Bane', LastName: '' },
    { PersonId: 19, FirstName: 'Darth', LastName: 'Sidious' },
    { PersonId: 20, FirstName: 'Kylo', LastName: 'Ren' },
    { PersonId: 21, FirstName: 'Rey', LastName: 'Skywalker' },
    { PersonId: 22, FirstName: 'Bix', LastName: 'Caleen' },
    { PersonId: 23, FirstName: 'Ahsoka', LastName: 'Tano' },
    { PersonId: 24, FirstName: 'Maarva', LastName: 'Andor' },
    { PersonId: 25, FirstName: 'Mon', LastName: 'Mothma' },
    { PersonId: 26, FirstName: 'Syril', LastName: 'Karn' },
    { PersonId: 27, FirstName: 'Saw', LastName: 'Gerrera' },
    { PersonId: 28, FirstName: 'Ezra', LastName: 'Bridger' },
    { PersonId: 29, FirstName: 'Sabine', LastName: 'Wren' },
    { PersonId: 30, FirstName: 'Orson', LastName: 'Krennic' },
    { PersonId: 31, FirstName: 'Galen', LastName: 'Erso' },
    { PersonId: 32, FirstName: 'Dedra', LastName: 'Meero' }
];

function buildQueryResult(rows: Row[]): Result<Row> {
    const arr = rows.slice();
    const columns: Column[] = columnsMeta.map((c) => ({ ...c, sort: null }));
    return Object.assign(arr, {
        columns,
        count: arr.length,
        parameters: [] as (number | string)[],
        statement: 'select * from persons;',
        return: 0
    }) as Result<Row>;
}

const table = ref(buildQueryResult([...tableContent]));
// TODO remove this

const columnsForHeader = computed(() => table.value.columns as Column[]);

const tableElement = ref<HTMLTableElement>();

const defaultColumnWidth = 150;
const indexColumn = '50px';
const fillerColumn = 'minmax(0, 1fr)';
const tableStyle = {
    gridTemplateColumns: [indexColumn, ...columnsMeta.map(() => `${defaultColumnWidth}px`), fillerColumn].join(' ')
};

const sortState = ref<{ column: string | null; direction: SortDirection }>({
    column: null,
    direction: 'asc'
});

function compare(a: String | Number, b: String | Number, dataType: number): number {
    if (dataType === 4) {
        return Number(a) - Number(b);
    }
    return String(a ?? '').localeCompare(String(b ?? ''));
}

function onSortColumn(sort: { column: Column; index: number }) {
    if (sortState.value.column === sort.column.name) {
        sortState.value = {
            column: sort.column.name,
            direction: sortState.value.direction === 'asc' ? 'desc' :
                (sortState.value.direction === 'desc' ? null : 'asc')
        };
    }
    else {
        sortState.value = { column: sort.column.name, direction: 'asc' };
    }
    const direction = sortState.value.direction === 'asc' ? 1 : -1;
    const dataType = sort.column.dataType;
    table.value.sort((rowA, rowB) => direction *
        compare(rowA[sort.column.name as keyof Row], rowB[sort.column.name as keyof Row], dataType));
    for (const column of table.value.columns as Column[]) {
        column.sort = sortState.value.column !== null &&
            column.name === sortState.value.column ? sortState.value.direction : null;
    }

    const columnAfter = table.value.columns[sort.index] as Column;
    emit('sortColumn', { column: columnAfter, index: sort.index });
}

</script>

<template>
    <table
        class="grid min-w-full w-full"
        @dragstart.prevent
        ref="tableElement"
        :style="tableStyle"
    >
        <ResultsHeader :columns="columnsForHeader" :table-element="tableElement" @sort="onSortColumn" />
        <ResultsBody :queryResult="table" />
    </table>
</template>

<style>
td span {
    font: 14px Consolas, "Courier New", monospace;
}

th span {
    font: 700 14px Consolas, "Courier New", monospace;
}
</style>