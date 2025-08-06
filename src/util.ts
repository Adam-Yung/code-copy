import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as process from 'process';
import { Config } from './config';

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
export async function createBashScriptFile(targetDir: string, temp_dir: string, filename: string): Promise<string | undefined> {
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
const DEBUG_LEVELS = {
    QUIET: 0,
    CONSOLE: 1,
    MESSAGE: 2
}
const debug_level = DEBUG_LEVELS.QUIET; // Set to true to enable debug messages

export const log_info = (message: string) => {
    const msg = `${Config.cpAlias}: ${message}`;
    switch (debug_level) {
        case DEBUG_LEVELS.MESSAGE:
            vscode.window.showInformationMessage(msg);
        case DEBUG_LEVELS.CONSOLE:
            console.log(msg);
        default:
            return;
    }
};
export const log_error = (message: string) => {
    const msg = `${Config.cpAlias}: ${message}`;
    switch (debug_level) {
        case DEBUG_LEVELS.MESSAGE:
            vscode.window.showErrorMessage(msg);
        case DEBUG_LEVELS.CONSOLE:
            console.error(msg);
        default:
            return;
    }
};

export const log_debug = (message: string) => {
    const msg = `${Config.cpAlias}: ${message}`;
    if (debug_level != DEBUG_LEVELS.QUIET)
        console.log(msg);
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
        log_debug('VS Code window is now focused!');
        vscode_window_focused = true;

    } else {
        log_debug('VS Code window is no longer focused.');
        vscode_window_focused = false;
    }
}

export function getWindowState() {
    return vscode_window_focused;
}

let old_path: string|undefined = undefined;

/**
 * Modify VSCode Integrated Terminal's PATH and add Cody
 */

/**
 * Prepend Cody's bin to PATH
 */
export function prepend_path(context: vscode.ExtensionContext): string {
    // 1. Define the directory where your cusntom executables/scripts are located
    const customBinDir = path.join(context.extensionPath, 'bin');

    // 2. Ensure prepended directory exists
    ensureDirectoryExists(customBinDir);

    
    // 3. Get the correct configuration setting for the platform
    const configSection = `terminal.integrated.env.${process.platform}`;
    const configuration = vscode.workspace.getConfiguration();
    // Get the current environment settings for the terminal, or an empty object
    const currentEnv = configuration.get<{ [key: string]: string }>(configSection, {});

    // 4. Prepend your script directory to the PATH
    // We make a copy to avoid modifying the object returned by the configuration
    const newEnv = { ...currentEnv };
    const existingPath = newEnv.PATH || process.env.PATH || '';
    
    // Store the original path so we can restore it later.
    if (old_path === undefined) {
        old_path = existingPath;
    }


    log_debug(`existingPath: ${existingPath}`);

    // Check if existing PATH already has 
    const pathParts = existingPath.split(path.delimiter);
    if (pathParts.includes(customBinDir)) {
        log_info("Cody bin already in PATH");
        return customBinDir;
    }
    else {
        if (vscode.window.terminals.length > 0) {
            vscode.window.showInformationMessage(`${Config.cpAlias}: Open a new terminal instance to use Cody!`);
        }
    }
    
    // Use path.delimiter (':' on *nix) to separate paths
    newEnv.PATH = `${customBinDir}${path.delimiter}${existingPath}`;

    log_debug(`New PATH to be added: ${newEnv.PATH}`);
    
    // 5. Update the configuration for the current workspace
    // This will add the setting to .vscode/settings.json
    configuration.update(configSection, newEnv, vscode.ConfigurationTarget.Global).then(
        (result) => {
            log_info(`Cody successfully added to PATH for this workspace: ${result}`);
        },
        (error) => {
            log_error(`Cody failed to add to PATH for this workspace: ${error}`);
        }
    )

    return customBinDir;
}

/**
 * Remove Cody bin from PATH
 */
export function remove_from_path(context: vscode.ExtensionContext): void {
    if (old_path === undefined) {
        return; // Nothing to restore
    }

    const configSection = `terminal.integrated.env.${process.platform}`;
    const configuration = vscode.workspace.getConfiguration();
    const currentEnv = configuration.get<{ [key: string]: string }>(configSection, {});
    const newEnv = { ...currentEnv };

    log_debug(`Restoring PATH to: ${old_path}`);
    newEnv.PATH = old_path;

    configuration.update(configSection, newEnv, vscode.ConfigurationTarget.Global).then(
        () => {
            log_info("Successfully restored PATH.");
            old_path = undefined; // Clear the stored path after restoring
        },
        (error) => {
            log_error(`Failed to restore PATH: ${error}`);
        }
    );
}


/**
 * Finds the dynamic path to the VS Code Server remote CLI.
 * @returns The CLI path string, or undefined if not found.
 */
export function findVSCodeCliPath(context: vscode.ExtensionContext): string | undefined {
    const configSection = `terminal.integrated.env.${process.platform}`;
    const configuration = vscode.workspace.getConfiguration();

    // Get the current environment settings for the terminal, or an empty object
    const currentEnv = configuration.get<{ [key: string]: string }>(configSection, {});

    const currentPath = currentEnv.PATH || process.env.PATH || '';

    if (!currentPath) {
        return undefined;
    }
    
    // Split the PATH variable by the OS-specific delimiter (':' on *nix)
    const pathEntries = currentPath.split(path.delimiter);
    
    // Find the entry that contains the VS Code Server path signature
    const cliPath = pathEntries.find(p => 
        p.includes('.vscode-server') && p.includes('/bin/remote-cli')
    );

    if (!cliPath) {
        return prepend_path(context);   
    }

    return cliPath;
}