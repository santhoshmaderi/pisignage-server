# TV does not turn ON or OFF (CEC behaviour)

Keywords: tv, cec, hdmi, no signal, power on, power off, turn on, turn off

How the TV OFF/ON logic works:

OFF:
- A CEC command for TV OFF is sent, which is typically ignored by many TVs.
- The Pi HDMI interface is powered off. This results in "No signal" on the TV, and after some time the TV switches off (if CEC did not work).

ON:
- The HDMI interface on the Pi is turned ON.
- A CEC TV ON command is sent. If CEC is enabled on the TV side, the TV will turn ON (most TVs adhere to this).

If the CEC TV ON command does not work, it may appear to work only intermittently, because the TV will come on only if it has not already gone into standby due to "no signal". Ensure CEC (often branded Anynet+, Bravia Sync, SimpLink, Viera Link, etc.) is enabled in the TV's own settings.
