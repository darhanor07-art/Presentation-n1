/* art/00_rig.js — MK.rig: data-driven part-hierarchy rig runtime (OpenMontage character-animation artifacts + CMU mocap).
   Loaded first among art/*.js (name sorts before everything); data arrives from art/rigdata.js (generated).
   Data model (see ENGINE.md "Rig"): parts[{id,parent,layer}], joints{id:{pivot}} in design px (scale/unit),
   poses{name:{parts:{part:{channel:v}}, loops:{part:{channel:{a,hz,ph,o,a2,ph2}}}, mode:'overlay', every, env, mocap}},
   scenes{id:{actions:[{at_seconds,duration_seconds,pose,easing}]}}, cycles{chains,mocap_map}. */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, TAU = Math.PI * 2, D2R = Math.PI / 180;
  var R = MK.rig = { chars: {}, mocap: {} };

  /* ---------- easing (GSAP-style names used by the OpenMontage artifacts) ---------- */
  var EASE = {
    linear: function (u) { return u; },
    'power1.in': function (u) { return u * u; }, 'power1.out': function (u) { return 1 - (1 - u) * (1 - u); },
    'power1.inOut': function (u) { return u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; },
    'power2.in': function (u) { return u * u * u; }, 'power2.out': function (u) { return 1 - Math.pow(1 - u, 3); },
    'power2.inOut': function (u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; },
    'power3.in': function (u) { return u * u * u * u; }, 'power3.out': function (u) { return 1 - Math.pow(1 - u, 4); },
    'power3.inOut': function (u) { return u < .5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2; },
    'sine.inOut': function (u) { return -(Math.cos(Math.PI * u) - 1) / 2; },
    'back.out': function (u) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
    'expo.out': function (u) { return u >= 1 ? 1 : 1 - Math.pow(2, -10 * u); }
  };
  R.ease = function (name, u) { u = clamp(u, 0, 1); return (EASE[name] || EASE['power2.inOut'])(u); };

  /* ---------- loading ---------- */
  R.load = function (d) {
    var id;
    for (id in d.mocap) R.mocap[id] = d.mocap[id];
    for (id in d.chars) R.register(id, d.chars[id]);
  };
  R.register = function (id, c) {
    var byId = {}, order;
    c.scale = c.scale || 1000;
    c.parts.forEach(function (p) { byId[p.id] = p; p.pv = c.joints[p.id].pivot; });
    c.byId = byId;
    c.order = order = c.parts.slice().sort(function (a, b) { return a.layer - b.layer; });
    R.chars[id] = c;
  };

  /* ---------- channel maps ---------- */
  function def(key) { return key.indexOf('.scale') >= 0 ? 1 : 0; }
  function get(m, k) { var v = m[k]; return v === undefined ? def(k) : v; }
  function flatten(pose, T, w, out) {
    var pk, ck, pa, L, l, v;
    for (pk in (pose.parts || {})) { pa = pose.parts[pk]; for (ck in pa) out[pk + '.' + ck] = pa[ck]; }
    for (pk in (pose.loops || {})) {
      L = pose.loops[pk];
      for (ck in L) {
        l = L[ck]; v = (l.o || 0) + (l.a || 0) * Math.sin(TAU * (l.hz || 1) * T + (l.ph || 0)) + (l.a2 || 0) * Math.sin(TAU * 2 * (l.hz || 1) * T + (l.ph2 || 0));
        out[pk + '.' + ck] = (out[pk + '.' + ck] === undefined ? def(pk + '.' + ck) : out[pk + '.' + ck]) + v;
      }
    }
    if (pose.mocap) out['_mocap.w'] = pose.mocap.w == null ? 1 : pose.mocap.w;
    return out;
  }
  function lerpMaps(a, b, u) {
    var o = {}, k;
    for (k in a) o[k] = a[k]; for (k in b) if (!(k in o)) o[k] = def(k) === 1 ? 1 : 0;
    for (k in o) { var bv = k in b ? b[k] : def(k); o[k] = o[k] + (bv - o[k]) * u; }
    return o;
  }
  function overlayW(u, env) { var a = env ? env[0] : .3, b = env ? env[1] : .6; return u < a ? R.ease('power2.out', u / a) : u > b ? 1 - R.ease('power1.inOut', (u - b) / (1 - b)) : 1; }

  /* ---------- evaluation ---------- */
  /* o = {variant:'stand'|'seat'|'face', scene:'s09', clock:seconds in scene (default 0), t:wall seconds (loops; default clock),
          pose:'name' (instead of a scene timeline), add:{'part.ch':v}, mocap:{clip,phase,weight}, chain:true (default) } */
  function core(c, o, clock, t, noMocap) {
    var sc = o.scene && c.scenes[o.scene], acts = sc ? sc.actions : [], m = {}, i, a, pose, prev = {}, found = false, mspec = null, mstart = 0, k;
    if (o.pose && c.poses[o.pose]) m = flatten(c.poses[o.pose], t, 1, {});
    else {
      var seq = acts.filter(function (x) { return c.poses[x.pose] && c.poses[x.pose].mode !== 'overlay'; });
      for (i = 0; i < seq.length; i++) {
        a = seq[i]; if (clock < a.at_seconds) break; pose = c.poses[a.pose];
        var vals = flatten(pose, t, 1, {}), dur = a.duration_seconds || .3;
        if (pose.mocap) { mspec = pose.mocap; if (!i || !seq[i - 1].pose || !c.poses[seq[i - 1].pose].mocap || c.poses[seq[i - 1].pose].mocap.clip !== pose.mocap.clip) mstart = a.at_seconds; }
        if (clock >= a.at_seconds + dur) { prev = vals; m = vals; found = true; continue; }
        m = lerpMaps(prev, vals, R.ease(a.easing, (clock - a.at_seconds) / dur)); found = true; break;
      }
      if (!found && seq.length) m = flatten(c.poses[seq[0].pose], t, 1, {});
      /* a pose that blends away from a mocap pose keeps the clip spec of the nearest earlier one */
      if (!mspec) for (i = 0; i < seq.length; i++) if (seq[i].at_seconds <= clock && c.poses[seq[i].pose].mocap) { mspec = c.poses[seq[i].pose].mocap; mstart = seq[i].at_seconds; }
      /* overlays: additive pulses (blink, ear flick), optionally periodic */
      acts.forEach(function (x) {
        pose = c.poses[x.pose]; if (!pose || pose.mode !== 'overlay') return;
        var dur = x.duration_seconds || .3, loc = clock - x.at_seconds, n = 0;
        if (loc < 0) return;
        if (pose.every) { n = Math.floor(loc / pose.every); if (pose.count && n >= pose.count) return; loc -= n * pose.every; }
        var u = loc / dur; if (u > 1) return;
        var w = overlayW(u, pose.env), vals = flatten(pose, t, 1, {}), kk;
        for (kk in vals) if (kk !== '_mocap.w') m[kk] = get(m, kk) + (vals[kk] - def(kk)) * w;
      });
    }
    if (o.add) for (k in o.add) m[k] = get(m, k) + o.add[k];
    if (!noMocap) {
      var ms = o.mocap || mspec, w = o.mocap ? (o.mocap.weight == null ? 1 : o.mocap.weight) : get(m, '_mocap.w');
      if (ms && w > .001) applyMocap(c, o, m, ms, o.mocap && o.mocap.phase != null ? o.mocap.phase : phaseOf(ms, clock, t, mstart), w);
    }
    return m;
  }
  function phaseOf(ms, clock, t, mstart) { return ms.clock === 'wall' ? t * (ms.rate || .5) : Math.max(0, clock - mstart) * (ms.rate || .5); }
  function applyMocap(c, o, m, ms, phase, w) {
    var clip = R.mocap[ms.clip], map = c.cycles.mocap_map && c.cycles.mocap_map[ms.clip] && c.cycles.mocap_map[ms.clip][o.variant]; if (!clip || !map) return;
    var x = phase - Math.floor(phase), fi, tr = {}, key;
    if (clip.loop === 'pingpong') { x = x < .5 ? x * 2 : 2 - 2 * x; fi = x * (clip.n - 1); } else fi = x * clip.n;
    var i0 = Math.floor(fi), f = fi - i0, i1 = clip.loop === 'pingpong' ? Math.min(clip.n - 1, i0 + 1) : (i0 + 1) % clip.n;
    for (key in clip.data) tr[key] = clip.data[key][i0] * (1 - f) + clip.data[key][i1] * f;
    for (key in map) { var e = map[key]; m[key] = get(m, key) + w * (e.g || 1) * (tr[e.src] || 0); }
  }
  function chainDriver(m, drivers) { var s = 0, i; for (i = 0; i < drivers.length; i++) s += drivers[i].g * get(m, drivers[i].k); return s; }

  R.eval = function (id, o) {
    var c = R.chars[id]; o = o || {};
    var clock = o.clock || 0, t = o.t == null ? clock : o.t, m = core(c, o, clock, t), st;
    /* secondary motion: damped follow-through chain, computed stateless from lagged samples of the driving motion */
    var ch = c.cycles.chains && c.cycles.chains[o.variant];
    if (ch && o.chain !== false) {
      var K = ch.segments.length + 3, D = [], j, i, lag = ch.lag;
      var d0 = chainDriver(m, ch.drivers); D[0] = d0;
      for (j = 1; j <= K; j++) D[j] = chainDriver(core(c, o, clock - lag * j, t - lag * j), ch.drivers);
      var prevLp = d0;
      for (i = 0; i < ch.segments.length; i++) {
        var lp = 0, ws = 0, mid = i + 1;
        for (j = 0; j <= K; j++) { var w = Math.exp(-Math.pow((j - mid) / (ch.width || 1.1), 2)); lp += w * D[j]; ws += w; }
        lp /= ws;
        var rel = (ch.gain[i] || 1) * (lp - prevLp) + (ch.wind ? ch.wind.a * (1 + i * .5) * Math.sin(TAU * ch.wind.hz * t - i * .9) : 0);
        var key = ch.segments[i] + '.rotation'; m[key] = get(m, key) + rel; prevLp = lp;
      }
    }
    st = makeState(c, m, o); return st;
  };

  /* ---------- state: world matrices on demand ---------- */
  function makeState(c, m, o) {
    var S = c.scale, cache = {};
    var st = {
      id: o && o.id, ch: m, c: c,
      get: function (part, ch) { return get(m, part + '.' + ch); },
      u: function (part, ch) { return get(m, part + '.' + ch) / S; },                 // px channel -> figure units
      M: function (part) {
        var q = cache[part]; if (q) return q;
        var p = c.byId[part], pv = p.pv, k = part + '.', rot = get(m, k + 'rotation') * D2R, sx = get(m, k + 'scaleX'), sy = get(m, k + 'scaleY');
        var tx = (pv[0] + get(m, k + 'x')) / S, ty = (pv[1] + get(m, k + 'y')) / S, px = pv[0] / S, py = pv[1] / S, cs = Math.cos(rot), sn = Math.sin(rot);
        /* local = T(pv+off) R S T(-pv) */
        var a = cs * sx, b = sn * sx, cc = -sn * sy, d = cs * sy, e = tx - (a * px + cc * py), f = ty - (b * px + d * py);
        if (p.parent && c.byId[p.parent]) { var P = st.M(p.parent); q = [P[0] * a + P[2] * b, P[1] * a + P[3] * b, P[0] * cc + P[2] * d, P[1] * cc + P[3] * d, P[0] * e + P[2] * f + P[4], P[1] * e + P[3] * f + P[5]]; }
        else q = [a, b, cc, d, e, f];
        cache[part] = q; return q;
      },
      pt: function (part, p) { var M = st.M(part); return [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]]; },
      pts: function (part, arr) { return arr.map(function (p) { return st.pt(part, p); }); },
      angle: function (part) { var M = st.M(part); return Math.atan2(M[1], M[0]); },        // radians, cumulative
      pivot: function (part) { var pv = c.byId[part].pv; return st.pt(part, [pv[0] / S, pv[1] / S]); }
    };
    return st;
  }
  /* neutral (rest) state for a character: all channels default */
  R.rest = function (id) { return makeState(R.chars[id], {}, { id: id }); };

  /* draw every part (layer order, optionally restricted to a variant prefix) with cb(partId, state, part) */
  R.draw = function (st, prefix, cb) { st.c.order.forEach(function (p) { if (!prefix || p.id.indexOf(prefix) === 0) cb(p.id, st, p); }); };

  /* ---------- convenience for the art files ---------- */
  /* resolve s.rig / s.action / s.mocap of an art call into a state (or null = legacy default pose) */
  R.resolve = function (id, variant, s) {
    if (s.rig && s.rig.ch) return s.rig;
    if (s.action || s.mocap) {
      var o = {}, k, a = s.action || {}; for (k in a) o[k] = a[k];
      o.variant = variant; o.id = id; if (s.mocap) o.mocap = s.mocap; if (a.t == null && s.t != null) o.t = s.t;
      return R.eval(id, o);
    }
    return null;
  };
})();
