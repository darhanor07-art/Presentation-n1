/* paint.js — offscreen FILL + TONE canvases and the paint API (MK.P). Every call draws identical geometry into both. */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp;
  var STY = { line: 0, grain: 85, cross: 170, dots: 255 };
  function mk() { var c = document.createElement('canvas'); return c; }
  var P = MK.P = {
    fillCanvas: mk(), toneCanvas: mk(), q: 1, w: 1, h: 1, _f: true, _t: true, bounds: MK.view.bounds
  };
  P.ctxF = P.fillCanvas.getContext('2d', { alpha: false });
  P.ctxT = P.toneCanvas.getContext('2d', { alpha: false });
  var cf = P.ctxF, ct = P.ctxT;

  P.resize = function (cssW, cssH, q) {
    P.q = q; P.w = Math.max(2, Math.round(cssW * q)); P.h = Math.max(2, Math.round(cssH * q));
    P.fillCanvas.width = P.toneCanvas.width = P.w; P.fillCanvas.height = P.toneCanvas.height = P.h;
  };
  function each(fn) { if (P._f) fn(cf, false); if (P._t) fn(ct, true); }
  function both(fn) { fn(cf, false); fn(ct, true); }

  P.begin = function () {
    var v = MK.view;
    P._f = P._t = true; P.bounds = v.bounds;
    both(function (c) { if (c.reset) c.reset(); else { c.canvas.width = c.canvas.width; } c.setTransform(1, 0, 0, 1, 0, 0); });
    cf.fillStyle = MK.rgb('paper'); cf.fillRect(0, 0, P.w, P.h);
    ct.fillStyle = '#000'; ct.fillRect(0, 0, P.w, P.h);
    var k = v.s * P.q;
    both(function (c) { c.setTransform(k, 0, 0, k, v.ox * P.q, v.oy * P.q); c.lineJoin = 'round'; c.lineCap = 'round'; });
    P._k = k;
  };
  P.toneOnly = function (fn) { var f = P._f, t = P._t; P._f = false; P._t = true; try { fn(); } finally { P._f = f; P._t = t; } };
  P.fillOnly = function (fn) { var f = P._f, t = P._t; P._f = true; P._t = false; try { fn(); } finally { P._f = f; P._t = t; } };

  /* gradients (tone gradients: stops [[pos, tone],...]; colour gradients: stops [[pos,'red'],...]) */
  P.lin = function (x0, y0, x1, y1, stops) { return { kind: 'lin', a: [x0, y0, x1, y1], stops: stops }; };
  P.rad = function (cx, cy, r0, r1, stops) { return { kind: 'rad', a: [cx, cy, r0, cx, cy, r1], stops: stops }; };
  function grad(ctx, g, fn) {
    var o = g.kind === 'lin' ? ctx.createLinearGradient.apply(ctx, g.a) : ctx.createRadialGradient.apply(ctx, g.a);
    for (var i = 0; i < g.stops.length; i++) o.addColorStop(clamp(g.stops[i][0], 0, 1), fn(g.stops[i][1]));
    return o;
  }
  function angB(st) {
    var a = (((st.a || 0) % 180) + 180) % 180;
    return [Math.round(a / 180 * 255), STY[st.h || 'line'] || 0];
  }
  function toneStyle(ctx, st) {
    var ab = angB(st), t = st.t == null ? 0 : st.t;
    var f = function (v) { return 'rgb(' + Math.round(clamp(v, 0, 1) * 255) + ',' + ab[0] + ',' + ab[1] + ')'; };
    return (typeof t === 'object') ? grad(ctx, t, f) : f(t);
  }
  function colorStyle(ctx, st) {
    var c = st.c == null ? 'paper' : st.c;
    if (c && c.kind) return grad(ctx, c, function (n) { return MK.rgb(n); });
    return MK.rgb(c);
  }
  P.toneStyle = toneStyle;

  function toPath(x, closed) {
    if (x instanceof Path2D) return x;
    if (typeof x === 'string') return new Path2D(x);
    var p = new Path2D();
    if (x && x.length) {
      p.moveTo(x[0][0], x[0][1]);
      for (var i = 1; i < x.length; i++) p.lineTo(x[i][0], x[i][1]);
      if (closed !== false) p.closePath();
    }
    return p;
  }
  P.toPath = toPath;

  function paint(path, st) {
    st = st || {};
    each(function (c, isT) {
      c.fillStyle = isT ? toneStyle(c, st) : colorStyle(c, st);
      if (st.rule) c.fill(path, st.rule); else c.fill(path);
      if (st.stroke && st.stroke.w > 0) {
        c.lineWidth = st.stroke.w; c.lineJoin = 'round';
        c.strokeStyle = isT ? '#000' : MK.rgb(st.stroke.c || 'ink');
        c.stroke(path);
      }
    });
  }
  P.fillPath = paint;

  P.rect = function (x, y, w, h, st) { var p = new Path2D(); p.rect(x, y, w, h); paint(p, st); };
  P.circle = function (cx, cy, r, st) { var p = new Path2D(); p.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2); paint(p, st); };
  P.ellipse = function (cx, cy, rx, ry, st, rot) { var p = new Path2D(); p.ellipse(cx, cy, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, Math.PI * 2); paint(p, st); };
  P.poly = function (pts, st, closed) { paint(toPath(pts, closed !== false), st); };
  P.path = function (d, st) { paint(toPath(d), st); };
  /* plain stroke: coloured line on FILL, tone 0 under it (unless o.t given) */
  P.stroke = function (d, o) {
    o = o || {}; var path = toPath(d, o.closed);
    each(function (c, isT) {
      c.lineWidth = o.w || 2; c.lineCap = o.cap || 'round'; c.lineJoin = o.join || 'round';
      c.setLineDash(o.dash || []); c.lineDashOffset = o.dashOffset || 0;
      c.strokeStyle = isT ? (o.t != null ? toneStyle(c, o) : '#000') : colorStyle(c, o.c == null ? { c: 'ink' } : o);
      c.stroke(path); c.setLineDash([]);
    });
  };
  P.line = function (x0, y0, x1, y1, o) { P.stroke([[x0, y0], [x1, y1]], o); };

  /* Catmull-Rom sampling */
  P.smooth = function (pts, steps, closed) {
    var n = pts.length, out = [], i, k; steps = steps || 8;
    if (n < 3) return pts.slice();
    var m = closed ? n : n - 1;
    for (i = 0; i < m; i++) {
      var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      for (k = 0; k < steps; k++) {
        var t = k / steps, t2 = t * t, t3 = t2 * t;
        out.push([
          .5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    if (!closed) out.push(pts[n - 1].slice());
    return out;
  };

  /* tapered brush polygon along a polyline (Catmull-Rom smoothed), round ends. w: [w0,w1] | fn(u)->full width */
  P.taperPoly = function (points, w, steps) {
    var d = P.smooth(points, steps || 8, false), n = d.length, i;
    if (n < 2) return [];
    var wf = typeof w === 'function' ? w : (function (a) { return function (u) { return a[0] + (a[1] - a[0]) * u; }; })(w || [10, 0]);
    var len = [0]; for (i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]));
    var L = len[n - 1] || 1, Lf = [], Rt = [], ang = [], wd = [];
    for (i = 0; i < n; i++) {
      var a = d[Math.max(0, i - 1)], b = d[Math.min(n - 1, i + 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      var ww = Math.max(0, wf(len[i] / L)) / 2; wd.push(ww); ang.push(Math.atan2(ty, tx));
      Lf.push([d[i][0] - ty * ww, d[i][1] + tx * ww]); Rt.push([d[i][0] + ty * ww, d[i][1] - tx * ww]);
    }
    var poly = Lf.slice(), k, th, r;
    r = wd[n - 1]; for (k = 1; k < 6; k++) { th = ang[n - 1] + Math.PI / 2 - Math.PI * k / 6; poly.push([d[n - 1][0] + r * Math.cos(th), d[n - 1][1] + r * Math.sin(th)]); }
    for (i = n - 1; i >= 0; i--) poly.push(Rt[i]);
    r = wd[0]; for (k = 1; k < 6; k++) { th = ang[0] - Math.PI / 2 - Math.PI * k / 6; poly.push([d[0][0] + r * Math.cos(th), d[0][1] + r * Math.sin(th)]); }
    return poly;
  };
  P.taper = function (points, w, st, steps) { var poly = P.taperPoly(points, w, steps); if (poly.length) P.poly(poly, st, true); return poly; };

  P.text = function (str, x, y, o, st) {
    o = o || {}; st = st || {};
    var fam = o.font || 'Song Myung', size = o.size || 40;
    if (fam.indexOf('"') < 0 && fam.indexOf(',') < 0) fam = '"' + fam + '"';
    var font = (o.weight || 400) + ' ' + size + 'px ' + fam;
    var chars = o.vertical ? Array.from(str) : null, sp = o.spacing || 0;
    function draw(c, isT) {
      c.font = font; c.textAlign = o.vertical ? 'center' : (o.align || 'left'); c.textBaseline = o.baseline || 'alphabetic';
      c.fillStyle = isT ? toneStyle(c, st) : colorStyle(c, st);
      if (st.stroke) { c.lineWidth = st.stroke.w; c.strokeStyle = isT ? '#000' : MK.rgb(st.stroke.c || 'ink'); c.lineJoin = 'round'; }
      var i;
      if (o.vertical) {
        var lh = size * (o.lh || 1) + sp;
        for (i = 0; i < chars.length; i++) { c.fillText(chars[i], x, y + i * lh); if (st.stroke) c.strokeText(chars[i], x, y + i * lh); }
      } else if (sp) {
        var arr = Array.from(str), ws = arr.map(function (ch) { return c.measureText(ch).width; }), tot = 0;
        for (i = 0; i < arr.length; i++) tot += ws[i] + (i < arr.length - 1 ? sp : 0);
        var cx = (o.align === 'center') ? x - tot / 2 : (o.align === 'right') ? x - tot : x;
        c.textAlign = 'left';
        for (i = 0; i < arr.length; i++) { c.fillText(arr[i], cx, y); if (st.stroke) c.strokeText(arr[i], cx, y); cx += ws[i] + sp; }
      } else { c.fillText(str, x, y); if (st.stroke) c.strokeText(str, x, y); }
    }
    each(draw);
  };
  P.measure = function (str, o) {
    var fam = o.font || 'Song Myung'; if (fam.indexOf('"') < 0 && fam.indexOf(',') < 0) fam = '"' + fam + '"';
    cf.save(); cf.font = (o.weight || 400) + ' ' + (o.size || 40) + 'px ' + fam;
    var w = cf.measureText(str).width + (o.spacing || 0) * Math.max(0, Array.from(str).length - 1); cf.restore(); return w;
  };

  P.push = function () { both(function (c) { c.save(); }); };
  P.pop = function () { both(function (c) { c.restore(); }); };
  P.translate = function (x, y) { both(function (c) { c.translate(x, y); }); };
  P.rotate = function (r) { both(function (c) { c.rotate(r); }); };
  P.scale = function (sx, sy) { both(function (c) { c.scale(sx, sy == null ? sx : sy); }); };
  P.transform = function (a, b, c_, d, e, f) { both(function (c) { c.transform(a, b, c_, d, e, f); }); };
  /* clip(shape, inner): shape = Path2D | svg string | points[] | fn(path2d) */
  P.clip = function (shape, inner) {
    var path;
    if (typeof shape === 'function') { path = new Path2D(); var r = shape(path); if (r instanceof Path2D) path = r; } else path = toPath(shape);
    P.push(); both(function (c) { c.clip(path); });
    try { inner(); } finally { P.pop(); }
  };
  /* blur in WORLD units */
  P.blur = function (px, inner) {
    var v = Math.max(0, px * P._k) + 'px';
    each(function (c) { c.filter = 'blur(' + v + ')'; });
    try { inner(); } finally { each(function (c) { c.filter = 'none'; }); }
  };
  P.alpha = function (a, inner) { each(function (c) { c.globalAlpha = a; }); try { inner(); } finally { each(function (c) { c.globalAlpha = 1; }); } };
  /* cover whole visible area */
  P.cover = function (st) { var b = MK.view.bounds; P.rect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, b.y1 - b.y0 + 4, st); };
  MK.TONE_STYLES = STY;
})();
