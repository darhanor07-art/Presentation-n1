#!/usr/bin/env python3
"""MOKPAN original score: gayageum (Karplus-Strong) + daegeum-like drone + janggu + temple bell + foley.
Reads build/trailer/timeline.json, writes assets/audio/score.wav (48 kHz stereo, exactly the timeline duration)
plus assets/audio/sting_open.wav / sting_end.wav (3.0 s stings under the title / end cards).
Deterministic (fixed seeds). numpy only.   python3 build/sound/score.py
"""
import json, os, re, subprocess, sys, tempfile, wave
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TL = json.load(open(os.path.join(ROOT, 'build', 'trailer', 'timeline.json')))
EV = TL['events']
DUR = TL['frames'] / TL['fps']
NS = int(round(DUR * SR))
OUT = os.path.join(ROOT, 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)
CARD = 3.0          # card length (s); stings are CARD long
OPEN_STAMP, END_STAMP = 0.55, 1.5   # seal landing times inside the cards (keep in sync with cards/*/index.html)

def E(k, d=None):
    return EV.get(k, d)

def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)

# ---------------------------------------------------------------- utils
def tarr(n):
    return np.arange(n) / SR

def fft_band(x, lo, hi):
    """zero-phase band-pass via FFT with smooth skirts (lo/hi in Hz; None = open)."""
    n = len(x); X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); m = np.ones_like(f)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, n)

def env_ad(n, a, d, curve=3.0):
    t = tarr(n); e = np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-t * curve / max(d, 1e-4)); return e

def pan_gains(p):  # p -1..1
    a = (p + 1) * np.pi / 4; return np.cos(a), np.sin(a)

class Bus:
    def __init__(self, n=NS):
        self.l = np.zeros(n); self.r = np.zeros(n); self.n = n
    def add(self, x, t, pan=0.0, gain=1.0, xr=None):
        i = int(round(t * SR))
        if i >= self.n or i + len(x) <= 0: return
        lo = max(0, -i); hi = min(len(x), self.n - i)
        gl, gr = pan_gains(pan)
        self.l[i + lo:i + hi] += x[lo:hi] * gl * gain
        self.r[i + lo:i + hi] += (x if xr is None else xr)[lo:hi] * gr * gain
    def data(self):
        return np.stack([self.l, self.r])

_IR = {}
def reverb(bus, wet, t60=1.7, seed=11):
    """synthetic hall tail, FFT convolution, returns (l, r) wet signals."""
    n = int(t60 * 1.2 * SR); out = []
    for ch, (x) in enumerate((bus.l, bus.r)):
        r = np.random.default_rng(seed + ch)
        ir = r.standard_normal(n) * np.exp(-6.9 * tarr(n) / t60)
        ir = fft_band(ir, 150, 5500) * np.minimum(tarr(n) / 0.02, 1)
        ir /= np.sqrt((ir ** 2).sum())
        L = 1 << int(np.ceil(np.log2(len(x) + n)))
        y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]
        out.append(y * wet)
    return out

# ---------------------------------------------------------------- instruments
def ks_string(freq, dur, rng, t60=2.6, bright=0.55):
    N = max(8, int(round(SR / freq - 0.5)))
    n = int(dur * SR) + 2 * N
    init = rng.uniform(-1, 1, N)
    for _ in range(2): init = 0.5 * (init + np.roll(init, 1)) * (1 - bright) + init * bright     # tame pick brightness
    init -= init.mean()
    d = 10 ** (-3.0 / (t60 * freq))
    y = np.zeros(n); y[:N] = init; q = 0.0
    for k in range(1, n // N):
        p = y[(k - 1) * N:k * N]
        sh = np.concatenate(([y[(k - 1) * N - 1] if k > 1 else 0.0], p[:-1]))
        y[k * N:(k + 1) * N] = d * 0.5 * (p + sh)
    f_act = SR / (N + 0.5)
    return y[:n - N], f_act

def warp(y, rate):
    """read y at variable speed (rate array per output sample)."""
    ph = np.cumsum(rate) - rate[0]
    ph = ph[ph < len(y) - 2]
    i = ph.astype(int); fr = ph - i
    return y[i] * (1 - fr) + y[i + 1] * fr

def gayageum(m, dur, vel=0.8, vib=0.0, bend=0.0, seed=0, t60=None):
    """plucked zither tone. vib: nonghyeon depth in cents (long notes); bend: initial push in semitones decaying to 0."""
    f = mtof(m); rng = np.random.default_rng(1000 + seed + int(m) * 7)
    T = dur + 0.4; t60 = t60 or (3.4 if m < 60 else 2.5)
    y1, fa1 = ks_string(f, T + 0.5, rng, t60)
    y2, fa2 = ks_string(f * 2 ** (6 / 1200), T + 0.5, rng, t60 * 0.9)   # slightly detuned twin string
    n = int(T * SR); t = tarr(n)
    cents = np.zeros(n)
    if vib > 0:
        on = np.clip((t - 0.35) / 0.5, 0, 1)                                  # vibrato blooms after the attack
        cents += vib * on * np.sin(2 * np.pi * (4.6 + 0.8 * on) * t) * (1 + 0.25 * np.sin(2 * np.pi * 0.7 * t))
    if bend:
        cents += bend * 100 * np.exp(-t / 0.09)
    ratio = 2 ** (cents / 1200)
    a = warp(y1, ratio * f / fa1); b = warp(y2, ratio * f * 2 ** (6 / 1200) / fa2)
    L = min(len(a), len(b), n); x = 0.62 * a[:L] + 0.45 * b[:L]
    # sustain vs. decay: long notes ring, short ones are damped after dur
    g = np.ones(L); tt = tarr(L); rel = tt > dur; g[rel] = np.exp(-(tt[rel] - dur) / 0.22)
    x *= g
    x = x / (np.max(np.abs(x)) + 1e-9) * vel * 0.5
    x *= np.minimum(tt / 0.003, 1)
    return x

def kung(vel=1.0, f0=95, seed=1):
    n = int(0.9 * SR); t = tarr(n); rng = np.random.default_rng(300 + seed)
    f = 58 + (f0 - 58) * np.exp(-t / 0.07); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.28) + 0.35 * np.sin(2 * ph * 1.0) * np.exp(-t / 0.1) * 0.5
    thump = fft_band(rng.standard_normal(n), 60, 400) * np.exp(-t / 0.04) * 0.5
    return (body + thump) * vel * 0.9 * np.minimum(t / 0.002, 1)

def deok(vel=1.0, seed=2):
    n = int(0.35 * SR); t = tarr(n); rng = np.random.default_rng(400 + seed)
    nz = fft_band(rng.standard_normal(n), 1800, 6500) * np.exp(-t / 0.045)
    ring = np.sin(2 * np.pi * 410 * t) * np.exp(-t / 0.06) * 0.35 + np.sin(2 * np.pi * 760 * t) * np.exp(-t / 0.035) * 0.2
    return (nz * 0.85 + ring) * vel * 0.65

def tak(vel=1.0, f=880, seed=3):
    n = int(0.3 * SR); t = tarr(n); rng = np.random.default_rng(500 + seed)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.035) + 0.6 * np.sin(2 * np.pi * f * 1.62 * t) * np.exp(-t / 0.022)
    x += fft_band(rng.standard_normal(n), 1500, 7000) * np.exp(-t / 0.008) * 0.9
    return x * vel * 0.55

def swish(dur, f_lo=600, f_hi=4500, vel=0.5, seed=4, rise=0.4):
    """noise swish with a brightness sweep (3-band cross-fade) and an asymmetric envelope."""
    n = int(dur * SR); t = tarr(n) / dur; rng = np.random.default_rng(600 + seed)
    w = rng.standard_normal(n)
    fs = np.geomspace(f_lo, f_hi, 4)
    bands = [fft_band(w, fs[i], fs[i + 1] * 1.4) for i in range(3)]
    pos = np.clip(t * 2.0, 0, 2)
    mix = sum(b * np.clip(1 - np.abs(pos - i), 0, 1) for i, b in enumerate(bands))
    e = np.where(t < rise, (t / rise) ** 2, ((1 - t) / (1 - rise)) ** 1.5)
    return mix * e * vel / (np.std(mix) + 1e-9) * 0.35

def chisel(n_hits, span, seed=5, vel=0.4):
    """short scratchy bursts scattered across span seconds -> list of (offset, samples)."""
    rng = np.random.default_rng(700 + seed); out = []
    offs = np.sort(rng.uniform(0, span, n_hits))
    for o in offs:
        d = rng.uniform(0.04, 0.13); n = int(d * SR); t = tarr(n)
        x = fft_band(rng.standard_normal(n), rng.uniform(2200, 3600), 9500) * np.exp(-t / (d * 0.5))
        x *= 1 + 0.6 * np.sin(2 * np.pi * rng.uniform(50, 110) * t)
        out.append((float(o), x * vel * rng.uniform(0.5, 1.0) * 0.5, rng.uniform(-0.5, 0.5)))
    return out

def paper(dur, vel=0.5, seed=6, rate=14):
    """flutter: band-limited noise, amplitude-modulated by a fluttering random wave."""
    n = int(dur * SR); t = tarr(n); rng = np.random.default_rng(800 + seed)
    nz = fft_band(rng.standard_normal(n), 1200, 7800)
    m = np.abs(fft_band(rng.standard_normal(n), 3, rate * 1.2)); m /= m.max() + 1e-9
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return nz * (0.15 + 0.85 * m ** 1.4) * env * vel * 0.6 / (np.std(nz) + 1e-9) * 0.4

def bell(f0=110.0, vel=1.0, dur=14.0, seed=9):
    n = int(dur * SR); t = tarr(n); rng = np.random.default_rng(900 + seed)
    parts = [(0.5, 0.35, 9.0), (1.0, 1.0, 9.0), (2.0, 0.45, 8.0), (2.76, 0.6, 8.0), (5.4, 0.28, 7.0), (8.9, 0.14, 6.0)]
    x = np.zeros(n)
    for ratio, a, tau in parts:
        f = f0 * ratio
        beat = 0.55 + 0.25 * ratio ** 0.5          # slight beating: each partial is a doublet
        ph0 = rng.uniform(0, 2 * np.pi)
        x += a * np.exp(-t * 6.9 / tau) * (
            np.sin(2 * np.pi * f * t + ph0) + 0.8 * np.sin(2 * np.pi * (f + beat) * t + ph0 * 0.7)) * 0.5
    strike = fft_band(rng.standard_normal(n), 300, 5000) * np.exp(-t / 0.03) * 0.5
    x += strike
    return x / (np.abs(x).max() + 1e-9) * 0.9 * vel * np.minimum(t / 0.0015, 1)

def drone(dur, seed=10):
    n = int(dur * SR); t = tarr(n); rng = np.random.default_rng(1100 + seed)
    f = 73.42                                   # D2
    lfo = 1 + 0.003 * np.sin(2 * np.pi * 0.23 * t)
    ph = 2 * np.pi * np.cumsum(f * lfo) / SR
    x = np.sin(ph) * 0.8 + np.sin(2 * ph) * 0.22 + np.sin(3 * ph) * 0.10 + 0.07 * np.sin(5 * ph)   # a little odd-harmonic reed buzz
    ph5 = 2 * np.pi * np.cumsum(f * 1.5 * lfo) / SR; x += 0.16 * np.sin(ph5)                        # fifth above
    breath = fft_band(rng.standard_normal(n), 260, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.17 * t + 1.0))
    breath = breath / (np.std(breath) + 1e-9) * 0.12
    return x * 0.5 + breath

def riser(dur, f_a=48, f_b=118, vel=0.5, seed=12):
    n = int(dur * SR); t = tarr(n); u = t / dur; rng = np.random.default_rng(1200 + seed)
    f = f_a * (f_b / f_a) ** (u ** 1.5); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * 0.8 + 0.25 * np.sin(2 * ph)
    nz = fft_band(rng.standard_normal(n), 200, 2500) * u ** 2 * 0.35 / 1.0
    return (x + nz / (np.std(nz) + 1e-9) * 0.12) * u ** 1.3 * vel

def rub(dur, vel=0.4, seed=13):
    n = int(dur * SR); t = tarr(n); rng = np.random.default_rng(1300 + seed)
    nz = fft_band(rng.standard_normal(n), 700, 5200)
    stroke = 0.35 + 0.65 * np.abs(np.sin(np.pi * 2.2 * t))          # back-and-forth hand strokes
    e = np.minimum(t / 0.2, 1) * np.minimum((dur - t) / 0.3, 1)
    return nz / (np.std(nz) + 1e-9) * stroke * e * vel * 0.22

def growl(dur, vel=0.8, seed=14):
    n = int(dur * SR); t = tarr(n); rng = np.random.default_rng(1400 + seed)
    nz = fft_band(rng.standard_normal(n), 70, 900)
    am = 0.55 + 0.45 * np.sin(2 * np.pi * (24 - 8 * t / dur) * t)
    e = np.minimum(t / 0.05, 1) * np.exp(-t / (dur * 0.45))
    return nz / (np.std(nz) + 1e-9) * am * e * vel * 0.4

# ---------------------------------------------------------------- arrangement
def build():
    mel, drum, fol, dro, bel = Bus(), Bus(), Bus(), Bus(), Bus()
    D3, E3, G3, A3, B3 = 50, 52, 55, 57, 59
    D4, E4, G4, A4, B4, D5 = 62, 64, 67, 69, 71, 74

    def N(t, m, dur, vel=0.8, vib=0.0, bend=0.0, pan=0.0, seed=0):
        mel.add(gayageum(m, dur, vel, vib, bend, seed), t, pan)

    s1 = E('s01_seal', 2.1)
    # --- s01 cover: chisel work, a lone low D, seal slam
    for o, x, p in chisel(14, 1.4, 1, 0.55): fol.add(x, 0.75 + o, p)
    N(0.9, D3, 1.0, 0.7, vib=18, pan=-0.1, seed=1)
    N(1.55, A3, 0.5, 0.6, pan=0.1, seed=2)
    fol.add(tak(1.0), s1, 0.0); drum.add(kung(1.0), s1, 0.0); drum.add(deok(0.8), s1 + 0.02, 0.1)
    N(s1 + 0.35, D4, 1.4, 0.7, vib=25, bend=0.4, pan=-0.15, seed=3)
    # --- s02 moon (drone enters at s02 start, leaves after s03)
    s2 = next(s['start'] for s in TL['segments'] if s['id'] == 's02')
    s4 = next(s['start'] for s in TL['segments'] if s['id'] == 's04')
    N(s2 + 0.3, A3, 1.6, 0.65, vib=22, pan=0.1, seed=4)
    N(s2 + 1.6, B3, 0.5, 0.55, pan=-0.1, seed=5)
    N(s2 + 2.15, A3, 0.5, 0.55, pan=0.05, seed=6)
    N(s2 + 2.7, G3, 0.9, 0.6, vib=14, pan=-0.05, seed=7)
    # --- s03 door
    d0, d1 = E('s03_door_start', 8.9), E('s03_door_end', 10.3)
    N(d0 - 0.5, E3, 0.8, 0.55, pan=-0.1, seed=8)
    N(d0 + 0.1, G3, 0.6, 0.6, pan=0.1, seed=9)
    N(d0 + 0.75, D4, 0.8, 0.6, pan=0.0, seed=10)
    N(d1 - 0.35, E4, 1.6, 0.7, vib=30, bend=0.5, pan=0.05, seed=11)
    sl = swish(d1 - d0, 120, 1800, 0.55, seed=1, rise=0.3)       # wooden door sliding: low scrape
    fol.add(sl, d0, -0.3); fol.add(chisel(8, d1 - d0, 7, 0.25)[0][1], d0 + 0.2, -0.2)
    # drone bed s02 -> s03 end
    tdr0, tdr1 = s2 - 0.1, s4 - 0.2
    dd = drone(tdr1 - tdr0 + 0.01); tt = tarr(len(dd)); L = tt[-1]
    dd *= np.minimum(tt / 1.8, 1) ** 2 * np.minimum((L - tt) / 1.0, 1) ** 2
    dro.add(dd * 0.9, tdr0, 0.0)
    # --- s04 carving + brush
    for o, x, p in chisel(26, 1.9, 2, 0.5): fol.add(x, s4 + 0.1 + o, p)
    N(s4 + 0.6, A3, 0.5, 0.55, pan=-0.1, seed=12); N(s4 + 1.2, D4, 0.5, 0.6, pan=0.1, seed=13)
    b1, b2 = E('s04_brush1', 13.6), E('s04_brush2', 14.3)
    fol.add(swish(0.55, 900, 6000, 0.7, seed=2, rise=0.35), b1 - 0.1, -0.35)
    fol.add(swish(0.6, 700, 5200, 0.7, seed=3, rise=0.4), b2 - 0.1, 0.35)
    N(b1 - 0.05, G4, 0.7, 0.7, bend=0.3, pan=-0.2, seed=14)
    N(b2 - 0.05, A4, 1.1, 0.7, vib=20, bend=0.3, pan=0.2, seed=15)
    drum.add(kung(0.5, seed=2), b1, -0.1); drum.add(kung(0.55, seed=3), b2, 0.1)
    # --- s05 paper + rub + peel
    pd = E('s05_paper_drop', 16.3); r0, r1 = E('s05_rub_start', 16.7), E('s05_rub_end', 19.3); pl = E('s05_peel_start', 18.9)
    fol.add(paper(0.9, 0.9, seed=1, rate=11), pd - 0.75, 0.0); fol.add(tak(0.7, 600, seed=4), pd, 0.0); drum.add(kung(0.45, 80, seed=4), pd, 0.0)
    fol.add(rub(r1 - r0 - 0.1, 0.9), r0, 0.0)
    for i, o in enumerate([0.3, 0.95, 1.5, 1.95, 2.3]):         # accelerating pulse during the rub
        N(r0 + o, A3 if i % 2 == 0 else E3, 0.35, 0.5 + 0.06 * i, pan=-0.15 + 0.07 * i, seed=20 + i)
    drum.add(kung(0.35, 75, seed=5), r0 + 1.55, 0); drum.add(kung(0.5, 75, seed=6), r0 + 2.0, 0); drum.add(kung(0.7, 75, seed=7), r0 + 2.3, 0)
    fol.add(paper(1.3, 1.0, seed=2, rate=16), pl, 0.15)
    drum.add(deok(0.55, seed=8), pl + 0.05, 0.2)
    N(r1 + 0.1, D4, 1.7, 0.75, vib=28, bend=0.3, pan=0.0, seed=30)
    N(r1 + 1.5, B3, 0.5, 0.55, pan=-0.1, seed=31); N(r1 + 2.0, A3, 0.5, 0.55, pan=0.1, seed=32); N(r1 + 2.6, G3, 1.2, 0.6, vib=15, pan=-0.1, seed=33)
    # --- s06 tiger: eyes open, roar
    eo, ro = E('s06_eyes_open', 24.1), E('s06_roar', 25.6)
    dro.add(riser(1.7, 40, 70, 0.45, seed=1), eo - 1.5, 0.0)
    drum.add(kung(0.9, 70, seed=9), eo, 0.0); N(eo, D3, 1.6, 0.7, vib=20, pan=-0.1, seed=34); N(eo + 0.12, A3, 1.4, 0.55, pan=0.1, seed=35)
    fol.add(swish(0.5, 800, 3500, 0.35, seed=5, rise=0.3), eo - 0.2, 0.0)
    drum.add(kung(1.0, 62, seed=10), ro, 0.0); drum.add(deok(0.9, seed=11), ro + 0.01, 0.0)
    fol.add(growl(1.0, 0.9), ro, 0.0)
    # --- t06 claws
    for i in range(4):
        tc = E('t06_claw%d' % i, 26.0 + 0.07 * i)
        drum.add(deok(0.95 - 0.07 * i, seed=20 + i), tc, -0.5 + 0.33 * i)
        fol.add(swish(0.28, 1500, 8000, 0.8, seed=10 + i, rise=0.2), tc - 0.03, -0.55 + 0.37 * i)
    drum.add(kung(0.9, 66, seed=12), E('t06_claw0', 26.0), 0.0)
    # --- s07 bell: hold tension, release, impact
    h0, rl, bt = E('s07_hold_start', 28.4), E('s07_release', 30.0), E('s07_bell', 30.3)
    N(27.5, E3, 1.0, 0.5, pan=-0.1, seed=36); N(h0 - 0.2, B3, 1.0, 0.45, vib=14, pan=0.1, seed=37)
    dro.add(riser(rl - h0, 45, 110, 0.55, seed=2), h0, 0.0)
    for i in range(6): drum.add(kung(0.18 + 0.08 * i, 70, seed=30 + i), h0 + 0.25 + i * (1.35 / 6) + (i * i) * 0.004, 0.0)
    fol.add(swish(0.28, 400, 2500, 0.4, seed=6, rise=0.8), rl - 0.12, 0.0)     # rope let go
    bel.add(bell(110.0, 1.0, 14.0), bt, 0.0, 1.0)
    N(bt + 2.7, D4, 1.6, 0.45, vib=22, pan=0.1, seed=38); N(bt + 4.0, A3, 1.0, 0.4, pan=-0.1, seed=39)
    # --- s08 crack + split
    cr, sp = E('s08_crack', 35.4), E('s08_split', 36.1)
    fol.add(growl(0.35, 0.7, seed=2), cr, 0.0)
    for o, x, p in chisel(10, 0.7, 4, 1.1): fol.add(x, cr + o, p)
    drum.add(kung(1.0, 64, seed=13), cr, 0.0); drum.add(deok(1.0, seed=14), cr + 0.01, 0.0); fol.add(tak(1.1, 1100, seed=7), cr, 0.0)
    N(cr + 0.15, D3, 0.7, 0.8, pan=-0.1, seed=40); N(cr + 0.4, A3, 0.5, 0.7, pan=0.1, seed=41)
    drum.add(kung(0.5, 70, seed=15), cr + 0.45, 0.0)
    drum.add(kung(1.0, 56, seed=16), sp, 0.0); drum.add(deok(1.0, seed=17), sp, 0.0); drum.add(deok(0.8, seed=18), sp + 0.12, 0.3)
    fol.add(growl(0.9, 1.0, seed=3), sp, 0.0); fol.add(swish(0.7, 500, 7000, 0.8, seed=7, rise=0.15), sp - 0.05, 0.0)
    N(sp + 0.05, G3, 0.7, 0.8, pan=-0.15, seed=42); N(sp + 0.5, A3, 0.5, 0.7, pan=0.15, seed=43); N(sp + 0.95, D4, 0.6, 0.7, pan=0.0, seed=44)
    # --- t08 ribbon: a rising strum + long swish
    rb = E('t08_ribbon', 37.8)
    fol.add(swish(1.1, 500, 6000, 0.6, seed=8, rise=0.6), rb - 0.3, 0.3)
    for i, m in enumerate([D4, E4, G4, A4, B4, D5]): N(rb - 0.3 + 0.09 * i, m, 0.5 if i < 5 else 1.2, 0.5 + 0.04 * i, vib=0 if i < 5 else 20, pan=-0.3 + 0.12 * i, seed=50 + i)
    # --- s09 finale
    es = E('s09_end_seal', 40.0)
    fol.add(tak(1.0, 760, seed=8), es, 0.0); drum.add(kung(0.8, 72, seed=19), es, 0.0)
    N(es + 0.1, D3, 3.0, 0.75, vib=18, pan=-0.1, seed=60); N(es + 0.28, D4, 3.0, 0.75, vib=34, bend=0.3, pan=0.1, seed=61)
    N(es + 1.3, A3, 1.7, 0.45, vib=16, pan=0.0, seed=62)

    # ---- reverb + ducking + mix
    tt = tarr(NS)
    duck = 1 - 0.78 * np.exp(-np.maximum(tt - bt, 0) / 2.3) * (tt >= bt - 0.03) * np.minimum((tt - bt + 0.03) / 0.03, 1)
    # wet
    out = np.zeros((2, NS))
    for bus, dry, wet, t60 in ((mel, 3.4, 0.30, 1.8), (fol, 0.5, 0.14, 1.2), (drum, 0.75, 0.16, 1.4), (dro, 0.32, 0.12, 2.0)):
        wl, wr = reverb(bus, wet, t60)
        out[0] += (bus.l + wl) * dry * duck; out[1] += (bus.r + wr) * dry * duck
    wl, wr = reverb(bel, 0.10, 2.4)
    out[0] += (bel.l + wl) * 1.3; out[1] += (bel.r + wr) * 1.3
    # fade-out on the finale
    fo0 = es + 0.9; g = np.where(tt < fo0, 1.0, np.cos(np.clip((tt - fo0) / (DUR - fo0), 0, 1) * np.pi / 2) ** 2)
    out *= g
    # tiny stereo widening of the highs is skipped on purpose (keeps mono-compat)
    return out

def build_stings():
    D4, A4, D5 = 62, 69, 74
    o = Bus(int(CARD * SR)); e = Bus(int(CARD * SR))
    o.add(tak(1.0, 820, seed=20), OPEN_STAMP, 0); o.add(kung(1.0, 80, seed=21), OPEN_STAMP, 0); o.add(deok(0.6, seed=22), OPEN_STAMP + 0.02, 0.1)
    o.add(swish(0.55, 500, 4500, 0.4, seed=21, rise=0.7), OPEN_STAMP - 0.5, 0)
    for i, (m, dt) in enumerate(((D4, 0.2), (A4, 0.55), (D5, 1.1))):
        o.add(gayageum(m, 1.4, 0.55, vib=20 if i == 2 else 0, seed=70 + i), OPEN_STAMP + dt + 0.2, -0.1 + 0.1 * i)
    o.add(bell(110.0, 0.55, CARD - OPEN_STAMP, seed=2), OPEN_STAMP, 0, 0.6)
    e.add(drone(CARD, seed=2) * np.minimum(tarr(int(CARD * SR)) / 0.6, 1) * 0.55, 0.0, 0)
    e.add(gayageum(D4, 2.0, 0.5, vib=26, bend=0.3, seed=80), 0.35, 0.0)
    e.add(tak(0.9, 760, seed=23), END_STAMP, 0); e.add(kung(0.7, 72, seed=24), END_STAMP, 0)
    e.add(bell(110.0, 0.35, CARD - END_STAMP, seed=3), END_STAMP, 0, 0.5)
    res = []
    for b, tail in ((o, 0.0), (e, 0.5)):
        wl, wr = reverb(b, 0.2, 1.5)
        x = np.stack([b.l + wl, b.r + wr]); t = tarr(x.shape[1])
        x *= np.minimum((t[-1] - t) / 0.4, 1)                      # fade the last 0.4 s
        res.append(x)
    return res

# ---------------------------------------------------------------- mastering
def write_wav(path, x):
    pcm = np.clip(np.round(x.T * 32767), -32768, 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

def measure(x):
    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, 'm.wav'); write_wav(p, x)
        r = subprocess.run(['ffmpeg', '-nostats', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = r[r.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)); pk = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', s).group(1))
    return I, pk

def master(x, target=-16.0, ceil_db=-1.2, tp=-1.0):
    """gain to the target loudness through a soft ceiling; iterate with ffmpeg ebur128 (approximate LUFS)."""
    ceil = 10 ** (ceil_db / 20); g = ceil / np.abs(x).max()
    for _ in range(6):
        y = np.tanh(x * g / ceil) * ceil
        I, pk = measure(y)
        if abs(I - target) < 0.25: break
        g *= 10 ** ((target - I) / 20 * 0.9)
    pkl = 10 ** (tp / 20)
    if np.abs(y).max() > pkl: y *= pkl / np.abs(y).max()
    return y

if __name__ == '__main__':
    x = build()
    y = master(x)
    assert y.shape[1] == NS
    write_wav(os.path.join(OUT, 'score.wav'), y)
    I, pk = measure(y)
    print('score.wav: %.3f s (%d samples), integrated %.1f LUFS, sample peak %.2f dBFS, RMS %.1f dBFS' % (NS / SR, NS, I, pk, 20 * np.log10(np.sqrt((y ** 2).mean()))))
    so, se = build_stings()
    for nm, s in (('sting_open', so), ('sting_end', se)):
        s = s * (10 ** (-3.0 / 20) / np.abs(s).max()); write_wav(os.path.join(OUT, nm + '.wav'), s)
        print(nm + '.wav: %.2f s, peak %.1f dBFS' % (s.shape[1] / SR, 20 * np.log10(np.abs(s).max())))
