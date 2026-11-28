#!/usr/bin/env python3
"""Render MOKPAN 3D worlds with OpenMontage's free tools (no API key) into raw lit + ID frame PNGs.

  python3 build/worlds/render_world.py ridges [s02|s09]     # ThreeJSWorld build -> offline patch -> hyperframes snapshot
  python3 build/worlds/render_world.py pavilion              # custom three.js composition (build/worlds/pavilion/)
Raw frames go to build/_raw/<world>/<layer>/{lit,id}/NNN.png (git-ignored scratch); then run build/printize.py.

OpenMontage's generated runtime (AGPL) is only used as an offline renderer in a scratch workspace
(default /tmp/mk_worlds) and is NEVER copied into the shipped page: we ship rendered media + our own JSON specs.
Offline patches (kenney/CDNs are blocked): three + gsap from a local node_modules, importmap, HUD/title overlays hidden.
"""
import os, sys, json, glob, shutil, subprocess, re, math

HERE = os.path.dirname(os.path.abspath(__file__)); BUILD = os.path.dirname(HERE); ROOT = os.path.dirname(BUILD)
OM = os.path.abspath(os.path.join(ROOT, '..', 'vendor', 'OpenMontage'))
NODE = os.environ.get('MK_NODE', '/tmp/omw')                      # dir with node_modules (three, gsap, hyperframes)
WORK = os.environ.get('MK_WORK', '/tmp/mk_worlds')               # scratch workspaces
RAW = os.path.join(BUILD, '_raw')
CHROME = os.environ.get('PUPPETEER_EXECUTABLE_PATH', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome')
CSS_HIDE = '\n#world-title-card,#world-hud,#world-status,#world-vignette,#world-grain{display:none!important}\n'

def ensure_node():
    if os.path.isdir(os.path.join(NODE, 'node_modules', 'hyperframes')): return
    os.makedirs(NODE, exist_ok=True)
    subprocess.check_call(['npm', 'install', '--no-audit', '--no-fund', 'three@0.181.2', 'gsap@3.14.2', 'hyperframes@0.9.104'], cwd=NODE)

def ease(name, u):
    if name == 'linear': return u
    if name == 'inOutQuad': return 2 * u * u if u < .5 else 1 - (-2 * u + 2) ** 2 / 2
    if name == 'outQuad': return 1 - (1 - u) ** 2
    return u

def lerp3(a, b, k): return [a[i] + (b[i] - a[i]) * k for i in range(3)]

def camera_keys(v):
    n = v['frames']; keys = []
    for i in range(n):
        k = ease(v.get('ease', 'linear'), i / (n - 1))
        keys.append({'time': float(i), 'position': lerp3(v['from']['position'], v['to']['position'], k),
                     'target': lerp3(v['from']['target'], v['to']['target'], k),
                     'fov': v['from']['fov'] + (v['to']['fov'] - v['from']['fov']) * k, 'label': ''})
    return keys

def patch_workspace(ws, mode):
    """offline patches; mode 'lit' | 'id'"""
    nm = os.path.join(NODE, 'node_modules')
    os.makedirs(os.path.join(ws, 'vendor'), exist_ok=True)
    if not os.path.isdir(os.path.join(ws, 'vendor', 'three')):
        shutil.copytree(os.path.join(nm, 'three'), os.path.join(ws, 'vendor', 'three'))
    shutil.copy(os.path.join(nm, 'gsap', 'dist', 'gsap.min.js'), os.path.join(ws, 'vendor', 'gsap.min.js'))
    ip = os.path.join(ws, 'index.html'); h = open(ip, encoding='utf-8').read()
    imap = '<script type="importmap">{"imports":{"three":"./vendor/three/build/three.module.js","three/addons/":"./vendor/three/examples/jsm/"}}</script>'
    if 'importmap' not in h: h = h.replace('<script', imap + '\n    <script', 1)
    h = re.sub(r'<script src="https://[^"]*gsap[^"]*"></script>', '<script src="./vendor/gsap.min.js"></script>', h)
    open(ip, 'w', encoding='utf-8').write(h)
    open(os.path.join(ws, 'world.css'), 'a').write(CSS_HIDE)
    rp = os.path.join(ws, 'world-runtime.js')
    if os.path.exists(rp):
        r = open(rp, encoding='utf-8').read()
        r = re.sub(r'from "https://[^"]*three@[^"]*GLTFLoader[^"]*"', 'from "three/addons/loaders/GLTFLoader.js"', r)
        r = re.sub(r'from "https://[^"]*three@[^"]*"', 'from "three"', r)
        if mode == 'id':     # flat, unlit, un-antialiased key colours; hard region assignment; no water/fog/tonemap
            r = r.replace('antialias: true', 'antialias: false')
            r = r.replace('renderer.toneMapping = THREE.ACESFilmicToneMapping;', 'renderer.toneMapping = THREE.NoToneMapping;')
            r = r.replace('scene.background = new THREE.Color(WORLD_SPEC.atmosphere.sky_color);', 'scene.background = new THREE.Color("#000000");')
            r = r.replace('  mixed.setRGB(0, 0, 0);\n', '  mixed.setRGB(0, 0, 0);\n  { const m = weights.indexOf(Math.max(...weights)); for (let q = 0; q < weights.length; q += 1) weights[q] = q === m ? 1 : 0; }\n', 1)
            r = r.replace('new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.02, flatShading: false })', 'new THREE.MeshBasicMaterial({ vertexColors: true })')
            r = r.replace('if (renderMode !== "wireframe") {\n  const waterGeometry', 'if (false) {\n  const waterGeometry')
            assert 'MeshBasicMaterial({ vertexColors' in r and 'if (false)' in r and 'weights[q] = q === m' in r, 'ID patch did not apply'
        open(rp, 'w', encoding='utf-8').write(r)

def snapshot(ws, times, outdir, chunk=12):
    shutil.rmtree(outdir, ignore_errors=True); os.makedirs(outdir)
    env = dict(os.environ, PUPPETEER_EXECUTABLE_PATH=CHROME)
    files = []
    for c in range(0, len(times), chunk):
        part = times[c:c + chunk]; tmp = outdir + '_tmp'
        shutil.rmtree(tmp, ignore_errors=True)
        subprocess.check_call(['npx', '--no-install', 'hyperframes', 'snapshot', ws, '--at', ','.join(('%g' % t) for t in part), '--no-end', '-o', tmp, '--timeout', '120000'],
                              cwd=NODE, env=env, stdout=subprocess.DEVNULL)
        fr = sorted(glob.glob(os.path.join(tmp, 'frame-*.png')), key=lambda p: int(re.search(r'frame-(\d+)-', p).group(1)))
        assert len(fr) == len(part), (len(fr), len(part))
        for k, f in enumerate(fr):
            dst = os.path.join(outdir, '%03d.png' % (c + k)); shutil.move(f, dst); files.append(dst)
        shutil.rmtree(tmp, ignore_errors=True)
    return files

def build_ridges(variants):
    ensure_node()
    sys.path.insert(0, OM)
    from tools.graphics.threejs_world import ThreeJSWorld
    spec = json.load(open(os.path.join(HERE, 'ridges.json'), encoding='utf-8'))
    for name in variants:
        v = spec['variants'][name]; n = v['frames']
        ws_spec = dict(spec['world_spec']); ws_spec['explicit_constraints'] = spec['explicit_constraints']; ws_spec['inferred_details'] = spec['inferred_details']
        ws_spec['camera_path'] = camera_keys(v)
        for mode, rm in (('lit', 'cinematic'), ('id', 'semantic')):
            ws = os.path.join(WORK, 'ridges_%s_%s' % (name, mode)); shutil.rmtree(ws, ignore_errors=True)
            r = ThreeJSWorld().execute({'operation': 'build', 'world_spec': ws_spec, 'output_path': ws, 'duration_seconds': float(max(1, n - 1)),
                                        'width': spec['width'], 'height': spec['height'], 'render_mode': rm, 'quality_tier': spec['quality_tier']})
            if not r.success: raise SystemExit('ThreeJSWorld build failed: %s' % r.error)
            patch_workspace(ws, mode)
            out = os.path.join(RAW, 'ridges_' + name, mode)
            snapshot(ws, [float(i) for i in range(n)], out)
            print('ridges_%s %s: %d frames -> %s' % (name, mode, n, out))

def build_pavilion():
    ensure_node()
    import importlib.util
    sp = importlib.util.spec_from_file_location('pavilion_render', os.path.join(HERE, 'pavilion', 'render_pavilion.py'))
    m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); m.run(sys.modules[__name__])

if __name__ == '__main__':
    a = sys.argv[1:] or ['ridges']
    if a[0] == 'ridges': build_ridges(a[1:] or ['s02', 's09'])
    elif a[0] == 'pavilion': build_pavilion()
    else: raise SystemExit(__doc__)
