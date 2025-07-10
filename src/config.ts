import * as vscode from 'vscode';

export class Config {
    static get isEnabled(): boolean {
        return vscode.workspace.getConfiguration('terminal-to-clipboard').get('enabled', true);
    }

    static get show_popup(): boolean {
        return vscode.workspace.getConfiguration('terminal-to-clipboard').get('show_message_popup', false);
    }

    static get tempDirectory(): string {
        return vscode.workspace.getConfiguration('terminal-to-clipboard').get<string>('tempDirectory', '');
    }

    static get cpAlias(): string {
        return vscode.workspace.getConfiguration('terminal-to-clipboard').get<string>('alias', '');
    }
}
