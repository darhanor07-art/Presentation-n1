/* s05 — 찍기: a hanji sheet drops on the inked block, the pad rubs the red print through (HOLD), the sheet peels off diagonally,
   then the printed sheet returns and grows to fill the screen (= first frame of s06). */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, TAU = Math.PI * 2, lerp = MK.lerp;
  var RECT = { x: 60, y: 140, w: 880, h: 1120 }, CX = 500, CY = 700;
  var PHI = 22 * Math.PI / 180, NX = Math.cos(PHI), NY = Math.sin(PHI);          // fold normal (points to the bottom-right corner side)
  var C0 = NX * (RECT.x + RECT.w) + NY * (RECT.y + RECT.h), C1 = NX * RECT.x + NY * RECT.y - 70;
  var RECT_PTS = [[RECT.x, RECT.y], [RECT.x + RECT.w, RECT.y], [RECT.x + RECT.w, RECT.y + RECT.h], [RECT.x, RECT.y + RECT.h]];
  var RUB_R = 120, PAD_R = 104;

  function rubPoint(u) { return [500 + 330 * Math.sin(u * TAU * 6), 230 + u * 900]; }
  function halfPoly(c, side, extra) {
    var L = 5000, tx = -NY, ty = NX, ax = c * NX + tx * L, ay = c * NY + ty * L, bx = c * NX - tx * L, by = c * NY - ty * L, d = side * (extra == null ? L : extra);
    return [[ax, ay], [bx, by], [bx + NX * d, by + NY * d], [ax + NX * d, ay + NY * d]];
  }
  function printTiger(P, mirror, size, cy) { MK.art.tiger(P, 500, cy == null ? 700 : cy, size || 700, { mode: 'print', mirror: mirror, eyeOpen: 0, pupil: 1, mouthOpen: 0, ink: 0 }); }

  MK.scene({
    id: 's05', order: 50, len: 2.0, title: 'Басу', hold: 'press',
    overlay: [
      { type: 'caption', at: [.82, .98], x: 90, y: 22, w: 600, side: 'l', rot: 1, text: 'Қағаз көтерілгенде, баспа тыныс алды.' },
      { type: 'sfx', at: [.1, .3], x: 260, y: 1340, size: 110, rot: -5, font: 'brush', color: 'paper', fx: 'wobble', text: '펄럭', gloss: 'жалп' }
    ],
    init: function (st) { st.doneT = null; st.hv = 0; },
    update: function (ctx) {
      var st = ctx.state, p = ctx.p, auto = MK.range(p, .5, .8);
      if (p < .3) { MK.holdReset(st); st.hv = 0; st.doneT = null; return; }
      var hm = MK.holdMeter(st, ctx.input, ctx.dt, { rise: 1 / 2.2, fall: 1 / .9 });
      st.hv = hm.completed ? 1 : Math.max(hm.value, auto);
      var done = st.hv >= 1;
      if (done && st.doneT == null) st.doneT = ctx.t; else if (!done) st.doneT = null;
    },
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, b = ctx.view.bounds, st = ctx.state, art = MK.art;
      var B = MK.blockArt, hv = p >= .3 ? st.hv : 0, since = st.doneT == null ? 0 : Math.max(0, t - st.doneT);
      var pe = p >= .3 ? clamp(Math.max(MK.range(p, .8, .88), since / 1.3), 0, 1) : 0;
      var ho = MK.range(p, .9, 1);
      B.desk(P);
      B.drawBlock(P, { carve: 1, inked: 1, mask: null });

      /* ---------- handoff: printed sheet returns, grows to fill bounds ---------- */
      if (ho > 0) {
        var e1 = E.outCubic(MK.range(ho, 0, .4)), e2 = E.inOutCubic(MK.range(ho, .35, 1));
        var tg = { x: b.x0 - 60, y: b.y0 - 60, w: b.x1 - b.x0 + 120, h: b.y1 - b.y0 + 120 };
        var rc = { x: lerp(RECT.x, tg.x, e2), y: lerp(RECT.y, tg.y, e2), w: lerp(RECT.w, tg.w, e2), h: lerp(RECT.h, tg.h, e2) };
        P.push(); P.translate(CX - 1500 * (1 - e1), CY - 1400 * (1 - e1)); P.rotate(-.35 * (1 - e1)); P.translate(-CX, -CY);
        art.sheet(P, rc, { shadow: true, t: lerp(.07, 0, e2), sh: 1 - e2 * .5 });
        printTiger(P, false, lerp(700, 760, e2), lerp(700, 660, e2));
        P.pop();
        ctx.fx.misreg = [1 * e2, .6 * e2];   /* s06 opens with misreg [1,.6] */
        return;
      }

      /* ---------- drop ---------- */
      var k = MK.range(p, 0, .25), dy = -1500 * (1 - E.outQuad(k)) + 12 * Math.sin(Math.PI * MK.range(k, .8, 1));
      var rot = .06 * Math.sin(k * TAU * 2.5) * (1 - k), sc = lerp(1.05, 1, k);
      if (k < 1) {   // soft shadow on the block, shrinking as the sheet lands
        var sa = E.smoothstep(MK.range(k, 0, .4));
        P.alpha(sa, function () { P.blur(10 + 26 * (1 - k), function () { P.toneOnly(function () { P.rect(RECT.x + 30 * (1 - k) + 10, RECT.y + 40 * (1 - k) + 14, RECT.w, RECT.h, { c: 'ink', t: lerp(.5, .2, k) }); }); }); });
      }
      P.push(); P.translate(CX, CY + dy); P.scale(sc); P.rotate(rot); P.translate(-CX, -CY);
      var peeling = pe > 0;
      var maskPath = null, u = clamp(hv, 0, 1);
      if (u > 0) {
        maskPath = new Path2D(); var n = Math.max(2, Math.ceil(120 * u)), i;
        for (i = 0; i <= n; i++) { var q = rubPoint(u * i / n); maskPath.moveTo(q[0] + RUB_R, q[1]); maskPath.arc(q[0], q[1], RUB_R, 0, TAU); }
      }
      function topSide() {
        var pts = art.sheet(P, RECT, { shadow: false });
        var ramp = MK.range(p, .2, .3);
        if (ramp > 0) P.alpha(.15 * ramp, function () { printTiger(P, true); });
        if (maskPath) P.clip(maskPath, function () { printTiger(P, true); });
        return pts;
      }
      var sheetPts = null;
      if (!peeling) topSide();
      else {
        var c = lerp(C0, C1, E.inOutQuad(pe)), Hm = halfPoly(c, -1), Hp = halfPoly(c, 1);
        var a = 1 - 2 * NX * NX, bb = -2 * NX * NY, d = 1 - 2 * NY * NY, e = 2 * c * NX, f = 2 * c * NY;
        /* cast shadow on the revealed block beside the fold */
        P.clip(Hp, function () { P.toneOnly(function () { P.poly(halfPoly(c, 1, 150), { c: 'ink', t: P.lin(c * NX, c * NY, (c + 150) * NX, (c + 150) * NY, [[0, .55], [1, 0]]), a: 0 }); }); });
        /* flat part */
        P.clip(Hm, function () { sheetPts = topSide(); });
        /* flap: reflection of the lifted part, showing the printed underside */
        if (pe < 1) {
          P.push(); P.translate(14, 20); P.transform(a, bb, bb, d, e, f);
          P.blur(8, function () { P.clip(Hp, function () { P.toneOnly(function () { P.poly(RECT_PTS, { c: 'ink', t: .55 }); }); }); });
          P.pop();
          P.push(); P.transform(a, bb, bb, d, e, f);
          P.clip(Hp, function () {
            var pts = art.sheet(P, RECT, { shadow: false, t: .1 });
            printTiger(P, true);
            P.clip(pts, function () { P.toneOnly(function () { P.poly(halfPoly(c, 1, 150), { c: 'ink', t: P.lin(c * NX, c * NY, (c + 150) * NX, (c + 150) * NY, [[0, .6], [1, 0]]), a: PHI * 180 / Math.PI }); }); });
          });
          P.pop();
          /* fold crease */
          var tx = -NY, ty = NX;
          P.clip(RECT_PTS, function () { P.stroke([[c * NX + tx * 1600, c * NY + ty * 1600], [c * NX - tx * 1600, c * NY - ty * 1600]], { w: 2.6, c: 'ink' }); });
          if (pe > .02) ctx.sfx('사락', { key: 'peel', x: 700, y: 1340, size: 110, rot: 4, font: 'brush', color: 'paper', fx: 'wobble', gloss: 'сыбдыр', life: 1.2 });
        }
      }
      /* pad */
      if (p >= .27 && p < .9) {
        var pu = clamp(hv, 0, 1), pp = rubPoint(pu), pp2 = rubPoint(Math.min(1, pu + .004)), pr = Math.atan2(-(pp2[1] - pp[1]), -(pp2[0] - pp[0]));
        if (pu <= 0) pr = Math.PI * .85;
        var enter = 360 * (1 - E.outCubic(MK.range(p, .27, .32))), leave = E.inQuad(MK.range(since, .05, .55)) * 800;
        if (pe < 1 || since < .6) art.pad(P, pp[0] + leave + 6 * Math.sin(t * 13) * (st.hv < 1 && ctx.input.holding ? 1 : 0), pp[1] - enter - leave * .4, PAD_R, pr);
      }
      P.pop();

      /* ---------- hold UI + rubbing sfx ---------- */
      if (p >= .3 && hv < 1) {
        ctx.ui.hold = { label: '꾹 · БАСЫП ТҰР', progress: hv };
        if (ctx.input.holding && hv > 0) {
          var pr2 = rubPoint(hv), kk = Math.floor(hv * 2.2 / .6);
          ctx.sfx('슥슥', { key: 'rub' + kk, x: clamp(pr2[0] + 120, 220, 800), y: clamp(pr2[1] - 170, 250, 1150), size: 96, rot: (kk % 2 ? 6 : -6), font: 'brush', color: 'paper', fx: 'wobble', gloss: 'ысқ', life: .8 });
        }
      }
    }
  });
})();
