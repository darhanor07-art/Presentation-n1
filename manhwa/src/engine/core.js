/* core.js — namespace MK, palette, math/easing, seeded RNG, JS noise, view mapping */
(function () {
  'use strict';
  var MK = window.MK = window.MK || {};
  MK.W = 1000; MK.H = 1400;
  MK.PAL = {
    red: [207, 42, 27], ink: [21, 17, 15], paper: [238, 230, 214], blue: [36, 86, 211], gold: [229, 168, 35]
  };
  MK.HEX = { red: '#CF2A1B', ink: '#15110F', paper: '#EEE6D6', blue: '#2456D3', gold: '#E5A823' };
  (function () {
    var s = document.documentElement.style;
    for (var k in MK.HEX) s.setProperty('--' + k, MK.HEX[k]);
  })();
  MK.rgb = function (c, a) {
    if (typeof c === 'string') c = MK.PAL[c] || [0, 0, 0];
    return a == null ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };
  var clamp = MK.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  MK.lerp = function (a, b, t) { return a + (b - a) * t; };
  MK.mix = MK.lerp;
  MK.range = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var E = MK.ease = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return 1 - (1 - t) * (1 - t); },
    inOutQuad: function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    inCubic: function (t) { return t * t * t; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutCubic: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    outBack: function (t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outExpo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    smoothstep: function (t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  };
  /* seg(p,a,b,easeFn): eased 0..1 progress of p inside [a,b] */
  E.seg = function (p, a, b, fn) { var t = clamp((p - a) / (b - a), 0, 1); return (fn || E.linear)(t); };
  E.range = MK.range;
  MK.seg = E.seg;

  /* seeded RNG (mulberry32) */
  MK.rng = function (seed) {
    var a = (seed | 0) + 0x6D2B79F5 | 0;
    function f() { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    f.range = function (lo, hi) { return lo + (hi - lo) * f(); };
    f.sign = function () { return f() < .5 ? -1 : 1; };
    return f;
  };
  /* hash -> 0..1 (stateless) */
  MK.hash = function (n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  /* JS value noise 1D / 2D, -1..1 */
  function h2(x, y) { var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123; return s - Math.floor(s); }
  MK.noise1 = function (x) {
    var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return (h2(i, 0.5) * (1 - u) + h2(i + 1, 0.5) * u) * 2 - 1;
  };
  MK.noise2 = function (x, y) {
    var i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1);
    return ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) * 2 - 1;
  };
  MK.fbm1 = function (x, o) { var s = 0, a = .5; o = o || 4; for (var i = 0; i < o; i++) { s += a * MK.noise1(x); x *= 2.03; a *= .5; } return s; };

  /* view: world (1000x1400) <-> css px */
  MK.view = {
    w: 1, h: 1, s: 1, ox: 0, oy: 0, dpr: 1, q: 1,
    bounds: { x0: 0, y0: 0, x1: 1000, y1: 1400 },
    set: function (cssW, cssH) {
      var v = this; v.w = cssW; v.h = cssH;
      v.s = Math.min(cssW / MK.W, cssH / MK.H);
      v.ox = (cssW - MK.W * v.s) / 2; v.oy = (cssH - MK.H * v.s) / 2;
      v.bounds = { x0: -v.ox / v.s, y0: -v.oy / v.s, x1: (cssW - v.ox) / v.s, y1: (cssH - v.oy) / v.s };
      v.bounds.w = v.bounds.x1 - v.bounds.x0; v.bounds.h = v.bounds.y1 - v.bounds.y0;
    },
    toCss: function (x, y) { return [this.ox + x * this.s, this.oy + y * this.s]; },
    toWorld: function (px, py) { return [(px - this.ox) / this.s, (py - this.oy) / this.s]; }
  };
  MK.view.set(1000, 1400);
  MK.err = function (e, where) {
    var m = (where ? where + ': ' : '') + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e));
    try { console.error(m); if (document.body && !document.body.dataset.err) document.body.dataset.err = m; } catch (_) { }
  };
  window.addEventListener('error', function (e) { MK.err(e.message + (e.filename ? ' @' + e.filename.split('/').pop() + ':' + e.lineno : '')); });
  window.addEventListener('unhandledrejection', function (e) { MK.err(e.reason || 'unhandledrejection'); });
  /* event helper: returns seconds since p crossed p0 (or -1). Robust to jumps / scrubbing. */
  MK.event = function (state, key, p, p0, t, secPerP) {
    var k = '_ev_' + key;
    if (p >= p0) { if (state[k] == null) { state[k] = t - (p - p0) * (secPerP || 2.5); state[k + 'N'] = (state[k + 'N'] || 0) + 1; } return t - state[k]; }
    if (p < p0 - 0.004) state[k] = null;
    return -1;
  };
  MK.eventId = function (state, key) { return state['_ev_' + key + 'N'] || 0; };
})();
