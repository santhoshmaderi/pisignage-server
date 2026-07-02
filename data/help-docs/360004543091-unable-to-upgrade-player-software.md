# Unable to upgrade player software

Source: https://help.pisignage.com/hc/en-us/articles/360004543091-Unable-to-upgrade-player-software

In some cases, player software may not get upgraded, here are few causes

- Player needs to goto Internet for npm and package updates in addition to pisignage.com to get the software package, make sure proxy-settings allow that

- When player update is issued, if player is not online, the command is lost (you could check that in forever_out.log wherein you should see *updating pi software* line

- Check forever.log for any errors, if upgrade process has any issues it will be logged here

- If the upgrade process missed some packages or any piSignage software loading error it will be logged in forever_err.log. Then the software will roll back to the previous version

- If the forever.log says, , missing file piimage2-v6.zip, in your server data/releases directory (only in case of white-label and open-source server) issue "ln -s piimage-v2.0.0-v6.zip piimage2-v6.zip" to create a link

- Update the open-source version to latest commit (git pull origin master command in your pisignage-server directory)

- If your player version has ps2_7.8 string in version, it needs a new package to update to v2.0.0, issue the following commands from piShell before update

- sudo apt-get -y install libxtst-dev &

- sudo apt-get update --fix-missing &

- sudo apt-get -y install libxtst-dev &
