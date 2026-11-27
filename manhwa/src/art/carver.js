/* art/carver.js — the woodblock carver (각수): young woman, BACK VIEW, hanbok. MK.art.carver(P,x,y,size,s) */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {};
  var TAU = Math.PI * 2;

  /* s = {pose:'stand'|'seat', t:seconds (ribbon phase), arm:0..1 (seat: carving cycle), shadow:bool}
     stand: (x,y)=feet centre, size=height.  seat: (x,y)=bottom centre of visible figure (cut by the desk), size=head-top to bottom */
  art.carver = function (P, x, y, size, s) {
    s = s || {}; var sh = !!s.shadow, ow = 3 / size, t = s.t || 0, phase = TAU * 1.4 * t;
    function poly(p, st) { if (sh) P.toneOnly(function () { P.poly(p, { c: 'ink', t: .9 }); }); else P.poly(p, st); }
    function path(d, st) { if (sh) P.toneOnly(function () { P.path(d, { c: 'ink', t: .9 }); }); else P.path(d, st); }
    function taper(p, w, st, n) { if (sh) P.toneOnly(function () { P.taper(p, w, { c: 'ink', t: .9 }, n); }); else P.taper(p, w, st, n); }
    function circle(cx, cy, r, st) { if (sh) P.toneOnly(function () { P.circle(cx, cy, r, { c: 'ink', t: .9 }); }); else P.circle(cx, cy, r, st); }
    function ellipse(cx, cy, rx, ry, st, rot) { if (sh) P.toneOnly(function () { P.ellipse(cx, cy, rx, ry, { c: 'ink', t: .9 }, rot); }); else P.ellipse(cx, cy, rx, ry, st, rot); }
    function stroke(p, o) { if (!sh) P.stroke(p, o); }
    var OUT = { w: ow, c: 'ink' };
    var INK = { c: 'ink', t: 0 };

    P.push(); P.translate(x, y); P.scale(size);

    /* wide hanbok sleeve with rounded 배래 underside; hands hidden (dark cuff mouth at the end) */
    function sleeve(pts, w0, w1, bulge, tone) {
      taper(pts, function (u) { return w0 + (w1 - w0) * u + bulge * Math.sin(Math.min(1, u * 1.25) * Math.PI * .5) * (1 - Math.pow(u, 6)); },
        { c: 'paper', t: tone, a: 0, stroke: OUT }, 8);
      var e = pts[pts.length - 1], q = pts[pts.length - 2], ang = Math.atan2(e[1] - q[1], e[0] - q[0]);
      ellipse(e[0], e[1], w1 * .24, w1 * .5, INK, ang);
    }
    /* daenggi: small bow + two fluttering ribbon tails (1.4 Hz) */
    function daenggi(kx, ky, len, wid) {
      [-1, 1].forEach(function (sx, i) {
        var base = [[kx + sx * wid * .3, ky], [kx + sx * wid * .9, ky + len * .5], [kx + sx * wid * 1.5, ky + len]];
        var pts = MK.fx.ribbon(base, wid * 2, phase + i * 1.3, wid * 2.4, 5);
        taper(pts, [wid * 1.5, wid * 1.0], { c: 'blue', t: 0, stroke: OUT }, 6);
      });
      [-1, 1].forEach(function (sx) {
        ellipse(kx + sx * wid * 1.5, ky + wid * .2, wid * 1.9, wid * 1.05, { c: 'blue', t: 0, stroke: OUT }, sx * .5);
      });
      circle(kx, ky + wid * .2, wid * .9, { c: 'blue', t: 0, stroke: OUT });
    }
    /* ink braid: solid tapered rope; paper chevron marks */
    function braid(pts, w0, w1, y0, y1, step) {
      taper(pts, [w0, w1], INK, 8);
      var sm = P.smooth(pts, 8, false), n = sm.length, i;
      for (var yy = y0; yy < y1; yy += step) {
        var u = (yy - y0) / (y1 - y0), wd = (w0 + (w1 - w0) * u) * .26, cx = 0, best = 9;
        for (i = 0; i < n; i++) { var d = Math.abs(sm[i][1] - yy); if (d < best) { best = d; cx = sm[i][0]; } }
        stroke([[cx - wd, yy], [cx, yy + wd * .9], [cx + wd, yy]], { w: ow * .55, c: 'paper' });
      }
    }
    function foldGrad(w, k0, k1) {
      var stops = [], n = 9, i;
      for (i = 0; i <= n; i++) stops.push([i / n, i % 2 ? k0 : k1 + (i === 0 || i === n ? .05 : 0)]);
      return P.lin(-w, 0, w, 0, stops);
    }

    if (s.pose === 'seat') {
      // chima: full skirt fanning on the floor
      path('M-.20 -.36 C-.24 -.24 -.36 -.12 -.42 0 L.42 0 C.36 -.12 .24 -.24 .20 -.36 Z',
        { c: 'paper', t: P.lin(-.42, 0, .42, 0, [[0, .45], [.1, .15], [.2, .42], [.32, .15], [.44, .4], [.56, .16], [.68, .42], [.8, .15], [.9, .4], [1, .42]]), a: 0, stroke: OUT });
      [-.8, -.55, -.3, 0, .3, .55, .8].forEach(function (f) { stroke([[f * .19, -.34], [f * .3, -.17], [f * .41, -.01]], { w: ow * .55, c: 'ink' }); });
      // jeogori back (short jacket)
      poly([[-.03, -.80], [.03, -.80], [.19, -.76], [.215, -.60], [.225, -.36], [.10, -.335], [0, -.325], [-.10, -.335], [-.225, -.36], [-.215, -.60], [-.19, -.76]],
        { c: 'paper', t: .1, a: 0, stroke: OUT });
      stroke([[0, -.79], [0, -.33]], { w: ow * .8 });
      stroke([[-.19, -.75], [-.10, -.69], [0, -.675], [.10, -.69], [.19, -.75]], { w: ow * .9 });
      // left sleeve resting
      sleeve([[-.17, -.74], [-.31, -.50], [-.27, -.16]], .12, .13, .08, .22);
      // right sleeve carving
      var a = s.arm || 0, hx = .15 + .07 * Math.sin(TAU * a), hy = -.14 + .03 * Math.cos(TAU * a * 2);
      sleeve([[.17, -.74], [.33, -.50], [hx + .08, hy - .08], [hx, hy]], .12, .125, .08, .22);
      // braid + daenggi
      braid([[0, -.815], [.012, -.66], [-.008, -.52], [.008, -.42], [0, -.33]], .052, .034, -.80, -.34, .026);
      daenggi(0, -.325, .21, .015);
      // neck + head
      poly([[-.03, -.835], [.03, -.835], [.034, -.77], [-.034, -.77]], { c: 'paper', t: 0, stroke: OUT });
      ellipse(0, -.90, .092, .105, INK);
      poly([[-.085, -.855], [-.03, -.80], [0, -.775], [.03, -.80], [.085, -.855]], INK);
      stroke([[-.006, -.995], [.006, -.94], [-.004, -.88]], { w: ow * .75, c: 'paper' });
    } else {
      // chima: high waist right under the shoulder blades, full bell, long folds
      path('M-.082 -.745 C-.10 -.52 -.25 -.24 -.34 -.014 C-.17 .012 .17 .012 .34 -.014 C.25 -.24 .10 -.52 .082 -.745 Z',
        { c: 'paper', t: foldGrad(.34, .13, .42), a: 0, stroke: OUT });
      [-.86, -.66, -.46, -.26, -.06, .14, .34, .54, .74, .9].forEach(function (f) {
        stroke([[f * .082, -.73], [f * .17, -.40], [f * .33, -.04]], { w: ow * .5, c: 'ink', t: .3 });
      });
      stroke([[-.335, -.02], [-.17, .0], [0, .004], [.17, .0], [.335, -.02]], { w: ow * 1.1, c: 'ink' });   // soft hem
      // jeogori: short jacket ending at the chest/shoulder-blade line
      poly([[-.022, -.862], [.022, -.862], [.09, -.84], [.098, -.77], [.104, -.715], [.05, -.70], [0, -.696], [-.05, -.70], [-.104, -.715], [-.098, -.77], [-.09, -.84]],
        { c: 'paper', t: .12, a: 0, stroke: OUT });
      stroke([[0, -.86], [0, -.70]], { w: ow * .8 });
      stroke([[-.09, -.835], [-.04, -.805], [0, -.80], [.04, -.805], [.09, -.835]], { w: ow * .7 });
      [-1, 1].forEach(function (sx, i) {
        var sw = Math.sin(phase * .25 + i) * .004;
        sleeve([[sx * .092, -.835], [sx * .17, -.76 + sw], [sx * .205, -.65]], .068, .088, .06, .24);
      });
      // braid + daenggi
      braid([[0, -.885], [.007, -.80], [-.004, -.72], [.004, -.66], [0, -.62]], .034, .022, -.87, -.63, .019);
      daenggi(0, -.612, .17, .0095);
      // neck + head
      poly([[-.02, -.90], [.02, -.90], [.024, -.855], [-.024, -.855]], { c: 'paper', t: 0, stroke: OUT });
      ellipse(0, -.945, .058, .066, INK);
      poly([[-.052, -.915], [-.02, -.88], [0, -.865], [.02, -.88], [.052, -.915]], INK);
      stroke([[-.003, -.999], [.004, -.965], [-.002, -.92]], { w: ow * .6, c: 'paper' });
    }
    P.pop();
  };
})();
