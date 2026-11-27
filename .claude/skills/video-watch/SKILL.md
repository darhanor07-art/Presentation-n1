---
name: video-watch
description: Watch and analyze YouTube videos and Instagram reels/posts: fetch metadata (title, views, likes, duration, description), subtitles, and turn the video into timestamped frame contact sheets that can be viewed as images. Use when the user shares a youtube.com / youtu.be / instagram.com link, asks to "watch", "look at", "analyze" or compare videos, or asks for the most viewed/liked videos on a topic.
---

# Video watch (YouTube + Instagram)

Claude cannot play video, but it can **see frames**. This skill turns a link into:

- `meta.json` — title, author, views, likes, comments, duration, date, description, tags
- `overview.jpg` — up to 48 frames spread over the whole video, each with a `m:ss` timestamp
- `contact_NN.jpg` — all frames in pages of 48 (for detailed analysis)
- `sub*.vtt` — subtitles when available (YouTube)

Then read `overview.jpg` (and `contact_*.jpg` if needed) with the Read tool and describe what happens, citing timestamps.

## Usage

```bash
python3 scripts/watch.py <out_dir> <url_or_youtube_id> [more ...]
```

Examples:

```bash
python3 scripts/watch.py /tmp/vw https://www.youtube.com/watch?v=dQw4w9WgXcQ
python3 scripts/watch.py /tmp/vw https://www.instagram.com/reel/C1abcDEF/
```

The script prints one summary line per video: `id ok views likes duration frames title`.

## How it works

- **YouTube:** YouTube often blocks downloading the video itself from servers ("Sign in to confirm you're not a bot"). The script therefore uses the `mweb,web_safari` player clients and takes the **storyboard** (the preview thumbnails YouTube shows on the seek bar, ~1 frame every 2–10 s) plus `i.ytimg.com` still frames. It works without logging in.
- **Instagram:** the reel/post video is downloaded with `yt-dlp`, then `ffmpeg` extracts frames (2 per second for short reels). Single photos and carousels are saved as images.

## Requirements and limits

- Tools: `yt-dlp`, `ffmpeg`, Python with Pillow. Install if missing: `pip install -U yt-dlp pillow`.
- **Network:** the environment must allow `www.youtube.com`, `m.youtube.com`, `i.ytimg.com`, `*.googlevideo.com` (YouTube) and `www.instagram.com`, `*.cdninstagram.com`, `*.fbcdn.net` (Instagram). If a request is blocked by the proxy, tell the user which host is needed.
- Instagram rate-limits anonymous requests (HTTP 429, "empty media response"). Wait and retry with `--sleep-requests 3`; private posts and some reels cannot be opened without login. Never ask the user for their Instagram/Google password or cookies.
- **Search / "most viewed":** YouTube search works via `yt-dlp "ytsearch20:<query>" --flat-playlist -j` (then sort by `view_count`). Instagram has no public search by likes — find reel links with a web search, then fetch each link; say that the ranking is only among the found reels.
- Respect copyright: analyze and quote briefly; do not re-publish downloaded videos or frames.
