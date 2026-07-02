# Video is not playing full screen or getting cropped

Source: https://help.pisignage.com/hc/en-us/articles/360001415171-Video-is-not-playing-full-screen-or-getting-cropped
Keywords: custom display

The TV resolution is obtained through HDMI interface. If the TV resolution does not match the set resolution under Group Settings, the video will not be played fullscreen. You can either

- Edit the /boot/config.txt hdmi_mode and hdmi_group parameters to match your display as described in this support article

- change the TV settings to match the piSignage settings

-
Map the video resolution to that of display resolution and have pi Player resolution bigger than that. Select the custom video window parameters under layout popup to that of display resolution
