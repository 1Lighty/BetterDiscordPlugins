# [BetterImageViewer](https://1lighty.github.io/BetterDiscordStuff/?plugin=BetterImageViewer "BetterImageViewer") Changelog
### 1.3.9
- Fixed incorrect positioning of the image on canary

### 1.3.8
- Fixed zoom snapping sometimes. (Thx Murmurs for reporting this)

### 1.3.5, 1.3.6 && 1.3.7
- Fixed text being hard to read in light mode.
- Fixed plugin causing client crash.
- Fixed plugin *not* expecting a crash.
- Fixed an anomaly bug if you clicked on a non hit image in search results, and now instead goes thru all images in search results.
- Fixed using incorrect modals.
- Fixed load warning because of Zeres nonsensical changes of trying to force to use module.exports

### 1.3.4
- Fixed image zoom.

### 1.3.3
- Fix search API error.

### 1.3.2
- Fixed zoom jitter if movement smoothing is disabled.

### 1.3.0 && 1.3.1
- Fixed images being clipped at the bottom if there isn't enough screen height.
- Fixed image zoom jitter when changing zoom level, or changing lens size.
- Fixed error being thrown when you update the plugin and don't switch channels before opening an image.
- Fixed some objects and strings escaping to the DOM tree.
- Fixed possible Discord crashers.
- Fixed sometimes getting locked in place if you opened an image but there is only 1 image available, and search not triggering.
- Fixed forward search being jank and skipping tons of messages, or not working well at all.
- Improved image zoom performance (hopefully).
- Plugin should now inherit search options. Say you search for `from:Lighty` and you open an image from the search results, the plugin will inherit that option so when you navigate between the images, it will only display images that match those search options.

### 1.2.4
- Fixed image info being black.

### 1.2.3
- Fixed startup error.

### 1.2.2
- Fixed jpeg images having their EXIF rotation applied when you tried to zoom. (Thank you person that reported this issue on my server, you know who you are <3)

### 1.2.0
- Image previews will take up as much space as possible, larger images will be easier to view.
- Image pixel will always be the same size as a physical pixel, this means all images will look sharp no matter what scaling your Discord (and system) is set to. Unless the image has been downscaled.
- Added a way to load the images at full resolution instead of downscaled.  
**Pro tip**: don't fucking enable this, you *WILL NOT* notice a god damn difference. You can also force it to load the full res by *CTRL + CLICK*ing the preview. When it's loading the full res image, the first resolution at bottom right will turn red.

### 1.1.3
- Fixed not picking up embeds with multiple images
- Added workaround for a rare patching error

### 1.1.2
- Improved performance when smoothing is disabled

### 1.1.0 & 1.1.1
- *SOME* people kept asking, so here you go.
- Added image zoom, simply activate by click and holding on the image.
- Use scroll wheel to zoom in and out, hold shift while scrolling to change lens size.
- If you prefer using a different plugin to handle zooming for you, that's fine too, there is a toggle to disable it in settings.
- The click and hold can of course be easily changed in the settings to your prefered method of zooming.
![zoommode](https://i.imgur.com/A8HjQb9.png)
- There are other options too, for those that may want it!
![moreoptions](https://i.imgur.com/JGNe7Re.png)'
- Fixed breaking videos, lmao
### 1.0.4
- Fixed plugin refusing to work in PTB and canary

### 1.0.3
- Fixed some class issues making the authors name and send time not looking fancy

### 1.0.2
- Fixed plugin throwing a fit if image size was 1x1
- Fixed some class issues making the authors name and send time not looking fancy

### 1.0.1
- Nav buttons and info are now an overlay which means, fixed an issue from a certain trash plugin from a certain bad developer of who we do not speak of.

### 1.0.0
- Initial release
