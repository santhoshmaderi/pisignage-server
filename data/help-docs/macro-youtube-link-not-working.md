# YouTube link not working

Keywords: youtube, youtube-dl, yt-dlp, streaming, video not playing, mpv

YouTube videos are played using the youtube-dl program. If a YouTube link is not playing:

1. Update youtube-dl from piShell:
   sudo -H pip install --upgrade youtube-dl

2. Try changing the video player to "mpv" under Group settings.

3. It could also be YouTube rejecting the URL as "too many requests".

4. If it still fails, collect the player log (forever_out.log) for analysis.

Some users have had success replacing youtube-dl with the yt-dlp fork (https://github.com/yt-dlp/yt-dlp/): rename youtube-dl to youtube-dl.archive, then rename yt-dlp to youtube-dl on the player. Videos then load faster and play more reliably.
