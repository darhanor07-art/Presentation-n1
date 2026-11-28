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
    const ph = ASSETS['ph_' + sc.plate.ph]; return { img: ph ? ph.img : mkc(8, 8), real: false };
  };
  MS.eyeImg = (name, alts) => {
    const r = MS.real(name); if (r) return r;
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
    for (let i = 0; i < MS.scenes.length; i++) if (!MS.plateFor(MS.scenes[i]).real) out.push('plate:' + MS.scenes[i].plate.key);
    ['aiaru_open', 'aiaru_wide', 'aiaru_half', 'aiaru_closed', 'aiaru_glance_up', 'tair_open', 'tair_narrow', 'tair_glance', 'aiaru_pupil_0'].forEach(n => { if (!MS.real(n)) out.push('eye:' + n); });
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
  TR.flash = (c, A, B, tt, t, s) => {          // 1->2 moonlight floods the screen, white flash
    c.drawImage(tt < .5 ? A : B, 0, 0);
    const mx = W * .7, my = H * .22, k = sm(tt * 2);
    if (tt < .5) MS.glow(c, mx, my, lerp(.2, 1.6, k) * H, '236,233,255', k * 1.2, 'screen');
    const f = Math.pow(sm(1 - Math.abs(tt - .5) * 2), 1.4); c.fillStyle = 'rgba(244,242,255,' + clamp(f * 1.05) + ')'; c.fillRect(0, 0, W, H);
  };
  function edgeX(y, fx, tt) { return fx + Math.sin(y * .011 + tt * 7) * 46 * u + Math.sin(y * .027 - tt * 4) * 18 * u + (y - H / 2) * .22; }
  TR.petal = (c, A, B, tt, t) => {             // 2->3 petals sweep across
    c.drawImage(A, 0, 0);
    const fx = lerp(-.45 * W, 1.45 * W, eo(tt * .9 + .1 * tt));
    c.save(); c.beginPath(); c.moveTo(-10, -10); for (let y = -10; y <= H + 30; y += 24) c.lineTo(edgeX(y, fx, tt), y); c.lineTo(-10, H + 30); c.closePath(); c.clip(); c.drawImage(B, 0, 0); c.restore();
    c.save(); const gr = c.createLinearGradient(fx - 70 * u, 0, fx + 40 * u, 0); gr.addColorStop(0, 'rgba(236,233,255,0)'); gr.addColorStop(.7, 'rgba(236,233,255,.38)'); gr.addColorStop(1, 'rgba(236,233,255,0)');
    c.fillStyle = gr; c.globalCompositeOperation = 'screen'; c.fillRect(fx - 80 * u - H * .25, 0, 130 * u + H * .5, H); c.restore();
    const r = rng(5), spr = petalSprites(), N = 70;
    for (let i = 0; i < N; i++) {
      const y = (i / N * 1.15 - .08) * H + (r() - .5) * 40 * u, off = (r() - .62) * 360 * u, sz = (34 + r() * 100) * u * (r() > .8 ? 1.7 : 1), sp = r() * 1.3 + .4;
      const x = edgeX(y, fx, tt) + off * (1 + tt * .4) + Math.sin(t * 3 + i) * 12 * u, flip = Math.cos(t * (2 + r() * 3) + i);
      c.save(); c.globalAlpha = clamp(.95 - Math.abs(off) / (440 * u)); c.translate(x, y - (tt * 90 * sp) * u); c.rotate(i + t * 2 * sp + tt * 5); c.scale(.5 + .5 * Math.abs(flip), 1);
      c.drawImage(spr[(i % 4) + (i % 5 === 0 ? 4 : 0)], -sz / 2, -sz / 2, sz, sz); c.restore();
    }
  };
  TR.mist = (c, A, B, tt, t, s) => {           // 3->4 mist crossfade
    c.drawImage(A, 0, 0); c.save(); c.globalAlpha = sm((tt - .2) / .6); c.drawImage(B, 0, 0); c.restore();
    const k = Math.sin(Math.PI * tt);
    MS.mist(c, t, s, { y: .62, h: .8, par: .4, vx: 22, alpha: .95 * k }); MS.mist(c, t, s + 3, { y: .3, h: .7, par: .7, vx: -16, alpha: .8 * k }); MS.mist(c, t, s + 7, { y: .88, h: .6, par: .9, vx: 30, alpha: .9 * k });
    c.save(); c.fillStyle = 'rgba(184,182,240,' + (.18 * k) + ')'; c.fillRect(0, 0, W, H); c.restore();
  };
  TR.slide = (c, A, B, tt) => {                // 4->5 frame slides up
    const e = eo(tt), by = (1 - e) * H;
    c.save(); c.translate(0, -e * H * .35); c.drawImage(A, 0, 0); c.restore();
    c.fillStyle = 'rgba(10,12,48,' + (.55 * e) + ')'; c.fillRect(0, 0, W, H * (1 - e) * .0 + H * Math.max(0, 1 - by / H) * 0 + 0);
    c.save(); c.fillStyle = 'rgba(8,10,40,' + (.5 * e) + ')'; c.fillRect(0, 0, W, by); c.restore();
    c.save(); c.shadowColor = 'rgba(8,10,40,.7)'; c.shadowBlur = 40 * u; c.shadowOffsetY = -10 * u; c.fillStyle = '#000'; c.fillRect(0, by, W, H); c.restore();
    c.save(); c.beginPath(); c.rect(0, by, W, H - by); c.clip(); c.drawImage(B, 0, 0); c.restore();
    c.fillStyle = 'rgba(236,233,255,' + (.75 * (1 - Math.abs(e - .5) * 2) + .15) + ')'; c.fillRect(0, by - u, W, 2 * u);
  };
  TR.zoom = (c, A, B, tt, t, s, sA) => {       // 5->6 eye window grows to full screen
    c.drawImage(A, 0, 0);
    const w = sA.windows[0], R0 = rectPx(w, 1, sA.X), e = eo(clamp(tt / .82));
    c.fillStyle = 'rgba(8,10,44,' + (.55 * e) + ')'; c.fillRect(0, 0, W, H);
    const R = { cx: lerp(R0.cx, W / 2, e), cy: lerp(R0.cy, H / 2, e), w: lerp(R0.w, W * 1.04, e), h: lerp(R0.h, H * 1.04, e), rot: lerp(R0.rot, 0, e) };
    drawWindow(c, w, R, 1, tt > .62 ? clamp((tt - .62) * 2.2) * .5 : 0, 1.2 + tt, t, sA.X);
    c.save(); c.globalAlpha = sm((tt - .7) / .3); c.drawImage(B, 0, 0); c.restore();
  };
  TR.split = (c, A, B, tt) => {                // 6->7 frame splits into split-screen
    const e = eo(tt), hh = H / 2, gap = e * hh;
    c.drawImage(B, 0, 0);
    c.fillStyle = 'rgba(236,233,255,' + (.9 * (1 - e) + .1) + ')'; c.fillRect(0, hh - gap - 2 * u, W, gap * 2 + 4 * u);
    c.save(); c.beginPath(); c.rect(0, 0, W, hh); c.clip(); c.drawImage(A, 0, -gap); c.restore();
    c.save(); c.beginPath(); c.rect(0, hh, W, hh); c.clip(); c.drawImage(A, 0, gap); c.restore();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(0, hh - gap - 1.5 * u, W, 3 * u); c.fillRect(0, hh + gap - 1.5 * u, W, 3 * u);
  };
  TR.flash2 = (c, A, B, tt) => {               // 7->8 white flash, then wide frame
    c.drawImage(tt < .45 ? A : B, 0, 0);
    const f = tt < .45 ? sm(tt / .45) : 1 - sm((tt - .45) / .55);
    c.fillStyle = 'rgba(255,255,255,' + clamp(f * 1.02) + ')'; c.fillRect(0, 0, W, H);
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
  let ui; const ITEMS = [];
  const NS = 'http://www.w3.org/2000/svg';
  function orn(cls) { return '<svg class="orn ' + cls + '" viewBox="0 0 30 30"><path d="M2 28V8Q2 2 8 2h20M7 28V13Q7 7 13 7h15" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M12 12l3-3 3 3-3 3z" fill="currentColor"/></svg>'; }
  function bubbleSvg(d) {
    const ell = 'M2 32A48 29 0 1 1 98 32A48 29 0 1 1 2 32Z', tail = d.tail || 'br';
    let t = '';
    if (d.type === 'thought') return '<svg class="bg" viewBox="0 0 100 64" preserveAspectRatio="none"><path d="' + ell + '" class="fz"/><path d="' + ell + '" class="fill"/></svg>';
    if (d.type === 'shock') {
      let pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, r = i % 2 ? 32 : 47; pts.push((50 + Math.cos(a) * r * (i % 2 ? 1.1 : 1.05)).toFixed(1) + ',' + (32 + Math.sin(a) * r * .66).toFixed(1)); }
      return '<svg class="bg" viewBox="0 0 100 64" preserveAspectRatio="none"><polygon points="' + pts.join(' ') + '" class="fill"/></svg>';
    }
    const T = { br: ['70,58 86,70 80,48', '70.5,58.2 86,70 80,48.5'], bl: ['30,58 14,70 20,48', '29.5,58.2 14,70 20,48.5'], r: ['97,38 110,44 96,30', ''], l: ['3,38 -10,44 4,30', ''] }[tail];
    if (T) { const pp = T[0].split(' '); t = '<polygon points="' + T[0] + ' ' + (tail[tail.length - 1] === 'r' ? '66,52' : '34,52') + '" class="fillo"/><polyline points="' + pp.join(' ') + '" class="stk"/>'; }
    return '<svg class="bg" viewBox="0 0 100 74" preserveAspectRatio="none"><path d="' + ell + '" class="fill"/>' + t + '</svg>';
  }
  function mkItem(sc, d) {
    const el = document.createElement('div'); el.className = 'it ' + d.type + (d.cls ? ' ' + d.cls : '');
    const tx = '<div class="tx"><span class="v"></span><span class="h"></span></div>';
    if (d.type === 'cap') el.innerHTML = orn('o1') + orn('o2') + orn('o3') + orn('o4') + tx;
    else if (d.type === 'bub' || d.type === 'thought' || d.type === 'shock') el.innerHTML = bubbleSvg(d) + tx;
    else el.innerHTML = tx;
    ui.appendChild(el); return { el, sc, d, vis: false, t0: 0, n: -1, v: el.querySelector('.v'), h: el.querySelector('.h'), tx: el.querySelector('.tx') };
  }
  function layoutItems() {
    ITEMS.forEach(it => {
      const d = it.d; it.el.style.width = (d.w * cw) + 'px'; if (d.h) it.el.style.height = (d.h * cw) + 'px';
      it.el.style.left = (d.x * cw) + 'px'; it.el.style.top = (d.y * ch) + 'px';
    });
  }
  function updItems(s, t, weights) {
    ITEMS.forEach(it => {
      const sc = it.sc, d = it.d, p = (s - sc.start) / sc.len, wgt = weights[sc.i] || 0;
      const e = d.edge || .05, op = sm((p - d.a) / e) * sm((d.b - p) / e) * wgt;
      const on = op > .02; if (on && !it.vis) { it.t0 = t; it.n = -1; } it.vis = on;
      if (!on) { if (it.el.style.opacity !== '0') { it.el.style.opacity = '0'; it.el.style.visibility = 'hidden'; } return; }
      const mid = (d.a + d.b) / 2, dy = (mid - p) * sc.len * (d.par || 0) * .32 * ch, dx = (d.parx ? (mid - p) * sc.len * d.parx * cw : 0);
      it.el.style.visibility = 'visible'; it.el.style.opacity = op.toFixed(3);
      it.el.style.transform = 'translate(-50%,-50%) translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + (d.rot || 0) + 'deg) scale(' + (1 + (1 - op) * .04).toFixed(3) + ')';
      if (d.type === 'end') {
        const k = eo((t - it.t0) / 2.8); it.tx.style.clipPath = 'inset(-10% ' + ((1 - k) * 100).toFixed(1) + '% -10% 0)';
        if (it.n < 0) { it.v.textContent = d.text; it.n = 1; }
      } else {
        const full = d.text.length, n = d.notype ? full : Math.min(full, Math.max(0, Math.floor((t - it.t0 - .12) * (d.cps || 26))));
        if (n !== it.n) { it.n = n; it.v.textContent = d.text.slice(0, n); it.h.textContent = d.text.slice(n); }
      }
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
