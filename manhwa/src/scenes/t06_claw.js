/* t06 «Тырнақ» — four claw slashes tear diagonally across the screen, then peel away over the bell pavilion */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, range = MK.range;
  var DX = -.62, DY = .78, NX = .78, NY = .62;           /* slash direction (top-right -> bottom-left) and its normal */
  var CX = 500, CY = 700, HL = 1350;                     /* centre, half length */
  var SP = 300, WMAX = 260;
  var SPEED = null;

  function buildSpeed() {
    var r = MK.rng(61), i, j; SPEED = [];
    for (i = 0; i < 26; i++) {
      var y = r.range(150, 1250), x = r.range(-300, 1000), len = r.range(260, 760), segs = [], x0 = x;
      for (j = 0; j < 4; j++) { var l = len * r.range(.12, .4); segs.push([x0, y + r.range(-5, 5), l, r.range(3, 9)]); x0 += l + r.range(10, 70); }
      SPEED.push({ y: y, segs: segs, sp: r.range(500, 1100), ph: r.range(0, 1) });
    }
  }
  /* centreline point of slash i at u in [0,1] (0 = top-right) */
  function pt(i, u) {
    var o = (i - 1.5) * SP, along = (u - .5) * 2 * HL, bow = 60 * Math.sin(Math.PI * u) * (i % 2 ? 1 : -1) + 18 * (i - 1.5) * (u - .5);
    return [CX + NX * (o + bow) + DX * along, CY + NY * (o + bow) + DY * along];
  }
  function widthAt(u, gw) {   /* fat in the middle, pointed at both ends */
    var e = Math.abs(2 * u - 1); return WMAX * gw * Math.pow(Math.max(0, 1 - Math.pow(e, 3.2)), .6);
  }
  function slash(P, i, g, gw, dx, dy, st, shrink) {
    var pts = [], n = 22, k, m = Math.max(2, Math.round(n * g));
    for (k = 0; k <= m; k++) { var u = g * k / m, q = pt(i, u); pts.push([q[0] + dx, q[1] + dy]); }
    P.taper(pts, function (v) {
      var u = g * v, head = g >= .999 ? 1 : Math.pow(clamp((1 - v) / .22, 0, 1), .75);
      return widthAt(u, gw) * (shrink == null ? 1 : shrink) * head + 1;
    }, st, 1);
  }

  MK.transition({
    id: 't06', order: 65, len: .8, from: 's06', to: 's07', kind: 'custom',
    draw: function (ctx, q, drawA, drawB) {
      var P = ctx.P, fx = ctx.fx, t = ctx.t, b = ctx.view.bounds, i;
      if (!SPEED) buildSpeed();
      if (q < .5) drawA(1); else drawB(0);
      /* claw slashes */
      var gw = 1 + .32 * range(q, .3, .5), out = range(q, .5, 1), shrink = 1 - E.inCubic(out), slide = E.inCubic(out) * 1900;
      for (i = 0; i < 4; i++) {
        var g = E.outCubic(range(q, .08 * i, .08 * i + .22)); if (g <= 0) continue;
        var sx = DX * slide, sy = DY * slide;
        if (out > 0 && shrink <= .004) continue;
        slash(P, i, g, gw, 8 + sx, 6 + sy, { c: 'red', t: 0 }, out > 0 ? shrink : null);
        slash(P, i, g, gw, sx, sy, { c: 'ink', t: 0 }, out > 0 ? shrink : null);
      }
      /* dry-brush speed lines over the red background */
      var sv = range(q, .35, .8), env = E.smoothstep(range(q, .35, .52)) * (1 - E.smoothstep(range(q, .66, .8)));
      if (env > .01) SPEED.forEach(function (s) {
        var shift = (sv * s.sp * .9 + s.ph * 40) * -1 + 600 * (1 - sv);
        s.segs.forEach(function (g) {
          var x0 = g[0] + shift, L = g[2] * env;
          P.taper([[x0, g[1]], [x0 + L / 2, g[1] - 1], [x0 + L, g[1]]], function (u) { return g[3] * Math.pow(Math.sin(Math.PI * Math.min(1, u * .95 + .025)), .7) * env + .6; }, { c: 'ink', t: 0 }, 3);
        });
      });
      var sk = Math.exp(-Math.pow((q - .3) / .09, 2)); if (sk > .02) fx.shake = Math.max(fx.shake || 0, 8 * sk);
      if (q >= .15 && q <= .45) ctx.sfx('휘익!', { key: 'claw', x: 360, y: 330, size: 190, rot: -12, font: 'impact', color: 'paper', fx: 'echo', gloss: 'зу', life: 1.6 });
    }
  });
})();
