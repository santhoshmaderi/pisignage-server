# Player specific content in links, ticker and text message

Source: https://help.pisignage.com/hc/en-us/articles/360018791931-Player-specific-content-in-links-ticker-and-text-message

In links, text messages and ticker text certain strings are replaced by actual values of the player. This will help fetch and show content specific to the player.

 

For e.g. https://site.com/content?player=__cpuid__ will be replaced as

https://site.com/content?player=000000002178ffe3

 

The supported variables are

__cpuid__ : Player ID of the player
__ipaddress__ : IP address of the player
__playername__ : Player name
__group__ : group of the player
