# [SaveToRedux](https://1lighty.github.io/BetterDiscordStuff/?plugin=SaveToRedux "SaveToRedux") Changelog
### 2.0.7
- Fixed "Disable this warning and save this option" not saving the option when a file was conflicting
- Corrected "Save As..." showing "Images" as file type even if it wasn't an image
- Added option to append server or DM recipients name to downloaded images/files. Also as a custom option named `name` (how creative)

### 2.0.6
- Updated image detection
- Fixed emotes not saving as their name
- Added support of saving group DM icons (needs XenoLib v1.3.4)
- Added option to save server and user icons by their respective names instead of randomized (on by default)

### 2.0.5
- Fixed steam image links and similar, failing silently

### 2.0.4
- Fixed saving things with multiple dots having the wrong extension
- Fixed steam images, and similar not be saveable
- Added extension detection for those links as well
- Added safety features, so it will only download from proxy if the domain is untrusted. Will warn you about it if the only way to download the image is thru a direct link.
- The file type is now set properly, so Windows users that use Save As.. feature a lot don't have to worry about preserving the extension, as Windows handles that for you, unless you select the file type as All Files (*.*)

### 2.0.3
- Saving pictures from steam now works properly

### 2.0.2
- Plugin has been renamed to SaveToRedux to avoid issues loading due to the original plugin, as well as to be able to distinguish between the two more easily.
- Changed update URL

### 2.0.1
- Fixed settings likely being overriden or breaking completely due to issue with settings migration and/or loading
- Fixed funny behavior if you toggled the plugin

### 2.0.0
- Fully fixed up context menus, they should no longer cause your discord to freeze at random
- Fixed Tenor and Giphy issues
- Fixed not being able to save extensionless files
- Fixed not being able to save custom status emotes and some other images
- Random characters length can now be changed to anything you desire
- Any error messages that might appear will show more verbose info

### 1.1.3 & 1.1.4
- Fixed Discord freezing/crashing when right clicking any text area.

### 1.1.2
- Changed Save As... in folders to show a modal where you simply input the name.
- Fixed not being able to save reactions.
- Fixed incompatibility with MLv2.

### 1.1.0 & 1.1.1
- Fixed plugin not working due to context menu update.
- You can now save most file types properly.
- Saving image, video or audio direct links now works.
- Fixed multitude of crashes related to URL parsing, also added failsafe to prevent further crashes.'

### 1.0.8
- Fixed not working on Discord PTB due to electron update.

### 1.0.6 & 1.0.7
- Fixed not being able to save certain custom emotes.
- You were not allowed to save animated emojis...

### 1.0.5
- Fixed saving with incorrect extension if filename has multiple dots in it.

### 1.0.4
- Fixed console spam.

### 1.0.3
- Added ability to save reactions.

### 1.0.2
- Added existing file options (overwrite, append number, append random).
- Fixed certain embed images/videos being saved with no extension or as .undefined which can be an issue on Windows.

### 1.0.1
- Fixed random logging spam in console.'

### 1.0.0
- Initial release
