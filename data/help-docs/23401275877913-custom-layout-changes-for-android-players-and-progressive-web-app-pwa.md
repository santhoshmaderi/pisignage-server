# Custom Layout changes for Android Players and Progressive Web App (PWA)

Source: https://help.pisignage.com/hc/en-us/articles/23401275877913-Custom-Layout-changes-for-Android-Players-and-Progressive-Web-App-PWA

piSignage for Android is available at https://play.google.com/store/apps/details?id=com.pisignage.player2&hl=en-IN

piSignage Progressive Web Application (PWA) is available at https://pisignage.com/player2

 

While Display Resolution, Orientation, and Dual-Display configuration changes from Group Settings are supported on piSignage for Raspberry Pi, Odroid N2, Intel NUC, etc., it is not supported on piSignage for Android or the PWA.

 

The custom layout used for Raspberry Pi won't work with Android since there is a difference in the Device Pixel Ratio.

Android devices not only have different screen sizes—handsets, tablets, TVs, etc.—but also have screens with different pixel sizes.
Reference: https://developer.android.com/training/multiscreen/screendensities

 

Hence custom-layouts designed for Raspberry Pi devices might appear to be zoomed in on your Android devices.

 

Note: In case you want to display assets in the MainZone (in Fullscreen), please make use of
- Layout 1 for Landscape mode 
- Layout 2ap for Portrait Mode.

 

- Launch the piSignage for Android player on your Android Device

- Navigate to the Settings page. More details are available in this article https://help.pisignage.com/hc/en-us/articles/14265849341081-Change-server-in-PiSignage-Android-2-0

- You should see "Layout" size mentioned next to the Player Configuration title.
Example: Layout: 960x540

- In your Template Designer, enter your Layout size under Custom resolution and Adjust your Mainzone, Sidezone, etc. according to this window size

- Once you have created your Custom Template, navigate to your Playlist and assign the Custom Layout in the Layouts popup.
