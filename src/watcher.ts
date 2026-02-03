import * as vscode from 'vscode';
import { log_info } from './util';

export function makeWatcher(tmpdir: string): vscode.FileSystemWatcher {
    const watch_path_uri = new vscode.RelativePattern(vscode.Uri.file(tmpdir), '*.tmp');
    log_info(`Watching for changes in: ${tmpdir}, uri: ${watch_path_uri.baseUri}, pattern: ${watch_path_uri.pattern}`);
    
    // Return the watcher. Command.ts will now manage its lifecycle.
    return vscode.workspace.createFileSystemWatcher(watch_path_uri, false, true, true);
}