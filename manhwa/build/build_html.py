#!/usr/bin/env python3
"""Build manhwa/index.html — one self-contained file (fonts base64, css, one <script> per source file).
Script order: engine (fixed order) -> art/*.js (sorted) -> scenes/*.js (sorted) -> main.js.
Also rewrites the SCRIPTS block in src/index.html so the dev page stays in sync.
Env (for partial/parallel builds): MK_OUT=<path relative to manhwa/> (default index.html; when set, src/index.html is
left untouched), MK_SCENES=<comma list of scene filename prefixes to include> (default: all)."""
import os, re, glob, base64, json

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); SRC = os.path.join(ROOT, 'src')
ENGINE = ['core', 'paint', 'assets', 'gl', 'timeline', 'overlay', 'input']

def order():
    files = ['engine/%s.js' % n for n in ENGINE]
    files += ['art/' + os.path.basename(f) for f in sorted(glob.glob(os.path.join(SRC, 'art', '*.js')))]
    only = [x for x in os.environ.get('MK_SCENES', '').split(',') if x]   # e.g. MK_SCENES=s03,t03 (filename prefixes)
    files += ['scenes/' + os.path.basename(f) for f in sorted(glob.glob(os.path.join(SRC, 'scenes', '*.js')))
              if not only or any(os.path.basename(f).startswith(o) for o in only)]
    return files + ['main.js']

def assets_script():
    """pre-rendered 3D layers (assets/gen) embedded as base64 -> window.__MK_ASSETS (file:// safe)"""
    gen = os.path.join(ROOT, 'assets', 'gen'); mp = os.path.join(gen, 'manifest.json')
    if not os.path.exists(mp): return ''
    man = json.load(open(mp, encoding='utf-8')); files = {}
    for im in man['images'].values():
        for k in (im['fill'], im['tone']): files[k] = base64.b64encode(open(os.path.join(gen, k), 'rb').read()).decode()
    return '<script>/* assets/gen */\nwindow.__MK_ASSETS=%s;\n</script>\n' % json.dumps({'manifest': man, 'files': files}, separators=(',', ':'))

def main():
    files = order()
    dev = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    block = '<!-- SCRIPTS:BEGIN (rewritten by build/build_html.py) -->\n' + ''.join('<script src="%s"></script>\n' % f for f in files) + '<!-- SCRIPTS:END -->'
    dev = re.sub(r'<!-- SCRIPTS:BEGIN.*?<!-- SCRIPTS:END -->', lambda m: block, dev, flags=re.S)
    if not os.environ.get('MK_OUT'):      # parallel/partial builds must not rewrite the shared dev page
        open(os.path.join(SRC, 'index.html'), 'w', encoding='utf-8').write(dev)

    # fonts
    fcss = open(os.path.join(ROOT, 'fonts', 'fonts.css'), encoding='utf-8').read()
    def emb(m):
        data = base64.b64encode(open(os.path.join(ROOT, 'fonts', m.group(1)), 'rb').read()).decode()
        return "url(data:font/woff2;base64,%s)" % data
    fcss = re.sub(r"url\('([^']+\.woff2)'\)", emb, fcss)
    css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()
    html = dev
    html = re.sub(r'<link rel="stylesheet" href="\.\./fonts/fonts\.css">\s*', '', html)
    html = re.sub(r'<link rel="stylesheet" href="style\.css">', lambda m: '<style>\n%s\n%s\n</style>' % (fcss, css), html)
    html = re.sub(r'<!-- SCRIPTS:BEGIN.*?<!-- SCRIPTS:END -->', lambda m: assets_script() + '\n'.join(
        '<script>/* %s */\n%s\n</script>' % (f, open(os.path.join(SRC, f), encoding='utf-8').read().replace('</script', '<\\/script')) for f in files), html, flags=re.S)
    out = os.path.join(ROOT, os.environ.get('MK_OUT', 'index.html')); open(out, 'w', encoding='utf-8').write(html)
    print('wrote %s  %.1f KB  (%d scripts)' % (out, os.path.getsize(out) / 1024, len(files)))

if __name__ == '__main__': main()
