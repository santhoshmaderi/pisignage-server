# New version of socket.io is not working with open-source server address

Source: https://help.pisignage.com/hc/en-us/articles/360020538732-New-version-of-socket-io-is-not-working-with-open-source-server-address

Player version 2.2.1 onwards used new socket.io (2+ version) by default and if does not work falls back to 0.9.x version. 

New version needs http:// prefix to the server name for new version to work. e.g. http://192.168.0.100:3000 or http://myserver.com:3000 

Simple address is appended with https prefix, for e.g. 192.168.0.110:3000 defaults to https://192.168.0.100:3000
