"""Per-frame metrics for the reel: colour composition, motion energy,
phase-correlation shift (content velocity), trackpad (finger) motion, slit-scans."""
import sys, subprocess, csv, numpy as np
from PIL import Image
video, out = sys.argv[1], sys.argv[2]
FPS = 60
SW, SH = 270, 215          # screen crop downscaled x4 (orig crop 1080x860 @ y=270)
TW, TH = 180, 95           # trackpad crop downscaled (orig 1080x570 @ y=1350)

def frames(vf, w, h):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', video, '-vf', vf,
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n = w * h * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(h, w, 3).astype(np.float32)

scr = list(frames(f'crop=1080:860:0:270,scale={SW}:{SH}:flags=area', SW, SH))
pad = list(frames(f'crop=1080:570:0:1350,scale={TW}:{TH}:flags=area', TW, TH))
N = min(len(scr), len(pad)); print('frames', N)

win = np.outer(np.hanning(SH), np.hanning(SW))
def gray(f): return f @ np.array([0.299, 0.587, 0.114], np.float32)
def phase_shift(a, b):
    A = np.fft.fft2(a * win); B = np.fft.fft2(b * win)
    R = A * np.conj(B); R /= np.abs(R) + 1e-6
    r = np.fft.ifft2(R).real
    y, x = np.unravel_index(np.argmax(r), r.shape)
    if y > SH // 2: y -= SH
    if x > SW // 2: x -= SW
    return y, x, r.max()

rows = []
colscan = np.zeros((SH, N, 3), np.uint8); rowscan = np.zeros((SW, N, 3), np.uint8)
vprof = np.zeros((SH, N, 3), np.uint8)
prev_g = prev_p = None
for i in range(N):
    f = scr[i]; r, g, b = f[..., 0], f[..., 1], f[..., 2]
    mx, mn = f.max(-1), f.min(-1)
    red = ((r > 105) & (r > 1.8 * g) & (r > 1.8 * b)).mean()
    black = (mx < 60).mean()
    white = ((mn > 150) & (mx - mn < 45)).mean()
    yellow = ((r > 120) & (g > 100) & (b < 0.7 * g) & (r - b > 60) & (g > 0.55 * r)).mean()
    blue = ((b > 110) & (b > r + 35) & (b >= g)).mean()
    green = ((g > 110) & (g > r + 25) & (g > b + 15)).mean()
    G = gray(f); P = gray(pad[i])
    motion = 0 if prev_g is None else float(np.abs(G - prev_g).mean())
    pmotion = 0 if prev_p is None else float(np.abs(P - prev_p).mean())
    dy, dx, conf = (0, 0, 0) if prev_g is None else phase_shift(G, prev_g)
    rows.append(dict(f=i, t=round(i / FPS, 4), red=red, black=black, white=white, yellow=yellow,
                     blue=blue, green=green, lum=float(G.mean()), motion=motion, pad=pmotion,
                     dy=dy * 4, dx=dx * 4, conf=float(conf)))
    colscan[:, i] = f[:, SW // 2].astype(np.uint8)
    rowscan[:, i] = f[SH // 2, :].astype(np.uint8)
    vprof[:, i] = f.mean(1).astype(np.uint8)
    prev_g, prev_p = G, P

with open(f'{out}/metrics.csv', 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
def save_strip(a, name, h=320):
    im = Image.fromarray(a).resize((N, h), Image.NEAREST)
    im.save(f'{out}/{name}.png')
save_strip(colscan, 'slit_vertical')      # x=time, y=screen y at centre column
save_strip(rowscan, 'slit_horizontal')    # x=time, y=screen x at centre row
save_strip(vprof, 'colour_script')        # x=time, y=row-averaged colour
print('ok')
