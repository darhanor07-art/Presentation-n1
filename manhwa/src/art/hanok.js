/* art/hanok.js — eave (처마) with end tiles, rafters, wind chime; far ridge silhouette */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {};

  /* edge curve: sags in the middle, corners turn up. Returns y of the roof edge at x. */
  art.eaveY = function (x0, x1, y, depth, x) {
    var xm = (x0 + x1) / 2, u = Math.abs((x - xm) / ((x1 - x0) / 2)), sag = depth * .32;
    return y + sag * (1 - 1.9 * Math.pow(Math.min(u, 1.15), 2.2));
  };

  /* wind chime hanging from pivot (px,py). ang = pendulum angle (rad) */
  art.chime = function (P, px, py, ang, size) {
    var k = size || 1;
    P.push(); P.translate(px, py); P.scale(k); P.rotate(ang || 0);
    P.stroke([[0, 0], [0, 56]], { w: 3 });
    // bell
    P.path('M-26 96 C-26 66 -14 56 0 56 C14 56 26 66 26 96 Z', { c: 'gold', t: P.lin(-26, 0, 26, 0, [[0, .75], [.35, .12], [.65, .12], [1, .75]]), a: 0, stroke: { w: 3, c: 'ink' } });
    P.poly([[-30, 94], [30, 94], [27, 104], [-27, 104]], { c: 'ink', t: 0 });
    P.stroke([[0, 104], [0, 150]], { w: 2.6 });
    // fish plate swings a little behind the bell
    P.push(); P.translate(0, 150); P.rotate(-(ang || 0) * .6);
    P.path('M-24 18 C-24 0 -10 -8 6 -6 C16 -4 24 4 30 12 L40 4 L38 28 L30 22 C22 32 6 40 -8 36 C-18 32 -24 28 -24 18 Z', { c: 'gold', t: P.lin(0, -8, 0, 40, [[0, .55], [.5, .1], [1, .55]]), a: 90, stroke: { w: 3, c: 'ink' } });
    P.circle(-12, 12, 3.4, { c: 'ink', t: 0 });
    P.pop();
    P.pop();
  };

  /* eave across x0..x1 with its edge near y (middle sags down); depth = height of the tiled roof band above the edge.
     s = {chime: rad, rafter: length (default 300), chimeX, bottom: world y to fill down to (default bounds.y1+300), chimeOn:true} */
  art.eave = function (P, x0, x1, y, depth, s) {
    s = s || {}; var ey = function (x) { return art.eaveY(x0, x1, y, depth, x); }, i, x;
    var step = 16, topPts = [], edgePts = [], xm = (x0 + x1) / 2, hw = (x1 - x0) / 2;
    for (x = x0; x <= x1 + .01; x += step) {
      var u = Math.abs((x - xm) / hw), e = ey(x);
      edgePts.push([x, e]); topPts.push([x, e - depth * (1 + .45 * u * u)]);
    }
    var raf = s.rafter == null ? 300 : s.rafter, bottom = s.bottom == null ? MK.view.bounds.y1 + 300 : s.bottom;
    /* dark underside */
    var under = edgePts.map(function (p) { return [p[0], p[1] + 6]; });
    under.push([x1, Math.max(bottom, y + raf + 200)]); under.push([x0, Math.max(bottom, y + raf + 200)]);
    P.poly(under, { c: 'ink', t: 0 });
    /* rafters: round beams fanning slightly toward the vanishing point */
    var pitch = 34, vx = xm, n = Math.ceil((x1 - x0) / pitch);
    for (i = 0; i <= n; i++) {
      var bx = x0 + i * pitch, by = ey(bx) + 22, ex = vx + (bx - vx) * .86, eyy = by + raf * (.85 + .15 * Math.cos(i * 1.7));
      var wTop = 25, wBot = 19;
      P.poly([[bx - wTop / 2, by], [bx + wTop / 2, by], [ex + wBot / 2, eyy], [ex - wBot / 2, eyy]],
        { c: 'paper', t: P.lin(bx - wTop / 2, 0, bx + wTop / 2, 0, [[0, .8], [.5, .12], [1, .7]]), a: 0, stroke: { w: 2.4, c: 'ink' } });
      P.circle(ex, eyy, wBot / 2, { c: 'paper', t: .3, a: 0, stroke: { w: 2.4, c: 'ink' } });
    }
    /* fascia */
    var fas = edgePts.map(function (p) { return [p[0], p[1]]; }).concat(edgePts.slice().reverse().map(function (p) { return [p[0], p[1] + 24]; }));
    P.poly(fas, { c: 'ink', t: 0 });
    /* tiled roof band */
    P.poly(topPts.concat(edgePts.slice().reverse()), { c: 'paper', t: .6, a: 90, stroke: { w: 3.5, c: 'ink' } });
    /* roof ridges (seams) fan lines */
    for (x = x0 + 20; x < x1; x += 46) {
      var u2 = (x - xm) / hw; P.stroke([[x, ey(x) - 2], [x + u2 * 6, ey(x) - depth * (1 + .45 * u2 * u2) + 4]], { w: 2.2 });
    }
    /* end tiles (수막새) */
    var r = Math.min(21, depth * .2), gap = r * 2 + 3;
    for (x = x0 + r; x < x1 - r + .1; x += gap) {
      var cy = ey(x) - r * .95;
      P.circle(x, cy, r, { c: 'paper', t: .12, h: 'dots', stroke: { w: 2.8, c: 'ink' } });
      P.circle(x, cy, r * .6, { c: 'paper', t: 0, stroke: { w: 2, c: 'ink' } });
      P.circle(x, cy, r * .2, { c: 'ink', t: 0 });
    }
    if (s.chimeOn !== false && s.chime != null) {
      var cx = s.chimeX == null ? x1 - 110 : s.chimeX; art.chime(P, cx, ey(cx) + 22, s.chime, s.chimeSize);
    }
  };

  /* small distant roof silhouette (맞배지붕): base line y, height h, spans x0..x1 */
  art.ridge = function (P, x0, x1, y, h, seed, st) {
    st = st || { c: 'ink', t: 0 }; var w = x1 - x0, X = function (f) { return (x0 + w * f).toFixed(1); }, Y = function (f) { return (y - h * f).toFixed(1); };
    P.path('M' + X(0) + ' ' + Y(.52) + ' Q' + X(.16) + ' ' + Y(.5) + ' ' + X(.27) + ' ' + Y(.98) + ' L' + X(.73) + ' ' + Y(.98) +
      ' Q' + X(.84) + ' ' + Y(.5) + ' ' + X(1) + ' ' + Y(.52) + ' Q' + X(.95) + ' ' + Y(.36) + ' ' + X(.88) + ' ' + Y(.38) + ' L' + X(.12) + ' ' + Y(.38) +
      ' Q' + X(.05) + ' ' + Y(.36) + ' ' + X(0) + ' ' + Y(.52) + ' Z', st);
    P.rect(x0 + w * .15, y - h * .4, w * .70, h * .4, st);
    if (st.c === 'ink') [.22, .4, .6, .78].forEach(function (f) { P.rect(x0 + w * f - 3, y - h * .36, 6, h * .36, { c: 'paper', t: 0 }); });
  };
})();
