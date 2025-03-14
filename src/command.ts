import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import * as vscode from 'vscode';

import { Config } from './config';
import { ensureDirectoryExists, escapeShell } from './util';
import { makeWatcher, WatchEvent } from './watcher';
import { extensionContext } from './extension';

const DEFAULT_TEMP_DIR = 'temp';
const INIT_SCRIPT = 'script/init.sh';

/**
* This avoids opening the file in more than one VS Code window (if there are multiple open VS Code windows).
*/
let _instanceId: string | undefined;

let _watcher: fs.FSWatcher | undefined;
let _onDidOpenTerminalHook: vscode.Disposable | undefined;

export async function turnOnIfEnabled(context: vscode.ExtensionContext) {
    if (Config.isEnabled) {
        turnOn(context);
    }
}

export async function toggle(context: vscode.ExtensionContext) {
    const newState = !Config.isEnabled;
    newState ? turnOn(context) : turnOff(context);
    vscode.workspace.getConfiguration('terminal-to-clipboard').update('enabled', newState, true);
    vscode.window.showInformationMessage(`The extension is now ${newState ? 'enabled' : 'disabled'}.`);
}

export function turnOn(context: vscode.ExtensionContext) {
    const tmpdir = Config.tempDirectory || path.join(context.extensionUri.fsPath, DEFAULT_TEMP_DIR);
    const cpAlias = Config.cpAlias;
    const teeAlias = Config.teeAlias;

    // vscode.window.showInformationMessage(`Using cpAlias: ${cpAlias}`);
    turnOff(context); // Clean start
    ensureDirectoryExists(tmpdir);

    _instanceId = _instanceId || crypto.randomUUID().substring(0, 4);
    const instanceId = _instanceId;
    watch(context, instanceId, tmpdir);
    _onDidOpenTerminalHook = vscode.window.onDidOpenTerminal(x => execPayload(x, instanceId, tmpdir, cpAlias, teeAlias));
    context.subscriptions.push(_onDidOpenTerminalHook);
    vscode.window.terminals.forEach(x => execPayload(x, instanceId, tmpdir, cpAlias, teeAlias));
}

export function turnOff(context: vscode.ExtensionContext) {
    const tmpdir = Config.tempDirectory || path.join(context.extensionUri.fsPath, DEFAULT_TEMP_DIR);
    _instanceId = undefined;
    disposeWatcher();
    disposeOnDidOpenTerminalHook();

    if (tmpdir && fs.existsSync(tmpdir)) {
        fs.rmSync(tmpdir, { recursive: true});
    }
}

async function execPayload(terminal: vscode.Terminal, instanceId: string, tmpdir: string, cpAlias: string, teeAlias: string) {
    const payload = makePayload(instanceId, tmpdir, cpAlias, teeAlias);

    // Hide the ugly init script from terminal buffer
    // terminal.sendText('echo -e "\\x1b[s" ; ', false); // Save cursor position
    terminal.sendText(payload, false);
    terminal.sendText(' ; echo -e "\\x1b[2F\\x1b[0K"', true); // Restore cursor position and remove the echo command itself
}

export function makePayload(instanceId: string, tmpdir: string, cpAlias: string, teeAlias: string) {
    const bp = extensionContext.extensionPath;
    const path2script = path.join('$_bp', escapeShell(INIT_SCRIPT));
    const path2tmpdir = path.join('$_bp', escapeShell(path.relative(bp, tmpdir)));
    const args = [
        path2script,
        escapeShell(instanceId),
        path2tmpdir,
        escapeShell(cpAlias),
        escapeShell(teeAlias),
    ].map(x => `"${x}"`);
    return ' ' /* Prevent shell history cluttering */ + `_bp="${escapeShell(bp)}"; . ${args.join(' ')}`;
}

function watch(context: vscode.ExtensionContext, instance: string, tmpdir: string) {
    disposeWatcher();

    let { watcher, emitter } = makeWatcher(tmpdir);
    context.subscriptions.push(emitter);

    emitter.event(async (event: WatchEvent) => {
        if (instance !== getExtensionInstanceFromFilename(event.filename)) {
            /**
             * This avoids opening the file in more than one VS Code window (if
             * there are multiple open VS Code windows).
             */
            return;
        }
        const filepath = path.join(event.dir, event.filename);
        const doc = await vscode.workspace.openTextDocument(filepath);
        // await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
        let fileContent = await fs.promises.readFile(filepath, 'utf-8');
        fileContent = fileContent.trim();
        await vscode.env.clipboard.writeText(fileContent);

        if (fileContent.length > 25) {
            fileContent = fileContent.substring(0, 25) + '...';
        }
        vscode.window.showInformationMessage('Copied to clipboard: ' + fileContent);
    });
    _watcher = watcher;
}

function disposeWatcher() {
    _watcher?.close();
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
