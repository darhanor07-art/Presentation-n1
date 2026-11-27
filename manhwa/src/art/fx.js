/* art/fx.js — stateless FX helpers (chips, splinters, droplets, crack, ribbon). All positions are pure functions of age. */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp;
  var fx = MK.fx = MK.fx || {};

  /* particles(seed, n, spawnFn(rng,i)) -> array of param objects. spawnFn returns {x0,y0,vx,vy,g,life,delay,...}. */
  fx.particles = function (seed, n, spawnFn) {
    var r = MK.rng(seed), out = [];
    for (var i = 0; i < n; i++) { var o = spawnFn(r, i) || {}; o.i = i; o.life = o.life || 1; o.g = o.g || 0; o.delay = o.delay || 0; out.push(o); }
    return out;
  };
  /* position at global age tau (seconds since the emitter fired): {x,y,u,alive,age} */
  fx.pos = function (pt, tau) {
    var a = tau - pt.delay;
    if (a < 0 || a > pt.life) return { alive: false, x: pt.x0, y: pt.y0, u: a < 0 ? 0 : 1, age: a };
    return { alive: true, age: a, u: a / pt.life, x: pt.x0 + pt.vx * a, y: pt.y0 + pt.vy * a + .5 * pt.g * a * a };
  };
  function spawnBurst(o, cfg) {
    return fx.particles(o.seed || 1, o.n || 12, function (r) {
      var ang = (o.dir || 0) + (r() - .5) * (o.spread == null ? Math.PI : o.spread), sp = (o.speed || 300) * (.45 + .75 * r());
      return { x0: o.x, y0: o.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: o.g == null ? 900 : o.g, life: (o.life || .9) * (.7 + .5 * r()),
        delay: (o.delayJit || 0) * r(), size: (o.size || 12) * (.6 + .8 * r()), rot: r() * 6.28, spin: (r() - .5) * 14, k: r() };
    });
  }
  /* wood chips / curls. o = {seed,n,x,y,tau,dir,spread,speed,g,life,size,delayJit} */
  fx.chips = function (P, o) {
    spawnBurst(o).forEach(function (pt) {
      var q = fx.pos(pt, o.tau); if (!q.alive) return;
      var s = pt.size * (1 - Math.pow(q.u, 3)), a = pt.rot + pt.spin * q.age;
      P.push(); P.translate(q.x, q.y); P.rotate(a);
      P.poly(P.taperPoly([[-s, 0], [-s * .2, -s * .45], [s * .5, -s * .2], [s, s * .25]], [s * .55, s * .12], 5), { c: 'paper', t: 0, stroke: { w: 1.8, c: 'ink' } });
      P.pop();
    });
  };
  /* splinters: sharp slivers. o.c = 'paper'|'ink'|'red' */
  fx.splinters = function (P, o) {
    spawnBurst(o).forEach(function (pt) {
      var q = fx.pos(pt, o.tau); if (!q.alive) return;
      var s = pt.size * 1.8 * (1 - Math.pow(q.u, 4)), a = pt.rot + pt.spin * q.age * .6, w = s * (.14 + .12 * pt.k);
      P.push(); P.translate(q.x, q.y); P.rotate(a);
      P.poly([[-s, 0], [-s * .2, -w], [s, 0], [-s * .2, w * .7]], { c: o.c || 'paper', t: 0, stroke: { w: 1.8, c: 'ink' } });
      P.pop();
    });
  };
  /* droplets / speckles (ink or red). o.c colour */
  fx.droplets = function (P, o) {
    spawnBurst(o).forEach(function (pt) {
      var q = fx.pos(pt, o.tau); if (!q.alive) return;
      var s = pt.size * (1 - Math.pow(q.u, 2.5)); if (s < .6) return;
      var sp = Math.hypot(pt.vx, pt.vy) || 1, st = 1 + Math.min(1.6, sp / 700 * (1 - q.u));
      P.ellipse(q.x, q.y, s * st * .5, s * .5, { c: o.c || 'red', t: 0 }, Math.atan2(pt.vy + pt.g * q.age, pt.vx));
    });
  };
  /* crack: zig-zag polyline from (x,y0) to (x,y1), alternating offsets up to amp */
  fx.crackPath = function (seed, x, y0, y1, amp) {
    var r = MK.rng(seed), pts = [[x, y0]], y = y0, side = 1, dir = y1 >= y0 ? 1 : -1;
    while ((y1 - y) * dir > 18) {
      y += dir * (22 + r() * 36);
      if ((y1 - y) * dir < 0) y = y1;
      pts.push([x + side * amp * (.25 + .75 * r()) + (r() - .5) * amp * .2, y]); side = -side;
    }
    pts.push([x + (r() - .5) * amp * .4, y1]); return pts;
  };
  /* ribbon: returns the centre-line displaced by a travelling sine (flutter). phase includes time (rad). amp default width*1.4 */
  fx.ribbon = function (points, width, phase, amp, wavelen) {
    var n = points.length, out = [], A = amp == null ? width * 1.4 : amp, k = wavelen || 5.5, L = [0], i;
    for (i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    var tot = L[n - 1] || 1;
    for (i = 0; i < n; i++) {
      var a = points[Math.max(0, i - 1)], b = points[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      var u = L[i] / tot, d = A * Math.pow(u, .85) * Math.sin(phase - u * k);
      out.push([points[i][0] - ty / tl * d, points[i][1] + tx / tl * d]);
    }
    return out;
  };
  /* smooth 0..1 envelope of an impact: exp decay after tau>0 */
  fx.decay = function (tau, k) { return tau < 0 ? 0 : Math.exp(-tau / (k || .18)); };
})();
