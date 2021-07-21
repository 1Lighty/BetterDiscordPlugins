# [MessageLoggerV2](https://1lighty.github.io/BetterDiscordStuff/?plugin=MessageLoggerV2 "MessageLoggerV2") Changelog
### 1.7.73
- Fixed toolbar icon disappearing and use react for it
- Add a brand new toolbar icon to fit discord's look
- Fix logs modal

### 1.7.68
- Fixed on canary.

### 1.7.67
- Implemented fixes that allow patches to work properly on canary using Powercord. AKA plugin works now.

### 1.7.65 && 1.7.66
- Implemented fixes that allow patches to work properly on canary using Powercord.

### 1.7.64
- Fixed settings not working
- Fixed some periodic lag spikes

### 1.7.63
- Fixed forgetting to remove a console.log
- XSS fix by [clv](https://github.com/clv-2) on GitHub

### 1.7.62
- Fixed not logging replies.

### 1.7.61
- Fixed plugin not working from the great canary update plugin massacre.

### 1.7.60
- Fixed some issues related to extremely poor decision making in the powercord "injector" aka patcher, `Failed to patch message components, edit history and deleted tint will not show!` *should* no longer show up and instead work as intended.

### 1.7.59
- Fixed deleted messages sometimes zapping your pfp (and sometimes others)
- Fixed logger sometimes locking up Discord when opening a channel
- Fixed some deleted messages not always showing in chat (they do now, no matter what, even ones that didn't before)

### 1.7.58
- Fixed not working on canary

### 1.7.57
- Fixed not working

### 1.7.56
- Fixed not working on canary

### 1.7.55
- Bruh. Gitlab sux, moved plugin to github.

### ??? - ???
- Unknown changes

### 1.5.2
- Added option to disable the Open logs button
- Fixed channels not loading if bots aren't ignored and a bot deletes its own message that contains an embed.

### 1.5.1
- Added Open logs button in toolbar next to Member List. Clicking it opens the menu, rightclicking it opens the filtered menu
- Added global NSFW channel ignore toggle, whitelist and log selected channel override this.
- Added Changelog, Stats to show some simple stuff (will be expanded later on) and Donate buttons to settings
- Fixed uncaught error on dead image links
- Fixed image caching failing on dead network or some other unknown issue
- Fixed issue in menu where you could only click on a persons profile on one message only
- Fixed hiding/unhiding a delete message not immediately working in chat
- Clicking a toast also dismisses it immediately, middle clicking a toast only dismisses it without doing anything else
- Sorted settings page into something usable
- Expand Stats modal to show per server and per channel stats, also show disk space usage.
- Help button in settings
- Extensive help for all functions of the logger, both in the menu and settings. Some things are rather hidden.

### 1.5.0
- Added image caching. If a link of an image expires, you'll still have a local copy of the image. In its place will be a small thumbnail of the image and clicking on it will open it in your default image viewer. The reason it's like this is because it's a limitation of Discord and the only simple workaround will slow down a client to a halt.
- Added context menu options for entire message groups, accessible by rightclicking the timestamp
- Fixed image related context menu options not working too well when multiple images are sent in one message
- Delete + click now works on images
- Copy to clipboard/Save to folder should work more reliably due to image caching
- Images that failed to load but still exist no longer get flagged as bad/expired images internally. They might still show as bad but reopening the menu or changing tabs should make the image load.

### 1.4.??
- Fixed bad images not being saved properly
- Fixed menu loading error only showing for 1 second

### 1.4.23
- Fixed conditional bug related to a chat being opened but logger not detecting it and failing
- Fixed keybinds not working after unsuspend/wake up from sleep/probably hibernate too

### 1.4.22
- Fixed download missing library dialog not working.

### 1.4.21
- Added self install script for clueless users
- Fixed keybinds not working after unsuspend/after a while
- Fixed improper sorting in menu for edited messages
- Fixed minor caching issue regarding edited and deleted messages
- Fixed opening an image that does not exist resulting in infinite loading.
- Dropped Metalloriffs method of saving in favor of something less extreme. The chance of a corrupted data file, or general lag should decrease.

### 1.4.20
- Added hold Delete and click on message in menu to delete it
- Added option to delete only one of the edits
- Added check for outdated Zeres Plugin Library to avoid any issues in the future
- Added option to show ghost pings either because the message was deleted, or because the user edited the message no longer tagging you
- Fixed hiding edited messages bugginess
- Fixed bugged messages breaking everything
- Fixed improper sorting in menu for edited messages
- Fixed improper times shown in menu for edited messages
- Fixed messages hiding if you delete one that was shown after pressing the LOAD MORE button
- Fixed images not showing in order relative to other messages
- Fixed deleted messages context menu having redundant buttons
- Fixed jumping to a message erasing its edits and deleted color
- Fixed Clyde not being ignored. Thought he could have friends? Lol.
- Clicking a message in the menu sent tab will jump to the message
- Rightclicking a toast jumps to the message


### 1.4.19
- Fixed keybind resetting if filtered log keybind isn't set
- Fixed messages disappearing if show deleted message count is disabled

### 1.4.18
- Fixed some major bugs

### 1.4.17
- Fixed images not showing at all in menu

### 1.4.16
- Added option to not restore messages after reload
- Fixed not working with normalized classes disabled

### 1.4.15
- Bots now have a tag in the menu
- Fixed blacklist/whitelist being a big fat potato
- Some stuff has been optimized
- Edited messages and deleted messages now show instantly when switching channels
- Added option to ignore blocked users
- Added seperate options for displaying deleted, edited and purged messages in chat
- Seperated guild and DM toasts for sent, edited and deleted
- Fixed "Show date in timestamps" affecting menu
- Edited messages and deleted messages now show instantly when switching channels

### 1.4.14
- Fixed clear button not working

### 1.4.12 && 1.4.13
- Added user context menu options
- Added individual blacklist and whitelist
- Added "Only log whitelist" option
- Fixed settings page showing wrong menu sort direction
- Fixed being rate limited when opening the menu
- Fixed hidden messages showing again after reload
- Fixed hiding a deleted message making others not show as deleted anymore
- Fixed deleting a bot message with embed breaking everything
- Fixed single key keybind being borked after reload
- Data file should be cleaned more thoroughly resulting in a way smaller data file size and faster general operation
- Added forced save to autobackup so it's not infinitely stalled by edits or deletes, so chances of a 100% restore are higher
- ACTUALLY fix deleted bot messages with embeds breaking everything

### 1.4.11
- Fixed accidentally logging deletion of system messages, aka user join messages etc
- Fixed and improved some specific filter searches in the menu
- Fixed spamming discord servers with user profile requests causing issues
- Fix loading error in ghost pings tab

### 1.4.10
- Fixed accidentally logging deletion of system messages, aka user join messages etc
- Fixed and improved some specific filter searches in the menu
- Fixed spamming discord servers with user profile requests causing issues
- Improved menu performance when loading

### 1.4.8 && 1.4.9
- Fixed random crash/freeze related to bad data causing an infinite loop
- Fixed changelog omegalul

### 1.4.7
- Added context menu options for images in the menu
- Fixed filter input randomly losing focus
- Fixed some profiles not opening in the menu if no channel is selected
- Fixed editing bug
- Fixed breaking profile pictures in discord in general
- Fixed lag while typing in the filter input
- Added detection of a failed menu load
- Toasts last longer so you have time to read and click them
- Clicking a toast while the menu is open, opens the relevant tab
- Toasts and menu should more accurately show where the message is from
- Pressing menu tabs should generally feel more responsive

### 1.4.6
- Fix missing entry bug in menu

### 1.4.5
- Toasts are now clickable
- Added menu render limit to avoid lag loading thousands of messages
- Traded massive client crash bug for a slight editing bug until a fix is made
- Fixed menu profile pictures not showing sometimes
- Fixed deleted images causing jitteriness
- Fixed menu sent tab not displaying anything 👀
- Fixed incorrect sort direction in sent tab
- Fixed possible crash in menu
- Fixed unneeded things like joins, leaves, group name changes etc being logged as messages

### 1.4.4
- Context menus now exist, you can add/remove guilds/channels from whitelist/blacklist, open menu, hide and unhide deleted messages or edit history of a message.
- Adding a channel or guild on whitelist while having log type set to all will make it ignore guild/channel ignores
- Menu opens and now closes with bound keys.
- Fixed menu opening in settings

### 1.4.2 && 1.4.3
- Patch posibility of an empty entry in data causing menu to not show anything

### 1.4.1
- Fixed whitelist/blacklist not working, again

### 1.4.0
- Modal based menu was added. Accessible via default keys ctrl m or ctrl alt m
- Plugin now manages data properly instead of letting it go loose and possibly make a massive data file
- More corruption protection
- Edit timestamps should be precise instead of only having hour and minute, an option to toggle between having dates and not having dates in edited tooltip will be added soon
- More options in the menu
- More customization
- More options around the place like blacklisting/whitelisting servers/channels or users

### 1.3.4
- Fixed other plugins loading ZLib with no EmulatedTooltip breaking stuff
- Fixed editing a message back to original not doing working

### 1.3.3
- Disabled relative IDs warning until a fix is implemented

### 1.3.2
- Fixed toast toggles not saving

### 1.3.1
- Badly written BDFDB library should no longer crash discord

### 1.3.0
- Data storage and caching has been reworked, discord should no longer frezee when there is a large quantity of saved messages
- Error messages in console are now detailed

### 1.2.1
- Fixed ZLibrary download requirement being extremely user unfriendly

### 1.2.0
- Changed library from NeatoBurritoLibrary to Zeres Plugin Library
- Updater now works
- Changelog now looks fancy af

### 1.1.0
- Add auto data backup option, logged messages are kept even if data file is corrupted.
- Add option to not save data at all, all logged messages will be erased after reload/restart.
- Fix plugin breaking if you load it while not being in a channel.
- Make aggressive message caching work better. You should see 'Failed to ger relative IDs' less often.
- Auto self fix for corrupted data or settings file, plugin should work even if both files become empty.


### 1.0.0
- Release
- Deleted messages load back in after reload.
- Built-in protection against abusive themes.
- Aggresive message caching, on load fetches messages from a bunch of channels that have deleted or edited messages in them, same applies if a message is edited or deleted in an uncached channel.
- Toggle dates in timestamps live.
- Toggle deleted messages or edit history in chat live.
- Toggle showing purged messages live.
- Fix cancelling editing a message not showing edit history.
