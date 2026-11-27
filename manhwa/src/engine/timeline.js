/* timeline.js — scene / transition registry, scroll -> segment mapping, built-in transition kinds */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp;
  var defs = [];
  var TL = MK.timeline = { segments: [], total: 0, byId: {}, active: [], built: false };

  MK.scene = function (d) {
    try {
      if (!d || !d.id) throw new Error('scene without id');
      if (typeof d.draw !== 'function') throw new Error('scene ' + d.id + ': draw() missing');
      d.kind = 'scene'; d.len = d.len || 1; d.order = d.order == null ? 1e6 : d.order; d.hold = d.hold || null; d.state = null;
      defs.push(d);
    } catch (e) { MK.err(e, 'MK.scene'); }
  };
  MK.transition = function (d) {
    try {
      if (!d || !d.id) throw new Error('transition without id');
      d.kind_ = d.kind || 'scroll'; d.kind = 'transition'; d.len = d.len || .6; d.order = d.order == null ? 1e6 : d.order; d.hold = null;
      if (d.kind_ === 'custom' && typeof d.draw !== 'function') throw new Error('transition ' + d.id + ': draw() missing');
      defs.push(d);
    } catch (e) { MK.err(e, 'MK.transition'); }
  };

  TL.build = function () {
    defs.sort(function (a, b) { return a.order - b.order; });
    var s = 0; TL.segments = []; TL.byId = {};
    defs.forEach(function (d) {
      var seg = { id: d.id, kind: d.kind, start: s, len: d.len, hold: d.hold, order: d.order, title: d.title || d.id, def: d };
      d.seg = seg; TL.segments.push(seg); TL.byId[d.id] = seg; s += d.len;
    });
    TL.total = s; TL.built = true;
    defs.forEach(function (d, i) {   /* neighbour scenes for transitions */
      if (d.kind !== 'transition') return;
      var a = null, b = null, j;
      for (j = i - 1; j >= 0; j--) if (defs[j].kind === 'scene') { a = defs[j]; break; }
      for (j = i + 1; j < defs.length; j++) if (defs[j].kind === 'scene') { b = defs[j]; break; }
      if (d.from && TL.byId[d.from]) a = TL.byId[d.from].def;
      if (d.to && TL.byId[d.to]) b = TL.byId[d.to].def;
      d.A = a; d.B = b;
    });
  };
  /* all declarative overlay items, for overlay.js */
  TL.scenes = function () { return defs.filter(function (d) { return d.kind === 'scene'; }); };

  TL.locate = function (sVH) {
    var segs = TL.segments, n = segs.length; if (!n) return null;
    sVH = clamp(sVH, 0, TL.total);
    for (var i = 0; i < n; i++) {
      var g = segs[i];
      if (sVH < g.start + g.len || i === n - 1) return { seg: g, i: i, p: clamp((sVH - g.start) / g.len, 0, 1) };
    }
  };

  /* hold meter: integrates with dt. state is the scene state object. */
  MK.holdMeter = function (state, input, dt, o) {
    o = o || {}; var h = state._hold || (state._hold = { v: 0, done: false });
    var rise = o.rise || 1 / 2.2, fall = o.fall || 1 / 0.9, was = h.done, held = !!(input && input.holding);
    if (!h.done) { h.v = clamp(h.v + (held ? rise : -fall) * dt, 0, 1); if (h.v >= 1) { h.v = 1; h.done = true; } }
    return { value: h.v, completed: h.done, justCompleted: h.done && !was, holding: held };
  };
  MK.holdReset = function (state) { state._hold = { v: 0, done: false }; };

  function mkCtx(base, d, p, ui) {
    var c = Object.create(base); c.p = p; c.state = d.state; c.scene = d;
    c.sfx = function (text, opts) { MK.overlay && MK.overlay.sfx(d.id, text, opts, base.t); };
    return c;
  }
  function safe(d, fn, ctx) {
    try { fn.call(d, ctx); } catch (e) { MK.err(e, d.id); }
  }
  function ensure(d) {
    if (!d || d.state) return;
    d.state = {}; if (d.init) safe(d, d.init, d.state);
  }
  function upd(d, base, p) { ensure(d); var c = mkCtx(base, d, p); if (d.update) safe(d, d.update, c); return c; }
  function drw(d, base, p) { ensure(d); var c = mkCtx(base, d, p); safe(d, d.draw, c); return c; }

  /* One frame of the timeline. base = {p?, t, dt, input, fx, ui, view, P}. Returns active scene list [{id,p}] */
  TL.frame = function (sVH, base) {
    var L = TL.locate(sVH), P = MK.P, active = [], H = MK.view.bounds.y1 - MK.view.bounds.y0;
    if (!L) return active;
    var d = L.seg.def;
    base.seg = L.seg; base.sVH = sVH; base.segP = L.p;
    if (d.kind === 'scene') {
      var c = upd(d, base, L.p); drw(d, base, L.p); active.push({ id: d.id, p: L.p });
      if (d.hold) base.ui.holdScene = true;
    } else {
      var A = d.A, B = d.B, q = L.p;
      if (A) { upd(A, base, 1); active.push({ id: A.id, p: 1 }); }
      if (B) { upd(B, base, 0); active.push({ id: B.id, p: 0 }); }
      var drawA = function (pp) { if (A) drw(A, base, pp == null ? 1 : pp); };
      var drawB = function (pp) { if (B) drw(B, base, pp == null ? 0 : pp); };
      var tc = Object.create(base); tc.q = q; tc.state = d.state || (d.state = {}); tc.sfx = function (text, o) { MK.overlay && MK.overlay.sfx(d.id, text, o, base.t); };
      var kind = d.kind_;
      try {
        if (kind === 'custom') d.draw(tc, q, drawA, drawB);
        else if (kind === 'flash') {
          var a = Math.pow(clamp(1 - Math.abs(q - .5) * 2, 0, 1), 1.4);
          base.fx.flash = { c: d.flashColor || 'paper', a: a };
          if (q < .5) drawA(); else drawB();
        } else {
          var pA = d.parallaxA || 1, u = Math.min(1, q * pA);
          P.push(); P.translate(0, H * Math.pow(1 - u, 1.6)); drawB(); P.pop();
          P.push(); P.translate(0, -q * pA * H); drawA(); P.pop();
        }
      } catch (e) { MK.err(e, d.id); }
    }
    return active;
  };
})();
