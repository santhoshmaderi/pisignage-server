# How to set proxy parameter along with port number

Source: https://help.pisignage.com/hc/en-us/articles/360001153171-How-to-set-proxy-parameter-along-with-port-number

Please set the Linux level proxy setup  and piSignage will use the same settings. Following is one method

 

Edit this file:

sudo nano /etc/environment

Add this line (with authentication):

export http_proxy="http://username:password@proxyaddress:port/"

Or without authentication:

export http_proxy="http://proxyaddress:port/"
