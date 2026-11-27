/* art/carver.js — the woodblock carver (각수): young woman, BACK VIEW, hanbok. MK.art.carver(P,x,y,size,s) */
(function () {
  'use strict';
  var MK = window.MK, art = MK.art = MK.art || {};
  var TAU = Math.PI * 2;

  /* s = {pose:'stand'|'seat', t:seconds (ribbon phase), arm:0..1 (seat: carving cycle), shadow:bool}
     stand: (x,y)=feet centre, size=height.  seat: (x,y)=bottom centre of visible figure (cut by the desk), size=head-top to bottom */
  art.carver = function (P, x, y, size, s) {
    s = s || {}; var sh = !!s.shadow, ow = 3 / size, t = s.t || 0, phase = TAU * 1.4 * t;
    function poly(p, st) { if (sh) P.toneOnly(function () { P.poly(p, { c: 'ink', t: .9 }); }); else P.poly(p, st); }
    function path(d, st) { if (sh) P.toneOnly(function () { P.path(d, { c: 'ink', t: .9 }); }); else P.path(d, st); }
    function taper(p, w, st, n) { if (sh) P.toneOnly(function () { P.taper(p, w, { c: 'ink', t: .9 }, n); }); else P.taper(p, w, st, n); }
    function circle(cx, cy, r, st) { if (sh) P.toneOnly(function () { P.circle(cx, cy, r, { c: 'ink', t: .9 }); }); else P.circle(cx, cy, r, st); }
    function ellipse(cx, cy, rx, ry, st) { if (sh) P.toneOnly(function () { P.ellipse(cx, cy, rx, ry, { c: 'ink', t: .9 }); }); else P.ellipse(cx, cy, rx, ry, st); }
    function stroke(p, o) { if (!sh) P.stroke(p, o); }
    var OUT = { w: ow, c: 'ink' };
    var CLOTH = function (t0) { return { c: 'paper', t: t0, a: 0, stroke: OUT }; };

    P.push(); P.translate(x, y); P.scale(size);

    function ribbons(kx, ky, len, wid) {
      [-1, 1].forEach(function (sx, i) {
        var base = [[kx + sx * .004, ky], [kx + sx * .008, ky + len * .5], [kx + sx * .014, ky + len]];
        var pts = MK.fx.ribbon(base, wid * 2, phase + i * 1.3, wid * 1.9, 5);
        taper(pts, [wid * 1.1, wid * .8], { c: 'blue', t: 0, stroke: OUT }, 6);
      });
      taper([[kx - .02, ky], [kx + .02, ky]], [.026, .026], { c: 'blue', t: 0, stroke: OUT }, 2);
    }
    function braidTicks(x0, y0, y1, w) {
      for (var yy = y0; yy < y1; yy += w * .9) stroke([[x0 - w * .4, yy], [x0, yy + w * .45], [x0 + w * .4, yy]], { w: ow * .55, c: 'paper' });
    }

    if (s.pose === 'seat') {
      // torso (jeogori back)
      poly([[-.10, -.73], [.10, -.73], [.30, -.67], [.35, -.55], [.32, -.30], [.31, 0], [-.31, 0], [-.32, -.30], [-.35, -.55], [-.30, -.67]],
        { c: 'paper', t: P.lin(-.33, 0, .33, 0, [[0, .4], [.2, .12], [.4, .35], [.5, .1], [.6, .35], [.8, .12], [1, .4]]), a: 0, stroke: OUT });
      stroke([[0, -.72], [0, 0]], { w: ow * .8 });
      stroke([[-.30, -.67], [-.1, -.60], [0, -.58], [.1, -.60], [.30, -.67]], { w: ow * .9 });
      // left arm resting
      taper([[-.33, -.62], [-.42, -.40], [-.31, -.14]], [.2, .15], CLOTH(.22), 6);
      circle(-.28, -.10, .042, { c: 'paper', t: 0, stroke: OUT });
      // right arm carving
      var a = s.arm || 0, hx = .17 + .07 * Math.sin(TAU * a), hy = -.10 + .035 * Math.cos(TAU * a * 2);
      taper([[.33, -.62], [.45, -.40], [hx + .09, hy - .06], [hx, hy]], [.2, .13], CLOTH(.22), 6);
      circle(hx - .01, hy + .005, .042, { c: 'paper', t: 0, stroke: OUT });
      // braid
      var bp = [[0, -.74], [.015, -.58], [-.01, -.40], [.012, -.24], [0, -.14]];
      taper(bp, [.075, .052], { c: 'ink', t: 0 }, 8); braidTicks(.003, -.70, -.16, .05);
      ribbons(0, -.13, .14, .014);
      // neck + head
      poly([[-.035, -.76], [.035, -.76], [.04, -.70], [-.04, -.70]], { c: 'paper', t: 0, stroke: OUT });
      ellipse(0, -.865, .118, .135, { c: 'ink', t: 0 });
      stroke([[-.075, -.95], [-.03, -.995], [.04, -.995]], { w: ow * .8, c: 'paper' });
      stroke([[0, -.995], [0, -.80]], { w: ow * .5, c: 'paper' });
    } else {
      // chima (bell skirt)
      path('M-.085 -.70 C-.10 -.50 -.26 -.22 -.335 -.012 Q0 .02 .335 -.012 C.26 -.22 .10 -.50 .085 -.70 Z',
        { c: 'paper', t: P.lin(-.33, 0, .33, 0, [[0, .45], [.1, .13], [.22, .42], [.34, .12], [.46, .38], [.58, .12], [.7, .42], [.84, .13], [1, .45]]), a: 0, stroke: OUT });
      [-.7, -.45, -.2, .1, .35, .62].forEach(function (f) {
        stroke([[f * .085, -.69], [f * .17, -.38], [f * .33, -.02]], { w: ow * .55, c: 'ink' });
      });
      poly([[-.092, -.725], [.092, -.725], [.088, -.69], [-.088, -.69]], { c: 'paper', t: 0, stroke: OUT });
      // jeogori + sleeves
      poly([[-.09, -.86], [.09, -.86], [.098, -.78], [.088, -.715], [-.088, -.715], [-.098, -.78]], { c: 'paper', t: .2, a: 0, stroke: OUT });
      stroke([[0, -.86], [0, -.715]], { w: ow * .8 });
      [-1, 1].forEach(function (sx, i) {
        var sw = Math.sin(phase * .25 + i) * .004;
        taper([[sx * .10, -.85], [sx * .17, -.79 + sw], [sx * .205, -.68], [sx * .185, -.585]], [.075, .062], { c: 'paper', t: .26, a: 0, stroke: OUT }, 6);
        taper([[sx * .19, -.60], [sx * .186, -.575]], [.07, .06], { c: 'ink', t: 0 }, 3);
        circle(sx * .183, -.55, .02, { c: 'paper', t: 0, stroke: OUT });
      });
      // braid + daenggi
      taper([[0, -.865], [.006, -.78], [-.004, -.68], [.004, -.58], [0, -.50]], [.034, .022], { c: 'ink', t: 0 }, 8);
      braidTicks(.001, -.84, -.51, .022);
      ribbons(0, -.49, .17, .011);
      // neck + head
      poly([[-.016, -.885], [.016, -.885], [.02, -.855], [-.02, -.855]], { c: 'paper', t: 0, stroke: OUT });
      ellipse(0, -.935, .064, .076, { c: 'ink', t: 0 });
      stroke([[-.04, -.975], [-.015, -.995], [.02, -.995]], { w: ow * .7, c: 'paper' });
    }
    P.pop();
  };
})();
