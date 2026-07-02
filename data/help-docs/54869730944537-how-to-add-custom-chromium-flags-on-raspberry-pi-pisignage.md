# How to Add Custom Chromium Flags on Raspberry Pi PiSignage

Source: https://help.pisignage.com/hc/en-us/articles/54869730944537-How-to-Add-Custom-Chromium-Flags-on-Raspberry-Pi-PiSignage

piSignage comes with most of the customizations for chrome which is needed for signage application. However if you need a specific flag to be added to your customization for e.g. Language specific content, When running PiSignage on Raspberry Pi, you may need to pass custom flags to the Chromium browser while showing webpage or in kiosk mode. This guide shows how to do it reliably using the system-wide customizations directory.

Steps

 

1. Create the Customizations File

Open a terminal on your Raspberry Pi (or SSH in) and run:

sudo nano /etc/chromium-browser/customizations/01-pisignage

2. Add Your Flags

Add the following line with your desired flags(these example flags are already added):

 

CHROMIUM_FLAGS="--noerrdialogs --disable-features=MediaRouter"

Replace the flags above with whatever flags you need. All flags must be inside the double quotes on a single `CHROMIUM_FLAGS=` line.

3. Save and Exit

Press `Ctrl+O` to save, then `Ctrl+X` to exit nano.

4. Restart Chromium

Restart the PiSignage player service or reboot your Pi for the changes to take effect:

sudo reboot

 

How It Works

On Raspberry Pi PiSignage, the Chromium launcher script automatically sources all files in `/etc/chromium-browser/customizations/` before starting the browser. Any `CHROMIUM_FLAGS` variable defined there gets appended to the browser's command line arguments.

This method works regardless of:

- Which `--user-data-dir` is being used

- System updates — your customizations file is preserved across Chromium package upgrades

Tips

- Use a descriptive filename (e.g., `01-pisignage`) so you can easily identify the source of custom flags later.

- The `01-` prefix controls the order in which files are loaded if you have multiple customization files.

- To temporarily disable your custom flags without deleting them, rename the file:

sudo mv /etc/chromium-browser/customizations/01-pisignage /etc/chromium-browser/customizations/01-pisignage.disabled

- To re-enable, rename it back.

Compatibility Info

This should work in 5.x.x version onwards of piSignage.

 

If the /etc/chromium-browser directory is not found, add the 01-pisignage file under the /etc/chromium.d/ directory instead.

 

 ls -ltr /etc/chromium.d/01-pisignage
-rw-r--r-- 1 root root 46 Feb  6 14:57 /etc/chromium.d/01-pisignage

For v3.3.0, this applies to Raspberry OS Bullseye version. Buster OS users would need /etc/chromium.d/ instead.

Need Help?

If you're unsure which flags to use for your setup, contact PiSignage support at support@pisignage.com.
