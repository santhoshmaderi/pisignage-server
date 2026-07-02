# Player crash or staying in welcome screen with 2.2.x image

Source: https://help.pisignage.com/hc/en-us/articles/360019714952-Player-crash-or-staying-in-welcome-screen-with-2-2-x-image

There are rare occasions piSignage player may keep carshing and stay in welcome screen if there is a network issue, we will correct the same in next release. 

 

Till then you could issue the following command from piShell or terminal and it will be fine

 

sed "s/.*self\.transport\.onClose.*/if \(self\.transport\) self\.transport\.onClose\(\)/" -i /home/pi/piSignagePro/node_modules/919.socket.io-client/lib/socket.js
