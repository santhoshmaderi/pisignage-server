# Change Locale in player2

Source: https://help.pisignage.com/hc/en-us/articles/23972723809817-Change-Locale-in-player2

Note: Please connect a Keyboard to your Raspberry Pi and proceed with the following instructions. The results of using SSH while configuring locale might differ due to the Remote system locale and Pi locale conflicts

 

 

 

Modify the /etc/environment file

Modify the contents of the /etc/environment file to just have the line export DISPLAY=:0, you can either comment out the other lines or remove it. You can use the editor of your choice to make these changes

 

 

Execute the /etc/environment 

Execute the /etc/environment file by entering the following command. 

source /etc/environment

 

 

Clear the contents of the file /etc/default/locale file

Clear the contents of the file /etc/default/locale file.

 

Change the Locale using the Raspi-config command

- Enter the following command

- Choose Localization Options

- Choose Locale

- Scroll through the locales and select the locale of your choice using the Space key on your keyboard (example: de_DE.UTF-8 UTF8). Make sure to select the option with UTF8 and not ISO

- On your next screen, use the Arrow button to select the new Locale and hit Enter to confirm the new locale as the Default Locale. You can then click the ESC button to close the config screen.

- You will see a screen which displays the new locale

 

Reboot your Raspberry Pi

Reboot your Raspberry Pi using the following command to apply the changes

 

Verify Locale change

Once you have rebooted your pi, you can check the content of the /etc/default/locale file. 
It should have the New locale assigned to LANG and LANGUAGE
