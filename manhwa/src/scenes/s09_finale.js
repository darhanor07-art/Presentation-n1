/* s09 — 끝: red sky with a huge faint sky-tiger (gold eyes), hanok roofline, the carver from behind with the blue daenggi; end seal */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, range = MK.range, TAU = Math.PI * 2, D2R = Math.PI / 180;
  var TILT = 350, ROOF = 890;
  var CRATERS = [[-110, -80, 70], [90, -120, 46], [40, 90, 86], [-130, 100, 44], [150, 30, 36], [-20, -10, 30]];

  MK.scene({
    id: 's09', order: 90, len: 1.6, title: 'Соңы', hold: null,
    overlay: [
      { type: 'caption', at: [.6, 1], x: 56, y: 1236, w: 300, side: 'l', rot: -1, text: 'Жалғасы бар…' },
      { type: 'caption', at: [.66, 1], x: 56, y: 1316, w: 300, side: 'l', rot: .8, text: '1-бөлім · соңы' }
    ],
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, st = ctx.state, fx = ctx.fx, b = ctx.view.bounds, i, x;
      var e = E.inOutCubic(range(p, 0, .5)), sh = TILT * (1 - e);
      var sSky = sh * .4, sMoon = sh * .5, sRoof = sh * .8, sCar = sh;
      /* sky: horizontal hatch, dark at the top, light near the roofline */
      var ry = ROOF + sRoof;
      P.cover({ c: 'red', t: P.lin(0, b.y0 - TILT, 0, ry - 40, [[0, .8], [1, .2]]), a: 90 });
      /* moon */
      var mx = 500, my = 380 + sMoon, R = 300;
      [[345, 5, 26, 20, 9], [395, 3.5, 18, 22, -7]].forEach(function (hh) {
        var c = new Path2D(); c.arc(mx, my, hh[0], 0, TAU); P.stroke(c, { w: hh[1], c: 'paper', dash: [hh[2], hh[3]], dashOffset: t * hh[4] * 3 });
      });
      P.circle(mx, my, R, { c: 'red', t: 0, stroke: { w: 6, c: 'ink' } });
      var disc = new Path2D(); disc.arc(mx, my, R - 3, 0, TAU);
      P.clip(disc, function () {
        P.circle(mx, my, R, { c: 'red', t: P.rad(mx - 90, my - 90, 150, R * 1.15, [[0, 0], [.5, 0], [1, .5]]), h: 'dots' });
        CRATERS.forEach(function (c) { P.circle(mx + c[0], my + c[1], c[2], { c: 'red', t: .34, h: 'dots', stroke: { w: 2.4, c: 'ink' } }); });
      });
      /* sky tiger: faint and huge; rig: slow lazy blink (periodic overlay) + breathing */
      MK.art.tiger(P, 500, 420 + sSky, 1100, { mode: 'sky', eyeOpen: 1, pupil: .3, skyAlpha: .55, action: { scene: 's09', clock: p * 4, t: t } });
      /* far layer: 3D-rendered mountains behind the roofline (D1: MK.art.ridges), only when available */
      if (typeof MK.art.ridges === 'function') MK.art.ridges(P, 's09', p, { x: 0, y: 150 + sRoof * .6, w: 1000, h: 1400 });
      /* roofline: eave (ink) + wall + ground */
      var gy = 1112 + sRoof;
      P.rect(b.x0 - 4, ry + 40, b.x1 - b.x0 + 8, b.y1 + TILT - ry, { c: 'ink', t: 0 });
      MK.art.eave(P, b.x0 - 80, b.x1 + 80, ry, 120, { chimeOn: false, rafter: 40, bottom: ry + 100 });
      P.rect(b.x0 - 4, ry + 88, b.x1 - b.x0 + 8, gy - ry - 88, { c: 'paper', t: .5, a: 0, stroke: { w: 4, c: 'ink' } });
      for (x = -40; x < 1100; x += 175) {
        P.rect(x, ry + 88, 20, gy - ry - 88, { c: 'ink', t: 0 });
        P.rect(x + 40, ry + 124, 100, gy - ry - 190, { c: 'paper', t: .14, a: 0, stroke: { w: 3.5, c: 'ink' } });
        for (var k = 1; k < 4; k++) P.stroke([[x + 40 + k * 25, ry + 124], [x + 40 + k * 25, gy - 66]], { w: 2.4, c: 'ink' });
        P.stroke([[x + 40, (ry + 124 + gy - 66) / 2], [x + 140, (ry + 124 + gy - 66) / 2]], { w: 2.4, c: 'ink' });
      }
      P.rect(b.x0 - 4, gy, b.x1 - b.x0 + 8, b.y1 + TILT - gy, { c: 'paper', t: .26, a: 90, stroke: { w: 5, c: 'ink' } });
      for (i = 1; i < 6; i++) P.stroke([[b.x0 - 4, gy + i * i * 11 + 12], [b.x1 + 4, gy + i * i * 11 + 12]], { w: 2.2, c: 'ink' });
      /* gate in the wall (she walks toward it) */
      var gx = 500, gw = 150;
      P.rect(gx - gw / 2 - 14, ry + 96, gw + 28, gy - ry - 96, { c: 'ink', t: 0 });
      P.rect(gx - gw / 2, ry + 124, gw, gy - ry - 124, { c: 'red', t: .55, a: 0, stroke: { w: 3, c: 'paper' } });
      P.rect(gx - gw / 2 - 30, ry + 96, gw + 60, 16, { c: 'ink', t: 0 });
      /* carver from behind (rig + CMU walk): looks up at the sky tiger -> turns head -> ~5 steps toward the gate, moving up-screen and shrinking */
      var wk = E.inOutQuad(range(p, .45, 1));
      MK.art.carver(P, 500, 1200 + sCar - 78 * wk, 620 - 70 * wk, { pose: 'stand', t: t, action: { scene: 's09', clock: p * 4, t: t } });
      /* end seal */
      var tau = MK.event(st, 'slam', p, .5, t, 2.5);
      if (tau >= 0) {
        var X = 790, Y = 1180, size = 170, sc, rot, dy, press = 0, ts = tau - .30;
        if (tau < .12) { var q = E.outQuad(tau / .12); sc = MK.lerp(1.7, 1.6, q); rot = -12; dy = MK.lerp(-90, -70, q); }
        else if (tau < .30) { var q2 = E.inQuad((tau - .12) / .18); sc = MK.lerp(1.6, 1, q2); rot = MK.lerp(-12, -4, q2); dy = MK.lerp(-70, 0, q2); }
        else { sc = 1; rot = -4; dy = 0; press = Math.exp(-ts / .12); }
        P.push(); P.translate(X, Y + dy); P.rotate(rot * D2R); P.scale(sc);
        MK.art.seal(P, 0, 0, size, '1화 끝', { press: press, seed: 9 });
        P.pop();
        if (ts >= 0) {
          fx.shake = Math.max(fx.shake || 0, 10 * Math.exp(-ts / .18));
          var mk = clamp(1 - ts / .3, 0, 1); fx.misreg = [3 * mk, 1.5 * mk];
          MK.fx.droplets(P, { seed: 33, n: 30, x: X, y: Y, tau: ts, dir: 0, spread: TAU, speed: 560, g: 800, life: .8, size: 15, c: 'red' });
          ctx.sfx('탁!', { key: 'tak9_' + MK.eventId(st, 'slam'), x: 740, y: 960, size: 190, rot: -8, font: 'impact', color: 'paper', fx: 'pop', gloss: 'тық', life: 2.2 });
        }
      }
    }
  });
})();
