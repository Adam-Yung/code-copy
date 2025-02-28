import * as vscode from 'vscode';
import { toggle, turnOnIfEnabled, turnOff } from './command';

export let extensionContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
    extensionContext = context;

    turnOnIfEnabled(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('terminal-to-clipboard.toggle', () => toggle(context)),
        vscode.commands.registerCommand('terminal-to-clipboard.change_alias', async () => {
            const input = await vscode.window.showInputBox({ prompt: 'Enter desired alias:' });
            if (input) {
                await vscode.workspace.getConfiguration('terminal-to-clipboard').update('alias', input, true);
                turnOnIfEnabled(context);
                vscode.window.showInformationMessage(`Changed terminal-to-clipboard alias to: ${input}`);
            }
          })
    );
}

export function deactivate(context: vscode.ExtensionContext) {
    turnOff(context);
}
