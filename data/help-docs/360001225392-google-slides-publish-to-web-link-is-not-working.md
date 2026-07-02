# Google slides "publish to web link" is not working

Source: https://help.pisignage.com/hc/en-us/articles/360001225392-Google-slides-publish-to-web-link-is-not-working

Use one of the following solutions

- The link URL has SAMEORIGIN policy which prevents the slides from loading whereas embed option works. Change the /pub? portion of link with /embed? and slides should be displayed.

- Add the link as webpage type under Add assets button.

Also,

- Choose "Start slideshow after load" and "Restart after last slide" options

- Set the duration of the asset in the playlist to a large value
