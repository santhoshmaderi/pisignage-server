# Video issue with player2 (video not full screen / wrong position)

Keywords: video, player2, vlc, resolution, letterbox, full screen, decode

On the latest Raspberry Pi OS, the hardware video-decode path is fully supported only by VLC (and Kodi, which piSignage cannot use). Other players use the hardware pipeline to decode but do the final copy to the software frame buffer of X, which can cause playback/position issues.

Workarounds:
1. Under Group settings, use a fixed resolution (1920x1080 or 1080x1920) instead of Auto.
2. Use VLC for full-screen videos under Group settings.
3. Use the 3.2.0 image, which is based on the legacy OS (supports only up to 1080p).
