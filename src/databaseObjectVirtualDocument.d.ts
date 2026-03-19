declare module 'sqlvirtualdocument' {

    export interface SqlVirtualDocument {
        text: string;
        wrap?: boolean;
        wrapLength?: number;
        mode?: 'b' | 'd' | 'g' | 'p' | 's' | 't' | 'w' | 'y';
    }

    export function show(options: SqlVirtualDocument): string;
}