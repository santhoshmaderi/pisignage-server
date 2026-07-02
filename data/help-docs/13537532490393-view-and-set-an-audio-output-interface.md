# View and Set an Audio Output Interface

Source: https://help.pisignage.com/hc/en-us/articles/13537532490393-View-and-Set-an-Audio-Output-Interface
Keywords: player2

This Article is a guide to

- View all the Audio Output Interfaces associated with a device.

- Set a particular Audio Interface as the Default Audio Output Interface.

- Set the volume of the Audio Output Interface.

Note: This applies to players running the PulseAudio Sound server system and not to Pipewire.

To check if your Raspberry Pi is running PulseAudio, run the command alsamixer and check the Top-Left corner for details. The Card and Chip details should mention "PulseAudio"

You can press the Esc key to exit the Alsamixer interface.

---------------------------------------------------------------------------------------------------

 

View all the Audio Output Interfaces in detail

This command gives details like audio interface state, volume, channel data, etc of all the Audio Interfaces associated with the device being used.

 

Shell Command:

pacmd list-sinks

Example Output: 

---------------------------------------------------------------------------------------------------

 

View only the Index and Description of all the Audio Output Interfaces

This command gives the Index of all the Audio Interfaces. This Index is later used to Change Volume, Change the Default Audio Interface.

 

Shell Command:

pacmd list-sinks | grep -e 'index:' -e 'device.description'

Example Output:

 

Note: In the example output, there is an * (asterisk) symbol next to index 6 indicating that the Audio Output Interface corresponding to Index 6 is currently in use by the device.

 

---------------------------------------------------------------------------------------------------

 

Set the default Audio Output Interface of the device.

This command is use to select a desired Audio Interface as the default output for the Device.

 

Shell Command:

pacmd set-default-sink <interface-index>

Note: Replace <interface-index> with the index of the Audio Interface as per your requirement.

 

Example: pacmd set-default-sink 7

 

---------------------------------------------------------------------------------------------------

 

Set the volume of the current Audio Output Interface.

This command will set the Volume of the Audio Interface which is currently selected.

 

Shell Command:

pactl set-sink-volume <interface-index> <volume-percentage>

Note: Replace <interface-index> with the index of the Audio Interface, replace <volume-percentage> with as per your requirement.

Example:  pactl set-sink-volume 6 100%

 

 

---------------------------------------------------------------------------------------------------

Fix the suspended Audio Device

There is a possibility that the Audio Device (Sink) is suspended after being in IDLE for a long time or if it is done manually by the USER.

 

This is how the output of the command pacmd list-sinks should look like when the audio device is not suspended.

 

This is how the output looks if the Audio device is in a SUSPENDED state

 

 

- Get the device name of the current active index. (Note: Follow the instructions to set a different Default Audio output device as mentioned above if a different device has to be unsuspended).
In the above example:

Index: 0
Device Name: alsa_output.platform-107c701400.hdmi.hdmi-stereo

- Issue the following command

pacmd suspend-sink <audio-output-device-name> 0
pacmd suspend-sink alsa_output.platform-107c701400.hdmi.hdmi-stereo 0
0 - here is to unset the suspend-sink flag.

- Restart the Raspberry Pi using the following command

sudo reboot

 

In case the device goes into the Suspended state after being IDLE, try the following

1) Navigate to the /etc/pulse directory using the command cd /etc/pulse
2) Open the file default.pa with sudo permissions. Command: sudo nano default.pa
3) Look for the following line 

### Automatically suspend sinks/sources that become idle for too long
load-module module-suspend-on-idle

4) Comment the line starting with load-module using the # symbol

### Automatically suspend sinks/sources that become idle for too long
#load-module module-suspend-on-idle

sudo sed -i 's/^load-module module-suspend-on-idle/#load-module module-suspend-on-idle/' /etc/pulse/default.pa

5) Save the file and reboot your Raspberry Pi using the command sudo reboot
