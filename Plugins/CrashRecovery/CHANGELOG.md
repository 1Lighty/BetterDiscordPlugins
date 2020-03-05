# [CrashRecovery](https://1lighty.github.io/BetterDiscordStuff/?plugin=CrashRecovery "CrashRecovery") Changelog
### 0.1.4
- Improved detection accuracy
- Added failsafe in case something goes wrong when: initializing, starting or when trying to display the recover button
- Added third step when trying to recover, as to not switch channels unless required, can be disabled in settings.
- Plugin is no longer experimental

### 0.1.3
- Fixed crash if XenoLib or ZeresPluginLib were missing

### 0.1.2
- Fixed crash screen being blank if a plugin failed to stop properly.
- Now closes all modals, including the special types that are not stored inside ModalStack.

### 0.1.1
- Fixed failing to recover from a crash if a plugin is preventing it.

### 0.1.0
- Initial release
- Should handle most crashes on its own.
