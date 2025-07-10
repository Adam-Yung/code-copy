import * as vscode from 'vscode';
import * as process from 'process';

import { delete_cody_script, toggle, turnOnIfEnabled, turnOff } from './command';
import { log_debug } from './util';
export let extensionContext: vscode.ExtensionContext;

export function is_posix_workspace(): boolean {
    if (process.platform === 'win32') { // WSL is a feature on Windows
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            // Check the scheme of the first workspace folder URI
            // For WSL, it's typically 'vscode-remote' and authority contains 'wsl' or 'wsl+distroName'
            const firstFolderUri = workspaceFolders[0].uri;
            log_debug(`Workspace folder URI: ${firstFolderUri.toString()}`);
            if (firstFolderUri.scheme === 'vscode-remote' && firstFolderUri.authority.startsWith('wsl')) {
               return true;
            }
        }
        return false; // Not in WSL
    }
    return true; // For non-Windows platforms, assume POSIX
}

export function activate(context: vscode.ExtensionContext) {
    extensionContext = context;

    log_debug(`Platform: ${process.platform}`);

    if (!is_posix_workspace()) {
        vscode.window.showInformationMessage('Terminal to Clipboard is not supported on Windows yet. Please use WSL.');
        return;
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('terminal-to-clipboard.toggle', () => toggle(context)),
        vscode.commands.registerCommand('terminal-to-clipboard.change_alias', async () => {
            const input = await vscode.window.showInputBox({ prompt: 'Enter desired alias:' });
            if (input) {
                await vscode.workspace.getConfiguration('terminal-to-clipboard').update('alias', input, true);
                delete_cody_script();
                turnOnIfEnabled(context);
                vscode.window.showInformationMessage(`Changed terminal-to-clipboard alias to: ${input}`);
            }
          })
    );

    turnOnIfEnabled(context);
}

export function deactivate(context: vscode.ExtensionContext) {
    if (is_posix_workspace()) {
        turnOff(context);
    }
}
