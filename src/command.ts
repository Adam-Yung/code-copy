import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { Config } from './config';
import * as util from './util';
import { makeWatcher } from './watcher';
import { extensionContext } from './extension';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';

const INIT_SCRIPT = 'script/init.sh';


let _watcher: vscode.FileSystemWatcher | undefined;
let _onDidOpenTerminalHook: vscode.Disposable | undefined;

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

export function turnOn(context: vscode.ExtensionContext) {
    const cody_tmpdir = path.resolve(Config.tempDirectory || path.join(tmpdir(), context.extension.id));
    const cpAlias = Config.cpAlias;
    const teeAlias = Config.teeAlias;

    // turnOff(context); // Clean start

    util.log_info(`Cody: ${cody_tmpdir}`);
    util.ensureDirectoryExists(cody_tmpdir);

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 999);
    copy_info = { timeoutId: undefined, statusBarItem };

    const instanceId = randomUUID().replace(/-/g, '').substring(0, 12);; // remove hyphens and take the first 10 characters
    util.log_info(`Instance ID: ${instanceId}`);

    watch(context, instanceId, cody_tmpdir);

    _onDidOpenTerminalHook = vscode.window.onDidOpenTerminal(x => execPayload(x, instanceId, cody_tmpdir, cpAlias, teeAlias));
    context.subscriptions.push(_onDidOpenTerminalHook);
    vscode.window.terminals.forEach(x => execPayload(x, instanceId, cody_tmpdir, cpAlias, teeAlias));
}

export function turnOff(context: vscode.ExtensionContext) {
    const cody_tmpdir = path.resolve(Config.tempDirectory || path.join(tmpdir(), context.extension.id));

    util.log_info(`Turning off Cody...`);
    disposeWatcher();
    disposeOnDidOpenTerminalHook();

    if (cody_tmpdir && fs.existsSync(cody_tmpdir)) {
        fs.rmSync(cody_tmpdir, { recursive: true});
    }
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

async function execPayload(terminal: vscode.Terminal, instanceId: string, tmpdir: string, cpAlias: string, teeAlias: string) {
    const payload = makePayload(instanceId, tmpdir, cpAlias, teeAlias);
    let command = '';

    await util.sleep(500); // Wait for terminal to be ready
    // Hide the ugly init script from terminal buffer

    // Construct the command with ANSI escape sequences for hiding
    // 1. Save cursor position (\x1b[s)
    // 2. Execute the command payload
    // 3. After command, execute echo -e:
    //    - Restore cursor position (\x1b[u)
    //    - Erase from cursor to end of display (\x1b[J) - clears command line, new prompt, etc.
    command = `echo -e "\\x1b[s"`;
    terminal.sendText(command, true);

    command = `${payload}`;
    terminal.sendText(command, true);

    command = `echo -e "\\x1b[u \\x1b[4A \\x1b[J"`;
    terminal.sendText(command, true);

    // Log the original payload for debugging purposes
    util.log_info(`Payload sent to terminal:\n ${payload}`);
}

export function makePayload(instanceId: string, tmpdir: string, cpAlias: string, teeAlias: string) {
    const bp = extensionContext.extensionPath;
    const path2script = path.join('$_bp', util.escapeShell(INIT_SCRIPT));
    const path2tmpdir = util.escapeShell(tmpdir);
    const args = [
        path2script,
        util.escapeShell(instanceId),
        path2tmpdir,
        util.escapeShell(cpAlias),
        util.escapeShell(teeAlias),
    ].map(x => `"${x}"`);
    return `_bp="${util.escapeShell(bp)}"; . ${args.join(' ')}`;
}

function watch(context: vscode.ExtensionContext, instance: string, tmpdir: string) {
    // disposeWatcher();

    let { watcher } = makeWatcher(tmpdir);

    watcher.onDidCreate(async (uri) => {
        const filepath = uri.fsPath;

        // util.log_info(`File created: ${filepath}`);
        const instance_from_filename = getExtensionInstanceFromFilename(filepath);
        
        if (instance_from_filename !== instance) {
            util.log_info(`Ignoring file from different instance: ${instance_from_filename}`);
            return;
        }
        else {
            util.log_info(`New File! From instance: ${instance_from_filename}`);
        }
        // const doc = await vscode.workspace.openTextDocument(filepath);
        // await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
        let fileContent = await fs.promises.readFile(filepath, 'utf-8');
        fileContent = fileContent.trim();

        await vscode.env.clipboard.writeText(fileContent);

        let message_length = 40;
        if (fileContent.length > message_length) {
            fileContent = fileContent.substring(0, message_length) + '...';
            fileContent = fileContent.replace(/[\r\n]/g, ' ');
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
                    statusBarItem.hide();
                    statusBarItem.text = '';
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

function disposeOnDidOpenTerminalHook() {
    _onDidOpenTerminalHook?.dispose();
    _onDidOpenTerminalHook = undefined;
}

function getExtensionInstanceFromFilename(filename: string) {
    const parts = filename.split('-'); // (e.g. '2020-07-01T12:00:00.000Z-12345-aaaa.tmp')
    const lastPart = parts[parts.length - 1]; // (e.g., 'aaaa.tmp')
    return lastPart.split('.')[0]; // (e.g., 'aaaa')
}
