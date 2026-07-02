# Disable mouse and keyboard inputs for player from server

Source: https://help.pisignage.com/hc/en-us/articles/360012177871-Disable-mouse-and-keyboard-inputs-for-player-from-server
Keywords: security

If you would like to disable USB keyboard for the player, please issue the following command from the piShell against the player name.

 

echo 'SUBSYSTEMS=="usb", DRIVERS=="usbhid", ACTION=="add", ATTR{authorized}="0"' | sudo tee /etc/udev/rules.d/97-disablekb.rules

sudo reboot

 

After that keyboard and mouse won't work. To enable them again, please remove the file from piShell or ssh 

 

sudo rm /etc/udev/rules.d/97-disablekb.rules

sudo reboot
