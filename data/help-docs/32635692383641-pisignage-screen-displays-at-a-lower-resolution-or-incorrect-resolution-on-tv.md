# piSignage screen displays at a lower resolution or incorrect resolution on TV

Source: https://help.pisignage.com/hc/en-us/articles/32635692383641-piSignage-screen-displays-at-a-lower-resolution-or-incorrect-resolution-on-TV

In earlier releases of Raspberry OSs (before 2022, Legacy and FKMS stacks ) Pi uses the firmware in the VideoCore graphics processor to check for HDMI presence and properties. By contrast, KMS uses an entirely open source, ARM-side implementation. 

This means the code bases for the two systems are entirely different, and in some circumstances this can result in different behaviour between the two approaches.

Hence the display is not of correct resolution in 5.x.x release players, please update to the latest version available. 5.1.5 onwards /boot/firmware/cmdline.txt is programmed with the following to make sure to drive HDMI always with 1920x1080 resolution irrespective of cable or TV is off.

 

video=HDMI-A-1:1920x1080M@60D    vc4.force_hotplug=1

 

Specific TV Resolution

If you want a specific EDID property of a TV to be followed, you could copy the EDID file when the TV is connected and powered on before Pi as follows and use the same EDID always

 

- sudo cp /sys/class/drm/card?-HDMI-A-1/edid    /lib/firmware/myedid.dat

-
Edit /boot/cmdline.txt, making sure to run your editor using sudo, and add the following to the kernel command line at the end after removing  video=HDMI-A-1:1920x1080M@60D 

drm.edid_firmware=myedid.dat

 

Reference (and for more details please refer):  Troubleshooting KMS HDMI output
