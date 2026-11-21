/* =====================================================================
   DECK — слайдтар, ауысулар, anime.js сценарийлері
   ===================================================================== */
const {animate, createTimeline, createTimer, stagger, splitText, scrambleText, svg, utils, spring} = anime;
const DUR = {intro:2400, focus:1300, iris:1500, braille:1700, fog:1500, beam:1300, ripple:1500, tunnel:1400};
const STATIC = /[?&]static=1/.test(location.search);
const $ = (s, el=document) => el.querySelector(s), $$ = (s, el=document) => [...el.querySelectorAll(s)];
const BRDIG = {'1':[1],'2':[1,2],'3':[1,4],'4':[1,4,5],'5':[1,5],'6':[1,2,4],'7':[1,2,4,5],'8':[1,2,5],'9':[2,4],'0':[2,4,5]};
const uni = d => String.fromCharCode(0x2800 + d.reduce((a, x) => a + (1 << (x - 1)), 0));
const brNum = n => uni([3,4,5,6]) + String(n).split('').map(c => uni(BRDIG[c])).join('');
const fmt = (v, dec=0) => dec ? v.toFixed(dec).replace('.', ',') : Math.round(v).toLocaleString('ru-RU').replace(/ /g, ' ');

class Deck {
  constructor(){
    this.stage = $('#deckStage'); this.slides = $$('.deck-stage > .slide');
    const res = (location.search.match(/[?&]res=(\d+)/) || [])[1];   // ?res=960 — әлсіз құрылғыларға / видео жазуға
    if (res) { const c = $('#gl'); c.width = +res; c.height = Math.round(+res * 9 / 16); }
    this.gl = new GLStage($('#gl'));
    this.cur = -1; this.busy = false; this.trans = null; this.t0 = performance.now(); this.since = 0; this.timers = [];
    this.scale(); addEventListener('resize', () => this.scale());
    this.loadImages().then(() => {
      this.layoutAll();
      if (STATIC) { window.deckAPI = this.api(); return; }
      this.bind();
      const h = parseInt(location.hash.slice(1)) || 1;
      this.go(Math.min(Math.max(h - 1, 0), this.slides.length - 1), true);
      const loop = () => { this.render(); requestAnimationFrame(loop); }; loop();
    });
  }
  scale(){ const f = this.f = Math.min(innerWidth / 1920, innerHeight / 1080);
    this.stage.style.transform = `translate(${(innerWidth - 1920 * f) / 2}px,${(innerHeight - 1080 * f) / 2}px) scale(${f})`; }
  loadImages(){
    const jobs = Object.entries(IMG).map(([k, src]) => new Promise(res => {
      const im = new Image(); im.onload = () => { this.gl.add(k, im); res(); }; im.onerror = res; im.src = src; }));
    $$('img[data-img]').forEach(i => { if (IMG[i.dataset.img]) i.src = IMG[i.dataset.img]; });
    return Promise.all(jobs).then(() => document.fonts.ready);
  }
  /* ---------- фон ---------- */
  zoomOf(i, since){ const m = META[i]; return m.z + .045 * Math.min(1, Math.max(0, performance.now() - since) / 16000); }
  render(){
    const t = (performance.now() - this.t0) / 1000;
    if (this.trans) { const T = this.trans;
      this.gl.draw({A: T.A, B: T.B, zA: T.zA, zB: T.B.z, type: T.type, p: T.p, t, cen: T.cen}); }
    else if (this.cur >= 0) this.gl.draw({B: META[this.cur], zB: this.zoomOf(this.cur, this.since), t});
  }
  /* ---------- навигация ---------- */
  go(i, first=false){
    if (this.busy || i < 0 || i >= this.slides.length || i === this.cur) return;
    const P = this.slides[this.cur], N = this.slides[i], fwd = i === this.cur + 1;
    const type = first ? 'intro' : (fwd ? META[i].tr : 'focus');
    const dur = first ? DUR.intro : (fwd ? DUR[type] : 900);
    const cen = type === 'intro' ? [.443, .445] : [.5, .5];
    this.trans = {type, p: 0, cen, A: this.cur >= 0 ? META[this.cur] : META[i], B: META[i],
                  zA: this.cur >= 0 ? this.zoomOf(this.cur, this.since) : META[i].z};
    this.busy = true;
    if (P) this.leave(P);
    this.stopTimers();
    animate(this.trans, {p: [0, 1], duration: dur, ease: type === 'intro' ? 'outSine' : 'inOutSine',
      onComplete: () => { this.trans = null; this.since = performance.now(); this.busy = false; }});
    setTimeout(() => { if (P) P.classList.remove('active'); N.classList.add('active'); this.enter(N, META[i]); }, dur * (first ? .35 : .55));
    this.cur = i; this.hud(i);
  }
  leave(P){
    const els = $$('.layer > *', P);
    animate(els, {opacity: 0, filter: ['blur(0px)', 'blur(10px)'], duration: 420, ease: 'inQuad',
      onComplete: () => els.forEach(e => { e.style.opacity = ''; e.style.filter = ''; })});
  }
  stopTimers(){ this.timers.forEach(t => t.pause && t.pause()); this.timers = []; }
  hud(i){
    const m = META[i], n = i + 1;
    $$('#hud .hcell circle').forEach(c => { const on = +c.dataset.d <= m.act; const was = c.classList.contains('on');
      c.classList.toggle('on', on); if (on && !was) animate(c, {r: [{to: 14, duration: 300}, {to: 8.5, duration: 700}], ease: 'outQuad'}); });
    $('#hbr').textContent = brNum(n); $('#hno').textContent = `${String(n).padStart(2, '0')} / 30`;
    $('#hact').textContent = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][m.act] + ' · ' + ACTS[m.act];
    $('#hbar').style.width = (n / 30 * 100) + '%';
    $('#notes').textContent = NOTES[i] || '';
    history.replaceState(null, '', '#' + n);
  }
  /* ---------- кіру анимациялары ---------- */
  enter(N, m){
    const tl = createTimeline({defaults: {ease: 'outExpo', duration: 900}});
    const L = $('.layer', N);
    // жалпы элементтер
    $$('[data-a="scramble"]', L).forEach((el, k) => { const t = el.querySelector('span') || el;
      tl.add(t, {innerHTML: scrambleText({chars: 'braille', revealRate: 70}), duration: 900}, k * 80); });
    $$('[data-a="words"]', L).forEach(el => { const sp = splitText(el, {words: true});
      tl.add(sp.words, {opacity: [0, 1], y: [26, 0], filter: ['blur(8px)', 'blur(0px)'], delay: stagger(38)}, 120); });
    $$('[data-a="decode"]', L).forEach(el => tl.add(el, {innerHTML: scrambleText({chars: 'braille', revealRate: 26, settleDuration: 600})}, 200));
    $$('[data-a="focuswords"]', L).forEach(el => { const sp = splitText(el, {words: true});
      tl.add(sp.words, {opacity: [.15, 1], filter: ['blur(16px)', 'blur(0px)'], scale: [1.08, 1], delay: stagger(90, {from: 'center'}), duration: 1400}, 100); });
    $$('[data-a="fade"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], y: [18, 0]}, 420 + k * 120));
    $$('[data-a="stagger"]', L).forEach(el => tl.add($$('li', el), {opacity: [0, 1], x: [-34, 0], delay: stagger(110)}, 380));
    $$('[data-a="row"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], x: [46, 0]}, 380 + k * 120));
    $$('[data-a="spring"]', L).forEach((el, k) => tl.add(el, {opacity: [0, 1], y: [50, 0], scale: [.92, 1], ease: spring({bounce: .35, duration: 900})}, 350 + k * 130));
    $$('[data-a="count"]', L).forEach((el, k) => { const to = parseFloat(el.dataset.to), from = parseFloat(el.dataset.from || 0), dec = +(el.dataset.dec || 0), o = {v: from};
      tl.add(o, {v: to, duration: 1800, ease: 'outQuart', onUpdate: () => { el.textContent = fmt(o.v, dec); }}, 450 + k * 120); });
    $$('[data-a="draw"]', L).forEach(el => tl.add(svg.createDrawable($$('path', el)), {draw: ['0 0', '0 1'], duration: 1400, delay: stagger(120), ease: 'inOutQuad'}, 500));
    $$('[data-a="portrait"]', L).forEach(el => { tl.add(el, {clipPath: ['inset(50% 50% 50% 50% round 16px)', 'inset(0% 0% 0% 0% round 16px)'], duration: 1300, ease: 'inOutQuart'}, 100);
      tl.add($('img', el), {scale: [1.35, 1.0], duration: 2600, ease: 'outQuart'}, 100);
      this.timers.push(animate($('img', el), {scale: [1, 1.12], duration: 12000, delay: 2700, ease: 'inOutSine', alternate: true, loop: true})); });
    // слайдқа тән сценарийлер
    const fn = KIND[m.kind]; if (fn) fn.call(this, L, tl, N);
  }
  layoutAll(){ this.slides.forEach(s => { const fn = LAYOUT[s.dataset.kind]; if (fn) fn($('.layer', s)); }); }
  /* ---------- басқару ---------- */
  bind(){
    addEventListener('keydown', e => {
      if (['ArrowRight','ArrowDown',' ','PageDown','Enter'].includes(e.key)) { e.preventDefault(); this.go(this.cur + 1); }
      else if (['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)) { e.preventDefault(); this.go(this.cur - 1); }
      else if (e.key === 'Home') this.go(0); else if (e.key === 'End') this.go(this.slides.length - 1);
      else if (e.key === 'n' || e.key === 'N') $('#notes').classList.toggle('on');
      else if (e.key === 'f' || e.key === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    });
    let x0 = null;
    addEventListener('touchstart', e => x0 = e.touches[0].clientX, {passive: true});
    addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) this.go(this.cur + (dx < 0 ? 1 : -1)); x0 = null; });
    $('.deck-viewport').addEventListener('click', e => this.go(this.cur + (e.clientX > innerWidth / 3 ? 1 : -1)));
  }
  /* ---------- экспорт (PPTX) үшін API ---------- */
  api(){
    return {
      count: this.slides.length,
      show: i => { this.slides.forEach((s, k) => s.classList.toggle('active', k === i)); $('#hud').style.display = 'none'; },
      bg: i => this.gl.draw({B: META[i], zB: META[i].z, t: 0}),
      frame: (i, p) => { const A = META[Math.max(0, i - 1)];
        this.gl.draw({A, B: META[i], zA: A.z, zB: META[i].z, type: META[i].tr, p, t: p * 1.5,
                      cen: META[i].tr === 'intro' ? [.443, .445] : [.5, .5]}); },
      size: (w, h) => { const c = $('#gl'); c.width = w; c.height = h; },
      dur: i => DUR[META[i].tr] || 1300,
      grab: () => $('#gl').toDataURL('image/jpeg', .9),
      meta: META
    };
  }
}

/* =====================================================================
   LAYOUT — анимацияға дейінгі орналасу (статикалық экспортта да керек)
   ===================================================================== */
const LAYOUT = {
  team(L){ const sats = $$('.sat', L), R = 330;
    sats.forEach((s, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / sats.length;
      s.style.transform = `translate(${R * Math.cos(a)}px, ${R * Math.sin(a)}px)`; }); },
  board(L){ const lens = $('.lens', L), inner = $('.btxt', lens), x = 60, y = 40;
    lens.style.transform = `translate(${x}px,${y}px)`; inner.style.transform = `translate(${-x}px,${-y}px)`; },
  acuity(L){ const v = .1; $('.cur', L).style.left = (v * 900) + 'px'; $('.letters', L).style.filter = 'blur(5px)'; },
};

/* =====================================================================
   KIND — әр слайдтың өз анимациясы (anime.js комбинациялары)
   ===================================================================== */
const KIND = {
  cover(L, tl){
    const seed = $('.seed', L);
    tl.add(seed, {scale: [{from: 0, to: 1.6, duration: 700}, {to: 1, duration: 700}], opacity: [0, 1], ease: 'outQuad'}, 0);
    this.timers.push(animate(seed, {boxShadow: ['0 0 40px 12px rgba(244,183,64,.55)', '0 0 80px 26px rgba(244,183,64,.25)'], duration: 1800, alternate: true, loop: true, ease: 'inOutSine'}));
  },
  quote(L, tl){ tl.add($('.qm', L), {scale: [3, 1], opacity: [0, .9], duration: 1200, ease: 'outBack(1.4)'}, 0); },
  board(L, tl){
    const lens = $('.lens', L), inner = $('.btxt', lens), pos = {x: -320, y: 40};
    const upd = () => { lens.style.transform = `translate(${pos.x}px,${pos.y}px)`; inner.style.transform = `translate(${-pos.x}px,${-pos.y}px)`; };
    upd();
    const path = createTimeline({loop: true, defaults: {ease: 'inOutSine', duration: 1600, onUpdate: upd}})
      .add(pos, {x: 60, y: 40}).add(pos, {x: 520, y: 40}).add(pos, {x: 520, y: 200}).add(pos, {x: 60, y: 200})
      .add(pos, {x: 300, y: 320}).add(pos, {x: 60, y: 40});
    this.timers.push(path);
    tl.add($('.board', L), {opacity: [0, 1], x: [-60, 0], duration: 1000}, 0);
  },
  cellmap(L, tl){
    const dots = $$('.bigcell circle', L);
    dots.forEach(d => d.classList.remove('on'));
    $$('.cm-row', L).forEach((row, k) => {
      tl.call(() => { const d = dots.find(c => +c.dataset.d === k + 1); d.classList.add('on');
        animate(d, {r: [{to: 70, duration: 250}, {to: 52, duration: 500}], ease: 'outQuad'}); }, 600 + k * 260);
    });
  },
  defs(L, tl){ const g = $('.glyph', L); tl.add(g, {innerHTML: scrambleText({text: g.dataset.to, chars: 'braille', revealRate: 40})}, 900); },
  braille(L, tl){
    const c = $$('.dots12 circle', L), lbl = $('.d12lbl', L); lbl.textContent = 'Барбье: 12 нүкте';
    tl.add(c, {scale: [0, 1], opacity: [0, 1], delay: stagger(60), duration: 500, ease: 'outBack(2)'}, 300);
    tl.add(c.slice(6), {opacity: 0, translateY: 40, delay: stagger(50, {from: 'last'}), duration: 600, ease: 'inQuad'}, 1900);
    tl.add(c.slice(0, 6), {scale: [{to: 1.35, duration: 250}, {to: 1, duration: 450}], ease: 'outQuad'}, 2500);
    tl.add(lbl, {innerHTML: scrambleText({text: 'Брайль: 6 нүкте', chars: 'braille'})}, 2400);
  },
  alphabet(L, tl, N){
    const box = $('.word-cells', L), sty = $('.stylus', L), on = $$('.wcell circle.on', box), letters = $$('.lt', box);
    utils.set(on, {scale: 0}); utils.set(letters, {opacity: 0});
    const br = box.getBoundingClientRect(), f = deck.f;
    let t = 900;
    tl.add(sty, {opacity: [0, 1], duration: 300}, t - 200);
    on.forEach((d, k) => { const r = d.getBoundingClientRect();
      const x = (r.left + r.width / 2 - br.left) / f - 14, y = (r.top + r.height / 2 - br.top) / f - 170;
      tl.add(sty, {translateX: x, translateY: y, duration: 340, ease: 'inOutQuad'}, t);
      tl.add(sty, {scaleY: [{to: .88, duration: 80}, {to: 1, duration: 80}]}, t + 340);
      tl.add(d, {scale: [{from: 0, to: 1.3, duration: 220}, {to: 1, duration: 200}], ease: 'outQuad'}, t + 360);
      t += 560; });
    tl.add(sty, {opacity: 0, translateY: '-=120', duration: 500}, t);
    tl.add(letters, {opacity: [0, 1], y: [20, 0], delay: stagger(140)}, t + 100);
  },
  acuity(L, tl){
    const cur = $('.cur', L), let_ = $('.letters', L), o = {v: 1};
    tl.add(o, {v: .1, duration: 3600, ease: 'inOutSine', onUpdate: () => {
      cur.style.left = (o.v * 900) + 'px'; let_.style.filter = `blur(${Math.min(18, (1 / o.v - 1) * .6).toFixed(1)}px)`; }}, 700);
    tl.add($$('.seg', L), {scaleX: [0, 1], duration: 900, delay: stagger(200)}, 300);
  },
  split(L, tl){ tl.add($('.vline', L), {scaleY: [0, 1], duration: 1100, ease: 'inOutQuart'}, 200); },
  sim(L, tl){
    $$('.simp', L).forEach((p, k) => { const im = $('img', p), fx = p.dataset.fx, ov = $('.ov', p);
      tl.add(p, {opacity: [0, 1], y: [60, 0]}, 500 + k * 140);
      if (fx) { const target = (fx.match(/filter:(.*)$/) || [, 'none'])[1]; utils.set(im, {filter: 'blur(0px) contrast(1) brightness(1) sepia(0) grayscale(0)'}); tl.add(im, {filter: target, duration: 2200, ease: 'inOutSine'}, 1500 + k * 300); }
      if (ov) { utils.set(ov, {opacity: 0}); tl.add(ov, {opacity: 1, duration: 2200, ease: 'inOutSine'}, 1500 + k * 300); }
    });
  },
  kz(L, tl){ /* сандар жалпы count арқылы */ },
  touch(L, tl){ ripples.call(this, L, tl); },
  tactile(L, tl){ ripples.call(this, L, tl); },
  cloud(L, tl){
    const chips = $$('.chip', L);
    chips.forEach(c => utils.set(c, {x: utils.random(-500, 500), y: utils.random(-260, 260), rotate: utils.random(-25, 25), opacity: 0}));
    tl.add(chips, {opacity: [0, 1], duration: 500, delay: stagger(60)}, 300);
    tl.add(chips, {x: 0, y: 0, rotate: 0, delay: stagger(70, {from: 'random'}), ease: spring({bounce: .4, duration: 1400})}, 1300);
  },
  cycle(L, tl){
    const arcs = svg.createDrawable($$('.arc', L)), brk = svg.createDrawable($$('.brk', L));
    tl.add($$('[data-a="node"]', L), {opacity: [0, 1], scale: [.6, 1], delay: stagger(180), ease: 'outBack(2)'}, 300);
    tl.add(arcs, {draw: ['0 0', '0 1'], delay: stagger(220), duration: 700, ease: 'inOutQuad'}, 600);
    tl.add(brk, {draw: ['0 0', '0 1'], duration: 700, ease: 'inOutQuart'}, 2300);
    tl.add($('.brkt', L), {opacity: [0, 1], translateX: [-20, 0]}, 2700);
    tl.add($$('.arc', L), {opacity: [1, .45], duration: 800}, 2600);
  },
  light(L, tl){
    const rays = svg.createDrawable($$('.plan .rays path', L));
    tl.add(rays, {draw: ['0 0', '0 1'], delay: stagger(160), duration: 900, ease: 'inOutQuad'}, 600);
    tl.add($('.plan .glr', L), {opacity: [0, 1], scale: [.3, 1.4], duration: 700, ease: 'outQuad'}, 1500);
    tl.add($('.plan .deskA', L), {opacity: [0, 1], scale: [.7, 1], duration: 600, ease: 'outBack(2)'}, 1300);
    tl.add($('.plan .deskB', L), {opacity: [0, 1], scale: [.7, 1], duration: 700, ease: 'outBack(2)'}, 2300);
    this.timers.push(animate($('.plan .glr', L), {opacity: [1, .35], duration: 900, delay: 2400, alternate: true, loop: true, ease: 'inOutSine'}));
  },
  typo(L, tl){
    const sp = $('[data-a="typo"]', L); utils.set(sp, {fontWeight: 300, fontSize: '22px', color: '#8a8d96'});
    tl.add(sp, {fontSize: ['22px', '58px'], color: ['#8a8d96', '#F5EFE4'], letterSpacing: ['0em', '.01em'], duration: 2600, ease: 'inOutCubic'}, 900);
    tl.call(() => sp.style.fontWeight = '500', 1500); tl.call(() => sp.style.fontWeight = '700', 2100); tl.call(() => sp.style.fontWeight = '800', 2700);
  },
  sound(L, tl){
    const say = $('.say', L), ws = $$('.say .w', L); say.classList.add('dim'); ws.forEach(w => w.classList.toggle('on', false));
    ws.forEach((w, k) => tl.call(() => w.classList.add('on'), 900 + k * 330));
    const [p1, p2] = $$('.wave path', L), t0 = performance.now();
    const draw = () => { const t = (performance.now() - t0) / 1000; let d1 = 'M0 100', d2 = 'M0 100';
      for (let x = 0; x <= 900; x += 10) { const env = Math.sin(Math.PI * x / 900);
        d1 += ` L${x} ${(100 + Math.sin(x / 26 + t * 6) * 60 * env * (.6 + .4 * Math.sin(t * 2.1))).toFixed(1)}`;
        d2 += ` L${x} ${(100 + Math.sin(x / 41 - t * 4) * 38 * env).toFixed(1)}`; }
      p1.setAttribute('d', d1); p2.setAttribute('d', d2); };
    draw(); this.timers.push(createTimer({onUpdate: draw}));
  },
  team(L, tl){
    const sats = $$('.sat', L), o = {a: 0}, R = 330;
    tl.add($('.core', L), {scale: [0, 1], duration: 900, ease: 'outBack(2)'}, 200);
    tl.add(sats, {opacity: [0, 1], delay: stagger(140)}, 500);
    this.timers.push(animate(o, {a: Math.PI * 2, duration: 40000, ease: 'linear', loop: true, onUpdate: () =>
      sats.forEach((s, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / sats.length + o.a;
        s.style.transform = `translate(${R * Math.cos(a)}px, ${R * Math.sin(a)}px)`; })}));
  },
  support(L, tl){ tl.add($$('.st', L), {scaleY: [0, 1], transformOrigin: ['50% 100%', '50% 100%'], delay: stagger(240), duration: 800, ease: 'outBack(1.4)'}, 400); },
  parents(L, tl){
    const cards = $$('.p6 .card', L), st = deck.stage.getBoundingClientRect(), f = deck.f;
    const dot = i => ({x: 930 + (i < 3 ? 0 : 64), y: 560 + (i % 3) * 64});
    cards.forEach((c, i) => { const r = c.getBoundingClientRect();
      const cx = (r.left - st.left + r.width / 2) / f, cy = (r.top - st.top + r.height / 2) / f; const d = dot(i);
      utils.set(c, {x: d.x - cx, y: d.y - cy, scale: .08, opacity: 0}); utils.set($$('p', c), {opacity: 0}); });
    tl.add(cards, {opacity: [0, 1], duration: 300, delay: stagger(100)}, 200);
    tl.add(cards, {x: 0, y: 0, scale: 1, delay: stagger(160), ease: spring({bounce: .3, duration: 1300})}, 900);
    tl.add($$('.p6 .card p', L), {opacity: [0, 1], delay: stagger(160)}, 1500);
  },
  answer(L, tl){
    const six = $$('.six circle', L), dosOn = $$('.dos .wc:not(.six) circle.on', L), lts = $$('.dos .wc:not(.six) .lt', L);
    utils.set(six, {opacity: .15}); utils.set(dosOn, {scale: 0}); utils.set(lts, {opacity: 0});
    tl.add($('.ans-yes', L), {scale: [2.4, 1], opacity: [0, 1], filter: ['blur(20px)', 'blur(0px)'], duration: 1300}, 700);
    tl.add(six, {opacity: [.15, 1], scale: [.4, 1], delay: stagger(220), duration: 600, ease: 'outBack(2.5)'}, 1100);
    tl.add($('.six', L), {opacity: .25, scale: .85, duration: 700}, 2900);
    tl.add(dosOn, {scale: [0, 1], delay: stagger(120), duration: 500, ease: 'outBack(2.5)'}, 3000);
    tl.add(lts, {opacity: [0, 1], y: [20, 0], delay: stagger(160)}, 3800);
  },
  thanks(L, tl){ const on = $$('.thx-cells circle.on', L); utils.set(on, {scale: 0});
    tl.add(on, {scale: [0, 1], delay: stagger(45), duration: 420, ease: 'outBack(2.5)'}, 300); },
};
function ripples(L, tl){
  const pts = $$('.touch', L);
  tl.add(pts, {scale: [0, 1], opacity: [0, 1], delay: stagger(260), duration: 600, ease: 'outBack(2)'}, 400);
  pts.forEach((p, k) => this.timers.push(animate($('i', p), {scale: [1, 4.5], opacity: [.9, 0], duration: 1800, delay: 600 + k * 260, loop: true, ease: 'outQuad'})));
}

const deck = new Deck();
window.deck = deck;
