# Group Settings 

Source: https://help.pisignage.com/hc/en-us/articles/360001234431-Group-Settings
Keywords: set, disable

There are a number of properties of players which can be controlled by configuring Group settings. All the settings defined here take precedence over player WebUI settings. Here are descriptions of them. 

1. Resolution - Define the resolution for the players associated with the group. The player will reboot and configure it accordingly.

2. Orientation - Define the screen orientation at the hardware level.

- The orientation defined at the playlist layout level works based on CSS and will not work for webpage-type links, logos, emergency message, and clock widgets.

- In portrait mode, there could be a black border(gap) appearing. You can remove the border by adjusting overscan values in the player WebUI.

3. Dual Screen options - Define the screen arrangement in case 2 Displays are connected to your device. [ Note: Only available for  Raspberry Pi 4 running player version 4.7.2+ ] 

-
Mirror screens: Content displayed on the Primary display will be mirrored onto the Secondary display.

-
Enable 4K: The display connected to the HDMI-1 interface will operate in 4K mode.

-
Tile Horizontal: The displays are connected one next to the other horizontally.

-
Tile Vertical: The displays are connected one above the other vertically.

-
Reverse Order: Toggling this will interchange the content shown on the Primary and Secondary display.

4. Animation - You can select an SVG-based animation for the image and notice transitions. Since Pi has limited processing power, animations may not be at their best.

5. Screen Background - You can select a CSS color code to define the screen background. The default is black.

6. Display Logo - You can display a png image as a logo at the selected position on top of the signage content.

7. Clock widget - You can display the clock widget either in 24-hour or 12-hour format on the top-right or bottom-right corner.

8. URL caching and Reloading - Depending on your use case you can enable the cache for the URL by selecting "Keep webpages in memory" or reload each time by selecting the "Reload link URLs each time" option.

9. Stretch Image to full screen - Select this option so that the image is stretched to fullscreen, otherwise, it will be shown based on the aspect ratio and size.

10. Stretch Video to full screen - Select this option so that the video is shown in fullscreen, otherwise, it will be shown based on the aspect ratio and size.

11. Volume - Select the Video and Audio volume in terms of percentage (default is 100%)

12. Stop video to show adverts - You can stop the video after a programmed number of seconds to show adverts and then continue.

13.  Schedule TV ON and OFF -  To schedule TV ON and OFF every day select the enable option. There may be a delay of up to 5 minutes.

For finer upto-minute accuracy and more scheduling options use TV_OFF playlist scheduling under Group instead of this.

14. Deploy Daily: This option can be enabled if the "Deploy" message has to be sent by the server daily at a particular time.

15. Reboot Players Daily: [optional and not needed] Set a time at which the Player is required to reboot daily.

16. Kiosk Menu: Show a Webpage when the Mouse connected to the player is clicked when this is Enabled.

-
URL: URL of the webpage that has to be shown

-
Inactivity timeout: The time after the last Mouse click after which the player starts playing the scheduled playlist. ( example use case: If the end user does not interact with the webpage using the mouse after 5mins, then the Default/Scheduled playlist will resume)

17. Video Player: Choose the Video player

-
Default: Player version 4.x.x, the default Video player is Chromium Browser. In the rest, it is Omxplayer

-
MPV: Can be Enabled to play YouTube streams overriding the default player.

-
VLC: [Experimental] Can be used to play 4K videos in players with version 4.x.x
