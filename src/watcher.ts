import * as fs from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

import { Config } from './config';

export type WatchEvent = { dir: string, filename: string };

export function makeWatcher(tmpdir: string): { watcher: vscode.FileSystemWatcher } {
    const watch_path_uri = new vscode.RelativePattern(vscode.Uri.file(tmpdir), '*.tmp');
    console.log(`Watching for changes in: ${tmpdir}, uri: ${watch_path_uri.baseUri}, pattern: ${watch_path_uri.pattern}`);
    const watcher = vscode.workspace.createFileSystemWatcher(watch_path_uri, false, true, true);
    
    return {watcher};
}
