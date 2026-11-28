#!/usr/bin/env python3
"""Subset the 5 OFL font families used by MOKPAN into manhwa/fonts/*.woff2 + fonts.css (dev, url() refs).
Source: env MOKPAN_GFONTS (a checkout of google/fonts, with ofl/<family> dirs); else sparse-clone to /tmp/mokpan-gfonts."""
import os, re, sys, glob, shutil, subprocess
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
DEFAULT = '/tmp/claude-0/-home-user-Presentation-n1/91a386e5-81b8-55b3-8b3a-680d9ccffba9/scratchpad/gfonts'
DIRS = ['songmyung', 'blackhansans', 'eastseadokdo', 'ibmplexmono', 'cormorantgaramond']

def source():
    src = os.environ.get('MOKPAN_GFONTS', DEFAULT)
    if os.path.isdir(os.path.join(src, 'ofl', 'songmyung')): return src
    src = '/tmp/mokpan-gfonts'
    if not os.path.isdir(os.path.join(src, 'ofl', 'songmyung')):
        print('sparse-cloning google/fonts ->', src)
        subprocess.check_call(['git', 'clone', '--depth', '1', '--filter=blob:none', '--sparse', 'https://github.com/google/fonts', src])
        subprocess.check_call(['git', '-C', src, 'sparse-checkout', 'set'] + ['ofl/' + d for d in DIRS])
    return src

def used_chars():
    chars = set()
    for ext in ('js', 'html', 'css'):
        for f in glob.glob(os.path.join(ROOT, 'src', '**', '*.' + ext), recursive=True):
            chars |= {c for c in open(f, encoding='utf-8').read() if ord(c) > 127}
    dm = os.path.join(ROOT, 'DESIGN.md')   # so later phases can use the storyboard's Hangul without re-running
    if os.path.exists(dm):
        chars |= {c for c in open(dm, encoding='utf-8').read() if 0xAC00 <= ord(c) <= 0xD7A3 or 0x3131 <= ord(c) <= 0x318E}
    ascii_ = {chr(c) for c in range(32, 127)}
    cyr = {chr(c) for c in list(range(0x410, 0x450)) + [0x401, 0x451]} | set('ӘәҒғҚқҢңӨөҰұҮүҺһІі')
    extra = set('«»—–…·•↓←→№“”‘’')
    return chars | ascii_ | cyr | extra

def is_hangul(c): return 0xAC00 <= ord(c) <= 0xD7A3 or 0x3131 <= ord(c) <= 0x318E or 0x1100 <= ord(c) <= 0x11FF

def do_subset(font, chars, out):
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.notdef_outline = True
    opts.name_IDs = [1, 2, 3, 4, 6]; opts.hinting = False; opts.desubroutinize = True
    s = subset.Subsetter(opts); s.populate(text=''.join(sorted(chars))); s.subset(font)
    font.flavor = 'woff2'; font.save(out)
    return os.path.getsize(out)

def main():
    src = os.path.join(source(), 'ofl'); out = os.path.join(ROOT, 'fonts'); os.makedirs(out, exist_ok=True)
    allc = used_chars(); css = []
    specs = [  # (family, ttf, weight, outname, check)
        ('Song Myung', 'songmyung/SongMyung-Regular.ttf', 400, 'SongMyung-Regular.woff2', 'hangul'),
        ('Black Han Sans', 'blackhansans/BlackHanSans-Regular.ttf', 400, 'BlackHanSans-Regular.woff2', 'hangul'),
        ('East Sea Dokdo', 'eastseadokdo/EastSeaDokdo-Regular.ttf', 400, 'EastSeaDokdo-Regular.woff2', 'hangul'),
        ('IBM Plex Mono', 'ibmplexmono/IBMPlexMono-Regular.ttf', 400, 'IBMPlexMono-Regular.woff2', 'latin'),
        ('IBM Plex Mono', 'ibmplexmono/IBMPlexMono-Medium.ttf', 500, 'IBMPlexMono-Medium.woff2', 'latin'),
        ('Cormorant Garamond', 'cormorantgaramond/CormorantGaramond[wght].ttf', 600, 'CormorantGaramond-SemiBold.woff2', 'latin'),
        ('Cormorant Garamond', 'cormorantgaramond/CormorantGaramond[wght].ttf', 700, 'CormorantGaramond-Bold.woff2', 'latin'),
    ]
    total = 0
    for fam, rel, wt, name, kind in specs:
        f = TTFont(os.path.join(src, rel))
        if 'fvar' in f: f = instancer.instantiateVariableFont(f, {'wght': wt})
        cmap = f.getBestCmap()
        # intended coverage: hangul fonts -> hangul chars; latin fonts -> everything that is not hangul
        cjk = lambda c: ord(c) >= 0x2E80 and not is_hangul(c)
        want = {c for c in allc if not cjk(c) and (is_hangul(c) if kind == 'hangul' else not is_hangul(c))}
        if kind == 'hangul': want |= {c for c in allc if ord(c) < 128 or c in '·…—'}   # nice to have; fallback font covers the rest
        miss = sorted(c for c in want if ord(c) not in cmap and (not kind == 'hangul' or is_hangul(c)))
        if miss: print('WARN %s %d: missing glyphs %s' % (fam, wt, ''.join(miss)))
        size = do_subset(f, want, os.path.join(out, name)); total += size
        print('%-20s %d  %-36s %6.1f KB  (%d chars)' % (fam, wt, name, size / 1024, len(want)))
        css.append("@font-face{font-family:'%s';font-weight:%d;font-style:normal;font-display:block;src:url('%s') format('woff2')}" % (fam, wt, name))
    open(os.path.join(out, 'fonts.css'), 'w').write('\n'.join(css) + '\n')
    for d, fam in zip(DIRS, ['SongMyung', 'BlackHanSans', 'EastSeaDokdo', 'IBMPlexMono', 'CormorantGaramond']):
        shutil.copy(os.path.join(src, d, 'OFL.txt'), os.path.join(out, 'OFL-%s.txt' % fam))
    print('total %.1f KB; non-ASCII chars used: %d' % (total / 1024, sum(1 for c in allc if ord(c) > 127)))

if __name__ == '__main__': main()
