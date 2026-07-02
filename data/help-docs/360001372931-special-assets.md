# Special assets

Source: https://help.pisignage.com/hc/en-us/articles/360001372931-Special-assets
Keywords: boot video, boot screen, welcome notice, boot up

The files uploaded with following names are used for special purposes. Just upload them to server under Add Assets button. When a Group Deploy is issued, all the special files present in the user account are automatically copied to the player and be available upon next reboot.

 

-
Note: Bootup video option is not supported in player 4.x versions and beyond. Instead you can add an PNG image - refer https://help.pisignage.com/hc/en-us/articles/29322302422041-Changing-boot-logo-in-4-x-and-5-x-player-versions for more details.

-

- brand_intro.mp4 - welcome video (mp4 format) shown on the player while booting. This is default for both landscape and portrait mode if brand_intro_portrait.mp4 not present

- brand_intro_portrait.mp4 - welcome video (mp4 format) for the portrait mode, if not present brand_intro.mp4 will be used for portrait mode as well if present.

-
welcome.ejs - Take the reference ejs (HTML file with embedded JS) file github
There are a set of vaiables of available and you can modify the HTML code to suit your needs. Then upload the welcome.ejs file.

-
custom_layout*.html - You can design the custom layout based on examples provided at github. Take one example which suits you and modify the same. All CSS, JS and HTML code should be in one file and the file name should start with custom_layout and end with .html (for e.g. custom_layout_foodmenu.html). You can select this layout file under custom layout in playlist layout selection popup. 

-
notice_template.ejs - Basic style of notice can be changed by designing your own template for notice and uploading the same. You can take the base file from github and modify as per your need. This file is a ejs (HTML file with embedded JS) file similar to welcome.ejs

-
display logo - You can upload any png file of actual size and select it under Group Settings to display on the Screen

-
custom logo in menu bar - Similarly you can select an image to be shown under server UI menu bar instead of piSignage 

There is a special asset system_notice.html available under Playlist asset selection which is the welcome screen asset.

There is a special playlist TV_OFF available which can be scheduled under Group to switch off the TV.
