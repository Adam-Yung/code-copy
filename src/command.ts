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
}

let state: ExtensionState = {};

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
        turnOff(context);
    }

    util.log_info(`The extension is now ${newState ? 'enabled' : 'disabled'}.`);
}

export async function turnOn(context: vscode.ExtensionContext) {
    state.cody_tmpdir = path.resolve(Config.tempDirectory || path.join(tmpdir(), context.extension.id));
    
    // Subscribe to window state changes and add the disposable to subscriptions
    context.subscriptions.push(vscode.window.onDidChangeWindowState(util.updateWindowState));
    util.updateWindowState(vscode.window.state);

    // Create temp dir to store the piped results
    util.log_info(`Cody: Using temp directory "${state.cody_tmpdir}"`);
    util.ensureDirectoryExists(state.cody_tmpdir);

    // Create bin dir for cody command
    state.cody_bin = util.findVSCodeCliPath(context);
    if (!state.cody_bin) {
        util.log_error("Cody bin cannot be added to PATH!");
        return;
    }
    util.log_info(`Cody bin added to path: ${state.cody_bin}`);
    
    // Create cody script
    state.cody_script_path = await util.createBashScriptFile(state.cody_bin, state.cody_tmpdir, Config.cpAlias);

    // Create Status Bar Item for Notifications
    state.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 999);
    context.subscriptions.push(state.statusBarItem); // Manage status bar item lifecycle

    // Start watching for newly created files in tmp_dir
    watch(context, state.cody_tmpdir);
}

export function delete_cody_script() {
    // Remove old cody script
    if (state.cody_script_path && fs.existsSync(state.cody_script_path)) {
        fs.rmSync(state.cody_script_path);
        state.cody_script_path = undefined;
    }
}

export function turnOff(context: vscode.ExtensionContext) {
    util.log_info(`Turning off Cody...`);

    // The watcher and status bar item are now managed by context.subscriptions,
    // so they will be disposed automatically. We just need to clear our state.

    if (state.copyTimeoutId) {
        clearTimeout(state.copyTimeoutId);
    }

    // Clean up files and PATH
    if (state.cody_bin && state.cody_bin.includes(context.extensionPath) && fs.existsSync(state.cody_bin)) {
        util.log_info("Removing Cody from PATH");
        util.remove_from_path(context);
        fs.rmSync(state.cody_bin, { recursive: true});
    }

    delete_cody_script();
    
    // Reset state object
    state = {};
}

function watch(context: vscode.ExtensionContext, tmpdir: string) {
    const watcher = makeWatcher(tmpdir);

    watcher.onDidCreate(async (uri) => {
        if (!util.getWindowState()) { // Only do work on the focused window
            return;
        }

        const filepath = uri.fsPath;
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
            
            state.statusBarItem.text = '📋: ' + fileContent;
            state.statusBarItem.tooltip = `${Config.cpAlias}: copied to clipboard`;
            state.statusBarItem.show();

            state.copyTimeoutId = setTimeout(() => {
                state.statusBarItem?.hide();
            }, 3000);
        }
    });

    // *** CRITICAL CHANGE ***
    // Add the watcher to the extension's subscriptions to let VS Code manage its lifecycle.
    context.subscriptions.push(watcher);
}