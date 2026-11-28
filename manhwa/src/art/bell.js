/* art/bell.js — Korean bronze temple bell (범종). MK.art.bell(P, cx, topY, s)
   (cx, topY) = centre of the shoulder (top of the barrel). s = scale (number) or {scale, glint:0..1 (gold glint)}.
   Local geometry (scale 1): barrel 0..760 tall, shoulder 340 wide, lip 428 wide; dragon loop above (-62..0), sound tube at x 60..100. */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {};
  var HALF = null;

  function profile() {
    if (HALF) return HALF;
    var r = [[0, 0], [110, 2], [150, 22], [171, 70], [177, 200], [185, 420], [199, 620], [209, 700], [214, 754]];
    var half = MK.P.smooth(r, 8, false), left = half.slice(1, -1).map(function (p) { return [-p[0], p[1]]; }).reverse();
    HALF = { poly: half.concat([[-214, 754]]).concat(left), half: half };
    return HALF;
  }
  function bandDots(P, y0, y1, hw) {
    var y = (y0 + y1) / 2, x;
    for (x = -hw + 12; x < hw; x += 24) P.circle(x, y, 5, { c: 'paper', t: 0 });
    P.stroke([[-hw, y0 + 5], [hw, y0 + 5]], { w: 2.4, c: 'paper' }); P.stroke([[-hw, y1 - 5], [hw, y1 - 5]], { w: 2.4, c: 'paper' });
  }

  art.bell = function (P, cx, topY, s) {
    if (typeof s === 'number') s = { scale: s }; s = s || {};
    var sc = s.scale || 1, g = profile(), k, i, j;
    P.push(); P.translate(cx, topY); P.scale(sc);
    /* sound tube (음통) behind the dragon */
    P.poly([[58, 8], [64, -74], [98, -74], [104, 8]], { c: 'paper', t: P.lin(58, 0, 104, 0, [[0, .7], [.4, .15], [1, .8]]), a: 0, stroke: { w: 3.6, c: 'ink' } });
    P.ellipse(81, -74, 17, 6, { c: 'ink', t: 0 });
    [[-60, -52], [-24, -16]].forEach(function (b) { P.poly([[60.5, b[1]], [101.5, b[1]], [101.5, b[0]], [62.5, b[0]]], { c: 'ink', t: 0 }); P.stroke([[62, (b[0] + b[1]) / 2], [100, (b[0] + b[1]) / 2]], { w: 2, c: 'paper' }); });
    /* barrel */
    P.poly(g.poly, { c: 'paper', t: P.lin(-214, 0, 214, 0, [[0, .85], [.25, .35], [.45, .15], [.7, .4], [1, .9]]), a: 0, stroke: { w: 5, c: 'ink' } });
    P.clip(g.poly, function () {
      /* upper band (30..90) + lower band (690..740): ink with paper dots */
      P.rect(-230, 30, 460, 60, { c: 'ink', t: 0 }); bandDots(P, 30, 90, 230);
      P.rect(-230, 690, 460, 50, { c: 'ink', t: 0 }); bandDots(P, 690, 740, 230);
      /* vertical seams */
      P.stroke([[-6, 92], [-6, 688]], { w: 2, c: 'ink', t: .0 });
      /* 유곽 panels with 3x3 knobs */
      [[-130, 110], [30, 110]].forEach(function (pp) {
        P.rect(pp[0] - 6, pp[1] - 6, 112, 122, { c: 'ink', t: 0 });
        P.rect(pp[0], pp[1], 100, 110, { c: 'paper', t: .18, a: 0, stroke: { w: 3, c: 'ink' } });
        for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
          var kx = pp[0] + 20 + i * 30, ky = pp[1] + 20 + j * 35;
          P.circle(kx, ky, 9.5, { c: 'paper', t: 0, stroke: { w: 3, c: 'ink' } }); P.circle(kx - 2, ky - 2, 3, { c: 'ink', t: 0 });
        }
      });
      /* 당좌 lotus medallion at (0,520) r 62 */
      P.circle(0, 520, 66, { c: 'ink', t: 0 });
      P.circle(0, 520, 62, { c: 'paper', t: .12, a: 0, stroke: { w: 3, c: 'ink' } });
      for (k = 0; k < 8; k++) {
        var an = k * Math.PI / 4;
        P.ellipse(Math.cos(an) * 38, 520 + Math.sin(an) * 38, 13, 25, { c: 'paper', t: 0, stroke: { w: 3, c: 'ink' } }, an + Math.PI / 2);
      }
      P.circle(0, 520, 19, { c: 'paper', t: 0, stroke: { w: 3.4, c: 'ink' } });
      for (k = 0; k < 6; k++) P.circle(Math.cos(k * 1.047) * 9, 520 + Math.sin(k * 1.047) * 9, 2.4, { c: 'ink', t: 0 });
      P.circle(0, 520, 2.4, { c: 'ink', t: 0 });
    });
    /* mouth rim */
    P.ellipse(0, 756, 214, 15, { c: 'ink', t: 0 });
    P.stroke([[-214, 754], [-196, 764], [0, 772], [196, 764], [214, 754]], { w: 4, c: 'ink', closed: false });
    /* dragon loop (용뉴): S-shaped tapered brush + head */
    P.taper([[-72, 6], [-60, -26], [-22, -34], [8, -62], [46, -54], [62, -22], [56, 6]], function (u) { return 34 - 14 * Math.sin(u * Math.PI); }, { c: 'ink', t: 0 }, 6);
    P.taper([[-62, -8], [-50, -26], [-20, -30]], [6, 2], { c: 'paper', t: 0 }, 4);
    P.ellipse(-76, 4, 17, 12, { c: 'ink', t: 0 }, -.5); P.circle(-80, 1, 3.2, { c: 'paper', t: 0 });
    P.circle(8, -64, 12, { c: 'paper', t: .1, stroke: { w: 4, c: 'ink' } }); P.circle(8, -64, 3.5, { c: 'ink', t: 0 });
    /* gold glint */
    if (s.glint > .01) {
      var gl = s.glint, a = 84 * gl, x = -96, y = 330;
      P.poly([[x, y - a], [x + a * .18, y - a * .18], [x + a, y], [x + a * .18, y + a * .18], [x, y + a], [x - a * .18, y + a * .18], [x - a, y], [x - a * .18, y - a * .18]], { c: 'gold', t: 0 });
    }
    P.pop();
  };
})();
