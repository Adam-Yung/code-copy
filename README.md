# Copy From Terminal (cody)

<img src="images/cute_cody.png" alt="Extension Icon" width="150"/>

ℹ️ Forked from [Copy/Pipe From Terminal](https://github.com/babakks/vscode-copy-from-terminal)

ℹ️ Major changes to v0.2.0, **NO more flashing code executed on terminal startup!!**  See [Change log](CHANGELOG.md) for details!

### Copy from vscode's integrated terminal on any POSIX-compliant system, even over remote-ssh sessions!
![Capture](images/capture/cody_demo_v0.1.0.gif)

## Use **`cody`**

This is simply done by piping the output of any shell command to the **`cody`**
like:

```sh
ls ~ | cody
```


## Copy data to local clipboard

To copy data from the integrated terminal into your local machine's system clipboard, follow these steps:

1. Open a new integrated terminal (<kbd>Ctrl</kbd>+<kbd>`</kbd>).

2. Prepare the output stream you'd like to copy and pipe into to **`cody`**. For example something like this:

   ```sh
   ls -1 / | sort | cody
   ```


## Toggle ON/OFF

You can toggle ON/OFF the extension via the `Copy From Terminal: Toggle (Enable/Disable)` command. You can also do this via the settings UI or JSON file (`terminal-to-clipboard.enabled`).

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
