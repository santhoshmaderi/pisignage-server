# 4K video support

Keywords: 4k, resolution, hevc, h265, h264, video, pi 4

Although Pi 4 and piSignage support 4K resolution, omxplayer and current mpv players only support H.264 hardware decoding, which is limited to 1080p video. Only H.265 (HEVC) videos can be hardware decoded up to 4K resolutions in the Pi GPU, and that is currently NOT supported by these two players. Until a suitable standalone 4K player is identified, only videos up to 1080p are supported (they are scaled to 4K).
