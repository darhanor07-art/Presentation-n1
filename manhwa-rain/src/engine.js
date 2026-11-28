/* engine.js — scroll-scrubbed Canvas2D compositor for «Тоқтамайтын жаңбыр».
   Pipeline per frame: scene(s) -> offscreen buffers A/B -> transition compose -> post (grade, bloom, vignette, grain)
   -> DOM overlay (captions / bubbles, own parallax, text animations). Deterministic: await MS.render(sVH, tSec).
   Assets (painted with p5.brush, see ../paint) are looked up by exact manifest key and decoded lazily (scene ± 1). */
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
  MS.hash = str => { let h = 7; for (let i = 0; i < str.length; i++) h = Math.imul(h * 31 + str.charCodeAt(i), 2654435761) >>> 0; return h; };
  const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  MS.mkc = mkc;
  MS.C = { night: '#141B26', slate: '#26313F', steel: '#3D4C5E', rain: '#6E89A3', mist: '#C5D0DA', paper: '#EEF1F2', yel: '#F2C230', dim: '#C9962A', cy: '#5FD3C0' };

  /* ---------------- viewport state ---------------- */
  let W = 720, H = 1280, u = 1, cw = 720, ch = 1280, DPR = 1;
  const V = MS.V = { get W() { return W; }, get H() { return H; }, get u() { return u; } };

  /* ---------------- assets: manifest by exact key, lazy decode ---------------- */
  const SRC = {}, DEC = {}, PEND = {}, SOFT = {}, SPOT = {};
  function indexAssets() { ((window.__MS_ASSETS || { assets: [] }).assets || []).forEach(a => { SRC[a.name] = a; }); }
  function decode(name) {
    if (DEC[name] || !SRC[name]) return Promise.resolve();
    if (PEND[name]) return PEND[name];
    return PEND[name] = (async () => {
      const img = new Image(); img.src = SRC[name].data;
      try { await img.decode(); DEC[name] = img; } catch (e) { console.warn('decode failed', name); }
      delete PEND[name];
    })();
  }
  const keysOf = i => (MS.scenes[i] && MS.scenes[i].keys) || [];
  let wantSet = new Set();
  function ensureIdx(a, b) {                     // decode scene ± 1 neighbour, release the rest
    const want = new Set(); const lo = Math.max(0, Math.min(a, b < 0 ? a : b) - 1), hi = Math.min(MS.scenes.length - 1, Math.max(a, b) + 1);
    for (let i = lo; i <= hi; i++) keysOf(i).forEach(k => want.add(k));
    wantSet = want;
    for (const k of Object.keys(DEC)) if (!want.has(k)) { delete DEC[k]; delete SOFT[k]; delete SPOT[k]; }
    return Promise.all([...want].map(decode));
  }
  MS.real = name => DEC[name] || null;
  MS.has = name => !!SRC[name];
  MS.img = name => DEC[name] || (MS.ph ? MS.ph(name) : mkc(8, 8));
  MS.eyeImg = MS.img;
  MS.usingPlaceholders = () => {
    const out = [], seen = new Set();
    (MS.scenes || []).forEach(sc => (sc.keys || []).forEach(k => { if (!seen.has(k)) { seen.add(k); if (!SRC[k]) out.push(k); } }));
    return out;
  };

  /* ---------------- drawing helpers ---------------- */
  const filt = (c, s) => { if (MS.hasFilter) c.filter = s || 'none'; };
  MS.filt = filt;
  MS.coverInto = function (c, img, x, y, w, h, zoom, ox, oy) {
    const iw = img.width, ih = img.height, sc = Math.max(w / iw, h / ih) * (zoom || 1), dw = iw * sc, dh = ih * sc;
    c.drawImage(img, x + (w - dw) / 2 + (ox || 0), y + (h - dh) / 2 + (oy || 0), dw, dh);
  };
  /* blurred stand-in: image downscaled by div (bilinear upscale = soft focus, no ctx.filter cost) */
  MS.soft = function (key, div) {
    const img = MS.img(key), id = key + '|' + div + '|' + (DEC[key] ? 1 : 0), hit = SOFT[id]; if (hit) return hit;
    const c = mkc(Math.max(4, Math.round(img.width / div)), Math.max(4, Math.round(img.height / div))), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height); return SOFT[id] = c;
  };
  /* parallax plate / layer. o: {z zoom, fx,fy focus 0..1 (0.5 centred), dx,dy px, a alpha, focus 0..1 (0 = soft), div, softA overlay of the soft copy, mode 'width'}
     returns mapping image(0..1)->screen px */
  MS.layer = function (c, key, o) {
    o = o || {}; const img = MS.img(key), iw = img.width, ih = img.height;
    const sc = (o.mode === 'width' ? W / iw : Math.max(W / iw, H / ih)) * (o.z || 1), dw = iw * sc, dh = ih * sc;
    let x = -(dw - W) * (o.fx == null ? .5 : o.fx) + (o.dx || 0), y = -(dh - H) * (o.fy == null ? .5 : o.fy) + (o.dy || 0);
    x = dw >= W ? clamp(x, W - dw, 0) : (W - dw) / 2; y = dh >= H ? clamp(y, H - dh, 0) : y;
    c.save(); const a = o.a == null ? 1 : o.a;
    if (o.focus != null && o.focus < .999) { const sf = MS.soft(key, o.div || 10); c.globalAlpha = a; c.drawImage(sf, x, y, dw, dh); c.globalAlpha = a * sm(o.focus); c.drawImage(img, x, y, dw, dh); }
    else { c.globalAlpha = a; c.drawImage(img, x, y, dw, dh); if (o.softA) { c.globalAlpha = a * o.softA; c.drawImage(MS.soft(key, o.div || 10), x, y, dw, dh); } }
    c.restore();
    return { x: fx => x + fx * dw, y: fy => y + fy * dh, sc, dw, dh, x0: x, y0: y };
  };
  /* sprite. o: {x,y anchor px, w|h px, ax,ay anchor fraction of the image (default .5,1), rot, a, flip, glow} */
  MS.sprite = function (c, key, o) {
    const img = MS.img(key); let w = o.w, h = o.h; if (!w) w = h * img.width / img.height; if (!h) h = w * img.height / img.width;
    const ax = o.ax == null ? .5 : o.ax, ay = o.ay == null ? 1 : o.ay;
    c.save(); c.translate(o.x, o.y); if (o.rot) c.rotate(o.rot); if (o.flip) c.scale(-1, 1); c.globalAlpha = o.a == null ? 1 : o.a;
    c.drawImage(img, -ax * w, -ay * h, w, h); if (o.softA) { c.globalAlpha *= o.softA; c.drawImage(MS.soft(key, o.div || 10), -ax * w, -ay * h, w, h); }
    c.restore(); return { x: o.x - ax * w, y: o.y - ay * h, w, h, px: fx => o.x + (fx - ax) * w, py: fy => o.y + (fy - ay) * h };
  };
  /* brightest pixel cluster of a key matching test(r,g,b)->score; normalised {x,y}; fallback fb */
  MS.spot = function (key, name, test, fb) {
    const id = key + '|' + name + '|' + (DEC[key] ? 1 : 0); if (SPOT[id]) return SPOT[id];
    const img = MS.img(key), w = 64, h = Math.max(8, Math.round(64 * img.height / img.width)), c = mkc(w, h), g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data; let best = -1, bx = fb.x, by = fb.y;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let sc = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const k = ((y + j) * w + x + i) * 4; sc += test(d[k], d[k + 1], d[k + 2], d[k + 3]); }
      if (sc > best) { best = sc; bx = (x + .5) / w; by = (y + .5) / h; }
    }
    return SPOT[id] = best > 30 ? { x: bx, y: by } : fb;
  };
  MS.glow = function (c, x, y, r, rgb, a, mode) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(.4, 'rgba(' + rgb + ',' + a * .35 + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.save(); c.globalCompositeOperation = mode || 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  };

  /* ---------------- fog / mist ---------------- */
  let FOG = null;
  function fogTile() {
    if (FOG) return FOG; const tw = 1024, th = 400; FOG = mkc(tw, th); const g = FOG.getContext('2d'), r = rng(77);
    for (let i = 0; i < 46; i++) {
      const x = r() * tw, y = th * (.25 + r() * .6), rad = 70 + r() * 150, a = .10 + r() * .16;
      for (const ox of [-tw, 0, tw]) {
        const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad); gr.addColorStop(0, 'rgba(197,208,218,' + a + ')'); gr.addColorStop(1, 'rgba(197,208,218,0)');
        g.save(); g.scale(1, .55); g.translate(0, y * .82); g.fillStyle = gr; g.fillRect(x + ox - rad, y - rad - y, rad * 2, rad * 2); g.restore();
      }
    }
    return FOG;
  }
  /* o: {y (0..1 of H, band centre), h (band height in H), par, vx, alpha} */
  MS.mist = function (c, t, s, o) {
    const f = fogTile(), bh = (o.h || .5) * H, sc = bh / f.height, tw = f.width * sc;
    const off = mod(-(t * (o.vx || 14) * u + s * (o.par || .5) * W * .6), tw);
    c.save(); c.globalAlpha = o.alpha == null ? .6 : o.alpha; const y = (o.y || .8) * H - bh / 2;
    for (let x = -off; x < W; x += tw) c.drawImage(f, x, y, tw + 1, bh);
    c.restore();
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
    c.shadowColor = 'rgba(5,8,12,.7)'; c.shadowBlur = 34 * u; c.shadowOffsetY = 12 * u; c.fillStyle = '#0b1118'; c.fillRect(-R.w / 2, -hh / 2, R.w, hh);
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.save(); c.beginPath(); c.rect(-R.w / 2, -hh / 2, R.w, hh); c.clip();
    if (w.content) w.content(c, R, p, t, X);
    else { const img = MS.img(w.img(p, t, X)); MS.coverInto(c, img, -R.w / 2, -R.h / 2, R.w, R.h, 1.02 + (w.push || 0) * clamp(p), 0, 0); }
    const gv = c.createLinearGradient(0, -R.h / 2, 0, R.h / 2); gv.addColorStop(0, 'rgba(20,27,38,.38)'); gv.addColorStop(.25, 'rgba(20,27,38,0)'); gv.addColorStop(.75, 'rgba(20,27,38,0)'); gv.addColorStop(1, 'rgba(20,27,38,.42)');
    c.fillStyle = gv; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h);
    c.globalCompositeOperation = 'soft-light'; c.fillStyle = 'rgba(110,137,163,.32)'; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h); c.globalCompositeOperation = 'source-over';
    if (flash > 0) { c.fillStyle = 'rgba(238,241,242,' + clamp(flash * 1.1) + ')'; c.fillRect(-R.w / 2, -R.h / 2, R.w, R.h); }
    c.restore();
    c.shadowColor = 'rgba(110,137,163,.75)'; c.shadowBlur = 14 * u; c.strokeStyle = 'rgba(197,208,218,.95)'; c.lineWidth = 2.4 * u; c.strokeRect(-R.w / 2, -hh / 2, R.w, hh);
    c.shadowBlur = 0; c.strokeStyle = 'rgba(61,76,94,.7)'; c.lineWidth = 1 * u; if (hh > 20 * u) c.strokeRect(-R.w / 2 + 6 * u, -hh / 2 + 6 * u, R.w - 12 * u, hh - 12 * u);
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
    MS.scenes.forEach((sc, i) => { sc.i = i; sc.start = s0; s0 += sc.len; sc.end = s0; sc.X = { sc, ss: {} }; });
    TOTAL = s0;
  }
  function resetScene(sc) { sc.X.ss = {}; (sc.windows || []).forEach(w => { if (w._st) { w._st.on = false; w._st.t1 = -9; w._st.o = 0; } }); }

  const bufs = []; let main, mainCv, bloomCv, grainCv, vigCv;
  function drawScene(b, sc, s, t) {
    const X = sc.X, c = bufs[b].c, p = (s - sc.start) / sc.len; X.W = W; X.H = H; X.u = u;
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

  /* ---------------- transitions (9, each its own gradient) ---------------- */
  const TR = MS.transitions = {};
  let tcv = null; const tmask = () => { if (!tcv || tcv.width !== W || tcv.height !== H) tcv = mkc(W, H); const g = tcv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H); return g; };
  const RT = {};   // cached random tables
  const tab = (id, n, f) => RT[id] || (RT[id] = (r => Array.from({ length: n }, () => f(r)))(rng(MS.hash(id))));
  const skewPoly = (c, x, cwid, k, y1, y2) => { c.moveTo(x - k * y1, y1); c.lineTo(x + cwid - k * y1, y1); c.lineTo(x + cwid - k * y2, y2); c.lineTo(x - k * y2, y2); c.closePath(); };

  /* 1->2 streak: thin slanted rain streaks fall in turns; gradient slate -> rain blue covers the page, B appears behind the tails */
  TR.streak = (c, A, B, tt, t) => {
    const cwid = W / 38, k = .17, ext = 70 * u, H2 = H + ext, N = Math.ceil((W + k * H2) / cwid) + 2, D = tab('streak', 120, r => r());
    c.drawImage(A, 0, 0);
    const reg = new Path2D(); const ys = [];
    for (let i = -1; i < N; i++) {
      const d = D[(i + 1) % 120], q = clamp((tt - d * .4) / .6), yb = H2 * clamp(q * 2), yt = H2 * clamp(q * 2 - 1); ys.push([i, yt, yb, d]);
      if (yt > 1) { const x = i * cwid, p = new Path2D(); p.moveTo(x, 0); p.lineTo(x + cwid + 1, 0); p.lineTo(x + cwid + 1 - k * yt, yt); p.lineTo(x - k * yt, yt); p.closePath(); reg.addPath(p); }
    }
    c.save(); c.clip(reg); c.drawImage(B, 0, 0); c.restore();
    for (const [i, yt, yb] of ys) {
      if (yb - yt < 1) continue; const x = i * cwid;
      const g = c.createLinearGradient(0, yt, 0, yb); g.addColorStop(0, 'rgba(38,49,63,.96)'); g.addColorStop(.55, 'rgba(61,76,94,.96)'); g.addColorStop(1, 'rgba(110,137,163,.98)');
      c.save(); c.beginPath(); skewPoly(c, x, cwid + 1, k, yt, yb); c.fillStyle = g; c.fill();
      if (yb < H2 - 2) { c.fillStyle = 'rgba(197,208,218,.9)'; c.fillRect(x - k * yb + cwid * .15, yb - 3 * u, cwid * .7, 3 * u); }
      c.restore();
    }
  };

  /* 2->3 fogwipe: fogged glass, wiped with a palm arc; mist -> transparent radial gradient */
  TR.fogwipe = (c, A, B, tt, t) => {
    const fogA = sm(tt / .4), w = clamp((tt - .4) / .6);
    c.drawImage(tt < .4 ? A : B, 0, 0);
    const g = tmask(), gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(197,208,218,.96)'); gr.addColorStop(1, 'rgba(150,170,188,.96)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalAlpha = .35; MS.mist(g, t, 0, { y: .5, h: 1.1, alpha: 1, vx: 3 }); g.globalAlpha = 1;
    if (w > 0) {
      g.globalCompositeOperation = 'destination-out'; const n = 14, wp = eo(w), R0 = .2 * H;
      for (let k = 0; k <= n; k++) {
        const uu = k / n * wp, a = (1 - uu) * (1 - uu), b = 2 * uu * (1 - uu), cc = uu * uu;
        const x = a * W * .1 + b * W * .5 + cc * W * .9, y = a * H * .8 + b * H * 1.0 + cc * H * .26, R = R0 * (1 + .5 * Math.sin(k * 1.7));
        const rg = g.createRadialGradient(x, y, 0, x, y, R); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(.6, 'rgba(0,0,0,.92)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - R, y - R, R * 2, R * 2);
      }
      const Ra = sm((w - .5) / .5) * H * 1.5; if (Ra > 2) { const x = W * .9, y = H * .26, rg = g.createRadialGradient(x, y, 0, x, y, Ra); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(.8, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
      g.globalCompositeOperation = 'source-over';
    }
    c.save(); c.globalAlpha = tt < .4 ? fogA : 1; c.drawImage(tcv, 0, 0); c.restore();
  };

  /* 3->4 umbrella: eight canopy panels rotate open and shut; night -> steel radial gradient */
  TR.umbrella = (c, A, B, tt) => {
    const cx = W / 2, cy = H * .5, R = Math.hypot(W, H) * .62, N = 8, seg = TAU / N, rot = (tt - .5) * .7, second = tt >= .5;
    c.drawImage(second ? B : A, 0, 0);
    const gr = c.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, '#141B26'); gr.addColorStop(.5, '#26313F'); gr.addColorStop(1, '#3D4C5E');
    for (let i = 0; i < N; i++) {
      const cov = second ? 1 - sm(((tt - .5) * 2 - i * .06) / .7) : sm((tt * 2 - i * .06) / .7); if (cov < .004) continue;
      const a0 = -Math.PI / 2 + i * seg + rot, sp = seg * cov + (cov > .99 ? .006 : 0), a1 = second ? a0 + seg - sp : a0;
      c.save(); c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a1, a1 + sp); c.closePath(); c.fillStyle = gr; c.fill();
      c.strokeStyle = 'rgba(197,208,218,' + (.45 * cov) + ')'; c.lineWidth = 1.6 * u; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); c.stroke();
      c.strokeStyle = 'rgba(110,137,163,' + (.3 * cov) + ')'; c.lineWidth = 1 * u; c.beginPath(); c.arc(cx, cy, R * .42, a1, a1 + sp); c.stroke(); c.beginPath(); c.arc(cx, cy, R * .22, a1, a1 + sp); c.stroke();
      c.restore();
    }
    const e = Math.sin(Math.PI * clamp(tt)); MS.glow(c, cx, cy, 90 * u, '197,208,218', .6 * e, 'lighter');
  };

  /* 4->5 ripple: concentric rings from one point; rain blue -> mist */
  TR.ripple = (c, A, B, tt) => {
    const cx = W * .5, cy = H * .6, R = eo(tt) * Math.hypot(W, H) * .95, fade = 1 - sm((tt - .78) / .22);
    c.drawImage(A, 0, 0);
    if (R > 1) { c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip(); c.drawImage(B, 0, 0); c.restore(); }
    const bw = 110 * u, g = c.createRadialGradient(cx, cy, Math.max(0, R - bw), cx, cy, R + 24 * u);
    g.addColorStop(0, 'rgba(110,137,163,0)'); g.addColorStop(.5, 'rgba(110,137,163,' + .55 * fade + ')'); g.addColorStop(.86, 'rgba(197,208,218,' + .9 * fade + ')'); g.addColorStop(1, 'rgba(197,208,218,0)');
    c.save(); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
    for (let j = 1; j < 6; j++) {
      const rj = R - j * (30 + j * 12) * u; if (rj < 3) break;
      c.save(); c.strokeStyle = (j % 2 ? 'rgba(197,208,218,' : 'rgba(110,137,163,') + (.8 - j * .12) * fade + ')'; c.lineWidth = Math.max(1, (4.5 - j * .6) * u); c.beginPath(); c.arc(cx, cy, rj, 0, TAU); c.stroke(); c.restore();
    }
    MS.glow(c, cx, cy, 120 * u * sm(1 - tt), '197,208,218', .6, 'lighter');
  };

  /* 5->6 bleed: watercolour ink spreads top -> bottom; steel -> slate, grainy edge */
  const bleedMask = (g, f, grow, tbl) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, Math.max(0, f - .24 * H));
    tbl.forEach((b, j) => {
      const x = (j + .5) / tbl.length * W + (b[0] - .5) * W * .05, y = f - b[1] * .26 * H, R = (.05 + b[2] * .09) * H * grow;
      const gr = g.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.62, 'rgba(0,0,0,.96)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - R, y - R, R * 2, R * 2);
    });
  };
  TR.bleed = (c, A, B, tt) => {
    const f = lerp(-.1, 1.32, eo(tt)) * H, tbl = tab('bleed', 54, r => [r(), r(), r()]), dots = tab('bleed_d', 190, r => [r(), r(), r(), r()]);
    c.drawImage(A, 0, 0);
    let g = tmask(); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3D4C5E'); gr.addColorStop(1, '#26313F'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-in'; bleedMask(g, f + .08 * H, 1.25, tbl); c.drawImage(tcv, 0, 0);
    g = tmask(); g.drawImage(B, 0, 0); g.globalCompositeOperation = 'destination-in'; bleedMask(g, f, 1, tbl); c.drawImage(tcv, 0, 0);
    c.save(); for (const d of dots) { const y = f + (d[1] - .35) * .3 * H; c.fillStyle = d[3] > .5 ? 'rgba(38,49,63,' + (.3 + d[2] * .5) + ')' : 'rgba(110,137,163,' + (.25 + d[2] * .4) + ')'; c.beginPath(); c.arc(d[0] * W, y, (.8 + d[2] * 2.4) * u, 0, TAU); c.fill(); } c.restore();
  };

  /* 6->7 headlight: a light bar sweeps across: white -> yellow -> transparent */
  TR.headlight = (c, A, B, tt) => {
    const xf = lerp(-.25, 1.45, sm(tt)) * W; c.drawImage(A, 0, 0);
    c.save(); c.beginPath(); c.rect(0, 0, Math.max(0, xf), H); c.clip(); c.drawImage(B, 0, 0); c.restore();
    const x0 = xf - .6 * W, g = c.createLinearGradient(x0, 0, xf + .1 * W, 0), e = Math.sin(Math.PI * clamp(tt)) * .4 + .6;
    g.addColorStop(0, 'rgba(242,194,48,0)'); g.addColorStop(.45, 'rgba(242,194,48,' + .5 * e + ')'); g.addColorStop(.75, 'rgba(255,226,140,' + .85 * e + ')'); g.addColorStop(.92, 'rgba(255,255,255,' + e + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.save(); c.fillStyle = g; c.fillRect(x0, 0, xf + .1 * W - x0, H); c.restore();
    for (const yy of [.58, .67]) MS.glow(c, xf, H * yy, H * .3, '255,244,210', .75 * e, 'lighter');
    const st = c.createLinearGradient(xf - .7 * W, 0, xf + .15 * W, 0); st.addColorStop(0, 'rgba(255,255,255,0)'); st.addColorStop(.9, 'rgba(255,255,255,.85)'); st.addColorStop(1, 'rgba(255,255,255,0)');
    c.save(); c.fillStyle = st; c.globalCompositeOperation = 'lighter'; c.fillRect(xf - .7 * W, H * .625 - 3 * u, .85 * W, 6 * u); c.restore();
  };

  /* 7->8 drip: a curtain of paint drops runs down; night -> steel */
  TR.drip = (c, A, B, tt) => {
    const N = 26, T = tab('drip', N, r => [r(), r(), r(), r()]), H2 = H + 90 * u; c.drawImage(A, 0, 0);
    const cols = T.map((d, i) => { const w = (.1 + d[1] * .1) * W, x = (i + d[0] * .6) / N * W * 1.06 - .02 * W, q = clamp((tt - d[2] * .3) / .7); return { x, w, yb: H2 * clamp(q * 2) * (.9 + d[3] * .1), yt: H2 * clamp(q * 2 - 1) * (.9 + d[3] * .1) }; });
    const reg = new Path2D(); cols.forEach(o => { if (o.yt > 1) reg.rect(o.x - o.w / 2, 0, o.w, o.yt); });
    c.save(); c.clip(reg); c.drawImage(B, 0, 0); c.restore();
    for (const o of cols) {
      if (o.yb - o.yt < 1) continue; const g = c.createLinearGradient(0, o.yt, 0, o.yb); g.addColorStop(0, '#141B26'); g.addColorStop(.6, '#26313F'); g.addColorStop(1, '#3D4C5E');
      const r = o.w / 2; c.save(); c.fillStyle = g; c.beginPath(); c.rect(o.x - r, o.yt, o.w, Math.max(0, o.yb - o.yt - r)); c.fill();
      c.beginPath(); c.arc(o.x, Math.max(o.yt, o.yb - r), r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(197,208,218,.28)'; c.lineWidth = 2 * u; c.beginPath(); c.moveTo(o.x - r * .45, o.yt + 4 * u); c.lineTo(o.x - r * .45, Math.max(o.yt + 4 * u, o.yb - r)); c.stroke();
      c.fillStyle = 'rgba(197,208,218,.45)'; c.beginPath(); c.ellipse(o.x - r * .3, Math.max(o.yt, o.yb - r * 1.1), r * .16, r * .28, 0, 0, TAU); c.fill(); c.restore();
    }
  };

  /* 8->9 rise: rain streaks lift from the bottom to the top; mist -> rain blue */
  TR.rise = (c, A, B, tt) => {
    const N = 64, cwid = W / N, T = tab('rise', N, r => [r(), r(), r()]); c.drawImage(A, 0, 0);
    const reg = new Path2D(), fr = [];
    for (let i = 0; i < N; i++) { const d = T[i], q = clamp((tt - d[0] * .38) / .62), yf = H - (H + 60 * u) * eo(q), L = (.16 + d[1] * .28) * H; fr.push([i, yf, L, d]); if (yf < H) reg.rect(i * cwid - .5, Math.max(0, yf), cwid + 1, H - Math.max(0, yf)); }
    c.save(); c.clip(reg); c.drawImage(B, 0, 0); c.restore();
    for (const [i, yf, L, d] of fr) {
      if (yf > H + 5 * u || yf < -L - 10 * u) continue; const x = i * cwid, g = c.createLinearGradient(0, yf - L, 0, yf);
      g.addColorStop(0, 'rgba(197,208,218,0)'); g.addColorStop(.55, 'rgba(197,208,218,.5)'); g.addColorStop(1, 'rgba(110,137,163,.96)');
      c.fillStyle = g; c.fillRect(x, yf - L, cwid + .5, L); c.fillStyle = 'rgba(238,241,242,.95)'; c.fillRect(x + cwid * .3, yf - 2 * u, cwid * .4, 4 * u);
      c.fillStyle = 'rgba(238,241,242,' + (.25 + d[2] * .4) + ')'; c.fillRect(x + cwid * .45, yf - L * (1.2 + d[2]), 1.2 * u, L * (1.0 + d[2]));
    }
  };

  /* 9->10 flash: lightning, white -> cold blue, with a forked bolt */
  TR.flash = (c, A, B, tt) => {
    c.drawImage(tt < .42 ? A : B, 0, 0);
    const bump = (a, w) => clamp(1 - Math.abs(tt - a) / w), wht = Math.max(sm((tt - .3) / .07) * (1 - sm((tt - .42) / .1)), .6 * bump(.55, .05));
    if (tt > .24 && tt < .62) { const bl = Math.max(bump(.34, .08), bump(.55, .05) * .8); if (bl > 0) MS.drawBolt(c, MS.boltPoints(5, W * .62, -10 * u, W * .5, H * .78, 1), clamp(bl * 1.4)); }
    if (wht > .002) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,255,' + clamp(wht) + ')'); g.addColorStop(.6, 'rgba(210,228,248,' + clamp(wht) + ')'); g.addColorStop(1, 'rgba(150,190,235,' + clamp(wht * .95) + ')'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    const cold = (1 - sm((tt - .45) / .55)) * sm((tt - .3) / .15) * .4; if (cold > .002) { c.fillStyle = 'rgba(160,196,236,' + cold + ')'; c.fillRect(0, 0, W, H); }
  };

  /* ---------------- post ---------------- */
  function buildStatic() {
    vigCv = mkc(W, H); const g = vigCv.getContext('2d'), r = g.createRadialGradient(W / 2, H * .46, Math.min(W, H) * .32, W / 2, H / 2, Math.max(W, H) * .78);
    r.addColorStop(0, 'rgba(8,12,18,0)'); r.addColorStop(1, 'rgba(8,12,18,.62)'); g.fillStyle = r; g.fillRect(0, 0, W, H);
    grainCv = []; const rn = rng(9); for (let k = 0; k < 4; k++) {
      const c = mkc(192, 192), gg = c.getContext('2d'), im = gg.createImageData(192, 192);
      for (let i = 0; i < im.data.length; i += 4) { const v = 118 + rn() * 20 | 0; im.data[i] = im.data[i + 1] = v; im.data[i + 2] = v + 5; im.data[i + 3] = 255; } gg.putImageData(im, 0, 0); grainCv.push(c);
    }
    bloomCv = mkc(Math.ceil(W / 4), Math.ceil(H / 4));
  }
  function post(c, g, t, s) {
    c.save();                                    // cold grade
    c.globalCompositeOperation = 'soft-light';
    const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(110,137,163,' + .42 * g.grade + ')'); gr.addColorStop(1, 'rgba(20,27,38,' + .7 * g.grade + ')');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'color'; c.fillStyle = 'rgba(61,76,94,' + .14 * g.grade + ')'; c.fillRect(0, 0, W, H);
    c.restore();
    if (MS.hasFilter && g.bloom > 0) {
      const b = bloomCv.getContext('2d'); b.save(); b.clearRect(0, 0, bloomCv.width, bloomCv.height); filt(b, 'contrast(1.9) brightness(.72)'); b.drawImage(mainCv, 0, 0, bloomCv.width, bloomCv.height); b.restore();
      c.save(); filt(c, 'blur(' + (7 * u) + 'px)'); c.globalCompositeOperation = 'screen'; c.globalAlpha = g.bloom; c.drawImage(bloomCv, 0, 0, W, H); c.restore();
    }
    c.drawImage(vigCv, 0, 0);
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = .15 * g.grain;
    const gcv = grainCv[Math.floor(t * 14) % 4], ox = (Math.floor(t * 31) * 53) % 192, oy = (Math.floor(t * 17) * 29) % 192;
    c.fillStyle = c.createPattern(gcv, 'repeat'); c.translate(-ox, -oy); c.fillRect(ox, oy, W, H); c.restore();
  }
  const GR0 = { grade: 1, bloom: .4, grain: 1 };

  /* ---------------- DOM items ---------------- */
  /* Text is split into spans ONCE (mkItem); every style is computed per frame from (t - it.t0) -> deterministic, no CSS keyframes. */
  let ui; const ITEMS = [];
  function bubbleSvg(d) {
    const ell = 'M2 32A48 29 0 1 1 98 32A48 29 0 1 1 2 32Z', tail = d.tail || 'br';
    if (d.cls && /voice/.test(d.cls))            // voice from off-screen: square, dashed vertical edges, no tail
      return '<svg class="bg" viewBox="0 0 100 74" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="70" class="fillo"/><line x1="2" y1="2" x2="98" y2="2" class="stk"/><line x1="2" y1="72" x2="98" y2="72" class="stk"/><line x1="2" y1="2" x2="2" y2="72" class="dash"/><line x1="98" y1="2" x2="98" y2="72" class="dash"/></svg>';
    if (d.type === 'thought') return '<svg class="bg" viewBox="0 0 100 64" preserveAspectRatio="none"><path d="' + ell + '" class="fz"/><path d="' + ell + '" class="fill"/></svg>';
    if (d.type === 'shock') {
      let pts = []; for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, r = i % 2 ? 32 : 47; pts.push((50 + Math.cos(a) * r * (i % 2 ? 1.1 : 1.05)).toFixed(1) + ',' + (32 + Math.sin(a) * r * .66).toFixed(1)); }
      return '<svg class="bg" viewBox="0 0 100 64" preserveAspectRatio="none"><polygon points="' + pts.join(' ') + '" class="fill"/></svg>';
    }
    const T = { br: ['70,58 86,70 80,48', ''], bl: ['30,58 14,70 20,48', ''], r: ['97,38 110,44 96,30', ''], l: ['3,38 -10,44 4,30', ''] }[tail]; let t = '';
    if (T) { const pp = T[0].split(' '); t = '<polygon points="' + T[0] + ' ' + (tail[tail.length - 1] === 'r' ? '66,52' : '34,52') + '" class="fillo"/><polyline points="' + pp.join(' ') + '" class="stk"/>'; }
    return '<svg class="bg" viewBox="0 0 100 74" preserveAspectRatio="none"><path d="' + ell + '" class="fill"/>' + t + '</svg>';
  }
  const mkSpan = (cls, txt, tag) => { const e = document.createElement(tag || 'span'); e.className = cls; e.textContent = txt; return e; };
  function wrapLines(text, lc) {
    const out = []; let cur = '';
    text.split(/\s+/).filter(Boolean).forEach(w => { if (cur && (cur + ' ' + w).length > lc) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) out.push(cur); return out;
  }
  function mkItem(sc, d) {
    const el = document.createElement('div'), T = d.type, cls = d.cls || ''; el.className = 'it ' + T + (cls ? ' ' + cls : '');
    if (T === 'bub' || T === 'thought' || T === 'shock') el.innerHTML = bubbleSvg(d);
    const tx = document.createElement('div'); tx.className = 'tx'; el.appendChild(tx);
    const mode = (T === 'cap' && /big/.test(cls)) ? 'letters' : T === 'cap' ? 'words' : (T === 'bub' || T === 'thought') ? 'lines' : T === 'sfx' ? 'tremble' : T;
    const sp = []; let lines = null;
    if (mode === 'words') { const ws = d.text.split(/\s+/).filter(Boolean); ws.forEach((w, i) => { const e = mkSpan('wd', w); tx.appendChild(e); sp.push(e); if (i < ws.length - 1) tx.appendChild(document.createTextNode(' ')); }); }
    else if (mode === 'letters' || mode === 'tremble') {
      const ws = d.text.split(/\s+/).filter(Boolean); ws.forEach((w, i) => { const g = mkSpan('wg', ''); [...w].forEach(ch => { const e = mkSpan('lt', ch); g.appendChild(e); sp.push(e); }); tx.appendChild(g); if (i < ws.length - 1) tx.appendChild(document.createTextNode(' ')); });
    }
    else if (mode === 'lines') { lines = d.lines || wrapLines(d.text, d.lc || 17); lines.forEach(l => { const e = mkSpan('ln', l, 'div'); tx.appendChild(e); sp.push(e); }); }
    else { const e = mkSpan('v', d.text); tx.appendChild(e); }
    if (lines) {                                  // default size from the text (override with d.w / d.h)
      const mx = Math.max(...lines.map(l => l.length)), voice = /voice/.test(cls);
      if (!d.w) d.w = Math.max(.3, mx * (voice ? .029 : .0245) + (voice ? .08 : .06));
      if (!d.h) d.h = (voice ? .06 : .07) + lines.length * (voice ? .05 : .062);
    }
    if (T === 'shock') { if (!d.w) d.w = .48; if (!d.h) d.h = .26; }
    let pen = null; if (T === 'end') { pen = document.createElement('i'); pen.className = 'pen'; el.appendChild(pen); }
    ui.appendChild(el); return { el, sc, d, mode, vis: false, t0: 0, tx, sp, pen };
  }
  function layoutItems() {
    ITEMS.forEach(it => {
      const d = it.d; it.el.style.width = (d.w * cw) + 'px'; if (d.h) it.el.style.height = (d.h * cw) + 'px';
      it.el.style.left = (d.x * cw) + 'px'; it.el.style.top = (d.y * ch) + 'px';
    });
  }
  const spring = a => { const x = Math.max(0, a - .04); return .55 + .45 * (1 - Math.exp(-9 * x) * Math.cos(16 * x)); };
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
        st.color = g > .02 ? 'rgb(' + Math.round(238 + 17 * g) + ',' + Math.round(241 + 14 * g) + ',' + Math.round(242 + 13 * g) + ')' : '';
        st.textShadow = '0 ' + (2 * k).toFixed(1) + 'px ' + (8 * k).toFixed(1) + 'px rgba(5,8,12,.95),0 0 ' + (g * 26 * k).toFixed(1) + 'px rgba(184,212,240,' + g.toFixed(2) + '),0 0 ' + (g * 10 * k).toFixed(1) + 'px #fff';
      }
    } else if (md === 'lines') {
      for (let i = 0; i < sp.length; i++) { const e = eo((a - .18 - i * .5) / .35), st = sp[i].style; st.opacity = e.toFixed(3); st.transform = 'translateY(' + ((1 - e) * 7 * k).toFixed(1) + 'px)'; }
      if (d.cls && /shiver/.test(d.cls) && a > .8) it.tx.style.transform = 'translate(' + (Math.sin(t * 41) * 1.3 * k).toFixed(2) + 'px,' + (Math.sin(t * 37 + 1) * 1.1 * k).toFixed(2) + 'px)';
    } else if (md === 'tremble') {
      for (let i = 0; i < sp.length; i++) { const e = eo((a - .05 - i * .07) / .3), st = sp[i].style; st.opacity = e.toFixed(3); st.transform = 'translate(' + (Math.sin(t * 31 + i * 1.9) * 1.4 * k).toFixed(2) + 'px,' + (Math.sin(t * 27 + i * 2.7) * 1.4 * k).toFixed(2) + 'px)'; }
    } else if (md === 'shock') {
      const e = eo(a / .12), dk = Math.exp(-a * 3) * 3 * k; it.tx.style.opacity = e.toFixed(3);
      it.tx.style.transform = 'translate(' + (Math.sin(a * 70) * dk).toFixed(2) + 'px,' + (Math.cos(a * 58) * dk * .7).toFixed(2) + 'px) scale(' + (1 + (1 - e) * .4 + Math.exp(-a * 4) * .08).toFixed(3) + ')';
    } else if (md === 'title') {
      const r = eo(a / 1.8) * 116 - 8, mk = 'linear-gradient(90deg,#000 ' + (r - 12).toFixed(1) + '%,transparent ' + r.toFixed(1) + '%)';
      it.tx.style.webkitMaskImage = mk; it.tx.style.maskImage = mk;
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
  MS.state = { s: 0 };
  let lastSel = -1;
  function frame(s, t) {
    s = clamp(s, 0, TOTAL); MS.state.s = s;
    const sel = select(s), scs = MS.scenes;
    if (!CAP && sel.a !== lastSel) { lastSel = sel.a; ensureIdx(sel.a, sel.b); }
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
    return sel;
  }
  /* deterministic capture entry: decode what the frame needs, then render */
  MS.render = async (s, t) => { const sel = select(clamp(s, 0, TOTAL)); await ensureIdx(sel.a, sel.b); frame(s, t); };

  /* ---------------- layout / scroll / loop ---------------- */
  function layout() {
    const vw = innerWidth, vh = innerHeight; cw = Math.min(vw, Math.round(vh * .5625)); ch = vh;
    DPR = CAP ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    let k = 1; const maxw = 960; if (cw * DPR > maxw) k = maxw / (cw * DPR);
    W = Math.round(cw * DPR * k); H = Math.round(ch * DPR * k); u = W / 720;
    const stage = document.getElementById('stage'); stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
    mainCv.width = W; mainCv.height = H; bufs.forEach(b => { b.cv.width = W; b.cv.height = H; });
    tcv = null; buildStatic();
    document.documentElement.style.setProperty('--u', (cw / 720) + 'px');
    layoutItems();
    const sp = document.getElementById('spacer'); if (sp && !CAP) sp.style.height = ((TOTAL + 1) * vh) + 'px';
  }

  MS.boot = async function () {
    try {
      ui = document.getElementById('ui'); mainCv = document.getElementById('cv'); main = mainCv.getContext('2d');
      MS.hasFilter = 'filter' in main;
      for (let i = 0; i < 2; i++) { const cv = mkc(8, 8); bufs.push({ cv, c: cv.getContext('2d') }); }
      indexAssets(); setup();
      MS.scenes.forEach(sc => (sc.items || []).forEach(d => ITEMS.push(mkItem(sc, d))));
      if (document.fonts && document.fonts.ready) { try { await document.fonts.load('italic 600 24px "Cormorant Garamond"', 'Бұл ә ғ қ ң ө ұ ү һ і'); await document.fonts.load('italic 700 24px "Cormorant Garamond"', 'Бұл'); await document.fonts.ready; } catch (e) { } }
      layout(); window.addEventListener('resize', () => { layout(); frame(sd, performance.now() / 1000); });
      await ensureIdx(0, 1);
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
  window.__ms = { ready: null, total: 0, segments: [], placeholders: [], render: (s, t) => MS.render(s, t), MS };
  window.addEventListener('error', e => { document.body.dataset.err = (e.message || '') + ' @' + (e.filename || '').slice(-30) + ':' + e.lineno; });
  window.addEventListener('unhandledrejection', e => { document.body.dataset.err = 'rej: ' + (e.reason && e.reason.stack || e.reason); });
})();
