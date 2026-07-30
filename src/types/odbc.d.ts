// Augments the zatagado node-odbc fork's type definitions with members the
// fork supports at runtime but does not declare in its bundled .d.ts.
import 'odbc';

declare module 'odbc' {
    interface Result<T> {
        // Set when the driver returned fewer rows than the result set contains.
        truncated?: boolean;
    }

    interface QueryOptions {
        // Caps the number of rows fetched for a query.
        maxRows?: number;
    }

    interface ConnectionParameters {
        // Returns rows as arrays instead of objects.
        fetchArray?: boolean;
    }

    interface PoolParameters {
        // Returns rows as arrays instead of objects.
        fetchArray?: boolean;
    }
}
