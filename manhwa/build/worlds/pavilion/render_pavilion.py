"""Render the custom pavilion composition layers (bg / bell / log) x (lit / id) through hyperframes snapshot."""
import os, shutil, json

def run(rw):
    here = os.path.dirname(os.path.abspath(__file__))
    layers = {'pavilion_bg': ('bg', 1), 'bell': ('bell', 1), 'log': ('log', 15)}
    for name, (layer, n) in layers.items():
        for mode in ('lit', 'id'):
            ws = os.path.join(rw.WORK, 'pavilion_%s_%s' % (name, mode)); shutil.rmtree(ws, ignore_errors=True); os.makedirs(ws)
            shutil.copy(os.path.join(here, 'index.html'), ws); shutil.copy(os.path.join(here, 'pavilion.js'), ws)
            open(os.path.join(ws, 'config.js'), 'w').write('window.__PAV=%s;' % json.dumps({'layer': layer, 'pass': mode}))
            rw.patch_workspace(ws, mode)
            out = os.path.join(rw.RAW, name, mode)
            rw.snapshot(ws, [float(i) for i in range(n)], out)
            print('%s %s: %d frames' % (name, mode, n))
