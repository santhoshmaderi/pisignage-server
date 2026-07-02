# TV screen is blank

Source: https://help.pisignage.com/hc/en-us/articles/115002107472-TV-screen-is-blank
Keywords: Blank Screen, CORS, Protected Youtube URL, SD card full

Please check the following

- Player is assigned to a Group, Group has been assigned with a playlist and playlist has assets to play. Also make sure those assets are not deleted.

- Weblink assigned has no CORS restrictions, otherwise use "webpage" link type to add those links Under ADD assets button.

- Weblink contains flash content or link contains heavy JavaScript content which Pi is not able to handle.

- Protected youtube links and Youtube playlists may not play all the time

- SD card in the player is full, reduce the number of assets and re-deploy (you can check the SD card usage by using "df -h" command under piShell or ssh terminal)
