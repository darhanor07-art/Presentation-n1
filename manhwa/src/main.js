/* main.js — boot, loop, capture API, art sheet. Loaded LAST. */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, P = MK.P, TL = MK.timeline;
  var qs = new URLSearchParams(location.search);
  var CAPTURE = qs.has('capture') && qs.get('capture') !== '0', ART = qs.has('art') && qs.get('art') !== '0';
  MK.capture = CAPTURE; MK.artMode = ART;
  var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.body.classList.toggle('capture', CAPTURE);
  var S = { s: 0, target: 0, lastT: 0, q: 1, slow: 0, ready: false, prevT: 0, first: true };
  var canvas = document.getElementById('gl'), spacer = document.getElementById('spacer');
  var FONTS = ['400 40px "Song Myung"', '400 40px "Black Han Sans"', '400 40px "East Sea Dokdo"', '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"', '600 40px "Cormorant Garamond"', '700 40px "Cormorant Garamond"'];

  function dprNow() { return CAPTURE ? (window.devicePixelRatio || 1) : Math.min(window.devicePixelRatio || 1, 2); }
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    MK.view.set(w, h); MK.view.dpr = dprNow(); MK.view.q = S.q;
    P.resize(w, h, S.q); if (MK.GL.ok) MK.GL.resize(w, h, MK.view.dpr);
    MK.overlay.resize();
    spacer.style.height = ((TL.total + 1) * h) + 'px';
  }

  function uniforms(fx, t) {
    var v = MK.view, k = Math.floor(t * 24), sh = reduced ? 0 : (fx.shake || 0);
    var u = {
      time: t, grain: fx.grain == null ? 1 : fx.grain,
      shake: [(MK.hash(k * 1.31) - .5) * 2 * sh, (MK.hash(k * 2.17 + 5) - .5) * 2 * sh],
      misreg: fx.misreg || [0, 0], ripple: [0, 0, -1e4, 0], rippleW: 24, flash: [0, 0, 0, 0]
    };
    if (fx.ripple) {
      var r = fx.ripple; u.ripple = [v.ox + r.x * v.s, v.oy + r.y * v.s, r.r * v.s, reduced ? 0 : (r.amp || 0)]; u.rippleW = r.w || 24;
    }
    if (fx.flash && !reduced) { var c = typeof fx.flash.c === 'string' ? MK.PAL[fx.flash.c] : fx.flash.c; c = c || MK.PAL.paper; u.flash = [c[0] / 255, c[1] / 255, c[2] / 255, clamp(fx.flash.a || 0, 0, 1)]; }
    return u;
  }

  function renderFrame(sVH, t, dt, snap) {
    var fx = { shake: 0, misreg: [0, 0], ripple: null, flash: null, grain: 1 }, ui = { hold: null };
    var base = { t: t, dt: dt, input: MK.input, fx: fx, ui: ui, view: MK.view, P: P, p: 0 }, active = [];
    P.begin();
    try {
      if (ART) MK.artSheet(base); else active = TL.frame(sVH, base);
    } catch (e) { MK.err(e, 'frame'); }
    MK.input.holdActive = !!ui.hold;
    if (MK.GL.ok) { try { MK.GL.draw(P, uniforms(fx, t)); } catch (e) { MK.err(e, 'gl'); } }
    try { MK.overlay.update({ active: active, t: t, dt: dt, ui: ui, flash: fx.flash, snap: snap }); } catch (e) { MK.err(e, 'overlay'); }
    MK.input.endFrame();
    return active;
  }

  var bootP = (async function boot() {
    MK.overlay.init();
    TL.build();
    MK.overlay.registerAll(TL.scenes()); MK.overlay.setSegments(TL.segments, TL.total);
    try { MK.GL.init(canvas, CAPTURE); } catch (e) { MK.err(e, 'gl-init'); }
    resize(); MK.overlay.loaderProgress(.25);
    try {
      await Promise.race([Promise.all(FONTS.map(function (f) { return document.fonts.load(f, '목판MOKPANАБҚ가1'); })).then(function () { return document.fonts.ready; }), new Promise(function (r) { setTimeout(r, 6000); })]);
    } catch (e) { MK.err(e, 'fonts'); }
    MK.overlay.loaderProgress(.8);
    if (ART) { document.body.classList.add('art'); }
    S.target = S.s = clamp(window.scrollY / window.innerHeight, 0, TL.total);
    renderFrame(S.s, 0, 0, true);
    MK.overlay.loaderProgress(1); MK.overlay.loaderDone();
    S.ready = true;
  })();

  window.addEventListener('resize', function () { if (S.ready) { resize(); if (CAPTURE) return; } });

  if (CAPTURE) {
    var prevT = 0;
    window.__mk = {
      ready: bootP,
      segments: null, total: 0,
      render: function (sVH, tSec, input) {
        if (input) MK.input.set(input); else MK.input.set({ holding: false });
        var dt = clamp(tSec - prevT, 0, .1); prevT = tSec;
        return renderFrame(sVH, tSec, dt, true);
      }
    };
    bootP.then(function () {
      window.__mk.segments = TL.segments.map(function (g) { return { id: g.id, kind: g.kind, start: g.start, len: g.len, hold: g.hold, title: g.title }; });
      window.__mk.total = TL.total;
    });
  } else {
    var t0 = performance.now() / 1000, last = t0, slowN = 0;
    var loop = function (now) {
      requestAnimationFrame(loop);
      if (!S.ready) return;
      var tt = now / 1000, dt = clamp(tt - last, 0, .1), raw = tt - last; last = tt;
      S.target = clamp(window.scrollY / window.innerHeight, 0, TL.total);
      S.s += (S.target - S.s) * (1 - Math.exp(-7 * dt));
      if (Math.abs(S.target - S.s) < .0004) S.s = S.target;
      renderFrame(S.s, tt - t0, dt, false);
      if (S.q > .75) { slowN = raw > .024 ? slowN + 1 : 0; if (slowN >= 20) { S.q = .75; resize(); } }
    };
    requestAnimationFrame(loop);
    window.__mkState = S;
  }
  document.addEventListener('contextmenu', function (e) { if (e.target.closest && e.target.closest('.seal')) e.preventDefault(); });

  /* ================= art sheet (?art=1) ================= */
  MK.artSheet = function (ctx) {
    var t = 1.0 + (CAPTURE ? 0 : ctx.t), A = MK.art, b = ctx.view.bounds;
    P.cover({ c: 'paper', t: 0 });
    if (qs.get('zoom') === 'tiger') {
      var Z = [{ mode: 'print', eyeOpen: 1, ink: .4, pupil: .5 }, { mode: 'alive', eyeOpen: 1, pupil: .2, mouthOpen: 1 }, { mode: 'block', carve: .8, inked: .5 }, { mode: 'sky', eyeOpen: 1, pupil: .3 }];
      Z.forEach(function (z, i) { var cx = 250 + (i % 2) * 500, cy = 350 + Math.floor(i / 2) * 700;
        if (z.mode === 'sky') P.rect(cx - 250, cy - 350, 500, 700, { c: 'red', t: .5, a: 90 });
        A.tiger(P, cx, cy, 440, z); });
      return;
    }
    var CW = 250, CH = 232, X0 = 0, Y0 = 18, cells = [];
    function cell(c, r, label, fn, o) {
      o = o || {}; var x = X0 + c * CW, y = Y0 + r * CH, w = (o.w || 1) * CW, h = CH;
      P.clip([[x + 2, y + 2], [x + w - 2, y + 2], [x + w - 2, y + h - 2], [x + 2, y + h - 2]], function () {
        if (o.bg) P.rect(x, y, w, h, o.bg);
        fn(x + w / 2, y + h / 2 + 4, x, y, w, h);
      });
      P.stroke([[x + 2, y + 2], [x + w - 2, y + 2], [x + w - 2, y + h - 2], [x + 2, y + h - 2]], { w: 2, c: 'ink', closed: true });
      P.text(label, x + 8, y + 16, { font: 'IBM Plex Mono', weight: 500, size: 12 }, { c: o.bg ? 'paper' : 'ink', t: 0 });
    }
    var T = function (st, o) { return function (cx, cy) { var r = A.tiger(P, cx, cy + 6, 196, st); if (r && o) A.chisel(P, r.x, r.y, r.ang, { size: .5 }); }; };
    cell(0, 0, 'tiger block carve .55', T({ mode: 'block', carve: .55 }, true));
    cell(1, 0, 'block mirror inked .6', T({ mode: 'block', carve: 1, inked: .6, mirror: true }));
    cell(2, 0, 'print closed', T({ mode: 'print', eyeOpen: 0 }));
    cell(3, 0, 'print->alive ink .5 open', T({ mode: 'print', eyeOpen: 1, ink: .5, pupil: .6 }));
    cell(0, 1, 'alive open', T({ mode: 'alive', eyeOpen: 1, pupil: .25 }));
    cell(1, 1, 'alive mouth open', T({ mode: 'alive', eyeOpen: 1, pupil: .15, mouthOpen: 1 }));
    cell(2, 1, 'alive closed', T({ mode: 'alive', eyeOpen: 0 }));
    cell(3, 1, 'sky', T({ mode: 'sky', eyeOpen: 1, pupil: .3 }), { bg: { c: 'red', t: P.lin(0, 0, 0, 1, [[0, .5], [1, .5]]), a: 90 } });
    cell(0, 2, 'carver stand', function (cx, cy, x, y, w, h) { A.carver(P, cx, y + h - 12, 200, { t: t }); });
    cell(1, 2, 'carver seat', function (cx, cy, x, y, w, h) { A.carver(P, cx, y + h - 6, 180, { pose: 'seat', arm: .25 + t * .1, t: t }); });
    cell(2, 2, 'shadow (blurred)', function (cx, cy, x, y, w, h) {
      P.blur(5, function () { A.carver(P, cx, y + h - 6, 180, { pose: 'seat', arm: .3, shadow: true, t: t }); });
    });
    cell(3, 2, 'seal + chisel', function (cx, cy) {
      A.seal(P, cx - 40, cy - 20, 90, '각수', { seed: 3 }); A.chisel(P, cx + 70, cy + 50, -2.4, { size: .6 });
      P.push(); P.translate(cx - 30, cy + 70); P.rotate(-.07); A.seal(P, 0, 0, 44, '목판 1화', { press: 1 }); P.pop();
    });
    cell(0, 3, 'eave + tiles + rafters + chime', function (cx, cy, x, y, w, h) {
      A.eave(P, x - 20, x + w * 2 + 20, y + 88, 52, { chime: .35 * Math.sin(t * 3.77), chimeX: x + w * 2 - 70, rafter: 100, bottom: y + h, chimeSize: .45 });
    }, { w: 2 });
    cell(2, 3, 'ink brush', function (cx, cy) { A.inkBrush(P, cx - 20, cy + 62, 90, .35, { wet: .8 }); A.inkBrush(P, cx + 48, cy + 90, 50, -.5, { wet: .4, tip: 'red', seed: 8 }); });
    cell(3, 3, 'pad + sheet', function (cx, cy) { A.sheet(P, { x: cx - 100, y: cy - 90, w: 110, h: 150 }, { rot: -.12 }); A.pad(P, cx + 32, cy + 20, 40, -.7); });
    cell(0, 4, 'tapered strokes', function (cx, cy) {
      P.taper([[cx - 100, cy - 40], [cx - 40, cy - 70], [cx + 20, cy - 30], [cx + 100, cy - 60]], [26, 1], { c: 'ink', t: 0 });
      P.taper([[cx - 100, cy + 10], [cx - 20, cy + 40], [cx + 100, cy]], function (u) { return 6 + 24 * Math.sin(Math.PI * u); }, { c: 'red', t: 0, stroke: { w: 2, c: 'ink' } });
      P.taper([[cx - 100, cy + 70], [cx, cy + 50], [cx + 100, cy + 76]], [18, 18], { c: 'paper', t: .6, a: 60, stroke: { w: 3, c: 'ink' } });
    });
    cell(1, 4, 'crack + ribbon', function (cx, cy, x, y, w, h) {
      var c = MK.fx.crackPath(4, cx - 50, y + 30, y + h - 20, 26); P.stroke(c, { w: 5, c: 'ink' });
      var rb = MK.fx.ribbon([[cx + 10, y + 40], [cx + 40, y + 100], [cx + 60, y + 190]], 12, t * 8.8, 18, 5);
      P.taper(rb, [20, 10], { c: 'blue', t: 0, stroke: { w: 2.5, c: 'ink' } });
    });
    cell(2, 4, 'chips / splinters / drops', function (cx, cy) {
      MK.fx.chips(P, { seed: 3, n: 14, x: cx - 60, y: cy + 60, tau: .35, dir: -1.57, spread: 2, speed: 300, g: 800, life: 1, size: 12 });
      MK.fx.splinters(P, { seed: 5, n: 10, x: cx + 50, y: cy + 60, tau: .3, dir: -1.57, spread: 2.4, speed: 330, g: 700, life: 1, size: 12 });
      MK.fx.droplets(P, { seed: 7, n: 16, x: cx, y: cy, tau: .2, dir: 0, spread: 6.28, speed: 260, g: 400, life: 1, size: 12 });
    });
    cell(3, 4, 'tone styles', function (cx, cy, x, y, w, h) {
      ['line', 'grain', 'cross', 'dots'].forEach(function (hh, i) {
        [.12, .4, .85].forEach(function (tt, j) { P.rect(x + 12 + j * 70, y + 26 + i * 48, 62, 42, { c: 'paper', t: tt, h: hh, a: i === 0 ? 0 : 20, stroke: { w: 2, c: 'ink' } }); });
      });
    });
    cell(0, 5, 'palette', function (cx, cy, x, y) {
      ['red', 'ink', 'paper', 'blue', 'gold'].forEach(function (n, i) { P.rect(x + 14 + i * 46, y + 40, 40, 100, { c: n, t: 0, stroke: { w: 2, c: 'ink' } }); });
      P.rect(x + 14, y + 150, 220, 60, { c: 'red', t: P.lin(x + 14, 0, x + 234, 0, [[0, 0], [1, 1]]), a: 90 });
    });
    cell(1, 5, 'tone gradient a=45', function (cx, cy, x, y, w, h) { P.rect(x + 10, y + 26, w - 20, h - 36, { c: 'paper', t: P.lin(0, y, 0, y + h, [[0, 0], [1, 1]]), a: 45 }); });
    cell(2, 5, 'blue/gold + eave rafter', function (cx, cy, x, y, w, h) {
      P.circle(cx - 40, cy, 36, { c: 'gold', t: P.rad(cx - 40, cy, 8, 36, [[0, 0], [1, .6]]), a: 90, stroke: { w: 3, c: 'ink' } });
      P.circle(cx + 40, cy, 36, { c: 'blue', t: P.rad(cx + 40, cy, 8, 36, [[0, 0], [1, .6]]), a: 90, stroke: { w: 3, c: 'ink' } });
    });
    cell(3, 5, 'ridge silhouette', function (cx, cy, x, y, w, h) { A.ridge(P, x + 20, x + w - 20, y + h - 60, 90, 3, { c: 'ink', t: 0 }); }, {});
  };
})();
