# Add custom flags for Chromium Browser

Source: https://help.pisignage.com/hc/en-us/articles/40947378526233-Add-custom-flags-for-Chromium-Browser

This article explains how to add custom flags to the Chromium browser on your Raspberry Pi. These flags can be used to customise browser behaviour, such as disabling features, enabling experimental features, or modifying security settings.

 

You can either add a single flag or multiple flags to the chromium configuration file by editing it

 

 

Add a single flag using piSignage piShell to the chromium configuration file

You can issue the following command from piShell to add a single flag to the chromium-flags.conf file

echo ‘--use-fake-device-for-media-stream’ > /home/pi/.config/chromium-flags.conf

 

 

Add multiple flags to the chromium configuration file

1. Create the Configuration File

-

Open a terminal window on your Raspberry Pi.

-

Use the following command to create the configuration file:

sudo nano /home/pi/.config/chromium-flags.conf

-

This will open the nano text editor.

2. Add Your Flags

-

Add the desired flags to the file, one per line.

-

Here's an example:

--disable-features=Translate
--incognito
--ignore-certificate-errors
--ignore-urlfetcher-cert-requests
--use-fake-device-for-media-stream

-
--disable-features=Translate: Disables the built-in translation feature.

-
--incognito: Launches Chromium in incognito mode (private browsing).

-
--ignore-certificate-errors: Ignores certificate errors.

-
--ignore-urlfetcher-cert-requests: Ignores certificate requests for URL fetcher.

Note: You can find a list of available flags in the Chromium command-line flags documentation.

3. Save and Exit

- Press Ctrl+X to exit nano.

- When prompted to save, press Y.

- Press Enter to save the file.

4. Reboot your Pi for chromium to apply these changes

- Issue the command to reboot your player

sudo reboot

 

Important Notes:

-
Use Flags with Caution: Modifying Chromium flags can sometimes cause unexpected behavior or instability. Use flags with caution and only modify settings that you understand.

-
Refer to Documentation: Always refer to the official Chromium documentation for the most up-to-date information on available flags and their effects.
