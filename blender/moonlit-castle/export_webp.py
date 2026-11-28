"""Convert the PNG masters in renders/spring/{eyes,chars,plates,layers,seq} to WebP (q82, alpha kept)
and write manhwa-spring/assets/manifest.json.   Run with the system python3 (needs Pillow):

  python3 export_webp.py [--force]

Resume safe: WebPs newer than their PNG are skipped; the manifest is rebuilt from what exists.
"""
import os, sys, json
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "renders", "spring")
DST = os.path.normpath(os.path.join(HERE, "..", "..", "manhwa-spring", "assets"))
os.makedirs(DST, exist_ok=True)
FORCE = "--force" in sys.argv
KIND = {"eyes": "eye", "chars": "char", "plates": "plate", "layers": "layer", "seq": "seq"}

man = {}
for sub, kind in KIND.items():
    d = os.path.join(SRC, sub)
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith(".png"):
            continue
        name = f[:-4]
        src, dst = os.path.join(d, f), os.path.join(DST, name + ".webp")
        im = Image.open(src)
        alpha = im.mode == "RGBA"
        if alpha and im.getchannel("A").getextrema()[0] == 255:
            alpha = False                                   # fully opaque -> drop the channel
        im = im.convert("RGBA" if alpha else "RGB")
        if FORCE or not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            im.save(dst, "WEBP", quality=82, method=5, alpha_quality=90)
            print("WROTE", name, os.path.getsize(dst) // 1024, "KB", flush=True)
        man[name] = {"file": name + ".webp", "w": im.width, "h": im.height, "alpha": alpha, "kind": kind}
with open(os.path.join(DST, "manifest.json"), "w") as fh:
    json.dump(man, fh, indent=2, ensure_ascii=False)
print("manifest:", len(man), "assets")
