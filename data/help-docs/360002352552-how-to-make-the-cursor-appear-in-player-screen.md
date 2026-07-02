# How to make the cursor appear in player screen?

Source: https://help.pisignage.com/hc/en-us/articles/360002352552-How-to-make-the-cursor-appear-in-player-screen

Note: This is not needed in 1.9.9 SD card image since it is removed already

 

You could edit /etc/lightdm/lightdm.conf file  and remove -nocursor word and reboot. Make sure you delete only the "-nocursor" word and not the line.

 

- cd /etc/lightdm

- sudo cp lightdm.conf lightdm.conf.orig

- sudo nano lightdm.conf

- Look for line 

xserver-command=X -nocursor -s 0 dpms

- Remove the -nocursor word and save
