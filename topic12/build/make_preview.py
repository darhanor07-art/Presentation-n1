# -*- coding: utf-8 -*-
"""preview.mp4 — бүкіл презентацияның қысқа видеосы (1280×720, 30 fps).
Әр слайд: 3D-ауысу кадрлары (frames/NN) + мәтін қабаты (ovl/NN.png) ауысудың соңына қарай біртіндеп пайда болады,
содан кейін соңғы кадр оқуға жеткілікті уақыт тұрады.
Іске қосу: python3 topic12/build/make_preview.py <export_dir>
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
EXP = sys.argv[1]
meta = json.load(open(os.path.join(EXP, "meta.json"), encoding="utf-8"))
PATH_T = {"dawn", "flyin", "flyout", "craneout", "window", "dive", "vertigo", "rack", "whip"}
seg_dir = os.path.join(EXP, "seg"); os.makedirs(seg_dir, exist_ok=True)
segs = []
for m in meta:
    n = m["n"]; D = m["dur"]; tin = D * (.72 if m["tr"] in PATH_T else .5); extra = 2.2 if n < len(meta) else 3.5
    out = os.path.join(seg_dir, f"{n:02d}.mp4")
    if not os.path.exists(out):
        flt = (f"[0:v]tpad=stop_mode=clone:stop_duration={extra},format=yuv420p[v];"
               f"[1:v]scale=1280:720,format=rgba,fade=t=in:st={tin:.2f}:d=0.7:alpha=1[o];"
               f"[v][o]overlay=0:0:shortest=0:format=auto,format=yuv420p[out]")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", os.path.join(EXP, "frames", f"{n:02d}", "%03d.jpg"),
                        "-loop", "1", "-framerate", "30", "-i", os.path.join(EXP, "ovl", f"{n:02d}.png"),
                        "-filter_complex", flt, "-map", "[out]", "-t", f"{len(os.listdir(os.path.join(EXP, 'frames', f'{n:02d}'))) / 30 + extra:.2f}",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "medium", "-r", "30", out], check=True)
    segs.append(out)
lst = os.path.join(seg_dir, "list.txt")
open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
dst = os.path.join(ROOT, "preview.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", dst], check=True)
print(dst, round(os.path.getsize(dst) / 1e6, 1), "MB")
