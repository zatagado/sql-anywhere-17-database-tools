<script setup lang="ts">
import ResultsHeader from './ResultsHeader.vue';
import ResultsBody from './ResultsBody.vue';
defineProps({})

// const header = [
//     'id',
//     'name',
//     'value',
// ]

// const body = [
//     [1, 'John Doe', 100],
//     [2, 'Jane Doe', 200],
//     [3, 'John Doe', 340],
// ]

import type { Result } from 'odbc';

/** ODBC `Result` extends `Array`; mock it with a real array plus metadata so `v-for` and typings match. */
const tableRows = [
    { PersonId: 1, FirstName: 'Zach', LastName: 'Gaydos' },
    { PersonId: 2, FirstName: 'Cassian', LastName: 'Andor' },
];

const table = Object.assign(tableRows, {
    columns: [
        { name: 'PersonId', dataType: 4, dataTypeName: 'SQL_INTEGER', columnSize: 10, decimalDigits: 0, nullable: true },
        { name: 'FirstName', dataType: 12, dataTypeName: 'SQL_VARCHAR', columnSize: 255, decimalDigits: 0, nullable: true },
        { name: 'LastName', dataType: 12, dataTypeName: 'SQL_VARCHAR', columnSize: 255, decimalDigits: 0, nullable: true },
    ],
    count: 2,
    parameters: [] as (number | string)[],
    statement: 'select * from persons;',
    return: 0,
}) as Result<(typeof tableRows)[number]>;
</script>

<template>
    <table class="border border-separate border-gray-300 min-w-full">
        <ResultsHeader :columns="table.columns" />
        <ResultsBody :rows="table" />
    </table>
</template>

<style scoped></style>
