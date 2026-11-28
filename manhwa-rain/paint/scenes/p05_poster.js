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
    // graphite / charcoal portrait of Merey (18): frontal, open eyes, side-parted short bob. ink layer = density (black w/ alpha)
    const cx = 360, r = L.rng(4242), q = ink.q, K = 'rgba(16,20,27,';
    const path = (c, pts) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
    const sm = (pts, cl = true) => L.smooth(pts, cl, 8);
    const soft = (px, fn) => { ink.save(); ink.filter = `blur(${px * q}px)`; fn(); ink.restore(); };
    const blob = (x, y, rx, ry, a, rot = 0) => { ink.fillStyle = K + a + ')'; ink.beginPath(); ink.ellipse(x, y, rx, ry, rot, 0, 6.2832); ink.fill(); };
    // --- jumper / coat + neck ---
    ink.save();
    const sh = sm([[cx - 52, 650], [cx - 140, 672], [cx - 226, 716], [cx - 262, 744], [cx + 262, 744], [cx + 226, 716], [cx + 140, 672], [cx + 52, 650]], false);
    let g = ink.createLinearGradient(0, 650, 0, 744); g.addColorStop(0, K + '.5)'); g.addColorStop(1, K + '.78)'); ink.fillStyle = g; path(ink, sh); ink.fill();
    // neck
    const neck = sm([[cx - 42, 560], [cx - 44, 630], [cx - 56, 664], [cx + 56, 664], [cx + 44, 630], [cx + 42, 560]], false);
    g = ink.createLinearGradient(cx - 44, 0, cx + 44, 0); g.addColorStop(0, K + '.1)'); g.addColorStop(.6, K + '.2)'); g.addColorStop(1, K + '.34)'); ink.fillStyle = g; path(ink, neck); ink.fill();
    soft(9, () => blob(cx, 598, 54, 28, .42)); // chin cast shadow on the neck
    // roll-neck collar: thick knit band
    ink.fillStyle = K + '.62)'; ink.beginPath(); ink.ellipse(cx, 652, 76, 26, 0, 0, 6.2832); ink.fill(); ink.globalCompositeOperation = 'destination-out'; ink.fillStyle = 'rgba(0,0,0,.34)'; ink.beginPath(); ink.ellipse(cx - 12, 644, 52, 12, -.05, 0, 6.2832); ink.fill(); ink.globalCompositeOperation = 'source-over';
    ink.restore();
    // --- hair mass, then carve the face ---
    ink.save(); ink.fillStyle = K + '.93)';
    const hair = sm([[cx - 112, 400], [cx - 108, 318], [cx - 70, 256], [cx, 234], [cx + 74, 252], [cx + 110, 314], [cx + 118, 400], [cx + 114, 490], [cx + 104, 552], [cx + 80, 584], [cx + 66, 560], [cx + 66, 500], [cx - 64, 500], [cx - 68, 566], [cx - 84, 588], [cx - 106, 564], [cx - 116, 500]], true);
    path(ink, hair); ink.fill();
    ink.globalCompositeOperation = 'destination-out'; ink.fillStyle = '#000';
    const face = sm([[cx - 78, 392], [cx - 56, 352], [cx - 16, 336], [cx + 36, 352], [cx + 74, 384], [cx + 80, 440], [cx + 76, 506], [cx + 52, 568], [cx + 4, 604], [cx - 46, 574], [cx - 74, 510], [cx - 82, 440]], true); path(ink, face); ink.fill();
    ink.globalCompositeOperation = 'source-over'; ink.restore();
    // --- skin tone and sculpting ---
    ink.save(); path(ink, face); ink.clip();
    ink.fillStyle = K + '.09)'; ink.fillRect(cx - 100, 320, 200, 300);
    g = ink.createLinearGradient(cx - 82, 0, cx + 82, 0); g.addColorStop(0, K + '.02)'); g.addColorStop(.55, K + '.04)'); g.addColorStop(1, K + '.3)'); ink.fillStyle = g; ink.fillRect(cx - 100, 320, 200, 300);
    soft(10, () => { blob(cx - 40, 424, 34, 18, .22); blob(cx + 40, 424, 34, 18, .24); blob(cx + 62, 500, 22, 52, .22); blob(cx - 70, 470, 16, 60, .14); blob(cx, 590, 70, 16, .3); blob(cx + 6, 368, 80, 24, .3, .05); blob(cx + 30, 540, 30, 14, .12); });
    soft(5, () => { blob(cx + 14, 480, 8, 26, .2, .1); blob(cx, 522, 24, 6, .32); }); // nose side plane, shadow under nose
    ink.restore();
    // --- eyes (open, looking at the viewer) ---
    [-1, 1].forEach(sd => {
      const ex = cx + sd * 40, ey = 424;
      // eye socket crease and upper lid
      ink.save(); ink.lineCap = 'round';
      soft(1.2, () => { ink.strokeStyle = K + '.28)'; ink.lineWidth = 3; ink.beginPath(); ink.moveTo(ex - 24, ey - 8); ink.quadraticCurveTo(ex, ey - 22, ex + 24, ey - 9); ink.stroke(); });
      // sclera: a touch lighter than skin
      ink.globalCompositeOperation = 'destination-out'; ink.fillStyle = 'rgba(0,0,0,.09)'; ink.beginPath(); ink.moveTo(ex - 21, ey + 1); ink.quadraticCurveTo(ex, ey - 15, ex + 21, ey + 1); ink.quadraticCurveTo(ex, ey + 9, ex - 21, ey + 1); ink.fill(); ink.globalCompositeOperation = 'source-over';
      // iris: soft grey with dark limbal ring, pupil, catchlight
      ink.save(); ink.beginPath(); ink.moveTo(ex - 21, ey + 1); ink.quadraticCurveTo(ex, ey - 15, ex + 21, ey + 1); ink.quadraticCurveTo(ex, ey + 9, ex - 21, ey + 1); ink.clip();
      const ix = ex + sd * -1.5, iy = ey - 1; const ig = ink.createRadialGradient(ix, iy + 2, 1, ix, iy, 9.5); ig.addColorStop(0, K + '.5)'); ig.addColorStop(.7, K + '.74)'); ig.addColorStop(1, K + '.92)'); ink.fillStyle = ig; ink.beginPath(); ink.arc(ix, iy, 9.5, 0, 6.2832); ink.fill();
      ink.strokeStyle = K + '.3)'; ink.lineWidth = .8; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; ink.beginPath(); ink.moveTo(ix + Math.cos(a) * 3.5, iy + Math.sin(a) * 3.5); ink.lineTo(ix + Math.cos(a) * 8, iy + Math.sin(a) * 8); ink.stroke(); }
      ink.fillStyle = K + '.97)'; ink.beginPath(); ink.arc(ix, iy, 4, 0, 6.2832); ink.fill();
      ink.globalCompositeOperation = 'destination-out'; ink.fillStyle = 'rgba(0,0,0,1)'; ink.beginPath(); ink.arc(ix - 3.2, iy - 3.2, 2.1, 0, 6.2832); ink.fill(); ink.fillStyle = 'rgba(0,0,0,.5)'; ink.beginPath(); ink.arc(ix + 3, iy + 3.2, 1.1, 0, 6.2832); ink.fill();
      // upper lid shadow over the top of the eyeball
      ink.globalCompositeOperation = 'source-over'; soft(1.5, () => { ink.fillStyle = K + '.4)'; ink.beginPath(); ink.ellipse(ex, ey - 7, 22, 5, 0, 0, 6.2832); ink.fill(); });
      ink.restore();
      // lid lines + lashes
      ink.strokeStyle = K + '.88)'; ink.lineWidth = 2.4; ink.beginPath(); ink.moveTo(ex - 23, ey + 1); ink.quadraticCurveTo(ex - 2, ey - 16, ex + 23, ey - 1 + sd * 0); ink.stroke();
      ink.lineWidth = 1.3; for (let j = 0; j < 9; j++) { const t = j / 8, x = ex - 20 + t * 40, y = ey - 12 * Math.sin(Math.PI * Math.min(1, t * .95 + .03)) + 2; ink.beginPath(); ink.moveTo(x, y + 2); ink.quadraticCurveTo(x + sd * -1 + (t - .5) * 5, y - 6, x + (t - .5) * 9 + sd * -1, y - 9 - (t > .7 ? 2 : 0)); ink.stroke(); }
      ink.strokeStyle = K + '.4)'; ink.lineWidth = 1.2; ink.beginPath(); ink.moveTo(ex - 17, ey + 3); ink.quadraticCurveTo(ex, ey + 11, ex + 17, ey + 3); ink.stroke();
      // brow: tapered hair strokes
      ink.strokeStyle = K + '.65)'; for (let j = 0; j < 22; j++) { const t = j / 21, bx = ex - 26 + t * 54, by = 400 - Math.sin(t * 3.1) * 8 - (sd > 0 ? t * 3 : (1 - t) * 3) + 6; ink.lineWidth = 1.6 - t * .5; ink.beginPath(); ink.moveTo(bx - 2, by + 3); ink.lineTo(bx + 5, by - 1 + (r() - .5) * 2); ink.stroke(); }
      ink.restore();
    });
    // --- nose (tone only), lips ---
    ink.save(); ink.lineCap = 'round';
    soft(1.5, () => { ink.fillStyle = K + '.5)'; ink.beginPath(); ink.ellipse(cx - 9, 520, 5, 3, .3, 0, 6.2832); ink.fill(); ink.beginPath(); ink.ellipse(cx + 12, 521, 5, 3, -.3, 0, 6.2832); ink.fill(); });
    soft(1.2, () => { ink.strokeStyle = K + '.34)'; ink.lineWidth = 2; ink.beginPath(); ink.moveTo(cx - 17, 516); ink.quadraticCurveTo(cx - 11, 526, cx - 2, 523); ink.moveTo(cx + 22, 515); ink.quadraticCurveTo(cx + 17, 526, cx + 6, 523); ink.stroke(); });
    soft(1, () => { ink.fillStyle = K + '.58)'; ink.beginPath(); ink.moveTo(cx - 27, 551); ink.quadraticCurveTo(cx - 12, 541, cx, 545); ink.quadraticCurveTo(cx + 12, 541, cx + 27, 551); ink.quadraticCurveTo(cx, 556, cx - 27, 551); ink.fill(); ink.fillStyle = K + '.3)'; ink.beginPath(); ink.moveTo(cx - 24, 553); ink.quadraticCurveTo(cx, 574, cx + 24, 553); ink.quadraticCurveTo(cx, 558, cx - 24, 553); ink.fill(); ink.strokeStyle = K + '.8)'; ink.lineWidth = 1.8; ink.beginPath(); ink.moveTo(cx - 28, 551); ink.quadraticCurveTo(cx, 556, cx + 28, 551); ink.stroke(); });
    soft(5, () => blob(cx, 580, 28, 7, .22));
    ink.restore();
    // --- brush: charcoal strand flow in the hair, highlight band (erase), graphite hatching on face/neck/jumper ---
    L.paint(ink, (b, rnd) => {
      b.set('charcoal', '#000', 1.0);
      for (let i = 0; i < 130; i++) { const side = rnd() < .5 ? -1 : 1, x0 = cx + side * (rnd() * 120 + 8), y0 = 236 + Math.abs(x0 - cx) * .28 + rnd() * 30; const ln = Math.abs(x0 - cx) < 88 ? 40 + rnd() * 50 : 60 + rnd() * 200, bend = (x0 - cx) * .14; b.spline([[x0, y0, .4], [x0 + bend, y0 + ln * .5, 1], [x0 + bend * 1.2 + side * rnd() * 6, Math.min(Math.abs(x0 - cx) < 88 ? 350 : 590, y0 + ln), .3]], .6); }
    }, { seed: 562, mode: 'mask', color: INK, alpha: .5, gain: 1.7 });
    ink.save(); ink.globalCompositeOperation = 'destination-out'; ink.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const t = i / 25, x0 = cx - 104 + t * 208 + (r() - .5) * 8, y0 = 262 + Math.sin(t * 3.14) * -10 + Math.abs(t - .45) * 56 + (r() - .5) * 10; ink.strokeStyle = `rgba(0,0,0,${.14 + r() * .2})`; ink.lineWidth = 1 + r() * 2; ink.beginPath(); ink.moveTo(x0, y0); ink.quadraticCurveTo(x0 + (t - .5) * 20, y0 + 20, x0 + (t - .5) * 34, y0 + 38 + r() * 12); ink.stroke(); }
    ink.restore();
    L.paint(ink, (b, rnd) => {
      b.set('HB', '#000', .6);
      for (let i = 0; i < 70; i++) { const tt = i / 70, y = 400 + tt * 190, x0 = cx + 36 + tt * 14 + rnd() * 14; b.line(x0, y, x0 + 18 + rnd() * 16, y + 11 + rnd() * 5); }
      for (let i = 0; i < 32; i++) { const x0 = cx - 38 + rnd() * 76, y0 = 580 + rnd() * 70; b.line(x0, y0, x0 + 8 + rnd() * 12, y0 + 14 + rnd() * 8); }
      b.set('2B', '#000', .8); for (let i = 0; i < 90; i++) { const x0 = cx - 230 + rnd() * 460, y0 = 684 + rnd() * 54; b.line(x0, y0, x0 + 8 + rnd() * 12, y0 + 22 + rnd() * 10); }
      b.set('HB', '#000', .5); for (let i = 0; i < 36; i++) { const x0 = cx - 70 + rnd() * 140, y0 = 636 + rnd() * 26; b.line(x0, y0, x0 + 6, y0 + 14 + rnd() * 6); }
    }, { seed: 563, mode: 'mask', color: INK, alpha: .45, gain: 2.0 });
    // printed-photo grain: speckle dropout over the whole portrait
    const gr = L.noiseAlpha(PW, PH, { sx: .02, sy: .02, oct: 2, seed: 91, lo: .5, hi: .66, color: '#000', res: 2 }); ink.save(); ink.setTransform(1, 0, 0, 1, 0, 0); ink.globalCompositeOperation = 'destination-out'; ink.globalAlpha = .1; ink.drawImage(gr.canvas, 0, 0, ink.canvas.width, ink.canvas.height); ink.restore();
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
