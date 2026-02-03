import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { tmpdir } from 'os';

import { Config } from './config';
import * as util from './util';
import { makeWatcher } from './watcher';

// Encapsulate state to reduce global variables
interface ExtensionState {
    cody_tmpdir?: string;
    cody_bin?: string;
    cody_script_path?: string;
    statusBarItem?: vscode.StatusBarItem;
    copyTimeoutId?: NodeJS.Timeout;
    watcher?: vscode.FileSystemWatcher;
}

let state: ExtensionState = {};

export async function onWindowStateChanged(windowState: vscode.WindowState, context: vscode.ExtensionContext) {
    // If the window was idle, the VS Code Server might have restarted or cleaned up 
    // the temporary directory where the cody script lives.
    // If we are focused and enabled, verify the script exists. If not, restore it.
    if (windowState.focused && Config.isEnabled) {
        if (state.cody_script_path && !fs.existsSync(state.cody_script_path)) {
            util.log_info("Cody script was removed (idle cleanup detected). Restoring...");
            await turnOff();
            await turnOn(context);
        }
    }
}

export async function turnOnIfEnabled(context: vscode.ExtensionContext) {
    if (Config.isEnabled) {
        await turnOn(context);
    }
}

export async function toggle(context: vscode.ExtensionContext) {
    const newState = !Config.isEnabled;
    await vscode.workspace.getConfiguration('copy-from-terminal').update('enabled', newState, vscode.ConfigurationTarget.Global);

    if (newState) {
        await turnOn(context);
    } else {
        turnOff();
    }

    util.log_info(`The extension is now ${newState ? 'enabled' : 'disabled'}.`);
}

export async function turnOn(context: vscode.ExtensionContext) {
    state.cody_tmpdir = path.resolve(Config.tempDirectory || path.join(tmpdir(), context.extension.id));

    // Create temp dir to store the piped results
    util.log_info(`Cody: Using temp directory "${state.cody_tmpdir}"`);
    util.ensureDirectoryExists(state.cody_tmpdir);

    // Find bin dir for cody command
    state.cody_bin = await util.findVSCodeCliPath();
    if (!state.cody_bin) {
        util.log_error("Cody bin cannot be added to PATH!");
        return;
    }
    
    util.log_info(`Cody bin added to path: ${state.cody_bin}`);
    
    // Create cody script
    state.cody_script_path = await util.createBashScriptFile(state.cody_bin, state.cody_tmpdir, Config.cpAlias);

    // Create Status Bar Item for Notifications
    state.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 999);
    state.statusBarItem.command = 'copy-from-terminal.toggle';
    
    // Start watching for newly created files in tmp_dir
    watch(context, state.cody_tmpdir);
}

export function delete_cody_script() {
    // Remove old cody script
    if (state.cody_script_path && fs.existsSync(state.cody_script_path)) {
        try {
            fs.rmSync(state.cody_script_path);
        } catch (e) {
            // Ignore deletion errors if file is already gone
        }
        state.cody_script_path = undefined;
    }
}

export function turnOff() {
    util.log_info(`Turning off Cody...`);

    if (state.copyTimeoutId) {
        clearTimeout(state.copyTimeoutId);
    }

    // Clean up disposables manually
    if (state.statusBarItem) {
        state.statusBarItem.dispose();
    }
    if (state.watcher) {
        state.watcher.dispose();
    }

    delete_cody_script();
    
    // Reset state object
    state = {};
}

function watch(context: vscode.ExtensionContext, tmpdir: string) {
    const watcher = makeWatcher(tmpdir);
    state.watcher = watcher;

    watcher.onDidCreate(async (uri) => {
        if (!vscode.window.state.focused) { // Only do work on the focused window
            return;
        }

        const filepath = uri.fsPath;
        try {
            let fileContent = await fs.promises.readFile(filepath, 'utf-8');
            fileContent = fileContent.trim();

            await vscode.env.clipboard.writeText(fileContent);

            let message_length = 40;
            if (fileContent.length > message_length) {
                fileContent = fileContent.substring(0, message_length) + '...';
                fileContent = fileContent.replace(/[\r\n\t]/g, ' ');
            }

            if (Config.show_popup) {
                vscode.window.showInformationMessage('📋: ' + fileContent);
            } else if (state.statusBarItem) {
                if (state.copyTimeoutId) {
                    clearTimeout(state.copyTimeoutId);
                }
                
                state.statusBarItem.text = '$(clippy) ' + fileContent;
                state.statusBarItem.tooltip = `${Config.cpAlias}: copied to clipboard`;
                state.statusBarItem.show();

                state.copyTimeoutId = setTimeout(() => {
                    state.statusBarItem?.hide();
                }, 3000);
            }
        } catch (error) {
            util.log_error(`Failed to copy content: ${error}`);
        }
    });
}