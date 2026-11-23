/* =====================================================================
   ЖЕРДІҢ ТӨРТ ҚАБЫҒЫ · DECK — навигация, мәтін анимациялары (anime.js 4),
   слайдтан слайдқа көшетін детальдар (төрт қабық белгісі, тамшы, өлшеуіш),
   3D нүктелерге жапсырмалар, физика (matter.js), қолмен белгілер (rough-notation),
   спикер жазбалары (N), өңдеу режимі (E · Ctrl+S), титрлар.
   ===================================================================== */
const {animate, createTimeline, stagger, splitText, svg: aSvg, utils, spring, createLayout} = anime;
const QS = new URLSearchParams(location.search);
const STATIC = QS.get('static') === '1';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const N = META.length, G = World.X, V3 = G.V, NS = 'http://www.w3.org/2000/svg';
const SPH = ['litho', 'hydro', 'atmo', 'bio'];
const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

/* === 3D НҮКТЕЛЕРГЕ ЖАПСЫРМАЛАР (слайд → [кілт, мәтін, қосымша, 3D нүкте, жапсырманың ығысуы]) === */
const BL = G.BLOCK, Hh = (x, z) => G.H(x, z);
const PINS = {
  4: [['crust', 'Жер қыртысы', '5–70 км', () => G.cutPoint(.994, 1.08), [-250, -120]], ['mantle', 'Мантия', '2900 км-ге дейін', () => G.cutPoint(.74, .95), [-260, -40]],
      ['outer', 'Сыртқы ядро', 'сұйық', () => G.cutPoint(.4, .62), [250, -150]], ['inner', 'Ішкі ядро', 'қатты', () => G.cutPoint(.08, .7), [250, 40]]],
  5: [['lith', 'Литосфера', 'қыртыс + жоғарғы мантия', () => G.cutPoint(.978, .84), [210, -160]], ['ast', 'Мантия', 'тұтқыр, ыстық', () => G.cutPoint(.93, .8), [230, 80]]],
  7: [['trench', 'Мұхиттық тақта', '', () => V3(G.coastX(8) - 3.6, -2.75, 8), [-40, 130]], ['slab', 'Субдукция', 'тақта астыға сүңгиді', () => V3(-5.4, -4.4, 8), [-150, 60]],
      ['chamber', 'Магма ошағы', '', () => V3(BL.VX, -3.0, 8), [200, 90]], ['crater', 'Жанартау', '', () => V3(BL.VX, Hh(BL.VX, 7.85) + .05, 7.85), [-230, -40]]],
  8: [['hypo', 'Ошақ', 'гипоцентр', () => BL.HYPO.clone(), [230, 110]], ['epi', 'Эпицентр', '', () => V3(BL.HYPO.x, Hh(BL.HYPO.x, 7.95) + .02, 7.95), [220, -120]]],
  13: [['vap', '1 · Булану', '', () => V3(-9.2, 1.6, 1), [-40, -70]], ['cloud', '2 · Бұлт', '', () => V3(-1.5, 5.4, -1.5), [-30, 70]], ['rain', '3 · Жауын', '', () => V3(8.2, 4.0, -2.6), [120, 30]],
       ['river', '4 · Өзен', '', () => V3(4.5, Hh(4.5, .1) + .1, .1), [110, 40]], ['ground', '5 · Жерасты суы', '', () => V3(-.5, -1.1, 8), [60, 90]], ['sea', 'Мұхит', '', () => V3(-9.5, 0, 6), [-60, 70]]],
  14: [['glac', 'Мұздық', 'өзеннің басы', () => V3(10.2, Hh(10.2, -5.6) + .1, -5.6), [150, -60]], ['lake', 'Көл', '', () => V3(BL.LAKE.x + .8, BL.LAKE.lvl, BL.LAKE.z - .3), [-150, 100]]],
  20: [['herd', 'Киіктер', 'тірі зат', () => V3(1.9, .85, -.15), [150, 120]], ['forest', 'Орман', 'фотосинтез → O₂', () => V3(1.0, 1.25, 5.4), [180, -70]]],
  25: [['you', '', '', () => V3(G.SPOT.x + .1, G.H(G.SPOT.x, G.SPOT.z) + .62, G.SPOT.z), [0, 0]]],
  10: [['impact', '', '', () => V3(-8.5, 0, 3.5), [0, 0]]],
};
const PIN_AT = {};   // слайд → {кілт: [x, y]}

/* === ТӨРТ ҚАБЫҚ БЕЛГІЛЕРІ: әр слайдтағы күйі ===
   'a' — слайдтағы [data-anchor=tok-…] орнына қонады · 'hud' — сол жақ жоғарғы бұрыш (белсендісі үлкен)
   'orbit' — Қазақстанды айналады · 'venn' — төрт шеңбер тоғысады · 'credits' — титрмен бірге жоғары кетеді */
const TOKMODE = {1: 'a', 2: 'orbit', 3: 'a', 23: 'venn', 24: 'a', 25: 'venn2', 26: 'credits'};
for (let i = 4; i <= 22; i++) TOKMODE[i] = 'hud';
const DROPMODE = {10: 'fall', 11: 'a', 13: 'cycle', 14: 'glac', 25: 'you'};

class Deck {
  constructor() {
    this.stage = $('#deckStage'); this.slides = $$('.deck-stage > .slide'); this.cur = -1; this.from = -1; this.t0 = 0;
    this.timers = []; this.f = 1; this.frameMs = []; this.res = null; this.tick = null; this.phys = null;
    this.scale(); addEventListener('resize', () => this.scale());
    this.boot().catch(e => { console.error(e); document.body.dataset.err = String(e.stack || e); });
  }
  async boot() {
    const q = QS.get('q'), res = q === 'lo' ? [1280, 720] : q === 'hi' ? [1920, 1080] : [1600, 900];
    this.res = res;
    await World.init($('#gl'), IMG, {w: res[0], h: res[1], msaa: +(QS.get('msaa') ?? 4), shadow: +(QS.get('shq') || 2048), pcf: QS.get('pcf'), tr: META.map(m => m.tr), preserve: STATIC});
    await document.fonts.ready;
    Edit.restore();
    this.layout();
    if (STATIC) { document.body.classList.add('static'); window.deckAPI = this.api(); return; }
    this.bind();
    $('#loader').classList.add('done');
    const h = parseInt(location.hash.slice(1)) || 1;
    this.go(Math.min(Math.max(h - 1, 0), N - 1), true);
    const loop = now => { this.render(now); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }
  scale() { const f = this.f = Math.min(innerWidth / 1920, innerHeight / 1080);
    this.stage.style.transform = `translate(${(innerWidth - 1920 * f) / 2}px,${(innerHeight - 1080 * f) / 2}px) scale(${f})`; }
  render(now) {
    const tau = (now - this.t0) / 1000;
    const a = performance.now(); World.frame(this.cur, tau, this.from); const dt = performance.now() - a;
    if (this.tick) this.tick(tau);
    this.frameMs.push(dt); if (this.frameMs.length > 90) this.frameMs.shift();
    if (!QS.get('q') && this.frameMs.length === 90 && tau > 3) { const avg = this.frameMs.reduce((s, x) => s + x, 0) / 90;
      if (avg > 38 && this.res[0] > 960) { this.res = this.res[0] > 1280 ? [1280, 720] : [960, 540]; World.resize(...this.res); this.frameMs = []; } }
  }
  /* === ОРЫНДАРДЫ ЕСЕПТЕУ === */
  anchorRect(slide, key) {
    const el = $(`[data-anchor="${key}"]`, slide); if (!el) return null;
    const r = el.getBoundingClientRect(), st = this.stage.getBoundingClientRect(), f = this.f;
    return {cx: (r.left - st.left + r.width / 2) / f, cy: (r.top - st.top + r.height / 2) / f, w: r.width / f, h: r.height / f, el};
  }
  layout() {
    for (const sid in PINS) {
      const i = +sid - 1, pts = {}; PINS[sid].forEach(([k, , , at]) => pts[k] = at);
      const pr = World.probe(i, pts, 7); PIN_AT[sid] = pr;
      if (+sid === 25 || +sid === 10) continue;
      const host = $('.pins', this.slides[i]); host.innerHTML = '';
      const s = svgEl('svg', {viewBox: '0 0 1920 1080'}, host);
      PINS[sid].forEach(([k, txt, sub, , off]) => { const [x, y] = pr[k], lx = x + off[0], ly = y + off[1];
        svgEl('path', {d: `M${x} ${y} Q ${(x + lx) / 2} ${Math.min(y, ly) - 30} ${lx} ${ly}`, class: 'lead'}, s);
        svgEl('circle', {cx: x, cy: y, r: 16, class: 'halo'}, s); svgEl('circle', {cx: x, cy: y, r: 7, class: 'dot'}, s);
        const d = document.createElement('div'); d.className = 'pin'; d.style.left = lx + 'px'; d.style.top = ly + 'px';
        d.innerHTML = `${txt}${sub ? `<small>${sub}</small>` : ''}`; host.appendChild(d); });
    }
    // су айналымының жолы (тамшы осы жолмен ұшады)
    const p = PIN_AT[13]; if (p) { const P_ = k => p[k].slice(0, 2);
      const [a, b, c, d, e, f] = ['sea', 'vap', 'cloud', 'rain', 'river', 'ground'].map(P_);
      $('#cp').setAttribute('d', `M${a[0]} ${a[1]} C ${a[0]} ${a[1] - 160}, ${b[0]} ${b[1] - 120}, ${b[0] + 40} ${b[1] - 220} S ${c[0] - 300} ${c[1] - 40}, ${c[0]} ${c[1]} S ${d[0] - 80} ${d[1] - 120}, ${d[0]} ${d[1]} `
        + `S ${e[0] + 60} ${e[1] - 60}, ${e[0]} ${e[1]} S ${f[0] + 160} ${f[1] - 40}, ${f[0]} ${f[1]} S ${a[0] + 200} ${a[1] + 40}, ${a[0]} ${a[1]}`); }
    SPH.forEach(k => utils.set('#tok-' + k, {x: 900, y: 480, opacity: 0, scale: .4}));
    utils.set('#drop', {x: 925, y: -200, opacity: 0});
  }
  /* === ТӨРТ ҚАБЫҚ БЕЛГІЛЕРІ === */
  tokTarget(id, k, j) {
    const mode = TOKMODE[id], S = this.slides[id - 1], act = META[id - 1].act, active = SPH[act - 1];
    if (mode === 'a' || mode === 'credits') { const r = this.anchorRect(S, 'tok-' + k); if (!r) return null; return {x: r.cx, y: r.cy, s: r.w / 120, o: 1}; }
    if (mode === 'hud') { const on = k === active; return {x: 96 + 30 + j * 66, y: 86, s: on ? .58 : .4, o: on ? 1 : .45}; }
    if (mode === 'venn') { const c = [500, 600], R = 112; const a = [-PI4 * 3, -PI4, PI4 * 3, PI4][j]; return {x: c[0] + Math.cos(a) * R, y: c[1] + Math.sin(a) * R, s: 2.3, o: .92}; }
    if (mode === 'venn2') { const c = PIN_AT[25] ? PIN_AT[25].you : [1400, 560], R = 190; const a = [-PI4 * 3, -PI4, PI4 * 3, PI4][j]; return {x: c[0] + Math.cos(a) * R, y: c[1] + 30 + Math.sin(a) * R * .85, s: .95, o: 1}; }
    return null;
  }
  moveProps(id, D, instant = false) {
    utils.remove(["#drop", ...SPH.map(k => "#tok-" + k)]);   // алдыңғы слайдтың кешіктірілген анимациялары жаңасын бұзбасын
    const mode = TOKMODE[id];
    SPH.forEach((k, j) => {
      const el = $('#tok-' + k), glow = $('.glow', el), lbl = $('.lbl', el), t = mode === 'orbit' ? null : this.tokTarget(id, k, j);
      if (mode === 'orbit') return;   // слайдқа тән анимация басқарады
      if (t) { const to = {x: t.x - 60, y: t.y - 60, scale: t.s, opacity: t.o, rotate: 0};
        if (instant) utils.set(el, to); else { const was = +utils.get(el, 'opacity') > .05;
          if (!was) utils.set(el, {x: to.x, y: to.y + 50, scale: t.s * .5, rotate: -30});
          animate(el, {...to, duration: 1400, delay: D * 1000 * (was ? .2 : .6) + j * 70, ease: was ? 'inOutQuart' : spring({bounce: .4, duration: 1100})}); }
        utils.set(glow, {opacity: mode === 'hud' && k === SPH[META[id - 1].act - 1] ? .45 : 0});
        utils.set(lbl, {opacity: 0}); }
      else if (instant) utils.set(el, {opacity: 0}); else animate(el, {opacity: 0, scale: .3, duration: 500, ease: 'inQuad'});
    });
    const dm = DROPMODE[id], dr = $('#drop');
    if (!dm) { if (instant) utils.set(dr, {opacity: 0}); else animate(dr, {opacity: 0, scale: .2, duration: 400}); }
    else if (dm === 'fall') { const p = PIN_AT[10].impact; utils.set(dr, {x: p[0] - 35, y: -160, scale: .7, scaleX: 1, scaleY: 1, opacity: 1, rotate: 0});
      if (!instant) { const tl = createTimeline(); tl.add(dr, {y: p[1] - 80, duration: 420, ease: 'inQuad'}, 0).add(dr, {scaleY: .35, scaleX: 1.6, y: p[1] - 40, duration: 120, ease: 'outQuad'}, 420)
        .add(dr, {opacity: 0, scale: .2, duration: 300}, 560); } else utils.set(dr, {opacity: 0}); }
    else if (dm === 'a') { const r = this.anchorRect(this.slides[id - 1], 'drop'); if (r) { const to = {x: r.cx - 35, y: r.cy - 70, scale: .45, opacity: 1, rotate: 0};
      if (instant) utils.set(dr, to); else animate(dr, {...to, duration: 1500, delay: D * 1000 * .5, ease: 'inOutQuart'}); } }
    else if (dm === 'glac' || dm === 'you') { const p = dm === 'glac' ? PIN_AT[14].glac : PIN_AT[25].you; const to = {x: p[0] - 35 + (dm === 'you' ? 64 : 0), y: p[1] - 120 + (dm === 'you' ? -40 : 0), scale: .55, opacity: 1, rotate: 0};
      if (instant) utils.set(dr, to); else { animate(dr, {...to, duration: 1600, delay: D * 1000 * .6, ease: 'inOutQuart'}); } }
    // венн шеңберлері
    const vs = $('#venn svg'); vs.innerHTML = '';
    if ((mode === 'venn' || mode === 'venn2') && !REDUCED) {
      SPH.forEach((k, j) => { const t = this.tokTarget(id, k, j); const c = svgEl('circle', {cx: t.x, cy: t.y, r: mode === 'venn' ? 190 : 150, fill: SPC[k], 'fill-opacity': .14, stroke: SPC[k], 'stroke-width': 4}, vs);
        if (!instant) { utils.set(c, {opacity: 0}); animate(c, {opacity: [0, 1], duration: 900, delay: D * 1000 + 900 + j * 160}); animate(aSvg.createDrawable(c), {draw: ['0 0', '0 1'], duration: 1200, delay: D * 1000 + 900 + j * 160, ease: 'inOutQuad'}); } });
    }
  }
  /* === НАВИГАЦИЯ === */
  go(i, first = false) {
    if (i < 0 || i >= N || i === this.cur) return;
    const P = this.slides[this.cur], Nn = this.slides[i];
    this.from = first ? (i === 0 ? -1 : -2) : this.cur;
    const D = World.dur(i, this.from);
    this.t0 = performance.now(); World.invalidate();
    if (P) this.leave(P);
    this.stopTimers(); this.tick = null; if (this.phys) { this.phys(); this.phys = null; }
    const fwd = i === this.from + 1, kind = META[i].tr;
    const tIn = first && i === 0 ? D * .55 : D * (fwd && ['wedge', 'cloudpunch', 'lift', 'pullback', 'plunge', 'craneup', 'dive', 'vertigo'].includes(kind) ? .72 : .5);
    clearTimeout(this.tSwap);
    this.tSwap = setTimeout(() => { $$('.slide.active').forEach(s => s.classList.remove('active')); Nn.classList.add('active'); this.enter(Nn, i, fwd); }, REDUCED ? 0 : tIn * 1000);
    this.moveProps(i + 1, D);
    Gauge.set(i + 1, D);
    // ең бірінші кадр: «ЖЕР» әріптері арқылы ғарышқа кіру (knockout zoom)
    if (first && i === 0 && !REDUCED && !this._knocked) { this._knocked = 1; const kn = $('#knock'), t = $('#ktext'); kn.classList.add('on');
      t.style.transformOrigin = '1010px 520px'; utils.set(t, {scale: 1});
      animate(t, {scale: [1, 46], duration: 2400, delay: 900, ease: 'inExpo', onComplete: () => kn.classList.toggle('on', false)}); }
    this.cur = i; this.hud(i);
    if (i === N - 1) this.credits(D);
  }
  leave(P) {
    const els = $$('.layer > *, .ph-float, .pins, #jar, #airjar, #everest, #ruler, #cyclepath, #you', P);
    animate(els, {opacity: 0, duration: 380, ease: 'inQuad', onComplete: () => els.forEach(e => { e.style.opacity = ''; e.style.transform = ''; })});
  }
  stopTimers() { this.timers.forEach(t => t.pause && t.pause()); this.timers = []; }
  hud(i) {
    const m = META[i], hd = $('#hud');
    hd.classList.toggle('off', i < 3 || i >= N - 3);
    const a = $('#hud .act'), q = $('#hud .q'), sp = ACT_SPHERE[m.act];
    hd.style.setProperty('--acc', sp ? SPC[sp] : '#F7C548'); a.style.color = sp ? SPC[sp] : '#F7C548';
    if (a.textContent !== ACTS[m.act]) { a.textContent = ACTS[m.act]; q.textContent = ACT_Q[m.act];
      if (!REDUCED) { animate(a, {opacity: [0, 1], x: [-14, 0], duration: 700, ease: 'outExpo'}); animate(q, {opacity: [0, 1], x: [-14, 0], duration: 700, delay: 120, ease: 'outExpo'}); } }
    $('#notes').innerHTML = NOTES[i] || '';
    history.replaceState(null, '', '#' + (i + 1));
  }
  /* === КІРУ АНИМАЦИЯЛАРЫ === */
  enter(S, i, fwd) {
    if (REDUCED) return;
    const id = i + 1, L = $('.layer', S), side = (S.className.match(/side-(\w)/) || [])[1];
    const tl = createTimeline({defaults: {ease: 'outExpo', duration: 900}});
    const panel = $('[data-a="panel"]', L);
    const fromV = {L: {x: [-70, 0]}, R: {x: [70, 0]}, T: {y: [-50, 0]}, B: {y: [50, 0]}, C: {scale: [.94, 1]}}[side] || {y: [40, 0]};
    if (panel && !panel.classList.contains('bare')) tl.add(panel, {opacity: [0, 1], ...fromV, duration: 1000}, 0);
    $$('.scrim', L).forEach(s => tl.add(s, {opacity: [0, 1], duration: 900, ease: 'outQuad'}, 0));
    $$('[data-a="kick"]', L).forEach(el => { if (!el.dataset.split) { el.dataset.split = 1; } tl.add(el, {opacity: [0, 1], x: [-20, 0], letterSpacing: ['.4em', '.14em'], duration: 1100}, 150); });
    $$('[data-a="title"]', L).forEach(el => {
      const mode = ['rise', 'mask', 'blur', 'pop', 'rise', 'mask', 'blur'][id % 7];
      const ws = (el._ws = el._ws || splitText(el, {words: true}).words);
      if (mode === 'mask') { utils.set(ws, {display: 'inline-block'}); tl.add(ws, {clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'], y: [34, 0], delay: stagger(70), duration: 900}, 260); }
      else if (mode === 'rise') tl.add(ws, {opacity: [0, 1], y: [46, 0], rotate: [4, 0], delay: stagger(60), duration: 900}, 260);
      else if (mode === 'pop') tl.add(ws, {opacity: [0, 1], scale: [.4, 1], delay: stagger(80), ease: spring({bounce: .45, duration: 900})}, 260);
      else tl.add(ws, {opacity: [0, 1], filter: ['blur(14px)', 'blur(0px)'], scale: [1.08, 1], delay: stagger(70, {from: 'center'}), duration: 1100}, 260);
    });
    $$('[data-a="words"]', L).forEach((el, k) => { const ws = (el._ws = el._ws || splitText(el, {words: true}).words);
      tl.add(ws, {opacity: [0, 1], y: [12, 0], delay: stagger(id % 2 ? 14 : 22), duration: 700, ease: 'outQuad'}, 520 + k * 150); });
    $$('[data-a="fade"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], y: [18, 0], duration: 800}, 760 + k * 140));
    $$('[data-a="row"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], ...(side === 'T' ? {y: [30, 0]} : {x: [side === 'L' ? -36 : 36, 0]}), duration: 800}, 600 + k * 110));
    $$('[data-a="pop"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], scale: [.7, 1], ease: spring({bounce: .4, duration: 900})}, 900 + k * 260));
    $$('[data-count]', L).forEach((el, k) => { const raw = el.dataset.count, n = parseFloat(raw.replace(/\s/g, '').replace(',', '.')); if (isNaN(n)) return;
      const o = {v: 0}; tl.add(o, {v: n, duration: 1800, ease: 'outQuart', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('ru-RU').replace(/ /g, ' '); }}, 700 + k * 200); });
    // фото қалқымалары: «рамкадан ұлғаю» (frame zoom)
    $$('.ph-float', S).forEach((el, k) => { tl.add(el, {opacity: [0, 1], scale: [.6, 1], rotate: [k % 2 ? 6 : -6, k % 2 ? 1.5 : -1.5], duration: 1200, ease: spring({bounce: .3, duration: 1200})}, 900 + k * 300);
      tl.add($('img', el), {scale: [1.35, 1], duration: 2600, ease: 'outQuart'}, 900 + k * 300); });
    // 3D жапсырмалар: сызық сызылады, нүкте жарқ етеді, жапсырма шығады
    const pins = $('.pins', S);
    if (pins && pins.children.length) { const ps = $$('path', pins), cs = $$('circle', pins), lb = $$('.pin', pins);
      utils.set([...ps, ...cs, ...lb], {opacity: 0});
      tl.add(ps, {opacity: 1, duration: 10}, 900).add(aSvg.createDrawable(ps), {draw: ['0 0', '0 1'], duration: 700, delay: stagger(220), ease: 'inOutQuad'}, 900)
        .add(cs, {opacity: [0, 1], scale: [2.4, 1], duration: 700, delay: stagger(110), ease: 'outBack(2)'}, 1100)
        .add(lb, {opacity: [0, 1], scale: [.7, 1], duration: 800, delay: stagger(220), ease: spring({bounce: .4, duration: 800})}, 1300); }
    const fn = KIND[id]; if (fn) fn.call(this, L, tl, S, fwd);
  }
  /* === 26-СЛАЙД: титрлар төменнен жоғары === */
  credits(D) {
    const cr = $('#credits'), H = cr.scrollHeight, dist = H + 1080 - 200;
    utils.set(cr, {y: 0});
    const follow = () => { SPH.forEach((k, j) => { const r = this.anchorRect(this.slides[N - 1], 'tok-' + k); if (!r) return; utils.set('#tok-' + k, {x: r.cx - 60, y: r.cy - 60, scale: r.w / 120, opacity: r.cy > 60 && r.cy < 1020 ? 1 : 0}); }); };
    this.timers.push(animate(cr, {y: -dist, duration: 52000, delay: D * 1000 * .5, ease: 'linear', onUpdate: follow}));
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
  /* === ЭКСПОРТ API (скриншот, preview) === */
  api() {
    const self = this;
    return {
      count: N, meta: META,
      show(i) { self.slides.forEach((s, k) => s.classList.toggle('active', k === i)); self.cur = i; self.hud(i); $('#hud').style.opacity = (i < 3 || i >= N - 3) ? 0 : 1;
        self.moveProps(i + 1, 0, true); Gauge.set(i + 1, 0, true);
        if (i === N - 1) utils.set($('#credits'), {y: -(1080 - 180)}); },
      frame(i, tau, from = i - 1) { World.frame(i, tau, from); return $('#gl').toDataURL('image/jpeg', .9); },
      size(w, h) { World.resize(w, h); },
      dur(i) { return World.dur(i, i - 1); },
    };
  }
}
const PI4 = Math.PI / 4;

/* === ӨЛШЕУІШ: тереңдік → биіктік → биосфера шекаралары (бір деталь, үш мағына) === */
const Gauge = {
  cfg: {
    4: {kind: 'depth', lo: 0, hi: 6371, unit: 'км', marks: [[0, 'жер беті'], [2900, 'мантия шегі'], [5150, 'ішкі ядро'], [6371, 'центр']], to: 6371, label: 'тереңдік'},
    5: {kind: 'depth', lo: 0, hi: 100, unit: 'км', marks: [[0, 'жер беті'], [10, 'мұхит қыртысы'], [40, 'жазық'], [80, 'тау астында'], [100, '']], to: 80, label: 'тереңдік'},
    16: {kind: 'alt', lo: 0, hi: 20, unit: 'км', marks: [[0, 'жер беті'], [10, 'ұшақтар'], [12, 'тропопауза'], [20, '']], live: 1, label: 'биіктік'},
    17: {kind: 'alt', lo: 0, hi: 1000, unit: 'км', log: 1, marks: [[12, 'тропосфера'], [50, 'стратосфера'], [85, 'мезосфера'], [400, 'ХҒС'], [800, 'термосфера']], live: 1, label: 'биіктік'},
    19: {kind: 'bio', lo: -11, hi: 20, unit: 'км', marks: [[20, 'озон — жоғарғы шекара'], [0, 'жер беті / мұхит беті'], [-3.5, 'құрлықтағы шекара'], [-11, 'шұңғыма түбі']], label: 'биосфера'},
  },
  y(c, v) { if (c.log) { const f = Math.log10(1 + Math.max(0, v)) / Math.log10(1 + c.hi); return 740 - f * 720; }
    const f = (v - c.lo) / (c.hi - c.lo); return c.kind === 'depth' ? 20 + f * 720 : 740 - f * 720; },
  set(id, D, instant) {
    const g = $('#gauge'), c = this.cfg[id], s = $('svg', g); this.c = c;
    if (!c) { animate(g, {opacity: 0, duration: 400}); return; }
    s.innerHTML = ''; const acc = c.kind === 'depth' ? '#E9874E' : c.kind === 'bio' ? '#5FD08A' : '#A88BFF';
    const grad = svgEl('linearGradient', {id: 'gg', x1: 0, y1: 0, x2: 0, y2: 1}, svgEl('defs', {}, s));
    const stops = c.kind === 'depth' ? [['0', '#C49A62'], ['.4', '#C2551E'], ['.8', '#F2A53A'], ['1', '#FFF2C8']] : c.kind === 'bio' ? [['0', '#A88BFF'], ['.35', '#5FD08A'], ['.6', '#3FA7F0'], ['1', '#0B2A55']] : [['0', '#000010'], ['.5', '#3B2F8A'], ['1', '#7FD3FF']];
    stops.forEach(([o, col]) => svgEl('stop', {offset: o, 'stop-color': col}, grad));
    svgEl('rect', {x: 170, y: 20, width: 14, height: 720, rx: 7, fill: 'url(#gg)', opacity: .9}, s);
    if (c.kind === 'bio') svgEl('rect', {x: 160, y: this.y(c, 20), width: 34, height: this.y(c, -11) - this.y(c, 20), rx: 12, fill: '#5FD08A', 'fill-opacity': .18, stroke: '#5FD08A', 'stroke-width': 2}, s);
    const ticks = c.marks.map(([v, t]) => { const y = this.y(c, v), gr = svgEl('g', {}, s);
      svgEl('line', {x1: 150, x2: 200, y1: y, y2: y, stroke: '#F4F1EA', 'stroke-width': 3, 'stroke-linecap': 'round'}, gr);
      const tx = svgEl('text', {x: 140, y: y + 8, 'text-anchor': 'end', 'font-family': 'Rubik', 'font-size': 21, fill: 'rgba(244,241,234,.85)'}, gr); tx.textContent = `${t}${t ? ' · ' : ''}${Math.abs(v)}`;
      return gr; });
    const mk = svgEl('g', {}, s); svgEl('path', {d: 'M204 0 L226 -12 L226 12 Z', fill: acc}, mk); svgEl('circle', {cx: 177, cy: 0, r: 11, fill: acc, stroke: '#fff', 'stroke-width': 3}, mk);
    this.mk = mk; this.rd = $('.rd', g); this.rd2 = $('.rd2', g);
    const y0 = this.y(c, c.kind === 'bio' ? 0 : c.lo); utils.set(mk, {y: y0});
    this.rd.innerHTML = `${c.kind === 'bio' ? '−11 … +20' : '0'}<small>${c.unit} · ${c.label}</small>`; this.rd2.textContent = '';
    if (instant) { utils.set(g, {opacity: 1}); return; }
    animate(g, {opacity: 1, duration: 800, delay: D * 1000 * .6});
    utils.set(ticks, {opacity: 0}); animate(ticks, {opacity: [0, 1], x: [30, 0], duration: 700, delay: stagger(140, {start: D * 1000 * .6 + 300})});
    if (c.to !== undefined) { const o = {v: 0}; animate(o, {v: c.to, duration: 4200, delay: D * 1000 + 600, ease: 'inOutQuad', onUpdate: () => {
      utils.set(mk, {y: this.y(c, o.v)}); this.rd.innerHTML = `${Math.round(o.v).toLocaleString('ru-RU').replace(/ /g, ' ')}<small>${c.unit} · ${c.label}</small>`; }}); }
  },
  live() { const c = this.c; if (!c || !c.live) return; const km = Math.max(0, World.alt()), t = G.tempAt(km);
    utils.set(this.mk, {y: this.y(c, Math.min(km, c.hi))});
    this.rd.innerHTML = `${km < 100 ? km.toFixed(1).replace('.', ',') : Math.round(km)}<small>км · биіктік</small>`;
    this.rd2.textContent = `${t > 0 ? '+' : ''}${Math.round(t)} °C`; return km; },
};

/* === СЛАЙДҚА ТӘН КОМБОЛАР === */
// rough-notation экран пикселімен өлшейді, ал сахна масштабталған (scale f) — сондықтан svgRect-ті f-ке бөлеміз
const rough = (el, o) => { try { const a = RoughNotation.annotate(el, {animationDuration: 900, strokeWidth: 3, padding: 6, ...o});
  const P = Object.getPrototypeOf(a); if (!P.__geo) { P.__geo = 1; const orig = P.svgRect; P.svgRect = function (t, e) { const r = orig.call(this, t, e), f = (window.deck && window.deck.f) || 1; return {x: r.x / f, y: r.y / f, w: r.w / f, h: r.h / f}; }; }
  return a; } catch (e) { return null; } };
const KIND = {
  // 1: «ЖЕР» әріптері арқылы ғарышқа кіру (knockout zoom), авторлар
  1(L, tl, S, fwd) {
    tl.add($$('.authors .au', L), {opacity: [0, 1], y: [24, 0], delay: stagger(140), duration: 900}, 1300);
  },
  // 2: белгілер Қазақстанды орбитамен айналады; сұраққа қолмен сызық
  2(L, tl, S) {
    const c = World.probe(1, {kz: () => G.ll(67, 48, G.RE).applyAxisAngle(V3(0, 1, 0), G.EARTH.rotation.y)}, 4).kz;
    const ph = {t: 0}; this.timers.push(animate(ph, {t: 1, duration: 9000, loop: true, ease: 'linear', onUpdate: () => {
      SPH.forEach((k, j) => { const a = ph.t * Math.PI * 2 + j * Math.PI / 2, x = c[0] + Math.cos(a) * 330, y = c[1] - 95 + Math.sin(a) * 105, z = Math.sin(a);
        utils.set('#tok-' + k, {x: x - 60, y: y - 60, scale: .55 + z * .12, opacity: 1, rotate: 0}); $('#tok-' + k).style.zIndex = z > 0 ? 7 : 5; }); }}));
    SPH.forEach((k, j) => animate('#tok-' + k, {opacity: [0, 1], duration: 900, delay: 600 + j * 150}));
    const ttl = $('.ttl', L); setTimeout(() => { const a = rough(ttl, {type: 'underline', color: '#F7C548', strokeWidth: 4, iterations: 2}); if (a) { a.show(); this.timers.push({pause: () => a.remove()}); } }, 1900);
  },
  // 3: төрт карта аударылып, жарқырайды
  3(L, tl) { const cards = $$('.card .in', L); utils.set(cards, {rotateY: 0});
    tl.add(cards, {rotateY: [0, 180], duration: 1100, delay: stagger(450, {start: 0}), ease: 'inOutBack(1.2)'}, 2200)
      .add($$('.card .shine', L), {x: ['-120%', '120%'], duration: 900, delay: stagger(450), ease: 'inOutQuad'}, 2900); },
  // 5: қыртыс бағандары қабат-қабат өседі
  5(L, tl) { tl.add($$('.ccol .lay', L), {scaleY: [0, 1], opacity: [0, 1], duration: 700, delay: stagger(160), ease: 'outBack(1.4)'}, 1100); },
  // 6: «жылына 2–5 см» — сызғыш баяу жылжиды (конвейер)
  6(L, tl, S) { const s = $('#ruler', S); s.innerHTML = '';
    svgEl('rect', {x: 0, y: 0, width: 600, height: 120, rx: 18, fill: 'rgba(10,15,28,.8)'}, s);
    const g = svgEl('g', {}, s);
    for (let i = 0; i <= 30; i++) { const x = 40 + i * 40; svgEl('line', {x1: x, x2: x, y1: 30, y2: i % 5 ? 52 : 66, stroke: '#F4F1EA', 'stroke-width': i % 5 ? 2 : 3}, g);
      if (i % 5 === 0) { const t = svgEl('text', {x, y: 92, 'text-anchor': 'middle', 'font-family': 'Rubik', 'font-size': 18, fill: '#F4F1EA'}, g); t.textContent = i + ' см'; } }
    const lab = svgEl('text', {x: 300, y: 22, 'text-anchor': 'middle', 'font-family': 'Rubik', 'font-weight': 700, 'font-size': 17, fill: '#F7C548'}, s); lab.textContent = 'бір жылда ≈ 2–5 см';
    const arrow = svgEl('path', {d: 'M40 108 L200 108', stroke: '#E9874E', 'stroke-width': 6, 'stroke-linecap': 'round'}, s);
    tl.add(s, {opacity: [0, 1], y: [30, 0], duration: 900}, 1400).add(aSvg.createDrawable(arrow), {draw: ['0 0', '0 1'], duration: 2400, ease: 'inOutSine'}, 1900);
    this.timers.push(animate(g, {x: [0, -200], duration: 20000, loop: true, ease: 'linear', delay: 1400})); },
  // 8: эпицентрден толқын шеңберлері (DOM) — 3D сілкініспен бірге
  8(L, tl, S) { const p = PIN_AT[8] && PIN_AT[8].epi; if (!p) return; const host = $('.pins svg', S); if (!host) return;
    const rings = [0, 1, 2].map(() => svgEl('circle', {cx: p[0], cy: p[1], r: 10, fill: 'none', stroke: '#F7C548', 'stroke-width': 4, opacity: 0}, host));
    this.timers.push(animate(rings, {r: [10, 320], opacity: [.9, 0], 'stroke-width': [6, 1], duration: 2400, delay: stagger(500), loop: true, ease: 'outQuad'})); },
  // 9: шөгінді түзілуі — matter.js: бөлшектер суға шөгіп, қабат-қабат жиналады
  9(L, tl, S) { this.phys = Phys.sediment($('#jar', S)); tl.add($('#jar', S), {opacity: [0, 1], duration: 700}, 1200); },
  // 11: 100 литр → төрт ыдыс (createLayout FLIP)
  11(L, tl) { const ves = $('.vessels', L), list = $$('.vessel', L); if (!ves) return;
    list.forEach((v, k) => { if (k) v.style.display = 'none'; });
    const t0 = $('.tank', list[0]), w0 = t0.style.width, h0 = t0.style.height; t0.style.width = '330px'; t0.style.height = '360px';
    const b0 = $('b', list[0]), s0 = $('span', list[0]), bt = b0.textContent, st = s0.textContent; b0.textContent = '100 л'; s0.textContent = 'Жердегі барлық су';
    const layout = createLayout(ves, {duration: 1400, ease: 'inOutQuart'});
    setTimeout(() => { layout.record(); list.forEach(v => v.style.display = ''); t0.style.width = w0; t0.style.height = h0; b0.textContent = bt; s0.textContent = st; layout.animate();
      animate($$('.vessel .water', L), {scaleY: [.2, 1], duration: 1600, delay: stagger(140), ease: 'outQuart'}); }, 2600); },
  // 12: мұхит аудандары өседі; Эверест шұңғымаға батады
  12(L, tl, S) { const fl = $$('.bar .fl', L); fl.forEach(f => tl.add(f, {scaleX: [0, +f.dataset.w], duration: 1400, ease: 'outQuart'}, 1000 + fl.indexOf(f) * 150));
    const ev = $('#everest', S); if (!ev) return; const m = $$('.ev', ev), tr = $('.trench', ev), gap = $('.gap', ev);
    utils.set(m, {y: -420}); utils.set(gap, {opacity: 0});
    tl.add(ev, {opacity: [0, 1], x: [60, 0], duration: 900}, 1200).add(aSvg.createDrawable(tr), {draw: ['0 0', '0 1'], duration: 1200, ease: 'inOutQuad'}, 1500)
      .add(m, {y: [-420, 0], duration: 1500, ease: 'outBounce'}, 2600).add(gap, {opacity: [0, 1], duration: 600}, 4100); },
  // 13: тамшы су айналымы жолымен ұшады, пішіні өзгереді (тамшы → бу → бұлт → тамшы)
  13(L, tl, S) { const path = $('#cp'), d = $('#drop'), sh = $('#dshape'); if (!path.getAttribute('d')) return;
    const dr = aSvg.createDrawable(path); utils.set(path, {opacity: 1}); animate(dr, {draw: ['0 0', '0 1'], duration: 2600, delay: 600, ease: 'inOutQuad'});
    const loop = () => { const t = createTimeline({defaults: {ease: 'inOutSine'}});
      utils.set(d, {opacity: 1, scale: .5, rotate: 0}); t.add(d, {...aSvg.createMotionPath(path), duration: 14000, ease: 'linear'}, 0);
      const SHAPES = ['M35 4 C35 4 8 42 8 62 A27 27 0 0 0 62 62 C62 42 35 4 35 4 Z', 'M12 70 C2 70 2 52 14 50 C14 34 34 30 40 44 C48 36 66 42 62 58 C72 62 68 76 56 76 Z',
        'M35 4 C35 4 8 42 8 62 A27 27 0 0 0 62 62 C62 42 35 4 35 4 Z'];
      t.add(sh, {d: [SHAPES[0], SHAPES[1]], duration: 900}, 1200).add(d, {scale: [.5, .9], duration: 1600}, 1200)
       .add(sh, {d: [SHAPES[1], SHAPES[2]], duration: 900}, 5200).add(d, {scale: [.9, .5], duration: 900}, 5200);
      return t; };
    setTimeout(() => { if (this.cur === 12) { const t = loop(); this.timers.push(t); this.timers.push(animate({}, {duration: 14200, loop: true, onLoop: () => { if (this.cur === 12) this.timers.push(loop()); }})); } }, 1400);
    const steps = $$('.step', L); this.timers.push(animate(steps, {background: ['rgba(63,167,240,.28)', 'rgba(244,241,234,.05)'], duration: 2800, delay: stagger(2800, {start: 1400}), loop: true, ease: 'outQuad'})); },
  // 15: ауа құмырасы: 100 молекула (matter.js)
  15(L, tl, S) { this.phys = Phys.air($('#airjar', S)); tl.add($('#airjar', S), {opacity: [0, 1], scale: [.8, 1], duration: 900}, 900);
    const role = $$('.arole', L); tl.add(role, {scale: [{to: 1.06, duration: 200}, {to: 1, duration: 400}], delay: stagger(200)}, 2400); },
  // 16–17: биіктік есептегіші камерамен бірге (лифт); 17-де қабаттар кезекпен жанады
  16(L, tl) { this.tick = () => Gauge.live(); },
  17(L, tl) { const rows = $$('.l2', L); this.tick = () => { const km = Gauge.live(); if (km == null) return;
    rows.forEach(r => { const on = km >= +r.dataset.lo && km < +r.dataset.hi; if (r._on !== on) { r._on = on; animate(r, {background: on ? 'rgba(168,139,255,.22)' : 'rgba(244,241,234,.04)', scale: on ? 1.03 : 1, duration: 500}); } }); }; },
  // 21: белдеулер 3D белдеумен бірге жанады (әр 3,2 с)
  21(L, tl) { const rows = $$('.belt', L); const t0 = performance.now() + (World.dur(20, 19)) * 1000;
    this.tick = () => { const a = (performance.now() - t0) / 1000; const b = a > 0 ? Math.floor((a / 3.2) % 6) - 1 : -1; rows.forEach((r, k) => r.classList.toggle('on', k === b)); }; },
  // 22: «өмір қабықшасы» — тақырыпқа қолмен дөңгелек
  22(L, tl) { const t = $('.ttl', L); setTimeout(() => { const a = rough(t, {type: 'highlight', color: 'rgba(95,208,138,.25)', iterations: 1, multiline: true}); if (a) { a.show(); this.timers.push({pause: () => a.remove()}); } }, 1800); },
  // 23: заңдар кезекпен жанады
  23(L, tl) { tl.add($$('.laws span', L), {scale: [{to: 1.12, duration: 220}, {to: 1, duration: 500}], delay: stagger(300)}, 3200); },
  // 24: тізбек реакциясы — әр қабық кезекпен «өзгереді»
  24(L, tl) { const rows = $$('.ch', L); tl.add(rows, {background: ['rgba(255,255,255,.18)', 'rgba(244,241,234,.04)'], duration: 1400, delay: stagger(900)}, 2600);
    const t = $('.cause', L); setTimeout(() => { const a = rough(t, {type: 'underline', color: '#F7C548', iterations: 1}); if (a) { a.show(); this.timers.push({pause: () => a.remove()}); } }, 1600); },
  // 25: жауап: «СІЗ» белгісі балалардың үстінде, белгілер Венн құрайды
  25(L, tl, S) { const p = PIN_AT[25] && PIN_AT[25].you, y = $('#you', S); if (p && y) { y.style.left = p[0] + 'px'; y.style.top = (p[1] - 60) + 'px';
      tl.add(y, {opacity: [0, 1], scale: [.3, 1], duration: 900, ease: spring({bounce: .5, duration: 900})}, 2600); }
    tl.add($('.ans', L), {letterSpacing: ['.12em', '-.03em'], duration: 1600, ease: 'outQuart'}, 900); },
};

/* === ФИЗИКА (matter.js) === */
const Phys = {
  run(cv, setup, draw) {
    const M = Matter, eng = M.Engine.create(), w = cv.width, h = cv.height, ctx = cv.getContext('2d'); eng.gravity.y = setup.g ?? 1;
    const walls = [M.Bodies.rectangle(w / 2, h + 20, w, 40, {isStatic: true}), M.Bodies.rectangle(-20, h / 2, 40, h * 3, {isStatic: true}), M.Bodies.rectangle(w + 20, h / 2, 40, h * 3, {isStatic: true})];
    if (setup.top) walls.push(M.Bodies.rectangle(w / 2, -20, w, 40, {isStatic: true}));
    M.Composite.add(eng.world, walls); setup.init(M, eng, w, h);
    let raf = 0, last = performance.now(), alive = true, acc = 0;
    const step = now => { if (!alive) return; acc += Math.min(250, now - last); last = now; let k = 0;
      while (acc >= 16.667 && k++ < 12) { setup.tick && setup.tick(M, eng, now); M.Engine.update(eng, 16.667); acc -= 16.667; }
      ctx.clearRect(0, 0, w, h); draw(ctx, eng, w, h); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => { alive = false; cancelAnimationFrame(raf); M.Engine.clear(eng); };
  },
  sediment(cv) {
    const COL = ['#C49A62', '#8C7A66', '#D8CFB8', '#A86A4C', '#B08F70']; let n = 0, layer = 0, t0 = performance.now();
    return this.run(cv, {init() {}, tick(M, eng, now) { if (n < 230 && now - t0 > 400 + n * 45) { const k = Math.floor(n / 46); const b = M.Bodies.polygon(40 + Math.random() * (cv.width - 80), -10, 5 + Math.floor(Math.random() * 3), 7 + Math.random() * 5, {friction: .6, restitution: .05, density: .002});
        b.col = COL[k % 5]; M.Composite.add(eng.world, b); n++; } } },
      (g, eng, w, h) => { g.fillStyle = 'rgba(8,24,44,.9)'; g.fillRect(0, 40, w, h - 40); g.strokeStyle = 'rgba(244,241,234,.75)'; g.lineWidth = 5; g.beginPath(); g.moveTo(3, 20); g.lineTo(3, h - 3); g.lineTo(w - 3, h - 3); g.lineTo(w - 3, 20); g.stroke();
        for (const b of eng.world.bodies) { if (b.isStatic) continue; g.fillStyle = b.col; g.beginPath(); b.vertices.forEach((v, i) => i ? g.lineTo(v.x, v.y) : g.moveTo(v.x, v.y)); g.closePath(); g.fill(); }
        g.fillStyle = '#F4F1EA'; g.font = '600 22px Rubik'; g.textAlign = 'center'; g.fillText('шөгу → қабат', w / 2, 30); });
  },
  air(cv) {
    const P = [['N₂', '#7FB2FF', 78], ['O₂', '#6FE0A0', 21], ['Ar', '#C7C2D6', 1]];
    return this.run(cv, {g: 0, top: true, init(M, eng, w, h) { let k = 0; for (const [nm, c, cnt] of P) for (let i = 0; i < cnt; i++, k++) {
        const b = M.Bodies.circle(40 + Math.random() * (w - 80), 40 + Math.random() * (h - 80), nm === 'Ar' ? 15 : 11, {restitution: 1, friction: 0, frictionAir: 0, inertia: Infinity});
        M.Body.setVelocity(b, {x: (Math.random() - .5) * 6, y: (Math.random() - .5) * 6}); b.col = c; b.nm = nm; M.Composite.add(eng.world, b); } },
      tick(M, eng) { for (const b of eng.world.bodies) { if (b.isStatic) continue; const v = Math.hypot(b.velocity.x, b.velocity.y); if (v < 2) M.Body.setVelocity(b, {x: b.velocity.x * 1.1 + .1, y: b.velocity.y * 1.1}); } } },
      (g, eng, w, h) => { g.save(); g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); g.fillStyle = 'rgba(10,15,28,.72)'; g.fill(); g.lineWidth = 4; g.strokeStyle = 'rgba(168,139,255,.7)'; g.stroke(); g.clip();
        for (const b of eng.world.bodies) { if (b.isStatic) continue; const r = b.circleRadius; g.fillStyle = b.col; g.beginPath(); g.arc(b.position.x, b.position.y, r, 0, 7); g.fill();
          if (b.nm !== 'Ar') { g.beginPath(); g.arc(b.position.x + r * .9, b.position.y, r * .8, 0, 7); g.fill(); } }
        g.restore(); g.fillStyle = '#F4F1EA'; g.font = '700 26px Rubik'; g.textAlign = 'center'; g.fillText('100 молекула ауа', w / 2, h - 18); });
  },
};

/* === ӨҢДЕУ РЕЖИМІ (E · Ctrl+S) === */
const Edit = {
  on: false, KEY: 'geo-spheres-edits',
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
    a.href = URL.createObjectURL(blob); a.download = 'zher-tort-kabygy.html'; a.click(); toast('Файл жүктелді: zher-tort-kabygy.html'); },
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
