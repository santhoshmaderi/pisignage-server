# Disabling piPlayer  wifi access point from shell

Source: https://help.pisignage.com/hc/en-us/articles/360011523572-Disabling-piPlayer-wifi-access-point-from-shell

If you do not want piSignage player wifi access point and needs to disable the same without wifi configuration,  you could execute the following shell commands and reboot

 

sudo systemctl disable hostapd.service
sudo systemctl disable dnsmasq.service
sudo systemctl daemon-reload
sudo reboot
