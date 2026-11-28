/* s01 — 표지: title carved into a black woodblock, then the 각수 seal slams */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease;
  var DIR = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3)], NRM = [Math.cos(Math.PI / 3 - Math.PI / 2) * -1, 0];
  NRM = [DIR[1], -DIR[0]];   /* perpendicular to the 60-degree chisel direction */
  var SEC_PER_P = 2.5, P0 = .02, P1 = .58;

  var TITLE = { text: '목판', size: 380, x: 470, y: 560, lh: .98 };
  var SUB = { text: '붉은 달의 각수', size: 54, x: 790, y: 300, lh: 1.06 };
  var LAT = { text: 'MOKPAN', size: 150, x: 500, y: 1130, spacing: 16 };
  var GROUPS = [
    { id: 't', bbox: [270, 215, 670, 990], pitch: 30 },
    { id: 's', bbox: [758, 258, 822, 730], pitch: 26 },
    { id: 'l', bbox: [120, 1015, 880, 1150], pitch: 28 }
  ];
  var STROKES = null;

  function build() {
    STROKES = [];
    GROUPS.forEach(function (g) {
      var b = g.bbox, cs = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]], o0 = 1e9, o1 = -1e9, t0 = 1e9, t1 = -1e9;
      cs.forEach(function (c) {
        var o = c[0] * NRM[0] + c[1] * NRM[1], t = c[0] * DIR[0] + c[1] * DIR[1];
        o0 = Math.min(o0, o); o1 = Math.max(o1, o); t0 = Math.min(t0, t); t1 = Math.max(t1, t);
      });
      for (var o = o0 + g.pitch * .5; o < o1 + g.pitch * .5; o += g.pitch) {
        var S = [NRM[0] * o + DIR[0] * t0, NRM[1] * o + DIR[1] * t0], L = t1 - t0, ent = 0, ext = L, k, lo, hi, m = 14;
        for (k = 0; k < 2; k++) {
          var a = (b[k] - m - S[k]) / DIR[k], c = (b[k + 2] + m - S[k]) / DIR[k]; lo = Math.min(a, c); hi = Math.max(a, c);
          ent = Math.max(ent, lo); ext = Math.min(ext, hi);
        }
        if (ext - ent < 8) continue;
        STROKES.push({ s: [S[0] + DIR[0] * ent, S[1] + DIR[1] * ent], len: ext - ent, hw: g.pitch * .64, g: g.id });
      }
    });
  }

  function glyphs(P, g, dx, dy, st) {
    P.push(); P.translate(dx, dy);
    if (g === 't') P.text(TITLE.text, TITLE.x, TITLE.y, { font: 'Song Myung', size: TITLE.size, vertical: true, lh: TITLE.lh }, st);
    if (g === 's') P.text(SUB.text, SUB.x, SUB.y, { font: 'Song Myung', size: SUB.size, vertical: true, lh: SUB.lh }, st);
    if (g === 'l') P.text(LAT.text, LAT.x, LAT.y, { font: 'Cormorant Garamond', weight: 700, size: LAT.size, spacing: LAT.spacing, align: 'center' }, st);
    P.pop();
  }

  MK.scene({
    id: 's01', order: 10, len: 1.4, title: 'Мұқаба', hold: null,
    overlay: [
      { type: 'caption', at: [.64, .99], x: 90, y: 1258, w: 600, side: 'l', rot: -1.2, text: 'Қызыл айдың оюшысы · 1-бөлім' }
    ],
    init: function (st) { build(); },
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, b = ctx.view.bounds, N = STROKES.length;
      /* board */
      P.cover({ c: 'paper', t: .86, h: 'grain', a: 0 });
      /* end caps (마구리) */
      [[78, 178], [1222, 1322]].forEach(function (c, i) {
        P.rect(b.x0 - 4, c[0], b.x1 - b.x0 + 8, c[1] - c[0], { c: 'ink', t: 0 });
        P.stroke([[b.x0 - 4, c[0] + (i ? 7 : 93)], [b.x1 + 4, c[0] + (i ? 7 : 93)]], { w: 5, c: 'paper' });
        P.stroke([[b.x0 - 4, c[0] + (i ? 14 : 86)], [b.x1 + 4, c[0] + (i ? 14 : 86)]], { w: 2, c: 'paper' });
        [120, 880].forEach(function (nx) { P.circle(nx, (c[0] + c[1]) / 2, 11, { c: 'paper', t: 0, stroke: { w: 3, c: 'ink' } }); P.circle(nx, (c[0] + c[1]) / 2, 3.5, { c: 'ink', t: 0 }); });
      });

      /* carving progress: stroke u = global stroke index (float) */
      var u = clamp((p - P0) / (P1 - P0), 0, 1) * N, cur = Math.min(N - 1, Math.floor(u));
      var clips = { t: new Path2D(), s: new Path2D(), l: new Path2D() }, i;
      for (i = 0; i <= cur && i < N; i++) {
        var s = STROKES[i], f = clamp(u - i, 0, 1), L = s.len * (f === 1 ? 1.02 : f), cp = clips[s.g];
        var tx = s.s[0] + DIR[0] * L, ty = s.s[1] + DIR[1] * L;
        cp.moveTo(s.s[0] - NRM[0] * s.hw, s.s[1] - NRM[1] * s.hw); cp.lineTo(s.s[0] + NRM[0] * s.hw, s.s[1] + NRM[1] * s.hw);
        cp.lineTo(tx + NRM[0] * s.hw, ty + NRM[1] * s.hw); cp.lineTo(tx - NRM[0] * s.hw, ty - NRM[1] * s.hw); cp.closePath();
      }
      if (u > 0) ['t', 's', 'l'].forEach(function (g) {
        P.clip(clips[g], function () { glyphs(P, g, 5, 6, { c: 'ink', t: 0 }); glyphs(P, g, 0, 0, { c: 'paper', t: .12, a: 60 }); });
      });

      /* chips from the last strokes */
      var span = P1 - P0;
      for (i = Math.max(0, cur - 22); i <= cur; i++) {
        var si = STROKES[i], pm = P0 + (i + .5) / N * span, tau = (p - pm) * SEC_PER_P;
        if (p < pm) continue;
        var mx = si.s[0] + DIR[0] * si.len * .5, my = si.s[1] + DIR[1] * si.len * .5;
        MK.fx.chips(P, { seed: i * 11 + 3, n: 2, x: mx, y: my, tau: tau + .02, dir: -2.0, spread: 2.0, speed: 380, g: 1300, life: .7, size: 9 });
      }
      /* chisel */
      if (p > 0 && p < P1 + .1) {
        var s2 = STROKES[cur], f2 = clamp(u - cur, 0, 1), L2 = s2.len * f2, tip = [s2.s[0] + DIR[0] * L2, s2.s[1] + DIR[1] * L2];
        var away = E.inQuad(clamp((p - P1) / .08, 0, 1)) * 700;
        MK.art.chisel(P, tip[0] - DIR[0] * away + 6, tip[1] - DIR[1] * away + 4, Math.atan2(DIR[1], DIR[0]) + .02 * Math.sin(t * 40), { size: .78 });
        /* rhythmic 사각사각 near the cut */
        var bk = Math.floor(u / 20);
        if (u > 0 && u < N - 2 && bk < 3) {
          var r = MK.rng(bk * 9 + 1);
          ctx.sfx('사각사각', { key: 'sak' + bk, x: clamp(tip[0] + 190, 220, 800), y: clamp(tip[1] - 110, 260, 1100), size: 120, rot: (r() - .5) * 16, font: 'brush', color: 'paper', fx: 'wobble', gloss: 'сық-сық', life: .7 });
        }
      }

      /* seal slam */
      var tau = MK.event(ctx.state, 'slam', p, .6, t, SEC_PER_P);
      if (tau >= 0) {
        var X = 770, Y = 860, size = 150, sc, rot, dy, press = 0, ts = tau - .30;
        if (tau < .12) { var q = E.outQuad(tau / .12); sc = MK.lerp(1.7, 1.6, q); rot = -12; dy = MK.lerp(-90, -70, q); }
        else if (tau < .30) { var q2 = E.inQuad((tau - .12) / .18); sc = MK.lerp(1.6, 1, q2); rot = MK.lerp(-12, -4, q2); dy = MK.lerp(-70, 0, q2); }
        else { sc = 1; rot = -4; dy = 0; press = Math.exp(-ts / .12); }
        P.push(); P.translate(X, Y + dy); P.rotate(rot * Math.PI / 180); P.scale(sc);
        MK.art.seal(P, 0, 0, size, '각수', { press: press, seed: 7 });
        P.pop();
        if (ts >= 0) {
          ctx.fx.shake = Math.max(ctx.fx.shake || 0, 10 * Math.exp(-ts / .18));
          var mk = clamp(1 - ts / .3, 0, 1); ctx.fx.misreg = [3 * mk, 1.5 * mk];
          MK.fx.droplets(P, { seed: 31, n: 30, x: X, y: Y, tau: ts, dir: 0, spread: Math.PI * 2, speed: 560, g: 800, life: .8, size: 15, c: 'red' });
          ctx.sfx('탁!', { key: 'tak' + MK.eventId(ctx.state, 'slam'), x: 640, y: 690, size: 210, rot: -8, font: 'impact', color: 'paper', fx: 'pop', gloss: 'тық', life: 2.2 });
        }
      }
    }
  });
})();
