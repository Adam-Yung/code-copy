
# Change Log
All notable changes to CODY will be documented in this file.

## [0.2.0] - 10/07/2025
  
Cody is in BETA
 
### Changed
- Dynamically add cody script to vscode server's bin, eliminating obnoxious and unsafe flashing code on terminal startup, and remove dependency on volatile aliases 
- Significant refactoring of extension code

### Fixed
- Cody disappears due to shell refreshing
 
## [0.1.0] - 29/04/2025
  
First major release of Cody out of alpha 😁
 
### Added
- use statusbar on right side to display copied message (Can be configured in settings to default back to original infomessage)
 
### Changed
  
- use VSCode's built in FileSystemWatcher
- use POSIX compliant tmp folder to store the temporary files generated by cody

### Fixed
 
- fix multi-window copying issue