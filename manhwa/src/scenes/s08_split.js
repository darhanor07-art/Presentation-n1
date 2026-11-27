/* s08 — 쪼개짐: the (now empty) block cracks along its grain; the halves part and blue light pours out */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, range = MK.range, D2R = Math.PI / 180;
  var CR = null, MARKS = null, RAYS = null, CL = [290, 700], CRr = [710, 700], LC = [500, 700];

  function build() {
    CR = MK.fx.crackPath(808, 500, 120, 1280, 40);
    var r = MK.rng(88), i; MARKS = []; RAYS = [];
    for (i = 0; i < 300; i++) MARKS.push({ x: r.range(140, 860), y: r.range(220, 1180), a: (60 + r.range(-8, 8)) * D2R, l: r.range(50, 120), w: r.range(5, 11) });
    for (i = 0; i < 44; i++) RAYS.push({ a: i / 44 * Math.PI * 2 + r.range(-.05, .05), w: r.range(.006, .03), l: r.range(1150, 1900), k: r.range(0, 6.28) });
  }
  function partial(pts, f) {
    var tot = 0, i, d = []; for (i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); d.push(tot); }
    var want = tot * f, out = [pts[0]];
    for (i = 1; i < pts.length; i++) {
      if (d[i - 1] <= want) out.push(pts[i]);
      else { var prev = d[i - 2] || 0, u = (want - prev) / ((d[i - 1] - prev) || 1); out.push([MK.lerp(pts[i - 1][0], pts[i][0], u), MK.lerp(pts[i - 1][1], pts[i][1], u)]); break; }
    }
    return out;
  }
  function xf(pt, c, dx, rot) {
    var x = pt[0] - c[0], y = pt[1] - c[1], cs = Math.cos(rot), sn = Math.sin(rot);
    return [x * cs - y * sn + c[0] + dx, x * sn + y * cs + c[1]];
  }

  /* shared top-down block (same geometry as s04/s05), surface inked red, design area carved empty */
  function block(P) {
    P.toneOnly(function () { P.rect(108, 150, 860, 1160, { c: 'ink', t: .95, h: 'cross', a: 45 }); });
    [120, 1210].forEach(function (y) {
      P.rect(70, y, 860, 70, { c: 'paper', t: .8, h: 'grain', a: 90, stroke: { w: 4.5, c: 'ink' } });
      [118, 882].forEach(function (x) { P.circle(x, y + 35, 11, { c: 'paper', t: 0, stroke: { w: 3, c: 'ink' } }); P.circle(x, y + 35, 3.5, { c: 'ink', t: 0 }); });
    });
    P.rect(90, 170, 820, 1060, { c: 'red', t: .1, h: 'grain', a: 0, stroke: { w: 5, c: 'ink' } });
    P.stroke([[108, 188], [892, 188], [892, 1212], [108, 1212]], { w: 3, c: 'paper', closed: true });
    P.rect(130, 210, 740, 980, { c: 'paper', t: .36, h: 'grain', a: 0, stroke: { w: 4.5, c: 'ink' } });
    P.clip([[130, 210], [870, 210], [870, 1190], [130, 1190]], function () {
      P.toneOnly(function () {
        MARKS.forEach(function (m) {
          var dx = Math.cos(m.a) * m.l, dy = Math.sin(m.a) * m.l;
          P.taper([[m.x, m.y], [m.x + dx / 2, m.y + dy / 2], [m.x + dx, m.y + dy]], [m.w, 1], { c: 'ink', t: .8, h: 'line', a: 60 }, 3);
        });
      });
      MARKS.forEach(function (m, i) {
        if (i % 6) return; var dx = Math.cos(m.a) * m.l * .5, dy = Math.sin(m.a) * m.l * .5;
        P.taper([[m.x, m.y], [m.x + dx, m.y + dy]], [3.4, .6], { c: 'ink', t: 0 }, 2);
      });
      P.stroke([[134, 1186], [134, 214], [866, 214]], { w: 9, c: 'ink', closed: false });
      P.stroke([[134, 1187], [866, 1187], [866, 214]], { w: 3.5, c: 'paper', closed: false });
    });
  }

  MK.scene({
    id: 's08', order: 80, len: 1.2, title: 'Жарылу', hold: null,
    overlay: [
      { type: 'caption', at: [.45, .95], x: 90, y: 1248, w: 560, side: 'l', rot: -1.1, text: 'Тақта жарылды. Ішінде — көк жарық.' },
      { type: 'sfx', at: [.36, .6], x: 760, y: 300, size: 190, rot: -8, font: 'impact', color: 'red', fx: 'pop', text: '쩌억!', gloss: 'шырт' }
    ],
    init: function () { build(); },
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, st = ctx.state, fx = ctx.fx, b = ctx.view.bounds, i, n;
      if (!CR) build();
      n = CR.length;
      P.cover({ c: 'paper', t: .82, h: 'grain', a: 90 });
      var e = E.outCubic(range(p, .35, .8)), lv = E.inCubic(range(p, .8, 1)), grow = range(p, .8, 1);
      var dxL = -220 * e - 950 * lv, dxR = 220 * e + 950 * lv, rL = (-6 * e - 14 * lv) * D2R, rR = (6 * e + 14 * lv) * D2R;
      var CE = [[500, 60]].concat(CR, [[500, 1340]]);
      if (p < .35) {
        block(P);
        var f = range(p, 0, .35), part = partial(CR, f);
        P.stroke(part, { w: 7, c: 'ink', closed: false });
        P.push(); P.translate(-3.5, 0); P.stroke(part, { w: 2, c: 'paper', closed: false }); P.pop();
        var sh = 0; for (i = 1; i < n; i++) { var ti = MK.event(st, 'z' + i, p, .35 * (i - 1) / (n - 1) + .002, t, 2.5); if (ti >= 0) sh = Math.max(sh, 3.5 * Math.exp(-ti / .09)); }
        if (sh > .05) fx.shake = Math.max(fx.shake || 0, sh);
      } else {
        for (i = 1; i < n; i++) MK.event(st, 'z' + i, p, .35 * (i - 1) / (n - 1) + .002, t, 2.5);
        /* blue light in the gap */
        var le = CR.map(function (q) { return xf(q, CL, dxL, rL); }), re = CR.map(function (q) { return xf(q, CRr, dxR, rR); }), gap = le.concat(re.slice().reverse());
        var R1 = 700 + 800 * grow, bl = { c: 'blue', t: P.rad(LC[0], LC[1], 0, R1, [[0, 0], [1, .7]]), a: 90 };
        function light() {
          P.cover(bl);
          P.alpha(.5, function () {
            RAYS.forEach(function (r) {
              var L = r.l * (.8 + .2 * Math.sin(t * 1.6 + r.k)), a0 = r.a - r.w, a1 = r.a + r.w;
              P.poly([[LC[0], LC[1]], [LC[0] + Math.cos(a0) * L, LC[1] + Math.sin(a0) * L], [LC[0] + Math.cos(a1) * L, LC[1] + Math.sin(a1) * L]], { c: 'paper', t: 0 });
            });
          });
        }
        P.clip(gap, light);
        if (grow > 0) { var gc = new Path2D(); gc.arc(LC[0], LC[1], grow * 1750, 0, Math.PI * 2); P.clip(gc, light); }
        /* halves */
        [[-1, CL, dxL, rL, [[-400, 60]]], [1, CRr, dxR, rR, [[1400, 60]]]].forEach(function (h) {
          var poly = h[4].concat(CE.slice(), [[h[4][0][0], 1340]]);
          P.push(); P.translate(h[2], 0); P.translate(h[1][0], h[1][1]); P.rotate(h[3]); P.translate(-h[1][0], -h[1][1]);
          P.clip(poly, function () {
            block(P);
            P.stroke(CR, { w: 12, c: 'paper', closed: false }); P.stroke(CR, { w: 4.5, c: 'ink', closed: false });
          });
          P.pop();
        });
        /* splinters (p-driven so scrubbing works) */
        var tau = (p - .35) * 3;
        [3, 8, 13, 18, 23, 27].forEach(function (k, j) {
          var q = CR[Math.min(n - 1, k)];
          MK.fx.splinters(P, { seed: 40 + j, n: 4, x: q[0] - 8, y: q[1], tau: tau, dir: Math.PI, spread: 1.7, speed: 520, g: 600, life: 1.3, size: 20, c: 'paper' });
          MK.fx.splinters(P, { seed: 70 + j, n: 4, x: q[0] + 8, y: q[1], tau: tau, dir: 0, spread: 1.7, speed: 520, g: 600, life: 1.3, size: 20, c: 'paper' });
        });
        var ts = MK.event(st, 'split', p, .35, t, 2.5);
        if (ts >= 0) { fx.shake = Math.max(fx.shake || 0, 10 * Math.exp(-ts / .22)); var mk = Math.exp(-ts / .3); fx.misreg = [3 * mk, 1.5 * mk]; }
      }
    }
  });
})();
