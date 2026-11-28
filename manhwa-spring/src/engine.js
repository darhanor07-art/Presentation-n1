/* engine.js — scroll-scrubbed Canvas2D compositor for «Көктемнің соңғы гүлі».
   Pipeline per frame: scene(s) -> offscreen buffers A/B -> transition compose -> post (grade, bloom, leaks, vignette, grain)
   -> DOM overlay (captions / bubbles, own parallax, typewriter). Deterministic: MS.render(sVH, tSec). */
(function () {
  'use strict';
  const MS = window.MS = window.MS || {};
  const CAP = /[?&]capture=1/.test(location.search);
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const eo = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
  const mod = (a, b) => ((a % b) + b) % b;
  const m = MS.m = { clamp, lerp, sm, eo, mod, TAU };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  MS.rng = rng;
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /* ---------------- viewport state ---------------- */
  let W = 720, H = 1280, u = 1, cw = 720, ch = 1280, DPR = 1;
  const V = MS.V = { get W() { return W; }, get H() { return H; }, get u() { return u; } };

  /* ---------------- assets (manifest lookup by name, placeholders fall back) ---------------- */
  const ASSETS = MS.assets = {};
  async function loadAssets() {
    const src = window.__MS_ASSETS || { assets: [] };
    await Promise.all(src.assets.map(async a => {
      const img = new Image(); img.src = a.data;
      try { await img.decode(); } catch (e) { return; }
      ASSETS[a.name] = { img, kind: a.kind, ph: !!a.ph, name: a.name };
    }));
  }
  const realList = kind => Object.values(ASSETS).filter(a => !a.ph && (!kind || a.kind === kind));
  MS.real = name => (ASSETS[name] && !ASSETS[name].ph) ? ASSETS[name].img : null;
  MS.findReal = (kind, ...subs) => {
    const hit = realList(kind).filter(a => subs.every(s => a.name.toLowerCase().indexOf(s) >= 0)).sort((x, y) => x.name < y.name ? -1 : 1);
    return hit.map(a => a.img);
  };
  MS.plateFor = sc => {
    const key = sc.plate.key, r = MS.findReal('plate', key)[0];
    if (r) return { img: r, real: true };
    const alt = sc.plate.alt && MS.findReal('plate', sc.plate.alt)[0]; if (alt) return { img: alt, real: false };
    const ph = ASSETS['ph_' + sc.plate.ph]; return { img: ph ? ph.img : mkc(8, 8), real: false };
  };
  MS.eyeImg = (name, alts) => {
    const r = MS.real(name); if (r) return r;
    if (/_pair_\d/.test(name) && MS.phPair) return MS.phPair(name);
    for (const a of alts || []) { const q = MS.real(a); if (q) return q; }
    return MS.phEye(name);
  };
  // character pose variants: real chars containing the name (sorted), else placeholders 0..2
  MS.charPoses = who => {
    const r = MS.findReal('char', who); if (r.length) return r;
    return [0, 1, 2].map(v => MS.phChar(who, v));
  };
  MS.usingPlaceholders = () => {
    const out = [];
    for (let i = 0; i < MS.scenes.length; i++) if (!MS.plateFor(MS.scenes[i]).real) if (!MS.scenes[i].plate.nolist) out.push('plate:' + MS.scenes[i].plate.key);
    ['aiaru_closed', 'aiaru_half', 'aiaru_open', 'tair_open', 'aiaru_pair_0', 'aiaru_pair_1', 'aiaru_pair_2', 'aiaru_pair_3'].forEach(n => { if (!MS.real(n)) out.push('eye:' + n); });
    if (MS.findReal('seq', 'feet').length < 12) out.push('seq:feet_00..11');
    ['hall_back', 'hall_fg'].forEach(n => { if (!MS.real(n)) out.push('layer:' + n); });
    ['aiaru', 'tair'].forEach(n => { if (!MS.findReal('char', n).length) out.push('char:' + n); });
    return out;
  };

  /* warm (amber window) spot detection on a plate */
  function warmSpots(img) {
    const w = 72, h = Math.max(8, Math.round(72 * img.height / img.width)), c = mkc(w, h), g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data, cand = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, r = d[i], gg = d[i + 1], b = d[i + 2], lum = (r + gg + b) / 3, warm = r - b;
      if (warm > 14 && lum > 165) cand.push([lum + warm * 2, x, y]);
    }
    cand.sort((a, b) => b[0] - a[0]); const out = [];
    for (const [s, x, y] of cand) { if (out.length >= 16) break; if (out.every(o => (o.cx - x) ** 2 + (o.cy - y) ** 2 > 12)) out.push({ cx: x, cy: y, x: (x + .5) / w, y: (y + .5) / h, s }); }
    return out.sort((a, b) => a.x - b.x);
  }

  /* ---------------- drawing helpers ---------------- */
  MS.coverInto = function (c, img, x, y, w, h, zoom, ox, oy) {
    const iw = img.width, ih = img.height, sc = Math.max(w / iw, h / ih) * (zoom || 1), dw = iw * sc, dh = ih * sc;
    c.drawImage(img, x + (w - dw) / 2 + (ox || 0), y + (h - dh) / 2 + (oy || 0), dw, dh);
  };
  const filt = (c, s) => { if (MS.hasFilter) c.filter = s || 'none'; };
  MS.filt = filt;

  /* plate with camera. o: {zoom,fx,fy,mode,dx,dy,blur,bright,alpha}. returns mapping image(0..1)->screen px */
  const tmp = { c: null };
  MS.drawPlate = function (c, img, o) {
    const iw = img.width, ih = img.height;
    let sc = (o.mode === 'width' ? W / iw : Math.max(W / iw, H / ih)) * (o.zoom || 1);
    const dw = iw * sc, dh = ih * sc;
    let x = W / 2 - (o.fx == null ? .5 : o.fx) * dw + (o.dx || 0), y = H / 2 - (o.fy == null ? .5 : o.fy) * dh + (o.dy || 0);
    if (dw >= W) x = clamp(x, W - dw, 0); else x = (W - dw) / 2;
    if (dh >= H) y = clamp(y, H - dh, 0); else y = (H - dh) / 2 + (o.dy || 0) * .3;
    c.save();
    if (dh < H - 1) {   // wide plate: blurred cover backdrop, edges feathered
      filt(c, 'blur(' + (26 * u) + 'px) brightness(.55) saturate(1.1)'); MS.coverInto(c, img, -30 * u, -30 * u, W + 60 * u, H + 60 * u, 1.05); filt(c, 'none');
      if (!tmp.c || tmp.c.width !== W || tmp.c.height !== H) tmp.c = mkc(W, H);
      const t = tmp.c.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, W, H);
      t.drawImage(img, x, y, dw, dh); t.globalCompositeOperation = 'destination-in';
      const g = t.createLinearGradient(0, y, 0, y + dh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.18, 'rgba(0,0,0,1)'); g.addColorStop(.82, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      t.fillStyle = g; t.fillRect(0, 0, W, H); t.globalCompositeOperation = 'source-over';
      c.globalAlpha = o.alpha == null ? 1 : o.alpha; c.drawImage(tmp.c, 0, 0);
    } else {
      let f = ''; if (o.blur > .3) f += 'blur(' + (o.blur * u).toFixed(1) + 'px) '; if (o.bright) f += 'brightness(' + o.bright + ') ';
      filt(c, f || 'none'); c.globalAlpha = o.alpha == null ? 1 : o.alpha;
      const pad = o.blur > .3 ? o.blur * u * 1.5 : 0;
      c.drawImage(img, x - pad * dw / W * 0, y, dw, dh);
    }
    c.restore();
    return { x: fx => x + fx * dw, y: fy => y + fy * dh, sc };
  };

  /* slot layers from real assets: 'moon_sky', 'moon_towers' … par = parallax factor. Returns true if any drawn. */
  MS.drawSlots = function (c, sceneId, slots, p, len) {
    let any = false;
    for (const sl of slots) {
      const one = MS.real(sceneId + '_' + sl.slot), imgs = one ? [one] : []; if (!imgs.length) continue; any = true;
      const zoom = 1 + sl.par * .5, dy = (.5 - p) * sl.par * .5 * H;
      c.save(); c.globalAlpha = sl.alpha == null ? 1 : sl.alpha;
      MS.coverInto(c, imgs[0], 0, 0, W, H, zoom, (sl.dx || 0) * u, dy); c.restore();
    }
    return any;
  };

  /* soft radial light */
  MS.glow = function (c, x, y, r, rgb, a, mode) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(.4, 'rgba(' + rgb + ',' + a * .35 + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.save(); c.globalCompositeOperation = mode || 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  };

  /* amber window glints. lit: 0..n (float, how many lit), opt {r,a,only:[idx]} */
  MS.glints = function (c, X, map, lit, t, opt) {
    opt = opt || {}; if (!map || !X.spots) return;
    X.spots.forEach((s, i) => {
      const k = clamp(lit - i); if (k <= 0) return;
      const tw = .82 + .18 * Math.sin(t * 3.1 + i * 1.7) * Math.sin(t * 1.3 + i);
      const r = (opt.r || 34) * u * (.55 + .6 * k) * map.sc / 1.2;
      MS.glow(c, map.x(s.x), map.y(s.y), r, '255,207,138', (opt.a || .75) * k * tw);
    });
  };

  /* ---------------- fog / mist ---------------- */
  let FOG = null;
  function fogTile() {
    if (FOG) return FOG; const tw = 1024, th = 400; FOG = mkc(tw, th); const g = FOG.getContext('2d'), r = rng(77);
    for (let i = 0; i < 46; i++) {
      const x = r() * tw, y = th * (.25 + r() * .6), rad = 70 + r() * 150, a = .10 + r() * .16;
      for (const ox of [-tw, 0, tw]) {
        const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad); gr.addColorStop(0, 'rgba(214,212,255,' + a + ')'); gr.addColorStop(1, 'rgba(214,212,255,0)');
        g.save(); g.scale(1, .55); g.translate(0, y * .82); g.fillStyle = gr; g.fillRect(x + ox - rad, y - rad - y, rad * 2, rad * 2); g.restore();
      }
    }
    return FOG;
  }
  /* o: {y (0..1 of H where fog band centre sits), h (band height in H), par, vx, alpha, t, s, flip} */
  MS.mist = function (c, t, s, o) {
    const f = fogTile(), bh = (o.h || .5) * H, sc = bh / f.height, tw = f.width * sc;
    const off = mod(-(t * (o.vx || 14) * u + s * (o.par || .5) * W * .6), tw);
    c.save(); c.globalAlpha = o.alpha == null ? .6 : o.alpha; const y = (o.y || .8) * H - bh / 2;
    for (let x = -off; x < W; x += tw) c.drawImage(f, x, y, tw + 1, bh);
    c.restore();
  };

  /* ---------------- petals ---------------- */
  const SPR = [];
  function petalSprites() {
    if (SPR.length) return SPR; const tints = [['#FFFFFF', '#D8D4FF'], ['#E6E3FF', '#A9A6E8'], ['#C9C4FF', '#8FA3FF'], ['#F3F0FF', '#B9B5F0']];
    for (let b = 0; b < 2; b++) for (const [c0, c1] of tints) {
      const S = 64, c = mkc(S, S), g = c.getContext('2d'); if (b && MS.hasFilter) g.filter = 'blur(2.6px)';
      const gr = g.createLinearGradient(14, 8, 50, 56); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      g.fillStyle = gr; g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(58, 16, 54, 46, 32, 58); g.bezierCurveTo(10, 46, 6, 16, 32, 6); g.fill();
      g.filter = 'none'; if (!b) { g.strokeStyle = 'rgba(100,96,190,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(32, 12); g.quadraticCurveTo(34, 34, 32, 54); g.stroke(); }
      SPR.push(c);
    }
    return SPR;
  }
  MS.petalSprite = i => petalSprites()[i % 8];
  const PSET = {};
  /* o: {id,n,vx,vy,size,alpha,scroll,swirl:{cx,cy,k},near:0..1 fraction blurred} */
  MS.petals = function (c, t, s, o) {
    const spr = petalSprites(); let P = PSET[o.id + o.n];
    if (!P) { const r = rng([...o.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) + o.n); P = PSET[o.id + o.n] = Array.from({ length: o.n }, () => ({ x: r(), y: r(), z: .25 + r() * .75, w: .4 + r() * 1.2, ph: r() * TAU, sz: .6 + r() * .8, rs: (r() - .5) * 3, fs: 1 + r() * 2.2, a: r() * TAU, rad: .06 + r() * .5, tint: Math.floor(r() * 4), near: r() })); }
    c.save();
    for (const q of P) {
      const z = q.z;
      let x = q.x + t * (o.vx == null ? .035 : o.vx) * z + Math.sin(t * q.w + q.ph) * .025;
      let y = q.y + t * (o.vy == null ? .03 : o.vy) * z - s * (o.scroll == null ? .5 : o.scroll) * z * .35;
      x = mod(x, 1.12) - .06; y = mod(y, 1.12) - .06;
      let px = x * W, py = y * H;
      if (o.swirl && o.swirl.k > 0) {
        const k = o.swirl.k, th = q.a + t * (.9 / (.25 + q.rad)) * (.6 + z * .5), rr = q.rad * (1.1 - k * .45) + .04;
        const ox = o.swirl.cx * W + Math.cos(th) * rr * W * 1.05, oy = o.swirl.cy * H - (k * 120 * u) * (q.rad) + Math.sin(th) * rr * H * .42;
        const kk = sm(k * (1.3 - q.rad)); px = lerp(px, ox, kk); py = lerp(py, oy, kk);
      }
      const isNear = q.near < (o.near || 0), size = (o.size || 30) * u * (.45 + z) * q.sz * (isNear ? 1.9 : 1);
      const sp = spr[(isNear ? 4 : 0) + q.tint], flip = Math.cos(t * q.fs + q.ph);
      c.globalAlpha = (o.alpha == null ? .85 : o.alpha) * (isNear ? .7 : .55 + z * .45);
      c.setTransform(1, 0, 0, 1, px, py); c.rotate(t * q.rs + q.ph); c.scale(.55 + .45 * Math.abs(flip), 1);
      c.drawImage(sp, -size / 2, -size / 2, size, size);
    }
    c.restore(); c.setTransform(1, 0, 0, 1, 0, 0);
  };

  /* ---------------- characters ---------------- */
  /* poses: array of images, pos float (cycles), o: {x,y (bottom centre, px),h (px),alpha,rot,glow} */
  MS.drawChar = function (c, poses, pos, o) {
    const n = poses.length, a = Math.floor(mod(pos, n)), b = (a + 1) % n, f = sm(mod(pos, 1) * 1.4 - .2);
    const draw = (img, al) => {
      if (al <= .01) return; const h = o.h, w = h * img.width / img.height;
      c.save(); c.translate(o.x, o.y); c.rotate(o.rot || 0); c.globalAlpha = al * (o.alpha == null ? 1 : o.alpha);
      if (o.glow !== 0 && MS.hasFilter) { filt(c, 'blur(' + (14 * u) + 'px) brightness(1.8) saturate(.6)'); c.globalAlpha *= .22; c.drawImage(img, -w / 2, -h, w, h); filt(c, 'none'); c.globalAlpha = al * (o.alpha == null ? 1 : o.alpha); }
      if (o.bright && MS.hasFilter) filt(c, 'brightness(' + o.bright + ') contrast(1.1)');   // contre-jour silhouette
      c.drawImage(img, -w / 2, -h, w, h); filt(c, 'none'); c.restore();
    };
    draw(poses[a], 1 - f); draw(poses[b], f);
  };

  /* ---------------- eye windows ---------------- */
  function rectPx(w, p, X) {
    const r = w.rect(p, X, X.sc.len), wpx = r.w * W, hpx = wpx / r.ar;
    return { cx: r.cx * W, cy: r.cy * H, w: wpx, h: hpx, rot: (r.rot || 0) * Math.PI / 180 };
  }
  MS.rectPx = rectPx;
  function drawWindow(c, w, R, o, flash, p, t, X) {
    if (o <= .004) return;
    const hh = Math.max(R.h * o, 2 * u);
    c.save(); c.translate(R.cx, R.cy); c.rotate(R.rot);
    c.shadowColor = 'rgba(8,10,50,.65)'; c.shadowBlur = 34 * u; c.shadowOffsetY = 12 * u; c.fillStyle = '#0b0c30'; c.fillRect(-R.w / 2, -hh / 2, R.w, hh);
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.save(); c.beginPath(); c.rect(-R.w / 2, -hh / 2, R.w, hh); c.clip();
    if (w.content) w.content(c, R, p, t, X);
    else { const img = MS.eyeImg(w.img(p, t, X), w.alts ? w.alts(p, t, X) : null); MS.coverInto(c, img, -R.w / 2, -R.h / 2, R.w, R.h, 1.02 + (w.push || 0) * clamp(p), 0, 0); }
    const gv = c.createLinearGradient(0, -R.h / 2, 0, R.h / 2); gv.addColorStop(0, 'rgba(38,42,102,.35)'); gv.addColorStop(.25, 'rgba(38,42,102,0)'); gv.addColorStop(.75, 'rgba(38,42,102,0)'); gv.addColorStop(1, 'rgba(38,42,102,.4)');
    c.fillStyle = gv; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h);
    c.globalCompositeOperation = 'soft-light'; c.fillStyle = 'rgba(143,163,255,.35)'; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h); c.globalCompositeOperation = 'source-over';
    if (flash > 0) { c.fillStyle = 'rgba(255,255,255,' + clamp(flash * 1.1) + ')'; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h); }
    c.restore();
    // frame: pale border + soft outer glow
    c.shadowColor = 'rgba(169,166,232,.7)'; c.shadowBlur = 14 * u; c.strokeStyle = 'rgba(236,233,255,.95)'; c.lineWidth = 2.6 * u; c.strokeRect(-R.w / 2, -hh / 2, R.w, hh);
    c.shadowBlur = 0; c.strokeStyle = 'rgba(75,76,154,.55)'; c.lineWidth = 1 * u; if (hh > 20 * u) c.strokeRect(-R.w / 2 + 6 * u, -hh / 2 + 6 * u, R.w - 12 * u, hh - 12 * u);
    c.restore();
  }
  MS.drawWindow = drawWindow;
  function updWin(w, X, p, t) {
    const st = w._st || (w._st = { on: false, t0: -9, t1: -9, o: 0, flash: 0 });
    const on = !!w.on(p, t, X.ss);
    if (on && !st.on) st.t0 = t; if (!on && st.on) st.t1 = t; st.on = on;
    const pop = on ? eo((t - st.t0) / .12) : 1 - eo((t - st.t1) / .09);
    st.o = pop * (w.o ? w.o(p) : 1); st.flash = on ? clamp(1 - (t - st.t0) / .07) : 0; return st;
  }

  /* ---------------- scenes runtime ---------------- */
  let TOTAL = 0; const TW = .7;           // transition width (VH)
  function setup() {
    let s0 = 0;
    MS.scenes.forEach((sc, i) => {
      sc.i = i; sc.start = s0; s0 += sc.len; sc.end = s0;
      sc.X = { sc, ss: {}, spots: null, plate: null };
    });
    TOTAL = s0;
  }
  function prepScene(sc) {
    const X = sc.X; if (X.plate) return X; const pl = MS.plateFor(sc); X.plate = pl.img; X.real = pl.real; X.spots = warmSpots(pl.img); return X;
  }
  function resetScene(sc) { sc.X.ss = {}; (sc.windows || []).forEach(w => { if (w._st) { w._st.on = false; w._st.t1 = -9; w._st.o = 0; } }); }

  const bufs = []; let main, mainCv, bloomCv, grainCv, vigCv;
  function drawScene(b, sc, s, t) {
    const X = prepScene(sc), c = bufs[b].c, p = (s - sc.start) / sc.len; X.W = W; X.H = H; X.u = u;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; filt(c, 'none'); c.clearRect(0, 0, W, H);
    sc.draw(c, p, t, s, X);
    (sc.windows || []).forEach(w => { const st = updWin(w, X, p, t); if (st.o > .004) drawWindow(c, w, rectPx(w, p, X), st.o, st.flash, p, t, X); });
    if (sc.after) sc.after(c, p, t, s, X);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; filt(c, 'none');
    return p;
  }

  function select(s) {
    const sc = MS.scenes;
    for (let i = 0; i < sc.length - 1; i++) {
      const e = sc[i].end, a = e - TW / 2, b = e + TW / 2;
      if (s >= a && s <= b) return { a: i, b: i + 1, tt: (s - a) / TW };
    }
    for (let i = 0; i < sc.length; i++) if (s < sc[i].end) return { a: i, b: -1, tt: 0 };
    return { a: sc.length - 1, b: -1, tt: 0 };
  }

  /* ---------------- transitions ---------------- */
  const TR = MS.transitions = {};
  let tcv = null; const tmask = () => { if (!tcv || tcv.width !== W || tcv.height !== H) tcv = mkc(W, H); const g = tcv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H); return g; };
  /* 1->2 radial: moon-white -> lavender -> transparent. Light cracks from the moon, floods the screen, then fades */
  TR.moonburst = (c, A, B, tt, t) => {
    c.drawImage(tt < .5 ? A : B, 0, 0);
    const mx = W * .68, my = H * .24, k = sm(tt * 2), R = lerp(.04, 2.1, k) * H, fade = 1 - sm((tt - .55) / .45);
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, k * 1.4) * (tt < .5 ? 1 : fade);
    for (let i = 0; i < 16; i++) {          // cracks / rays
      const a = i / 16 * TAU + .2 + Math.sin(i * 3.1) * .1, wdt = .035 + .03 * Math.sin(i * 1.7 + 1), L = R * (.8 + .5 * Math.sin(i * 2.3) * .3);
      const g = c.createLinearGradient(mx, my, mx + Math.cos(a) * L, my + Math.sin(a) * L); g.addColorStop(0, 'rgba(236,233,255,.8)'); g.addColorStop(1, 'rgba(236,233,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + Math.cos(a - wdt) * L, my + Math.sin(a - wdt) * L); c.lineTo(mx + Math.cos(a + wdt) * L, my + Math.sin(a + wdt) * L); c.fill();
    }
    c.restore();
    c.save(); c.globalAlpha = tt < .5 ? 1 : fade;
    const g = c.createRadialGradient(mx, my, 0, mx, my, R); g.addColorStop(0, 'rgba(236,233,255,1)'); g.addColorStop(.45, 'rgba(236,233,255,.96)'); g.addColorStop(.75, 'rgba(169,166,232,.8)'); g.addColorStop(1, 'rgba(169,166,232,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  };
  /* 2->3 linear 135deg indigo -> periwinkle, soft-edged diagonal wipe */
  TR.diag = (c, A, B, tt) => {
    const f = lerp(-.3, 1.3, sm(tt)), x0 = 0, y0 = 0, x1 = W, y1 = H, k = .3;   // gradient axis = the 135deg diagonal
    c.drawImage(A, 0, 0);
    const g = tmask(); g.drawImage(B, 0, 0); g.globalCompositeOperation = 'destination-in';
    const m = g.createLinearGradient(x0, y0, x1, y1); m.addColorStop(clamp(f - k), 'rgba(0,0,0,1)'); m.addColorStop(clamp(f), 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, W, H);
    c.drawImage(tcv, 0, 0);
    const band = c.createLinearGradient(x0, y0, x1, y1), e = sm(1 - Math.abs(tt - .5) * 2);
    const st = (p, col) => band.addColorStop(clamp(p), col);
    st(f - k - .12, 'rgba(38,42,102,0)'); st(f - k * .6, 'rgba(38,42,102,' + .85 * e + ')'); st(f - k * .2, 'rgba(75,76,154,' + .9 * e + ')'); st(f, 'rgba(143,163,255,' + .95 * e + ')'); st(f + .06, 'rgba(143,163,255,0)');
    c.save(); c.fillStyle = band; c.fillRect(0, 0, W, H); c.restore();
  };
  /* 3->4 seven vertical blinds, lavender -> amber, staggered */
  TR.blinds = (c, A, B, tt) => {
    const N = 7, sw = W / N;
    for (let i = 0; i < N; i++) {
      const k = clamp((tt - i * .075) / .55), cover = 1 - Math.abs(k * 2 - 1), x = i * sw;
      c.save(); c.beginPath(); c.rect(x, 0, sw + 1, H); c.clip(); c.drawImage(k < .5 ? A : B, 0, 0);
      const cw2 = sw * cover; if (cw2 > .5) {
        const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#A9A6E8'); g.addColorStop(.55, '#C9B8D6'); g.addColorStop(1, '#FFCF8A');
        c.fillStyle = g; c.fillRect(x + (sw - cw2) / 2, 0, cw2, H);
        c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x + (sw - cw2) / 2, 0, 2 * u, H); c.fillStyle = 'rgba(38,42,102,.35)'; c.fillRect(x + (sw + cw2) / 2 - 2 * u, 0, 2 * u, H);
      }
      c.restore();
    }
  };
  /* 4->5 conic sweep from the gate centre, clockwise */
  TR.conic = (c, A, B, tt) => {
    const cx = W / 2, cy = H * .56, ang = -Math.PI / 2 + sm(tt) * TAU, R = Math.hypot(W, H);
    c.drawImage(A, 0, 0);
    if (tt > .003) { c.save(); c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, -Math.PI / 2, ang, false); c.closePath(); c.clip(); c.drawImage(B, 0, 0); c.restore(); }
    if (!c.createConicGradient) return;
    const env = Math.sin(Math.PI * clamp(tt)), g = c.createConicGradient(ang - 1.15, cx, cy);
    g.addColorStop(0, 'rgba(38,42,102,0)'); g.addColorStop(.06, 'rgba(38,42,102,' + .75 * env + ')'); g.addColorStop(.12, 'rgba(75,76,154,' + .85 * env + ')'); g.addColorStop(.16, 'rgba(169,166,232,' + .95 * env + ')'); g.addColorStop(.1835, 'rgba(236,233,255,' + env + ')'); g.addColorStop(.19, 'rgba(169,166,232,0)'); g.addColorStop(1, 'rgba(169,166,232,0)');
    c.save(); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
    MS.glow(c, cx, cy, H * .25 * env, '169,166,232', .8 * env, 'screen');
  };
  /* 5->6 vertical slide up with a warm edge line (amber -> indigo) */
  TR.slideup = (c, A, B, tt) => {
    const e = eo(tt), by = (1 - e) * H;
    c.save(); c.translate(0, -e * H * .3); c.drawImage(A, 0, 0); c.restore();
    c.fillStyle = 'rgba(10,12,48,' + (.5 * e) + ')'; c.fillRect(0, 0, W, by);
    c.save(); c.beginPath(); c.rect(0, by, W, H - by); c.clip(); c.drawImage(B, 0, by); c.restore();
    const gh = 150 * u, g = c.createLinearGradient(0, by - gh, 0, by + 4 * u); g.addColorStop(0, 'rgba(38,42,102,0)'); g.addColorStop(.55, 'rgba(38,42,102,.6)'); g.addColorStop(.92, 'rgba(255,207,138,.85)'); g.addColorStop(1, 'rgba(255,207,138,1)');
    c.save(); c.fillStyle = g; c.fillRect(0, by - gh, W, gh + 4 * u); c.restore();
    const ln = c.createLinearGradient(0, by, W, by); ln.addColorStop(0, 'rgba(255,207,138,0)'); ln.addColorStop(.5, 'rgba(255,224,170,1)'); ln.addColorStop(1, 'rgba(255,207,138,0)');
    c.save(); c.fillStyle = ln; c.shadowColor = 'rgba(255,207,138,.9)'; c.shadowBlur = 16 * u; c.fillRect(0, by - 1.5 * u, W, 3 * u); c.restore();
  };
  /* 6->7 radial iris: periwinkle ring, night outside; closes like a pupil, opens on the new page */
  TR.iris = (c, A, B, tt) => {
    c.drawImage(tt < .5 ? A : B, 0, 0);
    const k = tt < .5 ? 1 - sm(tt * 2) : sm((tt - .5) * 2), R = Math.hypot(W, H) * .56 * k, cx = W / 2, cy = H * .47;
    if (k < .01) { c.fillStyle = '#080a28'; c.fillRect(0, 0, W, H); return; }
    const r1 = R + 26 * u, g = c.createRadialGradient(cx, cy, Math.max(0, R - 30 * u), cx, cy, r1);
    g.addColorStop(0, 'rgba(143,163,255,0)'); g.addColorStop(.35, 'rgba(143,163,255,.9)'); g.addColorStop(.62, 'rgba(60,66,160,.95)'); g.addColorStop(1, 'rgba(8,10,40,1)');
    c.save(); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  };
  /* 7->8 mesh gradient: drifting lavender / periwinkle blobs dissolve the page like mist */
  TR.meshmist = (c, A, B, tt, t) => {
    c.drawImage(A, 0, 0); c.save(); c.globalAlpha = sm((tt - .25) / .5); c.drawImage(B, 0, 0); c.restore();
    const k = Math.sin(Math.PI * clamp(tt)), cols = ['169,166,232', '143,163,255', '75,76,154', '236,233,255', '169,166,232', '143,163,255', '110,106,190'];
    c.save(); c.fillStyle = 'rgba(143,163,255,' + .35 * k + ')'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < cols.length; i++) {
      const ph = i * 1.9 + tt * 3.2 + t * .6, x = W * (.5 + .46 * Math.sin(ph * .8 + i)), y = H * (.5 + .5 * Math.cos(ph * .6 + i * 2.1)), r = H * (.38 + .12 * Math.sin(ph + i));
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + cols[i] + ',' + .95 * k + ')'); g.addColorStop(.55, 'rgba(' + cols[i] + ',' + .5 * k + ')'); g.addColorStop(1, 'rgba(' + cols[i] + ',0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    c.restore();
  };
  /* 8->9 two door leaves: night gradient, amber inner edge; they close, then slide apart */
  TR.doors = (c, A, B, tt) => {
    const closing = tt < .42, open = tt > .56;
    c.drawImage(tt < .5 ? A : B, 0, 0);
    const g = closing ? sm(tt / .42) : open ? 1 - sm((tt - .56) / .44) : 1, half = W / 2, w = half * g;
    if (w < 1) return;
    const leaf = side => {
      c.save(); const x = side < 0 ? 0 : W - w; c.translate(x, 0);
      const gr = c.createLinearGradient(side < 0 ? 0 : w, 0, side < 0 ? w : 0, 0); gr.addColorStop(0, '#0a0b30'); gr.addColorStop(.55, '#262A66'); gr.addColorStop(.93, '#4B4C9A'); gr.addColorStop(1, '#FFCF8A');
      c.fillStyle = gr; c.fillRect(0, 0, w, H);
      c.strokeStyle = 'rgba(169,166,232,.3)'; c.lineWidth = 1.5 * u; const m = 22 * u; if (w > 60 * u) { c.strokeRect(side < 0 ? m : m * .5, m * 2, w - m * 1.5, H - m * 4); c.strokeRect(side < 0 ? m * 2 : m, m * 3.5, w - m * 3, H * .38); }
      const ex = side < 0 ? w : 0, eg = c.createLinearGradient(ex - 40 * u * side, 0, ex, 0); eg.addColorStop(0, 'rgba(255,207,138,0)'); eg.addColorStop(1, 'rgba(255,207,138,.55)');
      c.fillStyle = eg; c.fillRect(side < 0 ? w - 40 * u : 0, 0, 40 * u, H);
      c.fillStyle = '#FFCF8A'; c.shadowColor = 'rgba(255,207,138,.9)'; c.shadowBlur = 18 * u; c.fillRect(side < 0 ? w - 4 * u : 0, 0, 4 * u, H); c.restore();
    };
    leaf(-1); leaf(1);
  };
  /* 9->10 white flash with a 180deg white -> lavender bloom */
  TR.bloom = (c, A, B, tt) => {
    c.drawImage(tt < .45 ? A : B, 0, 0);
    const f = tt < .45 ? sm(tt / .45) : 1 - sm((tt - .45) / .55);
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,' + clamp(f * 1.05) + ')'); g.addColorStop(.55, 'rgba(236,233,255,' + clamp(f * 1.02) + ')'); g.addColorStop(1, 'rgba(169,166,232,' + clamp(f * .95) + ')');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    MS.glow(c, W / 2, H * .5, H * .7 * f, '255,255,255', .8 * f, 'lighter');
  };

  /* ---------------- post ---------------- */
  function buildStatic() {
    vigCv = mkc(W, H); const g = vigCv.getContext('2d'), r = g.createRadialGradient(W / 2, H * .46, Math.min(W, H) * .32, W / 2, H / 2, Math.max(W, H) * .78);
    r.addColorStop(0, 'rgba(14,15,52,0)'); r.addColorStop(1, 'rgba(14,15,52,.62)'); g.fillStyle = r; g.fillRect(0, 0, W, H);
    grainCv = []; const rn = rng(9); for (let k = 0; k < 4; k++) {
      const c = mkc(192, 192), gg = c.getContext('2d'), im = gg.createImageData(192, 192);
      for (let i = 0; i < im.data.length; i += 4) { const v = 118 + rn() * 20 | 0; im.data[i] = im.data[i + 1] = v; im.data[i + 2] = v + 6; im.data[i + 3] = 255; } gg.putImageData(im, 0, 0); grainCv.push(c);
    }
    bloomCv = mkc(Math.ceil(W / 4), Math.ceil(H / 4));
  }
  function post(c, g, t, s) {
    // colour grade toward indigo / lavender / periwinkle
    c.save();
    c.globalCompositeOperation = 'soft-light';
    let gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(169,166,232,' + .5 * g.grade + ')'); gr.addColorStop(1, 'rgba(38,42,102,' + .8 * g.grade + ')');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'color'; c.fillStyle = 'rgba(75,76,154,' + .2 * g.grade + ')'; c.fillRect(0, 0, W, H);
    c.restore();
    // bloom: thresholded, downsampled, blurred, added back
    if (MS.hasFilter && g.bloom > 0) {
      const b = bloomCv.getContext('2d'); b.save(); b.clearRect(0, 0, bloomCv.width, bloomCv.height); filt(b, 'contrast(1.9) brightness(.72)'); b.drawImage(mainCv, 0, 0, bloomCv.width, bloomCv.height); b.restore();
      c.save(); filt(c, 'blur(' + (7 * u) + 'px)'); c.globalCompositeOperation = 'screen'; c.globalAlpha = g.bloom; c.drawImage(bloomCv, 0, 0, W, H); c.restore();
    }
    // moonlight leaks
    c.save(); c.globalCompositeOperation = 'screen';
    const lk = g.leak * (.7 + .3 * Math.sin(t * .8 + s * 2));
    const g1 = c.createRadialGradient(W * .95, -H * .05, 0, W * .95, -H * .05, H * .6); g1.addColorStop(0, 'rgba(206,204,255,' + .5 * lk + ')'); g1.addColorStop(1, 'rgba(143,163,255,0)');
    c.fillStyle = g1; c.fillRect(0, 0, W, H);
    const g2 = c.createLinearGradient(0, H * .1, W, H * .5); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(.5 + .05 * Math.sin(s), 'rgba(200,198,255,' + .1 * lk + ')'); g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2; c.fillRect(0, 0, W, H); c.restore();
    c.drawImage(vigCv, 0, 0);
    // grain
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = .16 * g.grain;
    const gcv = grainCv[Math.floor(t * 14) % 4], ox = (Math.floor(t * 31) * 53) % 192, oy = (Math.floor(t * 17) * 29) % 192;
    c.fillStyle = c.createPattern(gcv, 'repeat'); c.translate(-ox, -oy); c.fillRect(ox, oy, W, H); c.restore();
  }
  const GR0 = { grade: 1, bloom: .38, leak: .8, grain: 1 };

  /* ---------------- DOM items ---------------- */
  /* Text is split into spans ONCE (mkItem); every style is computed per frame from (t - it.t0) -> deterministic, no CSS keyframes. */
  let ui; const ITEMS = [];
  function orn(cls) { return '<svg class="orn ' + cls + '" viewBox="0 0 30 30"><path d="M2 28V8Q2 2 8 2h20M7 28V13Q7 7 13 7h15" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M12 12l3-3 3 3-3 3z" fill="currentColor"/></svg>'; }
  function bubbleSvg(d) {
    const ell = 'M2 32A48 29 0 1 1 98 32A48 29 0 1 1 2 32Z', tail = d.tail || 'br';
    let t = '';
    if (d.cls && /voice/.test(d.cls)) {          // off-screen voice: jagged rectangular edge, no tail
      const P = [], n = 16, mm = 8;
      for (let i = 0; i <= n; i++) P.push((2 + i * 96 / n).toFixed(1) + ',' + (i % 2 ? 5 : 1.5));
      for (let i = 1; i <= mm; i++) P.push((i % 2 ? 94.5 : 98.5) + ',' + (2 + i * 70 / mm).toFixed(1));
      for (let i = n - 1; i >= 0; i--) P.push((2 + i * 96 / n).toFixed(1) + ',' + (i % 2 ? 69 : 72.5));
      for (let i = mm - 1; i >= 1; i--) P.push((i % 2 ? 5.5 : 1.5) + ',' + (2 + i * 70 / mm).toFixed(1));
      return '<svg class="bg" viewBox="0 0 100 74" preserveAspectRatio="none"><polygon points="' + P.join(' ') + '" class="fill"/></svg>';
    }
    if (d.type === 'thought') return '<svg class="bg" viewBox="0 0 100 64" preserveAspectRatio="none"><path d="' + ell + '" class="fz"/><path d="' + ell + '" class="fill"/></svg>';
    if (d.type === 'shock') {
      let pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, r = i % 2 ? 32 : 47; pts.push((50 + Math.cos(a) * r * (i % 2 ? 1.1 : 1.05)).toFixed(1) + ',' + (32 + Math.sin(a) * r * .66).toFixed(1)); }
      return '<svg class="bg" viewBox="0 0 100 64" preserveAspectRatio="none"><polygon points="' + pts.join(' ') + '" class="fill"/></svg>';
    }
    const T = { br: ['70,58 86,70 80,48', '70.5,58.2 86,70 80,48.5'], bl: ['30,58 14,70 20,48', '29.5,58.2 14,70 20,48.5'], r: ['97,38 110,44 96,30', ''], l: ['3,38 -10,44 4,30', ''] }[tail];
    if (T) { const pp = T[0].split(' '); t = '<polygon points="' + T[0] + ' ' + (tail[tail.length - 1] === 'r' ? '66,52' : '34,52') + '" class="fillo"/><polyline points="' + pp.join(' ') + '" class="stk"/>'; }
    return '<svg class="bg" viewBox="0 0 100 74" preserveAspectRatio="none"><path d="' + ell + '" class="fill"/>' + t + '</svg>';
  }
  const mkSpan = (cls, txt, tag) => { const e = document.createElement(tag || 'span'); e.className = cls; e.textContent = txt; return e; };
  function wrapLines(text, lc) {                 // greedy word wrap into short lines (bubble lines appear one after another)
    const out = []; let cur = '';
    text.split(/\s+/).filter(Boolean).forEach(w => { if (cur && (cur + ' ' + w).length > lc) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) out.push(cur); return out;
  }
  function mkItem(sc, d) {
    const el = document.createElement('div'), T = d.type, cls = d.cls || ''; el.className = 'it ' + T + (cls ? ' ' + cls : '');
    if (T === 'cap') el.innerHTML = orn('o1') + orn('o2') + orn('o3') + orn('o4');
    else if (T === 'bub' || T === 'thought' || T === 'shock') el.innerHTML = bubbleSvg(d);
    const tx = document.createElement('div'); tx.className = 'tx'; el.appendChild(tx);
    const mode = (T === 'cap' && /hook3|iffy/.test(cls)) ? 'letters' : T === 'cap' ? 'words' : (T === 'bub' || T === 'thought') ? 'lines' : T === 'sfx' ? 'tremble' : T;
    const sp = [];
    if (mode === 'words') { const ws = d.text.split(/\s+/).filter(Boolean); ws.forEach((w, i) => { const e = mkSpan('wd', w); tx.appendChild(e); sp.push(e); if (i < ws.length - 1) tx.appendChild(document.createTextNode(' ')); }); }
    else if (mode === 'letters' || mode === 'tremble') {
      const ws = d.text.split(/\s+/).filter(Boolean); ws.forEach((w, i) => { const g = mkSpan('wg', ''); [...w].forEach(ch => { const e = mkSpan('lt', ch); g.appendChild(e); sp.push(e); }); tx.appendChild(g); if (i < ws.length - 1) tx.appendChild(document.createTextNode(' ')); });
    }
    else if (mode === 'lines') (d.lines || wrapLines(d.text, d.lc || 17)).forEach(l => { const e = mkSpan('ln', l, 'div'); tx.appendChild(e); sp.push(e); });
    else { const e = mkSpan('v', d.text); tx.appendChild(e); }
    let pen = null; if (T === 'end') { pen = document.createElement('i'); pen.className = 'pen'; el.appendChild(pen); }
    ui.appendChild(el); return { el, sc, d, mode, vis: false, t0: 0, tx, sp, pen };
  }
  function layoutItems() {
    ITEMS.forEach(it => {
      const d = it.d; it.el.style.width = (d.w * cw) + 'px'; if (d.h) it.el.style.height = (d.h * cw) + 'px';
      it.el.style.left = (d.x * cw) + 'px'; it.el.style.top = (d.y * ch) + 'px';
    });
  }
  const spring = a => { const x = Math.max(0, a - .04); return .55 + .45 * (1 - Math.exp(-9 * x) * Math.cos(16 * x)); };   // 0.55 -> ~1.08 overshoot -> 1
  function animText(it, a, t, k) {
    const sp = it.sp, md = it.mode, d = it.d;
    if (md === 'words') {
      const stg = d.stg || .14;
      for (let i = 0; i < sp.length; i++) { const e = eo((a - .1 - i * stg) / .55), st = sp[i].style; st.opacity = e.toFixed(3); st.transform = 'translateY(' + ((1 - e) * 12 * k).toFixed(1) + 'px)'; st.filter = e < .999 ? 'blur(' + ((1 - e) * 6 * k).toFixed(1) + 'px)' : 'none'; }
    } else if (md === 'letters') {
      const stg = d.stg || .045;
      for (let i = 0; i < sp.length; i++) {
        const t0 = .15 + i * stg, x = a - t0, st = sp[i].style;
        if (x < 0) { st.opacity = '0'; st.textShadow = 'none'; continue; }
        const pop = eo(x / .14), g = Math.max(0, 1 - x / .5);
        st.opacity = Math.min(1, x / .04).toFixed(3); st.transform = 'scale(' + (1 + (1 - pop) * .55).toFixed(3) + ')';
        st.color = g > .02 ? 'rgb(' + Math.round(236 + 19 * g) + ',' + Math.round(233 + 22 * g) + ',255)' : '';
        st.textShadow = '0 ' + (2 * k).toFixed(1) + 'px ' + (8 * k).toFixed(1) + 'px rgba(8,10,40,.95),0 0 ' + (g * 26 * k).toFixed(1) + 'px rgba(255,255,255,' + g.toFixed(2) + '),0 0 ' + (g * 10 * k).toFixed(1) + 'px #fff';
      }
    } else if (md === 'lines') {
      for (let i = 0; i < sp.length; i++) { const e = eo((a - .18 - i * .5) / .35), st = sp[i].style; st.opacity = e.toFixed(3); st.transform = 'translateY(' + ((1 - e) * 7 * k).toFixed(1) + 'px)'; }
    } else if (md === 'tremble') {
      for (let i = 0; i < sp.length; i++) { const e = eo((a - .05 - i * .07) / .3), st = sp[i].style; st.opacity = e.toFixed(3); st.transform = 'translate(' + (Math.sin(t * 31 + i * 1.9) * 1.4 * k).toFixed(2) + 'px,' + (Math.sin(t * 27 + i * 2.7) * 1.4 * k).toFixed(2) + 'px)'; }
    } else if (md === 'title') {
      const r = eo(a / 1.8) * 116 - 8, m = 'linear-gradient(90deg,#000 ' + (r - 12).toFixed(1) + '%,transparent ' + r.toFixed(1) + '%)';
      it.tx.style.webkitMaskImage = m; it.tx.style.maskImage = m;
    } else if (md === 'end') {
      const x = clamp((a - .15) / 2.2), kk = lerp(x, sm(x), .35) + Math.sin(x * 38) * .004 * (1 - x);
      it.tx.style.clipPath = 'inset(-25% ' + ((1 - clamp(kk)) * 100).toFixed(2) + '% -25% 0)';
      if (it.pen) {
        const tx = it.tx, glow = x <= 0 ? 0 : x < 1 ? 1 : Math.max(0, 1 - (a - 2.4) * 1.5);
        it.pen.style.left = (tx.offsetLeft + clamp(kk) * tx.offsetWidth).toFixed(1) + 'px'; it.pen.style.top = (tx.offsetTop + tx.offsetHeight * (.58 + .1 * Math.sin(x * 25))).toFixed(1) + 'px'; it.pen.style.opacity = glow.toFixed(3);
      }
    } else if (md === 'hint') it.el.style.setProperty('--bob', (.5 + .5 * Math.sin(t * 4.4)).toFixed(3));
  }
  function updItems(s, t, weights) {
    const k = cw / 720;
    ITEMS.forEach(it => {
      const sc = it.sc, d = it.d, p = (s - sc.start) / sc.len, wgt = weights[sc.i] || 0;
      const e = d.edge || .05, op = sm((p - d.a) / e) * sm((d.b - p) / e) * wgt;
      const on = op > .02; if (on && !it.vis) it.t0 = t; it.vis = on;
      if (!on) { if (it.el.style.opacity !== '0') { it.el.style.opacity = '0'; it.el.style.visibility = 'hidden'; } return; }
      const a = t - it.t0, mid = (d.a + d.b) / 2, dy = (mid - p) * sc.len * (d.par || 0) * .32 * ch, dx = (d.parx ? (mid - p) * sc.len * d.parx * cw : 0);
      let sc2 = 1, sx = 0, sy = 0;
      if (it.mode === 'lines' || d.type === 'shock') sc2 = spring(a);
      if (d.cls && /voice/.test(d.cls)) { const dk = Math.exp(-a * 2.2) * 2.4 * k + .5 * k; sx = Math.sin(a * 63) * dk; sy = Math.cos(a * 51) * dk * .6; }
      it.el.style.visibility = 'visible'; it.el.style.opacity = op.toFixed(3);
      it.el.style.transform = 'translate(-50%,-50%) translate(' + (dx + sx).toFixed(1) + 'px,' + (dy + sy).toFixed(1) + 'px) rotate(' + (d.rot || 0) + 'deg) scale(' + ((1 + (1 - op) * .04) * sc2).toFixed(3) + ')';
      animText(it, a, t, k);
    });
  }

  /* ---------------- frame ---------------- */
  let lastWeights = [];
  MS.state = { s: 0 };
  function frame(s, t) {
    s = clamp(s, 0, TOTAL); MS.state.s = s;
    const sel = select(s), scs = MS.scenes;
    scs.forEach((sc, i) => { if (i !== sel.a && i !== sel.b) { if (sc.X.ss.live) resetScene(sc); } });
    const sA = scs[sel.a]; sA.X.ss.live = 1;
    const c = main; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; filt(c, 'none');
    drawScene(0, sA, s, t);
    const weights = scs.map(() => 0); weights[sel.a] = 1;
    let g = Object.assign({}, GR0, sA.grade);
    if (sel.b >= 0) {
      const sB = scs[sel.b]; sB.X.ss.live = 1; drawScene(1, sB, s, t);
      TR[sA.tr](c, bufs[0].cv, bufs[1].cv, sel.tt, t, s, sA);
      weights[sel.a] = 1 - sm(sel.tt * 1.6); weights[sel.b] = sm((sel.tt - .35) * 1.6);
      const gB = Object.assign({}, GR0, sB.grade); for (const k in g) g[k] = lerp(g[k], gB[k], sm(sel.tt));
    } else c.drawImage(bufs[0].cv, 0, 0);
    post(c, g, t, s);
    updItems(s, t, weights);
    document.documentElement.style.setProperty('--prog', (s / TOTAL).toFixed(4));
  }
  MS.render = (s, t) => frame(s, t);

  /* ---------------- layout / scroll / loop ---------------- */
  function layout() {
    const vw = innerWidth, vh = innerHeight; cw = Math.min(vw, Math.round(vh * .5625)); ch = vh;
    DPR = CAP ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    let k = 1; const maxw = 900; if (cw * DPR > maxw) k = maxw / (cw * DPR);
    W = Math.round(cw * DPR * k); H = Math.round(ch * DPR * k); u = W / 720;
    const stage = document.getElementById('stage'); stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
    mainCv.width = W; mainCv.height = H; bufs.forEach(b => { b.cv.width = W; b.cv.height = H; });
    tmp.c = null; buildStatic();
    document.documentElement.style.setProperty('--u', (cw / 720) + 'px');
    layoutItems();
    const sp = document.getElementById('spacer'); if (sp && !CAP) sp.style.height = ((TOTAL + 1) * vh) + 'px';
  }

  MS.boot = async function () {
    try {
      ui = document.getElementById('ui'); mainCv = document.getElementById('cv'); main = mainCv.getContext('2d');
      MS.hasFilter = 'filter' in main;
      for (let i = 0; i < 2; i++) { const cv = mkc(8, 8); bufs.push({ cv, c: cv.getContext('2d') }); }
      await loadAssets(); setup();
      MS.scenes.forEach(sc => (sc.items || []).forEach(d => ITEMS.push(mkItem(sc, d))));
      if (document.fonts && document.fonts.ready) { try { await document.fonts.load('italic 600 24px "Cormorant Garamond"', 'Бұл ә ғ қ ң ө ұ ү һ і'); await document.fonts.ready; } catch (e) { } }
      layout(); window.addEventListener('resize', () => { layout(); frame(sd, performance.now() / 1000); });
      MS.scenes.forEach(prepScene);
      window.__ms.total = TOTAL; window.__ms.segments = MS.scenes.map(sc => ({ id: sc.id, start: sc.start, len: sc.len, tr: sc.tr || null }));
      window.__ms.placeholders = MS.usingPlaceholders();
      frame(0, 0);
      document.getElementById('loader').classList.add('done');
      if (!CAP) live();
    } catch (e) { document.body.dataset.err = String(e && e.stack || e); console.error(e); }
  };
  let sd = 0, last = performance.now();
  function live() {
    const tick = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      const target = scrollY / innerHeight; sd += (target - sd) * (1 - Math.exp(-dt * 7)); if (Math.abs(target - sd) < 1e-4) sd = target;
      try { frame(sd, now / 1000); } catch (e) { document.body.dataset.err = String(e && e.stack || e); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  window.__ms = { ready: null, total: 0, segments: [], render: (s, t) => { frame(s, t); }, MS };
  window.addEventListener('error', e => { document.body.dataset.err = (e.message || '') + ' @' + (e.filename || '').slice(-30) + ':' + e.lineno; });
  window.addEventListener('unhandledrejection', e => { document.body.dataset.err = 'rej: ' + (e.reason && e.reason.stack || e.reason); });
})();
