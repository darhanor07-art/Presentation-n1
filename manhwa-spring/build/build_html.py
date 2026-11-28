#!/usr/bin/env python3
"""Build manhwa-spring/index.html — one self-contained file (fonts, css, js, assets as base64 WebP).
Assets: assets/manifest.json (written by the Blender render step) is read tolerantly:
  {"assets":[{"name","kind","file"}...]}  |  [{...}]  |  {"name":{"kind","file"}}   (file relative to assets/)
kinds: plate | layer | char | eye.  Anything not found falls back to placeholders (blender/moonlit-castle/renders/*)
or to procedurally drawn stand-ins at runtime, so re-running this script after new renders land needs no code change."""
import os, re, io, json, base64, glob
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); SRC = os.path.join(ROOT, 'src')
REPO = os.path.dirname(ROOT); FONTS = os.path.join(REPO, 'manhwa', 'fonts'); REN = os.path.join(REPO, 'blender', 'moonlit-castle', 'renders')
JS = ['engine.js', 'placeholders.js', 'scenes.js', 'main.js']
KEYS = ['moon', 'macro', 'hero', 'gate', 'tower', 'garden', 'wide']
# placeholder plates: name -> (file, max long side)
PH = {'hero': ('hero.png', 1080), 'wide': ('wide.png', 1600), 'f001': ('_frames/f0001.png', 540), 'f060': ('_frames/f0060.png', 540),
      'f090': ('_frames/f0090.png', 540), 'f120': ('_frames/f0120.png', 540), 'f144': ('_frames/f0144.png', 540)}
LIMIT = {'plate': 1260, 'layer': 1400, 'char': 1100, 'eye': 1200}

def webp(img, q, maxside):
    if max(img.size) > maxside:
        k = maxside / max(img.size); img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    buf = io.BytesIO(); img.save(buf, 'WEBP', quality=q, method=4); return buf.getvalue(), img.size

def kind_of(e, name, path):
    k = (e.get('kind') or e.get('type') or '').lower()
    if k in LIMIT: return k
    s = (name + ' ' + path).lower()
    for k in ('plate', 'layer', 'char', 'eye'):
        if k in s: return k
    return 'layer'

def read_manifest():
    mp = os.path.join(ROOT, 'assets', 'manifest.json')
    if not os.path.exists(mp): return []
    try: man = json.load(open(mp, encoding='utf-8'))
    except Exception as e: print('manifest unreadable:', e); return []
    if isinstance(man, dict):
        for k in ('assets', 'items', 'images', 'files'):
            if k in man: man = man[k]; break
    ents = []
    if isinstance(man, dict):
        for k, v in man.items(): ents.append(dict(v, name=v.get('name', k)) if isinstance(v, dict) else {'name': k, 'file': v})
    elif isinstance(man, list): ents = [e if isinstance(e, dict) else {'file': e} for e in man]
    out = []
    for e in ents:
        f = next((e[k] for k in ('file', 'path', 'src', 'url', 'png', 'webp') if isinstance(e.get(k), str)), None)
        name = e.get('name') or (os.path.splitext(os.path.basename(f))[0] if f else None)
        if not f: cand = glob.glob(os.path.join(ROOT, 'assets', '**', name + '.*'), recursive=True); f = cand[0] if cand else None
        if not f or not name: continue
        p = f if os.path.isabs(f) else os.path.join(ROOT, 'assets', f)
        if not os.path.exists(p): print('missing file for', name, p); continue
        out.append((name, kind_of(e, name, f), p))
    return out

def assets_script():
    items = []; real = read_manifest(); have_plate = set()
    for name, kind, p in real:
        img = Image.open(p); img = img.convert('RGBA' if kind in ('layer', 'char') or 'A' in img.getbands() else 'RGB')
        data, sz = webp(img, 80 if kind in ('plate', 'eye') else 86, LIMIT[kind])
        items.append({'name': name, 'kind': kind, 'w': sz[0], 'h': sz[1], 'data': 'data:image/webp;base64,' + base64.b64encode(data).decode()})
        if kind == 'plate':
            for k in KEYS:
                if k in name.lower(): have_plate.add(k)
    # placeholder plates (always include the ones whose scene has no real plate; cheap)
    for name, (f, ms) in PH.items():
        p = os.path.join(REN, f)
        if not os.path.exists(p): continue
        data, sz = webp(Image.open(p).convert('RGB'), 72, ms)
        items.append({'name': 'ph_' + name, 'kind': 'plate', 'ph': True, 'w': sz[0], 'h': sz[1], 'data': 'data:image/webp;base64,' + base64.b64encode(data).decode()})
    print('assets: %d real, %d placeholder plates; real plate keys: %s' % (len(real), len(items) - len(real), sorted(have_plate) or '-'))
    return '<script>/* assets */\nwindow.__MS_ASSETS=%s;\n</script>\n' % json.dumps({'assets': items}, separators=(',', ':'))

def main():
    fcss = open(os.path.join(FONTS, 'fonts.css'), encoding='utf-8').read()
    fcss = '\n'.join(l for l in fcss.splitlines() if 'Cormorant' in l)           # only the serif we use
    fcss = re.sub(r"url\('([^']+\.woff2)'\)", lambda m: 'url(data:font/woff2;base64,%s)' % base64.b64encode(open(os.path.join(FONTS, m.group(1)), 'rb').read()).decode(), fcss)
    css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()
    html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    html = re.sub(r'<link rel="stylesheet" href="\.\./\.\./manhwa/fonts/fonts\.css">\s*', '', html)
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n%s\n%s\n</style>' % (fcss, css))
    scripts = assets_script() + '\n'.join('<script>/* %s */\n%s\n</script>' % (f, open(os.path.join(SRC, f), encoding='utf-8').read().replace('</script', '<\\/script')) for f in JS)
    html = re.sub(r'<!-- SCRIPTS:BEGIN.*?<!-- SCRIPTS:END -->', lambda m: scripts, html, flags=re.S)
    out = os.path.join(ROOT, 'index.html'); open(out, 'w', encoding='utf-8').write(html)
    print('wrote %s  %.1f KB' % (out, os.path.getsize(out) / 1024))

if __name__ == '__main__': main()
