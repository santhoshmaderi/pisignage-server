# How to display webpages and dashboards that require login

Source: https://help.pisignage.com/hc/en-us/articles/360001455892-How-to-display-webpages-and-dashboards-that-require-login
Keywords: authentication

The following are some of the methods to allow players to access web pages which require login. The Server team of such pages typically suggests solution which is used many a times.

- Many web dashboards allow secret URL or Shared URL generation. This URL bypasses login process and can be added to the PI. These URLs can be revoked anytime

- Doing the authentication through standard http authentication by sending username/password via headers 

- Put ssh certificate of pi in known hosts file of server and avoid password entry

- Manually logging in from the player once so that cookies are stored in the player and have a long expiry time for cookies

- Webpage links allow sending key sequences after 10 seconds of launching the link. You could try sending the key sequence to see if this works

- OAuth type mechanism which piSignage follows to access Google Calendar (needs piPlayer side development). While adding the link server takes user concurrence to accept after which access is allowed using token mechanism
