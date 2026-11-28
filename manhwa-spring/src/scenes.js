/* scenes.js — the 10 pages of «Көктемнің соңғы гүлі» (see ../SCENARIO.md, 2-нұсқа).
   Scene = {id,len(VH),plate:{key,ph,alt},tr (gradient transition to the next page),draw(c,p,t,s,X),windows[],items[],after()}.
   p = local progress (can overshoot 0..1 slightly inside transitions). Everything is a pure function of (p,t,s): deterministic.
   EYE RULE: an eye window exists exactly three times: page 2 (Aiaru), page 6 (Tair), page 9 (the pair). All other
   «reel» inserts snap open with a white flash, ride the scroll ~1.6-1.7x faster than the page, and show NON-eye crops. */
(function () {
  const MS = window.MS; MS.scenes = [];
  const { lerp, eo, sm, clamp } = MS.m;
  const W = () => MS.V.W, H = () => MS.V.H, U = () => MS.V.u;
  const P = Math.PI;

  /* helper: window riding the scroll (used by the two eye windows). {x0,y0 at p0, dx,rise in VH per VH of scroll} */
  const ride = o => (p, X, len) => ({ cx: o.x0 + (p - o.p0) * len * (o.dx || 0), cy: o.y0 - (p - o.p0) * len * o.rise, w: o.w, ar: o.ar, rot: o.rot || 0 });
  /* helper: repeated reel bursts. n bursts between p0..p1; each is on for `duty` (from phase `ph`) of its period, appears at xs/ys[n],
     and rises `rise` x faster than the scroll. Returns {on, rect} to spread into a window definition. */
  const reel = o => {
    const st = p => { const q = clamp((p - o.p0) / (o.p1 - o.p0)), n = Math.min(o.n - 1, Math.floor(q * o.n)); return { n, fr: q * o.n - n }; };
    return {
      on: p => { if (p < o.p0 || p >= o.p1) return false; const s = st(p), f = s.fr - (o.ph || 0); return f >= 0 && f < o.duty; },
      rect: (p, X, len) => { const s = st(p), per = (o.p1 - o.p0) / o.n * len, f = Math.max(0, s.fr - (o.ph || 0)), k = s.n + (o.off || 0); return { cx: o.xs[k % o.xs.length], cy: o.ys[k % o.ys.length] - f * per * o.rise, w: o.w, ar: o.ar, rot: o.rots ? o.rots[k % o.rots.length] : 0 }; }
    };
  };
  const sparkle = (c, X, map, t, n) => MS.glints(c, X, map, n, t, { r: 30, a: .55 });
  const moonGlow = (c, x, y, r, a) => MS.glow(c, x, y, r, '214,212,255', a, 'screen');
  /* crop (cx,cy centre, fw width, all 0..1 of the image) cover-drawn into window rect R (c is translated to the window centre) */
  const crop = (c, img, cx, cy, fw, R) => {
    const sw = img.width * fw, sh = Math.min(img.height, sw * R.h / R.w), sw2 = sh * R.w / R.h;
    const sx = clamp(cx * img.width - sw2 / 2, 0, img.width - sw2), sy = clamp(cy * img.height - sh / 2, 0, img.height - sh);
    c.drawImage(img, sx, sy, sw2, sh, -R.w / 2, -R.h / 2, R.w, R.h);
  };
  const phTag = (c, X, name) => {      // missing new plate: palette gradient + label over the fallback image
    if (X.real) return; const w = W(), h = H(), u = U();
    c.save(); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(75,76,154,.35)'); g.addColorStop(1, 'rgba(38,42,102,.6)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.font = '500 ' + (17 * u) + 'px monospace'; c.textAlign = 'center'; c.fillStyle = 'rgba(236,233,255,.85)'; c.fillText('placeholder · ' + name, w / 2, h * .03); c.restore();
  };
  /* blurred dark shoulder + hair for the over-the-shoulder pages when the real plate is missing */
  const phShoulder = (c, p, t, side) => {
    const w = W(), h = H(), u = U(), x = side < 0 ? 0 : w, sg = side < 0 ? 1 : -1;
    c.save(); MS.filt(c, 'blur(' + (10 * u) + 'px)');
    const g = c.createLinearGradient(0, h * .7, 0, h); g.addColorStop(0, 'rgba(14,14,50,.85)'); g.addColorStop(1, 'rgba(6,6,28,.98)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, h * .62); c.bezierCurveTo(x + sg * w * .2, h * .62 + Math.sin(t) * 4 * u, x + sg * w * .55, h * .78, x + sg * w * .62, h); c.lineTo(x, h); c.fill();
    c.fillStyle = 'rgba(214,210,250,.55)'; c.beginPath(); c.moveTo(x, h * .86); c.bezierCurveTo(x + sg * w * .15, h * .8, x + sg * w * .4, h * .88, x + sg * w * .45, h); c.lineTo(x, h); c.fill();
    c.restore(); MS.filt(c, 'none');
  };

  /* ---------- 1 · Хук — «Ал егер…?» ---------- */
  MS.scenes.push({
    id: 'moon', len: 4.2, tr: 'moonburst', plate: { key: 'moon', ph: 'hero' }, grade: { bloom: .5, leak: 1 },
    draw(c, p, t, s, X) {
      const w = W(), h = H(), u = U(); let map = null;
      const slots = [{ slot: 'sky', par: .2 }, { slot: 'castle', par: .6 }];
      if (!MS.drawSlots(c, 'moon', slots, p)) {
        map = MS.drawPlate(c, X.plate, { zoom: lerp(1.95, 1.4, eo(p)), fx: .66, fy: lerp(.12, .33, eo(p)), dx: (p - .5) * -20 * u });
        moonGlow(c, map.x(.68), map.y(.2), h * .42, .55);
      }
      MS.mist(c, t, s, { y: .98 - p * .1, h: .55, par: .9, vx: 12, alpha: .5 + .3 * p });
      c.save(); c.globalAlpha = .5; MS.mist(c, t, s * .6, { y: .12, h: .4, par: .3, vx: -6, alpha: .3 }); c.restore();
      if (map) sparkle(c, X, map, t, X.spots.length * .75);
      MS.petals(c, t, s, { id: 'p1', n: 34, size: 26, vx: .03, vy: .03, scroll: .6, near: .15 });
    },
    items: [
      { type: 'title', text: 'Көктемнің соңғы гүлі', a: -.1, b: .17, x: .5, y: .42, w: .9, par: 0, edge: .03 },
      { type: 'hint', text: 'төмен айналдырыңыз', a: -.1, b: .1, x: .5, y: .91, w: .6, par: 0, edge: .03 },
      { type: 'cap', text: 'Бұл әлемде гүлдер өздігінен өспейді.', a: .2, b: .98, x: .5, y: .1, w: .8, h: .125, par: 0 },
      { type: 'cap', text: 'Әр гүл — үйіне қайта алмаған біреу.', a: .38, b: .98, x: .5, y: .235, w: .8, h: .125, par: 0 },
      { type: 'cap', cls: 'hook3', text: 'Ал егер келесі гүл — сен болсаң ше?', a: .56, b: .98, x: .5, y: .5, w: .92, par: 0, stg: .05 }
    ]
  });

  /* ---------- 2 · Ояну — «Гүлдер?..» ---------- */
  MS.scenes.push({
    id: 'macro', len: 3.4, tr: 'diag', plate: { key: 'macro', ph: 'f001' },
    draw(c, p, t, s, X) {
      const u = U(), foc = sm((p - .08) / .6);
      if (!MS.drawSlots(c, 'macro', [{ slot: 'bg', par: .3, }, { slot: 'mid', par: .6 }], p)) MS.drawPlate(c, X.plate, { zoom: lerp(1.3, 1.05, eo(p)), fx: .5, fy: lerp(.55, .45, p), blur: lerp(16, 0, foc) });
      MS.mist(c, t, s, { y: .9, h: .45, par: .5, vx: 8, alpha: .35 });
      MS.petals(c, t, s, { id: 'p2', n: 22, size: 24, vy: -.02, scroll: .7 });
      MS.petals(c, t, s, { id: 'f2', n: 9, size: 90, near: 1, alpha: lerp(.9, .35, foc), scroll: 1.2, vx: .01, vy: .01 });   // bokeh flowers sharpen as focus pulls
      c.fillStyle = 'rgba(8,10,40,' + ((1 - sm(p / .16)) * .75) + ')'; c.fillRect(0, 0, W(), H());
    },
    windows: [{      // EYE 1/3 — Aiaru, closed -> half -> open
      id: 'aiaru1', ar: 2.2, push: .06, on: p => p > .2 && p < .7,
      rect: ride({ x0: .27, y0: .98, p0: .2, rise: .42, w: .56, ar: 2.2, rot: -1.5 }),
      img: p => p < .34 ? 'aiaru_closed' : p < .44 ? 'aiaru_half' : 'aiaru_open'
    }],
    items: [
      { type: 'thought', text: '…Гүлдер? Мен кітапханада отыр едім ғой.', lines: ['…Гүлдер?', 'Мен кітапханада', 'отыр едім ғой.'], a: .44, b: .98, x: .68, y: .2, w: .5, h: .3, par: .15 },
      { type: 'thought', text: 'Кітапхана… қай кітапхана?', lines: ['Кітапхана…', 'қай кітапхана?'], a: .68, b: .98, x: .7, y: .5, w: .44, h: .26, par: .15 }
    ]
  });

  /* ---------- 3 · Аяқ басу — CAM_FEET, frame sequence scrubbed by scroll ---------- */
  const feetPos = p => { const N = Math.max(1, MS.findReal('seq', 'feet').length || 12), q = clamp((p - .08) / .84), pos = q * 2 * N, g = Math.min(2 * N - 1, Math.floor(pos)); return { q, N, g, a: g % N, b: g + 1 < 2 * N ? (g + 1) % N : g % N, f: pos - g }; };
  MS.scenes.push({
    id: 'feet', len: 4.2, tr: 'blinds', plate: { key: 'feet', ph: 'f001', alt: 'garden', nolist: true },
    draw(c, p, t, s, X) {
      const w = W(), h = H(), u = U(), fp = feetPos(p), fr = MS.findReal('seq', 'feet');
      if (fr.length >= 2) {      // 12-frame step cycle, clamped index + cross-fade, two full steps over the page
        const z = lerp(1.04, 1.16, eo(p));
        c.save(); MS.coverInto(c, fr[Math.min(fp.a, fr.length - 1)], 0, 0, w, h, z, 0, 0); c.globalAlpha = sm(fp.f); MS.coverInto(c, fr[Math.min(fp.b, fr.length - 1)], 0, 0, w, h, z, 0, 0); c.restore();
      } else {
        const bob = Math.abs(Math.sin(fp.q * 4 * P)) * 16 * u, sw = Math.sin(fp.q * 4 * P);
        MS.drawPlate(c, X.plate, { zoom: lerp(1.7, 2.1, p), fx: .5, fy: lerp(.76, .6, p), dy: bob });
        c.save(); c.fillStyle = 'rgba(244,241,255,.92)'; c.beginPath(); c.moveTo(w * .12, h); c.quadraticCurveTo(w * .22, h * (.8 + sw * .01) - bob, w * .5, h * .78 - bob); c.quadraticCurveTo(w * .78, h * (.8 - sw * .01) - bob, w * .88, h); c.fill();
        c.fillStyle = '#d6cdea'; c.beginPath(); c.ellipse(w * .4, h * (.9 - Math.max(0, sw) * .05), 22 * u, 52 * u, 0, 0, P * 2); c.ellipse(w * .6, h * (.9 - Math.max(0, -sw) * .05), 22 * u, 52 * u, 0, 0, P * 2); c.fill(); c.restore();
        phTag(c, X, 'seq feet_00..11 (frame ' + fp.a + ')');
      }
      MS.mist(c, t, s, { y: .86, h: .4, par: .8, vx: 14, alpha: .35 });
      MS.petals(c, t, s, { id: 'p3', n: 40, size: 26, vx: .05, vy: -.02, scroll: .9, near: .12 });
      MS.petals(c, t, s, { id: 'f3', n: 5, size: 80, near: 1, alpha: .45, scroll: 1.4, vx: .02 });
    },
    windows: [Object.assign({
      id: 'foot_crop',
      content(c, R, p, t, X) {      // close crop of ANOTHER step phase, zoomed on the planted foot
        const fp = feetPos(p), fr = MS.findReal('seq', 'feet');
        if (fr.length >= 2) crop(c, fr[(fp.a + Math.floor(fp.N / 2)) % fr.length], .5, .8, .42 - .04 * fp.f, R);
        else { crop(c, X.plate, .5, .78, .3, R); c.fillStyle = 'rgba(244,241,255,.85)'; c.beginPath(); c.ellipse(0, R.h * .22, R.w * .2, R.h * .11, 0, 0, P * 2); c.fill(); }
        MS.glow(c, 0, R.h * .3, R.w * .6, '169,166,232', .25, 'screen');
      }
    }, reel({ n: 4, p0: .1, p1: .9, duty: .5, xs: [.3, .7], ys: [.9, .84], w: .4, ar: 1.5, rise: 1.7, rots: [-2, 2] }))],
    items: [
      { type: 'sfx', text: 'сыбыр… сыбыр…', a: .2, b: .56, x: .5, y: .1, w: .6, par: 0 },
      { type: 'bub', text: 'Гүлдер… менің артымнан бұрылып жатыр ма?', lines: ['Гүлдер… менің', 'артымнан бұрылып', 'жатыр ма?'], a: .5, b: .98, x: .3, y: .2, w: .5, h: .3, par: .15, tail: 'br' }
    ]
  });

  /* ---------- 4 · Иық артынан — «Жалғыз жарық» ---------- */
  MS.scenes.push({
    id: 'ots_castle', len: 3.6, tr: 'conic', plate: { key: 'ots_castle', ph: 'hero', alt: 'moon' },
    draw(c, p, t, s, X) {
      const u = U(), h = H(), w = W();
      const map = MS.drawPlate(c, X.plate, { zoom: lerp(1.08, 1.3, eo(p)), fx: .5, fy: X.real ? lerp(.6, .42, eo(p)) : lerp(.8, .62, eo(p)), dx: (p - .5) * -24 * u });
      if (!X.real) phShoulder(c, p, t, -1);
      sparkle(c, X, map, t, X.spots.length * sm((p + .1) / .6));
      MS.mist(c, t, s, { y: .84, h: .4, par: .6, vx: 10, alpha: .4 });
      MS.petals(c, t, s, { id: 'p4', n: 30, size: 24, vx: .05, vy: .01, scroll: .7, near: .16 });
      phTag(c, X, 'plate_ots_castle');
    },
    windows: [Object.assign({
      id: 'ribbon',
      content(c, R, p, t, X) {       // fluttering blue ribbon: crop of aiaru_back_1 around the bow
        const g = c.createLinearGradient(0, -R.h / 2, 0, R.h / 2); g.addColorStop(0, '#4B4C9A'); g.addColorStop(1, '#262A66'); c.fillStyle = g; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h);
        MS.glow(c, R.w * .15, -R.h * .1, R.w * .6, '169,166,232', .4, 'screen');
        const img = MS.real('aiaru_back_1'); c.save(); c.rotate(Math.sin(t * 4.2) * .05); c.scale(1.04, 1.04);
        if (img) crop(c, img, .6, .24, .3, R);
        else { c.strokeStyle = '#6F8CFF'; c.lineWidth = 12 * U(); c.lineCap = 'round'; c.beginPath(); c.moveTo(-R.w * .3, -R.h * .2); c.bezierCurveTo(-R.w * .05, -R.h * .5 + Math.sin(t * 5) * 14, R.w * .1, R.h * .3, R.w * .35, R.h * .1 + Math.sin(t * 6) * 16); c.stroke(); }
        c.restore();
      }
    }, reel({ n: 3, p0: .2, p1: .92, duty: .46, xs: [.3, .72, .3], ys: [.76, .72, .76], w: .46, ar: 1.3, rise: 1.6, rots: [-2, 2, -1.5] }))],
    items: [
      { type: 'cap', text: 'Бүкіл алқапта жалғыз жарық — сол сарайда.', a: .1, b: .98, x: .5, y: .095, w: .82, h: .15, par: .15 },
      { type: 'bub', text: 'Біреу бар ма?! Мен адасып қалдым!', lines: ['Біреу бар ма?!', 'Мен адасып қалдым!'], a: .5, b: .98, x: .66, y: .66, w: .52, h: .26, par: .12, tail: 'bl' }
    ]
  });

  /* ---------- 5 · Қақпа — «Тоқта.» ---------- */
  const siteSpot = X => X.spots.slice().sort((a, b) => b.s - a.s)[0] || { x: .5, y: .4 };
  MS.scenes.push({
    id: 'gate', len: 3.6, tr: 'slideup', plate: { key: 'gate', ph: 'f060' },
    draw(c, p, t, s, X) {
      const u = U(), h = H(), w = W(); let map = null;
      if (!MS.drawSlots(c, 'gate', [{ slot: 'bg', par: .3 }, { slot: 'wall', par: .6 }, { slot: 'mist', par: .9 }], p))
        map = MS.drawPlate(c, X.plate, { zoom: lerp(1.05, 1.55, eo(p)), fx: .5, fy: lerp(.46, .6, eo(p)), dx: (p - .5) * -30 * u });
      const lit = sm((p - .05) / .7);
      if (map) { c.fillStyle = 'rgba(14,15,52,' + (.32 * (1 - lit)) + ')'; c.fillRect(0, 0, w, h); MS.glints(c, X, map, lit * X.spots.length, t, { r: 24, a: .8 }); }   // windows light up one by one with the scroll
      MS.mist(c, t, s, { y: .86, h: .45, par: .9, vx: 16, alpha: .55 });
      // Aiaru, small silhouette walking toward the gate
      const poses = MS.charPoses('aiaru_back'), k = lerp(1, .6, sm(p));
      MS.drawChar(c, poses, s * 2.1, { x: w * .5 + Math.sin(t * 1.4) * 2 * u, y: h * lerp(1.02, .9, sm(p)), h: h * .3 * k, bright: .32, glow: 0, alpha: .95 });
      MS.petals(c, t, s, { id: 'p5', n: 26, size: 22, vx: .04, vy: .02, scroll: .6 });
    },
    windows: [
      Object.assign({
        id: 'gate_hand',
        content(c, R, p, t, X) {      // cold iron gate crop (the hand touching it)
          crop(c, X.plate, .5, .68, .26, R); c.fillStyle = 'rgba(38,42,102,.35)'; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h);
          c.save(); for (let i = -4; i <= 4; i++) { const x = i * R.w * .13; c.fillStyle = 'rgba(8,10,40,.78)'; c.fillRect(x - 3 * U(), -R.h / 2, 6 * U(), R.h); c.fillStyle = 'rgba(169,166,232,.55)'; c.fillRect(x - 3 * U(), -R.h / 2, 1.5 * U(), R.h); } c.restore();
          const k = sm(Math.sin(t * 2.2) * .5 + .5); c.fillStyle = 'rgba(236,233,255,' + (.18 + .1 * k) + ')'; c.beginPath(); c.ellipse(R.w * .12, R.h * .1, R.w * .09, R.h * .13, -.5, 0, P * 2); c.fill();
          MS.glow(c, R.w * .12, R.h * .1, R.w * .35, '143,163,255', .3, 'screen');
        }
      }, reel({ n: 3, p0: .12, p1: .92, duty: .46, xs: [.28, .7, .3], ys: [.82, .84, .8], w: .42, ar: 1.4, rise: 1.65, rots: [-2, 2, -1.5] })),
      Object.assign({
        id: 'tower_light',
        content(c, R, p, t, X) {      // a lit castle window, cropped from the plate and pushed to amber
          const sp = siteSpot(X); crop(c, X.plate, sp.x, sp.y, .15, R); MS.glow(c, 0, 0, R.w * .6, '255,207,138', .55 + .2 * Math.sin(t * 9), 'lighter');
        }
      }, reel({ n: 3, p0: .12, p1: .92, ph: .5, duty: .45, xs: [.7, .3, .72], ys: [.8, .82, .78], w: .4, ar: 1.4, rise: 1.65, rots: [2, -2, 2] }))
    ],
    items: [
      { type: 'bub', cls: 'voice', text: 'Тоқта. Гүлдерді баспа.', lines: ['Тоқта.', 'Гүлдерді баспа.'], a: .4, b: .98, x: .5, y: .12, w: .56, h: .2, par: .1, tail: 'none' },
      { type: 'bub', text: '…Неге?', a: .64, b: .98, x: .3, y: .56, w: .3, h: .16, par: .1, tail: 'br' }
    ]
  });

  /* ---------- 6 · Мұнара — шындық ---------- */
  MS.scenes.push({
    id: 'tower', len: 3.4, tr: 'iris', plate: { key: 'tower', ph: 'f120' }, grade: { bloom: .45 },
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
      MS.petals(c, t, s, { id: 'p6', n: 16, size: 20, vx: .05, scroll: .5 });
    },
    windows: [{      // EYE 2/3 — Tair, narrow long window slicing across the screen
      id: 'tair1', on: p => p > .2, alts: () => ['tair_narrow'], push: .04,
      rect: p => ({ cx: lerp(1.6, .5, eo((p - .2) / .3)), cy: .5, w: .96, ar: 5.2, rot: lerp(-3, -.8, eo((p - .2) / .3)) }),
      img: () => 'tair_open'
    }],
    items: [
      { type: 'bub', text: 'Сен басып келген әр гүл бір кезде сен сияқты адасқан адам еді.', lines: ['Сен басып келген әр гүл', 'бір кезде сен сияқты', 'адасқан адам еді.'], a: .3, b: .98, x: .5, y: .2, w: .8, h: .3, par: .1, tail: 'br' },
      { type: 'bub', text: 'Онда мен де…?', a: .52, b: .98, x: .3, y: .68, w: .38, h: .17, par: .1, tail: 'br' },
      { type: 'bub', text: 'Ай батқанша үлгермесең — иә.', lines: ['Ай батқанша', 'үлгермесең — иә.'], a: .7, b: .98, x: .68, y: .83, w: .5, h: .2, par: .1, tail: 'bl' }
    ]
  });

  /* ---------- 7 · Кездесу (иық артынан) — «Сен кімсің?» ---------- */
  MS.scenes.push({
    id: 'ots_tair', len: 4.0, tr: 'meshmist', plate: { key: 'ots_tair', ph: 'f090', alt: 'garden' },
    draw(c, p, t, s, X) {
      const u = U(), w = W(), h = H();
      MS.drawPlate(c, X.plate, { zoom: lerp(1.1, 1.3, eo(p)), fx: .5, fy: lerp(.62, .5, p), dx: lerp(20, -20, p) * u });
      moonGlow(c, w * .5 + lerp(10, -10, p) * u, h * .24, h * .4, .45);      // contre-jour moon
      if (!X.real) phShoulder(c, p, t, 1);
      MS.mist(c, t, s, { y: .78, h: .4, par: .5, vx: 8, alpha: .3 });
      MS.petals(c, t, s, { id: 'p7', n: 48, size: 26, vx: .08, vy: -.02, scroll: .9, near: .14 });
      MS.petals(c, t, s, { id: 'f7', n: 6, size: 90, near: 1, alpha: .5, scroll: 1.5, vx: .03 });
      phTag(c, X, 'plate_ots_tair');
    },
    items: [
      { type: 'bub', text: 'Сен кімсің? Неге маған көмектесесің?', lines: ['Сен кімсің?', 'Неге маған', 'көмектесесің?'], a: .1, b: .98, x: .3, y: .2, w: .46, h: .3, par: .12, tail: 'br' },
      { type: 'bub', text: 'Мен — өткен көктемнің соңғы гүлімін.', lines: ['Мен — өткен', 'көктемнің соңғы', 'гүлімін.'], a: .38, b: .98, x: .7, y: .42, w: .46, h: .3, par: .12, tail: 'bl' },
      { type: 'cap', text: 'Ол мұны күлмей айтты.', a: .64, b: .98, x: .5, y: .9, w: .66, h: .1, par: .08 }
    ]
  });

  /* ---------- 8 · Сарайдың іші — айна-есік ---------- */
  MS.scenes.push({
    id: 'hall', len: 4.2, tr: 'doors', plate: { key: 'hall', ph: 'f120', alt: 'tower' }, grade: { bloom: .5 },
    draw(c, p, t, s, X) {
      const u = U(), w = W(), h = H(), back = MS.real('hall_back'), fg = MS.real('hall_fg');
      if (back) {      // camera walks down the hall: pillars (fg) fast, mirror-door (back) slow
        MS.coverInto(c, back, 0, 0, w, h, lerp(1.04, 1.28, eo(p)), 0, 0);
        if (fg) MS.coverInto(c, fg, 0, 0, w, h, lerp(1.08, 1.9, p * p * .5 + p * .5), 0, 0);
      } else {
        const map = MS.drawPlate(c, X.plate, { zoom: lerp(1.05, 1.5, eo(p)), fx: .5, fy: lerp(.55, .45, p) });
        if (!X.real) { c.fillStyle = 'rgba(38,42,102,.35)'; c.fillRect(0, 0, w, h); }
        MS.glints(c, X, map, X.spots.length * .8, t, { r: 24, a: .55 });
      }
      c.save(); c.globalCompositeOperation = 'screen';      // moonlight columns
      for (let i = 0; i < 3; i++) { const x = w * (.18 + i * .32) - p * 60 * u * (i + 1), g = c.createLinearGradient(x, 0, x + w * .18, h); g.addColorStop(0, 'rgba(206,204,255,0)'); g.addColorStop(.35, 'rgba(206,204,255,.13)'); g.addColorStop(1, 'rgba(206,204,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + w * .2, 0); c.lineTo(x + w * .2 + w * .12, h); c.lineTo(x + w * .12, h); c.fill(); }
      c.restore();
      MS.mist(c, t, s, { y: .9, h: .35, par: .8, vx: 8, alpha: .35 });
      MS.petals(c, t, s, { id: 'p8', n: 26, size: 22, vx: .02, vy: .02, scroll: .8 });
      phTag(c, X, 'plate_hall / hall_back / hall_fg');
    },
    windows: [Object.assign({
      id: 'candle',
      content(c, R, p, t, X) {      // candle flame
        const sp = siteSpot(X); crop(c, X.plate, sp.x, sp.y, .12, R); c.fillStyle = 'rgba(10,10,40,.6)'; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h);
        const fl = 1 + .08 * Math.sin(t * 13) + .05 * Math.sin(t * 23), sw = Math.sin(t * 7) * R.w * .012;
        MS.glow(c, sw, -R.h * .08, R.w * .55, '255,207,138', .7 + .1 * Math.sin(t * 11), 'lighter');
        c.fillStyle = '#e9e3f6'; c.fillRect(-R.w * .05, R.h * .14, R.w * .1, R.h * .4);
        c.save(); c.translate(sw, 0); c.beginPath(); c.moveTo(0, -R.h * .3 * fl); c.bezierCurveTo(R.w * .1, -R.h * .08, R.w * .08, R.h * .12, 0, R.h * .15); c.bezierCurveTo(-R.w * .08, R.h * .12, -R.w * .1, -R.h * .08, 0, -R.h * .3 * fl);
        const g = c.createRadialGradient(0, R.h * .08, 0, 0, R.h * .02, R.h * .24); g.addColorStop(0, '#fff7e4'); g.addColorStop(.5, '#FFCF8A'); g.addColorStop(1, 'rgba(255,170,90,.85)'); c.fillStyle = g; c.fill(); c.restore();
      }
    }, reel({ n: 3, p0: .2, p1: .92, duty: .46, xs: [.74, .26, .72], ys: [.78, .76, .8], w: .34, ar: .9, rise: 1.65, rots: [2, -2, 1.5] }))],
    items: [
      { type: 'bub', text: 'Бұл есік сені үйге қайтарады.', lines: ['Бұл есік сені', 'үйге қайтарады.'], a: .12, b: .98, x: .32, y: .17, w: .48, h: .24, par: .12, tail: 'br' },
      { type: 'bub', text: 'Бірақ ол бір көктемде бір рет қана ашылады. Тек бір адамға.', lines: ['Бірақ ол бір көктемде', 'бір рет қана ашылады.', 'Тек бір адамға.'], a: .44, b: .98, x: .6, y: .46, w: .6, h: .3, par: .12, tail: 'bl' }
    ]
  });

  /* ---------- 9 · Екі көз — «Ал сен ше?» ---------- */
  const pairIdx = p => Math.round(3 * sm((p - .28) / .45));      // pupils contract with the scroll
  MS.scenes.push({
    id: 'pair', len: 3.6, tr: 'bloom', plate: { key: 'pair', ph: 'f060', nolist: true }, grade: { bloom: .55, leak: 1.2 },
    draw(c, p, t, s, X) {
      const u = U(), w = W(), h = H();
      MS.drawPlate(c, X.plate, { zoom: 1.5, fx: .5, fy: .45, blur: 22, bright: .55 });
      c.fillStyle = 'rgba(30,32,90,.55)'; c.fillRect(0, 0, w, h);
      c.save(); c.globalCompositeOperation = 'screen'; for (let i = 0; i < 4; i++) { const g = c.createLinearGradient(w * (.1 + i * .25), 0, w * (.4 + i * .25), h); g.addColorStop(0, 'rgba(206,204,255,0)'); g.addColorStop(.4, 'rgba(206,204,255,' + (.12 + .05 * Math.sin(t + i)) + ')'); g.addColorStop(1, 'rgba(206,204,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); } c.restore();
      MS.glow(c, w / 2, h * .46, w * .85, '143,163,255', .22 + .12 * sm((p - .5) / .3), 'screen');
      MS.petals(c, t, s, { id: 'p9', n: 30, size: 22, vx: .02, scroll: .4 });
    },
    windows: [{      // EYE 3/3 — the pair, once in the whole episode; the page's main visual
      id: 'pair', on: p => p > .05, push: .05, img: p => 'aiaru_pair_' + pairIdx(p),
      rect: p => ({ cx: .5, cy: .46, w: lerp(.8, 1.0, eo((p - .05) / .3)), ar: 1600 / 560, rot: 0 })
    }],
    items: [
      { type: 'thought', text: 'Бір адамға ғана…', a: .2, b: .98, x: .5, y: .16, w: .5, h: .2, par: .08 },
      { type: 'bub', text: 'Ал сен ше, Тайр?', a: .46, b: .98, x: .34, y: .73, w: .44, h: .19, par: .08, tail: 'br' },
      { type: 'bub', text: '…', a: .72, b: .98, x: .76, y: .86, w: .26, h: .14, par: .08, tail: 'bl' }
    ]
  });

  /* ---------- 10 · Финал — «Ай батуға бір сағат қалды» ---------- */
  MS.scenes.push({
    id: 'wide', len: 4.2, plate: { key: 'wide', ph: 'wide', nolist: true }, grade: { bloom: .5, leak: 1 },
    draw(c, p, t, s, X) {
      const u = U(), w = W(), h = H(); let map = null;
      if (!MS.drawSlots(c, 'wide', [{ slot: 'sky', par: .2 }, { slot: 'castle', par: .4 }, { slot: 'flowers', par: .8 }], p))
        map = MS.drawPlate(c, X.plate, { mode: 'width', zoom: lerp(2.3, 1.75, eo(p)), fx: .5, fy: .45 });
      if (map) { moonGlow(c, map.x(.5), map.y(lerp(.16, .3, p)), h * .35, .3); sparkle(c, X, map, t, X.spots.length * .9); }
      MS.mist(c, t, s, { y: .66, h: .3, par: .5, vx: 10, alpha: .45 });
      const k = sm((p - .12) / .55);
      MS.petals(c, t, s, { id: 'p10', n: 96, size: 28, vx: .03, vy: -.02, scroll: .5, swirl: { cx: .5, cy: .52, k }, near: .1 });
      const L = sm((p - .7) / .25); if (L > 0) MS.glow(c, w / 2, h * .4, lerp(.15, .9, L) * h, '236,233,255', .5 * L, 'lighter');
    },
    windows: [Object.assign({
      id: 'petals',
      content(c, R, p, t, X) {      // close-up of drifting petals
        const g = c.createLinearGradient(0, -R.h / 2, 0, R.h / 2); g.addColorStop(0, '#4B4C9A'); g.addColorStop(1, '#262A66'); c.fillStyle = g; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h);
        MS.glow(c, -R.w * .2, -R.h * .25, R.w * .6, '236,233,255', .35, 'screen');
        for (let i = 0; i < 9; i++) {
          const x = ((i * .37 + t * .05 * (1 + i % 3 * .4)) % 1.2 - .1) * R.w - R.w / 2, y = ((i * .29 + t * .09 * (1 + i % 2 * .5) + p) % 1.3 - .15) * R.h - R.h / 2, sz = R.h * (.34 + (i % 4) * .08);
          c.save(); c.translate(x, y); c.rotate(i + t * (.8 + i % 3 * .5)); c.scale(.6 + .4 * Math.abs(Math.cos(t * 1.7 + i)), 1); c.globalAlpha = .9; c.drawImage(MS.petalSprite(i), -sz / 2, -sz / 2, sz, sz); c.restore();
        }
      }
    }, reel({ n: 3, p0: .14, p1: .8, duty: .46, xs: [.3, .72, .3], ys: [.8, .78, .8], w: .44, ar: 1.25, rise: 1.65, rots: [-2, 2, -1.5] }))],
    items: [
      { type: 'cap', text: 'Ай батуға бір сағат қалды.', a: .08, b: .98, x: .5, y: .1, w: .78, h: .12, par: .1 },
      { type: 'cap', cls: 'iffy', text: 'Ал егер ол мені емес… өзін құтқарып жүрсе ше?', a: .36, b: .98, x: .5, y: .68, w: .9, par: 0, stg: .04 },
      { type: 'end', text: 'Жалғасы бар…', a: .74, b: 9, x: .5, y: .9, w: .7, par: 0, edge: .03 }
    ]
  });
})();
