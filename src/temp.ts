import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('extension.copyFromStdin', () => {
    // If no piped input is present, warn the user.
    if (process.stdin.isTTY) {
      vscode.window.showErrorMessage('No piped input detected. Pipe content into this command.');
      return;
    }

    let input = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      input += chunk;
    });

    process.stdin.on('end', async () => {
      try {
        await vscode.env.clipboard.writeText(input);
        vscode.window.showInformationMessage('Copied to clipboard!');
      } catch (err) {
        vscode.window.showErrorMessage('Failed to copy to clipboard.');
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
