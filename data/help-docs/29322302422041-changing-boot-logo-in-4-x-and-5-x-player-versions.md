# Changing boot logo in 4.x and 5.x player versions

Source: https://help.pisignage.com/hc/en-us/articles/29322302422041-Changing-boot-logo-in-4-x-and-5-x-player-versions
Keywords: customization

Starting 5.3.2 image, you could just add the boot logo as splash.png to /Volumes/bootfs directory of SD card from your laptop and piSignage will do changing of the boot logo

 

Player versions 4.x and beyond are based on newer OS versions of Raspberry and do not support bootup videos. Instead you can add a png image to show up during boot. Instructions to do the same are as follows.

 

- Create a boot-logo playlist with the boot-logo.png and deploy it to the group as the last scheduled playlist (additional playlist) so that the logo is copied to the player.

- Execute the following command

sudo cp /home/pi/media/boot-logo.png /usr/share/plymouth/themes/pix/splash.pngsudo plymouth-set-default-theme --rebuild-initrd pix &sudo cp /home/pi/media/boot-logo.png /home/pi/player2/public/img/pisignage-logo.png

3. You may have to wait for a minute or so for the command to complete.4. Reboot the player using the sudo reboot command
