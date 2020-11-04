# [InAppNotifications](https://1lighty.github.io/BetterDiscordStuff/?plugin=InAppNotifications "InAppNotifications") Changelog
### 1.0.9
- Fixed plugin not working from the great canary update plugin massacre.

### 1.0.8
- Fixed error on canary.

### 1.0.7
- Fixed not working.

### 1.0.6
- Changed to module.exports because useless backwards incompatbile changes are the motto for BBD apparently.

### 1.0.5
- Fixed settings not showing anything.
- Lowered the minimum WPM setting to be 50 instead of 300, for you slower readers. If the notifications go away too fast, just enable `Calculate timeout by number of words` and lower the `Words Per Minute` slider in settings.

### 1.0.4
- Fixed unparser erroring out and not calculating the timeout properly.

### 1.0.3
- Fixed notification sound not playing if Discord was focused.
- Large messages no longer go off screen.
- Added a timeout based on number of words, the WPM can be changed between **300** and **900**, or can be turned off entirely and let all notifications stay for 5 seconds.
- Added option to set the bar color to the authors top role color. Can be turned off.
- Added option of setting a custom bar color. If you want to change the background color of the notification, peek into XenoLib settings.

### 1.0.2
- Desktop notifications now don't show if Discord is focused, while in-app ones do.

### 1.0.1
- Emotes and custom emotes now show properly (not BD emotes tho lol)
- Changed title to show channel name and guild name instead of category

### 1.0.0
- In-app notifications will show when someone sends a message!
- It's tied to your notification settings of Discord, which can be accessed by right clicking a server, channel, or muting a DM.
