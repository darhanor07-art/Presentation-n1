/* s07 — 종: pull the striker log (hold), release to ring the bronze bell; a shock-wave ripples through the print */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, TAU = Math.PI * 2, D2R = Math.PI / 180;
  var BX = 460, BY = 300, HANG = [460, 190], BELL_MEDAL = MK.art.PAV.medal;   // 3D layers: bell/log/pavilion sprites (art/worlds.js)
  var SWING = .28, THETA = 28 * D2R;
  var STRIPES = null;

  function build() {
    var r = MK.rng(77), i; STRIPES = [];
    for (i = 0; i < 22; i++) {
      var x = r.range(80, 920), y = r.range(250, 1150), a = (r.range(-26, 26) + 90) * D2R, len = r.range(200, 360), bow = r.range(-50, 50);
      var dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
      STRIPES.push({ x: x, y: y, pts: [[x - dx * len / 2, y - dy * len / 2], [x + nx * bow, y + ny * bow], [x + dx * len / 2, y + dy * len / 2]], w: r.range(34, 64) });
    }
  }

  function circlePath(cx, cy, r) { var p = new Path2D(); p.arc(cx, cy, Math.max(0, r), 0, TAU); return p; }

  MK.scene({
    id: 's07', order: 70, len: 2.2, title: 'Қоңырау', hold: 'pull',
    overlay: [
      { type: 'caption', at: [.05, .4], x: 90, y: 214, w: 240, side: 'l', rot: -1.2, text: 'Қоңырауды соқ.' },
      { type: 'caption', at: [.15, .55], x: 945, y: 1236, w: 365, side: 'r', rot: 1, text: 'Ұстап тұр — тарт. Жібер — соқ.' }
    ],
    init: function (st) { build(); st.n = 0; st.rel = null; st.full = null; st.lastP = 0; st.th0 = THETA; },
    update: function (ctx) {
      var st = ctx.state, p = ctx.p, t = ctx.t, inp = ctx.input;
      if (!STRIPES) build();
      /* scrubbed back across 0.4 (or re-entered) -> reset whole state machine */
      if (st.lastP >= .4 && p < .396 || p <= 0) { MK.holdReset(st); st.rel = null; st.full = null; st.th0 = THETA; st.hAtRel = 0; MK.event(st, 'auto', 0, .6, t); }
      st.lastP = p;
      var inScene = p > 0 && p < 1, hm = { value: 0, completed: false }, holding = !!(inp && inp.holding) && inScene;
      if (inScene && st.rel == null) hm = MK.holdMeter(st, { holding: holding }, ctx.dt, { rise: 1 / 1.6, fall: 1 / .9 });
      else if (st.rel == null) hm = { value: (st._hold && st._hold.v) || 0, completed: !!(st._hold && st._hold.done) };
      var hAuto = MK.range(p, .4, .6), h = Math.max(hm.value, hAuto);
      /* release candidates: manual release, 0.4 s after full pull, auto when scroll crosses 0.6 */
      if (st.rel == null) {
        if (inScene && st.prevHold && !holding && hm.value > .15 && !hm.completed) { st.rel = t; st.hAtRel = hm.value; }
        if (hm.completed && st.full == null) st.full = t;
        if (st.full != null && t - st.full >= .4 && st.rel == null) { st.rel = st.full + .4; st.hAtRel = 1; }
        var at = MK.event(st, 'auto', p, .6, t, 2.5);
        if (at >= 0 && st.rel == null) { st.rel = t - at; st.hAtRel = 1; }
      }
      st.prevHold = holding;
      if (st.rel != null && st.relId !== st.rel) { st.relId = st.rel; st.n++; }
      var th, tauR = st.rel == null ? -1 : t - st.rel, tauI = tauR - SWING, ring = false;
      if (st.rel == null) th = THETA * E.outQuad(h);
      else {
        var th0 = THETA * E.outQuad(clamp(st.hAtRel == null ? 1 : st.hAtRel, 0, 1));
        th = tauI < 0 ? th0 * (1 - E.inCubic(clamp(tauR / SWING, 0, 1))) : 8 * D2R * Math.exp(-tauI / .5) * Math.abs(Math.sin(tauI * TAU * 1.2));
      }
      st.pose = { h: h, th: th, tauI: tauI, tauR: tauR };
      /* live 3D only: pointer parallax = bell/pavilion yaw +-4 deg, smooth-damped with the engine dt (zero in capture mode -> deterministic) */
      var yt = (!MK.capture && inp && inp.pointerActive) ? clamp((inp.pointer.x - 500) / 500, -1, 1) * 4 * D2R : 0;
      st.yawV = st.yawV || { v: 0 }; st.yaw = MK.three && MK.three.smoothDamp ? MK.three.smoothDamp(st.yaw || 0, yt, st.yawV, .4, ctx.dt) : 0;
    },
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, b = ctx.view.bounds, st = ctx.state, fx = ctx.fx, S = st.pose || { h: 0, th: 0, tauI: -1, tauR: -1 };
      var tI = S.tauI, hit = tI >= 0, i;
      var imp = hit ? Math.exp(-tI / .25) : 0, bw = b.x1 - b.x0 + 8;
      /* pavilion wall: red, vertical lines */
      P.cover({ c: 'red', t: P.lin(0, 120, 0, 1200, [[0, .85], [1, .35]]), a: 0 });
      /* ghost tiger stripes: scatter along the ripple direction and fade as the front passes */
      var rr = hit ? E.outCubic(Math.min(1, tI / 1.4)) * 2200 : -1;
      STRIPES.forEach(function (s) {
        var dx = s.x - BELL_MEDAL[0], dy = s.y - BELL_MEDAL[1], d = Math.hypot(dx, dy) || 1, over = hit ? rr - d : -1, sh = 0, al = .3;
        if (over > 0) { sh = Math.min(170, over * .26); al *= 1 - E.smoothstep(over / 380); }
        if (al < .01) return;
        P.push(); P.translate(dx / d * sh, dy / d * sh);
        P.alpha(al, function () { P.taper(s.pts, function (u) { return s.w * Math.pow(Math.sin(Math.PI * Math.min(1, u * .95 + .02)), .7) + 2; }, { c: 'ink', t: 0 }, 6); });
        P.pop();
      });
      /* floor */
      P.rect(b.x0 - 4, 1190, b.x1 - b.x0 + 8, b.y1 - 1190 + 4, { c: 'ink', t: 0 });
      for (i = 0; i < 4; i++) P.stroke([[b.x0 - 4, 1222 + i * 44 + i * i * 4], [b.x1 + 4, 1222 + i * 44 + i * i * 4]], { w: 3, c: 'paper' });
      P.stroke([[b.x0 - 4, 1190], [b.x1 + 4, 1190]], { w: 6, c: 'paper' });
      /* pavilion + bell + striker log: LIVE three.js (MK.three) when available, else the pre-rendered D1 sprites */
      var live = MK.art.bellLive && MK.art.bellLive(), sw = hit ? 2.5 * D2R * Math.exp(-tI / .9) * Math.sin(tI * TAU * .9) : 0;
      if (live) {
        sw = live.update({ th: S.th, tauI: tI, p: p, t: t, yaw: st.yaw || 0 });     // sway = AnimationClip scrubbed at tau since impact, camera dolly clip at p*4
        if (!live.render(P)) live = null;
      }
      if (!live) {
        MK.art.pavilion(P);                          // 3D layer: roof void, rafter ends, crossbeam, two pillars
        MK.art.bell3d(P, BX, BY, 1, sw);             // 3D sprite; sway about the hang point
      }
      if (hit) {                                   // gold glint (accent) on the shoulder, follows the sway
        var gl = Math.exp(-tI / .32) * E.outBack(Math.min(1, tI / .12)), ga = 84 * gl, gx = -96, gy = 330;
        if (gl > .01) {
          P.push(); P.translate(HANG[0], HANG[1]); P.rotate(sw); P.translate(-HANG[0], -HANG[1]); P.translate(BX, BY);
          P.poly([[gx, gy - ga], [gx + ga * .18, gy - ga * .18], [gx + ga, gy], [gx + ga * .18, gy + ga * .18], [gx, gy + ga], [gx - ga * .18, gy + ga * .18], [gx - ga, gy], [gx - ga * .18, gy - ga * .18]], { c: 'gold', t: 0 });
          P.pop();
        }
      }
      if (!live) MK.art.log3d(P, S.th);              // striker log on two ropes (3D sprite chosen by rope angle)
      /* impact: shock rings + fx */
      if (hit) {
        var Rg = [rr, rr - 90, rr - 180], W = [6, 4, 2], fade = clamp(1 - rr / 2300, 0, 1);
        Rg.forEach(function (r, k) {
          if (r < 10) return;
          var al = fade * (k === 0 ? 1 : .85);
          P.push(); P.translate(7, 5); P.alpha(al, function () { P.stroke(circlePath(BELL_MEDAL[0], BELL_MEDAL[1], r), { w: W[k] + 2, c: 'red' }); }); P.pop();
          P.alpha(al, function () { P.stroke(circlePath(BELL_MEDAL[0], BELL_MEDAL[1], r), { w: W[k], c: 'ink' }); });
        });
        fx.shake = Math.max(fx.shake || 0, 12 * imp);
        fx.ripple = { x: BELL_MEDAL[0], y: BELL_MEDAL[1], r: rr, amp: 14 * Math.exp(-tI / .8), w: 70 };
        var mk = Math.exp(-tI / .3); fx.misreg = [3 * mk, -2 * mk];
        var fa = .25 * Math.exp(-tI / .12); if (!fx.flash || fx.flash.a < fa) fx.flash = { c: 'paper', a: fa };
        ctx.sfx('데에엥', { key: 'bell' + st.n, x: 790, y: 575, size: 140, rot: -7, font: 'impact', color: 'paper', fx: 'echo', gloss: 'даң', life: 1.9 });
      } else if (S.tauR < 0) {
        fx.shake = Math.max(fx.shake || 0, 2 * Math.pow(S.h, 3));
      }
      if (p > 0 && p < 1 && !hit) ctx.ui.hold = { label: '꾹 · ТАРТ', progress: S.tauR >= 0 ? 1 : S.h };
    }
  });
})();
