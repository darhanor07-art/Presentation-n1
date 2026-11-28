/* rain.js — everything wet. All functions are PURE in (t, s, p): no hidden state, so deterministic capture works.
   MS.rain        3 depth layers of slanted streaks, up-reversal, splashes, lamp cone, dry gap
   MS.glassDrops  drops sliding on window glass, each refracts (flipped, magnified crop of the canvas behind it)
   MS.ripples     expanding elliptical rings in puddles + a big impact ring on cue
   MS.lightning   flash + forked bolt;  MS.boltPoints / MS.drawBolt / MS.lightFlash helpers */
(function () {
  const MS = window.MS, V = MS.V, { clamp, lerp, sm, eo, mod, TAU } = MS.m;
  const hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  /* ---------- streak sets (seeded, built once) ---------- */
  const LAY = [
    { n: 120, speed: .8, len: .034, w: .8, a: .30, par: .15 },
    { n: 72, speed: 1.3, len: .068, w: 1.2, a: .40, par: .5 },
    { n: 32, speed: 2.1, len: .15, w: 2.1, a: .5, par: 1.0 }
  ];
  const SETS = {};
  function getSet(id, li) {
    const key = id + li; if (SETS[key]) return SETS[key];
    const r = MS.rng(MS.hash(key) + li * 17), n = LAY[li].n, S = { x: [], y: [], a: [], v: [], l: [], ph: [] };
    for (let i = 0; i < n; i++) { S.x.push(r()); S.y.push(r() * 1.3); S.a.push(.45 + r() * .55); S.v.push(.85 + r() * .3); S.l.push(.6 + r() * .8); S.ph.push(r() * TAU); }
    return SETS[key] = S;
  }

  /* o: {id, k density 0..1, speed, lenk, alpha, ang deg, scroll, layers[0..2], up 0..1, cone{x,y,spread,len}, gap{x,y,rx,ry}, splash{y,band,n,k}} */
  MS.rain = function (c, t, s, o) {
    o = o || {}; const W = V.W, H = V.H, u = V.u, id = o.id || 'r';
    const ang = (o.ang == null ? 12 : o.ang) * Math.PI / 180, tn = Math.tan(ang), up = clamp(o.up || 0);
    const wd = 1 - sm(up / .5), wu = sm((up - .5) / .5), wh = sm(up / .3) * (1 - sm((up - .72) / .28)) * (up > 0 ? 1 : 0);
    const lk = (o.lenk == null ? 1 : o.lenk), ak = (o.alpha == null ? 1 : o.alpha), sk = (o.speed == null ? 1 : o.speed), scr = (o.scroll == null ? .35 : o.scroll);
    const cone = o.cone ? { x: o.cone.x * W, y: o.cone.y * H, tn: Math.tan(o.cone.spread || .4), len: (o.cone.len || .8) * H } : null;
    const gap = o.gap ? { x: o.gap.x * W, y: o.gap.y * H, rx: o.gap.rx * W, ry: o.gap.ry * H } : null;
    c.save(); c.lineCap = 'round';
    for (const li of (o.layers || [0, 1, 2])) {
      const L = LAY[li], S = getSet(id, li), n = Math.min(L.n, Math.round(L.n * (o.k == null ? 1 : o.k)));
      const P = [[], []];      // [cool, warm] x bucket*2 (tail/head)
      const mk = () => { const a = []; for (let b = 0; b < 8; b++) a.push(null); return a; };
      P[0] = mk(); P[1] = mk();
      const add = (warm, fa, part, x1, y1, x2, y2) => {
        const b = Math.min(3, Math.floor(fa / .16)), k = b * 2 + part, arr = P[warm]; if (!arr[k]) arr[k] = new Path2D(); arr[k].moveTo(x1, y1); arr[k].lineTo(x2, y2);
      };
      const dirs = []; if (wd > .01) dirs.push(1); if (wu > .01) dirs.push(-1);
      for (const dir of dirs) {
        const wgt = dir > 0 ? wd : wu, len0 = L.len * H * lk * (dir > 0 ? (1 - .85 * sm(up / .5)) : (.15 + .85 * wu));
        for (let i = 0; i < n; i++) {
          const cyc = mod(S.y[i] + (dir > 0 ? 0 : .37) + dir * t * L.speed * sk * S.v[i] * (dir > 0 ? 1 : .8) - s * L.par * scr, 1.3) - .15;
          const yh = cyc * H, xh = ((S.x[i] * 1.5 - .25) + cyc * H * tn / W) * W, len = len0 * S.l[i];
          let fa = S.a[i] * L.a * ak * wgt, warm = 0;
          if (gap) { const dx = (xh - gap.x) / gap.rx, dy = (yh - gap.y) / gap.ry, d = Math.hypot(dx, dy); fa *= sm((d - .78) / .3); }
          if (cone && yh > cone.y) {
            const dy = yh - cone.y, half = dy * cone.tn; if (dy < cone.len && half > 1) {
              const e = 1 - Math.abs(xh - cone.x) / half; if (e > 0) { const f = sm(e * 2.2) * Math.sqrt(1 - dy / cone.len); fa *= 1 + 2.4 * f; if (f > .25) warm = 1; }
            }
          }
          if (fa < .03) continue; fa = Math.min(fa, .75);
          const dx = tn * len * dir, dy = len * dir, mx = xh - dx * .45, my = yh - dy * .45;
          add(warm, fa * .45, 0, xh - dx, yh - dy, mx, my); add(warm, fa, 1, mx, my, xh, yh);
        }
      }
      c.lineWidth = L.w * u;
      for (let w = 0; w < 2; w++) for (let b = 0; b < 8; b++) {
        const pth = P[w][b]; if (!pth) continue; const q = Math.floor(b / 2), al = (q + .5) * .16;
        c.strokeStyle = (w ? 'rgba(255,232,168,' : 'rgba(202,216,230,') + al.toFixed(3) + ')'; c.stroke(pth);
      }
      if (wh > .01) {        // drops hanging in the air while the rain turns round
        c.fillStyle = 'rgba(214,226,238,' + (.55 * wh * ak) + ')';
        for (let i = 0; i < Math.round(n * .8); i++) {
          const x = (S.x[i] * 1.2 - .1) * W + Math.sin(t * .9 + S.ph[i]) * 3 * u, y = mod(S.y[i] * 1.0 - s * L.par * scr * .4, 1.1) * H + Math.cos(t * .7 + S.ph[i] * 1.3) * 4 * u;
          if (gap) { const d = Math.hypot((x - gap.x) / gap.rx, (y - gap.y) / gap.ry); if (d < .8) continue; }
          c.beginPath(); c.arc(x, y, (.7 + li * .5) * u * (.6 + S.l[i] * .5), 0, TAU); c.fill();
        }
      }
    }
    c.restore();
    if (o.splash && wd > .02) {
      const sp = o.splash, n = sp.n || 36, band = (sp.band == null ? .05 : sp.band) * H, y0 = sp.y * H, kk = (sp.k == null ? 1 : sp.k);
      c.save(); c.lineWidth = 1.1 * u;
      for (let i = 0; i < n; i++) {
        const T = .38 + hash(i, 3) * .5, cyc = t / T + hash(i, 5), cn = Math.floor(cyc), ph = cyc - cn;
        if (ph > .4) continue; const k = ph / .4, x = hash(i + cn * 7, 11) * W, y = y0 + (hash(i + cn * 7, 13) - .5) * 2 * band, sc = .6 + (y - (y0 - band)) / (2 * band + 1) * .8;
        if (gap) { const d = Math.hypot((x - gap.x) / gap.rx, (y - gap.y) / gap.ry); if (d < .9) continue; }
        const al = (1 - k) * .65 * wd * ak * kk;
        c.strokeStyle = 'rgba(214,226,238,' + al.toFixed(3) + ')'; c.fillStyle = 'rgba(226,236,246,' + al.toFixed(3) + ')';
        const rr = (2 + 8 * k) * u * sc; c.beginPath(); c.ellipse(x, y, rr, rr * .34, 0, 0, TAU); c.stroke();
        c.beginPath(); c.arc(x - (2 + 5 * k) * u * sc, y - Math.sin(Math.PI * k) * 9 * u * sc, 1 * u, 0, TAU); c.arc(x + (2 + 6 * k) * u * sc, y - Math.sin(Math.PI * Math.min(1, k * 1.15)) * 11 * u * sc, 1.1 * u, 0, TAU); c.fill();
      }
      c.restore();
    }
  };

  /* ---------- a single water bead on glass (optionally refracting what is behind it) ---------- */
  MS.bead = function (c, x, y, rx, ry, src, strength) {
    const u = V.u;
    c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.clip();
    if (src && strength !== 0) {
      const k = .62; c.save(); c.translate(x, y); c.scale(-1, -1);
      c.drawImage(src, x - rx * k * 1.6, y - ry * k * 1.6, rx * k * 3.2, ry * k * 3.2, -rx, -ry, rx * 2, ry * 2);
      c.restore();
    }
    const g = c.createRadialGradient(x - rx * .2, y - ry * .3, 0, x, y, Math.max(rx, ry)); g.addColorStop(0, 'rgba(210,225,240,.10)'); g.addColorStop(.7, 'rgba(120,150,180,.08)'); g.addColorStop(1, 'rgba(8,14,22,.55)');
    c.fillStyle = g; c.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    const g2 = c.createLinearGradient(0, y - ry, 0, y + ry); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(.6, 'rgba(255,255,255,0)'); g2.addColorStop(1, 'rgba(255,255,255,.22)'); c.fillStyle = g2; c.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    c.restore();
    c.save(); c.strokeStyle = 'rgba(238,244,250,.75)'; c.lineWidth = Math.max(.8, rx * .13); c.lineCap = 'round';
    c.beginPath(); c.ellipse(x, y, rx * .72, ry * .72, 0, Math.PI * 1.08, Math.PI * 1.55); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.ellipse(x - rx * .32, y - ry * .42, Math.max(.7, rx * .16), Math.max(.8, ry * .13), -.5, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(8,14,22,.4)'; c.lineWidth = Math.max(.7, rx * .1); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0.1, Math.PI * .9); c.stroke(); c.restore();
  };

  /* ---------- glass drops. o: {id, p page progress, n, refract (source canvas), size, box{x,y,w,h} px} ---------- */
  const stepf = (q, K) => { const g = clamp(q) * K, fi = Math.floor(g), fr = g - fi; return Math.min(1, (fi + sm(clamp(fr * 1.7))) / K); };
  MS.glassDrops = function (c, t, s, o) {
    const W = V.W, H = V.H, u = V.u, box = o.box || { x: 0, y: 0, w: W, h: H }, p = clamp(o.p == null ? 0 : o.p), id = o.id || 'g', n = o.n || 24, size = o.size || 1;
    c.save();
    for (let i = 0; i < n * 3; i++) {     // tiny static beads
      const x = box.x + hash(i, 21) * box.w, y = box.y + hash(i, 22) * box.h, r = (1 + hash(i, 23) * 2.2) * u * size;
      c.fillStyle = 'rgba(8,14,22,.28)'; c.beginPath(); c.ellipse(x, y + r * .25, r, r * 1.1, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(226,236,246,.5)'; c.beginPath(); c.arc(x - r * .3, y - r * .35, Math.max(.5, r * .38), 0, TAU); c.fill();
    }
    const D = [];
    for (let i = 0; i < n; i++) {
      const seed = MS.hash(id) % 997, h = k => hash(i + seed, k), r = (5 + h(1) * 10) * u * size, x = box.x + (.06 + h(2) * .88) * box.w, y0 = box.y + (h(3) * .75) * box.h;
      const start = h(4) * .6, span = .18 + h(5) * .4, q = (p - start) / span, dist = (.1 + h(6) * .5) * box.h, y = y0 + dist * stepf(q, 3 + Math.floor(h(7) * 3));
      const jit = Math.sin(t * 1.3 + i) * .25 * u;     // faint wobble
      D.push({ x: x + jit, y, y0, r, q: clamp(q) });
    }
    for (const d of D) {        // trails
      if (d.y - d.y0 < 2 * u) continue; const g = c.createLinearGradient(0, d.y0, 0, d.y);
      g.addColorStop(0, 'rgba(190,208,226,0)'); g.addColorStop(1, 'rgba(190,208,226,.3)');
      c.strokeStyle = g; c.lineWidth = Math.max(1, d.r * .45); c.lineCap = 'round'; c.beginPath(); c.moveTo(d.x, d.y0); c.lineTo(d.x, d.y - d.r * .3); c.stroke();
      c.strokeStyle = 'rgba(238,244,250,.12)'; c.lineWidth = Math.max(.6, d.r * .1); c.beginPath(); c.moveTo(d.x - d.r * .15, d.y0 + (d.y - d.y0) * .3); c.lineTo(d.x - d.r * .15, d.y - d.r * .3); c.stroke();
    }
    const src = o.refract ? c.canvas : null;
    for (const d of D) MS.bead(c, d.x, d.y, d.r * .78, d.r * 1.12, src);
    c.restore();
  };

  /* ---------- ripples. o: {id, box{x,y,w,h}, x0,y0,x1,y1 (0..1 of box), n, asp, rmax (u px), alpha, impact:{x,y (0..1 of box), k 0..1.3, size}} ---------- */
  MS.ripples = function (c, t, s, o) {
    const W = V.W, H = V.H, u = V.u, box = o.box || { x: 0, y: 0, w: W, h: H }, n = o.n || 8, asp = o.asp || .3, id = MS.hash(o.id || 'rp') % 991;
    const X0 = box.x + (o.x0 == null ? 0 : o.x0) * box.w, X1 = box.x + (o.x1 == null ? 1 : o.x1) * box.w, Y0 = box.y + (o.y0 == null ? 0 : o.y0) * box.h, Y1 = box.y + (o.y1 == null ? 1 : o.y1) * box.h;
    const rmax = (o.rmax || 46) * u, al = o.alpha == null ? 1 : o.alpha; c.save();
    for (let i = 0; i < n; i++) {
      const T = 1.2 + hash(i + id, 31) * 1.5, cyc = t / T + hash(i + id, 32), cn = Math.floor(cyc), ph = cyc - cn;
      const x = X0 + hash(i * 3 + cn * 13 + id, 33) * (X1 - X0), y = Y0 + hash(i * 5 + cn * 17 + id, 34) * (Y1 - Y0), sc = .55 + .6 * (y - Y0) / (Y1 - Y0 + 1);
      for (let j = 0; j < 2; j++) {
        const pj = ph - j * .16; if (pj <= 0) continue; const r = rmax * sc * (.12 + pj * .88), a = Math.pow(1 - pj, 1.4) * .62 * al * (j ? .6 : 1);
        c.strokeStyle = 'rgba(214,228,242,' + a.toFixed(3) + ')'; c.lineWidth = (1.6 - j * .5) * u; c.beginPath(); c.ellipse(x, y, r, r * asp, 0, 0, TAU); c.stroke();
        if (!j) { c.strokeStyle = 'rgba(8,14,22,' + (a * .35).toFixed(3) + ')'; c.beginPath(); c.ellipse(x, y + 1.6 * u, r, r * asp, 0, 0, TAU); c.stroke(); }
      }
    }
    const im = o.impact;
    if (im && im.k > 0) {
      const x = box.x + im.x * box.w, y = box.y + im.y * box.h, sz = (im.size || .5) * box.w;
      for (let j = 0; j < 5; j++) {
        const kj = im.k - j * .1; if (kj <= 0) continue; const r = (.03 + .97 * eo(kj / 1.15)) * sz, a = clamp(1 - kj / 1.15) * (.9 - j * .1) * al;
        if (a < .01) continue; c.strokeStyle = 'rgba(226,238,250,' + a.toFixed(3) + ')'; c.lineWidth = Math.max(1, (4.2 - j * .6 - kj * 1.6) * u);
        c.beginPath(); c.ellipse(x, y, r, r * asp, 0, 0, TAU); c.stroke();
        c.strokeStyle = 'rgba(8,14,22,' + (a * .35).toFixed(3) + ')'; c.lineWidth = Math.max(1, 2.4 * u); c.beginPath(); c.ellipse(x, y + 3 * u, r, r * asp, 0, 0, TAU); c.stroke();
      }
      const f = clamp(1 - im.k / .35); if (f > 0) MS.glow(c, x, y, sz * .22, '226,238,250', .55 * f * al, 'lighter');
    }
    c.restore();
  };

  /* ---------- lightning ---------- */
  MS.lightFlash = function (t, per, off) {           // 0..1, double/triple pulse once per period
    const ph = mod(t + (off || 0), per || 5.5); let f = 0;
    for (const [t0, a, tau] of [[0, 1, .12], [.17, .55, .1], [.4, .9, .16]]) if (ph >= t0) f += a * Math.exp(-(ph - t0) / tau);
    return clamp(f);
  };
  const BOLT = {};
  MS.boltPoints = function (seed, x0, y0, x1, y1, branches) {
    const key = seed + '|' + [x0, y0, x1, y1].map(Math.round).join(',') + '|' + branches; if (BOLT[key]) return BOLT[key];
    const r = MS.rng(seed * 7919 + 13), W = V.W, u = V.u;
    const seg = (ax, ay, bx, by, n, jit) => { const pts = [[ax, ay]]; for (let i = 1; i < n; i++) { const k = i / n; pts.push([lerp(ax, bx, k) + (r() - .5) * jit * u, lerp(ay, by, k) + (r() - .5) * jit * .3 * u]); } pts.push([bx, by]); return pts; };
    const main = seg(x0, y0, x1, y1, 16, 70), br = [];
    for (let i = 0; i < (branches || 0) * 3 && br.length < (branches || 0) * 2; i++) {
      const k = 3 + Math.floor(r() * 10), p = main[k], dir = r() < .5 ? -1 : 1, len = (60 + r() * 140) * u;
      br.push(seg(p[0], p[1], p[0] + dir * len, p[1] + len * (.9 + r() * .8), 5, 40));
    }
    return BOLT[key] = { main, br };
  };
  MS.drawBolt = function (c, b, a) {
    if (a <= .01) return; const u = V.u; c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    const path = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); };
    c.globalAlpha = clamp(a); c.shadowColor = 'rgba(150,190,240,1)'; c.shadowBlur = 26 * u;
    c.strokeStyle = 'rgba(160,196,240,.55)'; c.lineWidth = 9 * u; path(b.main); b.br.forEach(p => { c.lineWidth = 5 * u; path(p); });
    c.shadowBlur = 8 * u; c.strokeStyle = 'rgba(255,255,255,.98)'; c.lineWidth = 2.6 * u; path(b.main); b.br.forEach(p => { c.lineWidth = 1.4 * u; path(p); });
    c.restore();
  };
  /* o: {x (0..1), per, off, k strength, sky height 0..1 of H for the glow, bolt true} */
  MS.lightning = function (c, t, o) {
    o = o || {}; const W = V.W, H = V.H, f = MS.lightFlash(t, o.per || 5.5, o.off || 0) * (o.k == null ? 1 : o.k); if (f < .01) return 0;
    const x = (o.x == null ? .6 : o.x) * W, sh = (o.sky || .5) * H;
    c.save(); c.globalCompositeOperation = 'screen';
    const g = c.createRadialGradient(x, sh * .2, 0, x, sh * .2, H * .75); g.addColorStop(0, 'rgba(200,222,248,' + .55 * f + ')'); g.addColorStop(1, 'rgba(110,137,163,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    const lin = c.createLinearGradient(0, 0, 0, sh); lin.addColorStop(0, 'rgba(184,212,240,' + .28 * f + ')'); lin.addColorStop(1, 'rgba(184,212,240,0)'); c.fillStyle = lin; c.fillRect(0, 0, W, sh); c.restore();
    if (o.bolt !== false) { const ph = mod(t + (o.off || 0), o.per || 5.5), cn = Math.floor((t + (o.off || 0)) / (o.per || 5.5)); if (ph < .5) MS.drawBolt(c, MS.boltPoints(11 + (cn % 5), x, -10, x + (hash(cn, 2) - .5) * W * .3, sh * .95, 2), f * 1.2); }
    return f;
  };
})();
