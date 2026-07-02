# What is player ID

Source: https://help.pisignage.com/hc/en-us/articles/360001116431-What-is-player-ID
Keywords: CPUID

Player ID is a 16 digit number displayed in your welcome screen(e.g.: 0000-0000-7c45-9824) which is same as CPU ID of Raspberry Pi.

Please note down this identifier in order to register your pi at the server.

The same can be identified in the server player screen as well from the player log file /home/pi/forever_out.log.

It can be also obtained from the shell script execution

cat /proc/cpuinfo |grep Serial|awk '{print $3 }'
