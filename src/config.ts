import * as vscode from 'vscode';

export class Config {
    static get isEnabled(): boolean {
        return vscode.workspace.getConfiguration('copy-from-terminal').get('enabled', true);
    }

    static get show_popup(): boolean {
        return vscode.workspace.getConfiguration('copy-from-terminal').get('show_message_popup', false);
    }

    static get tempDirectory(): string {
        return vscode.workspace.getConfiguration('copy-from-terminal').get<string>('tempDirectory', '');
    }

    static get cpAlias(): string {
        return vscode.workspace.getConfiguration('copy-from-terminal').get<string>('alias', '');
    }
}
