/* Page 3 — top-down street: street_ground, street_umbrellas, merey_top */
(function () {
  const P = PAINT, L = P.lib, PAL = L.PAL;
  const W0 = 1080, H0 = 2160;
  const laneX = (y) => 562 + 62 * Math.sin(y / 340 + 1.1);   // centre of the free lane Merey walks along
  const LANE_HALF = 104;

  P.register('street_ground', { w: W0, h: H0, alpha: false, seed: 301 }, async (k) => {
    const W = k.W, H = k.H, c = L.layer(), r = k.rnd;
    L.vgrad(c, [[0, '#121922'], [.5, '#0d131a'], [1, '#141b24']]);
    // asphalt mottling: fine fbm grain
    const gr = L.noiseAlpha(W, H, { sx: .06, sy: .06, oct: 3, seed: 5, lo: .35, hi: .75, color: '#4b5967', res: 3, max: .5 }); L.blit(c, gr, { op: 'screen', alpha: .28 });
    // wheel-polished wet bands (lighter, vertical)
    [[170, 90], [350, 80], [690, 80], [880, 90]].forEach(([x, w], i) => { const g = c.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, 'rgba(110,137,163,0)'); g.addColorStop(.5, 'rgba(110,137,163,.16)'); g.addColorStop(1, 'rgba(110,137,163,0)'); c.fillStyle = g; c.fillRect(x - w, 0, w * 2, H); });
    // kerbs/pavement both sides
    [[0, 96], [W - 96, 96]].forEach(([x, w]) => { const g = c.createLinearGradient(0, 0, W, 0); c.fillStyle = '#1e2834'; c.fillRect(x, 0, w, H); c.fillStyle = 'rgba(160,185,210,.18)'; c.fillRect(x < 100 ? x + w - 3 : x, 0, 3, H); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x < 100 ? x + w : x - 10, 0, 10, H); for (let y = 0; y < H; y += 120 + (r() * 30 | 0)) { c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x, y, w, 2); } });
    // zebra crossing band (vertical bars, worn paint)
    const zb0 = 880, zb1 = 1250; c.save();
    for (let x = 128; x < W - 128; x += 132) { const g = c.createLinearGradient(0, zb0, 0, zb1); g.addColorStop(0, 'rgba(200,212,224,.82)'); g.addColorStop(1, 'rgba(176,192,208,.78)'); c.fillStyle = g; c.fillRect(x, zb0, 70, zb1 - zb0); }
    c.fillStyle = 'rgba(206,218,230,.8)'; c.fillRect(96, zb0 - 52, W - 192, 22); c.fillRect(96, zb1 + 30, W - 192, 22); c.restore();
    // wear: erase paint with noise + tyre scuffs
    const wear = L.noiseAlpha(W, H, { sx: .12, sy: .5, oct: 4, seed: 9, lo: .45, hi: .72, color: '#0d131a', res: 4 }); L.blit(c, wear, { alpha: .75 });
    // dashed lane lines
    c.save(); c.fillStyle = 'rgba(196,208,220,.62)'; for (let y = -40; y < H; y += 170) { if (y > zb0 - 110 && y < zb1 + 110) continue; c.fillRect(300, y, 14, 90); c.fillRect(766, y, 14, 90); } c.restore();
    // manhole
    const mx = 835, my = 1720, mr = 64; c.save(); c.fillStyle = '#0a0f15'; c.beginPath(); c.arc(mx, my, mr + 8, 0, 6.3); c.fill(); let g = c.createRadialGradient(mx - 20, my - 20, 6, mx, my, mr); g.addColorStop(0, '#3a4757'); g.addColorStop(1, '#1b2431'); c.fillStyle = g; c.beginPath(); c.arc(mx, my, mr, 0, 6.3); c.fill();
    c.strokeStyle = 'rgba(8,12,18,.85)'; c.lineWidth = 3; for (let i = 1; i < 5; i++) { c.beginPath(); c.arc(mx, my, mr * i / 5, 0, 6.3); c.stroke(); } for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; c.beginPath(); c.moveTo(mx + Math.cos(a) * mr * .2, my + Math.sin(a) * mr * .2); c.lineTo(mx + Math.cos(a) * mr, my + Math.sin(a) * mr); c.stroke(); }
    c.strokeStyle = 'rgba(150,175,200,.55)'; c.lineWidth = 2.5; c.beginPath(); c.arc(mx, my, mr, 3.6, 5.0); c.stroke(); c.restore();
    // brush: pigment mottling + charcoal drag along the road
    L.glaze(c, ['#18202b', '#0a0f16'], (b, i, rnd) => { for (let j = 0; j < 9; j++) b.polygon(L.blobPts(rnd() * W, rnd() * H, 150 + rnd() * 240, 160 + rnd() * 350, { n: 14, rough: .3, rnd })); }, { seed: 311, opacity: 90, bleed: .4, tex: .8, border: .05, alpha: .5 });
    L.paint(c, (b, rnd) => { b.set('charcoal', '#000', 1); for (let i = 0; i < 90 * (k.q < 1 ? .5 : 1); i++) { const x = rnd() * W, y = rnd() * H; b.line(x, y, x + (rnd() - .5) * 10, y + 80 + rnd() * 240); } }, { seed: 312, mode: 'mask', color: '#05080c', alpha: .35 });
    // puddles reflecting lamps and the grey sky
    const puddles = [[250, 330, 170, 120, 20], [770, 520, 140, 200, -10], [420, 1450, 210, 150, 35], [190, 1900, 150, 220, 5], [920, 2010, 120, 110, 0], [610, 700, 110, 80, 60], [560, 1880, 160, 100, 15]];
    const lamps = [];
    puddles.forEach(([px, py, rx, ry, rot], i) => {
      const pts = L.blobPts(px, py, rx, ry, { n: 22, rough: .22, rot, rnd: r });
      c.save(); c.beginPath(); pts.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.clip();
      const g2 = c.createLinearGradient(px - rx, py - ry, px + rx * .6, py + ry); g2.addColorStop(0, '#6c869f'); g2.addColorStop(.5, '#3a4b5e'); g2.addColorStop(1, '#222e3c'); c.globalAlpha = .82; c.fillStyle = g2; c.fillRect(px - rx * 1.3, py - ry * 1.3, rx * 2.6, ry * 2.6); c.globalAlpha = 1;
      L.glow(c, px - rx * .3, py - ry * .2, rx * .9, '#F2C230', .55, 'screen'); L.glow(c, px - rx * .3, py - ry * .2, rx * .22, '#fff3c8', .85, 'screen'); L.glow(c, px + rx * .45, py + ry * .3, rx * .5, '#9fc0dc', .3, 'screen');
      for (let j = 0; j < 7; j++) { const rr = 5 + j * 11; c.strokeStyle = `rgba(210,225,238,${.34 - j * .04})`; c.lineWidth = 1.4; c.beginPath(); c.ellipse(px + (r() - .5) * rx * .9, py + (r() - .5) * ry * .9, rr, rr * .9, 0, 0, 6.3); c.stroke(); }
      c.restore();
      c.save(); c.strokeStyle = 'rgba(196,214,230,.5)'; c.lineWidth = 2; c.beginPath(); pts.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); c.restore();
      lamps.push({ x: px - rx * .3, y: py - ry * .2 });
    });
    // overhead lamp light pools with glossy streaks
    [[-30, 260], [1110, 780], [-30, 1380], [1110, 1900]].forEach(([x, y]) => { L.glow(c, x, y, 520, '#e8b64a', .2, 'screen'); L.glow(c, x, y, 260, '#ffdf9a', .16, 'screen'); });
    L.lightStreaks(c, [{ x: 70, y: 150, r: 26, color: '#F2C230', a: .5, len: 520 }, { x: 1010, y: 650, r: 26, color: '#F2C230', a: .5, len: 520 }, { x: 70, y: 1250, r: 26, color: '#F2C230', a: .45, len: 520 }, { x: 1010, y: 1780, r: 26, color: '#F2C230', a: .45, len: 360 }], { amp: 10, blur: 6 });
    // tiny raindrop rings everywhere
    c.save(); c.strokeStyle = 'rgba(190,208,224,.2)'; c.lineWidth = 1; for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H, rr = 3 + r() * 11; c.beginPath(); c.ellipse(x, y, rr, rr * .92, 0, 0, 6.3); c.stroke(); } c.restore();
    L.rough(c, { amp: 2.2, seed: 12 });
    L.vignette(c, .35); L.grain(c, { a: .08 });
    return c;
  });

  // ---------- umbrellas ----------
  function layoutUmbrellas(r, W, H) {
    const list = []; let tries = 0;
    while (list.length < 46 && tries++ < 12000) {
      const rad = 66 + r() * 42, x = rad * .4 + r() * (W - rad * .8), y = r() * H;
      if (Math.abs(x - laneX(y)) < LANE_HALF + rad * .85) continue;
      if (list.some(u => Math.hypot(u.x - x, u.y - y) < (u.r + rad) * .8)) continue;
      list.push({ x, y, r: rad, rot: r() * 6.28 });
    }
    list.sort((a, b) => a.y - b.y); return list;
  }
  const UCOL = ['#1b2c4a', '#223a5e', '#0d1117', '#151a22', '#4a5666', '#323d4c', '#2b3a52', '#0f1a2e', '#5a6677', '#1d2634'];

  P.register('street_umbrellas', { w: W0, h: H0, alpha: true, seed: 302 }, async (k) => {
    const W = k.W, H = k.H, c = L.layer(), r = k.rnd; const U = layoutUmbrellas(r, W, H);
    U.forEach((u, i) => { u.col = i === 17 ? 'clear' : r.pick(UCOL); });
    // contact shadows (one blurred pass)
    const sh = L.layer(); sh.fillStyle = 'rgba(2,4,8,.6)'; U.forEach(u => { sh.beginPath(); sh.ellipse(u.x + 22, u.y + 30, u.r * 1.04, u.r * .98, 0, 0, 6.3); sh.fill(); }); L.blit(c, sh, { blur: 16, alpha: .9 });
    const LX = -.62, LY = -.78; // light from upper-left
    U.forEach((u, ui) => {
      const { x, y, r: R } = u, clear = u.col === 'clear', base = clear ? '#6f8396' : u.col; const N = 8;
      c.save(); c.translate(x, y); c.rotate(u.rot);
      for (let i = 0; i < N; i++) {
        const a0 = i / N * 6.2832, a1 = (i + 1) / N * 6.2832, am = (a0 + a1) / 2; const wa = u.rot + am; const lit = Math.cos(wa - Math.atan2(LY, LX)) * .5 + .5; // facet facing light
        const col = clear ? L.rgba('#9fb6cc', .1 + lit * .12) : L.shade(base, (lit - .45) * .42 + (i % 2 ? .02 : -.02));
        const p0 = [Math.cos(a0) * R, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, Math.sin(a1) * R], cm = [Math.cos(am) * R * .9, Math.sin(am) * R * .9];
        c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.lineTo(p0[0], p0[1]); c.quadraticCurveTo(cm[0], cm[1], p1[0], p1[1]); c.closePath(); c.fill();
        // facet gradient: lighter towards the crown, darker towards the rim
        if (!clear) { const g = c.createRadialGradient(0, 0, R * .05, 0, 0, R); g.addColorStop(0, 'rgba(255,255,255,.11)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(p0[0], p0[1]); c.quadraticCurveTo(cm[0], cm[1], p1[0], p1[1]); c.closePath(); c.fill(); }
      }
      c.restore();
      // ribs
      c.save(); c.translate(x, y); c.rotate(u.rot); c.strokeStyle = clear ? 'rgba(20,30,42,.8)' : 'rgba(2,4,8,.6)'; c.lineWidth = clear ? 2.2 : 1.6; for (let i = 0; i < N; i++) { const a = i / N * 6.2832; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * R, Math.sin(a) * R); c.stroke(); }
      c.strokeStyle = clear ? 'rgba(200,215,230,.6)' : 'rgba(150,175,200,.35)'; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < N; i++) { const a0 = i / N * 6.2832, a1 = (i + 1) / N * 6.2832, am = (a0 + a1) / 2; c.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); c.quadraticCurveTo(Math.cos(am) * R * .9, Math.sin(am) * R * .9, Math.cos(a1) * R, Math.sin(a1) * R); } c.stroke(); c.restore();
      // crown cap + tips
      c.save(); c.fillStyle = '#0b0f15'; c.beginPath(); c.arc(x, y, 7.5, 0, 6.3); c.fill(); c.fillStyle = 'rgba(170,190,210,.6)'; c.beginPath(); c.arc(x - 2, y - 2, 2.6, 0, 6.3); c.fill(); c.restore();
      // specular crescent toward the light + rim glint
      c.save(); c.beginPath(); c.arc(x, y, R * .98, 0, 6.3); c.clip(); const sx = x + LX * R * .55, sy = y + LY * R * .55; const sg = c.createRadialGradient(sx, sy, 2, sx, sy, R * .7); sg.addColorStop(0, 'rgba(190,210,230,.34)'); sg.addColorStop(1, 'rgba(190,210,230,0)'); c.fillStyle = sg; c.fillRect(x - R, y - R, R * 2, R * 2); c.restore();
      c.save(); c.strokeStyle = 'rgba(210,225,240,.55)'; c.lineWidth = 2.2; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, R * .97, Math.atan2(LY, LX) - .5, Math.atan2(LY, LX) + .5); c.stroke(); c.restore();
      // wet beads on the canopy
      const nb = 14 + (r() * 10 | 0); for (let b = 0; b < nb; b++) { const a = r() * 6.28, d = R * (.2 + r() * .72), bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d, br = 1.6 + r() * 3; c.fillStyle = 'rgba(8,12,18,.5)'; c.beginPath(); c.ellipse(bx + 1, by + 1.4, br, br * .9, 0, 0, 6.3); c.fill(); c.fillStyle = `rgba(205,222,238,${.35 + r() * .35})`; c.beginPath(); c.ellipse(bx - .4, by - .5, br * .75, br * .65, 0, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(bx - br * .5, by - br * .6, br * .45, br * .4); }
      // clear umbrella: ground-ish refraction ring
      if (clear) { c.save(); c.strokeStyle = 'rgba(220,236,250,.45)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, R * .985, 0, 6.3); c.stroke(); c.restore(); }
    });
    // brush: broken ink on ribs and watercolour mottling to take the digital edge off
    L.glaze(c, ['#10151d'], (b, i, rnd) => { U.forEach(u => { if (u.col !== 'clear') b.polygon(L.blobPts(u.x, u.y, u.r * .97, u.r * .97, { n: 16, rough: .05, rnd })); }); }, { seed: 321, opacity: 120, bleed: .2, tex: .85, border: .35, alpha: .55, atop: true });
    L.paint(c, (b, rnd) => { U.forEach(u => { const N = 8; for (let i = 0; i < N; i++) { const a = u.rot + i / N * 6.2832; L.ink(b, [[u.x, u.y], [u.x + Math.cos(a) * u.r, u.y + Math.sin(a) * u.r]], { color: '#020305', w: .5, rnd, gap: .25, wig: .5, chunk: [20, 60] }); } L.ink(b, Array.from({ length: 25 }, (_, i) => [u.x + Math.cos(i / 24 * 6.28) * u.r, u.y + Math.sin(i / 24 * 6.28) * u.r]), { color: '#020305', w: .7, rnd, gap: .3, wig: .8, chunk: [30, 100] }); }); }, { seed: 322, mode: 'mask', color: '#020305', alpha: .7, gain: 1.3 });
    // lamp bloom on the wet canopies
    L.bloom(c, { blur: 10, a: .22, boost: 1.4, contrast: 1.5 });
    L.rough(c, { amp: 1.4, seed: 14, freq: .03 });
    L.grain(c, { a: .05, atop: true }); L.cleanAlpha(c);
    return c;
  });

  // ---------- Merey seen from above (walking up the screen) ----------
  P.register('merey_top', { w: 360, h: 360, alpha: true, seed: 303 }, async (k) => {
    const S = 3, c = L.layer(360 * S, 360 * S), r = k.rnd; c.scale(S, S); const u = v => v * S; const Y = '#F2C230', YD = '#C9962A', YDD = '#8a5f14', YL = '#FFE27a';
    const cx = 180, cy = 205;
    // soft contact shadow
    c.save(); c.filter = `blur(${10 * S * c.q}px)`; c.fillStyle = 'rgba(2,4,8,.55)'; c.beginPath(); c.ellipse(cx + 12, cy + 16, 160, 92, 0, 0, 6.3); c.fill(); c.restore();
    // sleeves (arms swinging): left forward, right back, ending in small hands
    const sleeve = (x0, y0, x1, y1, w) => { c.save(); c.lineCap = 'round'; c.strokeStyle = YD; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = Y; c.lineWidth = w * .72; c.beginPath(); c.moveTo(x0 - 2, y0); c.lineTo(x1 - 2, y1); c.stroke(); c.strokeStyle = YL; c.globalAlpha = .55; c.lineWidth = w * .12; c.beginPath(); c.moveTo(x0 - w * .28, y0); c.lineTo(x1 - w * .28, y1); c.stroke(); c.restore(); };
    sleeve(48, 212, 36, 122, 46); sleeve(312, 214, 322, 292, 44);
    c.fillStyle = '#b99c8c'; c.beginPath(); c.ellipse(34, 112, 14, 16, 0, 0, 6.3); c.fill(); c.beginPath(); c.ellipse(324, 304, 13, 15, 0, 0, 6.3); c.fill();
    c.fillStyle = YDD; c.fillRect(14, 126, 46, 10); c.fillRect(300, 284, 46, 9);
    // shoulders / back of the raincoat
    c.save(); let g = c.createRadialGradient(cx - 40, cy - 40, 10, cx, cy, 170); g.addColorStop(0, YL); g.addColorStop(.3, Y); g.addColorStop(.75, YD); g.addColorStop(1, YDD); c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, 150, 82, 0, 0, 6.3); c.fill(); c.restore();
    // fabric folds (radial from the hood), amber strokes
    c.save(); c.beginPath(); c.ellipse(cx, cy, 150, 82, 0, 0, 6.3); c.clip(); c.strokeStyle = 'rgba(120,78,10,.45)'; c.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.28 + .2, r0 = 62 + r() * 12, r1 = 110 + r() * 50; c.lineWidth = 2 + r() * 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .62); c.quadraticCurveTo(cx + Math.cos(a + .08) * (r0 + r1) / 2, cy + Math.sin(a + .08) * (r0 + r1) / 2 * .6, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * .55); c.stroke(); }
    c.restore();
    // hood: dome from above, opening at the top (front) showing dark hair
    const hx = cx, hy = 170, hr = 74;
    c.save(); c.fillStyle = 'rgba(70,45,5,.45)'; c.beginPath(); c.ellipse(hx + 4, hy + 12, hr + 8, hr, 0, 0, 6.3); c.fill();
    g = c.createRadialGradient(hx - 24, hy - 22, 6, hx, hy, hr); g.addColorStop(0, '#FFE88c'); g.addColorStop(.35, Y); g.addColorStop(.8, YD); g.addColorStop(1, YDD); c.fillStyle = g; c.beginPath(); c.arc(hx, hy, hr, 0, 6.3); c.fill();
    // opening (front/top): dark crescent with bob hair
    c.save(); c.beginPath(); c.arc(hx, hy, hr, 0, 6.3); c.clip(); c.fillStyle = '#0b0f14'; c.beginPath(); c.ellipse(hx, hy - hr + 2, hr * .72, 24, 0, 0, 6.3); c.fill();
    c.fillStyle = '#05080b'; c.beginPath(); c.ellipse(hx, hy - hr + 14, hr * .55, 16, 0, 0, 6.3); c.fill(); c.strokeStyle = 'rgba(60,70,85,.6)'; c.lineWidth = 1.5; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(hx - 36 + i * 9, hy - hr + 8); c.lineTo(hx - 38 + i * 9 + (r() - .5) * 6, hy - hr + 26); c.stroke(); } c.restore();
    // hood seam, drawstring, stitching
    c.strokeStyle = 'rgba(120,78,10,.7)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(hx, hy - hr + 24); c.quadraticCurveTo(hx + 6, hy, hx, hy + hr - 6); c.stroke(); c.setLineDash([4, 5]); c.lineWidth = 1.2; c.strokeStyle = 'rgba(255,230,140,.5)'; c.beginPath(); c.moveTo(hx + 7, hy - hr + 26); c.quadraticCurveTo(hx + 13, hy, hx + 7, hy + hr - 8); c.stroke(); c.setLineDash([]);
    c.strokeStyle = 'rgba(255,238,160,.8)'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.arc(hx, hy, hr - 3, 3.6, 5.1); c.stroke(); c.restore();
    // wet sheen + rain beads
    c.save(); c.globalCompositeOperation = 'screen'; [[cx - 70, cy - 8, 40, 9, -.5], [cx + 82, cy + 22, 34, 7, .5], [hx - 30, hy - 30, 26, 10, -.7]].forEach(([x, y, rx, ry, rot]) => { c.fillStyle = 'rgba(255,248,205,.5)'; c.filter = `blur(${2 * S * c.q}px)`; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 6.3); c.fill(); }); c.restore();
    for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = r(); const bx = cx + Math.cos(a) * 140 * d, by = cy + Math.sin(a) * 76 * d; if (((bx - hx) ** 2 + (by - hy) ** 2) < (hr * .9) ** 2 && r() < .4) continue; const br = 1.2 + r() * 2.4; c.fillStyle = 'rgba(90,60,6,.5)'; c.beginPath(); c.ellipse(bx + .8, by + 1, br, br, 0, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,252,235,.85)'; c.beginPath(); c.ellipse(bx - .3, by - .4, br * .6, br * .55, 0, 0, 6.3); c.fill(); }
    // brush: yellow glaze texture + broken amber ink outlines (small marks => work in 1080-space)
    L.glaze(c, [{ color: '#d99c1c', op: 130 }], (b, i, rnd) => { b.polygon(L.blobPts(u(cx), u(cy), u(148), u(80), { n: 20, rough: .06, rnd })); b.polygon(L.blobPts(u(hx), u(hy), u(hr), u(hr), { n: 18, rough: .05, rnd })); }, { seed: 331, bleed: .15, tex: .8, border: .3, alpha: .4, atop: true });
    L.paint(c, (b, rnd) => { L.ink(b, Array.from({ length: 33 }, (_, i) => [u(cx + Math.cos(i / 32 * 6.28) * 150), u(cy + Math.sin(i / 32 * 6.28) * 82)]), { color: '#5a3a08', w: .8, rnd, gap: .3, wig: 1.5, chunk: [80, 260] }); L.ink(b, Array.from({ length: 29 }, (_, i) => [u(hx + Math.cos(i / 28 * 6.28) * hr), u(hy + Math.sin(i / 28 * 6.28) * hr)]), { color: '#5a3a08', w: .8, rnd, gap: .25, wig: 1.2, chunk: [60, 220] }); }, { seed: 332, mode: 'mask', color: '#5a3a08', alpha: .8, gain: 1.3 });
    const out = L.layer(360, 360); L.blit(out, c, { w: 360, h: 360 }); out.canvas.__alpha = true;
    L.rough(out, { amp: .6, seed: 3, freq: .04 }); L.cleanAlpha(out);
    return out;
  });
})();
