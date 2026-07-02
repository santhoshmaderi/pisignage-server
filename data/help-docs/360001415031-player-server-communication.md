# Player-server communication

Source: https://help.pisignage.com/hc/en-us/articles/360001415031-Player-server-communication

The communication between player and server is based on socket.io.

Every 3 minutes player communicates with server to get configuration information and report status. The player logs are updated every hour.

When Group Deploy is pressed, the server sends sync command to online-players immediately.
