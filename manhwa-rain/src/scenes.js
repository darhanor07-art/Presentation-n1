/* scenes.js — the 10 pages of «Тоқтамайтын жаңбыр» (see ../SCENARIO.md).
   Scene = {id,len(VH),keys[],tr (gradient transition to the next page),draw(c,p,t,s,X),windows[],items[],grade}.
   p = local progress (can overshoot 0..1 slightly inside transitions). Everything is a pure function of (p,t,s): deterministic.
   EYE RULE: an eye window exists exactly three times: page 2 (Merey), page 6 (Sanzhar), page 9 (the pair). All other
   «reel» inserts snap open with a white flash, ride the scroll ~1.6-1.7x faster than the page, and show NON-eye crops. */
(function () {
  const MS = window.MS; MS.scenes = [];
  const { lerp, eo, sm, clamp, TAU } = MS.m;
  const W = () => MS.V.W, H = () => MS.V.H, U = () => MS.V.u;
  const P = Math.PI;

  /* parallax layer: par = how fast it travels over the page (0 far .. 1 near); zoom leaves room so no edge shows */
  const L = (c, key, p, par, o) => MS.layer(c, key, Object.assign({ z: 1 + par * .3, dy: (.5 - clamp(p, -.2, 1.2)) * par * .3 * H() }, o));
  /* window riding the scroll (eye windows). */
  const ride = o => (p, X, len) => ({ cx: o.x0 + (p - o.p0) * len * (o.dx || 0), cy: o.y0 - (p - o.p0) * len * o.rise, w: o.w, ar: o.ar, rot: o.rot || 0 });
  /* repeated reel bursts */
  const reel = o => {
    const st = p => { const q = clamp((p - o.p0) / (o.p1 - o.p0)), n = Math.min(o.n - 1, Math.floor(q * o.n)); return { n, fr: q * o.n - n }; };
    return {
      on: p => { if (p < o.p0 || p >= o.p1) return false; const s = st(p), f = s.fr - (o.ph || 0); return f >= 0 && f < o.duty; },
      rect: (p, X, len) => { const s = st(p), per = (o.p1 - o.p0) / o.n * len, f = Math.max(0, s.fr - (o.ph || 0)), k = s.n + (o.off || 0); return { cx: o.xs[k % o.xs.length], cy: o.ys[k % o.ys.length] - f * per * o.rise, w: o.w, ar: o.ar, rot: o.rots ? o.rots[k % o.rots.length] : 0 }; }
    };
  };
  /* crop (cx,cy centre, fw width, 0..1 of the image) cover-drawn into the window rect R (c is translated to the window centre) */
  const crop = (c, key, cx, cy, fw, R, under) => {
    const img = MS.img(key); if (under) { c.fillStyle = under; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h); }
    const sw = img.width * fw, sh = Math.min(img.height, sw * R.h / R.w), sw2 = sh * R.w / R.h;
    const sx = clamp(cx * img.width - sw2 / 2, 0, img.width - sw2), sy = clamp(cy * img.height - sh / 2, 0, img.height - sh);
    c.drawImage(img, sx, sy, sw2, sh, -R.w / 2, -R.h / 2, R.w, R.h);
  };
  const bump = (x, a, b) => sm((x - a) / (b - a)) * (1 - sm((x - b) / (b - a)));
  const warm = '255,226,150', cold = '184,212,240';

  /* ---------- 1 · Хук — «Ал егер…?» ---------- */
  MS.scenes.push({
    id: 'hook', len: 4.2, tr: 'streak', keys: ['hook_sky', 'hook_city', 'hook_roofs'], grade: { bloom: .45 },
    draw(c, p, t, s) {
      const h = H(), w = W();
      L(c, 'hook_sky', p, .15, { z: 1.14 });
      MS.rain(c, t, s, { id: 'h1', layers: [0], k: .9, ang: 11, scroll: .15, alpha: .8 });
      L(c, 'hook_city', p, .45, { z: 1.22 });
      MS.mist(c, t, s, { y: .64, h: .3, par: .4, vx: 7, alpha: .38 });
      L(c, 'hook_roofs', p, 1.0, { z: lerp(1.28, 1.42, eo(p)) });
      MS.rain(c, t, s, { id: 'h1', layers: [1, 2], ang: 13, scroll: .5 });
    },
    items: [
      { type: 'title', text: 'Тоқтамайтын жаңбыр', a: -.1, b: .17, x: .5, y: .4, w: .92, par: 0, edge: .03 },
      { type: 'hint', text: 'төмен айналдырыңыз', a: -.1, b: .1, x: .5, y: .91, w: .6, par: 0, edge: .03 },
      { type: 'cap', text: 'Бұл қалада жаңбыр бұлттан жаумайды.', a: .2, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'cap', text: 'Ол біреуді бүкіл қала ұмытқанда ғана басталады.', a: .36, b: .98, x: .5, y: .2, w: .8, par: 0 },
      { type: 'cap', text: 'Жаңбыр үшінші тәулік тоқтамай жауып тұр.', a: .52, b: .98, x: .5, y: .325, w: .8, par: 0 },
      { type: 'cap', cls: 'big', text: 'Ал егер бұл жаңбыр — сен үшін жауып тұрса ше?', a: .7, b: .98, x: .5, y: .56, w: .92, par: 0, stg: .05 }
    ]
  });

  /* ---------- 2 · Терезе — «Бір-ақ кесе» ---------- */
  MS.scenes.push({
    id: 'window', len: 3.6, tr: 'fogwipe', keys: ['window_city', 'window_frame', 'eye_merey_closed', 'eye_merey_half', 'eye_merey_open'], grade: { bloom: .5 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U(), foc = sm((p - .04) / .5);
      L(c, 'window_city', p, .25, { z: 1.2, dx: lerp(14, -14, p) * u, focus: foc, div: 9 });
      MS.rain(c, t, s, { id: 'w2', layers: [0, 1], k: .55, ang: 9, alpha: .55, scroll: .1 });
      MS.glassDrops(c, t, s, { id: 'w2', p, n: 24, refract: true, size: 1.1 });
      L(c, 'window_frame', p, .1, { z: 1.08 });
      MS.glow(c, w * .5, h * .83, w * .35, '242,194,48', .12, 'screen');           // warm light on the cup
    },
    windows: [{      // EYE 1/3 — Merey, closed -> half -> open (seen through the wet glass)
      id: 'merey', push: .05, on: p => p > .22 && p < .8, ar: 1200 / 700,
      rect: ride({ x0: .5, y0: .96, p0: .22, rise: .3, w: .8, ar: 1200 / 700, rot: -1.2 }),
      img: p => p < .4 ? 'eye_merey_closed' : p < .5 ? 'eye_merey_half' : 'eye_merey_open'
    }],
    items: [
      { type: 'sfx', text: 'тық… тық…', a: .06, b: .36, x: .5, y: .38, w: .6, par: 0 },
      { type: 'cap', text: 'Үшінші таң. Терезе сыртында — сол баяғы жаңбыр.', a: .04, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'thought', text: 'Бүгін таңертең анам дастарқанға бір-ақ кесе қойды.', lines: ['Бүгін таңертең', 'анам дастарқанға', 'бір-ақ кесе қойды.'], a: .56, b: .98, x: .3, y: .2, par: .15 },
      { type: 'thought', text: '…Маған емес.', a: .78, b: .98, x: .72, y: .46, w: .4, h: .17, par: .15 }
    ]
  });

  /* ---------- 3 · Қолшатырлар — «Ешкім бұрылмады» ---------- */
  const mereyPath = p => { const q = clamp((p - .04) / .92); return { x: .52 + .045 * Math.sin(q * 11) + .02 * Math.sin(q * 5), y: 1.1 - 1.22 * q, q }; };
  const umbReel = (id, p0, p1, x, y, content) => Object.assign({ id, content }, reel({ n: 1, p0, p1, duty: .75, xs: [x], ys: [y], w: .44, ar: 1.4, rise: 1.65, rots: [x < .5 ? -2 : 2] }));
  MS.scenes.push({
    id: 'umbrellas', len: 4.2, tr: 'umbrella', keys: ['street_ground', 'street_umbrellas', 'merey_top'], grade: { bloom: .45 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U(), q = (p - .5);
      L(c, 'street_ground', p, .55, { z: 1.25, dy: q * .55 * .3 * h });          // camera moves up the street: ground slides down
      MS.ripples(c, t, s, { id: 's3g', n: 12, asp: .5, rmax: 22, alpha: .5, y0: .05 });
      const mp = mereyPath(p), um = L(c, 'street_umbrellas', p, 1.0, { z: 1.32, dy: q * 1.0 * .3 * h });
      // Merey walks against the flow (up), between the umbrellas
      const sw = Math.sin(t * 3.2) * 1.2 * u;
      MS.glow(c, mp.x * w + sw, mp.y * h, w * .16, '242,194,48', .22, 'screen');
      MS.sprite(c, 'merey_top', { x: mp.x * w + sw, y: mp.y * h, w: w * .2, ax: .5, ay: .5, rot: Math.sin(mp.q * 11 + .4) * .12 });
      MS.rain(c, t, s, { id: 's3', layers: [0, 1], k: .7, ang: 5, lenk: .55, alpha: .85, speed: 1.3, scroll: .6 });
      MS.ripples(c, t, s, { id: 's3u', n: 18, asp: 1, rmax: 11, alpha: .45 });
    },
    windows: [
      umbReel('umb_edge', .12, .3, .3, .8, function (c, R, p, t) {      // dripping umbrella rim
        crop(c, 'street_umbrellas', .3, .35, .28, R, '#141B26'); const u = U();
        for (let i = 0; i < 7; i++) { const ph = (t * (.7 + i * .09) + i * .31) % 1, x = (-.42 + i * .14) * R.w, y = R.h * (-.05 + ph * .5); c.fillStyle = 'rgba(226,236,246,' + (.8 * (1 - ph)) + ')'; c.beginPath(); c.ellipse(x, y, 2.2 * u, 4.5 * u, 0, 0, TAU); c.fill(); }
        MS.glow(c, -R.w * .2, -R.h * .3, R.w * .5, '242,194,48', .22, 'screen');
      }),
      umbReel('stranger', .42, .6, .7, .76, function (c, R, p, t) {      // a stranger's shoulder
        crop(c, 'street_umbrellas', .72, .62, .3, R, '#141B26'); c.fillStyle = 'rgba(8,12,18,.45)'; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h); MS.glow(c, R.w * .25, -R.h * .3, R.w * .5, '197,208,218', .2, 'screen');
      }),
      umbReel('sleeve', .7, .88, .32, .8, function (c, R, p, t) {      // Merey's yellow sleeve
        crop(c, 'merey_top', .78, .5, .5, R, '#1b232d'); MS.glow(c, 0, 0, R.w * .6, '242,194,48', .35, 'screen'); MS.glow(c, -R.w * .3, -R.h * .3, R.w * .3, '255,255,255', .12, 'screen');
      })
    ],
    items: [
      { type: 'sfx', text: 'тарс… тұрс…', a: .06, b: .3, x: .3, y: .2, w: .6, par: 0 },
      { type: 'cap', text: 'Мыңдаған қолшатыр. Мыңдаған адам.', a: .06, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'bub', text: 'Кешіріңіз!.. Кешіріңізші!', lines: ['Кешіріңіз!..', 'Кешіріңізші!'], a: .38, b: .98, x: .68, y: .5, par: .1, tail: 'bl' },
      { type: 'cap', text: 'Бірде-біреуі маған бұрылып қарамады.', a: .68, b: .98, x: .5, y: .9, w: .8, par: 0 }
    ]
  });

  /* ---------- 4 · Шалшық — «…ал мен жоқпын» ---------- */
  const bootPos = p => { const q = clamp((p - .1) / .8), pos = q * 16, g = Math.min(15, Math.floor(pos)); return { pos, g, a: g % 8, b: g + 1 < 16 ? (g + 1) % 8 : g % 8, f: pos - g, sa: g >= 8 ? 1 : 0, sb: g + 1 >= 8 ? 1 : 0 }; };
  const contact = j => .1 + .8 * (3.5 + 8 * j) / 16;
  MS.scenes.push({
    id: 'puddle', len: 3.6, tr: 'ripple', keys: ['puddle_bg', 'boot_00', 'boot_01', 'boot_02', 'boot_03', 'boot_04', 'boot_05', 'boot_06', 'boot_07'], grade: { bloom: .45 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U(), bp = bootPos(p);
      const map = L(c, 'puddle_bg', p, .25, { z: 1.12 + .08 * eo(p) }), sy = map.y(.8), pz = { y0: map.y(.64) / h, y1: map.y(.94) / h, x0: map.x(.06) / w, x1: map.x(.94) / w };
      MS.rain(c, t, s, { id: 'p4', layers: [0, 1], ang: 8, lenk: 1.1, scroll: .3 });
      const im0 = { x: .5, y: (sy / h), k: (p - contact(0)) / .17, size: .75 }, im1 = { x: .55, y: (sy / h), k: (p - contact(1)) / .17, size: .75 };
      MS.ripples(c, t, s, Object.assign({ id: 'p4', n: 9, asp: .26, rmax: 60, impact: im0.k > 0 && im0.k < 1.4 ? im0 : null }, pz));
      MS.ripples(c, t, s, Object.assign({ id: 'p4b', n: 0, asp: .26, impact: im1.k > 0 && im1.k < 1.4 ? im1 : null }, pz));
      const bx = st => w * (.5 + .05 * st);
      MS.sprite(c, 'boot_0' + bp.a, { x: bx(bp.sa), y: sy, w: w * 1.15, ax: .5, ay: .78, a: 1 });
      if (bp.f > .02 && bp.b !== bp.a) MS.sprite(c, 'boot_0' + bp.b, { x: bx(bp.sb), y: sy, w: w * 1.15, ax: .5, ay: .78, a: sm(bp.f) });
      MS.rain(c, t, s, { id: 'p4', layers: [2], ang: 8, lenk: 1.1, scroll: .3, splash: { y: sy / h, band: .1, n: 40 } });
    },
    windows: [Object.assign({
      id: 'puddle_close',
      content(c, R, p, t) {
        const u = U(); crop(c, 'puddle_bg', .5, .8, .5, R, '#141B26');
        MS.ripples(c, t, 0, { id: 'pc', box: { x: -R.w / 2, y: -R.h / 2, w: R.w, h: R.h }, n: 5, asp: .34, rmax: 90, y0: .3, y1: .95, alpha: 1.2 });
        MS.glow(c, 0, -R.h * .3, R.w * .5, '242,194,48', .16, 'screen');
      }
    }, reel({ n: 2, p0: .44, p1: .95, duty: .5, xs: [.3, .7], ys: [.8, .74], w: .46, ar: 1.35, rise: 1.65, rots: [-2, 2] }))],
    items: [
      { type: 'cap', text: 'Шалшыққа абайсызда бастым.', a: .05, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'sfx', text: 'шалп!', a: .26, b: .5, x: .7, y: .24, w: .5, par: 0, cls: 'big' },
      { type: 'thought', text: 'Су бетінде шамдар да, аспан да бар…', lines: ['Су бетінде шамдар', 'да, аспан да бар…'], a: .44, b: .98, x: .3, y: .2, par: .1 },
      { type: 'thought', cls: 'shiver', text: '…ал мен жоқпын.', a: .74, b: .98, x: .7, y: .38, w: .46, h: .17, par: .1 }
    ]
  });

  /* ---------- 5 · Хабарландыру — «Әріп-әріптеп» ---------- */
  const posterIdx = p => { const g = 5 * sm((p - .1) / .74), a = Math.min(5, Math.floor(g)); return { a, b: Math.min(5, a + 1), f: a >= 5 ? 0 : g - a }; };
  const posterReel = (id, p0, p1, x, y, content) => Object.assign({ id, content }, reel({ n: 1, p0, p1, duty: .75, xs: [x], ys: [y], w: .42, ar: 1.4, rise: 1.65, rots: [x < .5 ? -2 : 2] }));
  MS.scenes.push({
    id: 'poster', len: 3.8, tr: 'bleed', keys: ['poster_stop', 'poster_00', 'poster_01', 'poster_02', 'poster_03', 'poster_04', 'poster_05'], grade: { bloom: .5 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U(), pi = posterIdx(p);
      const map = L(c, 'poster_stop', p, .25, { z: 1.12 });
      MS.glow(c, w * .5, map.y(.4), w * .7, '197,208,218', .1, 'screen');
      MS.rain(c, t, s, { id: 'p5', layers: [0, 1], ang: 10, scroll: .25, alpha: .8 });
      const ph = map.dh * .5, pw = ph * 720 / 1008, cx = map.x(.5), cy = map.y(.41);
      c.save(); c.translate(cx, cy); c.rotate(-.016);
      c.shadowColor = 'rgba(5,8,12,.6)'; c.shadowBlur = 22 * u; c.shadowOffsetY = 8 * u;
      c.drawImage(MS.img('poster_0' + pi.a), -pw / 2, -ph / 2, pw, ph); c.shadowColor = 'transparent';
      if (pi.f > .01) { c.globalAlpha = sm(pi.f); c.drawImage(MS.img('poster_0' + pi.b), -pw / 2, -ph / 2, pw, ph); c.globalAlpha = 1; }
      c.fillStyle = 'rgba(238,241,242,.3)'; for (const sx of [-1, 1]) { c.save(); c.translate(sx * pw * .46, -ph * .49); c.rotate(sx * .6); c.fillRect(-18 * u, -7 * u, 36 * u, 14 * u); c.restore(); }
      c.restore();
      const gl = c.createLinearGradient(0, h * .1, w, h * .7); gl.addColorStop(0, 'rgba(238,241,242,0)'); gl.addColorStop(.5, 'rgba(238,241,242,.07)'); gl.addColorStop(1, 'rgba(238,241,242,0)'); c.fillStyle = gl; c.fillRect(0, 0, w, h);   // glass sheen
      MS.glassDrops(c, t, s, { id: 'p5', p, n: 16, refract: true, size: 1, box: { x: cx - pw / 2, y: cy - ph / 2, w: pw, h: ph } });
      MS.rain(c, t, s, { id: 'p5', layers: [2], ang: 10, scroll: .25 });
    },
    windows: [
      posterReel('tape', .1, .3, .3, .8, function (c, R, p, t) {
        crop(c, 'poster_00', .12, .06, .3, R, '#C5D0DA'); const u = U(); c.save(); c.rotate(-.5); c.fillStyle = 'rgba(214,220,214,.55)'; c.fillRect(-R.w * .3, -R.h * .12, R.w * .6, R.h * .24); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2 * u; c.strokeRect(-R.w * .3, -R.h * .12, R.w * .6, R.h * .24); c.restore();
      }),
      posterReel('ink', .4, .62, .7, .78, function (c, R, p, t) {
        const i = Math.min(5, 2 + Math.floor(p * 3)); crop(c, 'poster_0' + i, .5, .72, .45, R, '#C5D0DA'); const u = U();
        for (let k = 0; k < 6; k++) { const ph = (t * .5 + k * .23) % 1, x = (-.4 + k * .16) * R.w; c.strokeStyle = 'rgba(30,50,85,' + (.5 * (1 - ph)) + ')'; c.lineWidth = 2.4 * u; c.beginPath(); c.moveTo(x, -R.h * .3); c.lineTo(x, -R.h * .3 + ph * R.h * .8); c.stroke(); }
      }),
      posterReel('letter_drop', .66, .86, .3, .8, function (c, R, p, t) {
        crop(c, 'poster_02', .5, .12, .36, R, '#C5D0DA'); MS.bead(c, R.w * .12, -R.h * .05, 20 * U(), 26 * U(), c.canvas, 0);
      })
    ],
    items: [
      { type: 'cap', text: 'Аялдамада менің суретім ілулі тұр.', a: .05, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'thought', text: 'Мұны анам ілген. Үш күн бұрын.', lines: ['Мұны анам ілген.', 'Үш күн бұрын.'], a: .34, b: .98, x: .27, y: .76, par: .1 },
      { type: 'cap', text: 'Жаңбыр менің атымды әріп-әріптеп шайып жатыр.', a: .64, b: .98, x: .5, y: .9, w: .8, par: 0 }
    ]
  });

  /* ---------- 6 · Жаяу жүргінші жолы — «Мерей!» ---------- */
  const carQ = p => clamp((p - .33) / .3);
  MS.scenes.push({
    id: 'crossing', len: 4.0, tr: 'headlight', keys: ['crossing_bg', 'crossing_car', 'eye_sanzhar'], grade: { bloom: .5 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U(), q = carQ(p), fl = bump(p, .35, .45);
      const map = L(c, 'crossing_bg', p, .3, { z: 1.14 });
      const sg = MS.spot('crossing_bg', 'cy', (r, g, b) => (g > 150 && g > r + 50 && b > 110) ? g : 0, { x: .72, y: .27 });
      MS.glow(c, map.x(sg.x), map.y(sg.y), h * .12 * (1 + .12 * Math.sin(t * 3)), '95,211,192', .6, 'lighter');
      MS.glow(c, map.x(sg.x), map.y(sg.y) + h * .22, h * .3, '95,211,192', .12, 'screen');
      MS.rain(c, t, s, { id: 'c6', layers: [0, 1], ang: 10, scroll: .3 });
      if (q > 0 && q < 1) {
        const cwid = w * 1.3, xc = lerp(-.75 * w, 1.85 * w, Math.pow(q, 1.25)), yb = h * .82;
        const hl = MS.spot('crossing_car', 'hl', (r, g, b) => (r > 235 && g > 225 && b > 190) ? 255 : 0, { x: .9, y: .6 });
        MS.glow(c, xc + (hl.x - .5) * cwid + w * .25, yb - cwid * .66 * (1 - hl.y) , w * .5, '255,236,170', .18 * q * 2, 'screen');
        for (let k = 3; k >= 1; k--) MS.sprite(c, 'crossing_car', { x: xc - k * 46 * u, y: yb, w: cwid, a: .13 });
        MS.sprite(c, 'crossing_car', { x: xc, y: yb, w: cwid, a: 1 });
        const fx = xc + (hl.x - .5) * cwid, fy = yb - cwid * .66 * (1 - hl.y);
        MS.glow(c, fx, fy, h * .26, '255,244,214', .85, 'lighter');
        c.save(); c.globalCompositeOperation = 'lighter'; const g2 = c.createLinearGradient(fx - w * .5, 0, fx + w * .3, 0); g2.addColorStop(0, 'rgba(255,244,214,0)'); g2.addColorStop(.85, 'rgba(255,244,214,.7)'); g2.addColorStop(1, 'rgba(255,244,214,0)'); c.fillStyle = g2; c.fillRect(fx - w * .5, fy - 2.5 * u, w * .8, 5 * u); c.restore();
      }
      if (fl > .01) { c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = 'rgba(238,244,250,' + (.55 * fl) + ')'; c.fillRect(0, 0, w, h); c.restore(); }
      MS.rain(c, t, s, { id: 'c6', layers: [2], ang: 10, scroll: .3, splash: { y: .9, band: .05, n: 26 } });
    },
    windows: [{      // EYE 2/3 — Sanzhar, deep blue, dry lashes
      id: 'sanzhar', push: .05, on: p => p > .74, ar: 1200 / 700,
      rect: p => ({ cx: .5, cy: lerp(.9, .46, eo((p - .74) / .14)), w: .9, ar: 1200 / 700, rot: lerp(2, -1, eo((p - .74) / .2)) }),
      img: () => 'eye_sanzhar'
    },
    Object.assign({
      id: 'signal',
      content(c, R, p, t) { const sg = MS.spot('crossing_bg', 'cy', (r, g, b) => (g > 150 && g > r + 50 && b > 110) ? g : 0, { x: .72, y: .27 }); crop(c, 'crossing_bg', sg.x, sg.y, .22, R, '#10161f'); MS.glow(c, 0, 0, R.w * .5, '95,211,192', .5 + .2 * Math.sin(t * 6), 'lighter'); }
    }, reel({ n: 1, p0: .08, p1: .3, duty: .7, xs: [.3], ys: [.8], w: .4, ar: 1.3, rise: 1.65, rots: [-2] })),
    Object.assign({
      id: 'flare',
      content(c, R, p, t) {
        const hl = MS.spot('crossing_car', 'hl', (r, g, b) => (r > 235 && g > 225 && b > 190) ? 255 : 0, { x: .9, y: .6 }); crop(c, 'crossing_car', hl.x, hl.y, .3, R, '#0a0f14');
        MS.glow(c, 0, 0, R.w * .8, '255,244,214', .9, 'lighter'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(-R.w / 2, -1.5 * U(), R.w, 3 * U()); c.fillRect(-1.5 * U(), -R.h / 2, 3 * U(), R.h); c.restore();
      }
    }, reel({ n: 1, p0: .3, p1: .52, duty: .6, xs: [.72], ys: [.76], w: .4, ar: 1.3, rise: 1.65, rots: [2] }))],
    items: [
      { type: 'cap', text: 'Жасыл жанды. Мен жолға шықтым.', a: .04, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'sfx', text: 'БИИИП!', a: .34, b: .58, x: .5, y: .3, w: .8, par: 0, cls: 'big' },
      { type: 'cap', text: 'Жүргізуші мені көрмеді.', a: .44, b: .98, x: .5, y: .9, w: .7, par: 0 },
      { type: 'shock', text: 'Мерей!', a: .56, b: .98, x: .3, y: .52, w: .46, h: .26, par: .1 },
      { type: 'cap', text: 'Біреу білегімнен тартып қалды.', a: .68, b: .98, x: .5, y: .085, w: .8, par: 0 }
    ]
  });

  /* ---------- 7 · Иық артынан — «Жақсы белгі емес» ---------- */
  MS.scenes.push({
    id: 'ots', len: 3.8, tr: 'drip', keys: ['ots_bg', 'sanzhar_fig', 'ots_merey_fg'], grade: { bloom: .55 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U();
      const map = L(c, 'ots_bg', p, .3, { z: 1.12 });
      const lamp = { x: map.x(.6), y: map.y(.08) }, fx = map.x(.58), fyb = map.y(.8), figH = map.dh * .5;
      c.save(); c.globalCompositeOperation = 'screen'; const cg = c.createLinearGradient(0, lamp.y, 0, fyb + 40 * u); cg.addColorStop(0, 'rgba(242,194,48,.2)'); cg.addColorStop(1, 'rgba(242,194,48,0)');
      c.fillStyle = cg; c.beginPath(); c.moveTo(lamp.x - 8 * u, lamp.y); c.lineTo(lamp.x + 8 * u, lamp.y); c.lineTo(lamp.x + w * .55, fyb + 40 * u); c.lineTo(lamp.x - w * .55, fyb + 40 * u); c.closePath(); c.fill(); c.restore();
      MS.glow(c, lamp.x, lamp.y, w * .3, '255,236,170', .8, 'lighter');
      MS.rain(c, t, s, { id: 'o7', layers: [0, 1], ang: 9, scroll: .3, cone: { x: lamp.x / w, y: lamp.y / h, spread: .42, len: .95 }, gap: { x: fx / w, y: (fyb - figH * .5) / h, rx: .15, ry: figH * .62 / h } });
      MS.glow(c, fx, fyb - figH * .5, figH * .55, '255,226,150', .08, 'screen');
      MS.sprite(c, 'sanzhar_fig', { x: fx + lerp(8, -8, p) * u, y: fyb, h: figH, ax: .5, ay: 1 });
      MS.rain(c, t, s, { id: 'o7', layers: [2], ang: 9, scroll: .3, cone: { x: lamp.x / w, y: lamp.y / h, spread: .42, len: .95 }, gap: { x: fx / w, y: (fyb - figH * .5) / h, rx: .15, ry: figH * .62 / h }, splash: { y: .84, band: .05, n: 30 } });
      L(c, 'ots_merey_fg', p, 1.5, { z: 1.2 + .06 * p, dy: -(p - .5) * .2 * h, dx: lerp(10, -14, p) * u, softA: .6, div: 12 });
    },
    items: [
      { type: 'cap', text: 'Оның үстіне бірде-бір тамшы түспейді.', a: .06, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'bub', text: 'Сен… мені көріп тұрсың ба?', lines: ['Сен… мені', 'көріп тұрсың ба?'], a: .28, b: .98, x: .3, y: .24, par: .1, tail: 'bl' },
      { type: 'bub', text: 'Көріп тұрмын.', a: .5, b: .98, x: .7, y: .27, w: .36, h: .17, par: .1, tail: 'br' },
      { type: 'bub', text: 'Және бұл — жақсы белгі емес.', lines: ['Және бұл —', 'жақсы белгі емес.'], a: .7, b: .98, x: .68, y: .43, par: .1, tail: 'br' }
    ]
  });

  /* ---------- 8 · Шатыр — «Жаңбыр кері жауады» ---------- */
  const upK = p => sm((p - .36) / .32);
  MS.scenes.push({
    id: 'roof', len: 4.4, tr: 'rise', keys: ['roof_sky', 'roof_deck', 'roof_pair'], grade: { bloom: .55 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U(), up = upK(p);
      L(c, 'roof_sky', p, .2, { z: 1.16 });
      MS.rain(c, t, s, { id: 'r8', layers: [0], k: .9, up, ang: 8, scroll: .15 });
      const map = L(c, 'roof_deck', p, 1.0, { z: lerp(1.1, 1.45, eo(p)), fy: .6, dy: (.5 - p) * .06 * h });
      const neon = MS.spot('roof_deck', 'neon', (r, g, b) => (Math.max(r, g, b) > 200 && Math.abs(r - g) + Math.abs(g - b) > 60) ? 255 : 0, { x: .72, y: .34 });
      MS.glow(c, map.x(neon.x), map.y(neon.y), h * .24, '95,211,192', .22 + .05 * Math.sin(t * 2.3), 'screen');
      MS.ripples(c, t, s, { id: 'r8', n: 9, asp: .3, rmax: 40, y0: map.y(.72) / h, y1: map.y(.95) / h, alpha: 1 - up });
      MS.sprite(c, 'roof_pair', { x: map.x(.5), y: map.y(.62), h: map.dh * .2, ax: .5, ay: 1 });
      MS.rain(c, t, s, { id: 'r8', layers: [1, 2], up, ang: 8, scroll: .5 });
      if (up > .05) MS.glow(c, w * .5, h * .45, w * .8, '197,208,218', .1 * Math.sin(Math.PI * clamp(up)), 'screen');
    },
    items: [
      { type: 'cap', text: 'Ол мені шатырға алып шықты.', a: .04, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'bub', text: 'Қара.', a: .24, b: .98, x: .7, y: .22, w: .26, h: .15, par: .1, tail: 'bl' },
      { type: 'cap', text: 'Тамшылар… аспанға қайтып барады.', a: .42, b: .98, x: .5, y: .9, w: .8, par: 0 },
      { type: 'bub', text: 'Біреу сені шын есіне алғанда, жаңбыр кері жауады.', lines: ['Біреу сені шын', 'есіне алғанда,', 'жаңбыр кері жауады.'], a: .58, b: .98, x: .3, y: .3, par: .1, tail: 'br' },
      { type: 'thought', text: 'Демек, мені әлі біреу ұмытпаған.', lines: ['Демек, мені әлі', 'біреу ұмытпаған.'], a: .8, b: .98, x: .68, y: .66, par: .1 }
    ]
  });

  /* ---------- 9 · Екі көз — «Тек ұмытылғандар» ---------- */
  const pairG = p => 3 * sm((p - .28) / .45);
  MS.scenes.push({
    id: 'eyes', len: 3.6, tr: 'flash', keys: ['pair_0', 'pair_1', 'pair_2', 'pair_3'], grade: { bloom: .55 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U(), r = MS.rng(909);
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0f151d'); g.addColorStop(.6, '#1b2430'); g.addColorStop(1, '#10161e'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const cols = ['242,194,48', '197,208,218', '110,137,163', '95,211,192', '201,150,42'];
      for (let i = 0; i < 22; i++) { const x = (r() + .02 * Math.sin(t * .3 + i)) * w, y = ((r() * .9 + .05) - p * .06 * (1 + r())) * h, rad = (22 + r() * 60) * u; MS.glow(c, x, y, rad, cols[Math.floor(r() * 5)], .13 + .06 * Math.sin(t * .8 + i), 'screen'); }
      MS.rain(c, t, s, { id: 'e9', layers: [0, 1, 2], k: .8, ang: 11, scroll: .3, alpha: .8 });
      MS.glow(c, w / 2, h * .47, w * .8, '110,137,163', .12 + .1 * sm((p - .5) / .3), 'screen');
    },
    windows: [{      // EYE 3/3 — both eyes, once in the whole episode
      id: 'pair', on: p => p > .05, push: .05, ar: 1600 / 560,
      content(c, R, p, t) {
        const g = pairG(p), a = Math.min(3, Math.floor(g)), b = Math.min(3, a + 1), f = a >= 3 ? 0 : sm(g - a), push = 1.03 + .05 * clamp(p);
        MS.coverInto(c, MS.img('pair_' + a), -R.w / 2, -R.h / 2, R.w, R.h, push, 0, 0);
        if (f > .01) { c.globalAlpha = f; MS.coverInto(c, MS.img('pair_' + b), -R.w / 2, -R.h / 2, R.w, R.h, push, 0, 0); c.globalAlpha = 1; }
      },
      rect: p => ({ cx: .5, cy: .47, w: lerp(.82, 1.0, eo((p - .05) / .3)), ar: 1600 / 560, rot: 0 })
    }],
    items: [
      { type: 'bub', cls: 'voice', text: 'Бізді тек ұмытылғандар ғана көре алады.', lines: ['Бізді тек ұмытылғандар', 'ғана көре алады.'], a: .1, b: .98, x: .5, y: .13, par: .08, tail: 'none' },
      { type: 'bub', cls: 'voice', text: 'Бұл қала мені үш жыл бұрын ұмытқан.', lines: ['Бұл қала мені үш жыл', 'бұрын ұмытқан.'], a: .34, b: .98, x: .5, y: .28, par: .08, tail: 'none' },
      { type: 'thought', text: 'Ол мені көріп тұр. Демек…', lines: ['Ол мені көріп тұр.', 'Демек…'], a: .62, b: .98, x: .5, y: .78, par: .08 }
    ]
  });

  /* ---------- 10 · Финал — «Жеті күн» ---------- */
  MS.scenes.push({
    id: 'finale', len: 4.2, keys: ['finale_sky', 'finale_city', 'finale_roof'], grade: { bloom: .55 },
    draw(c, p, t, s) {
      const w = W(), h = H(), u = U();
      L(c, 'finale_sky', p, .15, { z: 1.14 });
      MS.lightning(c, t, { x: .7, per: 5.2, off: 1.4, sky: .45 });
      MS.rain(c, t, s, { id: 'f10', layers: [0], ang: 12, scroll: .15 });
      L(c, 'finale_city', p, .5, { z: 1.22 });
      MS.mist(c, t, s, { y: .62, h: .3, par: .4, vx: 7, alpha: .35 });
      L(c, 'finale_roof', p, 1.0, { z: lerp(1.25, 1.38, eo(p)) });
      MS.rain(c, t, s, { id: 'f10', layers: [1, 2], ang: 13, scroll: .5, splash: { y: .93, band: .04, n: 24 } });
      const Lg = sm((p - .7) / .25); if (Lg > 0) MS.glow(c, w / 2, h * .42, lerp(.2, .9, Lg) * h, cold, .22 * Lg, 'lighter');
    },
    items: [
      { type: 'cap', text: 'Жаңбыр тоқтаған күні мен толық жоғаламын.', a: .06, b: .98, x: .5, y: .085, w: .8, par: 0 },
      { type: 'bub', text: 'Жеті күнің бар.', a: .28, b: .98, x: .68, y: .26, w: .4, h: .17, par: .1, tail: 'bl' },
      { type: 'cap', cls: 'big s', text: 'Жеті күнде бүкіл қала мені қайта есіне алуы керек.', a: .5, b: .98, x: .5, y: .56, w: .92, par: 0, stg: .04 },
      { type: 'end', text: 'Жалғасы бар…', a: .78, b: 9, x: .5, y: .9, w: .7, par: 0, edge: .03 }
    ]
  });
})();
