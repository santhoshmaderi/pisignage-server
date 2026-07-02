# Raspberry Pi 4 support notes

Keywords: pi 4, 4k, dual hdmi, second display, portrait, resolution

Raspberry Pi 4 is supported. Notes:
- 4K: Pi 4 supports 4K resolution, but omxplayer and mpv only hardware-decode H.264 up to 1080p. H.265 (HEVC) 4K hardware decode is not supported by these players.
- A second HDMI display is not supported.
- Under Group settings, landscape mode is recommended. In portrait mode, auto resolution defaults to 1080x1920 and the GPU driver switches to legacy.
