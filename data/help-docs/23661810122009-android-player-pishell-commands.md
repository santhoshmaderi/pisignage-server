# Android Player PiShell Commands

Source: https://help.pisignage.com/hc/en-us/articles/23661810122009-Android-Player-PiShell-Commands

piSignage for Android is available at https://play.google.com/store/apps/details?id=com.pisignage.player2&hl=en-IN

 

To issue shell commands from the server

- Your Android Player should be online

- From the Players tab, open the piShell command screen by pressing >_ icon as shown

- You can issue certain shell commands from the prompt.

 

1) Player Logs: Issue the following command to get the last 200 player logs that could be helpful to debug issues.

tail -200

 

2) Restart piSignage Player 2.0 Android application: In order to restart the app, you can issue any of the following commands

restart
reboot
reload

 

3) Stop piSignage Player 2.0 Android application: You can issue any of the following commands to stop the piSignage app

stop
shutdown

 

4) Reset your piSignage application: In case you need to clear the media files and restart your piSignage application you can issue the following command

reset

 

5) View Assets: View the assets in the media directory by entering the following command

ls media
