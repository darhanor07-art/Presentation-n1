/* assets.js — pre-rendered 3D layers (assets/gen/): manifest + decoded FILL/TONE bitmaps.
   Built page: window.__MK_ASSETS = {manifest, files:{relpath: base64}} embedded by build/build_html.py.
   Dev page: fetch('../assets/gen/...'). Decoded before #loader.done (main.js awaits MK.assets.load()).
   MK.assets.get(name) -> {fill, tone, w, h} | null   (name = image name 'ridges_s02/003' or a 1-frame sequence 'bell')
   MK.assets.seq(name) -> {frames:[...], w, h, horizon?}   MK.assets.ok */
(function () {
  'use strict';
  var MK = window.MK, A = MK.assets = { man: null, bm: {}, ok: false, base: '../assets/gen/' };
  var OPT = { premultiplyAlpha: 'none', colorSpaceConversion: 'none' };

  function decode(blob) {
    if (window.createImageBitmap) return createImageBitmap(blob, OPT).catch(function () { return createImageBitmap(blob); });
    return new Promise(function (res, rej) { var im = new Image(), u = URL.createObjectURL(blob); im.onload = function () { res(im); }; im.onerror = rej; im.src = u; });
  }
  function b64blob(s) { var bin = atob(s), n = bin.length, u = new Uint8Array(n), i; for (i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: 'image/png' }); }

  A.load = function (progress) {
    var emb = window.__MK_ASSETS, files = [], man;
    return Promise.resolve().then(function () {
      if (emb) { man = emb.manifest; return null; }
      return fetch(A.base + 'manifest.json').then(function (r) { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); }).then(function (m) { man = m; });
    }).then(function () {
      A.man = man; var k, im;
      for (k in man.images) { im = man.images[k]; files.push(im.fill, im.tone); }
      var done = 0, i = 0;
      function one(f) {
        var p = emb ? Promise.resolve(b64blob(emb.files[f])) : fetch(A.base + f).then(function (r) { return r.blob(); });
        return p.then(decode).then(function (bm) { A.bm[f] = bm; }).catch(function (e) { MK.err && MK.err(e, 'asset ' + f); }).then(function () { done++; if (progress) progress(done / files.length); });
      }
      function worker() { if (i >= files.length) return Promise.resolve(); return one(files[i++]).then(worker); }   // 6 parallel decoders
      return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
    }).then(function () { A.ok = true; }).catch(function (e) { A.ok = false; if (MK.err) MK.err(e, 'assets'); else console.warn('assets unavailable', e); });
  };
  A.get = function (name) {
    var m = A.man; if (!m) return null;
    var im = m.images[name]; if (!im && m.sequences[name]) im = m.images[m.sequences[name].frames[0]];
    if (!im) return null;
    var f = A.bm[im.fill], t = A.bm[im.tone]; return f && t ? { fill: f, tone: t, w: im.w, h: im.h } : null;
  };
  A.seq = function (name) { return A.man && A.man.sequences[name] || null; };
})();
