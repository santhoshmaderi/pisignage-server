# Hiding the Mouse Cursor on the labwc / Wayland Player

Source: https://help.pisignage.com/hc/en-us/articles/59094755442201-Hiding-the-Mouse-Cursor-on-the-labwc-Wayland-Player

Overview

The setup has three parts:

- Install wtype, a tool that sends synthetic keyboard input on Wayland.

- Add a keybind to rc.xml that hides the cursor and warps it off-screen.

- Add a line to autostart so the keybind fires automatically on boot.

Step 1 — Install wtype

Run the installation in the background with &

sudo apt update && sudo apt install -y wtype &
Confirm it installed:

command -v wtype && echo "wtype is ready"

Step 2 — Add the keybind to rc.xml

This inserts the cursor-hiding keybind immediately after the opening <keyboard> tag. The -i.bak flag saves a backup at rc.xml.bak so you can revert if needed.

sed -i.bak '/<keyboard>/a\ <keybind key="A-W-h">\n <action name="HideCursor" />\n <action name="WarpCursor" x="-1" y="-1" />\n </keybind>' ~/.config/labwc/rc.xml

The keybind it adds:

<keybind key="A-W-h">
 <action name="HideCursor" />
 <action name="WarpCursor" x="-1" y="-1" />
</keybind>

-
HideCursor hides the pointer.

-
WarpCursor moves it to -1,-1 (off-screen) so it cannot flash on the display edge.

Step 3 — Trigger it at startup via autostart

Add the wtype command as the first line of the autostart file so the keybind is invoked as soon as labwc starts:

sed -i.bak '1i\wtype -M alt -M logo h -m alt -m logo' ~/.config/labwc/autostart

 

Step 4 — Apply the changes

Reload labwc without a full restart, then test the keybind manually (Alt + Super + H):

labwc --reconfigure

On the next reboot, the cursor will be hidden automatically.

Important note on behaviour

The HideCursor action hides the cursor once. It is not a permanent toggle — the cursor becomes visible again as soon as any pointer, gesture, or stylus input is detected. For a kiosk or signage device with no input peripherals attached, the startup trigger is usually sufficient. If devices may reconnect during a long session, re-run the wtype command on those events to re-hide the cursor.
