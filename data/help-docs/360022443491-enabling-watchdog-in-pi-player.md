# Enabling watchdog in pi player

Source: https://help.pisignage.com/hc/en-us/articles/360022443491-Enabling-watchdog-in-pi-player
Keywords: hang, reboot

A watchdog timer  is used to detect and recover from computer malfunctions. If the load on the CPU is exorbitantly high, the watchdog timer reboots itself. piSignage does not enable watchdog by default and this article explains how to enable the same.

For this to work, piSignage SD card image has to be 1.9.9 or above, you can check the same using 

cat /etc/os-release

The output should contain the name "stretch" in the first line

 

1. Edit the /boot/config.txt file  using any editor, for e.g.

sudo nano /boot/config.txt

Add the following line 

add dtparam=watchdog=on

2. Install and enable linux watchdog package

sudo apt-get install watchdog
sudo systemctl enable watchdog

3. Edit the configuration file to put the desired condition (https://linux.die.net/man/5/watchdog.conf)

sudo nano /etc/watchdog.conf

- Uncomment the line that starts with #watchdog-device by removing the hash (#) to enable the watchdog daemon to use the watchdog device.

- Uncomment the line that says #max-load-1 = 24 by removing the hash symbol to reboot the device if the load goes over 24 over 1 minute. A load of 25 of one minute means that you would have needed 25 Raspberry Pis to complete that task in 1 minute. You may tweak this value to your liking.

4. To test whether watchdog is working

Create a file test.py  with following content. and run "python test.py". Pi will reboot in a minute.

 #/bin/python
 #fork_bomb.py

 import os

 while True:
 os.fork()
