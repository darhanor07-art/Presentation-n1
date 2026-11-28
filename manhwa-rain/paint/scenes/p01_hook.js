/* Page 1 — hook: hook_sky, hook_city, hook_roofs */
(function () {
  const P = PAINT, L = P.lib, PAL = L.PAL;
  const SZ_P = { w: 1080, h: 1512 }, SZ_T = { w: 1080, h: 1890 };

  P.register('hook_sky', { ...SZ_T, alpha: false, seed: 101 }, async (k) => {
    const W = k.W, H = k.H, r = L.rng(1011), c = L.layer();
    L.vgrad(c, [[0, '#070b12'], [.45, '#121b27'], [.8, '#243142'], [1, '#3a3d44']]);
    L.glow(c, W * .5, H * 1.02, W * 1.0, '#c4904f', .4, 'screen');
    // a lighter break in the clouds
    L.glow(c, W * .66, H * .3, W * .5, '#5f7791', .3, 'screen');
    const clamp01 = v => Math.max(0, Math.min(1, v));
    // each depth layer: puff density field -> fbm-eroded -> shaded (lit tops, dark undersides) -> tone-mapped
    const cloudLayer = (tone, cnt, wmin, wmax, seed, opac) => {
      const RS = 6, cw = Math.ceil(W / RS), ch = Math.ceil(H / RS); const dc = document.createElement('canvas'); dc.width = cw; dc.height = ch; const dx = dc.getContext('2d', { willReadFrequently: true });
      for (let i = 0; i < cnt; i++) { const w = wmin + r() * (wmax - wmin), cx = r() * W, base = H * (.18 + r() * .85), h = w * (1.2 + r() * 1.4), n = 12;
        for (let j = 0; j < n; j++) { const t = Math.pow(r(), .8), y = base - t * h, rad = w * (.34 - .16 * t + r() * .1) / RS, x = (cx + (r() - .5) * w * (.8 - .5 * t)) / RS; const g = dx.createRadialGradient(x, y / RS, 0, x, y / RS, rad); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)'); dx.fillStyle = g; dx.beginPath(); dx.arc(x, y / RS, rad, 0, 6.2832); dx.fill(); } }
      const src = dx.getImageData(0, 0, cw, ch).data; const D = new Float32Array(cw * ch);
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const nz = L.fbm(i * RS / 150, j * RS / 130, 5, seed) - .5; D[j * cw + i] = src[(j * cw + i) * 4 + 3] / 255 * 1.35 + nz * .75; }
      const out = document.createElement('canvas'); out.width = cw; out.height = ch; const ox = out.getContext('2d'); const im = ox.createImageData(cw, ch); const o = im.data;
      const dk = L.hex(L.mix('#04070c', '#1a2330', tone)), lt = L.hex(L.mix('#243245', '#93a8bf', tone)), wm = L.hex('#a87a46');
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const d = D[j * cw + i], a = clamp01((d - .5) / .42); if (a <= 0) continue;
        const up = D[Math.max(0, j - 3) * cw + i], dn = D[Math.min(ch - 1, j + 3) * cw + i]; let lit = clamp01(.45 + (dn - up) * 1.6 + (d - .7) * .5); lit = lit * lit * (3 - 2 * lit);
        const yy = j * RS / H, warm = clamp01((yy - .55) * 2.2) * (1 - lit) * .75; const p = (j * cw + i) * 4;
        o[p] = dk[0] + (lt[0] - dk[0]) * lit + (wm[0] - dk[0]) * warm * .5; o[p + 1] = dk[1] + (lt[1] - dk[1]) * lit + (wm[1] - dk[1]) * warm * .5; o[p + 2] = dk[2] + (lt[2] - dk[2]) * lit + (wm[2] - dk[2]) * warm * .4; o[p + 3] = 255 * a * opac; }
      ox.putImageData(im, 0, 0); c.save(); c.imageSmoothingEnabled = true; c.filter = `blur(${4 * c.q}px)`; c.drawImage(out, -6, -6, W + 12, H + 12); c.restore();
    };
    cloudLayer(.62, 24, 100, 180, 3, .75); cloudLayer(.5, 14, 180, 320, 7, .9); cloudLayer(.32, 8, 300, 520, 11, .95); cloudLayer(.18, 4, 460, 760, 17, 1);
    // soft blur to merge puffs into wet-in-wet masses, then re-sharpen a little with ink-wash glazes
    
    L.glaze(c, [{ color: '#3a4656', op: 70 }, { color: '#1a2230', op: 60 }], (b, i, rnd) => { for (let j = 0; j < 12; j++) b.polygon(L.blobPts(rnd() * W, rnd() * H, 140 + rnd() * 240, 120 + rnd() * 240, { n: 14, rough: .35, rnd })); }, { seed: 105, bleed: .45, tex: .7, border: .1, alpha: .45 });
    L.glow(c, W * .5, H * 1.0, W * .9, '#c4904f', .25, 'screen');
    L.vignette(c, .5); L.grain(c, { a: .07 });
    return c;
  });

  P.register('hook_city', { ...SZ_P, alpha: true, seed: 102 }, async (k) => {
    const c = L.layer(), W = k.W, H = k.H;
    // distant warm haze on the horizon (behind far layer)
    L.glow(c, W * .5, 1010, W * .55, '#a98253', .2, 'screen');
    // far skyline: pale, bluish, tiny windows
    L.skyline(c, { base: 1070, hmin: 50, hmax: 210, wmin: 26, wmax: 70, far: .8, seed: 311, winDens: .5, winSize: [2.2, 3.3], warm: .3, gap: -2, inkW: .3, steps: .5, antenna: .25, fillDown: 60, glazes: 1 });
    L.fog(c, { y0: 880, y1: 1110, color: '#6E89A3', a: .2, seed: 21 });
    // mid skyline
    L.skyline(c, { base: 1215, hmin: 90, hmax: 330, wmin: 40, wmax: 100, far: .5, seed: 312, winDens: .4, winSize: [3.6, 5.2], warm: .42, gap: -2, inkW: .4, steps: .5, antenna: .2, fillDown: 60, glazes: 2 });
    L.fog(c, { y0: 1010, y1: 1290, color: '#5b738c', a: .16, seed: 22 });
    // near skyline — the hero: dense, sharp
    L.skyline(c, { base: 1400, hmin: 140, hmax: 470, wmin: 70, wmax: 170, far: .12, seed: 313, winDens: .36, winSize: [6, 9], warm: .5, inkW: .7, steps: .55, antenna: .22, fillDown: 120, glazes: 3, gap: -2, colTop: '#1b2634', colBot: '#080c12' });
    L.fog(c, { y0: 1230, y1: 1512, color: '#3D4C5E', a: .12, seed: 23 });
    L.rough(c, { amp: 2.6, seed: 4 });
    // light: bloom of the lit windows, bokeh in the foreground haze, vertical rain-blurred streaks
    L.bokeh(c, { n: 16, area: { x0: 0, y0: 1130, x1: W, y1: 1480 }, rmin: 10, rmax: 34, colors: [[PAL.yellow, 6], ['#FFD98A', 3], [PAL.mist, 2], [PAL.rain, 1], [PAL.signal, 1]], a: .4, seed: 7 });
    L.glow(c, W * .5, 1500, W * .7, '#d1a25e', .22, 'screen'); L.glow(c, W * .5, 1230, W * .5, '#d1a25e', .1, 'screen');
    L.bloom(c, { blur: 14, a: .5, boost: 1.6, contrast: 2.0 });
    L.bloom(c, { blur: 40, a: .3, boost: 1.4, contrast: 1.8 });
    L.rain(c, { n: 340, ang: 11, len: [30, 90], w: .8, alpha: .22, color: '#9fb4c8', seed: 51 });
    L.grain(c, { a: .06, atop: true });
    L.cleanAlpha(c);
    return c;
  });

  P.register('hook_roofs', { ...SZ_P, alpha: true, seed: 103 }, async (k) => {
    const c = L.layer(), W = k.W, H = k.H, r = k.rnd;
    const roofY = (x) => 1140 + (x / W) * -30;           // far edge of roof slab (slight slope)
    // --- roof slab (value block) ---
    const slab = [[-10, 1168], [W + 10, 1112], [W + 10, H + 10], [-10, H + 10]];
    c.save(); const g = c.createLinearGradient(0, 1110, 0, H); g.addColorStop(0, '#222c3a'); g.addColorStop(.35, '#131a24'); g.addColorStop(1, '#090d13'); c.fillStyle = g; c.beginPath(); slab.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.fill(); c.restore();
    // tank on legs (right), drawn before parapet
    const tx = 800, ty = 1130, tr = 100, th = 230; // tx centre, ty ground contact
    // legs
    c.save(); c.strokeStyle = '#0a0f16'; c.lineWidth = 9; c.lineCap = 'round';
    [[-80, 0], [80, 0], [-30, -6], [35, -6]].forEach(([dx]) => { c.beginPath(); c.moveTo(tx + dx, ty); c.lineTo(tx + dx * .92, ty - 100); c.stroke(); });
    c.lineWidth = 4; c.beginPath(); c.moveTo(tx - 78, ty - 20); c.lineTo(tx + 72, ty - 92); c.moveTo(tx + 78, ty - 20); c.lineTo(tx - 72, ty - 92); c.stroke(); c.restore();
    // body (cylinder shading: dark -> lit rim on left from city glow)
    c.save(); const tb = ty - 90, tt = tb - th; const gx = c.createLinearGradient(tx - tr, 0, tx + tr, 0);
    gx.addColorStop(0, '#5c6f86'); gx.addColorStop(.1, '#3a4a5e'); gx.addColorStop(.45, '#1b2532'); gx.addColorStop(1, '#0b1018'); c.fillStyle = gx;
    c.beginPath(); c.moveTo(tx - tr, tb); c.lineTo(tx - tr, tt); c.ellipse(tx, tt, tr, 18, 0, Math.PI, 0, false); c.lineTo(tx + tr, tb); c.ellipse(tx, tb, tr, 18, 0, 0, Math.PI, false); c.closePath(); c.fill();
    // lid cone
    c.fillStyle = '#18212c'; c.beginPath(); c.moveTo(tx - tr * .98, tt); c.lineTo(tx, tt - 54); c.lineTo(tx + tr * .98, tt); c.ellipse(tx, tt, tr * .98, 16, 0, 0, Math.PI, false); c.fill();
    c.restore();
    // brush texture + straps
    L.glaze(c, [{ color: '#1a2330', op: 150 }], (b) => { b.polygon([[tx - tr, tb], [tx - tr, tt], [tx + tr, tt], [tx + tr, tb]]); }, { seed: 91, bleed: .1, tex: .7, border: .3, alpha: .55, atop: true });
    L.paint(c, (b, rnd) => { [.18, .5, .82].forEach(f => { const y = tb - th * f; L.ink(b, [[tx - tr, y], [tx - tr * .3, y + 14], [tx + tr, y]], { color: '#04070b', w: .9, rnd, gap: .08, wig: .6 }); });
      L.ink(b, [[tx - tr, tb], [tx - tr, tt]], { color: '#04070b', w: .6, rnd, gap: .3 }); L.ink(b, [[tx + tr, tb], [tx + tr, tt]], { color: '#04070b', w: .6, rnd, gap: .3 });
      L.ink(b, [[tx - tr * .98, tt], [tx, tt - 54], [tx + tr * .98, tt]], { color: '#04070b', w: .6, rnd, gap: .2 }); }, { seed: 92, mode: 'mask', color: '#05080d', alpha: .9 });
    // rim light on tank (cool, from the city glow behind)
    L.paint(c, (b, rnd) => { L.ink(b, [[tx - tr + 3, tb - 6], [tx - tr + 3, tt + 4]], { brush: 'pen', color: '#9fb4c8', w: .9, rnd, gap: .1, wig: .5 }); L.ink(b, [[tx - tr * .98, tt - 2], [tx - 6, tt - 54]], { brush: 'pen', color: '#9fb4c8', w: .7, rnd, gap: .15, wig: .5 }); }, { seed: 93, mode: 'mask', color: '#a9c0d6', alpha: .8, gain: 1.4 });
    L.glow(c, tx - tr + 6, tt + th * .35, 140, '#8fb0cc', .12, 'screen');
    // access shed (left) with a door glowing warm
    const sx = 70, sw = 230, sh = 190, sy = 1160;
    c.save(); c.fillStyle = '#141c27'; c.fillRect(sx, sy - sh, sw, sh); c.fillStyle = '#0d131b'; c.fillRect(sx + sw, sy - sh + 14, 38, sh - 14); c.fillStyle = '#212c3a'; c.fillRect(sx - 10, sy - sh - 12, sw + 20, 14); c.restore();
    L.glaze(c, [{ color: '#1a2431', op: 150 }], (b) => b.polygon([[sx, sy - sh], [sx + sw, sy - sh], [sx + sw, sy], [sx, sy]]), { seed: 94, bleed: .1, tex: .7, alpha: .6, atop: true });
    L.paint(c, (b, rnd) => { L.inkRect(b, sx, sy - sh, sw, sh, { color: '#04070b', w: .8, rnd, gap: .12 }); L.inkRect(b, sx - 10, sy - sh - 12, sw + 20, 14, { color: '#04070b', w: .6, rnd, gap: .15 }); }, { seed: 95, mode: 'mask', color: '#04070b', alpha: .95 });
    // door: warm lit
    const dx = sx + 150, dw = 54, dh = 110; L.windowLight(c, dx, sy - dh, dw, dh, '#F2C230', { a: .95, glow: 260, glowA: .5 });
    c.save(); c.fillStyle = 'rgba(30,20,8,.55)'; c.fillRect(dx + dw / 2 - 2, sy - dh, 4, dh); c.restore();
    L.lampCone(c, dx + dw / 2, sy - 6, { angle: 12, spread: 34, len: 330, color: '#F2C230', a: .25, blur: 14 });
    // small window on shed
    L.windowLight(c, sx + 34, sy - sh + 52, 56, 34, '#9fb6cc', { a: .55, glow: 90, glowA: .15 });
    // vent pipes / chimney stubs
    [[470, 1145, 34, 70], [560, 1132, 26, 52], [635, 1128, 40, 40]].forEach(([x, y, w, h]) => { c.fillStyle = '#10161f'; c.fillRect(x, y - h, w, h); c.fillStyle = '#26323f'; c.fillRect(x - 3, y - h - 6, w + 6, 8); c.fillStyle = 'rgba(159,180,200,.5)'; c.fillRect(x - 3, y - h - 6, w + 6, 1.6); });
    // antennas (left-centre) — thin ink masts + crossbars
    L.paint(c, (b, rnd) => {
      const mast = (x, y0, y1, bars) => { L.ink(b, [[x, y0], [x + rnd.range(-3, 3), y1]], { color: '#04070b', w: 1.1, rnd, gap: .02, wig: .7, press: false }); bars.forEach(([f, hw]) => { const y = y0 + (y1 - y0) * f; L.ink(b, [[x - hw, y], [x + hw, y + rnd.range(-3, 3)]], { color: '#04070b', w: .8, rnd, gap: .05, press: false }); }); };
      mast(380, 1150, 840, [[.1, 46], [.2, 38], [.3, 30], [.42, 22], [.55, 16]]); mast(610, 1135, 940, [[.12, 30], [.26, 24], [.4, 18]]); mast(995, 1118, 960, [[.2, 26], [.4, 18]]);
      L.ink(b, [[380, 1150], [330, 1160]], { color: '#04070b', w: .7, rnd, gap: 0 });
      b.circle(540, 1085, 30); b.set('rotring', '#04070b', .9); b.circle(540, 1085, 30); L.ink(b, [[540, 1085], [575, 1050]], { color: '#04070b', w: .9, rnd, gap: 0, press: false });
    }, { seed: 96, mode: 'mask', color: '#04070b', alpha: .95 });
    // satellite dish: filled ellipse body
    c.save(); c.fillStyle = '#1a2431'; c.beginPath(); c.ellipse(540, 1085, 32, 26, -.4, 0, 6.3); c.fill(); c.strokeStyle = 'rgba(159,180,200,.5)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(540, 1085, 32, 26, -.4, 3.4, 5.2); c.stroke(); c.restore();
    // wires crossing the frame
    L.wires(c, { pts: [[-20, 925], [380, 850], [700, 915], [1100, 880]], sag: 38, w: 2.4 });
    L.wires(c, { pts: [[380, 862], [610, 956], [1100, 1010]], sag: 26, w: 2 });
    L.wires(c, { pts: [[-20, 1060], [330, 1000], [610, 970]], sag: 30, w: 1.6 });
    L.wires(c, { pts: [[995, 962], [1100, 975]], sag: 8, w: 1.8 });
    // --- wet roof: sheen, puddles with reflections, streaks from the warm door
    const sheen = L.noiseAlpha(W, 400, { sx: 2.6, sy: .5, oct: 4, seed: 61, lo: .45, hi: .78, color: '#7f9ab4', res: 8 });
    c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = .22; c.beginPath(); slab.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.clip(); c.drawImage(sheen.canvas, 0, 1120, W, 392); c.restore();
    const lights = [{ x: dx + dw / 2, y: sy + 4, r: 20, color: '#F2C230', a: .55, len: 260 }, { x: tx - 70, y: 1135, r: 14, color: '#9fb4c8', a: .22, len: 150 }, { x: 620, y: 1150, r: 18, color: '#c9d4de', a: .12, len: 170 }];
    L.lightStreaks(c, lights, { amp: 4 });
    // puddles
    [[450, 1330, 190, 36], [880, 1260, 120, 22], [200, 1400, 150, 28]].forEach(([px, py, rx, ry], i) => {
      c.save(); c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, 6.3); c.clip();
      const pg = c.createLinearGradient(0, py - ry, 0, py + ry); pg.addColorStop(0, '#6f8aa5'); pg.addColorStop(.6, '#2d3b4d'); pg.addColorStop(1, '#4a5d73'); c.globalAlpha = .62; c.fillStyle = pg; c.fillRect(px - rx, py - ry, rx * 2, ry * 2);
      c.globalAlpha = .3; c.fillStyle = '#F2C230'; c.fillRect(px - rx * .25, py - ry, rx * .35, ry * 2); c.restore();
      c.save(); c.strokeStyle = 'rgba(200,215,228,.45)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(px, py, rx, ry, 0, Math.PI * .95, Math.PI * 2.05); c.stroke(); c.restore();
      for (let j = 0; j < 4; j++) { c.save(); c.strokeStyle = `rgba(200,215,228,${.22 - j * .04})`; c.lineWidth = 1; c.beginPath(); c.ellipse(px + (r() - .5) * rx * 1.2, py + (r() - .5) * ry, 6 + j * 8, 2 + j * 2.4, 0, 0, 6.3); c.stroke(); c.restore(); }
    });
    // parapet in the foreground: dark band with wet lit top edge
    c.save(); const pb = c.createLinearGradient(0, 1440, 0, H); pb.addColorStop(0, '#1b2531'); pb.addColorStop(.1, '#0e141c'); pb.addColorStop(1, '#06090d'); c.fillStyle = pb; c.beginPath(); c.moveTo(-10, 1470); c.lineTo(W + 10, 1448); c.lineTo(W + 10, H + 10); c.lineTo(-10, H + 10); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(159,180,200,.55)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-10, 1470); c.lineTo(W + 10, 1448); c.stroke(); c.strokeStyle = 'rgba(110,137,163,.28)'; c.lineWidth = 6; c.beginPath(); c.moveTo(-10, 1473); c.lineTo(W + 10, 1451); c.stroke(); c.restore();
    L.paint(c, (b, rnd) => { L.ink(b, [[-10, 1480], [W + 10, 1458]], { color: '#020305', w: .9, rnd, gap: .2 }); [180, 430, 700, 930].forEach(x => L.ink(b, [[x, 1472 - x * .02], [x + rnd.range(-6, 6), H]], { color: '#020305', w: .6, rnd, gap: .3 })); }, { seed: 97, mode: 'mask', color: '#020305', alpha: .8 });
    L.rough(c, { amp: 2.4, seed: 6 });
    // warm bounce on the wet roof + bloom + rain
    L.glow(c, dx + dw / 2, sy + 60, 240, '#F2C230', .18, 'screen');
    L.bloom(c, { blur: 18, a: .4, boost: 1.5, contrast: 1.8 });
    L.rain(c, { n: 520, ang: 12, len: [50, 150], w: 1.1, alpha: .42, color: '#b6c7d8', seed: 52, brush: 'cpencil', cone: { x: dx + dw / 2, y: sy - 80, angle: 0, spread: 30, len: 360, color: '#ffe6a0' } });
    L.rain(c, { n: 260, ang: 12, len: [90, 220], w: 1.5, alpha: .3, color: '#c5d0da', seed: 53, rect: { x0: 0, y0: 780, x1: W, y1: H } });
    L.grain(c, { a: .06, atop: true });
    L.cleanAlpha(c);
    return c;
  });
})();
