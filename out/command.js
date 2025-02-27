"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.turnOnIfEnabled = turnOnIfEnabled;
exports.toggle = toggle;
exports.turnOn = turnOn;
exports.turnOff = turnOff;
exports.makePayload = makePayload;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const vscode = __importStar(require("vscode"));
const config_1 = require("./config");
const util_1 = require("./util");
const watcher_1 = require("./watcher");
const extension_1 = require("./extension");
const DEFAULT_TEMP_DIR = 'temp';
const INIT_SCRIPT = 'script/init.sh';
/**
* This avoids opening the file in more than one VS Code window (if there are multiple open VS Code windows).
*/
let _instanceId;
let _watcher;
let _onDidOpenTerminalHook;
async function turnOnIfEnabled(context) {
    if (config_1.Config.isEnabled) {
        turnOn(context);
    }
}
async function toggle(context) {
    const newState = !config_1.Config.isEnabled;
    newState ? turnOn(context) : turnOff(context);
    vscode.workspace.getConfiguration('terminal-to-clipboard').update('enabled', newState, true);
    vscode.window.showInformationMessage(`The extension is now ${newState ? 'enabled' : 'disabled'}.`);
}
function turnOn(context) {
    const tmpdir = config_1.Config.tempDirectory || path.join(context.extensionUri.fsPath, DEFAULT_TEMP_DIR);
    const cpAlias = config_1.Config.cpAlias;
    const teeAlias = config_1.Config.teeAlias;
    turnOff(context); // Clean start
    (0, util_1.ensureDirectoryExists)(tmpdir);
    _instanceId = _instanceId || crypto.randomUUID().substring(0, 4);
    const instanceId = _instanceId;
    watch(context, instanceId, tmpdir);
    _onDidOpenTerminalHook = vscode.window.onDidOpenTerminal(x => execPayload(x, instanceId, tmpdir, cpAlias, teeAlias));
    context.subscriptions.push(_onDidOpenTerminalHook);
    vscode.window.terminals.forEach(x => execPayload(x, instanceId, tmpdir, cpAlias, teeAlias));
}
function turnOff(context) {
    const tmpdir = config_1.Config.tempDirectory || path.join(context.extensionUri.fsPath, DEFAULT_TEMP_DIR);
    _instanceId = undefined;
    disposeWatcher();
    disposeOnDidOpenTerminalHook();
    if (tmpdir && fs.existsSync(tmpdir)) {
        fs.rmSync(tmpdir, { recursive: true });
    }
}
async function execPayload(terminal, instanceId, tmpdir, cpAlias, teeAlias) {
    const payload = makePayload(instanceId, tmpdir, cpAlias, teeAlias);
    // terminal.sendText(payload + '; echo -e "\\x1b[2F\\x1b[0K\\x1b[B\\x1b[2K"', true);
    // Hide the ugly init script from terminal buffer
    // terminal.sendText(payload + '; echo -e "\\x1b[2F\\x1b[0K\\x1b[B\\x1b[0K"', true);
    terminal.sendText(payload + '; echo -e "\\x1b[2F\\x1b[0K"', true);
    // terminal.sendText("clear", true);
}
function makePayload(instanceId, tmpdir, cpAlias, teeAlias) {
    const bp = extension_1.extensionContext.extensionPath;
    const path2script = path.join('$_bp', (0, util_1.escapeShell)(INIT_SCRIPT));
    const path2tmpdir = path.join('$_bp', (0, util_1.escapeShell)(path.relative(bp, tmpdir)));
    const args = [
        path2script,
        (0, util_1.escapeShell)(instanceId),
        path2tmpdir,
        (0, util_1.escapeShell)(cpAlias),
        (0, util_1.escapeShell)(teeAlias),
    ].map(x => `"${x}"`);
    return ' ' /* Prevent shell history cluttering */ + `_bp="${(0, util_1.escapeShell)(bp)}"; . ${args.join(' ')}`;
}
function watch(context, instance, tmpdir) {
    disposeWatcher();
    let { watcher, emitter } = (0, watcher_1.makeWatcher)(tmpdir);
    context.subscriptions.push(emitter);
    emitter.event(async (event) => {
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
function getExtensionInstanceFromFilename(filename) {
    const parts = filename.split('-'); // (e.g. '2020-07-01T12:00:00.000Z-12345-aaaa.tmp')
    const lastPart = parts[parts.length - 1]; // (e.g., 'aaaa.tmp')
    return lastPart.split('.')[0]; // (e.g., 'aaaa')
}
//# sourceMappingURL=command.js.map