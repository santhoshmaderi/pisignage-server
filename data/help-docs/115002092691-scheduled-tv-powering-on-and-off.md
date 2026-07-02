# Scheduled TV powering ON and OFF

Source: https://help.pisignage.com/hc/en-us/articles/115002092691-Scheduled-TV-powering-ON-and-OFF
Keywords: TV OFF, CEC, HDMI, No Signal

For CEC supported TVs, TV can be turned OFF when not in use in case Pi Player. You can do it in 2 ways. In both cases piSignage player sends CEC signal to TV as well as HDMI interface is powered off. So in cases where TV does not support CEC off feature, "No Signal" will appear on the TV.

A. If you need TV need to be switched off daily during specific period

Under Group-> Display settings, enable Schedule TV OFF feature and enter the ON and OFF time. Note that this supports only one time period and it needs to be same on all days of the week. Also note that there could be upto 5 minutes delay in switching off and on the TV.

 

 

 

B. By scheduling TV_OFF playlist, either as default or as one of the scheduled playlists

For e.g. schedule TV_OFF as the default playlist under Group and add other playlists with specific scheduled times as shown. TV will be off whenever there are no playlists to play.

Another e.g. could schedule a TV_OFF playlist as the first in the scheduled list with scheduled days as "Sunday" and "Saturday". The TV will be off on weekends.
