/* t02 «Шатыр астымен» — camera travels down a virtual strip: [s02 p=1] [dark underside of the eave] [s03 p=0] */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease;

  /* underside of the eave: ink, rafters radiating from a vanishing point above the top centre, a beam across the bottom */
  function underside(P, b, y0, H) {
    var x0 = b.x0 - 60, x1 = b.x1 + 60, w = x1 - x0, y1 = y0 + H, i;
    P.rect(x0, y0 - 2, w, H + 4, { c: 'ink', t: 0 });
    var vx = 500, vy = y0 - H * .32, beamH = Math.min(120, H * .1), beamY = y1 - beamH;
    var n = Math.max(14, Math.round(w / 70)), pitch = w / n, wTop = Math.min(34, pitch * .46);
    for (i = 0; i <= n; i++) {
      var sx = x0 + pitch * (i + .5) - pitch / 2 + (i % 2 ? 0 : 0), sy = y0 + 26;
      var dx = sx - vx, dy = sy - vy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      var k = (beamY - sy) / uy, ex = sx + ux * k, ey = beamY + 6;            // end on the beam
      var grow = (L + k) / L, wBot = wTop * Math.min(2.4, grow * 1.05);
      var nx = -uy, ny = ux, ang = Math.atan2(ux, -uy) * 180 / Math.PI;       // hatch lines run along the rafter
      P.poly([[sx + nx * wTop / 2, sy + ny * wTop / 2], [sx - nx * wTop / 2, sy - ny * wTop / 2], [ex - nx * wBot / 2, ey - ny * wBot / 2], [ex + nx * wBot / 2, ey + ny * wBot / 2]],
        { c: 'paper', t: P.lin(sx, sy, ex, ey, [[0, .45], [1, .95]]), a: ang, stroke: { w: 2.6, c: 'ink' } });
    }
    /* round rafter ends along the top edge */
    for (i = 0; i <= n; i++) {
      var cx = x0 + pitch * (i + .5) - pitch / 2, r = wTop * .62;
      P.circle(cx, y0 + 22, r, { c: 'paper', t: .12, a: 0, stroke: { w: 3, c: 'ink' } });
      P.circle(cx, y0 + 22, r * .42, { c: 'paper', t: 0, stroke: { w: 2, c: 'ink' } });
    }
    P.stroke([[x0, y0 + 4], [x1, y0 + 4]], { w: 4, c: 'paper' });
    /* cross beam */
    P.rect(x0, beamY, w, beamH, { c: 'paper', t: .6, h: 'grain', a: 90, stroke: { w: 3.4, c: 'ink' } });
    P.stroke([[x0, beamY + 14], [x1, beamY + 14]], { w: 2.2, c: 'ink' });
    P.stroke([[x0, y1 - 14], [x1, y1 - 14]], { w: 2.2, c: 'ink' });
  }

  MK.transition({
    id: 't02', order: 25, len: .6, from: 's02', to: 's03', kind: 'custom',
    draw: function (ctx, q, drawA, drawB) {
      var P = ctx.P, b = ctx.view.bounds, Hv = b.y1 - b.y0, cam = Hv * 1.8 * E.inOutCubic(q);
      var yA = b.y0, yBand = b.y1, yB = b.y1 + Hv * .8, bandH = Hv * .8;
      function piece(top, h, fn, srcTop) {
        if (top - cam > b.y1 || top + h - cam < b.y0) return;
        P.push();
        P.clip([[b.x0 - 50, top - cam], [b.x1 + 50, top - cam], [b.x1 + 50, top + h - cam], [b.x0 - 50, top + h - cam]], function () {
          P.push(); P.translate(0, top - srcTop - cam); fn(); P.pop();
        });
        P.pop();
      }
      piece(yA, Hv, function () { drawA(1); }, b.y0);
      piece(yBand, bandH, function () { underside(P, b, yBand, bandH); }, yBand);
      piece(yB, Hv, function () { drawB(0); }, b.y0);
    }
  });
})();
