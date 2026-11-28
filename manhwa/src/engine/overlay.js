/* overlay.js — DOM layer: captions, SFX, seal cursor / hold button, progress, corner mark, loader */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, E = MK.ease;
  var O = MK.overlay = { items: {}, dyn: [], used: {}, root: null, frame: null };
  var el = function (tag, cls, parent, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (parent) parent.appendChild(e); return e; };

  O.init = function () {
    O.frame = document.getElementById('frame'); O.hud = document.getElementById('hud');
    O.loader = document.getElementById('loader');
    var mark = el('div', 'mark', O.hud); el('span', null, mark, '목판'); el('span', null, mark, '1화'); O.mark = mark;
    O.prog = el('div', 'prog', O.hud); O.progLine = el('i', 'line', O.prog); O.ticks = [];
    O.seal = el('div', 'seal', O.hud); O.sealFill = el('b', 'fill', O.seal); O.sealTxt = el('span', null, O.seal);
    O.dot = el('i', 'cdot', O.hud); O.ring = el('i', 'cring', O.hud);
    O.cx = -100; O.cy = -100; O.cInit = false;
    O.seal.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    O.fine = !!(window.matchMedia && matchMedia('(pointer:fine)').matches);
    document.body.classList.toggle('fine', O.fine);
    O.resize();
  };
  O.resize = function () {
    var v = MK.view; if (!O.frame) return;
    O.frame.style.transform = 'translate(' + v.ox + 'px,' + v.oy + 'px) scale(' + v.s + ')';
  };
  O.loaderProgress = function (f) { var b = O.loader && O.loader.querySelector('i'); if (b) b.style.width = Math.round(clamp(f, 0, 1) * 100) + '%'; };
  O.loaderDone = function () { if (O.loader) O.loader.classList.add('done'); };

  O.setSegments = function (segs, total) {
    O.ticks.forEach(function (t) { t.remove(); }); O.ticks = [];
    segs.forEach(function (g) {
      if (g.kind !== 'scene') return;
      var t = el('b', 'tick', O.prog); t.style.top = (g.start / Math.max(total, .001) * 100) + '%'; t._id = g.id; O.ticks.push(t);
    });
  };

  /* ---- registration of declarative items ---- */
  O.registerAll = function (scenes) {
    scenes.forEach(function (d) {
      var list = (d.overlay || []).map(function (it, i) { return mkItem(d, it, i); }).filter(Boolean);
      O.items[d.id] = list;
    });
  };
  function mkItem(d, it, i) {
    try {
      if (it.type === 'caption') return mkCaption(d, it, i);
      if (it.type === 'sfx') { var x = mkSfx(it, 'sfx-' + d.id + '-' + i, false); x.at = it.at; return x; }
    } catch (e) { MK.err(e, 'overlay ' + d.id); }
    return null;
  }
  function mkCaption(d, it, i) {
    var box = el('div', 'cap', O.frame); box.style.display = 'none';
    var inner = el('div', 'capin', box); el('i', 'capseal', box);
    var chars = [], words = String(it.text).toUpperCase().split(' ');
    words.forEach(function (w, wi) {
      var ws = el('span', 'w', inner);
      Array.from(w).forEach(function (ch) { chars.push(el('span', 'c', ws, ch)); });
      if (wi < words.length - 1) inner.appendChild(document.createTextNode(' '));
    });
    inner.style.width = it.w + 'px';
    var rot = it.rot != null ? it.rot : (MK.hash(i * 7.3 + it.x) - .5) * 3;
    return { type: 'caption', def: it, at: it.at, box: box, inner: inner, chars: chars, rot: rot, st: { vis: false, enterT: 0, exitT: -9, n: -1 } };
  }
  function mkSfx(it, key, imperative) {
    var wrap = el('div', 'sfx', O.frame); wrap.style.display = 'none';
    var fam = it.font === 'brush' ? 'brush' : 'impact';
    var col = it.color || 'paper', size = it.size || 150;
    var copies = [];
    function mkMain(cls) {
      var m = el('div', 'sfxm ' + fam + ' c-' + col + ' ' + (cls || ''), wrap); m.style.fontSize = size + 'px';
      var spans = Array.from(String(it.text)).map(function (ch) { var sp = el('span', null, m, ch); sp.setAttribute('data-c', ch); return sp; });
      return { m: m, spans: spans };
    }
    var n = (it.fx === 'echo') ? 3 : 0, k;
    for (k = 0; k < n; k++) { var cp = mkMain('echo'); cp.m.style.position = 'absolute'; cp.m.style.left = '0'; cp.m.style.top = '0'; copies.push(cp); }
    var main = mkMain(); main.m.style.position = 'relative';
    var gloss = null; if (it.gloss) { gloss = el('div', 'gloss', wrap, String(it.gloss).toUpperCase()); gloss.style.fontSize = Math.max(16, size * .15) + 'px'; }
    return { type: 'sfx', def: it, key: key, wrap: wrap, main: main, copies: copies, gloss: gloss, st: { vis: false, enterT: 0, exitT: -9, life: it.life }, imperative: imperative };
  }

  /* imperative SFX. key deduped per scene until that scene deactivates (see O.update) */
  O.sfx = function (sceneId, text, opts, t) {
    opts = opts || {}; var key = sceneId + ':' + (opts.key || text);
    if (O.used[key]) return;
    O.used[key] = sceneId;
    var o = {}; for (var k in opts) o[k] = opts[k]; o.text = text;
    var it = mkSfx(o, key, true); it.st.vis = true; it.st.enterT = t == null ? O.now || 0 : t; it.st.life = opts.life || 1.4;
    O.dyn.push(it);
  };

  function pose(it, t) {   /* returns {s, dx, dy, a, spans} for sfx effects */
    var d = it.def, tau = Math.max(0, t - it.st.enterT), fx = d.fx || 'pop', s = 1, dx = 0, dy = 0;
    if (fx === 'pop' || fx === 'echo') {
      s = tau < .2 ? MK.lerp(.6, 1.12, E.outCubic(tau / .2)) : tau < .35 ? MK.lerp(1.12, 1, E.smoothstep((tau - .2) / .15)) : 1;
    } else if (fx === 'shake') {
      var dec = Math.exp(-tau / .55), k = Math.floor(t * 24);
      dx = (MK.hash(k * 1.7) - .5) * 2 * 14 * dec; dy = (MK.hash(k * 3.1 + 9) - .5) * 2 * 14 * dec;
      s = tau < .2 ? MK.lerp(.6, 1.1, E.outCubic(tau / .2)) : 1.1 - .1 * E.smoothstep((tau - .2) / .2);
    } else if (fx === 'wobble') s = tau < .25 ? MK.lerp(.7, 1, E.outBack(tau / .25)) : 1;
    return { s: s, dx: dx, dy: dy, tau: tau };
  }
  function renderSfx(it, t, a) {
    var d = it.def, ps = pose(it, t), w = it.wrap;
    w.style.display = 'block'; w.style.opacity = a;
    w.style.transform = 'translate(' + (d.x + ps.dx) + 'px,' + (d.y + ps.dy) + 'px) translate(-50%,-50%) rotate(' + (d.rot || 0) + 'deg) scale(' + ps.s + ')';
    if (d.fx === 'wobble') it.main.spans.forEach(function (sp, i) { sp.style.transform = 'translateY(' + (Math.sin(ps.tau * 9 + i * 1.1) * (d.size || 150) * .06) + 'px)'; });
    it.copies.forEach(function (cp, i) {
      var ph = ((ps.tau * 1.1 + i / 3) % 1), sc = 1 + .6 * ph;
      cp.m.style.transform = 'scale(' + sc + ')'; cp.m.style.opacity = (1 - ph) * .55 * (ps.tau > i * .15 ? 1 : 0);
    });
  }

  function renderCap(it, t, mult) {
    var st = it.st, d = it.def, box = it.box;
    var tau = Math.max(0, t - st.enterT), e = E.outCubic(clamp(tau / .35, 0, 1));
    var ex = st.vis ? 0 : clamp((t - st.exitT) / .4, 0, 1);
    if (!st.vis && ex >= 1) { box.style.display = 'none'; return; }
    var wcur = d.w * e, ty = -30 * E.outCubic(ex), left = d.side === 'r' ? d.x - wcur : d.x;
    box.style.display = 'block'; box.style.width = wcur + 'px'; box.style.opacity = (1 - ex) * (mult == null ? 1 : mult);
    box.style.transform = 'translate(' + left + 'px,' + (d.y + ty) + 'px) rotate(' + it.rot + 'deg)';
    it.inner.style.left = d.side === 'r' ? (wcur - d.w) + 'px' : '0';
    var n = st.vis ? Math.floor(Math.max(0, tau - .3) / .018) + 1 : 1e9;
    if (n !== st.n) { st.n = n; for (var i = 0; i < it.chars.length; i++) it.chars[i].style.visibility = i < n ? 'visible' : 'hidden'; }
  }
  function setVis(it, vis, t) {
    var st = it.st;
    if (vis && !st.vis) { st.vis = true; st.enterT = t; st.n = -1; }
    else if (!vis && st.vis) { st.vis = false; st.exitT = t; }
  }

  /* upd = {active:[{id,p}], t, dt, ui, input, flash} */
  O.update = function (u) {
    var t = u.t; O.now = t; var act = {}, role = {}, i, k;
    u.active.forEach(function (a) { act[a.id] = a.p; if (a.role) role[a.id] = a; });
    for (var id in O.items) {
      var list = O.items[id], p = act[id], r = role[id], mult = 1, gate = true;
      /* transitions: outgoing overlays fade over q 0...35; incoming stay hidden until q>.65 (at[0]==0 items fade in .65..1) */
      if (r && r.role === 'out') mult = 1 - clamp(r.q / .35, 0, 1);
      else if (r && r.role === 'in') { gate = r.q > .65; mult = clamp((r.q - .65) / .35, 0, 1); }
      for (i = 0; i < list.length; i++) {
        var it = list[i], vis = p != null && gate && p >= it.at[0] && p <= it.at[1];
        setVis(it, vis, t);
        if (it.type === 'caption') renderCap(it, t, mult);
        else {
          var st = it.st, a = (st.vis ? 1 : 1 - clamp((t - st.exitT) / .25, 0, 1)) * mult;
          if (a <= 0) it.wrap.style.display = 'none'; else renderSfx(it, t, a);
        }
      }
    }
    /* imperative sfx; drop used keys of scenes that are no longer active */
    for (k in O.used) if (act[O.used[k]] == null && !isDynAlive(k)) delete O.used[k];
    for (i = O.dyn.length - 1; i >= 0; i--) {
      var s = O.dyn[i], age = t - s.st.enterT;
      if (age < 0) { s.wrap.style.display = 'none'; continue; }   /* scrubbed back in capture */
      if (age > s.st.life) { s.wrap.remove(); O.dyn.splice(i, 1); continue; }
      renderSfx(s, t, 1 - E.smoothstep(clamp((age - (s.st.life - .3)) / .3, 0, 1)));
    }
    updateHud(u);
  };
  function isDynAlive(key) { for (var i = 0; i < O.dyn.length; i++) if (O.dyn[i].key === key) return true; return false; }

  function updateHud(u) {
    var ui = u.ui, hold = ui.hold, input = MK.input, t = u.t, dt = u.dt || .016;
    /* progress ticks */
    var cur = u.active.length ? u.active[0].id : null;
    O.ticks.forEach(function (tk) { tk.classList.toggle('on', tk._id === cur); });
    O.mark.classList.toggle('blink', !!(u.flash && u.flash.a > .35 && Math.floor(t * 12) % 2));
    /* seal / cursor */
    var touch = !O.fine || !input.pointerActive;
    var showSeal = !!hold;
    O.seal.classList.toggle('on', showSeal);
    O.seal.classList.toggle('btn', showSeal && touch);
    O.seal.classList.toggle('held', !!(input && input.holding));
    if (hold) { O.sealTxt.textContent = String(hold.label || '꾹 · БАСЫП ТҰР').replace(' · ', '\n'); O.sealFill.style.height = Math.round(clamp(hold.progress, 0, 1) * 100) + '%'; }
    var showDot = O.fine && input.pointerActive && !(showSeal && !touch);
    O.dot.style.display = O.ring.style.display = showDot ? 'block' : 'none';
    if (input.pointerActive) {
      var c = MK.view.toCss(input.pointer.x, input.pointer.y);
      if (!O.cInit || u.snap) { O.cx = c[0]; O.cy = c[1]; O.cInit = true; }
      else { var k = 1 - Math.exp(-16 * dt); O.cx += (c[0] - O.cx) * k; O.cy += (c[1] - O.cy) * k; }
      O.dot.style.transform = 'translate(' + c[0] + 'px,' + c[1] + 'px) translate(-50%,-50%)';
      O.ring.style.transform = 'translate(' + O.cx + 'px,' + O.cy + 'px) translate(-50%,-50%)';
      if (showSeal && !touch) O.seal.style.transform = 'translate(' + (O.cx - 46) + 'px,' + (O.cy - 46) + 'px) rotate(-4deg)' + (input.holding ? ' scale(.95)' : '');
    }
    if (showSeal && touch) O.seal.style.transform = '';
  }
})();
