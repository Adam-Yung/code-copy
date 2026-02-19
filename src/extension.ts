import * as vscode from 'vscode';
import { toggle, turnOnIfEnabled, turnOff, onWindowStateChanged } from './command';
import { log_debug, findVSCodeCliPath } from './util';

export function is_posix_workspace(): boolean {
    return process.platform !== 'win32';
}

export async function activate(context: vscode.ExtensionContext) {
    log_debug(`Platform: ${process.platform}`);

    if (!is_posix_workspace()) {
        vscode.window.showInformationMessage('Copy From Terminal is not supported on Windows yet. Please use WSL.');
        return;
    }

    // Cody should only work in remote-ssh sessions or in WSL
    const vscode_server_dir = await findVSCodeCliPath();
    if (!vscode_server_dir) {
        return;
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('copy-from-terminal.toggle', () => toggle(context)),
        vscode.commands.registerCommand('copy-from-terminal.change_alias', async () => {
            const input = await vscode.window.showInputBox({ 
                prompt: 'Enter desired alias:',
                placeHolder: 'cody'
            });
            if (input) {
                await vscode.workspace.getConfiguration('copy-from-terminal').update('alias', input, vscode.ConfigurationTarget.Global);
                // Restart to apply alias change
                await turnOff();
                await turnOnIfEnabled(context);
                vscode.window.showInformationMessage(`Changed copy-from-terminal alias to: ${input}`);
            }
        }),
        // Listen for window focus to restore script if it was deleted during idle
        vscode.window.onDidChangeWindowState((e) => onWindowStateChanged(e, context))
    );

    await turnOnIfEnabled(context);
}

export async function deactivate(context: vscode.ExtensionContext) {
    if (is_posix_workspace()) {
        await turnOff();
    }
}