/* Page 2 — window: window_city (out-of-focus night city), window_frame (frame, sill, tea cup, condensation) */
(function () {
  const P = PAINT, L = P.lib, PAL = L.PAL;
  const SZ = { w: 1080, h: 1512 };

  P.register('window_city', { ...SZ, alpha: false, seed: 201 }, async (k) => {
    const W = k.W, H = k.H, c = L.layer();
    L.vgrad(c, [[0, '#070b12'], [.3, '#0f1722'], [.55, '#1a2838'], [.75, '#142030'], [1, '#0a1019']]);
    // distant skyline (blurred stand-in for the real city) painted on its own layer
    const sk = L.layer();
    L.skyline(sk, { base: 900, hmin: 120, hmax: 420, wmin: 50, wmax: 130, far: .5, seed: 211, winDens: .5, winSize: [6, 9], warm: .55, inkW: .4, fillDown: 700, glazes: 2, steps: .5 });
    L.skyline(sk, { base: 1000, hmin: 60, hmax: 220, wmin: 40, wmax: 120, far: .15, seed: 212, winDens: .45, winSize: [8, 12], warm: .5, inkW: .4, fillDown: 700, glazes: 2 });
    L.blit(c, sk, { blur: 11, alpha: .95 });
    L.glow(c, W * .5, 880, W * .8, '#b98c52', .22, 'screen');
    L.glow(c, W * .15, 760, 420, '#7d97b3', .16, 'screen');
    // street lights and low lamps — big defocus discs, clustered around the horizon band
    L.bokeh(c, { n: 38, area: { x0: -40, y0: 760, x1: W + 40, y1: 1120 }, rmin: 16, rmax: 56, colors: [[PAL.yellow, 7], ['#FFD98A', 3], [PAL.mist, 2], [PAL.rain, 3], [PAL.signal, 1]], a: .95, ring: .6, seed: 21 });
    L.bokeh(c, { n: 14, area: { x0: -60, y0: 960, x1: W + 60, y1: H }, rmin: 50, rmax: 130, colors: [[PAL.yellow, 5], [PAL.mist, 3], [PAL.rain, 2], [PAL.signal, 1]], a: .6, ring: .6, seed: 22 });
    L.bokeh(c, { n: 20, area: { x0: 0, y0: 300, x1: W, y1: 800 }, rmin: 8, rmax: 34, colors: [[PAL.yellow, 2], [PAL.mist, 4], [PAL.rain, 4]], a: .5, ring: .5, seed: 23 });
    // reflected smear of lights on the wet street (soft, vertical)
    const r = k.rnd; const lt = []; for (let i = 0; i < 26; i++) lt.push({ x: r() * W, y: 1000 + r() * 200, r: 18 + r() * 34, color: r.pick([PAL.yellow, '#FFD98A', PAL.mist, PAL.rain]), a: .26, len: 160 + r() * 200 });
    L.lightStreaks(c, lt, { amp: 6, blur: 9 });
    // glass haze: rain veil + fog patches, painterly density washes
    L.fog(c, { y0: 600, y1: 1300, color: '#5d7790', a: .25, seed: 31 });
    L.glaze(c, [{ color: '#7e98b3', op: 80, alpha: .12 }, { color: '#c5d0da', op: 60, alpha: .07 }], (b, i, rnd) => { for (let j = 0; j < 9; j++) b.polygon(L.blobPts(rnd() * W, 300 + rnd() * 1000, 160 + rnd() * 240, 70 + rnd() * 130, { n: 14, rough: .3, rnd })); }, { seed: 41, mode: 'mask', bleed: .5, tex: .4, border: .05, gain: 1.1 });
    L.glaze(c, ['#2a3b52'], (b, i, rnd) => { for (let j = 0; j < 8; j++) b.polygon(L.blobPts(rnd() * W, rnd() * H, 200 + rnd() * 260, 120 + rnd() * 200, { n: 14, rough: .3, rnd })); }, { seed: 42, opacity: 90, bleed: .45, tex: .6, border: .1, alpha: .5 });
    L.rain(c, { n: 220, ang: 10, len: [100, 300], w: 1.4, alpha: .14, color: '#aac0d6', seed: 43 });
    L.bloom(c, { blur: 30, a: .4, boost: 1.4, contrast: 1.6 });
    L.vignette(c, .55);
    L.grain(c, { a: .07 });
    return c;
  });

  P.register('window_frame', { ...SZ, alpha: true, seed: 202 }, async (k) => {
    const W = k.W, H = k.H, c = L.layer(), r = k.rnd;
    const O = { x0: 84, y0: 84, x1: 996, y1: 1176 }; // glass opening
    const mv = { x: 504, w: 54 }, mh = { y: 596, h: 48 };
    // glass condensation first (frame will sit on top of it)
    const panes = [[O.x0, O.y0, mv.x, mh.y], [mv.x + mv.w, O.y0, O.x1, mh.y], [O.x0, mh.y + mh.h, mv.x, O.y1], [mv.x + mv.w, mh.y + mh.h, O.x1, O.y1]];
    const mist = L.layer(); L.fill(mist, 'rgba(205,216,226,.86)');
    const hole = L.layer(); hole.fillStyle = '#fff'; panes.forEach(([x0, y0, x1, y1]) => hole.fillRect(x0 + 74, y0 + 74, x1 - x0 - 148, y1 - y0 - 148));
    const hb = L.blurred(hole, 34); const nz = L.noiseAlpha(W, H, { sx: 1.4, sy: 1.4, oct: 4, seed: 71, lo: .25, hi: .75, color: '#fff', res: 8 });
    mist.save(); mist.setTransform(1, 0, 0, 1, 0, 0); mist.globalCompositeOperation = 'destination-out'; mist.drawImage(hb.canvas, 0, 0); mist.drawImage(hb.canvas, 0, 0); mist.globalAlpha = .6; mist.drawImage(nz.canvas, 0, 0); mist.globalAlpha = 1; mist.drawImage(hb.canvas, 0, 0); mist.restore();
    // wipe trails/drips in the fog
    mist.save(); mist.globalCompositeOperation = 'destination-out'; mist.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const x = O.x0 + 20 + r() * (O.x1 - O.x0 - 40), y = O.y0 + r() * 80, l = 70 + r() * 220; mist.strokeStyle = `rgba(0,0,0,${.35 + r() * .5})`; mist.lineWidth = 2 + r() * 5; mist.beginPath(); mist.moveTo(x, y); mist.bezierCurveTo(x + r() * 10 - 5, y + l * .4, x + r() * 14 - 7, y + l * .7, x + r() * 8 - 4, y + l); mist.stroke(); }
    mist.restore();
    L.blit(c, mist, { alpha: 1 });
    // brush pass: condensation texture (density mask)
    L.glaze(c, [{ color: '#d8e2ec', op: 70, alpha: .28 }], (b, i, rnd) => { panes.forEach(([x0, y0, x1, y1]) => { for (let j = 0; j < 5; j++) b.polygon(L.blobPts(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 60 + rnd() * 120, 40 + rnd() * 80, { n: 12, rough: .35, rnd })); }); }, { seed: 72, mode: 'mask', bleed: .5, tex: .4, border: .05 });
    // --- frame (dark painted wood) ---
    const wood = (x, y, w, h, vertical) => { c.save(); const g = vertical ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#1d2733'); g.addColorStop(.12, '#141c26'); g.addColorStop(.88, '#0d131b'); g.addColorStop(1, '#070b11'); c.fillStyle = g; c.fillRect(x, y, w, h); c.restore(); };
    wood(0, 0, O.x0, H, true); wood(O.x1, 0, W - O.x1, H, true); wood(0, 0, W, O.y0, false); wood(mv.x, O.y0, mv.w, O.y1 - O.y0, true); wood(O.x0, mh.y, O.x1 - O.x0, mh.h, false);
    // inner bevel highlights (cool light from the street)
    c.save(); c.strokeStyle = 'rgba(140,168,196,.5)'; c.lineWidth = 2;
    [[O.x0, O.y0, O.x1, O.y0], [O.x0, O.y0, O.x0, O.y1], [mv.x, O.y0, mv.x, O.y1], [O.x0, mh.y, O.x1, mh.y]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); });
    c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 3; [[O.x1, O.y0, O.x1, O.y1], [mv.x + mv.w, O.y0, mv.x + mv.w, O.y1], [O.x0, mh.y + mh.h, O.x1, mh.y + mh.h], [O.x0, O.y1, O.x1, O.y1]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }); c.restore();
    // --- sill ---
    const sillY = O.y1;
    c.save(); let g = c.createLinearGradient(0, sillY, 0, sillY + 190); g.addColorStop(0, '#34414f'); g.addColorStop(.5, '#26313e'); g.addColorStop(1, '#1b2430'); c.fillStyle = g; c.beginPath(); c.moveTo(0, sillY); c.lineTo(W, sillY); c.lineTo(W, sillY + 190); c.lineTo(0, sillY + 190); c.fill();
    g = c.createLinearGradient(0, sillY + 190, 0, sillY + 250); g.addColorStop(0, '#0f151d'); g.addColorStop(1, '#0a0e14'); c.fillStyle = g; c.fillRect(0, sillY + 190, W, 66); c.fillStyle = '#0a0e13'; c.fillRect(0, sillY + 256, W, H - sillY - 256 + 4);
    c.strokeStyle = 'rgba(160,185,210,.55)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, sillY + 191); c.lineTo(W, sillY + 191); c.stroke(); c.restore();
    // wood-grain / lacquer streaks on the sill (mask)
    L.paint(c, (b, rnd) => { b.set('HB', '#000', .7); for (let i = 0; i < 70; i++) { const y = sillY + 6 + rnd() * 180, x = rnd() * W; b.line(x, y, x + 80 + rnd() * 260, y + (rnd() - .5) * 4); } }, { seed: 73, mode: 'mask', color: '#9ab2c8', alpha: .13, gain: 1.2, atop: true });
    L.glaze(c, ['#10161e'], (b) => { b.polygon([[0, 0], [W, 0], [W, H], [0, H]]); }, { seed: 74, opacity: 140, bleed: .2, tex: .75, border: .1, alpha: .35, atop: true });
    L.paint(c, (b, rnd) => { [[O.x0, O.y0, O.x1, O.y0], [O.x0, O.y0, O.x0, O.y1], [O.x1, O.y0, O.x1, O.y1], [mv.x, O.y0, mv.x, O.y1], [mv.x + mv.w, O.y0, mv.x + mv.w, O.y1], [O.x0, mh.y, O.x1, mh.y], [O.x0, mh.y + mh.h, O.x1, mh.y + mh.h], [0, sillY + 191, W, sillY + 191]].forEach(([a, bb, d, e]) => L.ink(b, [[a, bb], [d, e]], { color: '#020407', w: .9, rnd, gap: .12, wig: 1.1, chunk: [60, 260] })); }, { seed: 75, mode: 'mask', color: '#020407', alpha: .9 });
    // --- tea cup on the sill ---
    const cx = 372, cy = sillY + 118; // contact centre
    // reflection / lacquer sheen first (mirrored cup comes after drawing, so draw cup on a layer)
    const cup = L.layer(); const rt = 78, rb = 50, ch = 92, hy = cy - ch;
    // saucer
    cup.save(); cup.fillStyle = '#0b1017'; cup.beginPath(); cup.ellipse(cx, cy + 6, 118, 22, 0, 0, 6.3); cup.fill();
    let sg = cup.createLinearGradient(cx - 118, 0, cx + 118, 0); sg.addColorStop(0, '#8fa5ba'); sg.addColorStop(.35, '#d4dee8'); sg.addColorStop(.7, '#6d8197'); sg.addColorStop(1, '#2b3847'); cup.fillStyle = sg; cup.beginPath(); cup.ellipse(cx, cy, 112, 20, 0, 0, 6.3); cup.fill();
    cup.fillStyle = 'rgba(20,30,42,.5)'; cup.beginPath(); cup.ellipse(cx, cy - 2, 70, 11, 0, 0, 6.3); cup.fill();
    // handle (right)
    cup.strokeStyle = '#2d3a4a'; cup.lineWidth = 15; cup.lineCap = 'round'; cup.beginPath(); cup.moveTo(cx + rt - 6, hy + 26); cup.bezierCurveTo(cx + rt + 58, hy + 10, cx + rt + 56, hy + 78, cx + rb + 14, hy + ch - 20); cup.stroke();
    cup.strokeStyle = '#a9bccf'; cup.lineWidth = 4; cup.beginPath(); cup.moveTo(cx + rt + 4, hy + 20); cup.bezierCurveTo(cx + rt + 54, hy + 8, cx + rt + 50, hy + 66, cx + rb + 20, hy + ch - 28); cup.stroke();
    // body
    cup.beginPath(); cup.moveTo(cx - rt, hy); cup.bezierCurveTo(cx - rt - 2, hy + 60, cx - rb - 8, hy + ch - 6, cx - rb, cy - 2); cup.ellipse(cx, cy - 2, rb, 12, 0, Math.PI, 0, true); cup.bezierCurveTo(cx + rb + 8, hy + ch - 6, cx + rt + 2, hy + 60, cx + rt, hy); cup.closePath();
    sg = cup.createLinearGradient(cx - rt, 0, cx + rt, 0); sg.addColorStop(0, '#b7c8d9'); sg.addColorStop(.18, '#e7eef4'); sg.addColorStop(.5, '#a3b5c7'); sg.addColorStop(.85, '#45566a'); sg.addColorStop(1, '#1f2a37'); cup.fillStyle = sg; cup.fill();
    // rim + tea
    cup.fillStyle = '#c9d7e4'; cup.beginPath(); cup.ellipse(cx, hy, rt, 20, 0, 0, 6.3); cup.fill();
    cup.fillStyle = '#4a2f12'; cup.beginPath(); cup.ellipse(cx, hy + 1.5, rt - 7, 15, 0, 0, 6.3); cup.fill();
    const tg = cup.createRadialGradient(cx - 14, hy - 2, 2, cx, hy + 2, rt - 7); tg.addColorStop(0, '#E5B54A'); tg.addColorStop(.45, '#C9962A'); tg.addColorStop(1, '#6a4514'); cup.fillStyle = tg; cup.beginPath(); cup.ellipse(cx, hy + 3, rt - 10, 13, 0, 0, 6.3); cup.fill();
    cup.fillStyle = 'rgba(255,245,215,.8)'; cup.beginPath(); cup.ellipse(cx - 26, hy, 20, 3.2, -.05, 0, 6.3); cup.fill();
    cup.restore();
    // soft shadow + reflection on the lacquered sill
    c.save(); c.fillStyle = 'rgba(0,0,0,.4)'; c.filter = `blur(${8 * c.q}px)`; c.beginPath(); c.ellipse(cx + 22, cy + 14, 130, 22, 0, 0, 6.3); c.fill(); c.restore();
    L.blit(c, cup, {});
    L.reflect(c, { y0: cy + 22, y1: cy + 92, x0: cx - 180, x1: cx + 190, span: 118, amp: 2.2, darken: .55, alpha: .5, fade: .85, op: 'source-over', blur: 1.4, step: 2, seed: 4 });
    L.paint(c, (b, rnd) => { L.ink(b, [[cx - rt, hy], [cx - rt - 2, hy + 58], [cx - rb - 8, hy + ch - 6]], { color: '#0a1018', w: .7, rnd, gap: .12, wig: .5 }); L.ink(b, [[cx + rt, hy], [cx + rt + 2, hy + 60], [cx + rb + 8, hy + ch - 6]], { color: '#0a1018', w: .7, rnd, gap: .1, wig: .5 }); }, { seed: 76, mode: 'mask', color: '#0a1018', alpha: .75 });
    // warm bounce from the tea on the rim, cool window glow on the left of the cup
    L.glow(c, cx, hy + 6, 120, '#E0A63A', .22, 'screen'); L.glow(c, cx - 70, hy + 20, 150, '#9fb6cc', .1, 'screen');
    // steam: soft S-curved mist strokes
    for (let i = 0; i < 3; i++) {
      const sx = cx - 22 + i * 22, pts = []; for (let j = 0; j <= 14; j++) { const t = j / 14; pts.push([sx + Math.sin(t * 5 + i * 1.7) * (10 + 22 * t) + (i - 1) * t * 12, hy - 10 - t * 230, .4 + .6 * Math.sin(Math.PI * Math.min(1, t * 1.2))]); }
      L.paint(c, (b) => { b.set('charcoal', '#000', 2.4 + i * .4); b.spline(pts, .7); }, { seed: 80 + i, mode: 'mask', color: '#dfe8f0', alpha: .22, gain: 1.2, blur: 4 });
    }
    L.blit(c, (() => { const s = L.layer(); s.save(); s.filter = `blur(${12 * s.q}px)`; for (let i = 0; i < 3; i++) { const g = s.createRadialGradient(cx - 10 + i * 12, hy - 90 - i * 40, 6, cx + i * 14, hy - 120 - i * 40, 90); g.addColorStop(0, 'rgba(210,222,234,.18)'); g.addColorStop(1, 'rgba(210,222,234,0)'); s.fillStyle = g; s.fillRect(cx - 120, hy - 300, 280, 300); } s.restore(); return s; })(), {});
    // outside-light haze across the frame edge + bloom
    L.glow(c, W * .5, 300, 700, '#9fb6cc', .05, 'screen');
    L.rough(c, { amp: 1.6, seed: 8, freq: .03 });
    L.grain(c, { a: .06, atop: true });
    L.cleanAlpha(c);
    return c;
  });
})();
