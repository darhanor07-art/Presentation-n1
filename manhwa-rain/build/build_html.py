#!/usr/bin/env python3
"""Build manhwa-rain/index.html — one self-contained file (fonts, css, js, assets as base64 WebP).

Assets come from assets/manifest.json, written by `node build/paint.js` (p5.brush painters):
  {"<key>": {"file": "<key>.webp", "w": 1080, "h": 1512, "alpha": true, "kind": "plate|layer|eye|char|seq"}, ...}
(a list / {"assets":[...]} form is accepted too). The manifest may be partial or empty: keys that are missing are
drawn by the runtime placeholders (src/placeholders.js), so this script can be re-run after every painting step.

Masters in assets/ are stored at q~88 and full contract size; here they are DOWNSCALED + re-encoded for the page:
  plate / layer / street -> 900 px wide;  boot_* -> 720 wide;  poster_* -> 600 wide;  eye_* -> 1000 wide;  pair_* -> 1280 wide;
  char (small sprites) as is.  If the page would exceed 15 MB, quality is lowered step by step (min q 60) until it fits."""
import os, re, io, json, base64, glob, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); SRC = os.path.join(ROOT, 'src')
REPO = os.path.dirname(ROOT); FONTS = os.path.join(REPO, 'manhwa', 'fonts')
JS = ['engine.js', 'rain.js', 'placeholders.js', 'scenes.js', 'main.js']
LIMIT_BYTES = 15 * 1024 * 1024
KINDS = ('plate', 'layer', 'eye', 'char', 'seq')
BASEQ = {'plate': 72, 'layer': 74, 'seq': 72, 'eye': 78, 'char': 78}
MINQ = 60

def kind_of(e, name):
    k = (e.get('kind') or e.get('type') or '').lower()
    if k in KINDS: return k
    if re.match(r'(boot|poster)_\d', name): return 'seq'
    if name.startswith(('eye_', 'pair_')): return 'eye'
    if name in ('merey_top', 'sanzhar_fig', 'roof_pair'): return 'char'
    if re.search(r'(_sky|_bg$|^window_city$|^street_ground$|^puddle_bg$|^poster_stop$)', name): return 'plate'
    return 'layer'

def target_width(name, kind, w):
    if name.startswith('boot_'): return 720
    if re.match(r'poster_\d', name): return 600
    if name.startswith('pair_'): return 1280
    if name.startswith('eye_'): return 1000
    if kind == 'char': return w
    return 900

def read_manifest():
    mp = os.path.join(ROOT, 'assets', 'manifest.json')
    if not os.path.exists(mp): return []
    try: man = json.load(open(mp, encoding='utf-8'))
    except Exception as e: print('manifest unreadable:', e); return []
    if isinstance(man, dict) and isinstance(man.get('assets'), (list, dict)): man = man['assets']
    ents = []
    if isinstance(man, dict):
        for k, v in man.items(): ents.append(dict(v, name=v.get('name', k)) if isinstance(v, dict) else {'name': k, 'file': v})
    elif isinstance(man, list): ents = [e if isinstance(e, dict) else {'file': e} for e in man]
    out = []
    for e in ents:
        f = next((e[k] for k in ('file', 'path', 'src', 'webp', 'png') if isinstance(e.get(k), str)), None)
        name = e.get('name') or (os.path.splitext(os.path.basename(f))[0] if f else None)
        if not name: continue
        if not f:
            cand = glob.glob(os.path.join(ROOT, 'assets', name + '.*')); f = cand[0] if cand else None
        if not f: continue
        p = f if os.path.isabs(f) else os.path.join(ROOT, 'assets', f)
        if not os.path.exists(p): print('missing file for', name, p); continue
        out.append((name, kind_of(e, name), p, e.get('alpha')))
    return out

def load_assets():
    res = []
    for name, kind, p, alpha in read_manifest():
        img = Image.open(p); img.load(); orig = img.size
        has_a = 'A' in img.getbands() or img.mode == 'P'
        if has_a:
            img = img.convert('RGBA')
            if alpha is False or img.getchannel('A').getextrema()[0] >= 250: has_a = False
        img = img.convert('RGBA' if has_a else 'RGB')
        tw = target_width(name, kind, img.width)
        if img.width > tw: img = img.resize((tw, round(img.height * tw / img.width)), Image.LANCZOS)
        res.append({'name': name, 'kind': kind, 'img': img, 'alpha': has_a, 'orig': orig, 'osize': os.path.getsize(p)})
    return res

def encode(a, delta):
    q = max(MINQ, BASEQ[a['kind']] + delta); buf = io.BytesIO()
    a['img'].save(buf, 'WEBP', quality=q, method=4); a['q'] = q; a['bytes'] = buf.getvalue()
    return len(a['bytes'])

def expected_keys():
    s = open(os.path.join(SRC, 'scenes.js'), encoding='utf-8').read(); keys = []
    for m in re.finditer(r"keys:\s*\[([^\]]*)\]", s): keys += re.findall(r"'([^']+)'", m.group(1))
    return keys

def assets_script(base_bytes):
    assets = load_assets(); delta = 0
    while True:
        tot = sum(encode(a, delta) for a in assets); html_est = int(tot * 4 / 3) + base_bytes
        if html_est <= LIMIT_BYTES or all(a['q'] <= MINQ for a in assets): break
        delta -= 4
    items = []
    print('%-22s %-6s %-11s %-11s %3s %9s %9s' % ('key', 'kind', 'master', 'page', 'q', 'master KB', 'page KB'))
    for a in sorted(assets, key=lambda a: a['name']):
        im = a['img']; print('%-22s %-6s %-11s %-11s %3d %9.0f %9.0f' % (a['name'], a['kind'] + ('+a' if a['alpha'] else ''), '%dx%d' % a['orig'], '%dx%d' % im.size, a['q'], a['osize'] / 1024, len(a['bytes']) / 1024))
        items.append({'name': a['name'], 'kind': a['kind'], 'w': im.width, 'h': im.height, 'alpha': a['alpha'], 'data': 'data:image/webp;base64,' + base64.b64encode(a['bytes']).decode()})
    exp = expected_keys(); have = {a['name'] for a in assets}; miss = [k for k in exp if k not in have]
    print('assets: %d real (quality delta %d), payload %.2f MB; expected %d keys, placeholders for %d%s' % (len(assets), delta, tot / 1048576, len(set(exp)), len(set(miss)), (': ' + ', '.join(sorted(set(miss)))) if miss and len(miss) < 14 else ''))
    return '<script>/* assets */\nwindow.__MS_ASSETS=%s;\n</script>\n' % json.dumps({'assets': items}, separators=(',', ':'))

def main():
    fcss = open(os.path.join(FONTS, 'fonts.css'), encoding='utf-8').read()
    fcss = '\n'.join(l for l in fcss.splitlines() if 'Cormorant' in l)           # only the serif we use (covers Kazakh Cyrillic)
    fcss = re.sub(r"url\('([^']+\.woff2)'\)", lambda m: 'url(data:font/woff2;base64,%s)' % base64.b64encode(open(os.path.join(FONTS, m.group(1)), 'rb').read()).decode(), fcss)
    css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()
    html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    html = re.sub(r'<link rel="stylesheet" href="\.\./\.\./manhwa/fonts/fonts\.css">\s*', '', html)
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n%s\n%s\n</style>' % (fcss, css))
    code = '\n'.join('<script>/* %s */\n%s\n</script>' % (f, open(os.path.join(SRC, f), encoding='utf-8').read().replace('</script', '<\\/script')) for f in JS)
    base = len(html.encode()) + len(code.encode())
    scripts = assets_script(base) + code
    html = re.sub(r'<!-- SCRIPTS:BEGIN.*?<!-- SCRIPTS:END -->', lambda m: scripts, html, flags=re.S)
    out = os.path.join(ROOT, 'index.html'); open(out, 'w', encoding='utf-8').write(html)
    size = os.path.getsize(out)
    print('wrote %s  %.2f MB%s' % (out, size / 1048576, '' if size <= LIMIT_BYTES else '   WARNING: over the 15 MB limit even at minimum quality'))
    if size > LIMIT_BYTES: sys.exit(2)

if __name__ == '__main__': main()
