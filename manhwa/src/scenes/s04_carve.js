/* s04 — 각·먹: top-down woodblock. Chisel carves the mirrored tiger, clears the ground, then a wide brush inks the raised design red.
   Also exports MK.blockArt (desk / board / tiger-block drawing) shared with s05. */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease, TAU = Math.PI * 2;
  var BLK = { x: 90, y: 170, w: 820, h: 1060 };
  var IN = { x0: 138, y0: 218, x1: 862, y1: 1182 };          // cleared ground = inside the raised border band
  var TG = { x: 500, y: 700, s: 700 };
  var ROWS = 8, SEC_PER_P = 2.5;

  /* arcs of chisel facets in the cleared ground (stateless, seeded) */
  var ARCS = (function () {
    var r = MK.rng(77), out = [], i;
    for (i = 0; i < 360; i++) out.push({ x: IN.x0 + 8 + r() * (IN.x1 - IN.x0 - 16), y: IN.y0 + 6 + r() * (IN.y1 - IN.y0 - 12), a: (r() - .5) * 1.6, l: 14 + r() * 20, k: r() < .5 ? -1 : 1 });
    return out;
  })();
  function rowOf(y) { return Math.min(ROWS - 1, Math.floor((y - IN.y0) / ((IN.y1 - IN.y0) / ROWS))); }

  /* head outline of the block-mode tiger in world coords, captured from the tiger API with a recording proxy */
  var HEAD = null;
  function headPts(P) {
    if (HEAD) return HEAD;
    var cap = null, Q = Object.create(P);
    ['push', 'pop', 'translate', 'rotate', 'scale', 'rect', 'circle', 'ellipse', 'path', 'stroke', 'line', 'taper', 'text', 'transform'].forEach(function (n) { Q[n] = function () { }; });
    Q.poly = function (pts) { if (!cap) cap = pts; };
    Q.clip = function (sh, inner) { inner(); }; Q.toneOnly = function (fn) { fn(); }; Q.fillOnly = function (fn) { fn(); };
    MK.art.tiger(Q, TG.x, TG.y, TG.s, { mode: 'block', mirror: true, carve: 1, inked: 0 });
    HEAD = (cap || []).map(function (p) { return [TG.x - p[0] * TG.s / 2, TG.y + p[1] * TG.s / 2]; });
    return HEAD;
  }
  /* tip of the carve at carve value c (dry run: nothing is painted) */
  function tipAt(P, c) {
    var f = P._f, t = P._t, s = { mode: 'block', mirror: true, carve: c, inked: 0 };
    P._f = P._t = false;
    try { MK.art.tiger(P, TG.x, TG.y, TG.s, s); } finally { P._f = f; P._t = t; }
    return s.tip;
  }

  function desk(P) { P.cover({ c: 'paper', t: .82, h: 'grain', a: 90 }); }

  function board(P) {
    var b = BLK;
    P.rect(b.x + 14, b.y + 20, b.w, b.h, { c: 'ink', t: 0 });                                       // drop shadow on the desk
    P.rect(b.x, b.y, b.w, b.h, { c: 'paper', t: .32, h: 'grain', a: 0, stroke: { w: 4, c: 'ink' } });
    /* raised border band */
    var ring = new Path2D(); ring.rect(IN.x0 - 16, IN.y0 - 16, IN.x1 - IN.x0 + 32, IN.y1 - IN.y0 + 32); ring.rect(IN.x0, IN.y0, IN.x1 - IN.x0, IN.y1 - IN.y0);
    P.path(ring, { c: 'paper', t: .32, h: 'grain', a: 0, rule: 'evenodd', stroke: { w: 3.4, c: 'ink' } });
  }
  function caps(P) {
    [[120, 0], [1210, 1]].forEach(function (c) {
      P.rect(70, c[0], 860, 70, { c: 'paper', t: .8, h: 'grain', a: 90, stroke: { w: 4, c: 'ink' } });
      P.stroke([[74, c[0] + (c[1] ? 14 : 56)], [926, c[0] + (c[1] ? 14 : 56)]], { w: 2.4, c: 'paper' });
      [96, 904].forEach(function (x) { P.circle(x, c[0] + 35, 11, { c: 'paper', t: 0, stroke: { w: 3, c: 'ink' } }); P.circle(x, c[0] + 35, 3.4, { c: 'ink', t: 0 }); });
    });
  }
  /* cleared ground: boustrophedon rows; c = 0..1 -> {x,y} chisel position */
  function clearGround(P, c) {
    if (c <= 0) return null;
    var rowH = (IN.y1 - IN.y0) / ROWS, W = IN.x1 - IN.x0, pass = Math.min(ROWS - 1, Math.floor(c * ROWS)), f = c * ROWS - pass, dir = pass % 2 ? -1 : 1;
    if (c >= 1) { pass = ROWS - 1; f = 1; dir = (ROWS - 1) % 2 ? -1 : 1; }
    var xcur = dir > 0 ? IN.x0 + W * f : IN.x1 - W * f, y0 = IN.y0 + pass * rowH;
    var st = { c: 'paper', t: .66, h: 'grain', a: 90 };
    if (pass > 0) P.rect(IN.x0, IN.y0, W, rowH * pass, st);
    if (dir > 0) P.rect(IN.x0, y0, W * f, rowH, st); else P.rect(xcur, y0, W * f, rowH, st);
    ARCS.forEach(function (a) {
      var r = rowOf(a.y); if (r > pass) return;
      if (r === pass && (dir > 0 ? a.x > xcur : a.x < xcur)) return;
      var co = Math.cos(a.a), si = Math.sin(a.a), h = a.l / 2;
      P.stroke([[a.x - co * h, a.y - si * h + 3 * a.k], [a.x, a.y - 3 * a.k], [a.x + co * h, a.y + si * h + 3 * a.k]], { w: 2.4, c: 'paper' });
    });
    return { x: xcur, y: y0 + rowH * .5 };
  }

  /* o = {carve (master 0..1), inked: 0|1, mask: Path2D|null} -> {tip, clear} */
  function drawBlock(P, o) {
    board(P);
    var clearC = MK.range(o.carve, .6, 1), tc = Math.min(1, o.carve / .6), clr = clearGround(P, clearC);
    var tip = null;
    if (o.inked && !o.mask) tip = MK.art.tiger(P, TG.x, TG.y, TG.s, { mode: 'block', mirror: true, carve: 1, inked: 1 });
    else {
      tip = MK.art.tiger(P, TG.x, TG.y, TG.s, { mode: 'block', mirror: true, carve: tc, inked: 0 });
      if (o.mask) P.clip(o.mask, function () { MK.art.tiger(P, TG.x, TG.y, TG.s, { mode: 'block', mirror: true, carve: 1, inked: 1 }); });
    }
    caps(P);
    return { tip: tip, clear: clr };
  }
  MK.blockArt = { BLK: BLK, TG: TG, desk: desk, drawBlock: drawBlock, headPts: headPts, tipAt: tipAt };

  /* ---- inking brush ---- */
  var BR = { w: 585, ang: 1.15 }, SL = Math.cos(BR.ang) / Math.sin(BR.ang);          // face line: x = bx + SL * (y - yc)
  var HALF = [{ y0: 160, y1: 700, yc: 435 }, { y0: 700, y1: 1240, yc: 965 }];
  var STREAK = (function () {
    var r = MK.rng(41), out = [], i;
    for (i = 0; i < 46; i++) out.push({ f: r(), l: 60 + r() * 150, h: 3 + r() * 4, g: 4 + r() * 18 });
    return out;
  })();
  function edgeX(bx, h, y) { return bx + SL * (y - HALF[h].yc) + 16 * MK.noise1(y * .045 + h * 7) + 8 * MK.noise1(y * .16 + 3 + h); }

  function chiselDraw(P, x, y, ang, k) {
    /* soft tone shadow of the shaft, then the chisel */
    P.blur(5, function () { P.toneOnly(function () { P.taper([[x + 14 - Math.cos(ang) * 260, y + 18 - Math.sin(ang) * 260], [x + 14, y + 18]], [26, 8], { c: 'ink', t: .7 }, 2); }); });
    MK.art.chisel(P, x, y, ang, { size: k || .78 });
  }

  MK.scene({
    id: 's04', order: 40, len: 2.2, title: 'Ою және бояу', hold: null,
    overlay: [
      { type: 'caption', at: [.08, .5], x: 90, y: 22, w: 600, side: 'l', rot: -1, text: '81 259-шы тақта. Онда бірде-бір әріп болмауы керек еді.' },
      { type: 'sfx', at: [.05, .45], x: 330, y: 1345, size: 96, rot: -3, font: 'brush', color: 'paper', fx: 'wobble', text: '사각사각', gloss: 'сық-сық' },
      { type: 'sfx', at: [.56, .68], x: 610, y: 1345, size: 110, rot: 3, font: 'brush', color: 'paper', fx: 'wobble', text: '쓱—', gloss: 'сырт' },
      { type: 'sfx', at: [.74, .86], x: 350, y: 1345, size: 120, rot: -4, font: 'brush', color: 'paper', fx: 'pop', text: '쓱!', gloss: 'сырт' }
    ],
    init: function (st) { st.dk = [0, 0]; },
    draw: function (ctx) {
      var P = ctx.P, p = ctx.p, t = ctx.t, inp = ctx.input || {}, st = ctx.state, i;
      var m = MK.range(p, 0, .5);
      desk(P);
      /* ---- inking state ---- */
      var kS = [MK.range(p, .55, .72), MK.range(p, .72, .9)], k = [kS[0], kS[1]];
      if (p < .55) st.dk = [0, 0];
      var act = p < .72 ? 0 : 1;
      if (p >= .55 && p < .9 && inp.dragging && inp.pointer && inp.pointer.x > 60 && inp.pointer.x < 960 && inp.pointer.y > HALF[act].y0 - 40 && inp.pointer.y < HALF[act].y1 + 40)
        st.dk[act] = Math.max(st.dk[act], MK.range(inp.pointer.x, 70, 940));
      if (p >= .55) { k[0] = Math.max(k[0], st.dk[0]); k[1] = Math.max(k[1], st.dk[1]); }
      var BX0 = -90, BX1 = 1120, bx = [MK.lerp(BX0, BX1, E.inOutQuad(k[0])), MK.lerp(BX0, BX1, E.inOutQuad(k[1]))];
      var mask = null;
      if (k[0] > 0 || k[1] > 0) {
        mask = new Path2D();
        [0, 1].forEach(function (h) {
          if (k[h] <= 0) return;
          var H = HALF[h], y;
          mask.moveTo(40, H.y0);
          for (y = H.y0; y <= H.y1; y += 10) mask.lineTo(edgeX(bx[h], h, y), y);
          mask.lineTo(40, H.y1); mask.closePath();
        });
      }
      var inked = p >= .9 && k[0] >= 1 && k[1] >= 1 ? 1 : 0;
      var res = drawBlock(P, { carve: m, inked: inked, mask: inked ? null : mask });

      /* wet sheen right behind the brush edge */
      [0, 1].forEach(function (h) {
        if (k[h] <= 0 || k[h] >= 1) return;
        var H = HALF[h], fade = 1 - MK.range(k[h], .86, 1);
        P.clip(headPts(P), function () {
          STREAK.forEach(function (s) {
            var y = H.y0 + 8 + s.f * (H.y1 - H.y0 - 16), ex = edgeX(bx[h], h, y) - 5, x0 = ex - s.l;
            P.alpha(fade, function () { P.rect(x0, y, s.l, s.h, { c: 'red', t: P.lin(x0, 0, ex, 0, [[0, 0], [1, .24]]), a: 90 }); });
          });
        });
      });

      /* ---- chisel + chips ---- */
      if (p < .52) {
        var CA = -35 * Math.PI / 180, dir = [Math.cos(CA), Math.sin(CA)], pos = null;
        if (m < .6 || !res.clear) { var tp = res.tip || tipAt(P, 5e-4); if (tp) pos = [tp.x, tp.y]; }
        else {
          var le = tipAt(P, 1), bl = E.smoothstep(MK.range(m, .6, .65));
          pos = le ? [MK.lerp(le.x, res.clear.x, bl), MK.lerp(le.y, res.clear.y, bl)] : [res.clear.x, res.clear.y];
        }
        if (pos) {
          var away = 720 * (1 - E.outCubic(MK.range(m, 0, .035))) + 900 * E.inQuad(MK.range(m, .97, 1)), jit = 2 * Math.sin(t * 38);
          chiselDraw(P, pos[0] - dir[0] * away + jit, pos[1] - dir[1] * away, CA + .015 * Math.sin(t * 30), .78);
        }
        /* wood chips: events along the carving path (+ the clearing path) */
        var STEP = .03, e0 = Math.floor(m / STEP), j;
        for (j = 0; j < 13; j++) {
          var ev = (e0 - j) * STEP; if (ev <= 0) break;
          var tau = (m - ev) * .5 * SEC_PER_P, cp = null;
          if (tau > .75) break;
          if (ev < .6) { var tq = tipAt(P, Math.min(1, ev / .6)); if (tq) cp = [tq.x, tq.y]; }
          else {
            var cc = MK.range(ev, .6, 1), rowH = (IN.y1 - IN.y0) / ROWS, W = IN.x1 - IN.x0, pass = Math.min(ROWS - 1, Math.floor(cc * ROWS)), f = cc * ROWS - pass, dr = pass % 2 ? -1 : 1;
            cp = [dr > 0 ? IN.x0 + W * f : IN.x1 - W * f, IN.y0 + pass * rowH + rowH * .5];
          }
          if (cp) MK.fx.chips(P, { seed: (e0 - j) * 7 + 3, n: 2, x: cp[0], y: cp[1], tau: tau + .02, dir: -1.7, spread: 2.2, speed: 330, g: 1200, life: .6, size: 9 });
        }
      }

      /* ---- ink brush ---- */
      var show = -1, bxx = 0;
      if (p >= .55 && p < .72 && k[0] < 1) { show = 0; bxx = bx[0]; }
      else if (p >= .72 && p < .9 && k[1] < 1) { show = 1; bxx = bx[1]; }
      if (show >= 0) {
        var enter = show === 1 ? 700 * (1 - E.outCubic(MK.range(p, .715, .745))) : 0;
        MK.art.inkBrush(P, bxx, HALF[show].yc + enter, BR.w, BR.ang + .02 * Math.sin(t * 9), { wet: .9, tip: 'red', seed: 5 });
      }
    }
  });
})();
