# Gapless video play does not work

Source: https://help.pisignage.com/hc/en-us/articles/360021201272-Gapless-video-play-does-not-work
Keywords: ffmpeg, mpv

This feature uses "mpv" player along with hardware enabled ffmpeg. To make sure the libraries are upto-date, from terminal or ssh update the libraries and firmware as follows

 Also please note that this feature works only with SD card images 2.2.1, 2.1.x and 1.9.9x

sudo apt-get update
sudo apt-get upgrade -y
sudo rpi-update
sudo reboot
