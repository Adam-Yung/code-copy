# Terminal to Clipboard (cody)

ℹ️ Forked from [Copy/Pipe From Terminal](https://github.com/babakks/vscode-copy-from-terminal)
ℹ️ Major changes to v0.1.0, fixing multi-window copying issues, moving notifications to status bar, and more!  See [Change log](CHANGELOG.md) for details!

### Copy from vscode's integrated terminal to clipboard on any POSIX-compliant system, even over remote-ssh sessions!
![Capture](images/capture/cody_demo_v0.1.0.gif)

## Use **`cody`**

This is simply done by piping the output of any shell command to the **`cody`**
like:

```sh
ls ~ | cody
```


## Copy/Pipe data

To copy/pipe data from the integrated terminal into a new editor/tab, follow these steps:

1. Open a new integrated terminal (<kbd>Ctrl</kbd>+<kbd>`</kbd>).

2. Prepare the output stream you'd like to copy into VS Code and pipe into to **`cody`**. For example something like this:

   ```sh
   ls -1 / | sort | cody
   ```

ℹ️ You may see an unknown command (something like `_bp=...`) being executed in the newly opened terminal window. That's all OK. It's just the definition of a shell function named `cody` (and `tee2code`), which does the copy/pipe procedure. 🍏

ℹ️ I tried to hide the command using some ANSI terminal control codes, but it is not the most portable solution in the world

## Toggle ON/OFF

You can toggle ON/OFF the extension via the `Terminal to Clipboard: Toggle (Enable/Disable)` command. You can also do this via the settings UI or JSON file (`terminal-to-clipboard.enabled`).

## Change alias name

ℹ️ You can change the alias to something other than **`cody`**, with the following:
![Capture](images/capture/cody_alias_demo.gif)

## Build it yourself

1. Download the required packages
In the cody repository, assuming you have **`npm`** installed, run the following

   ```sh
   npm install
   ```

2. Generate the out files
   
   ```sh
   vsce package
   ```

3. Press F5 in VSCode with [extension.ts](src/extension.ts) open in editor, and choose **`VSCode Extension Development`**

⚠️ **For now, this extension is just available for UNIX-compatible systems (Linux & macOS).**
