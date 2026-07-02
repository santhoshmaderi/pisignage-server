# ctrl+n or f6 does not work in 1.9.9a image

Source: https://help.pisignage.com/hc/en-us/articles/360002616971-ctrl-n-or-f6-does-not-work-in-1-9-9a-image

Update: In the latest image (1.9.9aa) which has this issue corrected

 

in 1.9.9a image, ctrl+N or F6 does not work due to permission issues, here is a work-around to make it work. 

 

From the USB keyboard, press ctrl+alt+t to get a terminal window, (if video is playing please issue "pkill node;sudo pkill omx" to clear the video)

Issue the following command

chmod +x -R /home/pi/piSignagePro/misc/*

Now ctrl+n should work.

Thanks to Alessandro, for reporting the bug!
