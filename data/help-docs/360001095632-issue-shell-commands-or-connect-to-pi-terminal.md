# Issue shell commands or connect to pi terminal 

Source: https://help.pisignage.com/hc/en-us/articles/360001095632-Issue-shell-commands-or-connect-to-pi-terminal
Keywords: ssh, piShell, USB keyboard

A. You can connect to Pi Terminal in 2 ways.

-
Note Down the IP address from welcome screen. From the local network of the Pi, use "putty" in Windows or ssh in Linux/Mac machines to connect. The default username and password is "pi" and "pi" which can be changed under pisignage.com/settings screen. e.g. ssh pi@192.168.0.163

- Connect a USB keyboard and press ctrl+alt+t to open the terminal. If a video is playing in front, type blindly  pkill node;sudo pkill omx;

B. To change network/server settings, connect USB keyboard and press ctrl+N (or F6) 

C. To issue shell commands from server

- Player should be online

- From the players screen, open piShell command screen by pressing >_ icon as shown

- You can issue shell commands from the prompt.

- Files can be edited using "sed" commands.
