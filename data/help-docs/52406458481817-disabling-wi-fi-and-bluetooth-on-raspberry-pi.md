# Disabling Wi-Fi and Bluetooth on Raspberry Pi

Source: https://help.pisignage.com/hc/en-us/articles/52406458481817-Disabling-Wi-Fi-and-Bluetooth-on-Raspberry-Pi
Keywords: Wifi, raspberry pi

Raspberry Pi boards include integrated Wi-Fi and Bluetooth modules that automatically initialize during boot. If your project does not require them , you can disable both at the firmware level by adding specific dtoverlay entries in /boot/firmware/config.txt.

Open a terminal via SSH, or connect a monitor and keyboard to the device. Then, open the file /boot/firmware/config.txt and add the following entries:

dtoverlay=disable-wifi # Disables the onboard WiFi interface at the firmware level
dtoverlay=disable-bt # Disables onboard Bluetooth to prevent kernel from initializing it
dtoverlay=disable-wifi-pi5 # Disable WiFi for Pi 5
dtoverlay=disable-bt-pi5 # Disable Bluetooth for Pi 5
dtoverlay=pi3-disable-bt # Disable Bluetooth on Pi 3
dtoverlay=pi3-disable-wifi # Disable WiFi on Pi 3
 

If you want to perform all steps through PiShell, you can paste the following code block directly

sudo tee -a /boot/firmware/config.txt > /dev/null <<'EOF'

# --- Disable onboard WiFi and Bluetooth (for all Pi models) ---

dtoverlay=disable-wifi # Disables the onboard WiFi interface at the firmware level
dtoverlay=disable-bt # Disables onboard Bluetooth to prevent kernel from initializing it

# --- For Raspberry Pi 5 ---
dtoverlay=disable-wifi-pi5 # Disable WiFi for Pi 5
dtoverlay=disable-bt-pi5 # Disable Bluetooth for Pi 5

# --- For older Raspberry Pi models (Pi 3) ---
dtoverlay=pi3-disable-bt # Disable Bluetooth on Pi 3
dtoverlay=pi3-disable-wifi # Disable WiFi on Pi 3
EOF
 

 Then reboot the system 

sudo reboot
 

You can verify this by running the rfkill list command. It should not show wlan0 (Wi-Fi) or hci0 (Bluetooth) as active.
