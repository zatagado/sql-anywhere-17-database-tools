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
