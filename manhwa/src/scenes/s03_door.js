/* s03 — 창호지: backlit paper door, the carver's shadow play, doors slide open on the red room, push-in on the desk */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, TAU = Math.PI * 2;
  var OPEN = { x: 110, y: 150, w: 780, h: 1100 }, TH = 34;
  var INNER = { x: OPEN.x + TH, y: OPEN.y + TH, w: OPEN.w - 2 * TH, h: OPEN.h - 2 * TH };   // 144..856, 184..1216
  var FLOOR = 960, VP = [500, 690];
  var LEAVES = [{ x: INNER.x, y: INNER.y, w: INNER.w / 2, h: INNER.h, dir: -1 }, { x: INNER.x + INNER.w / 2, y: INNER.y, w: INNER.w / 2, h: INNER.h, dir: 1 }];

  function lantern(P, t) {
    var x = 720, base = 900, fl = MK.noise1(t * 3 + 4), fl2 = MK.noise1(t * 5.3 + 9);
    var gr = 1 + .05 * fl, gx = x + 3 * fl2, gy = 836;
    /* soft paper glow halo (stacked low-alpha rings) */
    [300, 240, 190, 145, 105].forEach(function (r, k) { P.alpha(.1 + .02 * k, function () { P.circle(gx, gy, r * gr, { c: 'paper', t: 0 }); }); });
    /* body */
    P.rect(x - 32, base - 8, 64, 8, { c: 'ink', t: 0 });
    P.rect(x - 36, base - 122, 72, 12, { c: 'ink', t: 0 });
    P.path('M' + (x - 30) + ' ' + (base - 8) + ' C' + (x - 56) + ' ' + (base - 36) + ' ' + (x - 56) + ' ' + (base - 84) + ' ' + (x - 32) + ' ' + (base - 110) +
      ' L' + (x + 32) + ' ' + (base - 110) + ' C' + (x + 56) + ' ' + (base - 84) + ' ' + (x + 56) + ' ' + (base - 36) + ' ' + (x + 30) + ' ' + (base - 8) + ' Z',
      { c: 'paper', t: 0, stroke: { w: 3.2, c: 'ink' } });
    [-.55, -.2, .2, .55].forEach(function (f) { P.stroke([[x + f * 30, base - 12], [x + f * 58, base - 58], [x + f * 32, base - 106]], { w: 2.2, c: 'ink' }); });
    /* flame (red core) */
    var fh = 26 + 6 * fl, fx = x + 2 * fl2;
    P.path('M' + fx + ' ' + (gy + 16) + ' C' + (fx - 15) + ' ' + (gy + 6) + ' ' + (fx - 8) + ' ' + (gy - fh * .5) + ' ' + (fx + 2 * fl2) + ' ' + (gy - fh) +
      ' C' + (fx + 9) + ' ' + (gy - fh * .45) + ' ' + (fx + 15) + ' ' + (gy + 6) + ' ' + (fx) + ' ' + (gy + 16) + ' Z', { c: 'red', t: 0, stroke: { w: 2, c: 'ink' } });
  }

  function interior(P, t, p) {
    var i, ox = OPEN.x, oy = OPEN.y, ow = OPEN.w;
    /* back wall: vertical lines, light near the lamp, dark at the edges */
    P.rect(ox, oy, ow, FLOOR - oy + 4, { c: 'red', t: P.rad(720, 840, 40, 620, [[0, .2], [.55, .5], [1, .82]]), a: 0 });
    /* floor: horizontal lines + perspective seams */
    P.rect(ox, FLOOR, ow, OPEN.y + OPEN.h - FLOOR, { c: 'paper', t: .3, h: 'line', a: 90 });
    [-380, -60, 230, 430, 570, 770, 1060, 1360].forEach(function (xk) {
      var k = (FLOOR - VP[1]) / (OPEN.y + OPEN.h - VP[1]);
      P.stroke([[VP[0] + (xk - VP[0]) * k, FLOOR], [xk, OPEN.y + OPEN.h]], { w: 2.6, c: 'ink' });
    });
    P.stroke([[ox, FLOOR], [ox + ow, FLOOR]], { w: 5, c: 'ink' });
    /* low desk (서안), beyond her */
    P.poly([[205, 884], [800, 884], [858, 934], [148, 934]], { c: 'paper', t: .55, h: 'grain', a: 0, stroke: { w: 3, c: 'ink' } });
    P.rect(148, 934, 710, 34, { c: 'paper', t: .78, h: 'grain', a: 0, stroke: { w: 3, c: 'ink' } });
    [[160, 40], [806, 40]].forEach(function (l) { P.rect(l[0], 968, l[1], 42, { c: 'paper', t: .72, h: 'grain', a: 0, stroke: { w: 3, c: 'ink' } }); });
    /* left of the desk: a small woodblock and a chisel */
    P.poly([[232, 872], [352, 872], [366, 890], [218, 890]], { c: 'paper', t: .3, h: 'grain', a: 0, stroke: { w: 3, c: 'ink' } });
    P.rect(218, 890, 148, 18, { c: 'ink', t: 0 });
    MK.art.chisel(P, 436, 912, -.05, { size: .42 });
    lantern(P, t);
    /* seat shadow on the floor */
    P.ellipse(470, 1004, 300, 36, { c: 'ink', t: .3, h: 'line', a: 90 });
    /* the carver, back view (first blue) */
    MK.art.carver(P, 470, 1000, 620, { pose: 'seat', t: t, action: { scene: 's03', clock: p * 4, t: t } });   /* rig: breathing + carving loop + braid follow-through */
    P.stroke([[212, 1000], [300, 1008], [470, 1011], [640, 1008], [728, 1000]], { w: 4, c: 'ink' });
  }

  function leafPane(P, dx, fl) {
    return { c: 'paper', t: P.rad(500 - dx + 10 * fl[0], 760 + 8 * fl[1], 120, 700, [[0, 0], [1, .42]]), a: 0 };
  }

  MK.scene({
    id: 's03', order: 30, len: 1.6, title: 'Ханджи есік', hold: null,
    overlay: [
      { type: 'caption', at: [.08, .75], x: 90, y: 46, w: 560, side: 'l', rot: -1, text: 'Ғибадатхананың ең шеткі бөлмесінде шам әлі сөнбеген еді.' },
      { type: 'sfx', at: [.05, .3], x: 700, y: 640, size: 100, rot: 8, font: 'brush', color: 'paper', fx: 'wobble', text: '사각', gloss: 'сық' },
      { type: 'sfx', at: [.32, .6], x: 520, y: 1110, size: 120, rot: -4, font: 'brush', color: 'paper', fx: 'wobble', text: '스르륵', gloss: 'сырт' }
    ],
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, b = ctx.view.bounds;
      var slide = E.inOutCubic(MK.range(p, .3, .8)) * 480;
      var push = 1 + .12 * E.inOutQuad(MK.range(p, .8, 1));
      var fl = [MK.noise1(t * 3), MK.noise1(t * 3 + 17)];
      P.push();
      if (push !== 1) { P.translate(520, 980); P.scale(push); P.translate(-520, -980); }
      /* interior (only needed once the doors part) */
      if (slide > .01) interior(P, t, p);
      /* leaves, sliding behind the wall */
      var shA = 1 - MK.range(p, .3, .5);
      LEAVES.forEach(function (L) {
        var dx = L.dir * slide;
        P.push(); P.translate(dx, 0);
        MK.art.door.leaf(P, L, {
          pane: leafPane(P, dx, fl),
          inPanes: shA > .01 ? function () {
            /* shadow play: blurred tone-only silhouette, world-fixed (paper moves through it) */
            P.translate(-dx, 0);
            var sc = 1 + .012 * MK.noise1(t * 3 + 2), cx = 470 + 6 * fl[0];
            P.alpha(shA, function () {
              P.blur(7, function () {
                P.push(); P.translate(cx, 980); P.scale(sc); P.translate(-cx, -980);
                MK.art.carver(P, cx, 980, 620, { pose: 'seat', shadow: true, t: t, action: { scene: 's03', clock: p * 4, t: t } });
                P.pop();
              });
            });
          } : null
        });
        /* door pulls on the meeting stiles */
        var px = L.dir < 0 ? L.x + L.w - 9 : L.x + 9;
        P.circle(px, 700, 6.5, { c: 'paper', t: 0, stroke: { w: 2.6, c: 'ink' } }); P.circle(px, 700, 2, { c: 'ink', t: 0 });
        P.pop();
      });
      /* wall with the opening cut out, then the frame */
      MK.art.door.wall(P, b, OPEN, { c: 'red', t: .7, a: 0 });
      MK.art.door.frame(P, INNER, TH);
      P.pop();
    }
  });
})();
