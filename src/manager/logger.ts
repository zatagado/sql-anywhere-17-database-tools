import { ExtensionContext, LogOutputChannel, window } from 'vscode';

export class Logger {
    private static channel: LogOutputChannel | undefined;

    static activate(context: ExtensionContext): void {
        if (Logger.channel) {
            return;
        }
        Logger.channel = window.createOutputChannel('SQL Anywhere 17 Database Tools', { log: true });
        context.subscriptions.push(Logger.channel);
    }

    private static get output(): LogOutputChannel {
        if (!Logger.channel) {
            Logger.channel = window.createOutputChannel('SQL Anywhere 17 Database Tools', { log: true });
        }
        return Logger.channel;
    }

    static trace(message: string, ...args: unknown[]): void {
        Logger.output.trace(message, ...args);
    }

    static debug(message: string, ...args: unknown[]): void {
        Logger.output.debug(message, ...args);
    }

    static info(message: string, ...args: unknown[]): void {
        Logger.output.info(message, ...args);
    }

    static warn(message: string, ...args: unknown[]): void {
        Logger.output.warn(message, ...args);
    }

    static error(message: string | Error, ...args: unknown[]): void {
        Logger.output.error(message, ...args);
    }

    static show(): void {
        Logger.output.show(true);
    }
}
