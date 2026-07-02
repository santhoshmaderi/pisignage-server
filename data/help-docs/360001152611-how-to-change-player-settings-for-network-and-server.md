# How to change player settings for network and server

Source: https://help.pisignage.com/hc/en-us/articles/360001152611-How-to-change-player-settings-for-network-and-server

By default Pi is configured to acquire network address from DHCP server via ethernet port. But you can configure static IP for Ethernet or configure wifi. 

Similarly by default player is configured to connect to pisignage.com server. You can change the server address to match your server. If you are using open-source server be sure to include :3000 at the end for port number.

You can configure server settings in number of ways. Use a method that suits your needs.

- Connect a USB keyboard and press ctrl+N or F6

-
Newer images come with wifi hotspot enabled with wifi name as "piplayer_xxxx" where xxxx is the last 4 digits of the player ID.

- Connect your phone or laptop to piplayer_xxxx wifi network. 

- From the browser goto url http://192.168.100.1:8000/settings

- For more details refer to blog article 

- If the player is connected to a local network use url http://{{ your player ip}}:8000/settings

- You can also ssh into pi player 

- Connect your smartphone via USB and enable USB tethering on your phone. Use the browser to connect to the url http://192.168.100.1:8000/settings
