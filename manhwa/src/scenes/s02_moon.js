/* s02 — 붉은 달: red moon, multiplane night, eave rising from below with a swinging wind chime */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, TAU = Math.PI * 2;
  var TRAVEL = 800;      // eave rise + moon/star drift (ridges are scrubbed by the pre-rendered 3D crane instead)
  var STARS = MK.fx.particles(11, 26, function (r) { return { x0: r.range(-60, 1060), y0: r.range(-120, 470), g: 0, vx: 0, vy: 0, ph: r() * TAU, rr: r.range(2, 4.2) }; });

  /* 7 small irregular crater blobs (offsets from the moon centre) */
  var CRATERS = [[-95, -70, 40], [78, -110, 22], [40, 72, 45], [-120, 66, 24], [128, 20, 30], [-30, -140, 14], [150, -60, 18]].map(function (c, k) {
    var r = MK.rng(k * 7 + 3), pts = [], i, n = 11;
    for (i = 0; i < n; i++) { var a = i / n * TAU, rr = c[2] * (.78 + .44 * r()); pts.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * .88]); }
    pts.t = .12 + .08 * r(); return pts;
  });

  /* mist bands drifting in front of the 3D far/mid layers; y from the rendered skyline (art.ridges return) */
  function mist(P, y, v, n, t, b, ri) {
    var span = b.x1 - b.x0 + 900, i;
    for (i = 0; i < n; i++) {
      var w = 520 + 160 * ((i + ri) % 2), x = b.x0 - 450 + (((i * span / n + (ri * 217) + v * t) % span) + span) % span;
      var yy = y + i * 46 - 20, h = 30 + 10 * ((i + ri) % 3);
      P.taper([[x - w / 2, yy], [x, yy - 3], [x + w / 2, yy]], function (u) { return h * Math.pow(Math.sin(Math.PI * u), .75) + .5; }, { c: 'paper', t: .1, a: 90 }, 6);
    }
  }
  function magpie(P, x, y, pose, sc) {
    P.push(); P.translate(x, y); P.scale(sc); P.rotate(-.12);
    var OUT = { w: 2.6, c: 'ink' };
    P.taper([[-20, 4], [-66, 12], [-112, 22]], [14, 5], { c: 'ink', t: 0 }, 5);                                   // tail
    var up = pose === 0;
    P.poly(up ? [[-8, -4], [-30, -48], [-4, -62], [20, -34], [18, -6]] : [[-8, 2], [-34, 40], [-8, 52], [20, 28], [18, 4]], { c: 'ink', t: 0 });  // wing
    P.poly(up ? [[-4, -10], [-10, -36], [4, -42], [10, -16]] : [[-4, 6], [-12, 30], [2, 38], [10, 16]], { c: 'paper', t: 0 });                    // white wing patch
    P.ellipse(0, 4, 32, 12, { c: 'ink', t: 0 }); P.ellipse(4, 8, 17, 6, { c: 'paper', t: 0 });                    // body + belly
    P.circle(34, -2, 10, { c: 'ink', t: 0 }); P.poly([[42, -4], [58, 0], [42, 3]], { c: 'ink', t: 0 });              // head + beak
    P.circle(37, -4, 2, { c: 'paper', t: 0 });
    P.pop();
  }

  MK.scene({
    id: 's02', order: 20, len: 1.8, title: 'Қызыл ай', hold: null,
    overlay: [
      { type: 'caption', at: [.42, .97], x: 90, y: 150, w: 560, side: 'l', rot: 1.2, text: 'Сол түні ай қызыл болып туды.' }
    ],
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, b = ctx.view.bounds, i;
      /* sky */
      P.cover({ c: 'red', t: P.lin(0, b.y0, 0, 920, [[0, .75], [1, .15]]), a: 90 });
      P.rect(b.x0 - 2, 920, b.x1 - b.x0 + 4, b.y1 + TRAVEL - 920, { c: 'red', t: .15, a: 90 });
      STARS.forEach(function (s) { var r = s.rr * (.7 + .3 * Math.sin(t * 1.7 + s.ph)); P.circle(s.x0, s.y0 + TRAVEL * .03 * (1 - p), r, { c: 'paper', t: 0 }); });
      /* moon + halo rings */
      var mx = 620, my = 430 + TRAVEL * .06 * (1 - p), R = 230;
      [[270, 5, 26, 20, 9], [318, 3.5, 18, 22, -7], [372, 3, 12, 30, 5]].forEach(function (h) {
        var c = new Path2D(); c.arc(mx, my, h[0], 0, TAU);
        P.stroke(c, { w: h[1], c: 'paper', dash: [h[2], h[3]], dashOffset: t * h[4] * 3 });
      });
      P.circle(mx, my, R, { c: 'red', t: 0, stroke: { w: 6, c: 'ink' } });
      var disc = new Path2D(); disc.arc(mx, my, R - 3, 0, TAU);
      P.clip(disc, function () {
        P.circle(mx, my, R, { c: 'red', t: P.rad(mx - 70, my - 70, 120, R * 1.15, [[0, 0], [.5, 0], [1, .5]]), h: 'dots' });
        P.push(); P.translate(mx, my); CRATERS.forEach(function (c) { P.poly(c, { c: 'red', t: c.t, h: 'dots' }); }); P.pop();
      });
      /* ridges + mist */
      var H = MK.art.ridges(P, 's02', p, { x: 0, y: 0, w: 1000, h: 1400 });
      mist(P, H.far + 40, 7, 2, t, b, 0); mist(P, H.mid + 70, 10, 2, t, b, 1);
      /* magpie */
      var mp = MK.range(p, .3, .6);
      if (mp > 0 && mp < 1) {
        var mxp = MK.lerp(b.x0 - 120, b.x1 + 140, mp), myp = 330 - 90 * Math.sin(mp * Math.PI) + 22 * Math.sin(mp * 11) + TRAVEL * .1 * (1 - p);
        magpie(P, mxp, myp, Math.floor(t / .16) % 2, 1.35);
      }
      /* eave */
      var settle = E.outCubic(clamp(p / .78, 0, 1)), eshift = TRAVEL * (1 - settle);
      var swing = (.32 + .5 * (1 - settle)) * Math.sin(TAU * .6 * t);
      MK.art.eave(P, b.x0 - 80, b.x1 + 80, 1190 + eshift, 150, { chime: swing, chimeX: Math.min(b.x1 - 120, 880), rafter: 320 });
    }
  });
})();
