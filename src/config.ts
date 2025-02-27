import * as vscode from 'vscode';

export class Config {
    static get isEnabled(): boolean {
        return vscode.workspace.getConfiguration('terminal-to-clipboard').get('enabled', true);
    }

    static get tempDirectory(): string {
        return vscode.workspace.getConfiguration('terminal-to-clipboard').get<string>('tempDirectory', '');
    }

    static get cpAlias(): string {
        return vscode.workspace.getConfiguration('terminal-to-clipboard').get<string>('alias', '');
    }

    static get teeAlias(): string {
        return vscode.workspace.getConfiguration('terminal-to-clipboard').get<string>('aliasForTee', '');
    }
}
