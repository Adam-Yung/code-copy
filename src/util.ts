import * as fs from 'fs';
import { window } from 'vscode';

export function ensureDirectoryExists(path: string) {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
}

export function escapeShell(cmd: string) {
    return cmd.replace(/(["'$`\\])/g, '\\$1');
}

const DEBUG = false; // Set to true to enable debug messages

export const log_info = (message: string) => {
    if (DEBUG) {
        window.showInformationMessage(message);
        console.log(message);
    }
};
export const log_error = (message: string) => {
    if (DEBUG) {
        window.showErrorMessage(message);
    }
};
export const log_debug = (message: string) => {
    if (DEBUG) {
        console.log(message);
    }
};