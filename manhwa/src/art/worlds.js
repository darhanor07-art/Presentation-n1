/* art/worlds.js — helpers drawing the pre-rendered 3D layers (assets/gen, see build/worlds/*, build/printize.py).
   All frames are rendered for the 1000x1400 safe frame, so rect = {x,y,w,h} of the safe frame (default 0,0,1000,1400).
   ridges(P, which, f, rect, o) which 's02'|'s09', f = 0..1 progress along the camera path. The image is 1.4x wider than the
     frame (extra 0.2w each side) and is mirror-tiled outwards to cover wide screens; below the frame it continues as near ground.
     Returns {far,mid,near} = world y of each band's skyline (for mist). sky is transparent: draw sky/moon BEFORE.
   pavilion(P, o)             pavilion backdrop (pillars, crossbeam, rafters), mirror-tiled sideways, void above.
   bell3d(P, cx, topY, scale, rot)   bronze bell sprite; (cx,topY)=shoulder centre as in art.bell; rot = sway (rad) about the hang point.
   log3d(P, theta, o)         striker log + 2 ropes for rope angle theta (rad, -12deg..+30deg); returns the log tip {x,y}.
   Constants: MK.art.PAV = {hang:[460,190], medal:[562,818], bellTop:[460,300], L:630, tip0:570}. */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {}, clamp = MK.clamp, D2R = Math.PI / 180;
  var FR = { x: 0, y: 0, w: 1000, h: 1400 };
  var PAV = art.PAV = { hang: [460, 190], medal: [562, 818], bellTop: [460, 300], L: 630, tip0: 570 };

  art.ridges = function (P, which, f, rect, o) {
    rect = rect || FR; o = o || {};
    var name = 'ridges_' + which, s = MK.assets && MK.assets.seq(name), b = MK.view.bounds;
    if (!s) return { far: rect.y + rect.h * .45, mid: rect.y + rect.h * .55, near: rect.y + rect.h * .7 };
    var n = s.frames.length, ff = clamp(f, 0, 1) * (n - 1);
    var iw = rect.w * 1.4, ix = rect.x - rect.w * .2, k, kmin = Math.floor((b.x0 - ix) / iw) - 0, kmax = Math.floor((b.x1 - ix) / iw);
    kmin = Math.min(kmin, 0); kmax = Math.max(kmax, 0);
    for (k = kmin; k <= kmax; k++) P.seq(name, ff, ix + k * iw, rect.y, iw, rect.h, { flip: (k % 2 !== 0) });
    /* ground below the frame (tall screens) */
    if (b.y1 > rect.y + rect.h) P.rect(b.x0 - 2, rect.y + rect.h - 1, b.x1 - b.x0 + 4, b.y1 - rect.y - rect.h + 3, { c: 'paper', t: .93, h: 'grain', a: 0 });
    var hz = s.horizon, f0 = Math.floor(ff), f1 = Math.min(n - 1, f0 + 1), u = ff - f0, out = {};
    ['far', 'mid', 'near'].forEach(function (c) { var a = hz && hz[c]; out[c] = a ? rect.y + rect.h * (a[f0] + (a[f1] - a[f0]) * u) : rect.y + rect.h * .6; });
    return out;
  };

  art.pavilion = function (P, o) {
    var b = MK.view.bounds, iw = 1000, k, kmin = Math.min(0, Math.floor(b.x0 / iw)), kmax = Math.max(0, Math.floor(b.x1 / iw));
    if (b.y0 < 0) P.rect(b.x0 - 2, b.y0 - 2, b.x1 - b.x0 + 4, -b.y0 + 4, { c: 'ink', t: 0 });
    for (k = kmin; k <= kmax; k++) P.img('pavilion_bg', k * iw, 0, iw, 1400, { flip: (k % 2 !== 0) });
  };

  art.bell3d = function (P, cx, topY, scale, rot) {
    scale = scale || 1; var H = PAV.hang, T = PAV.bellTop;
    P.push(); P.translate(cx, topY - (T[1] - H[1]) * scale); P.rotate(rot || 0); P.scale(scale); P.translate(-H[0], -H[1]);
    P.img('bell', 0, 0, 1000, 1400);
    P.pop();
  };

  art.log3d = function (P, theta, o) {
    var L = PAV.L, deg = theta / D2R, fi = clamp((deg + 12) / 42 * 14, 0, 14), k = Math.round(fi), tk = (-12 + 42 * k / 14) * D2R;
    var dx = L * (Math.sin(theta) - Math.sin(tk)), dy = L * (Math.cos(theta) - Math.cos(tk));
    P.push(); P.translate(dx, dy); P.img('log/' + ('00' + k).slice(-3), 0, 0, 1000, 1400, o); P.pop();
    return { x: PAV.tip0 + L * Math.sin(theta), y: PAV.hang[1] + L * Math.cos(theta) };
  };
})();
