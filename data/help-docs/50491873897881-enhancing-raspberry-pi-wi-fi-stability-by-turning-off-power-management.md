# Enhancing Raspberry Pi Wi-Fi Stability by Turning Off Power Management

Source: https://help.pisignage.com/hc/en-us/articles/50491873897881-Enhancing-Raspberry-Pi-Wi-Fi-Stability-by-Turning-Off-Power-Management

Wi-Fi power management is a feature designed to reduce power consumption by turning off the Wi-Fi module when it’s not actively transmitting data.

This is particularly useful for battery-powered devices. However, in a Raspberry Pi setup, where consistent connectivity is more critical than power saving.

You can disable power management feature by giving command

/sbin/iwconfig wlan0 power off 

or

sudo iw dev wlan0 set power_save off

You can check the power management status by giving 

sudo iwconfig

it should display 

Power Management:off

 

For this change to persist after reboot , please issue the following command 

sudo nmcli connection modify "$(nmcli -t -f DEVICE,CONNECTION device | awk -F: '$1=="wlan0"{print $2}')" 802-11-wireless.powersave 2

For more details, please refer this article
