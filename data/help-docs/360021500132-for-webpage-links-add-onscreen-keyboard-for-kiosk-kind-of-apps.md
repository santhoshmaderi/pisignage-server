# For webpage links add onscreen keyboard  (for kiosk kind of apps)

Source: https://help.pisignage.com/hc/en-us/articles/360021500132-For-webpage-links-add-onscreen-keyboard-for-kiosk-kind-of-apps

You can enable onscreen keyboard using any one of the chromium extensions from chrome store, for e.g.

 

1. From the ssh terminal issue the following command

chromium-browser --user-data-dir=/home/pi/.config/chromium/weblink https://chrome.google.com/webstore/detail/virtual-keyboard/pflmllfnnabikmfkkaddkoolinlfninn

OR

Under assets, create a webpage link by name "chrome store", type:webpage and link address

https://chrome.google.com/webstore/detail/virtual-keyboard/pflmllfnnabikmfkkaddkoolinlfninn

Deploy a playlist with this link to be displayed on the screen

2. With a mouse click on the add extension button on the screen

3. reboot the player

Note: By default extensions do not run in "incognito" mode. So please uncheck "Reload link URLs each time"  option under Group settings for the keyboard to work
