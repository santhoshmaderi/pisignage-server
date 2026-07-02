# High temperature icon appears on screen

Source: https://help.pisignage.com/hc/en-us/articles/360018525551-High-temperature-icon-appears-on-screen

The high temperature icon appears when the CPU is hot, few typical causes are

- Upgrade to 2.2.1 or higher versions. Newer versions of chromium browsers (1.9.9 image onwards) are treating "marquee" element differently which lead to higher CPU processing. Our templates has a marquee element which was not used which lead to this issue we corrected it in 2.2.1

- the playlist is empty or the video or other asset is terminating due to error making CPU go in a tight loop. The playlist can be empty due to asset validity criteria. There is a 1 second delay if the playlist is empty to avoid this

- Few customers reported high temperature issue MP4 video files were interlaced files.By transformed the files to progressive the problem was solved

- Not enough air circulation, you could try heatsinks available off the shelf for Pi boards.
