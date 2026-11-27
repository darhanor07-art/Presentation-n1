/* art/props.js — seal, chisel, ink brush, rubbing pad, hanji sheet */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {};
  var D = 180 / Math.PI;

  /* seal (도장): centre (x,y), size = edge. s = {press:0..1, seed, text font}. Rotate outside with P.push/rotate. */
  art.seal = function (P, x, y, size, text, s) {
    s = s || {}; var seed = s.seed || 1; text = text || '각수';
    var r = MK.rng(seed + text.length * 31), h = size / 2, press = s.press || 0;
    P.push(); P.translate(x, y); P.scale(1 + .07 * press, 1 - .12 * press);
    var pts = [], i, N = 7, j = size * .016, corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
    for (var e = 0; e < 4; e++) {
      var a = corners[e], b = corners[(e + 1) % 4];
      for (i = 0; i < N; i++) { var u = i / N; pts.push([a[0] + (b[0] - a[0]) * u + (r() - .5) * j * 2, a[1] + (b[1] - a[1]) * u + (r() - .5) * j * 2]); }
    }
    P.poly(pts, { c: 'red', t: 0 });
    var ins = h - size * .075, bw = size * .028;
    P.stroke([[-ins, -ins], [ins, -ins], [ins, ins], [-ins, ins]], { w: bw, c: 'paper', closed: true });
    var ch = Array.from(text), n = ch.length, fs, pos = [];
    if (n === 1) { fs = size * .62; pos = [[0, 0]]; }
    else if (n === 2) { fs = size * .4; pos = [[0, -size * .2], [0, size * .2]]; }
    else { fs = size * .33; pos = [[size * .2, -size * .2], [size * .2, size * .2], [-size * .2, -size * .2], [-size * .2, size * .2]]; }
    ch.slice(0, 4).forEach(function (c, k) { P.text(c, pos[k][0], pos[k][1] + fs * .36, { font: s.font || 'Song Myung', size: fs, align: 'center' }, { c: 'paper', t: 0 }); });
    for (i = 0; i < 9; i++) P.circle((r() - .5) * size * .85, (r() - .5) * size * .85, size * (.006 + .01 * r()), { c: 'paper', t: 0 });
    P.pop();
  };

  /* chisel (각도): tip at (x,y), pointing along ang (radians), handle trails behind */
  art.chisel = function (P, x, y, ang, s) {
    s = s || {}; var k = s.size || 1;
    P.push(); P.translate(x, y); P.rotate(ang); P.scale(k);
    var deg = ang * D;
    P.poly([[-104, -13], [-300, -15], [-312, 0], [-300, 15], [-104, 13]], { c: 'paper', t: .5, a: deg - 90, h: 'grain', stroke: { w: 3, c: 'ink' } });
    P.poly([[-90, -14], [-106, -14], [-106, 14], [-90, 14]], { c: 'ink', t: 0 });
    P.poly([[0, 0], [-26, -9], [-92, -11], [-92, 11], [-26, 9]], { c: 'paper', t: .45, a: deg - 90, stroke: { w: 3, c: 'ink' } });
    P.poly([[0, 0], [-26, -9], [-26, 9]], { c: 'ink', t: 0 });
    P.pop();
  };

  /* wide flat ink brush (먹솔): centre of the bristle face at (x,y); ang=0 -> brush points DOWN. s={wet:0..1, tip:'ink'|'red', seed} */
  art.inkBrush = function (P, x, y, w, ang, s) {
    s = s || {}; var r = MK.rng(s.seed || 5), deg = ang * D, wet = s.wet == null ? 1 : s.wet, i;
    P.push(); P.translate(x, y); P.rotate(ang);
    P.poly([[-w * .09, -96], [w * .09, -96], [w * .06, -340], [-w * .06, -340]].map(function (p) { return [p[0] * 1, p[1]]; }), { c: 'paper', t: .45, a: deg, h: 'grain', stroke: { w: 3, c: 'ink' } });
    P.poly([[-w * .24, -100], [w * .24, -100], [w * .26, -68], [-w * .26, -68]], { c: 'paper', t: .75, a: deg, stroke: { w: 3, c: 'ink' } });
    var bot = []; for (i = 0; i <= 12; i++) bot.push([-w / 2 + w * i / 12, (r() - .5) * 9 + (i === 0 || i === 12 ? -4 : 0)]);
    var body = [[-w / 2, -70], [w / 2, -70]].concat(bot.slice().reverse());
    P.poly(body, { c: 'paper', t: .55, a: deg, h: 'grain', stroke: { w: 3, c: 'ink' } });
    var wl = 14 + 52 * wet, wetPts = [[-w / 2, -wl], [w / 2, -wl]].concat(bot.slice().reverse());
    P.poly(wetPts, { c: s.tip || 'ink', t: 0 });
    for (i = 0; i < 9; i++) { var bx = -w / 2 + w * (i + .5 + (r() - .5) * .6) / 9; P.stroke([[bx, -wl - 6 + r() * 6], [bx + (r() - .5) * 4, -2]], { w: 2, c: 'paper' }); }
    P.pop();
  };

  /* round rubbing pad (밀대): top view. rot = handle direction (rad) */
  art.pad = function (P, x, y, r, rot) {
    P.push(); P.translate(x, y); P.rotate(rot || 0);
    P.poly(P.taperPoly([[r * .6, 0], [r * 1.5, 0]], [r * .34, r * .26], 4), { c: 'paper', t: .45, a: ((rot || 0) * D) - 90, h: 'grain', stroke: { w: 3, c: 'ink' } });
    P.circle(r * 1.58, 0, r * .17, { c: 'ink', t: 0 });
    P.circle(0, 0, r, { c: 'paper', t: .22, a: 0, stroke: { w: 4, c: 'ink' } });
    var sp = [], k, n = 70, turns = 4.2;
    for (k = 0; k <= n; k++) { var th = k / n * turns * Math.PI * 2, rr = r * (.1 + .8 * k / n); sp.push([Math.cos(th) * rr, Math.sin(th) * rr]); }
    P.stroke(sp, { w: Math.max(2, r * .045), c: 'ink' });
    P.circle(0, 0, r * .12, { c: 'ink', t: 0 });
    P.pop();
  };

  /* hanji sheet with deckle edges. rect={x,y,w,h}; s={rot,seed,shadow:true,t:fibre tone} */
  art.sheet = function (P, rect, s) {
    s = s || {}; var r = MK.rng(s.seed || 3), pts = [], x = rect.x, y = rect.y, w = rect.w, h = rect.h, i, j = s.deckle == null ? 3.2 : s.deckle;
    var cx = x + w / 2, cy = y + h / 2;
    function edge(x0, y0, x1, y1) { var L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(L / 22)); for (i = 0; i < n; i++) { var u = i / n; pts.push([x0 + (x1 - x0) * u + (r() - .5) * j * 2, y0 + (y1 - y0) * u + (r() - .5) * j * 2]); } }
    edge(x, y, x + w, y); edge(x + w, y, x + w, y + h); edge(x + w, y + h, x, y + h); edge(x, y + h, x, y);
    P.push(); if (s.rot) { P.translate(cx, cy); P.rotate(s.rot); P.translate(-cx, -cy); }
    if (s.shadow !== false) { P.push(); P.translate(10 * (s.sh || 1), 14 * (s.sh || 1)); P.poly(pts, { c: 'paper', t: .5, a: 90 }); P.pop(); }
    P.poly(pts, { c: 'paper', t: s.t == null ? .07 : s.t, h: 'grain', a: 0, stroke: { w: 2.2, c: 'ink' } });
    P.pop(); return pts;
  };
})();
