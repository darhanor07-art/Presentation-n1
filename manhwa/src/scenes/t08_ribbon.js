/* t08 «Дәңгі» — a long blue daenggi ribbon flutters from lower-left to upper-right; the finale is revealed in the band it sweeps */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, range = MK.range, TAU = Math.PI * 2;
  var S0 = [-200, 1500], S1 = [1200, -100];
  var DX = S1[0] - S0[0], DY = S1[1] - S0[1], PL = Math.hypot(DX, DY), UX = DX / PL, UY = DY / PL, NX = -UY, NY = UX;
  var RL = 1400;

  /* one fluttering ribbon: head at path distance `head`, trailing RL behind it */
  function ribbon(P, head, width, phase, lat, amp) {
    var d0 = head - RL, n = 46, pts = [], k;
    for (k = 0; k <= n; k++) { var d = head - RL * k / n; pts.push([S0[0] + UX * d + NX * lat, S0[1] + UY * d + NY * lat]); }   /* head -> tail */
    var fl = MK.fx.ribbon(pts, width, phase, amp, TAU * RL / 380), m = fl.length, L = [], R = [], ang = [], i;
    for (i = 0; i < m; i++) {
      var a = fl[Math.max(0, i - 1)], b = fl[Math.min(m - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      var u = i / (m - 1), w = width * (1 - .5 * Math.pow(u, 2.5)) / 2 * Math.min(1, .35 + (head - RL * u + 150) / 150);
      w = Math.max(.5, w); ang.push(Math.atan2(ty, tx));
      L.push([fl[i][0] - ty * w, fl[i][1] + tx * w]); R.push([fl[i][0] + ty * w, fl[i][1] - tx * w]);
    }
    var base = Math.atan2(-UY, -UX);   /* head->tail direction of the path */
    P.poly(L.concat(R.slice().reverse()), { c: 'blue', t: 0, stroke: { w: 2.5, c: 'ink' } });
    for (i = 0; i < m - 1; i++) {
      var dev = Math.abs(Math.atan2(Math.sin(ang[i] - base), Math.cos(ang[i] - base))), tn = clamp((dev - .12) * 2.4, 0, .85);
      if (tn < .06) continue;
      P.poly([L[i], L[i + 1], R[i + 1], R[i]], { c: 'blue', t: tn, h: 'line', a: 0 });
    }
    var hi = []; for (i = 0; i < m; i++) hi.push([MK.lerp(fl[i][0], L[i][0], .45), MK.lerp(fl[i][1], L[i][1], .45)]);
    P.stroke(hi, { w: 2.2, c: 'paper', closed: false });
    P.stroke(L.concat(R.slice().reverse()), { w: 2.5, c: 'ink', closed: true });
  }

  MK.transition({
    id: 't08', order: 85, len: .8, from: 's08', to: 's09', kind: 'custom',
    draw: function (ctx, q, drawA, drawB) {
      var P = ctx.P, t = ctx.t, w = E.inOutCubic(q) * 3000, h = w / 2, ex = 500;
      drawA(1);
      if (q > .003) {
        var band = [[S0[0] - UX * ex + NX * h, S0[1] - UY * ex + NY * h], [S1[0] + UX * ex + NX * h, S1[1] + UY * ex + NY * h], [S1[0] + UX * ex - NX * h, S1[1] + UY * ex - NY * h], [S0[0] - UX * ex - NX * h, S0[1] - UY * ex - NY * h]];
        P.clip(band, function () { drawB(0); });
      }
      var span = PL + RL + 150, head = q * span;
      if (q > 0 && q < 1) {
        var h2 = Math.max(0, (q - .15)) * span / 1;
        if (h2 > 0) ribbon(P, h2, 55, t * 8 + 1.7, 62, 42);
        ribbon(P, head, 90, t * 8, 0, 60);
      }
      if (q >= .2 && q <= .5) ctx.sfx('펄럭!', { key: 'flap', x: 330, y: 470, size: 190, rot: -9, font: 'brush', color: 'paper', fx: 'wobble', gloss: 'жалп', life: 1.5 });
    }
  });
})();
