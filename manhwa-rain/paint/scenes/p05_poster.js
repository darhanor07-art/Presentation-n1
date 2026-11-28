/* Page 5 — bus stop: poster_stop (plate) + poster_00..05 (MISSING poster washing away) */
(function () {
  const P = PAINT, L = P.lib, PAL = L.PAL;

  P.register('poster_stop', { w: 1080, h: 1512, alpha: false, seed: 501 }, async (k) => {
    const W = k.W, H = k.H, r = k.rnd, c = L.layer();
    L.vgrad(c, [[0, '#0a0f17'], [.4, '#131c28'], [.78, '#1a2634'], [1, '#0b1119']]);
    // street seen through the glass: defocused lights, a bus far away
    const far = L.layer(); L.skyline(far, { base: 900, hmin: 100, hmax: 380, wmin: 60, wmax: 140, far: .55, seed: 511, winDens: .45, winSize: [6, 9], fillDown: 500, glazes: 1, steps: .4 }); L.blit(c, far, { blur: 7, alpha: .9 });
    L.glow(c, W * .35, 960, 700, '#b88c50', .16, 'screen');
    L.bokeh(c, { n: 30, area: { x0: 0, y0: 760, x1: W, y1: 1180 }, rmin: 14, rmax: 60, colors: [[PAL.yellow, 5], ['#FFD98A', 2], [PAL.mist, 3], [PAL.rain, 2], [PAL.signal, 1]], a: .5, ring: .5, seed: 51 });
    // wet pavement
    c.save(); const pg = c.createLinearGradient(0, 1210, 0, H); pg.addColorStop(0, '#1c2733'); pg.addColorStop(1, '#0a1017'); c.fillStyle = pg; c.fillRect(0, 1210, W, H - 1210); c.restore();
    // shelter roof edge + light bar
    c.save(); let g = c.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, '#05080c'); g.addColorStop(1, '#161f2b'); c.fillStyle = g; c.fillRect(0, 0, W, 118); c.fillStyle = 'rgba(160,185,210,.5)'; c.fillRect(0, 117, W, 2.5); c.restore();
    // glowing advert light box (right)
    const ax = 912, ay = 198, aw = 126, ah = 940;
    c.save(); g = c.createLinearGradient(ax, ay, ax + aw, ay + ah); g.addColorStop(0, '#d9eef4'); g.addColorStop(.5, '#8fcdd6'); g.addColorStop(1, '#6fb2c4'); c.fillStyle = g; c.fillRect(ax, ay, aw, ah);
    // abstract ad art (no text): soft shapes
    c.globalAlpha = .35; c.fillStyle = '#1b3b52'; c.beginPath(); c.ellipse(ax + 60, ay + 300, 90, 160, .3, 0, 6.3); c.fill(); c.fillStyle = '#e7fbff'; c.beginPath(); c.ellipse(ax + 30, ay + 620, 70, 120, -.4, 0, 6.3); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = '#0a1118'; c.lineWidth = 10; c.strokeRect(ax - 4, ay - 4, aw + 8, ah + 8); c.restore();
    L.glow(c, ax + aw / 2, ay + ah / 2, 620, '#9fe0e6', .3, 'screen'); L.glow(c, ax + aw / 2, ay + ah / 2, 280, '#e8ffff', .25, 'screen');
    // posts and glass panel frame
    const post = (x, w) => { const pg2 = c.createLinearGradient(x, 0, x + w, 0); pg2.addColorStop(0, '#2b3948'); pg2.addColorStop(.2, '#121a24'); pg2.addColorStop(1, '#070a0f'); c.fillStyle = pg2; c.fillRect(x, 0, w, H); };
    post(0, 58); post(W - 58, 58); post(520, 0.01);
    c.save(); c.fillStyle = 'rgba(150,176,200,.55)'; c.fillRect(58, 0, 2.5, H); c.fillRect(W - 60, 0, 2.5, H); c.restore();
    // the notice area (poster frames overlay here): plain pale panel, lit softly from the ad box
    const PX = 194, PY = 242, PW = 692, PH = 756;
    c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 30; c.shadowOffsetY = 10; g = c.createLinearGradient(PX, PY, PX + PW, PY + PH); g.addColorStop(0, '#c5ccd1'); g.addColorStop(.7, '#dbe2e6'); g.addColorStop(1, '#e3eef0'); c.fillStyle = g; c.fillRect(PX, PY, PW, PH); c.restore();
    c.save(); c.globalAlpha = .5; c.fillStyle = L.grad(c, PX, PY, PX, PY + PH, [[0, 'rgba(10,15,22,.4)'], [.3, 'rgba(10,15,22,0)'], [1, 'rgba(10,15,22,.25)']]); c.fillRect(PX, PY, PW, PH); c.restore();
    c.save(); c.strokeStyle = '#0a1018'; c.lineWidth = 14; c.strokeRect(PX - 7, PY - 7, PW + 14, PH + 14); c.strokeStyle = 'rgba(160,186,210,.5)'; c.lineWidth = 2; c.strokeRect(PX - 1, PY - 1, PW + 2, PH + 2); c.globalCompositeOperation = 'screen'; g = c.createLinearGradient(PX, PY, PX + PW, PY + PH * .6); g.addColorStop(0, 'rgba(210,230,246,.0)'); g.addColorStop(.45, 'rgba(210,230,246,.13)'); g.addColorStop(.55, 'rgba(210,230,246,0)'); c.fillStyle = g; c.fillRect(PX, PY, PW, PH); c.restore();
    // low bench + bin silhouettes, and wet reflections
    c.save(); c.fillStyle = '#06090d'; c.fillRect(150, 1160, 560, 14); c.fillRect(170, 1174, 10, 70); c.fillRect(680, 1174, 10, 70); c.fillRect(150, 1060, 560, 10); c.fillStyle = 'rgba(150,176,200,.45)'; c.fillRect(150, 1160, 560, 2); c.restore();
    L.lightStreaks(c, [{ x: ax + 40, y: 1215, r: 34, color: '#9fe0e6', a: .55, len: 280 }, { x: ax + 90, y: 1215, r: 20, color: '#e8ffff', a: .4, len: 220 }, { x: 330, y: 1230, r: 20, color: PAL.yellow, a: .4, len: 200 }, { x: 560, y: 1230, r: 16, color: '#FFD98A', a: .3, len: 160 }], { amp: 5, blur: 4 });
    // glass: broad rain, smeared drips, reflection of the light box
    c.save(); g = c.createLinearGradient(58, 0, 520, 600); g.addColorStop(0, 'rgba(190,214,232,.10)'); g.addColorStop(.4, 'rgba(190,214,232,0)'); g.addColorStop(1, 'rgba(190,214,232,.05)'); c.fillStyle = g; c.fillRect(58, 0, W - 116, H); c.restore();
    L.rain(c, { n: 520, ang: 7, len: [80, 260], w: 1.5, alpha: .26, color: '#bcd0e2', seed: 52, rect: { x0: 58, y0: 110, x1: W - 58, y1: 1250 } });
    c.save(); c.lineCap = 'round'; for (let i = 0; i < 24; i++) { const x = 70 + r() * 940, y = 130 + r() * 700, l = 80 + r() * 320; c.strokeStyle = `rgba(210,226,240,${.1 + r() * .16})`; c.lineWidth = 1.2 + r() * 2.4; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + r() * 8 - 4, y + l * .4, x + r() * 10 - 5, y + l * .7, x + r() * 6 - 3, y + l); c.stroke(); c.fillStyle = `rgba(230,242,252,.35)`; c.beginPath(); c.ellipse(x + r() * 4 - 2, y + l, 2.4 + r() * 2, 4 + r() * 3, 0, 0, 6.3); c.fill(); } c.restore();
    L.glaze(c, ['#10171f'], (b, i, rnd) => { for (let j = 0; j < 7; j++) b.polygon(L.blobPts(rnd() * W, rnd() * H, 200 + rnd() * 260, 140 + rnd() * 240, { n: 14, rough: .3, rnd })); }, { seed: 521, opacity: 90, bleed: .45, tex: .8, border: .1, alpha: .4 });
    L.bloom(c, { blur: 26, a: .35, boost: 1.4, contrast: 1.6 });
    L.rough(c, { amp: 1.8, seed: 13 }); L.vignette(c, .45); L.grain(c, { a: .07 });
    return c;
  });

  // ---------------- MISSING poster ----------------
  const INK = '#12161d', PW = 720, PH = 1008;
  const wrapFit = (ctx, text, font, maxW, start) => { let s = start; do { ctx.font = font.replace('%s', s); if (ctx.measureText(text).width <= maxW) break; s -= 2; } while (s > 10); return s; };

  function drawText(ink) {
    ink.save(); ink.fillStyle = INK; ink.textAlign = 'center'; ink.textBaseline = 'alphabetic';
    // header
    const hs = wrapFit(ink, 'ІЗДЕСТІРІЛУДЕ', 'bold %spx Inter, "Liberation Sans", sans-serif', 628, 92); ink.font = `bold ${hs}px Inter, "Liberation Sans", sans-serif`; if ('letterSpacing' in ink) ink.letterSpacing = '2px'; ink.fillText('ІЗДЕСТІРІЛУДЕ', 360, 150);
    if ('letterSpacing' in ink) ink.letterSpacing = '0px';
    ink.fillRect(46, 176, 628, 5); ink.fillRect(46, 188, 628, 2);
    // name + age
    const ns = wrapFit(ink, 'МЕРЕЙ, 18 жаста', '700 %spx CG, "Cormorant Garamond", serif', 600, 108); ink.font = `700 ${ns}px CG, "Cormorant Garamond", serif`; ink.fillText('МЕРЕЙ, 18 жаста', 360, 818);
    const ls = wrapFit(ink, 'Соңғы рет 3 күн бұрын көрген', '600 %spx CG, "Cormorant Garamond", serif', 600, 46); ink.font = `600 ${ls}px CG, "Cormorant Garamond", serif`; ink.fillText('Соңғы рет 3 күн бұрын көрген', 360, 884);
    ink.fillRect(46, 912, 628, 2);
    // tear-off tabs (dashed cuts, no text)
    ink.strokeStyle = INK; ink.lineWidth = 1.6; ink.setLineDash([6, 5]); for (let i = 0; i <= 6; i++) { const x = 46 + i * (628 / 6); ink.beginPath(); ink.moveTo(x, 930); ink.lineTo(x, 1002); ink.stroke(); } ink.setLineDash([]);
    ink.restore();
  }

  function drawPortrait(ink, rnd0) {
    // pencil / charcoal bust of Merey (short dark bob, 18). ink layer = graphite density (black with alpha).
    const cx = 360, r = L.rng(4242);
    const path = (c, pts) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
    const sm = (pts, cl = true) => L.smooth(pts, cl, 8);
    // --- coat / shoulders (mid grey), neck ---
    ink.save();
    const sh = sm([[cx - 56, 640], [cx - 150, 664], [cx - 232, 712], [cx - 250, 740], [cx + 250, 740], [cx + 232, 712], [cx + 150, 664], [cx + 56, 640]], false);
    let g = ink.createLinearGradient(0, 640, 0, 740); g.addColorStop(0, 'rgba(18,22,29,.55)'); g.addColorStop(1, 'rgba(18,22,29,.85)'); ink.fillStyle = g; path(ink, sh); ink.fill();
    // neck (light) with chin shadow
    const neck = sm([[cx - 40, 570], [cx - 44, 640], [cx - 30, 662], [cx, 672], [cx + 30, 662], [cx + 44, 640], [cx + 40, 570]], false); g = ink.createLinearGradient(cx - 44, 0, cx + 44, 0); g.addColorStop(0, 'rgba(18,22,29,.08)'); g.addColorStop(1, 'rgba(18,22,29,.3)'); ink.fillStyle = g; path(ink, neck); ink.fill();
    ink.fillStyle = 'rgba(18,22,29,.55)'; ink.beginPath(); ink.moveTo(cx - 52, 640); ink.lineTo(cx, 700); ink.lineTo(cx + 52, 640); ink.lineTo(cx + 66, 660); ink.lineTo(cx, 740); ink.lineTo(cx - 66, 660); ink.closePath(); ink.fill(); // collar V
    ink.restore();
    // --- hair mass (bob), then carve out the face ---
    ink.save(); ink.fillStyle = 'rgba(16,19,26,.94)';
    const hair = sm([[cx - 124, 372], [cx - 112, 288], [cx - 56, 236], [cx + 20, 228], [cx + 92, 256], [cx + 128, 330], [cx + 132, 420], [cx + 128, 500], [cx + 112, 566], [cx + 76, 586], [cx + 74, 530], [cx + 60, 470], [cx - 60, 470], [cx - 76, 530], [cx - 80, 586], [cx - 116, 566], [cx - 132, 500], [cx - 136, 430]], true);
    path(ink, hair); ink.fill();
    // face opening: forehead covered by a swept fringe
    ink.globalCompositeOperation = 'destination-out'; ink.fillStyle = '#000';
    const face = sm([[cx - 70, 386], [cx - 30, 360], [cx + 24, 376], [cx + 72, 360], [cx + 82, 430], [cx + 78, 508], [cx + 50, 574], [cx, 604], [cx - 50, 574], [cx - 78, 508], [cx - 82, 430]], true); path(ink, face); ink.fill();
    ink.globalCompositeOperation = 'source-over'; ink.restore();
    // --- face tone: gentle graphite shading (light from the left) ---
    ink.save(); path(ink, face); ink.clip();
    g = ink.createLinearGradient(cx - 82, 0, cx + 84, 0); g.addColorStop(0, 'rgba(18,22,29,.04)'); g.addColorStop(.5, 'rgba(18,22,29,.05)'); g.addColorStop(1, 'rgba(18,22,29,.3)'); ink.fillStyle = g; ink.fillRect(cx - 90, 340, 180, 280);
    const eyeSh = (x, y) => { const rg = ink.createRadialGradient(x, y, 2, x, y, 36); rg.addColorStop(0, 'rgba(18,22,29,.2)'); rg.addColorStop(1, 'rgba(18,22,29,0)'); ink.fillStyle = rg; ink.fillRect(x - 40, y - 40, 80, 80); }; eyeSh(cx - 40, 446); eyeSh(cx + 40, 446);
    g = ink.createLinearGradient(0, 560, 0, 606); g.addColorStop(0, 'rgba(18,22,29,0)'); g.addColorStop(1, 'rgba(18,22,29,.3)'); ink.fillStyle = g; ink.fillRect(cx - 90, 556, 180, 60);
    ink.fillStyle = 'rgba(18,22,29,.16)'; ink.beginPath(); ink.moveTo(cx + 8, 448); ink.lineTo(cx + 26, 506); ink.lineTo(cx + 4, 516); ink.closePath(); ink.fill(); // nose shadow plane
    // fringe shadow on the forehead
    g = ink.createLinearGradient(0, 360, 0, 410); g.addColorStop(0, 'rgba(18,22,29,.35)'); g.addColorStop(1, 'rgba(18,22,29,0)'); ink.fillStyle = g; ink.fillRect(cx - 90, 355, 180, 60);
    ink.restore();
    // --- features: closed/lowered lids, brows, nose, lips (pencil weight) ---
    ink.save(); ink.lineCap = 'round'; ink.strokeStyle = 'rgba(14,17,23,.78)';
    [-1, 1].forEach(s => { const ex = cx + s * 40; ink.lineWidth = 2.6; ink.beginPath(); ink.moveTo(ex - 22, 450); ink.quadraticCurveTo(ex, 460, ex + 22, 449); ink.stroke(); ink.lineWidth = 1.2; for (let j = 0; j < 7; j++) { const x = ex - 20 + j * 6.6; ink.beginPath(); ink.moveTo(x, 452 + Math.sin(j / 6 * 3.14) * 6); ink.lineTo(x + s * -2, 460 + Math.sin(j / 6 * 3.14) * 6); ink.stroke(); } ink.strokeStyle = 'rgba(14,17,23,.35)'; ink.lineWidth = 1.4; ink.beginPath(); ink.moveTo(ex - 20, 438); ink.quadraticCurveTo(ex, 430, ex + 22, 437); ink.stroke(); ink.strokeStyle = 'rgba(14,17,23,.78)'; ink.lineWidth = 4.2; ink.beginPath(); ink.moveTo(ex - 26, 421); ink.quadraticCurveTo(ex, 406 + s * 1, ex + 28, 414 + (s > 0 ? 3 : -2)); ink.stroke(); });
    ink.strokeStyle = 'rgba(14,17,23,.42)'; ink.lineWidth = 1.8; ink.beginPath(); ink.moveTo(cx + 5, 470); ink.quadraticCurveTo(cx + 12, 500, cx + 2, 512); ink.stroke(); ink.lineWidth = 2.6; ink.strokeStyle = 'rgba(14,17,23,.55)'; ink.beginPath(); ink.moveTo(cx - 15, 517); ink.quadraticCurveTo(cx - 6, 523, cx + 2, 518); ink.moveTo(cx + 8, 518); ink.quadraticCurveTo(cx + 15, 522, cx + 19, 516); ink.stroke();
    ink.strokeStyle = 'rgba(14,17,23,.7)'; ink.lineWidth = 2.4; ink.beginPath(); ink.moveTo(cx - 26, 553); ink.quadraticCurveTo(cx - 8, 548, cx, 552); ink.quadraticCurveTo(cx + 8, 548, cx + 26, 553); ink.stroke(); ink.strokeStyle = 'rgba(14,17,23,.28)'; ink.lineWidth = 6; ink.beginPath(); ink.moveTo(cx - 17, 562); ink.quadraticCurveTo(cx, 569, cx + 17, 562); ink.stroke();
    ink.restore();
    // --- brush: charcoal hair texture following the bob, pencil hatching on face/neck/coat, hair sheen (erase) ---
    L.paint(ink, (b, rnd) => {
      b.set('charcoal', '#000', 1.0);
      for (let i = 0; i < 90; i++) { const side = rnd() < .5 ? -1 : 1, x0 = cx + side * (84 + rnd() * 46), y0 = 300 + rnd() * 120; b.spline([[x0, y0, .5], [x0 + side * (2 + rnd() * 6), y0 + 70 + rnd() * 40, 1], [x0 + side * (2 + rnd() * 10) * (rnd() < .5 ? -1 : 1), Math.min(584, y0 + 150 + rnd() * 90), .4]], .6); }
      for (let i = 0; i < 60; i++) { const a0 = 200 + rnd() * 140, x0 = cx - 110 + rnd() * 220, y0 = 238 + Math.abs(x0 - cx) * .2 + rnd() * 20; b.spline([[x0, y0, .4], [x0 + (x0 - cx) * .12, y0 + 34, 1], [x0 + (x0 - cx) * .26, y0 + 64 + rnd() * 16, .3]], .6); }
      for (let i = 0; i < 30; i++) { const x0 = cx - 100 + i * 7, y0 = 262 + Math.abs(i - 15) * 1.8; b.spline([[x0, y0, .4], [x0 + 14 - (i - 15) * .6, y0 + 52 + rnd() * 10, 1], [x0 + 22 - (i - 15), y0 + 100 + rnd() * 12, .3]], .5); }
    }, { seed: 562, mode: 'mask', color: INK, alpha: .55, gain: 1.7 });
    L.paint(ink, (b, rnd) => {
      b.set('2B', '#000', .8); L.ink(b, L.smooth([[cx - 82, 430], [cx - 78, 508], [cx - 50, 574], [cx, 604]], false, 8), { brush: '2B', color: '#000', w: .7, rnd, gap: .25, wig: .8, chunk: [30, 90] });
      b.set('HB', '#000', .6); for (let i = 0; i < 44; i++) { const tt = i / 44, y = 420 + tt * 160, x0 = cx + 38 + tt * 16 + rnd() * 10; b.line(x0, y, x0 + 24 + rnd() * 14, y + 13 + rnd() * 5); }
      for (let i = 0; i < 50; i++) { const x0 = cx - 215 + rnd() * 430, y0 = 676 + rnd() * 50; b.line(x0, y0, x0 + 10 + rnd() * 12, y0 + 26 + rnd() * 10); }
    }, { seed: 563, mode: 'mask', color: INK, alpha: .5, gain: 2.0 });
    ink.save(); ink.globalCompositeOperation = 'destination-out'; ink.lineCap = 'round'; ink.strokeStyle = 'rgba(0,0,0,.4)'; [[-74, 286, -86, 400], [-40, 262, -62, 380], [48, 262, 82, 360], [92, 300, 108, 420]].forEach(([x0, y0, x1, y1], i) => { ink.lineWidth = 3 + i % 2 * 2; ink.beginPath(); ink.moveTo(cx + x0, y0); ink.quadraticCurveTo(cx + (x0 + x1) / 2 - 6, (y0 + y1) / 2, cx + x1, y1); ink.stroke(); }); ink.restore();
    // paper oval vignette around the bust (soft pencil edge) — keeps the portrait anchored
    L.paint(ink, (b, rnd) => { b.set('HB', '#000', .5); for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = 270 + r() * 30; b.line(cx + Math.cos(a) * d * 1.05, 470 + Math.sin(a) * d * .98, cx + Math.cos(a + .06) * (d + 16) * 1.05, 470 + Math.sin(a + .06) * (d + 16) * .98); } }, { seed: 565, mode: 'mask', color: INK, alpha: .22, gain: 1.3 });
  }

  function poster(level) {
    const t = level / 5, e = Math.pow(t, 1.15);
    return async (k) => {
      const W = PW, H = PH, r = L.rng(5000 + level * 17), c = L.layer(W, H), rr = L.rng(999); // rr: identical across frames for the base layout
      await document.fonts.load('700 40px CG'); await document.fonts.load('600 40px CG');
      // ---- paper ----
      const paper = L.layer(W, H); L.fill(paper, '#e6e9e6');
      L.vgrad(paper, [[0, 'rgba(255,255,252,.25)'], [.5, 'rgba(255,255,252,0)'], [1, 'rgba(120,130,120,.15)']]);
      L.grain(paper, { a: .13, seed: 4 });
      const fib = L.noiseAlpha(W, H, { sx: .25, sy: .25, oct: 4, seed: 33, lo: .4, hi: .8, color: '#a3a89a', res: 4, max: .5 }); L.blit(paper, fib, { op: 'multiply', alpha: .3 });
      // creases (fold lines: fixed, deepen when wet)
      paper.save(); [[0, 330, 720, 352], [360, 0, 340, 1008]].forEach(([x0, y0, x1, y1]) => { paper.strokeStyle = `rgba(90,98,92,${.1 + .12 * e})`; paper.lineWidth = 1.6; paper.beginPath(); paper.moveTo(x0, y0); paper.lineTo(x1, y1); paper.stroke(); paper.strokeStyle = `rgba(255,255,255,${.5})`; paper.lineWidth = 1.4; paper.beginPath(); paper.moveTo(x0 + 2, y0 + 2); paper.lineTo(x1 + 2, y1 + 2); paper.stroke(); }); paper.restore();
      // ---- ink ----
      const ink = L.layer(W, H); drawText(ink); drawPortrait(ink, rr);
      // rough pencil edges even on frame 0
      L.rough(ink, { amp: .9 + e * 3.5, seed: 5 + level, freq: .05 });
      let res = ink;
      if (level > 0) {
        // wet mask: starts at the top (water runs down), grows with level
        const wet = L.noiseAlpha(W, H, { sx: 1.0, sy: 2.4, oct: 4, seed: 77, lo: .6 - .52 * e, hi: .74 - .5 * e, color: '#fff', res: 6 });
        const vg = L.layer(W, H); L.vgrad(vg, [[0, 'rgba(255,255,255,1)'], [1, `rgba(255,255,255,${.5 + .5 * e})`]]); wet.save(); wet.setTransform(1, 0, 0, 1, 0, 0); wet.globalCompositeOperation = 'destination-in'; wet.drawImage(vg.canvas, 0, 0); wet.restore();
        // dry part
        const dry = L.copyLayer(ink); dry.save(); dry.setTransform(1, 0, 0, 1, 0, 0); dry.globalCompositeOperation = 'destination-out'; dry.drawImage(wet.canvas, 0, 0); dry.restore();
        // wet part: blurred, faded ink (pigment migrates)
        const bl = L.blurred(ink, 1.6 + e * 11); bl.save(); bl.setTransform(1, 0, 0, 1, 0, 0); bl.globalCompositeOperation = 'destination-in'; bl.drawImage(wet.canvas, 0, 0); bl.restore();
        // dissolving: erase with speckle threshold in wet zones
        const dis = L.noiseAlpha(W, H, { sx: .09, sy: .09, oct: 4, seed: 88 + level, lo: .72 - .5 * e, hi: .8 - .42 * e, color: '#fff', res: 3 }); bl.save(); bl.setTransform(1, 0, 0, 1, 0, 0); bl.globalCompositeOperation = 'destination-out'; bl.globalAlpha = Math.min(1, e * 1.1); bl.drawImage(dis.canvas, 0, 0); bl.restore();
        const dry2 = L.copyLayer(dry); dry2.save(); dry2.setTransform(1, 0, 0, 1, 0, 0); dry2.globalCompositeOperation = 'destination-out'; dry2.globalAlpha = e * .55; dry2.drawImage(dis.canvas, 0, 0); dry2.restore();
        res = L.layer(W, H); L.blit(res, dry2, {}); L.blit(res, bl, { alpha: 1 - .7 * e });
        // brush bleeds: ink-coloured watercolour blooms that spread from letters
        const nb = Math.round((3 + 12 * e) * (k.q < 1 ? .6 : 1));
        L.glaze(res, [{ color: '#000', op: 90 }], (b, i, rnd) => { for (let j = 0; j < nb; j++) { const y = [150, 820, 886, 330, 470, 560][j % 6] + (rnd() - .5) * 30, x = 80 + rnd() * 560; b.polygon(L.blobPts(x, y, 30 + rnd() * 90, 10 + rnd() * 40 + e * 30, { n: 12, rough: .3, rnd, rot: 90 })); } }, { seed: 590 + level, mode: 'mask', color: '#2c3a4d', alpha: .1 + .26 * e, bleed: .5, tex: .5, border: .05, gain: 1.2 });
        // drips: from letter rows downward
        const nd = Math.round(3 + 17 * e);
        res.save(); res.lineCap = 'round';
        for (let i = 0; i < nd; i++) { const row = r.pick([150, 150, 250, 300, 818, 818, 884]), x = 60 + r() * 600, len = (50 + r() * 140) * (.5 + e * 3), w = 1.6 + r() * 4 * (.6 + e), a = .22 + .3 * r() * (1 - e * .3);
          const g = res.createLinearGradient(x, row, x, row + len); g.addColorStop(0, `rgba(26,34,46,${a})`); g.addColorStop(.85, `rgba(26,34,46,${a * .7})`); g.addColorStop(1, `rgba(26,34,46,0)`); res.strokeStyle = g; res.lineWidth = w; res.beginPath(); res.moveTo(x, row); res.bezierCurveTo(x + r() * 8 - 4, row + len * .35, x + r() * 10 - 5, row + len * .7, x + r() * 6 - 3, row + len); res.stroke(); res.fillStyle = `rgba(26,34,46,${a})`; res.beginPath(); res.ellipse(x + r() * 4 - 2, row + len * .92, w * .75, w * 1.1, 0, 0, 6.3); res.fill(); }
        res.restore();
      }
      // ---- compose: paper, then ink multiplied ----
      L.blit(c, paper, {}); L.blit(c, res, { op: 'multiply' });
      // water on paper: dark soak in wet zones, cockled shading, drops
      if (level > 0) {
        const soak = L.noiseAlpha(W, H, { sx: 1.0, sy: 2.4, oct: 4, seed: 77, lo: .6 - .52 * e, hi: .74 - .5 * e, color: '#3d4c5e', res: 6 }); L.blit(c, soak, { op: 'multiply', alpha: .2 + .2 * e });
        L.glaze(c, [{ color: '#6E89A3', op: 70 }], (b, i, rnd) => { for (let j = 0; j < 4 + level * 2; j++) b.polygon(L.blobPts(rnd() * W, rnd() * H * (.5 + e * .5), 80 + rnd() * 160, 60 + rnd() * 120, { n: 12, rough: .3, rnd })); }, { seed: 600 + level, bleed: .5, tex: .6, border: .35, alpha: .2 + .25 * e });
        const wr = Math.round(10 + e * 40); c.save(); for (let i = 0; i < wr; i++) { const x = r() * W, y = r() * H * (.35 + e * .65), rd = 3 + r() * (6 + e * 10); c.fillStyle = 'rgba(20,28,38,.28)'; c.beginPath(); c.ellipse(x + 1, y + 1.6, rd, rd * 1.1, 0, 0, 6.3); c.fill(); c.fillStyle = 'rgba(232,240,246,.5)'; c.beginPath(); c.ellipse(x, y, rd * .95, rd * 1.05, 0, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x - rd * .3, y - rd * .4, rd * .28, 0, 6.3); c.fill(); } c.restore();
        // wrinkles: cockle waves
        c.save(); c.globalCompositeOperation = 'multiply'; for (let i = 0; i < 6 + level * 3; i++) { const y = r() * H, x = r() * W, l = 120 + r() * 300, a = (r() - .5) * .8; c.strokeStyle = `rgba(80,92,104,${.06 + e * .1})`; c.lineWidth = 3 + r() * 6; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2 + 12, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } c.restore();
        L.rain(c, { n: Math.round(60 + 160 * e), ang: 7, len: [40, 140], w: 1.2, alpha: .18, color: '#9fb4c8', seed: 610 + level });
      }
      // tape (peels as it gets wet)
      const tape = (x, y, rot, a) => { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = `rgba(226,230,222,${a})`; c.beginPath(); c.moveTo(-70, -17); for (let i = 0; i <= 6; i++) c.lineTo(-70 + i * 23, -17 + (i % 2 ? 2 : -1)); c.lineTo(70, 17); for (let i = 6; i >= 0; i--) c.lineTo(-70 + i * 23, 17 + (i % 2 ? -2 : 1)); c.closePath(); c.fill(); c.strokeStyle = `rgba(120,128,120,${a * .6})`; c.lineWidth = 1; c.stroke(); c.fillStyle = `rgba(255,255,255,${a * .5})`; c.fillRect(-60, -12, 120, 4); c.restore(); };
      tape(78, 40, -.65, .62 - .2 * e); tape(642, 42, .62, .62 - .25 * e);
      c.save(); c.globalCompositeOperation = 'multiply'; c.filter = `blur(${3 * c.q}px)`; c.fillStyle = 'rgba(40,50,60,.22)'; c.fillRect(0, 0, 8, H); c.fillRect(W - 8, 0, 8, H); c.restore();
      L.vignette(c, .22 + .18 * e); L.grain(c, { a: .05 });
      return c;
    };
  }
  for (let i = 0; i < 6; i++) P.register('poster_0' + i, { w: 720, h: 1008, alpha: false, seed: 520 + i, kind: 'seq' }, poster(i));
})();
