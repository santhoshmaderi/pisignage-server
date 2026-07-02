# Web links showing translate popup - how to hide?

Source: https://help.pisignage.com/hc/en-us/articles/360011916452-Web-links-showing-translate-popup-how-to-hide
Keywords: translate

Chromium has removed --translate flag ( https://superuser.com/questions/1237561/disable-chromes-page-translation-on-the-commandline).

There are two workarounds till the new fix from chromium appears on Pi (--disable-features=TranslateUI)

- Select "never translate option for <language>" in the popup

- If you have access, is to remove the lang from html tag or set it to "en" or add <meta name="google" content="notranslate"> to head section of html
