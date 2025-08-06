import * as vscode from 'vscode';
import { log_info } from './util';

export function makeWatcher(tmpdir: string): vscode.FileSystemWatcher {
    const watch_path_uri = new vscode.RelativePattern(vscode.Uri.file(tmpdir), '*.tmp');
    log_info(`Watching for changes in: ${tmpdir}, uri: ${watch_path_uri.baseUri}, pattern: ${watch_path_uri.pattern}`);
    
    // Create and return the watcher directly.
    // The event listeners for 'onDidCreate' are now in command.ts.
    // We only create the watcher here. The options prevent watching for changes and deletions.
    return vscode.workspace.createFileSystemWatcher(watch_path_uri, false, true, true);
}