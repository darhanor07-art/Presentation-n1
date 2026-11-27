import sys, csv, numpy as np, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
from PIL import Image
d = sys.argv[1]
R = list(csv.DictReader(open(f'{d}/metrics.csv')))
t = np.array([float(r['t']) for r in R])
g = lambda k: np.array([float(r[k]) for r in R])
def sm(x, k=5): return np.convolve(x, np.ones(k)/k, mode='same')
fig, ax = plt.subplots(5, 1, figsize=(18, 17), sharex=True, gridspec_kw=dict(height_ratios=[1.3, 1, 1, 1, 0.9]))
ax[0].stackplot(t, g('red'), g('black'), g('white'), g('yellow'), g('blue')+g('green'),
                colors=['#d9140b', '#111', '#ddd', '#e2c02a', '#2e9bd6'], labels=['red', 'black', 'white', 'yellow', 'blue+green'])
ax[0].set_ylabel('colour share'); ax[0].legend(loc='upper right', ncol=5); ax[0].set_ylim(0, 1)
ax[1].plot(t, sm(g('motion')), label='screen motion |Δ|', c='k'); ax[1].plot(t, sm(g('pad'))*3, label='trackpad/finger motion ×3', c='tab:orange')
ax[1].legend(loc='upper right'); ax[1].set_ylabel('energy')
ax[2].plot(t, sm(g('dy'), 3), label='content dy px/frame (orig px)', c='tab:blue'); ax[2].plot(t, sm(g('dx'), 3), label='dx', c='tab:green', alpha=.7)
ax[2].set_ylim(-120, 120); ax[2].legend(loc='upper right'); ax[2].set_ylabel('shift/frame')
ax[3].plot(t, g('conf'), c='tab:purple', label='phase-corr confidence (high = rigid translation)'); ax[3].legend(loc='upper right')
ax[4].plot(t, g('lum'), c='gray', label='mean luminance'); ax[4].legend(loc='upper right')
for a in ax:
    a.set_xticks(np.arange(0, 24, 0.5), minor=True); a.set_xticks(np.arange(0, 24, 1)); a.grid(True, which='both', alpha=.25)
ax[-1].set_xlabel('seconds'); ax[0].set_xlim(0, t[-1])
plt.tight_layout(); plt.savefig(f'{d}/metrics.png', dpi=80)
# slit-scans with second ticks
for name in ['slit_vertical', 'slit_horizontal', 'colour_script']:
    im = Image.open(f'{d}/{name}.png').convert('RGB'); a = np.array(im)
    for s in range(0, 24):
        x = int(s * 60)
        if x < a.shape[1]: a[:, x:x+2] = [0, 200, 255] if s % 5 else [255, 255, 0]
    Image.fromarray(a).save(f'{d}/{name}_ticks.png')
print('plotted')
