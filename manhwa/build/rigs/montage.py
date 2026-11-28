#!/usr/bin/env python3
"""montage.py: stitch stills/_d2/extra/<name>_<i>.jpg into <name>_montage.jpg (crop = region of interest)"""
import os, sys, glob
from PIL import Image
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'stills', '_d2', 'extra')
CROP = {'s03_carve': (110, 230, 610, 760), 's06_wake': (0, 0, 720, 1008), 's09_walk': (120, 360, 600, 840)}
for name, box in CROP.items():
    fs = sorted(glob.glob(os.path.join(D, name + '_[0-9].jpg')))
    if not fs: continue
    ims = [Image.open(f).crop(box) for f in fs]; w, h = ims[0].size; sc = 260 / w if name != 's06_wake' else 200 / w
    ims = [i.resize((int(w * sc), int(h * sc))) for i in ims]; cols = 5 if name != 's06_wake' else 9
    cols = min(cols, len(ims)); rows = (len(ims) + cols - 1) // cols; W, H = ims[0].size
    M = Image.new('RGB', (W * cols, H * rows), 'white')
    for k, im in enumerate(ims): M.paste(im, ((k % cols) * W, (k // cols) * H))
    M.save(os.path.join(D, name + '_montage.jpg'), quality=88)
print('ok')
