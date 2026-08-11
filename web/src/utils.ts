import type { ColumnDefinition, Result } from 'odbc';

export type ResultRow = (string | number | boolean | null)[];

export type QueryResultDetails = {
    columns: ColumnDefinition[];
    count: number;
    statement: string;
    return: number;
    parameters: Array<number | string>;
    nullPlaceholder: string;
    truncated: boolean;
};

export type QueryResult = Result<unknown> & {
    nullPlaceholder: string;
    truncated?: boolean;
};

export type Column = {
    dataType: number;
    dataTypeName: string;
    columnSize: number;
    decimalDigits: number;
    nullable: boolean;
};

export function isNumericSqlDataType(dataType: number): boolean {
    switch (dataType) {
        case 2:  // SQL_NUMERIC
        case 3:  // SQL_DECIMAL
        case 4:  // SQL_INTEGER
        case 5:  // SQL_SMALLINT
        case 6:  // SQL_FLOAT
        case 7:  // SQL_REAL
        case 8:  // SQL_DOUBLE
        case -5: // SQL_BIGINT
        case -6: // SQL_TINYINT
        case -7: // SQL_BIT
            return true;
        default:
            return false;
    }
}

function formatSizedType(typeName: string, columnSize: number): string {
    return `${typeName}(${columnSize})`;
}

function formatPrecisionScaleType(typeName: string, columnSize: number, decimalDigits: number): string {
    return `${typeName}(${columnSize}, ${decimalDigits})`;
}

export function formatSqlDataType(column: Column): string {
    let type: string;

    switch (column.dataType) {
        case -7: // SQL_BIT
            type = 'BIT';
            break;
        case -6: // SQL_TINYINT
            type = 'TINYINT';
            break;
        case -5: // SQL_BIGINT
            type = 'BIGINT';
            break;
        case -1: // SQL_LONGVARCHAR
            type = 'LONG VARCHAR';
            break;
        case 1: // SQL_CHAR
            type = 'CHAR';
            break;
        case 2: // SQL_NUMERIC
            type = formatPrecisionScaleType('NUMERIC', column.columnSize, column.decimalDigits);
            break;
        case 3: // SQL_DECIMAL
            type = formatPrecisionScaleType('DECIMAL', column.columnSize, column.decimalDigits);
            break;
        case 4: // SQL_INTEGER
            type = 'INTEGER';
            break;
        case 5: // SQL_SMALLINT
            type = 'SMALLINT';
            break;
        case 6: // SQL_FLOAT
            type = 'FLOAT';
            break;
        case 7: // SQL_REAL
            type = 'REAL';
            break;
        case 8: // SQL_DOUBLE
            type = 'DOUBLE';
            break;
        case 12: // SQL_VARCHAR
            type = formatSizedType('VARCHAR', column.columnSize);
            break;
        case 91: // SQL_TYPE_DATE
            type = 'DATE';
            break;
        case 92: // SQL_TYPE_TIME
            type = 'TIME';
            break;
        case 93: // SQL_TYPE_TIMESTAMP
            type = 'TIMESTAMP';
            break;
        default:
            type = 'UNKNOWN TYPE';
            break;
    }

    return type;
}

type Message = {
    type: string;
    columns?: unknown;
    count?: number;
    rows?: unknown[];
    startIndex?: number;
    message?: string;
    statement?: string;
    return?: number;
    parameters?: Array<number | string>;
    nullPlaceholder?: string;
    truncated?: boolean;
};

export function handleMessageType(
    message: Message,
    isLoading: { value: boolean },
    error: { value: string | undefined },
    details: { value: QueryResultDetails | undefined },
    rows: { value: unknown[] | undefined },
    rowsCount: { value: number },
    data: { value: QueryResult | undefined }
): void {
    switch (message.type) {
        case 'onLoading': {
            isLoading.value = true;
            error.value = undefined;
            details.value = undefined;
            rows.value = undefined;
            rowsCount.value = 0;
            data.value = undefined;
            break;
        }
        case 'onResultDetails': {
            details.value = {
                columns: message.columns as ColumnDefinition[],
                count: message.count ?? 0,
                statement: message.statement ?? '',
                return: message.return ?? 0,
                parameters: message.parameters ?? [],
                nullPlaceholder: message.nullPlaceholder ?? '(NULL)',
                truncated: message.truncated ?? false
            };
            break;
        }
        case 'onResultRows': {
            if (!rows.value) {
                rows.value = new Array<unknown>(message.count);
            }

            if (message.rows && message.startIndex !== undefined) {
                for (let i = 0; i < message.rows.length; i++) {
                    rows.value[message.startIndex + i] = message.rows[i];
                }
                rowsCount.value += message.rows.length;
            }

            if (rowsCount.value === message.count && details.value) {
                data.value = Object.assign(rows.value, details.value) as QueryResult;
                isLoading.value = false;
                error.value = undefined;
            }
            break;
        }
        case 'onError': {
            isLoading.value = false;
            data.value = undefined;
            error.value = message.message as string;
            break;
        }
    }
}
