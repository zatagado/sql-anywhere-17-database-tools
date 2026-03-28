<script setup lang="ts">
import { onUpdated, ref } from 'vue';
import type { Result } from 'odbc';

const minCellWidth = 100;

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

const table = Object.assign(tableContent, {
    columns: [
        { name: 'Items', dataType: 4, dataTypeName: 'SQL_INTEGER', columnSize: 10, decimalDigits: 0, nullable: true },
        { name: 'Order #', dataType: 12, dataTypeName: 'SQL_VARCHAR', columnSize: 255, decimalDigits: 0, nullable: true },
        { name: 'Amount', dataType: 12, dataTypeName: 'SQL_VARCHAR', columnSize: 255, decimalDigits: 0, nullable: true },
        { name: 'Status', dataType: 4, dataTypeName: 'SQL_INTEGER', columnSize: 10, decimalDigits: 0, nullable: true },
        { name: 'Delivery Driver', dataType: 12, dataTypeName: 'SQL_VARCHAR', columnSize: 255, decimalDigits: 0, nullable: true }
    ],
    count: 2,
    parameters: [] as (number | string)[],
    statement: 'select * from persons;',
    return: 0,
}) as Result<(typeof tableContent)[number]>;

function createHeaders(headers: { name: string, dataType: number, dataTypeName: string, columnSize: number, decimalDigits: number, nullable: boolean }[]) {
    return headers.map((item) => ({
        text: item.name,
        ref: ref()
    }));
}

const tableHeight = ref<number | 'auto'>('auto');
const activeIndex = ref<number | null>(null);
const tableElement = ref<HTMLTableElement>();
const columns = createHeaders(table.columns);

function mouseDown(index: number) {
    activeIndex.value = index;
}

function mouseMove(e: MouseEvent) {
    const gridColumns = columns.map((column, index) => {
        if (index === activeIndex.value) {
            const width = e.clientX - column.ref.value.offsetLeft;

            if (width >= minCellWidth) {
                return `${width}px`;
            }
        }
        return `${column.ref.value.offsetWidth}px`;
    });

    tableElement.value!.style.gridTemplateColumns = gridColumns.join(' ');
}

function removeListeners() {
    window.removeEventListener('mousemove', mouseMove);
    window.removeEventListener('mouseup', removeListeners);
}

function mouseUp() {
    activeIndex.value = null;
    removeListeners();
}

onUpdated(() => {
    tableHeight.value = tableElement.value!.offsetHeight;

    if (activeIndex.value !== null) {
        window.addEventListener('mousemove', mouseMove);
        window.addEventListener('mouseup', mouseUp);
    }

    return () => {
        removeListeners();
    }
});

</script>

<template>
    <div class="container">
        <div class="table-wrapper">
            <table class="resizeable-table" ref="tableElement">
                <thead>
                    <tr>
                        <th v-for="(column, index) in columns" :key="column.text" :ref="column.ref">
                            <span>{{ column.text }}</span>
                            <div
                                :style="{ height: tableHeight }"
                                @mousedown="() => mouseDown(index)"
                                class="resize-handle"
                                :class="{ active: activeIndex === index ? 'active' : 'idle' }"
                            />
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                        <span>Large Detroit Style Pizza</span>
                        </td>
                        <td>
                        <span>3213456785</span>
                        </td>
                        <td>
                        <span>$31.43</span>
                        </td>
                        <td>
                        <span>Pending</span>
                        </td>
                        <td>
                        <span>Dave</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                        <span>
                            Double Decker Club With Fries. Pickles, extra side avacado
                        </span>
                        </td>
                        <td>
                        <span>9874563245</span>
                        </td>
                        <td>
                        <span>$12.99</span>
                        </td>
                        <td>
                        <span>Delivered</span>
                        </td>
                        <td>
                        <span>Cathy</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                        <span>Family Sized Lobster Dinner</span>
                        </td>
                        <td>
                        <span>3456781234</span>
                        </td>
                        <td>
                        <span>$320.00</span>
                        </td>
                        <td>
                        <span>In Progress</span>
                        </td>
                        <td>
                        <span>Alexander</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped></style>
