# Player image customization

Source: https://help.pisignage.com/hc/en-us/articles/360023233371-Player-image-customization
Keywords: white label

You could customize player image for your specific needs wither for configuration or branding in number of ways.

1. Bootup video and welcome screen - You can upload your own assets to your account (using the same method Add files under Assets tab) and deploying to the groups. More details are available at https://help.pisignage.com/hc/en-us/articles/360001372931-Special-assets

2. Server and wifi configuration - You can download the SD card image and mount it on a laptop. The /boot partition is visible under your laptop OS. You can create a file name player-config.txt  under /boot partition and add the following lines.

You can auto-register the player using user_pin, installation, group and player_name fields. Under settings menu, enable auto registration feature and you will get a 6 digit ID next to that. Copy the same as user_pin.

 

Few comments

- Please do not add any comments in the file

- Server name if you need to configure a different server, not needed for pisignage.com

- All block are optional, but if present all fields are needed

- Generate pin and copy the same from your settings tab

- installation is same as your username

- Make sure to edit only in text editor so that no carriage return (^M) is added especially in Windows machine

server_name=piathome.com

country=IN
wifi_name="your-wifi-name"
wifi_password="your-wifi-password"
wifi_hidden=0

user_pin="123456"
installation="e2etest"
group="test"
player_name="QCast Player"
timezone="Asia/Calcutta"

3. Customizsed SD card image with your additional software for white label servers - Request for the base image at support@pisignage.com. With this image boot the Pi, add additional assets and software modules, run the supplied script and prepare your own image
