# Restarting player at specific times

Source: https://help.pisignage.com/hc/en-us/articles/360001413331-Restarting-player-at-specific-times

piSignage player is built to run reliably and many installations run piSignage players without rebooting for months. 

However, if you have need to reboot player everyday at specified time (for e.g. if you are showing a heavy JS website which Pi is not able to handle), you can add "sudo reboot" command to cron job (many articles like this are available on the net on cron job).

Similarly, pi Player can be powered off without shutdown command under normal circumstances.  But to give shutdown command from the server before switch, you can issue "sudo shutdown -h now"
