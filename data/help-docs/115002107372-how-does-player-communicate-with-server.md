# How does player communicate with server

Source: https://help.pisignage.com/hc/en-us/articles/115002107372-How-does-player-communicate-with-server
Keywords: Firewall, Network, REST API, Websocket, wget

piSignage is built upon node.js and express framework. It uses HTML REST API to communicate with the server.

Real time communication is achieved using WebSocket interface over standard http port(please enable websocket interface if you are using firewall).

For progressive and retry-after-fail downloads wget is used.
