import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';


/**
 * File System Manipulation Related Functions
 */
export function ensureDirectoryExists(path: string) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
}


/**
 * Creates a new bash script file in the target directory, replacing a placeholder.
 * @param {string} targetDir The directory where the script will be created.
 * @param {string} temp_dir The string to replace '___PLACE_HOLDER___' in the script.
 * @returns {Promise<string>} A promise that resolves with the path to the created script, or rejects on error.
 */
export async function createBashScriptFile(targetDir: string, temp_dir: string, filename: string): Promise<string> {
    const scriptContent = `#!/bin/env bash

_temp_dir="${temp_dir}"

_get_temp_file() {
    tempfname="$(date +%s)\${RANDOM}.tmp"
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
        // Ensure the target directory exists
        await fs.promises.mkdir(targetDir, { recursive: true });
        // Write the script content to the file
        await fs.promises.writeFile(scriptPath, scriptContent);
        // Make the script executable
        await fs.promises.chmod(scriptPath, 0o755); // rwxr-xr-x permissions
        log_debug(`Successfully created script: ${scriptPath}`);
        return scriptPath;
    } catch (error: any) { // Use 'any' for error type or a more specific type if known
        log_error(`Error creating script file: ${error.message}`);
        throw error; // Re-throw to allow caller to handle
    }
}

/**
 * Renames a bash script file.
 * @param {string} targetDir The directory where the script is located.
 * @param {string} oldName The current name of the script file.
 * @param {string} newName The new name for the script file.
 * @returns {Promise<string>} A promise that resolves with the new path of the script, or rejects on error.
 */
export async function renameBashScriptFile(targetDir: string, oldName: string, newName: string): Promise<string> {
    const oldPath = path.join(targetDir, oldName);
    const newPath = path.join(targetDir, newName);

    try {
        await fs.promises.rename(oldPath, newPath);
        log_debug(`Successfully renamed script from ${oldPath} to ${newPath}`);
        return newPath;
    } catch (error: any) { // Use 'any' for error type or a more specific type if known
        console.error(`Error renaming script file: ${error.message}`);
        throw error; // Re-throw to allow caller to handle
    }
}


/**
 * Logging Related Functions
 */

const DEBUG = true; // Set to true to enable debug messages

export const log_info = (message: string) => {
    if (DEBUG) {
        vscode.window.showInformationMessage(message);
    }
    console.log(message);
};
export const log_error = (message: string) => {
    if (DEBUG) {
        vscode.window.showErrorMessage(message);
    }
    console.error(message);
};
export const log_debug = (message: string) => {
        console.log(message);
};

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Get VSCode Window Focus
 */
export let vscode_window_focused: boolean;

export function updateWindowState(state: vscode.WindowState) {
    if (state.focused) {
        log_info('VS Code window is now focused!');
        vscode_window_focused = true;

    } else {
        log_info('VS Code window is no longer focused.');
        vscode_window_focused = false;
    }
}

export function getWindowState() {
    return vscode_window_focused;
}


/**
 * Modify VSCode Integrated Terminal's PATH and add Cody
 */

/**
 * Prepend Cody's bin to PATH
 */
export function prepend_path(context: vscode.ExtensionContext): string {
    // 1. Define the directory where your cusntom executables/scripts are located
    const customBinDir = path.join(context.extensionPath, 'bin');

    ensureDirectoryExists(customBinDir);

    // 2. Prepend your custom directory to the PATH environment variable
    context.environmentVariableCollection.prepend('PATH', customBinDir + path.delimiter); // Add path.delimiter to ensure proper separation
    return customBinDir;
}