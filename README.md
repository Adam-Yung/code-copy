# Terminal to Clipboard (cody)
## Forked from [Copy/Pipe From Terminal](https://github.com/babakks/vscode-copy-from-terminal)

Copy from vscode's integrated terminal to clipboard over remote-ssh sessions.  Forked from Babak K. Shandiz's Copy/Pipe From Terminal

![Capture](images/capture/cody_demo.gif)

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

ℹ️ I tried to hide the command using some ANSI terminal control codes, but it is not the most portable solution in the world (e.g. only works in xterm, and doesn't consider terminal size etc.)

## Toggle ON/OFF

You can toggle ON/OFF the extension via the `Terminal to Clipboard: Toggle (Enable/Disable)` command. You can also do this via the settings UI or JSON file (`terminal-to-clipboard.enabled`).

## Change alias name

ℹ️ You can change the alias to something other than **`cody`**, with the following:
![Capture](images/capture/cody_alias_demo.gif)


⚠️ **For now, this extension is just available for UNIX-compatible systems (Linux & macOS).**
