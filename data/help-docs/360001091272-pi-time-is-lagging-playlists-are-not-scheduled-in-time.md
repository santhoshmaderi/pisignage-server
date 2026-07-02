# Pi time is lagging, playlists are not scheduled in time

Source: https://help.pisignage.com/hc/en-us/articles/360001091272-Pi-time-is-lagging-playlists-are-not-scheduled-in-time
Keywords: NTP, RTC

Pi player does not have a Real Time Clock built-in and relies on NTP server for time synchronisation. Make sure Pi is able to contact NTP server in the Internet atleast once after poweron for the date and scheduling functions.

You can add a local NTP server also by configuring Pi's NTP configuration file /etc/ntp.conf. You can also add a custom RTC module if needed for the clock functionality.
