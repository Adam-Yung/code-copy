import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as process from 'process';
import { Config } from './config';

/**
 * ---------------------------------
 * File System Utilities
 * ---------------------------------
 */

export function ensureDirectoryExists(directoryPath: string) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
}

/**
 * Creates a new executable bash script file in the target directory.
 * @param targetDir The directory where the script will be created.
 * @param temp_dir The temporary directory path for the script to use.
 * @param filename The name of the script file.
 * @returns A promise that resolves with the path to the created script.
 */
export async function createBashScriptFile(targetDir: string, temp_dir: string, filename: string): Promise<string> {
    const scriptContent = `#!/bin/env bash

_temp_dir="${temp_dir}"

_get_temp_file() {
    tempfname="$(date +%s)\${RANDOM}.tmp"
    if [ ! -d "$_temp_dir" ] ; then
        mkdir -p "$_temp_dir"
    fi
    echo "$_temp_dir/$tempfname"
}

if [[ -t 0 ]]; then
    echo "Enter text to be copied to clipboard: (Press Ctrl+D to finish)"
fi
output="$(cat)"
echo "$output" > "$(_get_temp_file)"
`;

    const scriptPath = path.join(targetDir, filename);

    try {
        await fs.promises.mkdir(targetDir, { recursive: true });
        await fs.promises.writeFile(scriptPath, scriptContent);
        await fs.promises.chmod(scriptPath, 0o755); // rwxr-xr-x permissions
        log_debug(`Successfully created script: ${scriptPath}`);
        return scriptPath;
    } catch (error: any) {
        log_error(`Error creating script file: ${error.message}`);
        throw error;
    }
}

/**
 * Renames a bash script file.
 * @param targetDir The directory where the script is located.
 * @param oldName The current name of the script file.
 * @param newName The new name for the script file.
 * @returns A promise that resolves with the new path of the script.
 */
export async function renameBashScriptFile(targetDir: string, oldName: string, newName: string): Promise<string> {
    const oldPath = path.join(targetDir, oldName);
    const newPath = path.join(targetDir, newName);

    try {
        await fs.promises.rename(oldPath, newPath);
        log_debug(`Successfully renamed script from ${oldPath} to ${newPath}`);
        return newPath;
    } catch (error: any) {
        log_error(`Error renaming script file: ${error.message}`);
        throw error;
    }
}

/**
 * ---------------------------------
 * Logging Utilities
 * ---------------------------------
 */

const DEBUG_LEVELS = {
    QUIET: 0,
    CONSOLE: 1,
    MESSAGE: 2,
};
const debug_level = DEBUG_LEVELS.CONSOLE; // Set your desired debug level here

export const log_info = (message: string) => {
    const msg = `${Config.cpAlias}: ${message}`;
    if (debug_level >= DEBUG_LEVELS.MESSAGE) {
        vscode.window.showInformationMessage(msg);
    }
    if (debug_level >= DEBUG_LEVELS.CONSOLE) {
        console.log(msg);
    }
};

export const log_error = (message: string) => {
    const msg = `${Config.cpAlias}: ${message}`;
    if (debug_level >= DEBUG_LEVELS.MESSAGE) {
        vscode.window.showErrorMessage(msg);
    }
    if (debug_level >= DEBUG_LEVELS.CONSOLE) {
        console.error(msg);
    }
};

export const log_debug = (message: string) => {
    if (debug_level !== DEBUG_LEVELS.QUIET) {
        console.log(`${Config.cpAlias} (debug): ${message}`);
    }
};

/**
 * ---------------------------------
 * VS Code State & General Utilities
 * ---------------------------------
 */

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export let vscode_window_focused: boolean = true; // Default to true

export function updateWindowState(state: vscode.WindowState) {
    vscode_window_focused = state.focused;
    log_debug(`VS Code window focused: ${vscode_window_focused}`);
}

export function getWindowState() {
    return vscode_window_focused;
}

/**
 * ---------------------------------
 * VS Code Terminal PATH Configuration
 * ---------------------------------
 */


/**
 * Finds the dynamic path to the VS Code Server remote CLI.
 * @returns The CLI path string, or the newly prepended bin path if not in a remote session.
 */
export async function findVSCodeCliPath(context: vscode.ExtensionContext): Promise<string | undefined> {
    const terminalPath = process.env.PATH;
    log_debug(`process.env.PATH: ${terminalPath}`);

    if (!terminalPath) return undefined;

    const pathEntries = terminalPath.split(path.delimiter);

    const cliPath = pathEntries.find(p =>
        p.includes('.vscode-server') && p.includes('/bin/remote-cli')
    );

    return cliPath;
}