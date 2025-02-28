# Terminal to Clipboard (cody)

Copy from vscode's integrated terminal to clipboard over remote-ssh sessions.  Forked from Babak K. Shandiz's Copy/Pipe From Terminal


## Use **`cody`**

This is simply done by piping the output of any shell command to the **`cody`**
like:

```sh
ls ~ | cody
```


## Copy/Pipe data

To copy/pipe data from the integrated terminal into a new editor/tab, follow these steps:

1. Open a new integrated terminal (<kbd>Ctrl</kbd>+<kbd>`</kbd>).

1. Prepare the output stream you'd like to copy into VS Code and pipe into to **`cody`** (or **`tee2code`** if you wouldn't want to end the piping chain). For example something like this:

   ```sh
   ls -1 / | sort | cody
   ```

   or

   ```sh
   ls -1 / | tee2code | sort 
   ```

1. Now you'd see a new editor with the content you just piped.

ℹ️ You may see an unknown command (something like `_bp=...`) being executed in the newly opened terminal window. That's all OK. It's just the definition of a shell function named `cody` (and `tee2code`), which does the copy/pipe procedure. 🍏

## Toggle ON/OFF

You can toggle ON/OFF the extension via the `Terminal to Clipboard: Toggle (Enable/Disable)` command. You can also do this via the settings UI or JSON file (`terminal-to-clipboard.enabled`).

⚠️ **For now, this extension is just available for UNIX-compatible systems (Linux & macOS).**