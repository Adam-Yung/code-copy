import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { Config } from './config';
import * as util from './util';
import { makeWatcher } from './watcher';
import { extensionContext } from './extension';
import { tmpdir } from 'os';


/**
 * Logic for Cody:
 * Prepend extension path to shell's PATH env. variable
 * Add a script called "cp_alias" to extension path
 * In file watcher, check for new files
 * If window is active, show status message notification
 */


let cody_tmpdir:string | undefined;
let cody_bin:string | undefined;
let cody_script:string | undefined;

let _watcher: vscode.FileSystemWatcher | undefined;

interface CopyInfo {
    timeoutId: NodeJS.Timeout | undefined;
    statusBarItem: vscode.StatusBarItem | undefined;
}
let copy_info: CopyInfo;

export async function turnOnIfEnabled(context: vscode.ExtensionContext) {
    if (Config.isEnabled) {
        turnOn(context);
    }
}

export async function toggle(context: vscode.ExtensionContext) {
    const newState = !Config.isEnabled;
    newState ? turnOn(context) : turnOff(context);
    vscode.workspace.getConfiguration('terminal-to-clipboard').update('enabled', newState, true);
    util.log_info(`The extension is now ${newState ? 'enabled' : 'disabled'}.`);
}

export async function turnOn(context: vscode.ExtensionContext) {
    cody_tmpdir = path.resolve(Config.tempDirectory || path.join(tmpdir(), context.extension.id));
    const cpAlias = Config.cpAlias;

    // Subscribe to window state changes
    vscode.window.onDidChangeWindowState(e => {
        util.updateWindowState(e);
    });

    util.updateWindowState(vscode.window.state);


    // Create temp dir to store the piped results
    util.log_info(`Cody: Using temp directory "${cody_tmpdir}"`);
    util.ensureDirectoryExists(cody_tmpdir);


    // Create bin dir for cody command
    cody_bin = util.findVSCodeCliPath(context);
    if (cody_bin) {
        util.log_info(`Cody bin added to path: ${cody_bin}`);
    }
    else {
        util.log_error("Cody bin cannot be added to PATH!");
        return;
    }
    // Create cody script
    cody_script = await util.createBashScriptFile(cody_bin, cody_tmpdir, Config.cpAlias);

    // Create Status Bar Item for Notifications
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 999);
    copy_info = { timeoutId: undefined, statusBarItem };

    // Start watching for newly created files in tmp_dir
    watch(context, cody_tmpdir);
}

export function delete_cody_script() {
    // Remove old cody script
    if (cody_script && fs.existsSync(cody_script)) {
        fs.rmSync(cody_script);
    }
}

export function turnOff(context: vscode.ExtensionContext) {
    util.log_info(`Turning off Cody...`);
    disposeWatcher();

    // Remove temporary directories
    if (cody_tmpdir && fs.existsSync(cody_tmpdir)) {
        fs.rmSync(cody_tmpdir, { recursive: true});
    }

    if (cody_bin && cody_bin.includes(context.extensionPath) && fs.existsSync(cody_bin)) {
        util.log_info("Removing Cody from PATH");
        util.remove_from_path(context, cody_bin);
        fs.rmSync(cody_bin, { recursive: true});
    }

    delete_cody_script();

    // Remove Status Bar Notifications
    if (copy_info) {
        if (copy_info.timeoutId) {
            clearTimeout(copy_info.timeoutId);
        }
        if (copy_info.statusBarItem) {    
            copy_info.statusBarItem.dispose();
            copy_info.statusBarItem = undefined;
        }
    }
}


function watch(context: vscode.ExtensionContext, tmpdir: string) {
    // disposeWatcher();

    let { watcher } = makeWatcher(tmpdir);

    watcher.onDidCreate(async (uri) => {
        if (!util.getWindowState()) {   /** Only do work on the focused window */
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
        } else {
            let statusBarItem = copy_info.statusBarItem;
            if (statusBarItem) {
                let timeoutId = copy_info.timeoutId;
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                statusBarItem.text = '📋: ' + fileContent;
                statusBarItem.tooltip = Config.cpAlias + ': copied to clipboard';
                statusBarItem.show();

                timeoutId = setTimeout(() => {
                    if (statusBarItem) {
                        statusBarItem.hide();
                        statusBarItem.text = '';
                    }
                }, 3000);
            }
        //    vscode.window.setStatusBarMessage('📋: ' + fileContent, 3000);
        }
    });
    _watcher = watcher;
}

function disposeWatcher() {
    _watcher?.dispose();
    _watcher = undefined;
}
