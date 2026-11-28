/* Page 4 — puddle: puddle_bg + boot_00..07 */
(function () {
  const P = PAINT, L = P.lib, PAL = L.PAL;
  const Y = '#F2C230', YD = '#C9962A', YDD = '#8a5f14', YL = '#FFE27a';

  P.register('puddle_bg', { w: 1080, h: 1512, alpha: false, seed: 401 }, async (k) => {
    const W = k.W, H = k.H, r = k.rnd, c = L.layer(), HZ = 640;
    // --- upper scene on its own layer (reflected later) ---
    const s = L.layer(); L.vgrad(s, [[0, '#0a0f17'], [.25, '#17212d'], [.42, '#2a3748']], 0, HZ);
    L.glow(s, 540, 380, 700, '#8a7a5e', .18, 'screen');
    // distant block + shop-front row
    L.skyline(s, { base: HZ - 120, hmin: 60, hmax: 260, wmin: 60, wmax: 150, far: .55, seed: 411, winDens: .4, winSize: [5, 7], inkW: .4, glazes: 1, fillDown: 0 });
    // near shop fronts: flat facade blocks with big lit windows and signs
    const shops = [[-20, 250, 170, 330], [150, 300, 210, 280], [360, 230, 180, 350], [540, 330, 190, 250], [730, 260, 200, 320], [930, 300, 170, 280]];
    shops.forEach(([x, y, w, h], i) => { const g = s.createLinearGradient(0, y, 0, HZ); g.addColorStop(0, i % 2 ? '#1a2431' : '#202c3b'); g.addColorStop(1, '#0c1119'); s.fillStyle = g; s.fillRect(x, y, w, HZ - y); });
    L.glaze(s, ['#0f151d'], (b, i, rnd) => shops.forEach(([x, y, w, h]) => b.polygon([[x, y], [x + w, y], [x + w, HZ], [x, HZ]])), { seed: 412, opacity: 120, bleed: .15, tex: .7, alpha: .55, atop: true });
    const win = []; // lit shop windows
    shops.forEach(([x, y, w, h], i) => { const wy = HZ - 150, wh = 120, wx = x + 14, ww = w - 28; const warm = [Y, '#FFD98A', '#F6E3A8', '#9fb6cc', PAL.signal][[0, 1, 0, 3, 2][i % 5]]; const col = i === 3 ? '#9fb6cc' : (i === 5 ? PAL.signal : (i % 2 ? '#FFD98A' : Y));
      L.windowLight(s, wx, wy, ww, wh, col, { a: .92, glow: ww * .9, glowA: .45 }); s.fillStyle = 'rgba(10,14,20,.7)'; s.fillRect(wx + ww * .33, wy, 5, wh); s.fillRect(wx + ww * .66, wy, 5, wh); s.fillRect(wx, wy + wh * .55, ww, 4);
      // awning
      s.fillStyle = '#10161f'; s.beginPath(); s.moveTo(x, wy - 34); s.lineTo(x + w, wy - 34); s.lineTo(x + w - 10, wy - 6); s.lineTo(x + 10, wy - 6); s.fill(); s.fillStyle = 'rgba(160,185,210,.4)'; s.fillRect(x, wy - 35, w, 2);
      // sign
      s.fillStyle = L.rgba(col, .85); s.fillRect(x + w * .15, wy - 74, w * .7, 24); win.push({ x: wx + ww * .25, y: HZ, r: ww * .1, color: col, a: .5, len: 420 }, { x: wx + ww * .75, y: HZ, r: ww * .1, color: col, a: .42, len: 380 }); });
    // upper windows (dense small)
    shops.forEach(([x, y, w, h]) => L.windows(s, { x, y: y + 6, w, h: HZ - 190 - y }, { cw: 11, ch: 16, gx: 12, gy: 14, lit: .3, warm: .5, seed: 413 }));
    // street lamp (left) hero light
    s.fillStyle = '#05080c'; s.fillRect(90, 250, 8, HZ - 240); s.fillRect(90, 250, 70, 6); L.windowLight(s, 150, 252, 24, 10, '#ffe9a8', { a: 1, glow: 160, glowA: .7 });
    L.blit(c, s, { blur: 2.4 });
    L.bokeh(c, { n: 22, area: { x0: 0, y0: 380, x1: W, y1: 640 }, rmin: 12, rmax: 40, colors: [[Y, 5], ['#FFD98A', 3], [PAL.mist, 2], [PAL.signal, 1], [PAL.rain, 2]], a: .5, ring: .5, seed: 41 });
    // --- wet ground: asphalt + reflections of shop light as vertical streaks ---
    c.save(); const gg = c.createLinearGradient(0, HZ, 0, H); gg.addColorStop(0, '#1b2531'); gg.addColorStop(.4, '#0f151d'); gg.addColorStop(1, '#090d13'); c.fillStyle = gg; c.fillRect(0, HZ, W, H - HZ); c.restore();
    const gn = L.noiseAlpha(W, H - HZ, { sx: .08, sy: .08, oct: 3, seed: 8, lo: .4, hi: .75, color: '#3f4f61', res: 3, max: .5 }); c.save(); c.globalAlpha = .3; c.globalCompositeOperation = 'screen'; c.drawImage(gn.canvas, 0, HZ, W, H - HZ); c.restore();
    c.save(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, HZ + 6); c.lineTo(W, HZ + 6); c.stroke(); c.strokeStyle = 'rgba(150,175,200,.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, HZ); c.lineTo(W, HZ); c.stroke(); c.restore();
    L.lightStreaks(c, win.map(w => ({ ...w, y: HZ + 8, len: 260, a: w.a * .8 })), { amp: 8, blur: 5 });
    L.lightStreaks(c, [{ x: 160, y: HZ + 8, r: 22, color: '#ffe9a8', a: .6, len: 300 }], { amp: 6 });
    // --- the big puddle (y .62–.95): mirror of the scene above, compressed & rippled ---
    const PU = L.blobPts(540, 1187, 490, 245, { n: 34, rough: .13, rnd: r });
    // underlay: puddle water tone
    c.save(); c.beginPath(); PU.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.clip(); const pw = c.createLinearGradient(0, 938, 0, 1436); pw.addColorStop(0, '#2b394b'); pw.addColorStop(1, '#101822'); c.fillStyle = pw; c.fillRect(0, 930, W, 520); c.restore();
    const sc = L.copyLayer(c); // scene + ground, mirror source
    L.reflect(c, { y0: 938, y1: 1436, src0: HZ - 10, span: HZ - 10, amp: 7, freq: .06, darken: .22, dark: '#0a1119', alpha: .98, fade: .15, op: 'source-over', blur: 1.6, step: 2, clip: PU, seed: 4 });
    // sky tint across the puddle (cool, brighter toward the near rim)
    c.save(); c.beginPath(); PU.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.clip(); const sg = c.createLinearGradient(0, 938, 0, 1436); sg.addColorStop(0, 'rgba(110,137,163,.0)'); sg.addColorStop(1, 'rgba(120,150,178,.22)'); c.fillStyle = sg; c.fillRect(0, 930, W, 520);
    // ripples
    for (let i = 0; i < 9; i++) { const rx = 20 + r() * 120, px = 120 + r() * 840, py = 1010 + r() * 380; for (let j = 0; j < 3; j++) { c.strokeStyle = `rgba(205,222,238,${.36 - j * .1})`; c.lineWidth = 1.8 - j * .4; c.beginPath(); c.ellipse(px, py, rx * (.4 + j * .3), rx * (.4 + j * .3) * .26, 0, 0, 6.3); c.stroke(); } }
    c.restore();
    // puddle edge: crisp lit far rim + dark wet near rim
    c.save(); c.beginPath(); PU.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.strokeStyle = 'rgba(8,12,18,.7)'; c.lineWidth = 6; c.stroke(); c.strokeStyle = 'rgba(190,210,230,.45)'; c.lineWidth = 1.8; c.stroke(); c.restore();
    // painterly: pigment mottling over ground (not in the puddle), light haze, rain
    L.glaze(c, ['#10171f'], (b, i, rnd) => { for (let j = 0; j < 8; j++) b.polygon(L.blobPts(rnd() * W, 660 + rnd() * 250, 200 + rnd() * 200, 40 + rnd() * 60, { n: 12, rough: .3, rnd })); }, { seed: 421, opacity: 100, bleed: .4, tex: .8, alpha: .5 });
    L.fog(c, { y0: 560, y1: 760, color: '#4d6279', a: .2, seed: 25 });
    L.rain(c, { n: 380, ang: 8, len: [60, 180], w: 1.3, alpha: .24, color: '#b8c9da', seed: 42 });
    L.rough(c, { amp: 1.8, seed: 9 });
    L.bloom(c, { blur: 22, a: .32, boost: 1.4, contrast: 1.6 });
    L.vignette(c, .45); L.grain(c, { a: .07 });
    return c;
  });

  // ---------- boot sequence ----------
  const FR = [
    { dy: -340, tilt: 7, crown: 0, ring: 0, dr: 0 },
    { dy: -205, tilt: 5, crown: 0, ring: 0, dr: 0 },
    { dy: -85, tilt: 2, crown: 0, ring: 0, dr: 0 },
    { dy: 0, tilt: 0, crown: 26, ring: 1, dr: 3 },
    { dy: 10, tilt: 0, crown: 120, ring: 2, dr: 10 },
    { dy: 16, tilt: -1, crown: 175, ring: 3, dr: 16 },
    { dy: -55, tilt: -5, crown: 88, ring: 4, dr: 11, fall: 1 },
    { dy: -190, tilt: -8, crown: 22, ring: 5, dr: 6, fall: 1 },
  ];
  const WL = 842, BX = 540;
  const BACK = [[-152, -36], [-172, -84], [-158, -150], [-122, -230], [-118, -330], [-138, -450]];
  const FRONT = [[76, -450], [64, -350], [48, -272], [74, -204], [140, -160], [214, -132], [262, -96], [278, -58], [266, -36]];
  function bootPath(c) { const back = L.smooth(BACK, false, 8), front = L.smooth(FRONT, false, 8); c.beginPath(); back.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); front.forEach(p => c.lineTo(p[0], p[1])); c.closePath(); return back.concat(front); }

  function drawCrown(c, f, r, fi, front) {
    if (!f.crown) return; const n = 26; c.save(); c.translate(BX, WL);
    for (let i = 0; i < n; i++) { const th = i / n * 6.2832, sn = Math.sin(th); if ((sn > 0) !== front) continue; const rx0 = 150 + f.crown * .35, px = Math.cos(th) * rx0 * .62, py = sn * rx0 * .62 * .17; const h = f.crown * (.45 + r() * .7) * (f.fall ? (.5 + r() * .5) : 1), lean = Math.cos(th) * (22 + f.crown * .2), w = 8 + r() * 12;
      const tip = [px + lean, py - h]; const g = c.createLinearGradient(px, py, tip[0], tip[1]); g.addColorStop(0, 'rgba(170,196,220,.55)'); g.addColorStop(.6, 'rgba(215,230,244,.7)'); g.addColorStop(1, 'rgba(240,248,255,.15)');
      c.fillStyle = g; c.beginPath(); c.moveTo(px - w, py); c.quadraticCurveTo(px - w * .5 + lean * .3, py - h * .6, tip[0], tip[1]); c.quadraticCurveTo(px + w * .5 + lean * .3, py - h * .6, px + w, py); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(px - w * .6, py - 2); c.quadraticCurveTo(px - w * .4 + lean * .3, py - h * .6, tip[0], tip[1]); c.stroke();
      if (r() < .6) { c.fillStyle = 'rgba(235,245,255,.8)'; c.beginPath(); c.arc(tip[0] + lean * .15, tip[1] - 8 - r() * 14, 2 + r() * 3, 0, 6.3); c.fill(); } }
    c.restore();
  }

  for (let fi = 0; fi < 8; fi++) {
    P.register('boot_0' + fi, { w: 1080, h: 1080, alpha: true, seed: 410 + fi, kind: 'seq' }, async (k) => {
      const f = FR[fi], c = L.layer(), r = L.rng(777 + fi * 13); const by = WL + f.dy;
      // --- water ring + back crown ---
      const ringR = [0, 90, 150, 215, 290, 360][f.ring] || 0;
      if (f.ring) { c.save(); for (let j = 0; j < 3; j++) { const rr = ringR * (1 - j * .24); c.strokeStyle = `rgba(214,230,244,${.7 - j * .2 - f.ring * .06})`; c.lineWidth = 3.4 - j; c.beginPath(); c.ellipse(BX, WL, rr, rr * .17, 0, 0, 6.3); c.stroke(); c.strokeStyle = `rgba(6,10,16,${.35 - j * .08})`; c.lineWidth = 3; c.beginPath(); c.ellipse(BX, WL + 3, rr, rr * .17, 0, 0.1, Math.PI - .1); c.stroke(); } c.restore(); }
      drawCrown(c, f, r, fi, false);
      // contact shadow in the water below the boot when above
      if (f.dy < -20) { c.save(); c.filter = `blur(${14 * c.q}px)`; c.fillStyle = `rgba(5,8,12,${.28 * (1 - Math.min(1, -f.dy / 400))})`; c.beginPath(); c.ellipse(BX + 10, WL + 6, 190, 28, 0, 0, 6.3); c.fill(); c.restore(); }
      // --- boot + coat in local space ---
      c.save(); c.translate(BX, by); c.rotate(f.tilt * Math.PI / 180);
      // sole
      c.fillStyle = '#080c11'; c.beginPath(); c.moveTo(-170, 0); c.lineTo(262, 0); c.quadraticCurveTo(292, -4, 286, -30); c.quadraticCurveTo(284, -44, 262, -42); c.lineTo(-160, -40); c.quadraticCurveTo(-176, -36, -170, 0); c.closePath(); c.fill();
      c.fillStyle = '#161d27'; c.fillRect(-160, -22, 430, 14); c.fillStyle = '#04070a'; for (let x = -150; x < 250; x += 22) c.fillRect(x, -20, 8, 11);
      c.fillStyle = 'rgba(150,176,202,.6)'; c.fillRect(-158, -42, 420, 2.4);
      // upper
      const outline = bootPath(c); let g = c.createLinearGradient(-170, 0, 240, 0); g.addColorStop(0, YDD); g.addColorStop(.08, YD); g.addColorStop(.26, YL); g.addColorStop(.4, Y); g.addColorStop(.72, YD); g.addColorStop(1, YDD); c.fillStyle = g; c.fill();
      // top rim opening (hidden by coat later) + inner sheen
      c.save(); bootPath(c); c.clip();
      const sh = c.createLinearGradient(0, -450, 0, 0); sh.addColorStop(0, 'rgba(60,35,0,.35)'); sh.addColorStop(.3, 'rgba(60,35,0,0)'); sh.addColorStop(1, 'rgba(60,35,0,.25)'); c.fillStyle = sh; c.fillRect(-200, -460, 460, 470);
      // ankle creases
      c.strokeStyle = 'rgba(110,70,8,.55)'; c.lineWidth = 3; c.lineCap = 'round'; [[-130, -186, 40, -200, 18], [-126, -216, 36, -230, 12], [-118, -250, 42, -258, 9]].forEach(([x0, y0, x1, y1, bend]) => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, y0 + bend, x1, y1 + 6); c.stroke(); });
      c.strokeStyle = 'rgba(110,70,8,.45)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(120, -118); c.quadraticCurveTo(100, -135, 70, -170); c.stroke();
      c.strokeStyle = 'rgba(110,70,8,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(100, -158); c.quadraticCurveTo(150, -90, 112, -40); c.stroke(); c.strokeStyle = 'rgba(255,240,170,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(106, -158); c.quadraticCurveTo(158, -90, 120, -42); c.stroke();
      c.fillStyle = 'rgba(100,62,6,.4)'; c.beginPath(); c.moveTo(-170, -50); c.quadraticCurveTo(-176, -130, -130, -190); c.lineTo(-124, -60); c.closePath(); c.fill();
      c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(120,80,10,.35)'; c.fillRect(-10, -460, 90, 460); c.globalCompositeOperation = 'source-over';
      // glossy reflections: long strip on the lit side + shop window glints + toe highlight
      c.globalCompositeOperation = 'screen'; c.filter = `blur(${2 * c.q}px)`; c.fillStyle = 'rgba(255,246,200,.75)'; c.beginPath(); c.moveTo(-120, -420); c.quadraticCurveTo(-118, -250, -140, -90); c.lineTo(-124, -90); c.quadraticCurveTo(-106, -250, -104, -420); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-92, -380, 14, 70); c.fillStyle = 'rgba(255,240,170,.55)'; c.fillRect(-92, -290, 14, 36); c.fillStyle = 'rgba(190,225,255,.5)'; c.fillRect(8, -400, 10, 120);
      c.beginPath(); c.ellipse(190, -118, 36, 9, -.35, 0, 6.3); c.fillStyle = 'rgba(255,252,230,.85)'; c.fill(); c.fillStyle = 'rgba(255,246,200,.5)'; c.fillRect(50, -420, 8, 150);
      c.restore();
      // rim light on edge
      c.strokeStyle = 'rgba(255,240,170,.8)'; c.lineWidth = 3; c.beginPath(); L.smooth(BACK, false, 8).forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
      c.restore();
      // coat hem (raincoat) draped over the boot shaft
      c.save(); c.translate(BX, by); c.rotate(f.tilt * .4 * Math.PI / 180);
      const hemY = -438; c.beginPath(); c.moveTo(-200, hemY + 6); for (let i = 0; i <= 12; i++) { const t = i / 12, x = -200 + t * 340; c.lineTo(x, hemY + Math.sin(t * 7 + 1) * 9 + (i % 2 ? 6 : 0)); } c.lineTo(150, -1300); c.lineTo(-170, -1300); c.closePath();
      g = c.createLinearGradient(-170, 0, 150, 0); g.addColorStop(0, YD); g.addColorStop(.2, Y); g.addColorStop(.5, '#e0aa28'); g.addColorStop(1, YDD); c.fillStyle = g; c.fill();
      c.clip(); // folds + shading going up the frame
      const cg = c.createLinearGradient(0, hemY, 0, -1000); cg.addColorStop(0, 'rgba(80,50,4,.35)'); cg.addColorStop(.12, 'rgba(80,50,4,0)'); cg.addColorStop(1, 'rgba(20,12,0,.55)'); c.fillStyle = cg; c.fillRect(-200, -1300, 400, 900);
      for (let i = 0; i < 7; i++) { const x = -150 + i * 50 + r() * 14; c.strokeStyle = i % 2 ? 'rgba(110,70,8,.4)' : 'rgba(255,236,150,.28)'; c.lineWidth = 8 + r() * 10; c.beginPath(); c.moveTo(x, hemY); c.quadraticCurveTo(x + (r() - .5) * 30, hemY - 200, x + (r() - .5) * 40 + (x < -20 ? -10 : 8), -1100); c.stroke(); }
      c.strokeStyle = 'rgba(255,248,205,.85)'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12, x = -200 + t * 340, yy = hemY + Math.sin(t * 7 + 1) * 9 + (i % 2 ? 6 : 0); i ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke();
      c.restore();
      // hem drips
      c.save(); c.translate(BX, by + (f.fall ? 0 : 0)); for (let i = 0; i < 4; i++) { const x = -120 + i * 70 + r() * 20, d = (fi >= 6 ? 40 + fi * 6 + r() * 50 : 12 + r() * 18); c.fillStyle = 'rgba(225,238,250,.8)'; c.beginPath(); c.ellipse(x, -430 + d, 2.8, 5, 0, 0, 6.3); c.fill(); if (fi >= 6) { c.strokeStyle = 'rgba(220,235,250,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, -430 + d - 30); c.lineTo(x, -430 + d - 6); c.stroke(); } } c.restore();
      // --- brush: watercolour glaze + broken ink + warm rim, all under the same transform ---
      const tr = (b) => { b.translate(BX, by); b.rotate(f.tilt); };
      L.glaze(c, [{ color: '#d6951a', op: 140 }], (b, i, rnd) => { b.push(); tr(b); b.polygon(outline); b.polygon([[-200, hemY], [140, hemY], [150, -1300], [-170, -1300]]); b.pop(); }, { seed: 441 + fi, bleed: .2, tex: .85, border: .3, alpha: .42, atop: true });
      L.paint(c, (b, rnd) => { b.push(); tr(b); L.ink(b, L.smooth(BACK, false, 6), { color: '#4a2e06', w: .9, rnd, gap: .18, wig: 1.2, chunk: [50, 160] }); L.ink(b, L.smooth(FRONT, false, 6), { color: '#4a2e06', w: .9, rnd, gap: .2, wig: 1.2, chunk: [50, 160] }); L.ink(b, [[-170, 0], [270, 0]], { color: '#000', w: .9, rnd, gap: .1, wig: 1 }); L.ink(b, [[-190, hemY - 4], [-170, -900]], { color: '#4a2e06', w: .8, rnd, gap: .3, wig: 2, chunk: [80, 260] }); L.ink(b, [[140, hemY - 4], [146, -900]], { color: '#4a2e06', w: .8, rnd, gap: .3, wig: 2, chunk: [80, 260] }); b.pop(); }, { seed: 451 + fi, mode: 'mask', color: '#3a2204', alpha: .8, gain: 1.3 });
      // --- front crown + droplets + water overlay on the submerged sole ---
      if (f.dy >= 0) { c.save(); c.beginPath(); c.rect(0, WL + 0, W0(), 400); c.restore(); const wg = c.createLinearGradient(0, WL - 10, 0, WL + 60); wg.addColorStop(0, 'rgba(120,148,176,.0)'); wg.addColorStop(.25, 'rgba(90,118,146,.7)'); wg.addColorStop(1, 'rgba(30,46,64,.5)'); c.save(); c.fillStyle = wg; c.beginPath(); c.ellipse(BX + 20, WL + 8, 255, 40, 0, 0, Math.PI); c.lineTo(BX + 275, WL - 6); c.ellipse(BX + 20, WL - 4, 255, 14, 0, 0, Math.PI, true); c.fill(); c.strokeStyle = 'rgba(235,245,255,.7)'; c.lineWidth = 2.2; c.beginPath(); c.ellipse(BX + 20, WL - 4, 252, 15, 0, 0.05, Math.PI - .05); c.stroke(); c.restore(); }
      drawCrown(c, f, r, fi, true);
      if (f.crown) L.paint(c, (b, rnd) => { b.set('charcoal', '#000', 1.5); const n = Math.round(f.crown / 5) + 6; for (let i = 0; i < n; i++) { const a = Math.PI * (1.05 + rnd() * .9), r0 = 110 + rnd() * 90, rr = r0 + 40 + f.crown * (.5 + rnd()) * (f.fall ? .5 : 1), x0 = BX + Math.cos(a) * r0, y0 = WL + Math.sin(a) * r0 * .3, x1 = BX + Math.cos(a) * rr * 1.1, yp = WL + Math.sin(a) * (f.crown * (.6 + rnd() * .9)) - 20; b.spline([[x0, y0, .6], [(x0 + x1) / 2, yp - 30, 1], [x1, f.fall ? yp + 80 : yp + 20, .2]], .7); } }, { seed: 470 + fi, mode: 'mask', color: '#dff0fb', alpha: .7, gain: 1.6 });
      // flying droplets
      for (let i = 0; i < f.dr * 2; i++) { const a = r() * 6.28, sp = f.crown * (.6 + r() * 1.5), dx = Math.cos(a) * (60 + sp * 1.1), dyy = (f.fall ? 40 + r() * 140 : -(60 + r() * sp * 1.6)), x = BX + dx, y = WL + dyy; const rr = 2 + r() * 5; c.fillStyle = 'rgba(200,222,240,.65)'; c.beginPath(); c.ellipse(x, y, rr * .8, rr * (f.fall ? 1.5 : 1), 0, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(x - rr * .25, y - rr * .3, rr * .32, 0, 6.3); c.fill(); }
      // warm bounce & shop-light bloom
      L.glow(c, BX - 120, by - 160, 220, '#ffd98a', .1, 'screen');
      L.bloom(c, { blur: 14, a: .22, boost: 1.4, contrast: 1.6 });
      L.rough(c, { amp: 1.5, seed: 11 + fi, freq: .03 }); L.grain(c, { a: .05, atop: true }); L.cleanAlpha(c);
      return c;
    });
  }
  function W0() { return 1080; }
})();
