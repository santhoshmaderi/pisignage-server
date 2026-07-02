# Dual Display with PiSignage

Source: https://help.pisignage.com/hc/en-us/articles/21655587985433-Dual-Display-with-PiSignage

Players supported

Raspberry Pi Model
Dual Display Support

Raspberry Pi 4
[4.9.0/5.1.0]-legacy image or 
5.3.2 image

Raspberry Pi 5
5.3.2 image

Others
Not supported

- Dual Display is only supported on Raspberry Pi 4 and Pi 5.

- Please download the 5.3.2 image or the 5.1.0-legacy image from GitHub for your Raspberry Pi 4 to use the Dual Display feature.

- Please download the 5.3.2 image from GitHub for your Raspberry Pi 5 to use the Dual Display feature.

- In case you have a Raspberry Pi 4 running version 3.2.0 or others (Player1), please use the 5.3.2 image from GitHub to write to your SD Card.

 

Dual Display Configurations

Once the Image has been installed on your Pi, connect the 2 displays to your Pi.

The Dual display arrangement can be selected under Group settings. Reference Article Link HERE

You can configure the 2 displays according to

- Mirror configuration: The content from Display1 will be duplicated on DIsplay2

- Enable 4K: The content is shown only on the DIsplay connected to the primary HDMI interface and 4K mode is enabled. (Please note that 4K videos with h265 codec are only supported on the VLC media player)

- Tile configuration: Configure 2 displays to show different content.

- Tile Horizontal: Displays are placed one next to the other in Landscape mode
- Tile Vertical: Displays are placed one next to the other in Portrait mode

Note:

Click on Reverse Order under Group settings to reverse the content between HDMI-1 and HDMI-2

 

Playlist changes needed

In order to display content on both displays,

- Create a MultiZone playlist such as 2a, 2b, 2c and assign assets to the Main and Side Zones.

- The content assigned to MainZone plays on Display1 and the content assigned to SideZone plays on Display2.

Steps to debug and Things to remember

In order to debug issues in Dual displays, please help us with the following details in your support requests

- Issue the command xrandr from piShell send us the output [reference: https://help.pisignage.com/hc/en-us/articles/360001095632-Issue-shell-commands-or-connect-to-pi-terminal-]

- If the layout is a custom layout, make sure that you have assigned the assets to appropriate zones.
If you are using a custom-layout with main and side zones, ensure that your assets are not assigned to bottom or zone4/5/6

- TV_OFF is only supported on Primary display and not on the secondary display due to Raspberry Pi cec_client limitations.
