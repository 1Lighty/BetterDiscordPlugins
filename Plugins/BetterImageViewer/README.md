# BetterImageViewer [![download](https://i.imgur.com/OAHgjZu.png)](https://1lighty.github.io/BetterDiscordStuff/?plugin=BetterImageViewer&dl=1 "BetterImageViewer")
Move between images in the entire channel with arrow keys, zoom into the image by click and holding, scroll wheel to zoom in and out, hold shift to change lens size. Image previews will look sharper no matter what scaling you have, and will take up as much space as possible.
### Features
Adds left and right arrows when you open an image, shows you who sent the image and when, the images resolution, scaling and size, as well as number of cached images (and estimated in channel total).  
Can switch between images in the entire channel using the on screen buttons, or arrow keys.  
Click the users name to jump to the message containing the image.  
Right click the navigation buttons to quick jump to the last (or first) image.   
Click and hold (or other) to zoom into the image.  
Use scroll wheel to change zoom level.  
Hold shift and use scroll wheel to change zoom lens size.  
Hold ctrl and click the image to load the full resolution version.
### Preview
![preview](https://i.imgur.com/YlSQQ3y.png)  
![preview2](https://i.imgur.com/ybHUbto.png)  
![preview3](https://i.imgur.com/uDqukuw.png)
### Settings
#### UI settings
##### Show image index and number of images left (estimated)
Shows **Image x of y (~z)**, where **x** is current image, **y** is total number of cached images and **z** is estimated total number of images in whole channel.
##### Show navigation buttons
Show the < and > buttons
##### Show image resolution
##### Show image scale
Left is % of original resolution, where right is % downscaled.
##### Show image size
##### Always load full resolution image
You won't notice a difference. You can also force it to load the full resolution image by ctrl + clicking the image preview. the first resolution on bottom right will turn red when it's enabled.
#### Behavior settings
##### Use search API
Without this, you'll only be able to view images currently cached in Discord.
##### Trigger search when hovering over navigation buttons when needed
Sometimes, if there's under 5 images left, it will wait for you to press the correct arrow key, or hover over the navigation button itself, once you do that it searches for more images. Setting this to false simply makes it only do that when you click the button instead of hover it.
#### Image Zoom settings
##### Enable image zoom
##### Zoom enable mode
Click and hold  
Click to toggle  
Scroll to toggle
##### Anti-aliasing
On low resolution images, pixels become blurry
#### Round lens
#### Allow lens to go out of bounds
Allows the lens to go beyond the border of the image
#### Movement smoothing
Not recommended to disable. Smooths out movement and zoom
