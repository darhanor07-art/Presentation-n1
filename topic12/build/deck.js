/* =====================================================================
   x ≠ 0 · DECK — навигация, мәтін анимациялары (anime.js),
   слайдтан слайдқа көшетін детальдар, спикер жазбалары, өңдеу режимі.
   ===================================================================== */
const {animate, createTimeline, stagger, splitText, svg: aSvg, utils, spring, createTimer} = anime;
const QS = new URLSearchParams(location.search);
const STATIC = QS.get('static') === '1';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const N = META.length;

/* === СЛАЙДТАН СЛАЙДҚА КӨШЕТІН ДЕТАЛЬДАР: жоспар ===
   'a'            — осы слайдтағы [data-anchor=кілт] элементінің орнына қонады
   {w3:'card'}    — 3D-сыныптағы «12» карточкасының экрандағы орнына жақын (dx, dy)
   {onNl:12}      — сан түзуіндегі 12-нің үстіне
   {x,y,w}        — сахнадағы абсолют орын (центр), w — ені                                   */
const BASE = {x: [200, 200], eq: [200, 200], c: [140, 140], t: [140, 140], s: [140, 140], nl: [1400, 170], card: [150, 200]};
const SH = {1: 'a', 9: 'a', 15: 'a', 16: 'a', 28: 'a', 30: 'a'};
const PLAN = {
  x:    {1: 'a', 7: 'a', 8: {rel: 'card', dx: 150, dy: -96, h: 150, r: -10}, 12: {x: 470, y: 330, w: 150, r: -10}, 26: 'a', 28: 'a', 29: 'a', 30: 'a'},
  eq:   {1: {a: 1, v: 'neq'}, 3: 'a', 7: 'a', 15: 'a', 28: 'a', 29: {a: 1, v: 'neq'}, 30: {a: 1, v: 'neq'}},
  c: SH, t: SH, s: SH,
  card: {4: {w3: 'card', h: 170, dx: -210, dy: -30, r: -7, lead: 1}, 7: {w3: 'card', h: 150, dx: -190, dy: -40, r: 7, lead: 1},
         8: {w3: 'card', h: 150, dx: -230, dy: -130, r: -8, lead: 1}, 17: {onNl: 12, h: 150, r: 4}, 24: {onNl: 12, h: 120, r: -4}, 25: 'a',
         29: {w3: 'card', h: 190, dx: 0, dy: 0, r: 0}},
  nl:   {17: {x: 960, y: 932, w: 1500}, 19: 'a', 24: {x: 560, y: 960, w: 960}, 25: 'a'},
};
const STATES = {}; for (const k in PLAN) STATES[k] = {};
const PEL = {x: $('#p-x'), eq: $('#p-eq'), c: $('#p-c'), t: $('#p-t'), s: $('#p-s'), nl: $('#p-nl'), card: $('#p-card')};
const LEAD = {};   // слайд → [{from:'card', to:[x,y]}]

class Deck {
  constructor() {
    this.stage = $('#deckStage'); this.slides = $$('.deck-stage > .slide'); this.cur = -1; this.from = -1; this.t0 = 0;
    this.timers = []; this.f = 1; this.frameMs = []; this.res = null;
    this.scale(); addEventListener('resize', () => this.scale());
    this.boot().catch(e => { console.error(e); document.body.dataset.err = String(e.stack || e); });
  }
  /* === СТАРТ === */
  async boot() {
    const q = QS.get('q'), res = q === 'lo' ? [1280, 720] : q === 'hi' ? [1920, 1080] : [1600, 900];
    this.res = res;
    await World.init($('#gl'), IMG, {w: res[0], h: res[1], msaa: +(QS.get('msaa') ?? 4), shadow: +(QS.get('shq') || 2048), pcf: QS.get('pcf'), tr: META.map(m => m.tr), preserve: STATIC});
    await document.fonts.ready;
    Edit.restore();
    this.layout();
    if (STATIC) { document.body.classList.add('static'); window.deckAPI = this.api(); return; }
    this.bind();
    const h = parseInt(location.hash.slice(1)) || 1;
    this.go(Math.min(Math.max(h - 1, 0), N - 1), true);
    const loop = now => { this.render(now); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  scale() { const f = this.f = Math.min(innerWidth / 1920, innerHeight / 1080);
    this.stage.style.transform = `translate(${(innerWidth - 1920 * f) / 2}px,${(innerHeight - 1080 * f) / 2}px) scale(${f})`; }
  /* === 3D КАДР === */
  render(now) {
    const tau = (now - this.t0) / 1000;
    const a = performance.now(); World.frame(this.cur, tau, this.from); const dt = performance.now() - a;
    // әлсіз құрылғыда сапа өздігінен төмендейді
    this.frameMs.push(dt); if (this.frameMs.length > 90) this.frameMs.shift();
    if (!QS.get('q') && this.frameMs.length === 90 && tau > 3) { const avg = this.frameMs.reduce((s, x) => s + x, 0) / 90;
      if (avg > 38 && this.res[0] > 960) { this.res = this.res[0] > 1280 ? [1280, 720] : [960, 540]; World.resize(...this.res); this.frameMs = []; } }
  }
  /* === ДЕТАЛЬДАР: орындарын есептеу === */
  anchorRect(slide, key) {
    const el = $(`[data-anchor="${key}"]`, slide); if (!el) return null;
    const r = el.getBoundingClientRect(), st = this.stage.getBoundingClientRect(), f = this.f;
    return {cx: (r.left - st.left + r.width / 2) / f, cy: (r.top - st.top + r.height / 2) / f, w: r.width / f, h: r.height / f, el};
  }
  layout() {
    // 3D проекциялар (карточка, дәптер бұрышы)
    const P3 = {};
    for (const i of [4, 7, 8, 12, 29]) P3[i] = World.probe(i - 1);
    for (const k in PLAN) for (const [sid, spec0] of Object.entries(PLAN[k])) {
      const id = +sid, slide = this.slides[id - 1], spec = spec0 === 'a' ? {a: 1} : spec0;
      const [bw, bh] = BASE[k]; let st = null;
      if (spec.a) { const r = this.anchorRect(slide, k); if (!r) continue;
        const fs = parseFloat(getComputedStyle(r.el).fontSize);
        let sc = r.el.classList.contains('gx') ? fs / (k === 'x' ? 185 : 210) : k === 'nl' ? r.w / bw : k === 'card' ? r.h / bh : r.w / bw * 1.12;
        st = {cx: r.cx, cy: r.cy - (k === 'x' && r.el.classList.contains('gx') ? fs * .05 : 0), s: sc, r: 0}; }
      else if (spec.w3) { const p = P3[id][spec.w3]; st = {cx: p[0] + (spec.dx || 0), cy: p[1] + (spec.dy || 0), s: spec.h / bh, r: spec.r || 0};
        if (spec.lead) (LEAD[id] = LEAD[id] || []).push({k, to: p}); }
      else if (spec.x !== undefined) st = {cx: spec.x, cy: spec.y, s: spec.w / bw, r: 0};
      if (st) { st.v = spec.v || ''; STATES[k][id] = st; }
    }
    for (const [sid, spec] of Object.entries(PLAN.card)) { const id = +sid;
      if (spec.onNl) { const nl = STATES.nl[id]; STATES.card[id] = {cx: nl.cx + (60 + spec.onNl * 64 - 700) * nl.s, cy: nl.cy - 70 * nl.s - spec.h / 2 + 18, s: spec.h / 200, r: spec.r || 0, v: ''}; }
      if (spec.rel) {}
    }
    for (const [sid, spec] of Object.entries(PLAN.x)) { const id = +sid;
      if (spec.rel) { const c = STATES.card[id]; STATES.x[id] = {cx: c.cx + spec.dx, cy: c.cy + spec.dy, s: spec.h / 200, r: spec.r || 0, v: ''}; } }
    for (const k in PEL) utils.set(PEL[k], {x: 860, y: 440, opacity: 0, scale: .5});
  }
  /* === ДЕТАЛЬДАР: қозғалыс === */
  moveProps(id, D, instant = false) {
    const lead = LEAD[id] || [];
    for (const k in PEL) {
      const el = PEL[k], st = STATES[k][id], [bw, bh] = BASE[k];
      if (st) {
        const to = {x: st.cx - bw / 2, y: st.cy - bh / 2, scale: st.s, rotate: st.r, opacity: 1};
        if (instant) utils.set(el, to);
        else { const was = +utils.get(el, 'opacity') > .05;
          if (!was) utils.set(el, {x: to.x, y: to.y + 60, scale: st.s * .6, rotate: st.r - 12});
          animate(el, {...to, duration: 1500, delay: D * 1000 * (was ? .25 : .55), ease: was ? 'inOutQuart' : spring({bounce: .35, duration: 1100})}); }
        if (k === 'eq') { const sl = $('.slash', el), on = st.v === 'neq';
          if (instant) utils.set(sl, {opacity: on ? 1 : 0, scale: on ? 1 : .2});
          else animate(sl, {opacity: on ? 1 : 0, scale: on ? 1 : .2, duration: 700, delay: D * 1000 * .7 + 500, ease: 'outBack(2)'}); }
        if (k === 'nl') { const hops = $$('.hop', el), m = $('.m12', el), anim = id === 17;
          if (instant || !anim) { utils.set(hops, {opacity: 1}); utils.set(m, {opacity: 1}); }
          else { utils.set(hops, {opacity: 0}); utils.set(m, {opacity: 0});
            const dr = aSvg.createDrawable(hops); animate(hops, {opacity: 1, duration: 10, delay: D * 1000}); animate(dr, {draw: ['0 0', '0 1'], duration: 420, delay: stagger(380, {start: D * 1000 + 700}), ease: 'inOutSine'});
            animate(m, {opacity: [0, 1], scale: [1.6, 1], duration: 600, delay: D * 1000 + 2700, ease: 'outBack(2)'}); } }
      } else if (instant) utils.set(el, {opacity: 0});
      else animate(el, {opacity: 0, scale: '*=0.85', duration: 450, ease: 'inQuad'});
    }
    // нұсқағыш сызықтар (детальдан 3D-нысанға)
    const L = $('#leaders'); L.innerHTML = '';
    for (const ld of lead) { const st = STATES[ld.k][id]; const [x1, y1] = [st.cx, st.cy], [x2, y2] = ld.to;
      const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 40;
      L.insertAdjacentHTML('beforeend', `<path d="M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}"/><circle cx="${x2}" cy="${y2}" r="26"/>`); }
    if (lead.length) { const ps = $$('path', L), cs = $$('circle', L);
      if (instant) { utils.set(cs, {opacity: 1}); }
      else { utils.set([...ps, ...cs], {opacity: 0}); animate(ps, {opacity: .85, duration: 10, delay: D * 1000 + 900});
        animate(aSvg.createDrawable(ps), {draw: ['0 0', '0 1'], duration: 700, delay: D * 1000 + 900, ease: 'inOutQuad'});
        animate(cs, {opacity: [0, 1], scale: [2.2, 1], duration: 700, delay: D * 1000 + 1500, ease: 'outBack(2)'}); } }
  }
  /* === НАВИГАЦИЯ === */
  go(i, first = false) {
    if (i < 0 || i >= N || i === this.cur) return;
    const P = this.slides[this.cur], Nn = this.slides[i];
    this.from = first ? (i === 0 ? -1 : -2) : this.cur;
    const D = World.dur(i, this.from);
    this.t0 = performance.now(); World.invalidate();
    if (P) this.leave(P);
    this.stopTimers();
    const fwd = i === this.from + 1, kind = META[i].tr;
    const tIn = first && i === 0 ? D * .55 : D * (fwd && ['flyin', 'flyout', 'craneout', 'window', 'dive', 'vertigo'].includes(kind) ? .72 : .5);
    clearTimeout(this.tSwap);
    this.tSwap = setTimeout(() => { $$('.slide.active').forEach(s => s.classList.remove('active')); Nn.classList.add('active'); this.enter(Nn, i); }, REDUCED ? 0 : tIn * 1000);
    this.moveProps(i + 1, D);
    this.cur = i; this.hud(i);
    if (i === N - 1) this.credits(D);
  }
  leave(P) {
    const els = $$('.layer > *', P);
    animate(els, {opacity: 0, y: -18, duration: 380, ease: 'inQuad', onComplete: () => els.forEach(e => { e.style.opacity = ''; e.style.transform = ''; })});
  }
  stopTimers() { this.timers.forEach(t => t.pause && t.pause()); this.timers = []; }
  hud(i) {
    const m = META[i], hd = $('#hud');
    hd.classList.toggle('off', i === 0 || i === N - 1);
    $$('#hud .segs i').forEach((s, k) => { s.classList.toggle('on', k + 1 === m.act); s.classList.toggle('past', k + 1 < m.act); });
    const a = $('#hud .act'), q = $('#hud .q');
    if (a.textContent !== ACTS[m.act]) { a.textContent = ACTS[m.act]; q.textContent = ACT_Q[m.act];
      if (!REDUCED) { animate(a, {opacity: [0, 1], x: [-14, 0], duration: 700, ease: 'outExpo'}); animate(q, {opacity: [0, 1], x: [-14, 0], duration: 700, delay: 120, ease: 'outExpo'}); } }
    $('#notes').innerHTML = NOTES[i] || '';
    history.replaceState(null, '', '#' + (i + 1));
  }
  /* === МӘТІН АНИМАЦИЯЛАРЫ: әр слайдта әртүрлі комбинация === */
  enter(S, i) {
    if (REDUCED) return;
    const id = i + 1, L = $('.layer', S), side = (S.className.match(/side-(\w)/) || [])[1];
    const tl = createTimeline({defaults: {ease: 'outExpo', duration: 900}});
    const panel = $('[data-a="panel"]', L);
    const fromV = {L: {x: [-70, 0]}, R: {x: [70, 0]}, T: {y: [-50, 0]}, B: {y: [50, 0]}, C: {scale: [.94, 1]}}[side] || {y: [40, 0]};
    if (panel && !panel.classList.contains('bare')) tl.add(panel, {opacity: [0, 1], ...fromV, duration: 1000}, 0);
    $$('.scrim', L).forEach(s => tl.add(s, {opacity: [0, 1], duration: 900, ease: 'outQuad'}, 0));
    // kicker: әріптер + бор сызығы
    $$('[data-a="kick"]', L).forEach(el => { const tx = el.firstChild; const sp = document.createElement('span'); if (tx && tx.nodeType === 3) { sp.textContent = tx.textContent; el.replaceChild(sp, tx); }
      const chars = splitText(sp, {chars: true}).chars; tl.add(chars, {opacity: [0, 1], y: [14, 0], rotate: [() => utils.random(-12, 12), 0], delay: stagger(16), duration: 600}, 180);
      const ln = $$('path', el); tl.add(aSvg.createDrawable(ln), {draw: ['0 0', '0 1'], duration: 800, ease: 'inOutQuad'}, 420); });
    // тақырып: слайдқа байланысты төрт тәсілдің бірі
    $$('[data-a="title"]', L).forEach(el => {
      const mode = [0, 'mask', 'rise', 'mask', 'rise', 'pop', 'blur', 'none', 'rise', 'mask', 'blur'][id % 11] || 'rise';
      if (el.querySelector('.gx') || mode === 'none') { tl.add(el, {opacity: [0, 1], duration: 900}, 250); return; }
      const ws = splitText(el, {words: true}).words;
      if (mode === 'mask') { utils.set(ws, {display: 'inline-block'}); tl.add(ws, {clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'], y: [30, 0], delay: stagger(70), duration: 900}, 260); }
      else if (mode === 'rise') tl.add(ws, {opacity: [0, 1], y: [46, 0], rotate: [4, 0], delay: stagger(60), duration: 900}, 260);
      else if (mode === 'pop') tl.add(ws, {opacity: [0, 1], scale: [.4, 1], delay: stagger(80), ease: spring({bounce: .45, duration: 900})}, 260);
      else tl.add(ws, {opacity: [0, 1], filter: ['blur(14px)', 'blur(0px)'], scale: [1.08, 1], delay: stagger(70, {from: 'center'}), duration: 1100}, 260);
    });
    $$('[data-a="words"]', L).forEach((el, k) => { const ws = splitText(el, {words: true}).words;
      tl.add(ws, {opacity: [0, 1], y: [12, 0], delay: stagger(id % 2 ? 14 : 22), duration: 700, ease: 'outQuad'}, 520 + k * 150); });
    $$('[data-a="fade"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], y: [18, 0], duration: 800}, 760 + k * 140));
    $$('[data-a="row"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], ...(side === 'T' ? {y: [30, 0]} : {x: [side === 'L' ? -36 : 36, 0]}), duration: 800}, 600 + k * 130));
    $$('[data-a="stagger"]', L).forEach(el => tl.add($$('li', el), {opacity: [0, 1], x: [-30, 0], delay: stagger(140), duration: 800}, 640));
    $$('[data-a="pop"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], scale: [.7, 1], ease: spring({bounce: .4, duration: 900})}, 700 + k * 380));
    $$('[data-count]', L).forEach((el, k) => { const raw = el.dataset.count, n = parseFloat(raw.replace(/\s/g, '')); if (isNaN(n)) return;
      const tail = raw.replace(/^[\d\s]+/, ''), o = {v: n > 1900 && n < 2100 ? n - 30 : 0};
      tl.add(o, {v: n, duration: 1600, ease: 'outQuart', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('ru-RU').replace(/ /g, ' ') + tail; }}, 700 + k * 160); });
    const fn = KIND[id]; if (fn) fn.call(this, L, tl, S);
  }
  /* === 30-СЛАЙД: титрлар төменнен жоғары === */
  credits(D) {
    const cr = $('#credits'), H = cr.scrollHeight, dist = H - 300;
    utils.set(cr, {y: 0});
    const follow = () => { for (const k of ['x', 'eq', 'c', 't', 's']) { const r = this.anchorRect(this.slides[N - 1], k); if (!r) continue;
      const st = STATES[k][N]; if (!st) continue; utils.set(PEL[k], {x: r.cx - BASE[k][0] / 2, y: r.cy - BASE[k][1] / 2}); } };
    this.timers.push(animate(cr, {y: -dist, duration: 26000, delay: D * 1000 * .4, ease: 'linear', onUpdate: follow}));
  }
  /* === БАСҚАРУ === */
  bind() {
    addEventListener('keydown', e => {
      if (Edit.on && e.target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); Edit.save(); return; }
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); this.go(this.cur + 1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); this.go(this.cur - 1); }
      else if (e.key === 'Home') this.go(0); else if (e.key === 'End') this.go(N - 1);
      else if (e.key === 'n' || e.key === 'N') $('#notes').classList.toggle('on');
      else if (e.key === 'f' || e.key === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      else if (e.key === 'e' || e.key === 'E') Edit.toggle();
    });
    let x0 = null, wheelT = 0;
    addEventListener('touchstart', e => x0 = e.touches[0].clientX, {passive: true});
    addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) this.go(this.cur + (dx < 0 ? 1 : -1)); x0 = null; });
    addEventListener('wheel', e => { const t = performance.now(); if (t - wheelT < 900 || Math.abs(e.deltaY) < 30) return; wheelT = t; this.go(this.cur + (e.deltaY > 0 ? 1 : -1)); }, {passive: true});
    $('.deck-viewport').addEventListener('click', e => { if (Edit.on) return; this.go(this.cur + (e.clientX > innerWidth / 3 ? 1 : -1)); });
  }
  /* === ЭКСПОРТ API (PPTX, preview) === */
  api() {
    const self = this;
    return {
      count: N, meta: META,
      show(i) { self.slides.forEach((s, k) => s.classList.toggle('active', k === i)); self.cur = i; self.hud(i); $('#hud').style.opacity = (i === 0 || i === N - 1) ? 0 : 1; self.moveProps(i + 1, 0, true);
        if (i === N - 1) { utils.set($('#credits'), {y: -(1080 - 150)}); for (const k of ['x', 'eq', 'c', 't', 's']) { const r = self.anchorRect(self.slides[N - 1], k); if (!r) continue;
        utils.set(PEL[k], {x: r.cx - BASE[k][0] / 2, y: r.cy - BASE[k][1] / 2}); if (STATES[k][N]) Object.assign(STATES[k][N], {cx: r.cx, cy: r.cy}); } } },
      props(i) { return Object.keys(PEL).map(k => ({k, st: STATES[k][i + 1] || null, base: BASE[k]})).filter(o => o.st); },
      frame(i, tau, from = i - 1) { World.frame(i, tau, from); return $('#gl').toDataURL('image/jpeg', .9); },
      size(w, h) { World.resize(w, h); },
      dur(i) { return World.dur(i, i - 1); },
    };
  }
}

/* === СЛАЙДҚА ТӘН ҚОСЫМША АНИМАЦИЯЛАР === */
const KIND = {
  1(L, tl) { tl.add($$('.authors span', L), {opacity: [0, 1], y: [20, 0], delay: stagger(150), duration: 800}, 1300); },
  3(L, tl) { const q = $('.chalkq', L); if (q) tl.add(q, {letterSpacing: ['.12em', '0em'], duration: 1600, ease: 'outQuart'}, 300); },
  5(L, tl) { const t = $('.ttl', L); tl.add(t, {scale: [{to: 1.12, duration: 160}, {to: 1, duration: 500}], ease: 'outQuad'}, 900); },
  7(L, tl) { const q = $('.q', L); this.timers.push(animate(q, {opacity: [1, .72], duration: 1400, delay: 3000, alternate: true, loop: true, ease: 'inOutSine'})); },
  13(L, tl) { tl.add($$('.stat b', L), {scale: [{to: 1.08, duration: 200}, {to: 1, duration: 600}], delay: stagger(160), ease: 'outQuad'}, 2300); },
  21(L, tl) { const fg = $('.ring .fg', L), num = $('.ring b', L), C = 2 * Math.PI * 82; utils.set(fg, {strokeDasharray: C, strokeDashoffset: 0}); num.textContent = '5';
    const o = {v: 5}; tl.add(fg, {strokeDashoffset: [0, C], duration: 5000, ease: 'linear'}, 1600);
    tl.add(o, {v: 0, duration: 5000, ease: 'linear', onUpdate: () => { num.textContent = Math.ceil(o.v); }}, 1600);
    tl.add(num, {scale: [{to: 1.25, duration: 200}, {to: 1, duration: 500}], ease: 'outQuad'}, 6600); },
  22(L, tl) { tl.add($$('.bub', L)[1] || [], {rotate: [-3, 0], duration: 900}, 1100); },
  29(L, tl) { const a = $('.ans', L); tl.add(a, {letterSpacing: ['.08em', '0em'], duration: 1400, ease: 'outQuart'}, 800);
    tl.add($('.q', L), {opacity: [0, .9], duration: 800}, 200); },
};

/* === ӨҢДЕУ РЕЖИМІ (E · Ctrl+S) === */
const Edit = {
  on: false, KEY: 'x12-edits',
  toggle() { this.on = !this.on; document.body.classList.toggle('editing', this.on); $('#editToggle').classList.toggle('active', this.on);
    $$('[data-edit]').forEach(e => e.contentEditable = this.on ? 'true' : 'false'); if (!this.on) this.persist(); toast(this.on ? 'Өңдеу режимі: мәтінді басып түзетіңіз · Ctrl+S — сақтау' : 'Өзгерістер сақталды'); },
  persist() { const d = {}; $$('[data-edit]').forEach((e, k) => { if (e.dataset.orig !== undefined && e.innerHTML !== e.dataset.orig) d[k] = e.innerHTML; });
    try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) {} },
  restore() { const els = $$('[data-edit]'); els.forEach(e => e.dataset.orig = e.innerHTML);
    try { const d = JSON.parse(localStorage.getItem(this.KEY) || '{}'); for (const k in d) if (els[k]) els[k].innerHTML = d[k]; } catch (e) {} },
  save() { this.persist(); const c = document.documentElement.cloneNode(true);
    c.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable')); c.querySelectorAll('[data-orig]').forEach(e => e.removeAttribute('data-orig'));
    c.querySelector('body').classList.remove('editing'); c.querySelectorAll('.slide').forEach(s => { s.classList.remove('active'); });
    const blob = new Blob(['<!DOCTYPE html>\n' + c.outerHTML], {type: 'text/html'}); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'x-ne-0.html'; a.click(); toast('Файл жүктелді: x-ne-0.html'); },
};
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 2400); }
(() => { const hz = $('.edit-hotzone'), bt = $('#editToggle'); let h = null;
  hz.addEventListener('mouseenter', () => { clearTimeout(h); bt.classList.add('show'); });
  hz.addEventListener('mouseleave', () => { h = setTimeout(() => { if (!Edit.on) bt.classList.remove('show'); }, 400); });
  bt.addEventListener('mouseenter', () => clearTimeout(h));
  bt.addEventListener('mouseleave', () => { h = setTimeout(() => { if (!Edit.on) bt.classList.remove('show'); }, 400); });
  bt.addEventListener('click', e => { e.stopPropagation(); Edit.toggle(); }); hz.addEventListener('click', e => { e.stopPropagation(); Edit.toggle(); }); })();

const deck = new Deck();
window.deck = deck;
