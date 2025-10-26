import * as vscode from 'vscode';
import * as process from 'process';

import { delete_cody_script, toggle, turnOnIfEnabled, turnOff } from './command';
import { log_debug, findVSCodeCliPath } from './util';
import { utils } from 'mocha';
export let extensionContext: vscode.ExtensionContext;

export function is_posix_workspace(): boolean {
    return process.platform === 'win32'
}

export async function activate(context: vscode.ExtensionContext) {
    extensionContext = context;

    log_debug(`Platform: ${process.platform}`);

    if (!is_posix_workspace()) {
        vscode.window.showInformationMessage('Copy From Terminal is not supported on Windows yet. Please use WSL.');
        return;
    }

    // Cody should only work in remote-ssh sessions or in WSL
    let vscode_server_dir = await findVSCodeCliPath(context);
    if (!vscode_server_dir) {
        return;
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('copy-from-terminal.toggle', () => toggle(context)),
        vscode.commands.registerCommand('copy-from-terminal.change_alias', async () => {
            const input = await vscode.window.showInputBox({ prompt: 'Enter desired alias:' });
            if (input) {
                await vscode.workspace.getConfiguration('copy-from-terminal').update('alias', input, true);
                delete_cody_script();
                turnOnIfEnabled(context);
                vscode.window.showInformationMessage(`Changed copy-from-terminal alias to: ${input}`);
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
