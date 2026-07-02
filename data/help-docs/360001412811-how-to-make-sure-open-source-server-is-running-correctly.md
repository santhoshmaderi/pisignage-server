# How to make sure open source server is running correctly

Source: https://help.pisignage.com/hc/en-us/articles/360001412811-How-to-make-sure-open-source-server-is-running-correctly

piSignage server is built upon MEAN stack.

Make sure 

- mongod is running without errors and listening at port 27017

- node is running  and message on console should mention  "listening at port 3000"

- Watch for any errors in the node.js command console

- Make sure the port 3000 is open for external access in your server 

- load the url http:// {{your server address}}:3000 in Chrome Browser and the server UI should be loaded

 If pi is not reported at server 

- Check whether the pi player is able to ping server address 

- make sure port 3000 is added in the server field at the pi player

- Try using http:// {{your server address}}:3000 instead of just {{your server address}}:3000

- if you have edited package.json file make sure there are no syntax errors

- There is no firewall blocking port 3000

- Check the player log "tail -200 /home/pi/forever_log"
