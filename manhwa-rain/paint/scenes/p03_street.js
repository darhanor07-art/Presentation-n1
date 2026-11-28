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
    const wear = L.noiseAlpha(W, H, { sx: .07, sy: .3, oct: 5, seed: 9, lo: .5, hi: .7, color: '#0d131a', res: 4 }); L.blit(c, wear, { alpha: .45 });
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
      const g2 = c.createLinearGradient(px - rx, py - ry, px + rx * .6, py + ry); g2.addColorStop(0, '#4d6379'); g2.addColorStop(.5, '#26333f'); g2.addColorStop(1, '#141c26'); c.globalAlpha = .7; c.fillStyle = g2; c.fillRect(px - rx * 1.3, py - ry * 1.3, rx * 2.6, ry * 2.6); c.globalAlpha = 1;
      L.glow(c, px - rx * .3, py - ry * .2, rx * .8, '#F2C230', .35, 'screen'); L.glow(c, px - rx * .3, py - ry * .2, rx * .16, '#fff3c8', .8, 'screen'); L.lightStreaks(c, [{ x: px - rx * .3, y: py - ry * .75, r: rx * .13, color: '#ffe9a8', a: .55, len: ry * 1.5 }], { amp: 3, blur: 2 }); L.glow(c, px + rx * .45, py + ry * .3, rx * .5, '#9fc0dc', .16, 'screen');
      for (let j = 0; j < 4; j++) { const rr = 5 + j * 11; c.strokeStyle = `rgba(210,225,238,${.34 - j * .04})`; c.lineWidth = 1.4; c.beginPath(); c.ellipse(px + (r() - .5) * rx * .9, py + (r() - .5) * ry * .9, rr, rr * .9, 0, 0, 6.3); c.stroke(); }
      c.restore();
      c.save(); c.strokeStyle = 'rgba(196,214,230,.5)'; c.lineWidth = 2; c.beginPath(); pts.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke(); c.restore();
      lamps.push({ x: px - rx * .3, y: py - ry * .2 });
    });
    // overhead lamp light pools with glossy streaks
    [[-30, 260], [1110, 780], [-30, 1380], [1110, 1900]].forEach(([x, y]) => { L.glow(c, x, y, 520, '#e8b64a', .2, 'screen'); L.glow(c, x, y, 260, '#ffdf9a', .16, 'screen'); });
    
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
    const cx = 180, cy = 214;
    const ell = (x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 6.2832); };
    // contact shadow
    c.save(); c.filter = `blur(${9 * S * c.q}px)`; c.fillStyle = 'rgba(2,4,8,.6)'; ell(cx + 10, cy + 14, 112, 92); c.fill(); c.restore();
    // arms: left swings forward (up), right back (down); sleeves hang at the sides of the torso
    const arm = (x0, y0, x1, y1, w, hand) => { c.save(); c.lineCap = 'round'; c.strokeStyle = YDD; c.lineWidth = w + 4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = YD; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.strokeStyle = Y; c.lineWidth = w * .66; c.beginPath(); c.moveTo(x0 - w * .12, y0); c.lineTo(x1 - w * .12, y1); c.stroke(); c.strokeStyle = 'rgba(255,238,160,.7)'; c.lineWidth = w * .12; c.beginPath(); c.moveTo(x0 - w * .3, y0 + 4); c.lineTo(x1 - w * .3, y1 + 2); c.stroke(); c.restore(); c.fillStyle = YDD; c.beginPath(); ell(x1, y1, w * .56, w * .34, Math.atan2(y1 - y0, x1 - x0) + 1.57); c.fill(); const hx = x1 + (x1 - x0) * .22, hy = y1 + (y1 - y0) * .22; const hg = c.createRadialGradient(hx - 2, hy - 2, 1, hx, hy, 14); hg.addColorStop(0, '#d8bba8'); hg.addColorStop(1, '#8e7466'); c.fillStyle = hg; c.beginPath(); ell(hx, hy, 11, 14, Math.atan2(y1 - y0, x1 - x0) - 1.57); c.fill(); };
    arm(76, 206, 62, 118, 40); arm(284, 216, 296, 292, 38);
    // torso / back of raincoat (rounded shoulders, flared hem at the back)
    c.save(); let g = c.createRadialGradient(cx - 34, cy - 40, 8, cx, cy, 130); g.addColorStop(0, YL); g.addColorStop(.3, Y); g.addColorStop(.72, YD); g.addColorStop(1, YDD); c.fillStyle = g;
    c.beginPath(); c.moveTo(cx - 100, cy - 18); c.bezierCurveTo(cx - 106, cy - 64, cx - 40, cy - 78, cx, cy - 76); c.bezierCurveTo(cx + 40, cy - 78, cx + 106, cy - 64, cx + 100, cy - 18); c.bezierCurveTo(cx + 112, cy + 40, cx + 96, cy + 92, cx + 76, cy + 96); c.bezierCurveTo(cx + 30, cy + 104, cx - 30, cy + 104, cx - 76, cy + 96); c.bezierCurveTo(cx - 96, cy + 92, cx - 112, cy + 40, cx - 100, cy - 18); c.closePath(); c.fill();
    c.clip(); c.strokeStyle = 'rgba(110,70,8,.5)'; c.lineCap = 'round';
    // fabric folds: from shoulder blades down to the hem, a centre back seam
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(cx, cy - 20); c.lineTo(cx + 1, cy + 100); c.stroke();
    [-1, 1].forEach(sg => { for (let i = 0; i < 4; i++) { c.lineWidth = 2 + (i % 2) * 2; c.beginPath(); c.moveTo(cx + sg * (30 + i * 22), cy - 6 + i * 3); c.quadraticCurveTo(cx + sg * (44 + i * 26), cy + 38, cx + sg * (38 + i * 28 + 8), cy + 98); c.stroke(); } });
    c.strokeStyle = 'rgba(255,238,160,.35)'; c.lineWidth = 4; c.beginPath(); c.moveTo(cx - 60, cy - 20); c.quadraticCurveTo(cx - 84, cy + 20, cx - 80, cy + 80); c.stroke();
    // hem edge darker
    const hg2 = c.createLinearGradient(0, cy + 60, 0, cy + 104); hg2.addColorStop(0, 'rgba(70,40,0,0)'); hg2.addColorStop(1, 'rgba(70,40,0,.45)'); c.fillStyle = hg2; c.fillRect(cx - 120, cy + 60, 240, 50); c.restore();
    // hood on top of the shoulders: dome, brim opening toward the top (she looks up the lane)
    const hx = cx, hy = cy - 52, hr = 64;
    c.save(); c.fillStyle = 'rgba(80,50,4,.5)'; ell(hx + 2, hy + 10, hr + 7, hr + 2); c.fill();
    g = c.createRadialGradient(hx - 22, hy - 20, 5, hx, hy, hr); g.addColorStop(0, '#FFEA94'); g.addColorStop(.35, Y); g.addColorStop(.8, YD); g.addColorStop(1, YDD); c.fillStyle = g; ell(hx, hy, hr, hr * .97); c.fill();
    c.save(); ell(hx, hy, hr, hr * .97); c.clip(); c.fillStyle = '#080b10'; ell(hx, hy - hr + 2, hr * .66, 21); c.fill(); // opening shadow
    c.fillStyle = '#12161d'; for (let i = 0; i < 12; i++) { c.beginPath(); c.ellipse(hx - 36 + i * 6.6, hy - hr + 16, 5, 11 + (i % 3) * 2, .1 * (i - 6), 0, 6.3); c.fill(); } // bob hair tips peeking out
    c.restore();
    c.strokeStyle = 'rgba(120,78,10,.7)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(hx, hy - hr + 26); c.quadraticCurveTo(hx + 4, hy, hx, hy + hr - 8); c.stroke();
    c.setLineDash([4, 5]); c.lineWidth = 1.1; c.strokeStyle = 'rgba(255,230,140,.55)'; c.beginPath(); c.moveTo(hx + 6, hy - hr + 28); c.quadraticCurveTo(hx + 11, hy, hx + 6, hy + hr - 9); c.stroke(); c.setLineDash([]);
    c.strokeStyle = 'rgba(255,240,170,.85)'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.arc(hx, hy, hr - 3, 3.55, 4.9); c.stroke(); c.restore();
    // wet sheen + beads (few, crisp)
    c.save(); c.globalCompositeOperation = 'screen'; c.filter = `blur(${2 * S * c.q}px)`; [[cx - 70, cy + 6, 34, 8, -.7], [cx + 66, cy + 20, 28, 6, .6], [hx - 24, hy - 26, 20, 8, -.7]].forEach(([x, y, rx, ry, rot]) => { c.fillStyle = 'rgba(255,248,205,.5)'; ell(x, y, rx, ry, rot); c.fill(); }); c.restore();
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = r(); const bx = cx + Math.cos(a) * 96 * d, by = cy + 10 + Math.sin(a) * 78 * d; if (Math.hypot(bx - hx, by - hy) < hr * .95) continue; const br = 1.2 + r() * 2.2; c.fillStyle = 'rgba(90,60,6,.5)'; ell(bx + .8, by + 1, br, br); c.fill(); c.fillStyle = 'rgba(255,252,235,.85)'; ell(bx - .3, by - .4, br * .6, br * .55); c.fill(); }
    // brush: yellow glaze mottling + broken amber ink (marks are fine because we work in 1080-space)
    L.glaze(c, [{ color: '#d99c1c', op: 130 }], (b, i, rnd) => { b.polygon(L.blobPts(u(cx), u(cy + 10), u(104), u(88), { n: 20, rough: .05, rnd })); b.polygon(L.blobPts(u(hx), u(hy), u(hr), u(hr), { n: 18, rough: .04, rnd })); }, { seed: 331, bleed: .15, tex: .8, border: .3, alpha: .4, atop: true });
    L.paint(c, (b, rnd) => { L.ink(b, Array.from({ length: 33 }, (_, i) => [u(cx + Math.cos(i / 32 * 6.28) * 106), u(cy + 12 + Math.sin(i / 32 * 6.28) * 90)]), { color: '#5a3a08', w: .8, rnd, gap: .3, wig: 1.5, chunk: [80, 260] }); L.ink(b, Array.from({ length: 29 }, (_, i) => [u(hx + Math.cos(i / 28 * 6.28) * hr), u(hy + Math.sin(i / 28 * 6.28) * hr)]), { color: '#5a3a08', w: .8, rnd, gap: .25, wig: 1.2, chunk: [60, 220] }); }, { seed: 332, mode: 'mask', color: '#5a3a08', alpha: .75, gain: 1.3 });
    const out = L.layer(360, 360); L.blit(out, c, { w: 360, h: 360 });
    L.rough(out, { amp: .6, seed: 3, freq: .04 }); L.cleanAlpha(out);
    return out;
  });
})();
