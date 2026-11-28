/* s06 — 범: the red print comes alive (ink spreads from the eyes), eyes open, push-in, roar */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, TAU = Math.PI * 2, range = MK.range;
  var TX = 500, TY = 660, TS = 760, PUSH = [500, 584], MOUTH = [500, 660 + .44 * 380];
  var ROAR = null;

  function build() {
    var r = MK.rng(606), i; ROAR = [];
    for (i = 0; i < 24; i++) {
      var a = (i + r.range(-.3, .3)) / 24 * TAU;
      ROAR.push({ a: a, r0: r.range(250, 330), len: r.range(300, 620), w: r.range(36, 80), bend: r.range(-40, 40), k: r.range(0, .12) });
    }
  }

  /* draws the tiger scene at progress p (also used by t06 as 'A' at p = 1) */
  MK.scene({
    id: 's06', order: 60, len: 1.6, title: 'Жолбарыс', hold: null,
    overlay: [
      { type: 'caption', at: [.05, .3], x: 90, y: 1258, w: 520, side: 'l', rot: -1, text: 'Баспа тірілді.' },
      { type: 'sfx', at: [.36, .55], x: 745, y: 205, size: 170, rot: -7, font: 'impact', color: 'paper', fx: 'pop', text: '번쩍!', gloss: 'жарқ' },
      { type: 'sfx', at: [.86, .995], x: 500, y: 215, size: 215, rot: -4, font: 'impact', color: 'red', fx: 'shake', text: '크아앙!', gloss: 'ыррр' }
    ],
    init: function () { build(); },
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, st = ctx.state, fx = ctx.fx, i;
      if (!ROAR) build();
      P.cover({ c: 'paper', t: 0 });
      var ink = range(p, 0, .35);
      var open = p < .35 ? 0 : E.outBack(range(p, .35, .47));
      var pupil = MK.lerp(1, .35, range(p, .42, .55));
      var sc = 1 + 1.4 * E.inOutCubic(range(p, .55, .85));
      P.push(); P.translate(PUSH[0], PUSH[1]); P.scale(sc); P.translate(-PUSH[0], -PUSH[1]);
      MK.art.tiger(P, TX, TY, TS, { mode: 'print', mirror: false, eyeOpen: open, pupil: pupil, mouthOpen: 0, ink: ink, action: { scene: 's06', clock: p * 4, t: t } });
      P.pop();
      /* roar strokes radiating from the mouth (screen space after the push-in) */
      var my = PUSH[1] + (MOUTH[1] - PUSH[1]) * sc, g = E.outCubic(range(p, .86, .99));
      if (g > 0) ROAR.forEach(function (s) {
        if (Math.abs(Math.atan2(Math.sin(s.a + Math.PI / 2), Math.cos(s.a + Math.PI / 2))) < .75) return;
        var gg = clamp((g - s.k) / (1 - s.k), 0, 1); if (gg <= 0) return;
        var ca = Math.cos(s.a), sa = Math.sin(s.a), r0 = s.r0 + 40 * (1 - gg), r1 = r0 + s.len * gg, nx = -sa, ny = ca;
        var pts = [[MOUTH[0] + ca * r0, my + sa * r0 * .8], [MOUTH[0] + ca * (r0 + r1) / 2 + nx * s.bend, my + (sa * (r0 + r1) / 2 + ny * s.bend) * .8], [MOUTH[0] + ca * r1, my + sa * r1 * .8]];
        P.taper(pts, function (u) { return s.w * Math.pow(Math.sin(Math.PI * Math.min(1, u * .92 + .04)), .8) * (.4 + .6 * gg) + 1.5; }, { c: 'ink', t: 0 }, 6);
      });
      /* fx */
      if (p < .35) fx.misreg = [1, .6];
      var to = MK.event(st, 'open', p, .36, t, 2.5);
      if (to >= 0 && to < 1.2) {
        var k = Math.exp(-to / .3);
        fx.misreg = [2 * k * Math.sin(t * 61) + 1 * (1 - k), 2 * k * Math.cos(t * 47)];
        var fa = .15 * Math.exp(-to / .14); if (!fx.flash || fx.flash.a < fa) fx.flash = { c: 'paper', a: fa };
      }
      var tr = MK.event(st, 'roar', p, .86, t, 2.5);
      if (tr >= 0) fx.shake = Math.max(fx.shake || 0, 6 * Math.exp(-tr / .3));
    }
  });
})();
