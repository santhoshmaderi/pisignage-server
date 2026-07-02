# pi 3b+ freeze or stop working after few hours

Source: https://help.pisignage.com/hc/en-us/articles/360008078852-pi-3b-freeze-or-stop-working-after-few-hours
Keywords: freeze, hang

Few users have reported that Pi 3B+ based piSignage stops working or shows black screen after 10-12 hours of operation. 

There is a thread in Raspberry Pi forum which talks of Pi 3b+ lockups https://www.raspberrypi.org/forums/viewtopic.php?t=208821&start=75

Whoever having the freeze issue, can you please try adding the following lines to /boot/config.txt , reboot and report us the result either way? Thanks for the support!

 

arm_freq=1200

sdram_freq=450
