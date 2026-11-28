#!/usr/bin/env python3
"""printize — turn raw 3D renders (lit RGB + flat ID key-colour pass) into the engine's two maps.

  python3 build/printize.py ridges            # reads build/worlds/ridges.print.json, raw frames in build/_raw/
  python3 build/printize.py pavilion
FILL map : palette colour per class (+ ink outline where a class borders a farther class), alpha 0 for 'none'
TONE map : R = toneMin + (toneMax-toneMin) * (1-lum)^gamma (lum auto-levelled per class over the whole sequence, then
           quantised), G = hatch angle/180*255, B = style (line 0, grain 85, cross 170, dots 255), alpha = coverage.
Both are saved LOSSLESS as palette PNGs (G/B encoding must survive). Output: assets/gen/<seq>/NNN.{f,t}.png and
assets/gen/manifest.json (merged across worlds: images + sequences).
Config (build/worlds/<world>.print.json):
 {"tone_div":3, "levels":40, "outline":{"w":2,"fill":"ink"}, "sequences":{ "<name>": {"raw":"<dir under build/_raw>",
   "single": false, "horizon": false, "outline":{...}, "classes": {"<cls>":{"key":[r,g,b],"rank":n,"alpha":0|1,"fill":"red",
   "tone":[min,max],"gamma":1,"style":"line","angle":90,"outline":true}}}}}
"""
import os, sys, json, glob
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, '_raw'); GEN = os.path.join(ROOT, 'assets', 'gen')
PAL = {'red': (207, 42, 27), 'ink': (21, 17, 15), 'paper': (238, 230, 214), 'blue': (36, 86, 211), 'gold': (229, 168, 35)}
STY = {'line': 0, 'grain': 85, 'cross': 170, 'dots': 255}

def rgb(c): return PAL[c] if isinstance(c, str) else tuple(c)

def load(p): return np.asarray(Image.open(p).convert('RGB'), dtype=np.float32)

def classify(idimg, names, keys):
    d = np.stack([((idimg - np.array(k, np.float32)) ** 2).sum(-1) for k in keys], -1)
    return np.argmin(d, -1)

def blocksum(a, f):
    h, w = a.shape[:2]; H, W = h // f, w // f
    return a[:H * f, :W * f].reshape(H, f, W, f).sum((1, 3))

def save_pal(path, idx, palette, alphas):
    im = Image.fromarray(idx.astype(np.uint8), 'P')
    flat = []
    for c in palette: flat += list(c)
    im.putpalette(flat + [0] * (768 - len(flat)))
    im.save(path, optimize=True, transparency=bytes(alphas))

def process_seq(name, sc, cfg):
    files = sorted(glob.glob(os.path.join(RAW, sc['raw'], 'id', '*.png')))
    litf = sorted(glob.glob(os.path.join(RAW, sc['raw'], 'lit', '*.png')))
    assert files and len(files) == len(litf), 'raw frames missing for %s' % name
    cl = sc['classes']; names = list(cl); keys = [cl[n]['key'] for n in names]
    ids = [classify(load(f), names, keys) for f in files]
    lums = [(lambda a: (a @ np.array([.2126, .7152, .0722], np.float32)) / 255.)(load(f)) for f in litf]
    # per-class auto-levels over the whole sequence (stable across frames -> no flicker)
    lv = {}
    for k, n in enumerate(names):
        v = np.concatenate([l[i == k] for l, i in zip(lums, ids)]) if any((i == k).any() for i in ids) else np.array([0., 1.])
        lo, hi = np.percentile(v, 2), np.percentile(v, 98); lv[n] = (float(lo), float(max(hi, lo + 1e-3)))
    Q = int(cfg.get('levels', 40)); div = int(sc.get('tone_div', cfg.get('tone_div', 3)))
    ol = sc.get('outline', cfg.get('outline', {'w': 2, 'fill': 'ink'})); olw = int(ol.get('w', 2))
    ranks = np.array([cl[n].get('rank', 1) for n in names]); alphas_c = [cl[n].get('alpha', 1) for n in names]
    outdir = os.path.join(GEN, name); os.makedirs(outdir, exist_ok=True)
    for f in glob.glob(os.path.join(outdir, '*.png')): os.remove(f)
    frames = []; horizon = {n: [] for n in names if alphas_c[names.index(n)]}
    for fi, (idc, lum) in enumerate(zip(ids, lums)):
        h, w = idc.shape
        rk = ranks[idc]
        # fill palette: index 0 transparent, 1 outline, 2+k class fill
        fidx = np.zeros((h, w), np.uint8)
        for k, n in enumerate(names):
            if alphas_c[k]: fidx[idc == k] = 2 + k
        if olw > 0:
            rim = Image.fromarray(rk.astype(np.uint8)).filter(ImageFilter.MinFilter(2 * olw + 1))
            minr = np.asarray(rim); edge = (rk > minr) & (fidx > 0)
            for k, n in enumerate(names):          # outline only where the class opts in
                if not cl[n].get('outline', True): edge &= ~(idc == k)
            fidx[edge] = 1
        pal = [(0, 0, 0), rgb(ol.get('fill', 'ink'))] + [rgb(cl[n].get('fill', 'paper')) for n in names]
        al = [0, 255] + [255 if alphas_c[k] else 0 for k in range(len(names))]
        fn = '%03d.f.png' % fi; save_pal(os.path.join(outdir, fn), fidx, pal, al)
        # tone map at 1/div resolution
        H, W = h // div, w // div
        counts = np.stack([blocksum((idc == k).astype(np.float32), div) for k in range(len(names))], -1)
        sums = []
        for k, n in enumerate(names):
            lo, hi = lv[n]; c = cl[n]; g = c.get('gamma', 1.0); t0, t1 = c.get('tone', [0.2, 0.8])
            ln = np.clip((lum - lo) / (hi - lo), 0, 1); tv = t0 + (t1 - t0) * (1 - ln) ** g
            sums.append(blocksum(tv * (idc == k), div))
        sums = np.stack(sums, -1)
        solid = np.array([1 if alphas_c[k] else 0 for k in range(len(names))])
        cs = counts * solid; best = np.argmax(cs, -1); cover = cs.sum(-1) >= (div * div) * .5
        # R level (quantised) per block
        bs = np.take_along_axis(sums, best[..., None], -1)[..., 0]; bc = np.maximum(np.take_along_axis(counts, best[..., None], -1)[..., 0], 1)
        tval = np.clip(bs / bc, 0, 1)
        lvl = np.rint(tval * (Q - 1)).astype(np.int32)
        # outline blocks -> tone 0 (flat ink)
        eb = blocksum(edge.astype(np.float32), div) >= (div * div) * .25 if olw > 0 else np.zeros((H, W), bool)
        lvl[eb] = 0
        tidx = np.where(cover, 1 + best * Q + lvl, 0).astype(np.uint8)
        tp = [(0, 0, 0)]; ta = [0]
        for k, n in enumerate(names):
            c = cl[n]; gang = int(round(((c.get('angle', 0) % 180) / 180.) * 255)); sty = STY[c.get('style', 'line')]
            for q in range(Q): tp.append((int(round(q / (Q - 1) * 255)), gang, sty)); ta.append(255)
        assert len(tp) <= 256, 'palette overflow'
        tn = '%03d.t.png' % fi; save_pal(os.path.join(outdir, tn), tidx, tp, ta)
        frames.append('%s/%s' % (name, fn[:3]))
        if sc.get('horizon'):
            for k, n in enumerate(names):
                if not alphas_c[k]: continue
                m = rk >= ranks[k]; first = np.where(m.any(0), m.argmax(0), h)
                horizon[n].append(round(float(np.median(first)) / h, 4))
    return {'w': w, 'h': h, 'tw': W, 'th': H, 'frames': frames, 'horizon': horizon if sc.get('horizon') else None, 'levels': lv}

def main():
    world = sys.argv[1]
    cfg = json.load(open(os.path.join(HERE, 'worlds', world + '.print.json'), encoding='utf-8'))
    mp = os.path.join(GEN, 'manifest.json'); os.makedirs(GEN, exist_ok=True)
    man = json.load(open(mp)) if os.path.exists(mp) else {'images': {}, 'sequences': {}}
    for name, sc in cfg['sequences'].items():
        r = process_seq(name, sc, cfg)
        man['sequences'].pop(name, None)
        for k in [k for k in man['images'] if k.startswith(name + '/')]: man['images'].pop(k)
        for fr in r['frames']:
            man['images'][fr] = {'fill': fr + '.f.png', 'tone': fr + '.t.png', 'w': r['w'], 'h': r['h'], 'tw': r['tw'], 'th': r['th']}
        ent = {'frames': r['frames'], 'w': r['w'], 'h': r['h']}
        if r['horizon']: ent['horizon'] = r['horizon']
        man['sequences'][name] = ent
        print('%s: %d frames, levels %s' % (name, len(r['frames']), {k: [round(x, 3) for x in v] for k, v in r['levels'].items()}))
    json.dump(man, open(mp, 'w'), separators=(',', ':'))
    tot = sum(os.path.getsize(p) for p in glob.glob(os.path.join(GEN, '**', '*'), recursive=True) if os.path.isfile(p))
    print('assets/gen total %.2f MB' % (tot / 1048576))

if __name__ == '__main__': main()
