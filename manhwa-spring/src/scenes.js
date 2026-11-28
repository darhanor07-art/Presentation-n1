/* scenes.js — the 8 scenes of «Көктемнің соңғы гүлі» (see ../SCENARIO.md).
   Scene = {id,len(VH),plate:{key,ph},tr (transition to the next scene),draw(c,p,t,s,X),windows[],items[],after()}.
   p = local progress (can overshoot 0..1 slightly inside transitions). Eye windows: on(p,t,ss) opens them (snap, flash),
   rect(p) places them; they ride the scroll `rise` times as fast as the page (1.6-2x the background). */
(function () {
  const MS = window.MS; MS.scenes = [];
  const { lerp, eo, sm, clamp } = MS.m;
  const W = () => MS.V.W, H = () => MS.V.H, U = () => MS.V.u;
  const P = Math.PI;

  /* helper: window riding the scroll. {x0,y0 at p0, dx,rise in VH per VH of scroll} */
  const ride = o => (p, X, len) => ({ cx: o.x0 + (p - o.p0) * len * (o.dx || 0), cy: o.y0 - (p - o.p0) * len * o.rise, w: o.w, ar: o.ar, rot: o.rot || 0 });
  /* helper: a persistent amber twinkle on the castle windows */
  const sparkle = (c, X, map, t, n) => MS.glints(c, X, map, n, t, { r: 30, a: .55 });
  const moonGlow = (c, x, y, r, a) => MS.glow(c, x, y, r, '214,212,255', a, 'screen');

  /* ---------- 1 · Ай ---------- */
  MS.scenes.push({
    id: 'moon', len: 3.6, tr: 'flash', plate: { key: 'moon', ph: 'hero' }, grade: { bloom: .5, leak: 1 },
    draw(c, p, t, s, X) {
      const w = W(), h = H(), u = U(); let map = null;
      const slots = [{ slot: 'sky', par: .2 }, { slot: 'castle', par: .6 }];
      if (!MS.drawSlots(c, 'moon', slots, p)) {
        // placeholder: camera glides from the moon down to the castle (sky .2 / moon .3 / towers .6 / mist .9 felt through the zoom + mist drift)
        map = MS.drawPlate(c, X.plate, { zoom: lerp(1.95, 1.4, eo(p)), fx: .66, fy: lerp(.12, .33, eo(p)), dx: (p - .5) * -20 * u });
        moonGlow(c, map.x(.68), map.y(.2), h * .42, .55);
      }
      MS.mist(c, t, s, { y: .98 - p * .1, h: .55, par: .9, vx: 12, alpha: .5 + .3 * p });
      c.save(); c.globalAlpha = .5; MS.mist(c, t, s * .6, { y: .12, h: .4, par: .3, vx: -6, alpha: .3 }); c.restore();
      if (map) sparkle(c, X, map, t, X.spots.length * .75);
      MS.petals(c, t, s, { id: 'p1', n: 34, size: 26, vx: .03, vy: .03, scroll: .6, near: .15 });
    },
    items: [
      { type: 'title', text: 'Көктемнің соңғы гүлі', a: -9, b: .13, x: .5, y: .4, w: .86, par: .5, notype: true, edge: .03 },
      { type: 'hint', text: 'төмен айналдырыңыз', a: -9, b: .09, x: .5, y: .91, w: .6, par: 0, notype: true, edge: .03 },
      { type: 'cap', text: 'Бір сәтте барлығы өзгерді…', a: .2, b: .98, x: .74, y: .17, w: .5, h: .22, par: .3 }
    ]
  });

  /* ---------- 2 · Ояну ---------- */
  MS.scenes.push({
    id: 'macro', len: 3.4, tr: 'petal', plate: { key: 'macro', ph: 'f001' },
    draw(c, p, t, s, X) {
      const u = U(), foc = sm((p - .08) / .6);
      if (!MS.drawSlots(c, 'macro', [{ slot: 'bg', par: .3, }, { slot: 'mid', par: .6 }], p)) MS.drawPlate(c, X.plate, { zoom: lerp(1.3, 1.05, eo(p)), fx: .5, fy: lerp(.55, .45, p), blur: lerp(16, 0, foc) });
      MS.mist(c, t, s, { y: .9, h: .45, par: .5, vx: 8, alpha: .35 });
      MS.petals(c, t, s, { id: 'p2', n: 22, size: 24, vy: -.02, scroll: .7 });
      // out-of-focus foreground flowers become sharp-ish as focus shifts
      MS.petals(c, t, s, { id: 'f2', n: 9, size: 90, near: 1, alpha: lerp(.9, .35, foc), scroll: 1.2, vx: .01, vy: .01 });
      c.fillStyle = 'rgba(8,10,40,' + ((1 - sm(p / .16)) * .75) + ')'; c.fillRect(0, 0, W(), H());
    },
    windows: [{
      id: 'aiaru1', ar: 2.2, push: .06, on: p => p > .2 && p < .76,
      rect: ride({ x0: .31, y0: .98, p0: .2, rise: .55, w: .56, ar: 2.2, rot: -1.5 }),
      img: p => p < .36 ? 'aiaru_closed' : p < .46 ? 'aiaru_half' : 'aiaru_open'
    }],
    items: [{ type: 'thought', text: 'Бұл… шын ба?', a: .4, b: .98, x: .7, y: .3, w: .44, h: .27, par: .22 }]
  });

  /* ---------- 3 · Алқап ---------- */
  MS.scenes.push({
    id: 'hero', len: 3.8, tr: 'mist', plate: { key: 'hero', ph: 'hero' },
    draw(c, p, t, s, X) {
      const w = W(), h = H(), u = U();
      const layered = MS.drawSlots(c, 'hero', [{ slot: 'sky', par: .12 }, { slot: 'castle', par: .3 }], p);
      if (!layered) {
        const map = MS.drawPlate(c, X.plate, { zoom: lerp(1.3, 1.08, eo(p)), fx: .56, fy: lerp(.46, .4, p), dx: (p - .5) * -26 * u });
        moonGlow(c, map.x(.68), map.y(.2), h * .3, .3); sparkle(c, X, map, t, X.spots.length * .8);
      }
      MS.mist(c, t, s, { y: .63, h: .3, par: .5, vx: 9, alpha: .4 });
      // Aiaru walks forward (scale 1 -> .85, 60 px up), cycling her 3 wind poses
      const poses = MS.charPoses('aiaru_back'), k = lerp(1, .85, sm(p));
      MS.drawChar(c, poses, s * 2.1, { x: w * .46 + Math.sin(t * 1.4) * 3 * u, y: h * 1.03 - 60 * u * sm(p), h: h * .64 * k, rot: Math.sin(t * 1.8) * .012 });
      MS.drawSlots(c, 'hero', [{ slot: 'fg', par: .7 }], p);
      MS.petals(c, t, s, { id: 'p3', n: 54, size: 28, vx: -.1, vy: -.03, scroll: .8, near: .1 });
      MS.petals(c, t, s, { id: 'f3', n: 5, size: 80, near: 1, alpha: .5, scroll: 1.3, vx: -.03 });
    },
    items: [
      { type: 'cap', text: 'Менің өмірім бөтен әлемде жалғасты.', a: .08, b: .9, x: .72, y: .13, w: .5, h: .26, par: .35 },
      { type: 'bub', text: 'Мен шынымен басқа әлемде екенмін бе?..', a: .34, b: .98, x: .3, y: .5, w: .45, h: .29, par: .5, tail: 'br' }
    ]
  });

  /* ---------- 4 · Қақпа ---------- */
  const burst = (ph, k) => p => { if (p < .16 || p > .9) return false; const f = ((p - .16) / .74 * k + ph) % 1; return f < .56; };
  MS.scenes.push({
    id: 'gate', len: 3.4, tr: 'slide', plate: { key: 'gate', ph: 'f060' },
    draw(c, p, t, s, X) {
      const u = U(), h = H(); let map = null;
      if (!MS.drawSlots(c, 'gate', [{ slot: 'bg', par: .3 }, { slot: 'wall', par: .6 }, { slot: 'mist', par: .9 }], p))
        map = MS.drawPlate(c, X.plate, { zoom: lerp(1.6, 2.2, p), fx: .5, fy: lerp(.38, .5, p), dx: (p - .5) * -30 * u });
      MS.mist(c, t, s, { y: .78, h: .5, par: .9, vx: 16, alpha: .65 }); MS.mist(c, t, s + 2, { y: .5, h: .35, par: .5, vx: -10, alpha: .35 });
      if (map) MS.glints(c, X, map, sm((p - .05) / .75) * X.spots.length, t, { r: 40, a: .85 });
      MS.petals(c, t, s, { id: 'p4', n: 26, size: 22, vx: .04, vy: .02, scroll: .6 });
    },
    windows: [
      { id: 'aiaru_up', alts: () => ['aiaru_open'], on: burst(0, 4), push: .05, rect: ride({ x0: .3, y0: 1.2, p0: .16, rise: .85, w: .56, ar: 2.1, rot: -2 }), img: () => 'aiaru_glance_up' },
      {
        id: 'tower_light', on: burst(.5, 4), rect: ride({ x0: .7, y0: 1.5, p0: .16, rise: 1.0, w: .46, ar: 1.45, rot: 2 }),
        content(c, R, p, t, X) {      // the lit tower window, cropped from the plate and pushed to amber
          const img = X.plate, sp = (X.spots.slice().sort((a, b) => b.s - a.s)[0]) || { x: .5, y: .4 }, cwid = img.width * .15, chei = cwid * R.h / R.w;
          const sx = clamp(sp.x * img.width - cwid / 2, 0, img.width - cwid), sy = clamp(sp.y * img.height - chei / 2, 0, img.height - chei);
          c.drawImage(img, sx, sy, cwid, chei, -R.w / 2, -R.h / 2, R.w, R.h);
          MS.glow(c, 0, 0, R.w * .6, '255,207,138', .55 + .2 * Math.sin(t * 9), 'lighter');
        }
      }
    ],
    items: [{ type: 'sfx', text: '· · ·', a: .55, b: .95, x: .22, y: .6, w: .3, par: .5, notype: true }]
  });

  /* ---------- 5 · Мұнара терезесі ---------- */
  MS.scenes.push({
    id: 'tower', len: 3.2, tr: 'zoom', plate: { key: 'tower', ph: 'f120' }, grade: { bloom: .45 },
    draw(c, p, t, s, X) {
      const u = U(), h = H(), w = W(); let map = null;
      if (!MS.drawSlots(c, 'tower', [{ slot: 'sky', par: .2 }, { slot: 'moon', par: .3 }, { slot: 'tower', par: .6 }, { slot: 'mist', par: .9 }], p))
        map = X.real ? MS.drawPlate(c, X.plate, { zoom: lerp(1.06, 1.22, p), fx: .5, fy: lerp(.46, .4, p) })
          : MS.drawPlate(c, X.plate, { zoom: lerp(2.5, 3.2, p), fx: .56, fy: lerp(.32, .26, p) });
      if (map) {
        if (!X.real) moonGlow(c, map.x(.63), map.y(.22), h * .4, .35);
        const top = X.spots.filter(q => q.y < .5).sort((a, b) => b.s - a.s)[0];
        if (top) {   // someone's silhouette in the tower window
          const x = map.x(top.x), y = map.y(top.y), k = map.sc / 1.6;
          MS.glow(c, x, y, 46 * u * k, '255,207,138', .85); c.save(); c.fillStyle = 'rgba(12,12,40,.92)'; c.beginPath();
          c.ellipse(x, y - 6 * u * k, 7 * u * k, 9 * u * k, 0, 0, P * 2); c.fill(); c.beginPath(); c.moveTo(x - 16 * u * k, y + 18 * u * k); c.quadraticCurveTo(x, y - 6 * u * k, x + 16 * u * k, y + 18 * u * k); c.fill(); c.restore();
        } else MS.glints(c, X, map, X.spots.length, t, { r: 40, a: .8 });
      }
      MS.mist(c, t, s, { y: .95, h: .5, par: .9, vx: 14, alpha: .55 });
      MS.petals(c, t, s, { id: 'p5', n: 16, size: 20, vx: .05, scroll: .5 });
    },
    windows: [{
      id: 'tair1', on: p => p > .3, alts: () => ['tair_narrow'], push: .04,
      rect: p => ({ cx: lerp(1.6, .5, eo((p - .3) / .42)), cy: .47, w: .96, ar: 5.2, rot: lerp(-3, -.8, eo((p - .3) / .42)) }),
      img: () => 'tair_open'
    }],
    items: [{ type: 'sfx', text: '…', a: .1, b: .62, x: .74, y: .72, w: .3, par: .45, notype: true, cls: 'big' }]
  });

  /* ---------- 6 · Кездесу ---------- */
  // rhythm: windows alternate with intervals 0.6 -> 0.3 -> 0.15 s (time-based once the beat starts), then both stay open
  const SEQ = [.6, .6, .3, .3, .3, .15, .15, .15, .15, .15, .15, .15];
  const slotIdx = (p, t, ss) => {
    if (p < .34) { ss.t0 = null; return -2; } if (p > .96) return -2;
    if (ss.t0 == null) ss.t0 = t; let e = t - ss.t0, acc = 0;
    for (let i = 0; i < SEQ.length; i++) { acc += SEQ[i]; if (e < acc) return i; } return -1;
  };
  MS.scenes.push({
    id: 'garden', len: 4.0, tr: 'split', plate: { key: 'garden', ph: 'f090' },
    draw(c, p, t, s, X) {
      const u = U(), w = W(), h = H(); let map = null;
      if (!MS.drawSlots(c, 'garden', [{ slot: 'bg', par: .3 }, { slot: 'flowers', par: .8 }], p))
        map = MS.drawPlate(c, X.plate, { zoom: lerp(1.7, 1.55, p), fx: .5, fy: .7, dx: lerp(30, -30, p) * u });
      moonGlow(c, w * .5 + lerp(10, -10, p) * u, h * .28, h * .45, .55);   // moon contre-jour
      MS.mist(c, t, s, { y: .78, h: .4, par: .5, vx: 8, alpha: .3 });
      const poses = MS.charPoses('tair'), k = lerp(.9, 1.1, sm(p));
      MS.drawChar(c, poses, p * 2.2, { x: w * .58 + lerp(-14, 14, p) * u, y: h * 1.04, h: h * .7 * k, rot: Math.sin(t * 1.3) * .006, bright: .5 });
      MS.petals(c, t, s, { id: 'p6', n: 52, size: 26, vx: .08, vy: -.02, scroll: .9, near: .12 });
      MS.petals(c, t, s, { id: 'f6', n: 7, size: 90, near: 1, alpha: .55, scroll: 1.5, vx: .03 });
    },
    windows: [
      { id: 'aiaru_wide', on: (p, t, ss) => { const i = slotIdx(p, t, ss); return i === -1 || (i >= 0 && i % 2 === 0); }, push: .05, img: () => 'aiaru_wide', rect: ride({ x0: .34, y0: .3, p0: .4, rise: .1, w: .62, ar: 1.9, rot: -2 }) },
      { id: 'tair_narrow', on: (p, t, ss) => { const i = slotIdx(p, t, ss); return i === -1 || (i >= 0 && i % 2 === 1); }, push: .05, img: () => 'tair_narrow', alts: () => ['tair_open'], rect: ride({ x0: .66, y0: .62, p0: .4, rise: .1, w: .64, ar: 2.2, rot: 2 }) }
    ],
    items: [
      { type: 'bub', text: '…Сен кімсің?', a: .08, b: .66, x: .3, y: .2, w: .4, h: .24, par: .45, tail: 'br' },
      { type: 'shock', text: '!?', a: .46, b: .94, x: .14, y: .5, w: .2, h: .17, par: .35, notype: true }
    ]
  });

  /* ---------- 7 · Көз ---------- */
  MS.scenes.push({
    id: 'eyes', len: 3.4, tr: 'flash2', plate: { key: 'eyes', ph: 'f060' }, grade: { bloom: .55, leak: 1.2 },
    draw(c, p, t, s, X) {
      const u = U(), w = W(), h = H();
      MS.drawPlate(c, X.plate, { zoom: 1.5, fx: .5, fy: .45, blur: 22, bright: .55 });
      c.fillStyle = 'rgba(30,32,90,.45)'; c.fillRect(0, 0, w, h);
      // light shafts
      c.save(); c.globalCompositeOperation = 'screen'; for (let i = 0; i < 4; i++) { const g = c.createLinearGradient(w * (.1 + i * .25), 0, w * (.4 + i * .25), h); g.addColorStop(0, 'rgba(206,204,255,.0)'); g.addColorStop(.4, 'rgba(206,204,255,' + (.12 + .05 * Math.sin(t + i)) + ')'); g.addColorStop(1, 'rgba(206,204,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); } c.restore();
      MS.petals(c, t, s, { id: 'p7', n: 30, size: 22, vx: .02, scroll: .4 });
    },
    after(c, p, t, s, X) {          // flare where the two windows touch
      const k = sm((p - .6) / .1), u = U(), w = W(), h = H(); if (k <= 0) return;
      const pul = .7 + .3 * Math.sin(t * 8) * Math.sin(t * 3.3);
      MS.glow(c, w / 2, h / 2, w * .75, '236,233,255', .6 * k * pul, 'lighter');
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,255,255,' + (.8 * k) + ')'; c.fillRect(w * .03, h / 2 - 1.5 * u, w * .94, 3 * u); c.restore();
    },
    windows: [
      {
        id: 'aiaru_top', on: p => p > .06, alts: () => ['aiaru_open'], img: (p) => 'aiaru_pupil_' + pupil(p),
        rect: p => { const e = sm((p - .1) / .5); return { cx: .5, cy: lerp(-.12, .5 - .5 * (.94 * W() / 1.9) / H(), e), w: .94, ar: 1.9, rot: lerp(-2, 0, e) }; }
      },
      {
        id: 'tair_bottom', on: p => p > .06, alts: () => ['tair_open'], img: (p) => 'tair_pupil_' + pupil(p),
        rect: p => { const e = sm((p - .1) / .5); return { cx: .5, cy: lerp(1.12, .5 + .5 * (.94 * W() / 1.9) / H(), e), w: .94, ar: 1.9, rot: lerp(2, 0, e) }; }
      }
    ],
    items: [{ type: 'bub', text: 'Сен… шын мәнінде кімсің?', a: .5, b: .98, x: .7, y: .5, w: .44, h: .27, par: 0, tail: 'bl', edge: .06 }]
  });
  function pupil(p) { const k = p < .22 ? 0 : .5 + .5 * Math.sin((p - .22) * 15 - P / 2); return Math.round(k * 5); }   // scroll-linked contract / dilate (0..5)

  /* ---------- 8 · Финал ---------- */
  MS.scenes.push({
    id: 'wide', len: 4.2, plate: { key: 'wide', ph: 'wide' }, grade: { bloom: .5, leak: 1 },
    draw(c, p, t, s, X) {
      const u = U(), w = W(), h = H(); let map = null;
      if (!MS.drawSlots(c, 'wide', [{ slot: 'sky', par: .2 }, { slot: 'castle', par: .4 }, { slot: 'flowers', par: .8 }], p))
        map = MS.drawPlate(c, X.plate, { mode: 'width', zoom: lerp(2.3, 1.75, eo(p)), fx: .5, fy: .45 });
      if (map) { moonGlow(c, map.x(.5), map.y(.18), h * .35, .3); sparkle(c, X, map, t, X.spots.length * .9); }
      MS.mist(c, t, s, { y: .66, h: .3, par: .5, vx: 10, alpha: .45 });
      const k = sm((p - .12) / .55);
      MS.petals(c, t, s, { id: 'p8', n: 96, size: 28, vx: .03, vy: -.02, scroll: .5, swirl: { cx: .5, cy: .52, k }, near: .1 });
      // light that remains when the eye closes
      const L = sm((p - .62) / .22);
      if (L > 0) MS.glow(c, w / 2, h * .36, lerp(.15, 1.1, L) * h, '255,252,246', .95 * (1 - .45 * sm((p - .86) / .14)), 'lighter');
    },
    windows: [{
      id: 'aiaru_close', on: p => p > .1, o: p => 1 - sm((p - .5) / .17), push: .03,
      img: p => p < .44 ? 'aiaru_open' : p < .52 ? 'aiaru_half' : 'aiaru_closed',
      rect: p => ({ cx: .5, cy: .36, w: .88, ar: 2.2, rot: -1 })
    }],
    after(c, p, t, s, X) {          // the closing window turns into a line of light
      const u = U(), w = W(), h = H(), line = sm((p - .55) / .1) * (1 - sm((p - .78) / .12)); if (line <= 0) return;
      c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(w * .06, 0, w * .94, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,' + line + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(w * .06, h * .36 - 2.5 * u, w * .88, 5 * u); c.restore();
    },
    items: [
      { type: 'thought', text: 'Бұл тек арман емес… дұрыс па?', a: .2, b: .9, x: .3, y: .7, w: .46, h: .29, par: .4 },
      { type: 'end', text: 'Жалғасы бар…', a: .76, b: 9, x: .66, y: .91, w: .6, par: 0, edge: .03 }
    ]
  });
})();
