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

let old_path: string | undefined = undefined;

/**
 * Retrieves the integrated terminal's environment configuration for the current platform.
 * @returns A promise that resolves to the current environment settings object.
 */
async function getTerminalConfig(): Promise<{ [key: string]: string }> {
    const configSection = `terminal.integrated.env.${process.platform}`;
    const configuration = vscode.workspace.getConfiguration();
    return configuration.get<{ [key: string]: string }>(configSection, {});
}

/**
 * Updates the integrated terminal's environment configuration.
 * @param config The environment object to set.
 * @returns A promise that resolves to true on success and false on failure.
 */
async function updateTerminalConfig(config: { [key: string]: string }): Promise<boolean> {
    if (Object.keys(config).length === 0) {
        log_debug("Skipping terminal config update because the config object is empty.");
        return true; // Nothing to do, so it's a "success"
    }
    const configSection = `terminal.integrated.env.${process.platform}`;
    const configuration = vscode.workspace.getConfiguration();
    try {
        await configuration.update(configSection, config, vscode.ConfigurationTarget.Global);
        log_info('Terminal PATH updated successfully.');
        return true;
    } catch (error: any) {
        log_error(`Failed to update terminal PATH: ${error.message}`);
        return false;
    }
}

/**
 * Prepends the extension's binary directory to the integrated terminal's PATH.
 * @returns The path to the extension's binary directory.
 */
export async function prepend_path(context: vscode.ExtensionContext): Promise<string> {
    const customBinDir = path.join(context.extensionPath, 'bin');
    ensureDirectoryExists(customBinDir);

    const currentEnv = await getTerminalConfig();
    const newEnv = { ...currentEnv };
    const existingPath = newEnv.PATH || process.env.PATH || '';

    // Store the original path for restoration, if not already stored.
    if (old_path === undefined) {
        old_path = existingPath;
    }

    log_debug(`Existing PATH: ${existingPath}`);

    if (existingPath.includes(customBinDir)) {
        log_info("Cody bin directory already in PATH.");
        return customBinDir;
    } else if (vscode.window.terminals.length > 0) {
        vscode.window.showInformationMessage(`${Config.cpAlias}: Please open a new terminal to use the updated PATH.`);
    }

    // Prepend the new directory to the PATH. Using ${env:PATH} ensures VS Code expands the existing variable.
    newEnv.PATH = `${customBinDir}${path.delimiter}\${env:PATH}`;
    log_debug(`New PATH to be set: ${newEnv.PATH}`);

    await updateTerminalConfig(newEnv);
    return customBinDir;
}

/**
 * Removes the extension's binary directory from the PATH, restoring the original.
 */
export async function remove_from_path(): Promise<void> {
    if (old_path === undefined) {
        log_debug("No original PATH to restore.");
        return; // Nothing to restore
    }

    const currentEnv = await getTerminalConfig();
    const newEnv = { ...currentEnv };

    log_debug(`Restoring PATH to: ${old_path}`);
    newEnv.PATH = old_path;
    await updateTerminalConfig(newEnv);
    old_path = undefined; // Clear the stored path
}

/**
 * Finds the dynamic path to the VS Code Server remote CLI.
 * @returns The CLI path string, or the newly prepended bin path if not in a remote session.
 */
export async function findVSCodeCliPath(context: vscode.ExtensionContext): Promise<string | undefined> {
    const terminalPath = process.env.PATH;
    log_debug(`process.env.PATH: ${terminalPath}`);

    const terminalConfig = await getTerminalConfig();
    // The configured path might contain `${env:PATH}`, so we check both that and the process's PATH
    const configPath = terminalConfig.PATH || '';

    const combinedPath = `${terminalPath}${path.delimiter}${configPath}`;

    if (!combinedPath) {
        return undefined;
    }

    const pathEntries = combinedPath.split(path.delimiter);

    const cliPath = pathEntries.find(p =>
        p.includes('.vscode-server') && p.includes('/bin/remote-cli')
    );

    if (!cliPath) {
        log_info("Remote CLI not found. This is normal if not in a remote SSH session.");
        return prepend_path(context);
    }

    log_debug(`Found remote CLI path: ${cliPath}`);
    return cliPath;
}