/* =====================================================================
   manhwa-rain  /  paint/lib.js   —   shared painting kit (P1)  — p5.brush standalone build
   ---------------------------------------------------------------------
   Everything here is deterministic (seeded). All coordinates are FULL-SIZE
   (k.W x k.H) even in quick mode: layers are created at W*q px and their
   2D context is pre-scaled by q; brush passes apply brush.scale(q).

   REGISTER / RUN
     PAINT.register(key, {w,h,alpha,seed,kind}, async (k)=>canvas)
        k = { brush, W,H, q, rnd, lib:L, seed, key, alpha, meta }
        return a 2D canvas (use L.layer(); its pixel size is W*q x H*q).
        kind: plate|layer|eye|char|seq (default derived by PAINT.kindOf(key))
     PAINT.run(key, quick) -> canvas ;  PAINT.exportKey(key, quick) -> {webp,review,...}
     PAINT.keys() -> [{key,w,h,alpha,kind}]

   LAYERS (2D)
     L.layer(w=k.W, h=k.H)           -> ctx (ctx.fw,ctx.fh,ctx.q, ctx.canvas). Transparent.
     L.fill(ctx, color)              fill whole layer
     L.vgrad(ctx, stops, y0=0,y1=fh) vertical gradient fill [[0,'#hex'],[1,'#hex']] (stop colours may be rgba())
     L.grad(ctx,x0,y0,x1,y1,stops)   -> CanvasGradient
     L.px(ctx, v)                    -> v*ctx.q  (for filter blur radii etc.)
     L.blit(dst, src, {op,alpha,x,y,w,h,blur}) draw layer src onto dst in full-size coords
     L.blurred(ctx, px)              -> new layer with blurred copy
     L.copyLayer(ctx)                -> new layer, clone

   BRUSH PASSES (p5.brush -> composited into a 2D layer)
     L.paint(ctx, (b,rnd)=>{...}, {seed, op='source-over', alpha=1, blur=0})
        Runs ONE brush pass: load pooled brush canvas of the right size, clear (transparent),
        translate to top-left, scale(q), call fn(b, rnd), render(), draw into ctx. b = brush.
        Fills inside one pass bleed together (wet-in-wet); use separate passes for glazes.
     L.glaze(ctx, colors, (b,i,rnd,col)=>{...}, {seed, op, alpha, opacity=90, bleed=.2, tex=.5, border=.3})
        One pass per colour (3-6 glazes); sets b.fill(col,opacity)+bleed+texture+noStroke before each fn call.
     L.wc(b, color, opacity=110, bleed=.2, tex=.5, border=.3, split)  set watercolour fill state (+noStroke)
     L.poly(b, pts)                  b.polygon(pts)
     L.blobPts(cx,cy,rx,ry,{n,rough,rot,rnd}) -> noisy blob polygon
     L.smooth(pts, closed=false, steps=8)     Catmull-Rom resample -> dense point list
     L.ink(b, pts, {brush='rotring',color,w=.6,wig=.8,gap=.15,chunk:[40,160],rnd,press})
                                     broken ink polyline with wiggle (draws; call inside a pass)
     L.inkRect(b,x,y,w,h,opts)       broken ink rectangle

   SCENE PAINTERS
     L.sky(ctx,{top,mid,low,glow,glowY,glowA,seed,scale,contrast,strokes})   storm-cloud sky (opaque)
     L.fog(ctx,{y0,y1,color,a,seed,band})              soft fog band (alpha)
     L.skyline(ctx,{x0,x1,base,hmin,hmax,wmin,wmax,far(0..1 atmospheric),colTop,colBot,seed,
                    winDens,winSize,warm,ink,glazes,steps,antenna,fillDown}) -> [buildings]
        buildings with brush glazes, 2D windows, broken ink, rim light. bldg={x,y,w,h,top}
     L.windows(ctx, rect, {cw,ch,gx,gy,lit,warm,seed,alpha,far})  window grid for one facade, returns lit cells
     L.bokeh(ctx,{n,area:{x0,y0,x1,y1},rmin,rmax,colors:[[hex,w]..],a,ring,seed,op})
     L.rain(ctx,{n,ang=12,len:[a,b],color,w,rect,cone:{x,y,angle,spread,len,color},brush='2H',seed,alpha})  baked rain strokes
     L.wires(ctx,{pts:[[x,y]..],sag,color,hl,w})        hanging wire with highlight

   2D LIGHT PASSES (after brush passes)
     L.glow(ctx,x,y,r,color,a=1,op='screen')           radial glow
     L.lampCone(ctx,x,y,{angle=0(deg from down),spread=28,len=600,color,a=.3,blur=10})
     L.windowLight(ctx,x,y,w,h,color,{a=1,glow=…,glowA=.35})
     L.bloom(ctx,{blur=22,a=.35,boost=1.5,contrast=1.7,op='screen',rect})
     L.reflect(ctx,{y0,y1,x0=0,x1=fw,span,amp=5,freq=.07,darken=.45,alpha=.85,fade=.6,tint,op='screen',blur=1.2,clip})
        wet reflection: mirror + vertical compress + row ripple + darken of what is above y0 (span px)
     L.lightStreaks(ctx,[{x,y,r,color,a,len}],{amp=3,op='screen',blur})  vertical elongated light reflections
     L.grain(ctx,{a=.06,seed,atop=false})              paper grain / fibre (multiply)
     L.vignette(ctx,a=.35,color)                       edge darkening (source-atop if ctx alpha layer: pass atop:true)
     L.noiseAlpha(w,h,{sx,sy,oct,seed,lo,hi,color,res}) -> layer; alpha = smoothstep(noise)
     L.fbm(x,y,oct,seed) / L.noise(x,y,seed)           value noise 0..1

   COLOUR / RNG
     L.rng(seed) -> f() with f.range(a,b) f.int(a,b) f.pick(arr) f.chance(p) f.gauss() ; L.hex(h)->[r,g,b]
     L.mix(c1,c2,t)->'#rrggbb' ; L.shade(c,k) k>0 lighter, k<0 darker ; L.hsl(c,dh,ds,dl) ; L.rgba(c,a)->'rgba()'
     L.PAL = {night,slate,steel,rain,mist,paper,yellow,yellowDim,signal}

   ALPHA
     L.cleanAlpha(ctx,cut=3)   zero-out near-transparent pixels (kills ghost fringes), returns stats
     L.alphaStats(ctx)         {transparent,opaque,mean} fractions
   ===================================================================== */
(function () {
  'use strict';
  const PAINT = (window.PAINT = { reg: {}, order: [] });
  const L = (PAINT.lib = {});
  let CUR = null; // current k
  L.PAL = { night: '#141B26', slate: '#26313F', steel: '#3D4C5E', rain: '#6E89A3', mist: '#C5D0DA', paper: '#EEF1F2', yellow: '#F2C230', yellowDim: '#C9962A', signal: '#5FD3C0' };

  /* ------------------------------ rng / colour ------------------------------ */
  L.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = (lo, hi) => lo + (hi - lo) * f();
    f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length) % arr.length];
    f.chance = (p) => f() < p;
    f.gauss = () => { let u = 0, v = 0; while (!u) u = f(); while (!v) v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return f;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  L.clamp = clamp;
  L.hex = function (h) {
    if (Array.isArray(h)) return h;
    h = String(h).trim();
    if (h[0] === '#') { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    const m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  };
  const toHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  L.toHex = toHex;
  L.mix = (a, b, t) => { const A = L.hex(a), B = L.hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
  L.shade = (c, k) => (k >= 0 ? L.mix(c, '#ffffff', k) : L.mix(c, '#000000', -k));
  L.rgba = (c, a) => { const C = L.hex(c); return `rgba(${C[0] | 0},${C[1] | 0},${C[2] | 0},${a})`; };
  L.hsl = function (c, dh = 0, ds = 0, dl = 0) {
    let [r, g, b] = L.hex(c).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0, l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    h = (h + dh + 360) % 360; s = clamp(s + ds, 0, 1); l = clamp(l + dl, 0, 1);
    const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
  };

  /* ------------------------------ value noise ------------------------------ */
  function hash(ix, iy, s) { let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  L.noise = function (x, y, s = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  L.fbm = function (x, y, oct = 4, s = 0) { let a = .5, f = 1, t = 0, n = 0; for (let i = 0; i < oct; i++) { t += a * L.noise(x * f, y * f, s + i * 17); n += a; a *= .5; f *= 2.03; } return t / n; };
  const smooth01 = (lo, hi, v) => { const t = clamp((v - lo) / (hi - lo), 0, 1); return t * t * (3 - 2 * t); };
  L.smoothstep = smooth01;

  /* ------------------------------ layers (2D) ------------------------------ */
  L.layer = function (w, h) {
    const k = CUR; w = w || k.W; h = h || k.H; const q = k.q;
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * q)); c.height = Math.max(1, Math.round(h * q));
    const ctx = c.getContext('2d', { willReadFrequently: false });
    ctx.fw = w; ctx.fh = h; ctx.q = q; ctx.scale(q, q); ctx.imageSmoothingQuality = 'high';
    return ctx;
  };
  L.fill = (ctx, col) => { ctx.save(); ctx.fillStyle = col; ctx.fillRect(0, 0, ctx.fw, ctx.fh); ctx.restore(); };
  L.px = (ctx, v) => v * ctx.q;
  L.grad = function (ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; };
  L.vgrad = function (ctx, stops, y0 = 0, y1) { y1 = y1 === undefined ? ctx.fh : y1; ctx.save(); ctx.fillStyle = L.grad(ctx, 0, y0, 0, y1, stops); ctx.fillRect(0, y0, ctx.fw, y1 - y0); ctx.restore(); };
  L.blit = function (dst, src, o = {}) {
    dst.save(); dst.globalCompositeOperation = o.op || 'source-over'; dst.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    if (o.blur) dst.filter = `blur(${o.blur * dst.q}px)`;
    const c = src.canvas || src; dst.drawImage(c, o.x || 0, o.y || 0, o.w || (src.fw || dst.fw), o.h || (src.fh || dst.fh));
    dst.restore();
  };
  L.copyLayer = function (ctx) { const n = L.layer(ctx.fw, ctx.fh); n.save(); n.setTransform(1, 0, 0, 1, 0, 0); n.drawImage(ctx.canvas, 0, 0); n.restore(); return n; };
  L.blurred = function (ctx, px) { const n = L.layer(ctx.fw, ctx.fh); n.save(); n.setTransform(1, 0, 0, 1, 0, 0); n.filter = `blur(${px * ctx.q}px)`; n.drawImage(ctx.canvas, 0, 0); n.restore(); return n; };
  // value field -> small canvas (alpha = smoothstep(lo,hi,fbm)); res = px per sample (full-size units)
  L.noiseAlpha = function (w, h, o = {}) {
    const res = o.res || 6, sx = o.sx || 1, sy = o.sy || 1, oct = o.oct || 4, seed = o.seed || 1, lo = o.lo === undefined ? .35 : o.lo, hi = o.hi === undefined ? .7 : o.hi;
    const col = L.hex(o.color || '#ffffff'); const cw = Math.ceil(w / res), ch = Math.ceil(h / res);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d'); const im = x.createImageData(cw, ch); const d = im.data;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) { const n = L.fbm(i * res / 100 / sx, j * res / 100 / sy, oct, seed); const a = smooth01(lo, hi, n); const p = (j * cw + i) * 4; d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = a * 255 * (o.max === undefined ? 1 : o.max); }
    x.putImageData(im, 0, 0);
    const out = L.layer(w, h); out.imageSmoothingEnabled = true; out.drawImage(c, 0, 0, w, h); return out;
  };

  /* ------------------------------ brush pool / passes ------------------------------ */
  const pool = {}; let scaled = false;
  function getBrush(w, h) {
    const key = w + 'x' + h; const B = window.brush;
    if (!pool[key]) {
      pool[key] = B.createCanvas(w, h, { parent: document.getElementById('pool'), pixelDensity: 1 });
      if (!scaled) { B.scaleBrushes(5.4); B.angleMode(B.DEGREES); scaled = true; }
    } else B.load(pool[key]);
    return pool[key];
  }
  // NOTE (verified): p5.brush watercolour/ink behave like pigment on WHITE paper. Painting on a transparent brush
  // canvas yields (255,255,255,0) pixels that add white when composited. So every pass is painted on opaque white and:
  //   mode 'multiply' (default): pigment colours multiplied onto ctx  (darkening glazes, ink). For alpha layers add atop:true
  //   mode 'mask'  : pigment is read as DENSITY (darkness) -> alpha mask, tinted with o.color (string) or o.fill(ctx)->style,
  //                  composited with o.op. Use for LIGHT marks (rain, mist, highlights) and for anything on alpha layers.
  //                  In mask mode helpers force black pigment; opacity/brush strength = density.
  let MASK = false; const mcol = c => (MASK ? '#000000' : c); L.mcol = mcol;
  const tmpPool = {};
  function tmp2d(w, h) { const k = w + 'x' + h; if (!tmpPool[k]) { const c = document.createElement('canvas'); c.width = w; c.height = h; tmpPool[k] = c.getContext('2d', { willReadFrequently: true }); } const x = tmpPool[k]; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, w, h); return x; }
  L.paint = function (ctx, fn, o = {}) {
    const B = window.brush, k = CUR; const w = ctx.canvas.width, h = ctx.canvas.height, q = ctx.q; const mode = o.mode || 'multiply';
    const bc = getBrush(w, h); B.angleMode(B.DEGREES);
    const seed = o.seed !== undefined ? o.seed : 1 + Math.floor(k.rnd() * 1e6);
    B.seed(seed); B.noiseSeed(seed);
    const rnd = L.rng(seed ^ 0x9e3779b9);
    MASK = mode === 'mask';
    B.clear('#ffffff'); B.push(); B.translate(-w / 2, -h / 2); B.scale(q);
    try { fn(B, rnd); } finally { MASK = false; }
    B.pop(); B.render();
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    if (mode === 'mask') {
      const t = tmp2d(w, h); t.drawImage(bc, 0, 0); const im = t.getImageData(0, 0, w, h), d = im.data; const gain = o.gain || 1;
      const col = typeof o.color === 'string' ? L.hex(o.color) : [255, 255, 255];
      for (let i = 0; i < d.length; i += 4) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; const a = (255 - v) * gain; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a > 255 ? 255 : a; }
      t.putImageData(im, 0, 0);
      if (o.fill) { t.globalCompositeOperation = 'source-in'; t.fillStyle = o.fill(t); t.fillRect(0, 0, w, h); }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = o.atop ? 'source-atop' : (o.op || 'source-over'); ctx.globalAlpha = alpha;
      if (o.blur) ctx.filter = `blur(${o.blur * q}px)`; ctx.drawImage(t.canvas, 0, 0); ctx.restore();
    } else {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (o.atop) { const t = tmp2d(w, h); t.drawImage(ctx.canvas, 0, 0); t.globalCompositeOperation = 'multiply'; t.globalAlpha = alpha; if (o.blur) t.filter = `blur(${o.blur * q}px)`; t.drawImage(bc, 0, 0); t.filter = 'none'; t.globalAlpha = 1; t.globalCompositeOperation = 'destination-in'; t.drawImage(ctx.canvas, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(t.canvas, 0, 0); }
      else { ctx.globalCompositeOperation = o.op || 'multiply'; ctx.globalAlpha = alpha; if (o.blur) ctx.filter = `blur(${o.blur * q}px)`; ctx.drawImage(bc, 0, 0); }
      ctx.restore();
    }
  };
  L.wc = function (b, color, opacity = 110, bleed = .2, tex = .5, border = .3, split) {
    b.fill(mcol(color), opacity); b.fillBleed(bleed); if (split === undefined) b.fillTexture(tex, border); else b.fillTexture(tex, border, true, split); b.noStroke();
  };
  // glaze: one pass per colour. multiply mode: colours are pigments. mask mode: colours are the light/dark tint composited.
  L.glaze = function (ctx, colors, fn, o = {}) {
    const base = o.seed !== undefined ? o.seed : 1 + Math.floor(CUR.rnd() * 1e6);
    colors.forEach((col, i) => {
      const c = typeof col === 'string' ? { color: col } : col;
      L.paint(ctx, (b, rnd) => { L.wc(b, c.color, c.op || o.opacity || 90, c.bleed === undefined ? (o.bleed === undefined ? .2 : o.bleed) : c.bleed, c.tex === undefined ? (o.tex === undefined ? .5 : o.tex) : c.tex, o.border === undefined ? .3 : o.border); fn(b, i, rnd, c.color); }, { seed: base + i * 101, mode: o.mode, color: c.color, fill: c.fill, gain: o.gain, op: o.op, alpha: c.alpha === undefined ? o.alpha : c.alpha, blur: o.blur, atop: o.atop });
    });
  };
  L.poly = (b, pts) => b.polygon(pts);
  L.blobPts = function (cx, cy, rx, ry, o = {}) {
    const n = o.n || 18, rough = o.rough === undefined ? .18 : o.rough, rot = (o.rot || 0) * Math.PI / 180, r = o.rnd || CUR.rnd; const ph = r() * 9; const pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const k = 1 + rough * (L.noise(Math.cos(a) * 1.4 + ph, Math.sin(a) * 1.4 + ph, 5) - .5) * 2 + (r() - .5) * rough * .4; let x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
    return pts;
  };
  L.smooth = function (pts, closed = false, steps = 8) {
    const n = pts.length, out = []; const P = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2); for (let s = 0; s < steps; s++) { const t = s / steps, t2 = t * t, t3 = t2 * t; out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } }
    if (!closed) out.push(pts[n - 1].slice()); return out;
  };

  // broken ink polyline with wiggle. Call inside a brush pass.
  L.ink = function (b, pts, o = {}) {
    const r = o.rnd || CUR.rnd, wig = o.wig === undefined ? .8 : o.wig, gap = o.gap === undefined ? .15 : o.gap, ch = o.chunk || [40, 160];
    const seg = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); tot += l; }
    if (tot < 1) return;
    const at = d => { let a = 0; for (let i = 0; i < seg.length; i++) { if (d <= a + seg[i] || i === seg.length - 1) { const t = seg[i] ? clamp((d - a) / seg[i], 0, 1) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; } a += seg[i]; } };
    b.set(o.brush || 'rotring', mcol(o.color || '#0c1119'), o.w === undefined ? .6 : o.w);
    let d = 0;
    while (d < tot) {
      const len = r.range(ch[0], ch[1]); const d1 = Math.min(tot, d + len);
      if (!(r() < gap)) {
        const p = []; const nstep = Math.max(2, Math.ceil((d1 - d) / 22));
        for (let i = 0; i <= nstep; i++) { const q = at(d + (d1 - d) * i / nstep); const pr = o.press === false ? 1 : (.45 + .55 * Math.sin(Math.PI * i / nstep)); p.push([q[0] + (r() - .5) * 2 * wig, q[1] + (r() - .5) * 2 * wig, pr]); }
        b.spline(p, .4);
      }
      d = d1 + (r() < gap ? r.range(4, 30) : 0);
    }
  };
  L.inkRect = function (b, x, y, w, h, o = {}) {
    L.ink(b, [[x, y], [x + w, y]], o); L.ink(b, [[x + w, y], [x + w, y + h]], o); L.ink(b, [[x + w, y + h], [x, y + h]], o); L.ink(b, [[x, y + h], [x, y]], o);
  };

  /* ------------------------------ 2D light passes ------------------------------ */
  const GLOW_STOPS = [[0, 1], [.12, .62], [.3, .26], [.55, .08], [1, 0]];
  L.glow = function (ctx, x, y, r, color, a = 1, op = 'screen') {
    const C = L.hex(color), g = ctx.createRadialGradient(x, y, 0, x, y, r);
    GLOW_STOPS.forEach(s => g.addColorStop(s[0], `rgba(${C[0] | 0},${C[1] | 0},${C[2] | 0},${s[1] * a})`));
    ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  };
  L.lampCone = function (ctx, x, y, o = {}) {
    const ang = (o.angle || 0) * Math.PI / 180, sp = (o.spread || 28) * Math.PI / 180, len = o.len || 600, col = o.color || L.PAL.yellow, a = o.a === undefined ? .3 : o.a;
    const dx = Math.sin(ang), dy = Math.cos(ang); const C = L.hex(col);
    ctx.save(); ctx.globalCompositeOperation = o.op || 'screen'; ctx.filter = `blur(${(o.blur === undefined ? 10 : o.blur) * ctx.q}px)`;
    const g = ctx.createLinearGradient(x, y, x + dx * len, y + dy * len);
    g.addColorStop(0, `rgba(${C[0]},${C[1]},${C[2]},${a})`); g.addColorStop(.5, `rgba(${C[0]},${C[1]},${C[2]},${a * .35})`); g.addColorStop(1, `rgba(${C[0]},${C[1]},${C[2]},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
    const l = len / Math.cos(sp); ctx.lineTo(x + Math.sin(ang - sp) * l, y + Math.cos(ang - sp) * l); ctx.lineTo(x + Math.sin(ang + sp) * l, y + Math.cos(ang + sp) * l); ctx.closePath(); ctx.fill(); ctx.restore();
  };
  L.windowLight = function (ctx, x, y, w, h, color, o = {}) {
    const a = o.a === undefined ? 1 : o.a; const C = L.hex(color);
    const gr = o.glow === undefined ? Math.max(w, h) * 2.4 : o.glow;
    if (gr > 0) L.glow(ctx, x + w / 2, y + h / 2, gr, color, o.glowA === undefined ? .35 * a : o.glowA);
    ctx.save(); ctx.globalCompositeOperation = o.op || 'source-over';
    const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, `rgba(${C[0]},${C[1]},${C[2]},${a * .85})`); g.addColorStop(1, `rgba(${Math.min(255, C[0] + 20)},${Math.min(255, C[1] + 30)},${Math.min(255, C[2] + 40)},${a})`);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h); ctx.restore();
  };
  L.bloom = function (ctx, o = {}) {
    const t = L.layer(ctx.fw, ctx.fh); t.save(); t.setTransform(1, 0, 0, 1, 0, 0);
    t.filter = `blur(${(o.blur || 22) * ctx.q}px) brightness(${o.boost || 1.5}) contrast(${o.contrast || 1.7})`; t.drawImage(ctx.canvas, 0, 0); t.restore();
    ctx.save(); ctx.globalCompositeOperation = o.op || 'screen'; ctx.globalAlpha = o.a === undefined ? .35 : o.a; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(t.canvas, 0, 0); ctx.restore();
  };
  // wet reflection: mirror above y0 into [y0,y1]
  L.reflect = function (ctx, o) {
    const q = ctx.q, W = ctx.fw, y0 = o.y0, y1 = o.y1, x0 = o.x0 || 0, x1 = o.x1 === undefined ? W : o.x1, span = o.span || (y1 - y0) * 1.1, amp = o.amp === undefined ? 5 : o.amp, fr = o.freq || .07, st = o.step || 2;
    const src = L.copyLayer(ctx); const r = L.layer(ctx.fw, ctx.fh); const seed = o.seed || 3;
    r.save(); r.setTransform(1, 0, 0, 1, 0, 0);
    for (let y = y0; y < y1; y += st) {
      const t = (y - y0) / (y1 - y0), sy = (o.src0 === undefined ? y0 : o.src0) - t * span - st * span / (y1 - y0); if (sy < 0) break;
      const dx = (Math.sin(y * fr + seed) * .6 + Math.sin(y * fr * 2.7 + seed * 3) * .4) * amp * (.35 + t) + (L.noise(y * .05, seed, 2) - .5) * amp;
      r.globalAlpha = (o.alpha === undefined ? .85 : o.alpha) * (1 - t * (o.fade === undefined ? .6 : o.fade));
      r.drawImage(src.canvas, x0 * q, sy * q, (x1 - x0) * q, (st * span / (y1 - y0) + .5) * q, (x0 + dx) * q, y * q, (x1 - x0) * q, (st + .5) * q);
    }
    r.restore();
    r.save(); r.globalCompositeOperation = 'source-atop'; r.fillStyle = L.rgba(o.dark || '#0b111a', o.darken === undefined ? .45 : o.darken); r.fillRect(0, y0, W, y1 - y0);
    if (o.tint) { r.fillStyle = L.rgba(o.tint, o.tintA === undefined ? .25 : o.tintA); r.fillRect(0, y0, W, y1 - y0); } r.restore();
    ctx.save(); if (o.clip) { ctx.beginPath(); o.clip.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.clip(); }
    else { ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); }
    ctx.globalCompositeOperation = o.op || 'screen'; ctx.filter = `blur(${(o.blur === undefined ? 1.2 : o.blur) * q}px)`;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(r.canvas, 0, 0); ctx.restore();
  };
  L.lightStreaks = function (ctx, lights, o = {}) {
    const t = L.layer(ctx.fw, ctx.fh); const amp = o.amp === undefined ? 3 : o.amp; const rowH = o.row || 3;
    lights.forEach((l, i) => {
      const C = L.hex(l.color || L.PAL.yellow), len = l.len || 160, r = l.r || 10, a = l.a === undefined ? .5 : l.a;
      for (let y = 0; y < len; y += rowH) {
        const u = y / len, n = L.noise(y * .045, i * 7.3, 9), w = r * (.5 + .9 * n) * (1 - u * .45), al = a * Math.pow(1 - u, 1.25) * (.45 + .75 * n);
        const dx = Math.sin(y * .09 + i * 2.1) * amp * (.3 + u) + (L.noise(y * .03, i, 4) - .5) * amp;
        const g = t.createLinearGradient(l.x + dx - w, 0, l.x + dx + w, 0); const c = `${C[0] | 0},${C[1] | 0},${C[2] | 0}`;
        g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(.5, `rgba(${c},${al})`); g.addColorStop(1, `rgba(${c},0)`);
        t.fillStyle = g; t.fillRect(l.x + dx - w, l.y + y, w * 2, rowH + .6);
      }
    });
    ctx.save(); ctx.globalCompositeOperation = o.op || 'screen'; ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${(o.blur === undefined ? 1.5 : o.blur) * ctx.q}px)`; ctx.drawImage(t.canvas, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = .5; ctx.filter = `blur(${8 * ctx.q}px)`; ctx.drawImage(t.canvas, 0, 0); ctx.restore();
  };
  const grainTiles = {};
  L.grain = function (ctx, o = {}) {
    const seed = o.seed || 7; if (!grainTiles[seed]) {
      const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const im = x.createImageData(S, S); const r = L.rng(seed);
      for (let i = 0; i < S * S; i++) { const v = 232 + r() * 23 - (r() < .04 ? 25 : 0); im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
      x.putImageData(im, 0, 0); x.strokeStyle = 'rgba(120,120,120,.10)'; x.lineWidth = .7;
      for (let i = 0; i < 70; i++) { const px = r() * S, py = r() * S, a = r() * 6.28, l = 6 + r() * 16; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * .5 + r() * 4, py + Math.sin(a) * l * .5 + r() * 4, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
      grainTiles[seed] = c;
    }
    const pat = ctx.createPattern(grainTiles[seed], 'repeat'); ctx.save();
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = o.a === undefined ? .06 : o.a; if (o.atop) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = (o.a === undefined ? .06 : o.a) * 1.4; }
    ctx.fillStyle = pat; ctx.fillRect(0, 0, ctx.fw, ctx.fh); ctx.restore();
  };
  L.vignette = function (ctx, a = .35, o = {}) {
    const W = ctx.fw, H = ctx.fh, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.hypot(W, H) * .55);
    g.addColorStop(0, 'rgba(5,8,14,0)'); g.addColorStop(1, `rgba(5,8,14,${a})`);
    ctx.save(); ctx.globalCompositeOperation = o.atop ? 'source-atop' : 'source-over'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  };

  // hand-made edge wobble: SVG turbulence displacement applied to the whole layer (keeps alpha)
  const svgF = {};
  L.rough = function (ctx, o = {}) {
    const q = ctx.q, amp = (o.amp === undefined ? 3 : o.amp) * q, f1 = (o.freq || .02) / q, f2 = (o.freq2 || .14) / q, seed = o.seed || 3; const id = `rf_${Math.round(amp * 10)}_${Math.round(f1 * 1e4)}_${seed}`;
    if (!svgF[id]) { const d = document.createElement('div'); d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden'; d.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${f1} ${f1}" numOctaves="2" seed="${seed}" result="a"/><feTurbulence type="fractalNoise" baseFrequency="${f2} ${f2}" numOctaves="2" seed="${seed + 5}" result="b"/><feBlend in="a" in2="b" mode="screen" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${amp * 2}" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`; document.body.appendChild(d); svgF[id] = 1; }
    const t = L.copyLayer(ctx); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.filter = `url(#${id})`; ctx.drawImage(t.canvas, 0, 0); ctx.restore();
  };

  /* ------------------------------ alpha ------------------------------ */
  L.alphaStats = function (ctx) {
    const c = ctx.canvas || ctx; const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0);
    const d = x.getImageData(0, 0, t.width, t.height).data; let z = 0, o = 0, s = 0; const n = d.length / 4; for (let i = 3; i < d.length; i += 4) { if (d[i] < 3) z++; else if (d[i] > 250) o++; s += d[i]; }
    return { transparent: z / n, opaque: o / n, mean: s / n / 255 };
  };
  L.cleanAlpha = function (ctx, cut = 3) {
    const c = ctx.canvas; const x = c.getContext('2d', { willReadFrequently: true });
    const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] < cut) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; }
    x.putImageData(im, 0, 0); return L.alphaStats(ctx);
  };

  /* ------------------------------ sky ------------------------------ */
  L.sky = function (ctx, o = {}) {
    const W = ctx.fw, H = ctx.fh, seed = o.seed || 11, P = L.PAL;
    const top = o.top || '#0d131c', mid = o.mid || '#26313F', low = o.low || '#3D4C5E';
    L.vgrad(ctx, [[0, top], [.55, mid], [1, low]]);
    // fbm cloud field (low-res) -> tone map
    const res = 6, cw = Math.ceil(W / res), ch = Math.ceil(H / res); const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d'); const im = x.createImageData(cw, ch); const d = im.data;
    const sc = o.scale || 1, dark = L.hex(o.cloudDark || '#10161f'), light = L.hex(o.cloudLight || '#56677c'), glowC = L.hex(o.glow || '#8a6c43');
    const gy = o.glowY === undefined ? H : o.glowY, gA = o.glowA === undefined ? .35 : o.glowA, con = o.contrast || 1.25;
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const X = i * res / 100 / sc, Y = j * res / 100 / sc; const wx = L.fbm(X * .6 + 5, Y * .6, 3, seed + 3) * 2.2;
      let n = L.fbm(X * .5 + wx, Y * 1.5 + wx * .4, 5, seed); n = clamp((n - .5) * con + .5, 0, 1);
      const yy = j * res; const glow = Math.pow(clamp(1 - Math.abs(yy - gy) / (H * .55), 0, 1), 2) * gA;
      const t = n * (.65 + .35 * (1 - yy / H * .5)); // lighter ridges
      let r = dark[0] + (light[0] - dark[0]) * t, g = dark[1] + (light[1] - dark[1]) * t, b = dark[2] + (light[2] - dark[2]) * t;
      const gl = glow * (.3 + .9 * (1 - n)); r += (glowC[0] - r) * gl; g += (glowC[1] - g) * gl; b += (glowC[2] - b) * gl;
      const p = (j * cw + i) * 4; d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255 * (o.cloudA === undefined ? .92 : o.cloudA);
    }
    x.putImageData(im, 0, 0); ctx.save(); ctx.imageSmoothingEnabled = true; ctx.filter = `blur(${3 * ctx.q}px)`; ctx.drawImage(c, -10, -10, W + 20, H + 20); ctx.restore();
    // painterly passes: dark pigment glazes (multiply), light wash ridges + charcoal/pastel drift (mask)
    const r = L.rng(seed * 7); const qq = CUR.q < 1 ? .6 : 1; const n = Math.round((o.washes || 14) * qq);
    const blobs = (b, i) => { for (let k = 0; k < n; k++) { const y = r() * H; b.polygon(L.blobPts(r() * W, y, 180 + r() * 360, 30 + r() * 70, { n: 14, rough: .3, rnd: r })); } };
    L.glaze(ctx, [{ color: '#5d6a7c', op: 70 }, { color: '#3a4656', op: 60 }], blobs, { seed: seed + 5, bleed: .35, tex: .55, border: .1, alpha: .75 });
    L.glaze(ctx, [{ color: L.mix(P.rain, mid, .35), op: 70, alpha: .22 }, { color: L.mix(low, '#a08a66', .3), op: 60, alpha: .12 }], blobs, { seed: seed + 6, mode: 'mask', bleed: .4, tex: .4, border: .05, gain: 1.1 });
    L.paint(ctx, (b) => {
      b.set('charcoal', '#000', .9); for (let k = 0; k < (o.strokes || 70) * qq; k++) { const y = r() * H, x0 = r() * W - 100, l = 120 + r() * 380; b.line(x0, y, x0 + l, y + (r() - .5) * 24); }
    }, { seed: seed + 9, mode: 'mask', color: L.mix(top, '#000', .3), alpha: .4 });
    L.paint(ctx, (b) => {
      b.set('pastel', '#000', .8); for (let k = 0; k < (o.strokes || 70) * .4 * qq; k++) { const y = r() * H, x0 = r() * W - 100, l = 100 + r() * 300; b.line(x0, y, x0 + l, y + (r() - .5) * 18); }
    }, { seed: seed + 10, mode: 'mask', color: L.mix(P.rain, mid, .4), alpha: .22 });
  };

  /* ------------------------------ fog ------------------------------ */
  L.fog = function (ctx, o) {
    const W = ctx.fw, y0 = o.y0, y1 = o.y1, col = o.color || L.PAL.rain, a = o.a === undefined ? .4 : o.a, seed = o.seed || 21;
    const f = L.layer(ctx.fw, ctx.fh); L.vgrad(f, [[0, L.rgba(col, 0)], [.5, L.rgba(col, a)], [1, L.rgba(col, 0)]], y0, y1);
    const nz = L.noiseAlpha(W, y1 - y0 + 1, { sx: 3.2, sy: .7, oct: 4, seed, lo: .28, hi: .62, color: '#fff', res: 8 });
    f.save(); f.globalCompositeOperation = 'destination-in'; f.drawImage(nz.canvas, 0, y0, W, y1 - y0); f.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = o.op || 'source-over'; ctx.filter = `blur(${4 * ctx.q}px)`; ctx.drawImage(f.canvas, 0, 0); ctx.restore();
    const r = L.rng(seed * 3); const bands = o.band === undefined ? 5 : o.band;
    L.paint(ctx, (b) => { L.wc(b, col, 90, .4, .3, .05); for (let i = 0; i < bands; i++) b.polygon(L.blobPts(r() * W, y0 + (y1 - y0) * (.2 + r() * .6), 200 + r() * 330, 14 + r() * 26, { n: 12, rough: .35, rnd: r })); }, { seed: seed + 1, mode: 'mask', color: col, alpha: Math.min(.7, a * .9), op: o.op });
  };

  /* ------------------------------ bokeh ------------------------------ */
  L.bokeh = function (ctx, o) {
    const r = L.rng((o.seed || 5) * 13), A = o.area, n = o.n || 40, cols = o.colors || [[L.PAL.yellow, 3], [L.PAL.mist, 3], [L.PAL.rain, 3], [L.PAL.signal, 1]];
    const tot = cols.reduce((s, c) => s + c[1], 0); const pick = () => { let t = r() * tot; for (const c of cols) { t -= c[1]; if (t <= 0) return c[0]; } return cols[0][0]; };
    ctx.save(); ctx.globalCompositeOperation = o.op || 'screen';
    for (let i = 0; i < n; i++) {
      const x = A.x0 + r() * (A.x1 - A.x0), y = A.y0 + r() * (A.y1 - A.y0), rad = (o.rmin || 10) + Math.pow(r(), 1.6) * ((o.rmax || 60) - (o.rmin || 10)); const C = L.hex(pick()); const a = (o.a === undefined ? .5 : o.a) * (.45 + r() * .75); const ring = o.ring === undefined ? .35 : o.ring;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad); const c = `${C[0] | 0},${C[1] | 0},${C[2] | 0}`;
      g.addColorStop(0, `rgba(${c},${a * (.55 - ring * .2)})`); g.addColorStop(.72, `rgba(${c},${a * (.65 - ring * .2)})`); g.addColorStop(.92, `rgba(${c},${a * (.7 + ring)})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  };

  /* ------------------------------ windows ------------------------------ */
  L.windows = function (ctx, R, o = {}) {
    const r = o.rnd || L.rng((o.seed || 3) + Math.floor(R.x * 7 + R.y * 3)); const cw = o.cw || 8, ch = o.ch || 11, gx = o.gx || 5, gy = o.gy || 7; const lit = o.lit === undefined ? .32 : o.lit, warm = o.warm === undefined ? .42 : o.warm, A = (o.alpha === undefined ? 1 : o.alpha) * (1 - (o.far || 0) * .45);
    const cols = Math.max(1, Math.floor((R.w - gx) / (cw + gx))), rows = Math.max(1, Math.floor((R.h - gy) / (ch + gy))); const ox = R.x + (R.w - cols * (cw + gx) + gx) / 2, cells = [];
    const wc = [L.PAL.yellow, '#FFD98A', L.PAL.yellowDim, '#F6E3A8'], cc = [L.PAL.mist, '#9fb6cc', '#d8e4ee', L.PAL.rain];
    ctx.save();
    for (let j = 0; j < rows; j++) { const rowLit = r() < .5 ? lit * 1.6 : lit * .6; for (let i = 0; i < cols; i++) {
      if (r() > rowLit) { if (r() < .35) { ctx.fillStyle = L.rgba('#0a0f16', .35 * A); ctx.fillRect(ox + i * (cw + gx), R.y + gy + j * (ch + gy), cw, ch); } continue; }
      const isWarm = r() < warm, col = isWarm ? r.pick(wc) : r.pick(cc); const br = (.45 + r() * .55) * A; const x = ox + i * (cw + gx), y = R.y + gy + j * (ch + gy);
      ctx.fillStyle = L.rgba(col, br); ctx.fillRect(x, y, cw, ch * (.8 + r() * .2));
      cells.push({ x, y, w: cw, h: ch, col, br }); } }
    ctx.restore(); return cells;
  };

  /* ------------------------------ skyline ------------------------------ */
  L.skyline = function (ctx, o) {
    const seed = o.seed || 31, r = L.rng(seed), far = o.far || 0, P = L.PAL, W = ctx.fw; const atm = L.mix(o.atmo || P.rain, P.slate, .35);
    const colTop = L.mix(o.colTop || '#25313f', atm, far * .75), colBot = L.mix(o.colBot || '#0f151e', atm, far * .85);
    const B = []; let x = (o.x0 === undefined ? -20 : o.x0); const x1 = o.x1 === undefined ? W + 20 : o.x1; const wmin = o.wmin || 40, wmax = o.wmax || 120, hmin = o.hmin || 80, hmax = o.hmax || 300;
    while (x < x1) {
      const w = r.range(wmin, wmax), cl = L.fbm(x / 400, seed, 3, seed), h = hmin + (hmax - hmin) * clamp(.15 + cl * 1.1 + (r() - .5) * .5, 0, 1);
      const bl = { x, w, h, y: o.base - h, base: o.base, steps: [], antenna: r() < (o.antenna === undefined ? .18 : o.antenna) };
      if (r() < (o.steps === undefined ? .45 : o.steps)) { const sw = w * r.range(.4, .7), sh = h * r.range(.08, .2); bl.steps.push({ x: x + (w - sw) * r.range(0, 1), w: sw, h: sh }); }
      B.push(bl); x += w + r.range(-4, (o.gap === undefined ? 6 : o.gap));
    }
    const fillDown = o.fillDown || 0;
    // 1) opaque base masses (2D) — values first
    ctx.save(); B.forEach(bl => { const g = ctx.createLinearGradient(0, bl.y, 0, bl.base + fillDown); g.addColorStop(0, L.mix(colTop, colBot, .0)); g.addColorStop(1, colBot); ctx.fillStyle = g; ctx.fillRect(bl.x, bl.y, bl.w, bl.h + fillDown + 2);
      bl.steps.forEach(s => ctx.fillRect(s.x, bl.y - s.h, s.w, s.h + 2)); }); ctx.restore();
    // 2) brush glazes (texture, hue split)
    const prof = [[B[0].x, B[0].base + fillDown]]; B.forEach(bl => { prof.push([bl.x, bl.y]); bl.steps.forEach(s => { prof.push([s.x, bl.y], [s.x, bl.y - s.h], [s.x + s.w, bl.y - s.h], [s.x + s.w, bl.y]); }); prof.push([bl.x + bl.w, bl.y]); }); const lb = B[B.length - 1]; prof.push([lb.x + lb.w, lb.base + fillDown]);
    const gl = (b) => { b.polygon(prof); };
    L.glaze(ctx, [{ color: L.mix(colBot, '#000', .35), op: 140 }], gl, { seed: seed + 3, bleed: .12, tex: .6, border: .25, alpha: .8, atop: true });
    L.glaze(ctx, [{ color: L.mix(colTop, atm, .35), op: 110 }, { color: L.mix(colTop, '#4a6078', .4), op: 80, alpha: .5 }].slice(0, o.glazes || 2), gl, { seed: seed + 4, mode: 'mask', bleed: .15, tex: .6, border: .2, alpha: .24 * (1 - far * .3), atop: true });
    // 3) windows
    const dens = o.winDens === undefined ? .3 : o.winDens, ws = o.winSize || [7, 10];
    B.forEach(bl => { L.windows(ctx, { x: bl.x + 3, y: bl.y + 4, w: bl.w - 6, h: bl.h - 6 + fillDown }, { rnd: r, cw: ws[0], ch: ws[1], gx: ws[0] * .7 + 2, gy: ws[1] * .7 + 1, lit: dens, warm: o.warm === undefined ? .4 : o.warm, far, alpha: o.winAlpha === undefined ? .95 : o.winAlpha }); });
    // 4) ink + rim light
    if (o.ink !== false) {
      const ink = L.mix('#0a0f16', atm, far * .8), rim = L.mix(P.rain, P.slate, .25 + far * .4);
      L.paint(ctx, (b, rnd) => { B.forEach(bl => { L.ink(b, [[bl.x, bl.base], [bl.x, bl.y], [bl.x + bl.w, bl.y]], { color: ink, w: o.inkW || .5, rnd, gap: .25, wig: 1.2 }); L.ink(b, [[bl.x + bl.w, bl.y], [bl.x + bl.w, bl.base]], { color: ink, w: (o.inkW || .5) * .8, rnd, gap: .4 });
        bl.steps.forEach(s => L.ink(b, [[s.x, bl.y], [s.x, bl.y - s.h], [s.x + s.w, bl.y - s.h], [s.x + s.w, bl.y]], { color: ink, w: .5, rnd, gap: .2 })); if (bl.antenna) { const ax = bl.x + bl.w * rnd.range(.3, .7); L.ink(b, [[ax, bl.y], [ax, bl.y - rnd.range(20, 60)]], { color: ink, w: .5, rnd, gap: 0, press: false }); } }); }, { seed: seed + 7, mode: 'mask', color: ink, alpha: .85 });
      L.paint(ctx, (b, rnd) => { B.forEach(bl => { L.ink(b, [[bl.x + 1, bl.y + 1.5], [bl.x + bl.w - 1, bl.y + 1.5]], { brush: 'pen', color: rim, w: .45, rnd, gap: .35, wig: .5, chunk: [20, 90] }); }); }, { seed: seed + 8, mode: 'mask', color: rim, alpha: .75 * (1 - far * .5), gain: 1.4 });
    }
    return B;
  };

  /* ------------------------------ baked rain ------------------------------ */
  L.rain = function (ctx, o = {}) {
    const R = o.rect || { x0: 0, y0: 0, x1: ctx.fw, y1: ctx.fh }, ang = (o.ang === undefined ? 12 : o.ang) * Math.PI / 180, lx = Math.sin(ang), ly = Math.cos(ang), seed = o.seed || 41, r = L.rng(seed);
    const n = Math.round((o.n || 600) * (CUR.q < 1 ? .6 : 1)), len = o.len || [40, 110]; const cone = o.cone;
    const strokes = []; for (let i = 0; i < n; i++) strokes.push([R.x0 + r() * (R.x1 - R.x0), R.y0 + r() * (R.y1 - R.y0), r.range(len[0], len[1])]);
    const inCone = s => { if (!cone) return false; const dx = s[0] - cone.x, dy = s[1] - cone.y; if (dy < 0 || dy > (cone.len || 600)) return false; return Math.abs(dx) < Math.tan((cone.spread || 28) * Math.PI / 180) * dy + 8; };
    const dr = (b, arr) => arr.forEach(s => b.line(s[0], s[1], s[0] - lx * s[2], s[1] + ly * s[2]));
    L.paint(ctx, (b) => { b.set(o.brush || '2H', '#000', o.w || 1); dr(b, strokes.filter(s => !inCone(s))); }, { seed: seed + 1, mode: 'mask', color: o.color || L.PAL.mist, alpha: o.alpha === undefined ? .5 : o.alpha, gain: o.gain || 1.3, atop: o.atop });
    if (cone) L.paint(ctx, (b) => { b.set('cpencil', '#000', (o.w || 1) * 1.1); dr(b, strokes.filter(inCone)); }, { seed: seed + 2, mode: 'mask', color: cone.color || '#ffe9a8', alpha: .8, gain: 1.4 });
  };
  L.wires = function (ctx, o) {
    const pts = o.pts, sag = o.sag || 30, ps = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], bb = pts[i + 1]; for (let s = 0; s <= 24; s++) { const t = s / 24; ps.push([a[0] + (bb[0] - a[0]) * t, a[1] + (bb[1] - a[1]) * t + Math.sin(Math.PI * t) * sag]); } }
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = L.rgba(o.color || '#080c12', .95); ctx.lineWidth = o.w || 2; ctx.beginPath(); ps.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    ctx.strokeStyle = L.rgba(o.hl || L.PAL.rain, .45); ctx.lineWidth = (o.w || 2) * .35; ctx.beginPath(); ps.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] - (o.w || 2) * .6) : ctx.moveTo(p[0], p[1] - (o.w || 2) * .6)); ctx.stroke(); ctx.restore();
    return ps;
  };

  /* ------------------------------ register / run / export ------------------------------ */
  PAINT.kindOf = function (key, alpha) {
    if (/^boot_|^poster_\d/.test(key)) return 'seq';
    if (/^eye_|^pair_/.test(key)) return 'eye';
    if (/^(merey_top|sanzhar_fig|roof_pair)$/.test(key)) return 'char';
    if (/_sky$|_bg$|^window_city$|^street_ground$|^puddle_bg$|^poster_stop$/.test(key)) return 'plate';
    return 'layer';
  };
  PAINT.register = function (key, meta, fn) { if (!PAINT.reg[key]) PAINT.order.push(key); PAINT.reg[key] = { key, w: meta.w, h: meta.h, alpha: !!meta.alpha, seed: meta.seed || 1, kind: meta.kind || PAINT.kindOf(key, meta.alpha), fn }; };
  PAINT.keys = () => PAINT.order.map(k => { const m = PAINT.reg[k]; return { key: k, w: m.w, h: m.h, alpha: m.alpha, kind: m.kind }; });
  PAINT.run = async function (key, quick) {
    const m = PAINT.reg[key]; if (!m) throw new Error('unknown key ' + key); const q = quick ? .5 : 1;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const k = { brush: window.brush, W: m.w, H: m.h, q, rnd: L.rng(m.seed), lib: L, seed: m.seed, key, alpha: m.alpha, meta: m };
    CUR = k; window.brush.seed(m.seed); window.brush.noiseSeed(m.seed);
    const out = await m.fn(k); return out.canvas || out;
  };
  PAINT.exportKey = async function (key, quick) {
    const m = PAINT.reg[key]; const t0 = performance.now(); const c = await PAINT.run(key, quick); const ms = performance.now() - t0;
    let stats = null; if (m.alpha) { const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const cx = t.getContext('2d'); cx.drawImage(c, 0, 0); L.cleanAlpha({ canvas: t }); const a = L.alphaStats({ canvas: t }); stats = a; var src = t; } else src = c;
    const webp = src.toDataURL('image/webp', .88);
    const sc = Math.min(1, 600 / Math.max(c.width, c.height)); const rv = document.createElement('canvas'); rv.width = Math.round(c.width * sc); rv.height = Math.round(c.height * sc); const rx = rv.getContext('2d');
    if (m.alpha) { rx.fillStyle = '#5b6570'; rx.fillRect(0, 0, rv.width, rv.height); rx.fillStyle = '#7e8996'; const cs = 16; for (let yy = 0; yy < rv.height; yy += cs) for (let xx = (yy / cs) % 2 ? 0 : cs; xx < rv.width; xx += cs * 2) rx.fillRect(xx, yy, cs, cs); } else { rx.fillStyle = '#7d858f'; rx.fillRect(0, 0, rv.width, rv.height); } rx.imageSmoothingQuality = 'high'; rx.drawImage(src, 0, 0, rv.width, rv.height);
    return { webp, review: rv.toDataURL('image/jpeg', .85), w: c.width, h: c.height, W: m.w, H: m.h, alpha: m.alpha, kind: m.kind, stats, ms };
  };
})();
