#!/usr/bin/env python3
"""Watch YouTube videos and Instagram reels as frames.
Usage: python3 watch.py <out_dir> <url_or_youtube_id> [...]
Output per video in <out_dir>/<id>/: meta.json, overview.jpg (<=48 frames with timestamps), contact_NN.jpg, sub*.vtt
"""
import email, glob, json, os, re, subprocess, sys, urllib.request
from PIL import Image, ImageDraw

YT_CLIENTS = "youtube:player_client=mweb,web_safari"
KEEP = ("id", "title", "channel", "uploader", "channel_follower_count", "view_count", "like_count", "comment_count",
        "duration", "upload_date", "description", "chapters", "tags", "width", "height", "webpage_url")


def run(cmd, timeout=300):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


def yt_id(s):
    m = re.search(r"(?:v=|youtu\.be/|shorts/|embed/|live/)([\w-]{11})", s)
    return m.group(1) if m else (s if re.fullmatch(r"[\w-]{11}", s) else None)


def sheets(frames, step, d, fw, fh):
    if not frames:
        return
    th = 180; tw = max(1, int(fw * th / fh))
    def page(idx, path):
        cn = 8; rn = (len(idx) + cn - 1) // cn
        S = Image.new("RGB", (cn * tw, rn * (th + 18)), (16, 16, 16)); dr = ImageDraw.Draw(S)
        for k, fi in enumerate(idx):
            x, y = (k % cn) * tw, (k // cn) * (th + 18); t = fi * step
            S.paste(frames[fi].resize((tw, th)), (x, y + 18))
            dr.text((x + 3, y + 3), f"{int(t // 60)}:{int(t % 60):02d}", fill=(255, 220, 80))
        S.save(path, quality=86)
    n = len(frames)
    page([round(i * (n - 1) / 47) for i in range(48)] if n > 48 else list(range(n)), os.path.join(d, "overview.jpg"))
    for si in range(0, n, 48):
        page(list(range(si, min(n, si + 48))), os.path.join(d, f"contact_{si // 48:02d}.jpg"))


def save_meta(j, d, extra=None):
    m = {k: j.get(k) for k in KEEP}
    m.update(extra or {})
    json.dump(m, open(os.path.join(d, "meta.json"), "w"), ensure_ascii=False, indent=1)
    return m


def youtube(vid, out):
    d = os.path.join(out, vid); os.makedirs(d, exist_ok=True); url = f"https://www.youtube.com/watch?v={vid}"
    r = run(["yt-dlp", "--extractor-args", YT_CLIENTS, "-j", "--skip-download", "--ignore-no-formats-error", url])
    if r.returncode != 0:
        print(vid, "META FAIL", r.stderr.strip()[-300:]); return
    j = json.loads(r.stdout)
    sb = [f for f in j.get("formats", []) if f.get("format_id", "").startswith("sb")]
    best = max(sb, key=lambda f: (f.get("width") or 0) * (f.get("height") or 0), default=None)
    frames = []
    if best:
        mh = os.path.join(d, "sb.mhtml")
        run(["yt-dlp", "--extractor-args", YT_CLIENTS, "-f", best["format_id"], "-o", mh, url])
        if os.path.exists(mh):
            fw, fh = best["width"], best["height"]
            for part in email.message_from_bytes(open(mh, "rb").read()).walk():
                if not part.get_content_type().startswith("image/"):   # jpeg немесе webp
                    continue
                p = os.path.join(d, "_sheet.img"); open(p, "wb").write(part.get_payload(decode=True))
                im = Image.open(p).convert("RGB"); W, H = im.size
                for y in range(max(1, H // fh)):
                    for x in range(max(1, W // fw)):
                        fr = im.crop((x * fw, y * fh, (x + 1) * fw, (y + 1) * fh))
                        if sum(fr.convert("L").resize((4, 4)).tobytes()) >= 20:
                            frames.append(fr)
    run(["yt-dlp", "--extractor-args", YT_CLIENTS, "--skip-download", "--write-subs", "--write-auto-subs",
         "--sub-langs", "kk,ru,en.*,en", "--sub-format", "vtt", "-o", os.path.join(d, "sub"), url])
    for k in ("maxresdefault", "maxres1", "maxres2", "maxres3"):
        try: urllib.request.urlretrieve(f"https://i.ytimg.com/vi/{vid}/{k}.jpg", os.path.join(d, f"{k}.jpg"))
        except Exception: pass
    dur = j.get("duration") or len(frames); step = dur / max(1, len(frames))
    if frames:
        sheets(frames, step, d, best["width"], best["height"])
    m = save_meta(j, d, {"frames": len(frames), "frame_step_s": round(step, 2)})
    print(vid, "ok", m.get("view_count"), m.get("like_count"), m.get("duration"), len(frames), (m.get("title") or "")[:70])


def instagram(url, out):
    code = (re.search(r"/(?:reel|reels|p|tv)/([\w-]+)", url) or [None, re.sub(r"\W", "_", url)[-20:]])[1]
    d = os.path.join(out, code); os.makedirs(d, exist_ok=True)
    r = run(["yt-dlp", "--sleep-requests", "2", "-j", url])
    if r.returncode != 0:
        print(code, "META FAIL (private, login required or rate-limited — retry later)", r.stderr.strip()[-200:]); return
    j = json.loads(r.stdout.splitlines()[0])
    r = run(["yt-dlp", "--sleep-requests", "2", "-f", "b[height<=720]/b", "-o", os.path.join(d, "video.%(ext)s"), url], timeout=600)
    vids = glob.glob(os.path.join(d, "video.*"))
    frames, step, fw, fh = [], 0.5, 320, 568
    if vids:
        dur = float(j.get("duration") or 30); fps = 2 if dur <= 90 else max(0.2, 96 / dur)
        step = 1 / fps
        run(["ffmpeg", "-v", "error", "-y", "-i", vids[0], "-vf", f"fps={fps},scale=320:-2", os.path.join(d, "f_%04d.jpg")])
        fs = sorted(glob.glob(os.path.join(d, "f_*.jpg")))
        frames = [Image.open(p).convert("RGB") for p in fs]
        if frames: fw, fh = frames[0].size
        sheets(frames, step, d, fw, fh)
    m = save_meta(j, d, {"frames": len(frames), "frame_step_s": round(step, 2)})
    print(code, "ok", m.get("view_count"), m.get("like_count"), m.get("duration"), len(frames), (m.get("title") or m.get("description") or "")[:70])


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for a in sys.argv[2:]:
        if "instagram.com" in a:
            instagram(a, out)
        elif yt_id(a):
            youtube(yt_id(a), out)
        else:
            print(a, "SKIP: not a YouTube or Instagram link")


if __name__ == "__main__":
    main()
