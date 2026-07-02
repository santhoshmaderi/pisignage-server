# How to get the player log

Keywords: player log, forever_out.log, debug, logs, support

To diagnose player issues, collect the player log. The main log is /home/pi/forever_out.log. From piShell (or ssh) run:

tail -200 /home/pi/forever_out.log

Additional logs: /home/pi/forever_err.log and /home/pi/forever.log capture node startup, upgrade and system-level issues. Always include this log text when raising a player support issue.
