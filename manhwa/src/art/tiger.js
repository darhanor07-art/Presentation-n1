/* art/tiger.js — minhwa-style front-face tiger emblem. MK.art.tiger(P, cx, cy, size, s) */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {}, clamp = MK.clamp;
  var G = null;

  function quad(a, c, b, n) { var o = [], i; for (i = 0; i <= n; i++) { var t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return o; }
  function circ(cx, cy, r, n) { var o = [], i; for (i = 0; i < n; i++) o.push([cx + r * Math.cos(i / n * 6.2832), cy + r * Math.sin(i / n * 6.2832)]); o.push(o[0].slice()); return o; }
  function mir(pts) { return pts.map(function (p) { return [-p[0], p[1]]; }); }

  function geom() {
    if (G) return G;
    var R = [[0, -.82], [.62, -.78], [.98, -.10], [.92, .35], [.50, .82], [0, .90]];
    var cur = MK.P.smooth(R, 10, false), n = cur.length, i, k;
    var want = {}; for (k = 0; k < 4; k++) {
      var yk = -.05 + .65 * (k + .5) / 4, best = -1, bd = 9;
      for (i = 2; i < n - 3; i++) { var d = Math.abs(cur[i][1] - yk); if (d < bd) { bd = d; best = i; } }
      want[best] = 1;
    }
    var right = [];
    for (i = 0; i < n; i++) {
      if (want[i]) {
        var a = cur[i], b = cur[i + 2], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
        var m = cur[i + 1], nx = ty, ny = -tx;
        right.push(a); right.push([m[0] + nx * .13 + tx * .05, m[1] + ny * .13 + ty * .05]); i += 1;
      } else right.push(cur[i]);
    }
    var left = mir(right.slice(1, -1)).reverse();
    var eyes = {};
    [-1, 1].forEach(function (sx) {
      var ci = [sx * .17, -.10], co = [sx * .58, -.34], top = [sx * .36, -.45], bot = [sx * .42, -.02];
      eyes[sx] = { ci: ci, co: co, topCurve: quad(ci, top, co, 12), botCurve: quad(co, bot, ci, 12), cx: sx * .37, cy: -.23 };
      var path = new Path2D(); path.moveTo(ci[0], ci[1]); path.quadraticCurveTo(top[0], top[1], co[0], co[1]); path.quadraticCurveTo(bot[0], bot[1], ci[0], ci[1]); path.closePath();
      eyes[sx].path = path;
    });
    G = { head: right.concat(left), headOpen: right.concat(left, [right[0]]), eyes: eyes };
    return G;
  }

  function stripeList() {
    var L = [];
    [-1, 1].forEach(function (sx) {
      function add(k, pts, w0) { L.push({ k: k, pts: pts.map(function (p) { return [sx * p[0], p[1]]; }), w: [w0, 0] }); }
      add('cheek', [[.95, -.08], [.80, -.10], [.62, -.03]], .16);
      add('cheek', [[.93, .14], [.78, .12], [.58, .18]], .16);
      add('cheek', [[.87, .34], [.72, .30], [.54, .33]], .15);
      add('cheek', [[.70, .57], [.58, .51], [.45, .51]], .12);
      add('crown', [[.30, -.81], [.27, -.72], [.23, -.65]], .09);
      add('crown', [[.46, -.80], [.42, -.70], [.36, -.60]], .10);
      add('crown', [[.61, -.77], [.56, -.68], [.50, -.58]], .10);
      add('crown', [[.73, -.62], [.67, -.55], [.62, -.47]], .085);
      add('brow', [[.18, -.53], [.40, -.57], [.64, -.52]], .065);
      add('eye', [[.60, -.33], [.76, -.38], [.90, -.34]], .07);
      add('eye', [[.34, -.04], [.44, .02], [.47, .11]], .06);
    });
    return L;
  }
  var STRIPES = null;

  /* one full stack of the front face in a given line colour */
  function face(P, s, o) {
    var g = geom(), ow = o.ow, ln = o.line, th = o.thick, e = s.eyeOpen, sx;
    var faceSt = o.alive ? { c: 'paper', t: .08, h: 'grain', a: 0 } : { c: 'paper', t: .1, h: 'dots' };
    var dark = { c: ln, t: 0 };
    // ears
    [-1, 1].forEach(function (sx) {
      P.circle(sx * .72, -.78, .17, { c: ln, t: 0 });
      P.ellipse(sx * .75, -.79, .05, .07, { c: 'paper', t: 0 });
    });
    // head
    var hs = { stroke: { w: ow, c: ln } }; for (var k in faceSt) hs[k] = faceSt[k];
    P.poly(g.head, hs);
    P.ellipse(0, .41, .40, .36, { c: 'paper', t: 0 });
    // stripes
    [-1, 1].forEach(function (sx) { P.ellipse(sx * .41, -.455, .21, .065, { c: 'paper', t: 0 }, -sx * .3); });
    STRIPES.forEach(function (st) { var w0 = st.w[0] * th; P.taper(st.pts, function (u) { return w0 * Math.pow(1 - u, .85) + .004; }, dark, 7); });
    // 王
    [[-.62, .21], [-.51, .18], [-.40, .21]].forEach(function (r) {
      P.taper([[-r[1], r[0]], [0, r[0] - .004], [r[1], r[0]]], function (u) { return .10 * th * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 2.2)), .7) + .006; }, dark, 6);
    });
    P.taper([[0, -.66], [0, -.51], [0, -.36]], function (u) { return .085 * th * (1 - Math.pow(Math.abs(2 * u - 1), 3)) + .01; }, dark, 6);
    // eyes
    [-1, 1].forEach(function (sx) {
      var E = g.eyes[sx], lidY = MK.lerp(-.04, -.40, clamp(e, 0, 1));
      P.clip(E.path, function () {
        P.circle(E.cx, E.cy, .32, { c: 'paper', t: 0 });
        if (e < 1) { /* closed part = face colour */ }
        P.clip([[-1, lidY], [1, lidY], [1, 1], [-1, 1]], function () {
          if (e > .02) {
            var gold = o.alive;
            P.circle(E.cx, E.cy, .095, { c: gold ? 'gold' : ln, t: gold ? P.rad(E.cx, E.cy, .03, .095, [[0, 0], [.7, .05], [1, .45]]) : 0, a: 90 });
            P.ellipse(E.cx, E.cy, .008 + .032 * s.pupil, .09, { c: gold ? 'ink' : 'paper', t: 0 });
            P.circle(E.cx + .034, E.cy - .03, .018, { c: 'paper', t: 0 });
          }
        });
        if (e < 1) P.rect(-1, -.7, 2, lidY + .7, { c: 'paper', t: faceSt.t, h: faceSt.h, a: faceSt.a || 0 });
        if (e > .05) P.stroke(E.topCurve, { w: .05 * th * Math.min(1, e * 2), c: ln, closed: false });
      });
      P.stroke(E.topCurve.concat(E.botCurve), { w: ow * 1.2, c: ln, closed: true });
      P.stroke(E.topCurve, { w: ow * 2.3 * th, c: ln, closed: false });
      P.taper([E.co, [E.co[0] + sx * .06, E.co[1] - .035], [E.co[0] + sx * .13, E.co[1] - .06]], [.034 * th, .006], dark, 4);
      P.taper([E.ci, [E.ci[0] - sx * .04, E.ci[1] + .015]], [.03, .01], dark, 3);
      if (e < .3) P.stroke(E.botCurve, { w: ow * 1.8, c: ln, closed: false });
    });
    // nose + bridge
    P.path('M-.12 .08 L.12 .08 Q.14 .17 0 .255 Q-.14 .17 -.12 .08 Z', dark);
    [-1, 1].forEach(function (sx) {
      P.taper([[sx * .08, -.12], [sx * .095, -.02], [sx * .095, .06]], [.036 * th, .008], dark, 5);
      var pc = { c: 'paper', t: 0, stroke: { w: ow * .7, c: ln } };
      P.circle(sx * .13, .33, .14, pc);
    });
    [-1, 1].forEach(function (sx) { [[.09, .30], [.17, .33], [.12, .385]].forEach(function (d) { P.circle(sx * d[0], d[1], .015, dark); }); });
    P.ellipse(0, .33, .02, .06, { c: 'paper', t: 0 });
    // mouth
    var m = clamp(s.mouthOpen, 0, 1);
    if (m > .01) {
      var lip = [[-.25, .435], [-.12, .405], [0, .375], [.12, .405], [.25, .435]];
      var low = quad([.24, .44], [.2, .44 + .26 * m], [0, .46 + .30 * m], 8).concat(quad([0, .46 + .30 * m], [-.2, .44 + .26 * m], [-.24, .44], 8).slice(1));
      P.poly(lip.concat(low), dark);
      [-1, 1].forEach(function (sx) { P.poly([[sx * .12 - .032, .43], [sx * .12 + .032, .43], [sx * .12 + sx * .004, .445 + .19 * m]], { c: 'paper', t: 0, stroke: { w: ow * .6, c: ln } });
        P.poly([[sx * .12 - .02, .45 + .26 * m], [sx * .12 + .02, .45 + .26 * m], [sx * .12, .43 + .26 * m - .09 * m]], { c: 'paper', t: 0 }); });
    }
    [-1, 1].forEach(function (sx) {
      P.taper([[0, .25], [0, .36], [sx * .10, .42], [sx * .21, .43]], [.03 * th, .01], dark, 6);
    });
    // whiskers
    [[.29, .22], [.33, .36], [.37, .50]].forEach(function (w, i) {
      [-1, 1].forEach(function (sx) {
        P.taper([[sx * .22, w[0]], [sx * .55, (w[0] + w[1]) / 2 - .05 + i * .02], [sx * .86, w[1]]], [.018, .004], dark, 6);
      });
    });
  }

  /* sky: faint, cloud-built tiger over a red sky */
  function sky(P, s, ow) {
    var g = geom(), e = clamp(s.eyeOpen, 0, 1), al = s.skyAlpha == null ? 1 : s.skyAlpha;
    var F = { c: 'red', t: .26, a: 90 }, D = { c: 'red', t: .8, a: 90 };
    P.alpha(al, function () {
      [-1, 1].forEach(function (sx) { P.circle(sx * .72, -.78, .17, D); P.ellipse(sx * .75, -.79, .05, .07, F); });
      P.poly(g.head, F);
      P.stroke(g.head.concat([g.head[0]]), { w: ow * 1.2, c: 'red', t: .7, a: 90 });
      P.ellipse(0, .41, .40, .36, { c: 'red', t: .1, a: 90 });
      STRIPES.forEach(function (st) { P.taper(st.pts, [st.w[0], st.w[1]], D, 7); });
      [[-.62, .21], [-.51, .18], [-.40, .21]].forEach(function (r) { P.taper([[-r[1], r[0]], [0, r[0]], [r[1], r[0]]], [.085, .085], D, 4); });
      P.taper([[0, -.66], [0, -.36]], [.06, .06], D, 2);
      P.path('M-.12 .08 L.12 .08 Q.14 .17 0 .255 Q-.14 .17 -.12 .08 Z', { c: 'red', t: .9, a: 90 });
      [-1, 1].forEach(function (sx) { P.taper([[0, .25], [0, .36], [sx * .10, .42], [sx * .21, .43]], [.03, .01], D, 6); });
    });
    [-1, 1].forEach(function (sx) {
      var E = g.eyes[sx];
      P.circle(E.cx, E.cy, .27, { c: 'paper', t: P.rad(E.cx, E.cy, .05, .27, [[0, 0], [.45, .22], [1, .95]]), a: 90 });
      P.clip(E.path, function () {
        P.circle(E.cx, E.cy, .3, { c: 'gold', t: 0 });
        if (e < 1) P.rect(-1, -.7, 2, MK.lerp(-.04, -.40, e) + .7, { c: 'red', t: .26, a: 90 });
        P.ellipse(E.cx, E.cy, .009 + .026 * s.pupil, .09, { c: 'ink', t: 0 });
      });
      P.stroke(E.topCurve.concat(E.botCurve), { w: ow * 1.6, c: 'red', t: .85, a: 90, closed: true });
      P.stroke(E.topCurve, { w: ow * 3, c: 'red', t: .9, a: 90, closed: false });
    });
  }

  /* block: carved wooden block. grooves appear along carve order; returns tip */
  function carveLines(g) {
    var L = [], i;
    L.push({ pts: g.head.concat([g.head[0]]) });
    [-1, 1].forEach(function (sx) { L.push({ pts: circ(sx * .72, -.78, .17, 18) }); });
    L.push({ open: 1, pts: [[-.21, -.62], [0, -.624], [.21, -.62]] }); L.push({ open: 1, pts: [[-.18, -.51], [0, -.514], [.18, -.51]] }); L.push({ open: 1, pts: [[-.21, -.40], [0, -.404], [.21, -.40]] }); L.push({ open: 1, pts: [[0, -.66], [0, -.36]] });
    STRIPES.forEach(function (st) { L.push({ open: 1, pts: MK.P.smooth(st.pts, 5, false), w: st.w[0] * .45 }); });
    [-1, 1].forEach(function (sx) { var E = g.eyes[sx]; L.push({ pts: E.topCurve.concat(E.botCurve) }); });
    L.push({ pts: [[-.12, .08], [.12, .08], [.07, .17], [0, .25], [-.07, .17], [-.12, .08]] });
    [-1, 1].forEach(function (sx) { L.push({ open: 1, pts: [[0, .25], [0, .36], [sx * .10, .42], [sx * .21, .43]] }); });
    [[.29, .22], [.33, .36], [.37, .50]].forEach(function (w, k) { [-1, 1].forEach(function (sx) { L.push({ open: 1, pts: [[sx * .22, w[0]], [sx * .55, (w[0] + w[1]) / 2 - .05 + k * .02], [sx * .86, w[1]]] }); }); });
    L.forEach(function (l) { l.len = 0; l.cum = [0]; for (i = 1; i < l.pts.length; i++) { l.len += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]); l.cum.push(l.len); } });
    return L;
  }
  var CARVE = null;
  function partial(l, f) {
    if (f <= 0) return null; if (f >= 1) return l.pts;
    var d = l.len * f, out = [l.pts[0]], i;
    for (i = 1; i < l.pts.length; i++) {
      if (l.cum[i] <= d) out.push(l.pts[i]);
      else { var u = (d - l.cum[i - 1]) / ((l.cum[i] - l.cum[i - 1]) || 1); out.push([MK.lerp(l.pts[i - 1][0], l.pts[i][0], u), MK.lerp(l.pts[i - 1][1], l.pts[i][1], u)]); break; }
    }
    return out;
  }
  function block(P, s, ow, size) {
    var g = geom(); if (!CARVE) CARVE = carveLines(g);
    var tot = 0; CARVE.forEach(function (l) { tot += l.len; });
    var cum = clamp(s.carve, 0, 1) * tot, acc = 0, parts = [], tip = null, tipAng = 0;
    CARVE.forEach(function (l, i) {
      var f = clamp((cum - acc) / l.len, 0, 1); acc += l.len;
      var pp = partial(l, f); if (pp) { parts.push({ pts: pp, l: l, i: i }); if (f < 1 && f > 0) { tip = pp[pp.length - 1]; var q = pp[pp.length - 2] || pp[0]; tipAng = Math.atan2(tip[1] - q[1], tip[0] - q[0]); } }
    });
    if (!tip && parts.length) { var lp = parts[parts.length - 1].pts; tip = lp[lp.length - 1]; }
    var gw = Math.max(.02, 3.4 * 2 / size);
    function plate(red, markC) {
      P.poly(g.head, red ? { c: 'red', t: 0, stroke: { w: ow, c: 'ink' } } : { c: 'paper', t: .38, h: 'grain', a: 0, stroke: { w: ow, c: 'ink' } });
      parts.forEach(function (p) {
        var w = (p.l.w ? Math.min(.06, Math.max(gw, p.l.w)) : gw);
        P.stroke(p.pts, { w: w, c: red ? 'paper' : 'ink', t: red ? .32 : null, h: 'grain', a: 0, closed: !p.l.open && p.pts.length === p.l.pts.length });
        /* chisel facets: short 60-degree arcs next to the groove */
        var r = MK.rng(p.i * 13 + 5), n = Math.floor(p.l.len / .34), k;
        for (k = 0; k < n; k++) {
          var at = r(), idx = Math.min(p.pts.length - 1, Math.floor(at * p.pts.length)), q = p.pts[idx], sd = r() < .5 ? -1 : 1, off = (.05 + .05 * r()) * sd;
          var a0 = Math.PI / 3 * (r() < .5 ? 1 : -1) * .9, len = .05 + .05 * r();
          P.stroke([[q[0] + off, q[1] + off * .3], [q[0] + off + Math.cos(a0) * len * .5, q[1] + off * .3 + Math.sin(a0) * len * .5 - len * .12], [q[0] + off + Math.cos(a0) * len, q[1] + off * .3 + Math.sin(a0) * len]], { w: Math.max(.012, 1.8 * 2 / size), c: red ? 'paper' : 'ink', closed: false });
        }
      });
    }
    plate(false);
    var ik = clamp(s.inked, 0, 1);
    if (ik > 0.001) {
      var xs = MK.lerp(-1.3, 1.3, ik);
      P.clip(function (p) { p.rect(-1.5, -1.5, xs + 1.5, 3); }, function () {
        P.clip(g.head, function () { plate(true); });
      });
    }
    return tip ? { x: tip[0], y: tip[1], ang: tipAng } : null;
  }

  art.tiger = function (P, cx, cy, size, s) {
    var d = { mode: 'print', mirror: false, eyeOpen: 0, pupil: .5, mouthOpen: 0, ink: 0, carve: 1, inked: 0 };
    s = s || {}; for (var k in d) if (s[k] == null) s[k] = d[k];
    if (s.mode === 'alive' && s._inkDefault !== false && s.ink === 0 && arguments.length) { /* alive means fully inked unless told otherwise */ s.ink = s.ink || 1; }
    geom(); if (!STRIPES) STRIPES = stripeList();
    var ow = clamp(9 / size, .012, .028);
    s.tip = null;
    function run() {
      P.push(); P.translate(cx, cy); P.scale((s.mirror ? -1 : 1) * size / 2, size / 2);
      var m = s.mode;
      if (m === 'block') {
        var t = block(P, s, ow, size);
        if (t) s.tip = { x: cx + (s.mirror ? -1 : 1) * t.x * size / 2, y: cy + t.y * size / 2, ang: s.mirror ? Math.PI - t.ang : t.ang };
      } else if (m === 'sky') sky(P, s, ow);
      else {
        var ink = clamp(s.ink, 0, 1), th = 1 + .32 * ink;
        if (ink >= 1) face(P, s, { line: 'ink', alive: true, ow: ow, thick: th });
        else {
          face(P, s, { line: 'red', alive: false, ow: ow, thick: 1 });
          if (ink > 0) P.clip(function (p) { p.arc(0, -.15, ink * 2.3, 0, 6.2832); }, function () { face(P, s, { line: 'ink', alive: true, ow: ow, thick: th }); });
        }
      }
      P.pop();
    }
    if (typeof s.reveal === 'function') s.reveal(run); else run();
    return s.tip;
  };
})();
