# Connectivity needs for the player (firewall)

Source: https://help.pisignage.com/hc/en-us/articles/360001153051-Connectivity-needs-for-the-player-firewall

piSignage is built upon node.js and express framework. It uses HTML REST API to communicate with the server. Real time communication is achieved using WebSocket interface over standard http port(please enable websocket interface if you are using firewall). For progressive and retry-after-fail downloads wget is used.

In nutshell, player should be able to connect to the server as follows

- http port 80 

- https port 443

- Websocket traffic over http port 80 or 443

- Server name: pisignage.com or us.pisignage.com 

Pi player uses port 80 (if http, i.e. server name is http://pisignage.com) or port 443 (default for https) to communicate with server. Also it uses Web-socket protocol over the same ports (http v1.1 header) and "wget" download program on the same ports.

 

Note: The IP address of domain pisignage.com keeps changing as we use AWS load balancer, so it is advisable to use pisignage.com in firewall rule rather than IP address
