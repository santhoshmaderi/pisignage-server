# Gap between display and displayed content

Source: https://help.pisignage.com/hc/en-us/articles/360001145111-Gap-between-display-and-displayed-content
Keywords: overscan, black border, full screen

Due to Overscan, you may see a black border for the content as shown in the image below. You can remove this by enabling overscan and adjusting overscan parameters found in /boot/config.txt. 

 

 

You can adjust the overscan parameters in multiple ways

A. Using webUI of Pi player at http://<pi_ip>:8000/settings

Enable the overscan and reduce the overscan values to reduce the border (or increase overscan values to get the content inside the display). Player will reboot and show the new adjusted display.

B. Directly edit the file /boot/config.txt

Modify the following parameters in the file, save and reboot.

 

# uncomment this if your display has a black border of unused pixels visible
# and your display can output without overscan
disable_overscan=1

# uncomment the following to adjust overscan. Use positive numbers if console
# goes off screen, and negative if there is too much border
overscan_left=40
overscan_right=40
overscan_top=20
overscan_bottom=20

C. From the server piShell issue "sed" commands 

Open the piShell (>_ icon next to the player name in players screen) and issue the following commands. Replay the value you want to give.

sudo sed 's/.*disable_overscan.*/disable_overscan=0/' -i /boot/config.txt

sudo sed -i -e 's/.*overscan_left.*/overscan_left=40/' -e 's/.*overscan_right.*/overscan_right=40/' -e 's/.*overscan_top.*/overscan_top=20/' -e 's/.*overscan_bottom.*/overscan_bottom=20/' /boot/config.txt

sudo reboot
