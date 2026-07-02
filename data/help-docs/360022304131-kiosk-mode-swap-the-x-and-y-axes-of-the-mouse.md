# Kiosk mode - swap the X and Y axes of the Mouse

Source: https://help.pisignage.com/hc/en-us/articles/360022304131-Kiosk-mode-swap-the-X-and-Y-axes-of-the-Mouse
Keywords: swap axes, axis, portrait, kiosk

Update — Raspberry Pi OS Trixie (Wayland / labwc players)

The xinput method above only works under X11. Newer Raspberry Pi OS releases (Trixie) run Wayland with the labwc compositor, where xinput has no effect. Use libinput's calibration matrix in labwc instead.

Note: libinput uses 6 values (the first two rows of the 3×3 matrix), so the old 0 1 0 -1 0 1 0 0 1 becomes 0 1 0 -1 0 1.
- Find your touch device name:

 

libinput list-devices

Look for the entry with Capabilities: touch and note its Device: name (e.g. ILITEK ILITEK-TP).
- Edit the labwc config:

 

sudo nano ~/.config/labwc/rc.xml

- Add a libinput device block inside the existing root element, using your device name:

 

<libinput>
 <device deviceName="ILITEK ILITEK-TP">
 <calibrationMatrix>0 1 0 -1 0 1</calibrationMatrix>
 </device>
</libinput>

- Apply the change:

 

labwc --reconfigure

(or sudo systemctl restart lightdm)

Matrix values for other orientations: 1 0 0 0 1 0 (default / landscape), 0 -1 1 1 0 0 (90° clockwise), -1 0 1 0 -1 1 (180°), 0 1 0 -1 0 1 (270°).

If you have also rotated the display, bind the touch input to that output with <touch deviceName="..." mapToOutput="HDMI-A-1"/> rather than relying on the matrix alone.

 

Note: The xinput steps below apply only to legacy X11-based players.

If you are using touch screen in portrait mode, the touch input may have to be aligned to the new directions. One way to do is

- Install xinput - sudo apt-get install -y xinput

-
export DISPLAY=:0.0 (sets the HDMI monitor as the display)

-
xinput --list (output will be something as follows)

Virtual core pointer                    id=2 [master pointer  (3)]

⎜   ↳ Virtual core XTEST pointer              id=4 [slave  pointer  (2)]

⎜   ↳ Logitech USB Receiver                   id=7 [slave  pointer  (2)]

⎣ Virtual core keyboard                   id=3 [master keyboard (2)]

    ↳ Virtual core XTEST keyboard             id=5 [slave  keyboard (3)]

    ↳ Logitech USB Receiver                   id=6 [slave  keyboard (3)]

    ↳ Logitech USB Receiver                   id=8 [slave  keyboard (3)]

- Look for Touch device id - here it is 7 (logitech USB receiver) and use the ID in the below command (7 is used below)

-
xinput --set-prop 7 'Coordinate Transformation Matrix' 0 1 0 -1 0 1 0 0 1
