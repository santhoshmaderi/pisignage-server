# How to troubleshoot network connectivity

Source: https://help.pisignage.com/hc/en-us/articles/360001280711-How-to-troubleshoot-network-connectivity
Keywords: online

Connecting to network is normally  straight forward and player connects to server over Internet once plugged into Ethernet or wifi network is programmed. 

If your network is not DHCP enabled, then you can program the Static IP parameters as provided by network/ISP administrator.

When the player is ready after bootup, a welcome screen is shown which displays network connectivity status as shown in the screenshot. Make sure

- The player IP address is properly assigned (not 169.254.177.128 which is USB tethering address)

- Make sure server name or address is correct and port number 3000 is mentioned in case of local server

- Firewall or proxy is correctly programmed to allow port 80 http traffic along with websocket traffic (on port 80 as well) from and to the player

- Note the server connectivity status should be "connected" (not waiting)

- Status of Network - Ethernet: UP, DNS:OK and DHCP: <proper ip address> are needed

Troubleshooting

 

- Connect to terminal of player using one of the methods mentioned in this article

- Issue commands ifconfig, iwconfig and other linux commands to see that addresses are available

- Look at /etc/network/interfaces and /etc/wpa_supplicant/wpa_supplicant.conf to make sure settings are correctly programmed (look for help from the Internet on Linux networking like https://www.tecmint.com/linux-network-configuration-and-troubleshooting-commands/)

- Look at the log using command tail -200 /home/pi/forever_out.log. There will be lines like the following. Note the error messages if any.

2 Mar 15:03:02 - info: starting socketio to pisignage.com

2 Mar 15:03:02 - info: socket.io: connected to server 3y2pPLWkRsnDaVtHNEGH

- Contact us at support@pisignage.com with the necessary logs for further help.
