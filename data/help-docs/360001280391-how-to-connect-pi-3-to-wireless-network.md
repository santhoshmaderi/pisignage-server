# How to connect Pi 3 to wireless network

Source: https://help.pisignage.com/hc/en-us/articles/360001280391-How-to-connect-Pi-3-to-wireless-network
Keywords: wifi

You can program the wifi access point name and password in one of the following ways

- If you are using 1.9.7 or higher image SD card, it acts as a wifi access point till the first configuration. Connect your laptop to the access point "piplayer_xxxx" (where xxxx is the last 4 digits of the player ID). Once connected, you can goto http://192.168.100.1:8000/settings to configure the wifi and other player settings. For more details refer to this blog article

- Connect a USB keyboard to Pi Player and press ctrl+N

- If the player is connected to a local network, you could goto player settings at http://<player ip>:8000/settings

- You can also use USB tethering by connecting smartphone to Pi via USB. 

- For advanced wifi options and disabling internal wifi, see this blog article
