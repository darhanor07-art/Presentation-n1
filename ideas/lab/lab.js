/* =====================================================================
   КОМБО ЗЕРТХАНАСЫ — басқару: слайдтар, 12 ауысу, автоойнату
   Пернелер: → / Space — келесі · ← — алдыңғы · R — қайталау · I — сипаттама жолағы
             A — автоойнату · F — толық экран · Home / End
   Мекенжай: #7 — 7-слайдтан бастау · ?auto=1&dwell=6500 — автоойнату
   ===================================================================== */
(() => {
'use strict';
const {animate, createTimeline, stagger, utils, spring, steps} = anime;
const D = window.LAB_DATA, QS = new URLSearchParams(location.search);
const $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)];
const stage = $('#deckStage'), ov = $('#ov'), hudEl = $('#hud');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = 1920, H = 1080, PAL = ['#F4C95D', '#F28B6C', '#8FD3B6', '#9CCBEA', '#F5F0E6', '#C8925A'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

/* === СЛАЙДТАР === */
const SL = [{kind: 'cover'}, ...D.combos.map(c => ({kind: 'combo', c})), {kind: 'libs'}];
const N = SL.length;
SL.forEach(s => {
  const sec = document.createElement('section'); sec.className = 'slide'; sec.innerHTML = '<div class="demo"></div>';
  if (s.kind === 'combo') {
    const c = s.c, src = c.src.map(x => `<b>${esc(x.t)}</b>${x.m ? ' — ' + esc(x.m) : ''}`).join('<br>');
    sec.insertAdjacentHTML('beforeend', `<div class="bar"><div><span class="cat">${esc(c.cat)}</span><h2>${esc(c.title)}</h2></div>
      <div><small>Бір мезетте қозғалады</small><div class="chips">${c.moves.map(m => `<i>${esc(m)}</i>`).join('')}</div></div>
      <div><small>anime.js</small><div class="api">${c.api.map(esc).join(' · ')}</div><small>Шабыт</small><div class="src">${src}</div></div></div>`);
  }
  stage.insertBefore(sec, ov); s.el = sec; s.demo = $('.demo', sec);
});

/* === МҰҚАБА МЕН КІТАПХАНАЛАР СЛАЙДЫ === */
function cover(host) {
  const inst = Combos.liquidBlobs(host, {title: 'Комбо зертханасы', sub: `${D.combos.length} комбо · ${D.transitions.length} ауысу · anime.js 4.5`, size: 120, cardW: 1320, cardH: 500});
  const h = document.createElement('div'); h.className = 'hint';
  h.innerHTML = '<b>→</b> келесі · <b>R</b> қайталау · <b>I</b> сипаттама · <b>A</b> автоойнату · <b>F</b> толық экран';
  host.appendChild(h); animate(h, {opacity: [0, 1], y: [20, 0], duration: 900, delay: 1400, ease: 'outExpo'});
  return inst;
}
function libs(host) {
  host.innerHTML = ''; const L = D.libs, max = L[0].stars;
  const root = document.createElement('div'); root.className = 'libs'; host.appendChild(root);
  root.insertAdjacentHTML('beforeend', `<h1>GitHub ★ · анимация кітапханалары</h1><div class="k">жұлдыз саны · ${esc(D.libsDate)} · GitHub API</div>`);
  const anims = [];
  const rows = L.map((l, i) => {
    const r = document.createElement('div'); r.className = 'row'; r.style.top = 230 + i * 64 + 'px';
    const w = Math.round(l.stars / max * 820);
    r.innerHTML = `<b>${esc(l.name)}</b><div class="tr"><div class="fill" style="width:${w}px;background:${PAL[i % PAL.length]}"></div><div class="n" style="left:${w + 18}px">0</div><div class="u" style="left:${w + 170}px">${esc(l.note)}</div></div>`;
    root.appendChild(r); return {r, fill: $('.fill', r), n: $('.n', r), u: $('.u', r), v: l.stars};
  });
  const tl = createTimeline(); anims.push(tl);
  tl.add(rows.map(x => x.r), {opacity: [0, 1], x: [-60, 0], duration: 700, ease: 'outExpo', delay: stagger(60)}, 0)
    .add(rows.map(x => x.fill), {scaleX: [0, 1], duration: 1300, ease: spring({bounce: .3, duration: 1300}), delay: stagger(70)}, 200)
    .add(rows.map(x => x.u), {opacity: [0, 1], duration: 600, delay: stagger(70)}, 1100);
  rows.forEach((x, i) => { const o = {v: 0}; tl.add(o, {v: x.v, duration: 1400, ease: 'out(3)', onUpdate: () => { x.n.textContent = Math.round(o.v).toLocaleString('ru-RU').replace(/ /g, ' '); }}, 200 + i * 70); });
  return {destroy() { anims.forEach(a => { try { a.revert(); } catch (e) {} }); host.innerHTML = ''; }};
}
function build(s) {
  if (s.inst) { try { s.inst.destroy(); } catch (e) {} s.inst = null; }
  s.inst = s.kind === 'cover' ? cover(s.demo) : s.kind === 'libs' ? libs(s.demo) : Combos[s.c.key](s.demo);
}
function destroy(s) { if (s && s.inst) { try { s.inst.destroy(); } catch (e) {} s.inst = null; } }

/* === АУЫСУЛАР (12) === */
const clear = (...els) => els.forEach(e => { ['transform', 'clipPath', 'opacity', 'filter', 'visibility', 'zIndex', 'transformOrigin'].forEach(p => { e.style[p] = ''; }); });
const tiles = (n, cls) => { ov.innerHTML = ''; return Array.from({length: n}, (_, i) => { const d = document.createElement('div'); d.style.position = 'absolute'; if (cls) d.className = cls; ov.appendChild(d); return d; }); };
const hide = e => { e.style.visibility = 'hidden'; }, show = e => { e.style.visibility = 'visible'; };
const TR = {
  stripes(A, B, done) {
    const n = 6, bars = tiles(n); bars.forEach((b, i) => Object.assign(b.style, {left: i * W / n + 'px', top: 0, width: W / n + 1 + 'px', height: H + 'px', background: PAL[i % PAL.length], transformOrigin: '50% 0%', transform: 'scaleY(0)'}));
    hide(B);
    createTimeline({onComplete: () => { ov.innerHTML = ''; done(); }})
      .add(bars, {scaleY: [0, 1], duration: 520, ease: 'inOut(3)', delay: stagger(60)}, 0)
      .call(() => { hide(A); show(B); bars.forEach(b => { b.style.transformOrigin = '50% 100%'; }); }, 840)
      .add(bars, {scaleY: [1, 0], duration: 560, ease: 'inOut(3)', delay: stagger(60)}, 860);
  },
  iris(A, B, done) {
    const o = {r: 0}; const ap = () => { B.style.clipPath = `circle(${o.r}px at 50% 50%)`; }; ap();
    createTimeline({onComplete: done}).add(o, {r: 1150, duration: 1100, ease: 'inOut(3)', onUpdate: ap}, 0)
      .add(A, {scale: [1, .86], filter: ['brightness(1)', 'brightness(.45)'], duration: 1100, ease: 'inOut(3)'}, 0);
  },
  push(A, B, done) {
    const bd = $('.demo', B);
    createTimeline({onComplete: () => { clear(bd); done(); }})
      .add(A, {x: [0, -W], scale: [1, .92], duration: 1100, ease: 'inOut(4)'}, 0)
      .add(B, {x: [W, 0], duration: 1100, ease: 'inOut(4)'}, 0)
      .add(bd, {x: [420, 0], duration: 1300, ease: 'out(4)'}, 0);
  },
  zoomThrough(A, B, done) {
    createTimeline({onComplete: done})
      .add(A, {scale: [1, 2.4], opacity: [1, 0], filter: ['blur(0px)', 'blur(14px)'], duration: 1000, ease: 'in(3)'}, 0)
      .add(B, {scale: [.72, 1], opacity: [0, 1], filter: ['blur(10px)', 'blur(0px)'], duration: 1000, ease: 'out(3)'}, 450);
  },
  cube(A, B, done) {
    stage.style.perspective = '2600px';
    utils.set([A, B], {transformOrigin: `50% 50% -${W / 2}px`});
    createTimeline({onComplete: () => { stage.style.perspective = ''; done(); }})
      .add(A, {rotateY: [0, -90], filter: ['brightness(1)', 'brightness(.4)'], duration: 1200, ease: 'inOut(3)'}, 0)
      .add(B, {rotateY: [90, 0], filter: ['brightness(.4)', 'brightness(1)'], duration: 1200, ease: 'inOut(3)'}, 0);
  },
  curtain(A, B, done) {
    const [t, b] = tiles(2); hide(B);
    Object.assign(t.style, {left: 0, top: 0, width: W + 'px', height: H / 2 + 2 + 'px', background: '#12161F', boxShadow: 'inset 0 -6px 0 #F4C95D'});
    Object.assign(b.style, {left: 0, top: H / 2 + 'px', width: W + 'px', height: H / 2 + 'px', background: '#12161F', boxShadow: 'inset 0 6px 0 #F4C95D'});
    createTimeline({onComplete: () => { ov.innerHTML = ''; done(); }})
      .add(t, {y: [-H / 2, 0], duration: 600, ease: 'in(3)'}, 0).add(b, {y: [H / 2, 0], duration: 600, ease: 'in(3)'}, 0)
      .add(ov, {x: [{to: 8, duration: 50}, {to: -6, duration: 50}, {to: 0, duration: 60}]}, 600)
      .call(() => { hide(A); show(B); }, 620)
      .add(t, {y: -H / 2, duration: 700, ease: 'inOut(3)'}, 800).add(b, {y: H / 2, duration: 700, ease: 'inOut(3)'}, 800);
  },
  diagonal(A, B, done) {
    const o = {x: -700}, [edge] = tiles(1);
    Object.assign(edge.style, {left: 0, top: '-100px', width: '26px', height: H + 200 + 'px', background: '#F4C95D', boxShadow: '0 0 40px #F4C95D', transform: 'skewX(-29deg)'});
    const ap = () => { B.style.clipPath = `polygon(0 0, ${o.x + 600}px 0, ${o.x}px 100%, 0 100%)`; edge.style.left = o.x + 286 + 'px'; };
    ap();
    createTimeline({onComplete: () => { ov.innerHTML = ''; done(); }}).add(o, {x: W + 40, duration: 1100, ease: 'inOut(3)', onUpdate: ap}, 0)
      .add(A, {x: [0, -160], duration: 1100, ease: 'inOut(3)'}, 0);
  },
  blob(A, B, done) {
    const o = {r: 0, t: 0}, n = 40;
    const ap = () => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = o.r * (1 + .14 * Math.sin(5 * a + o.t) + .08 * Math.sin(3 * a - 2 * o.t));
      pts.push(`${(960 + Math.cos(a) * rr).toFixed(1)}px ${(540 + Math.sin(a) * rr).toFixed(1)}px`); } B.style.clipPath = `polygon(${pts.join(',')})`; };
    ap();
    createTimeline({onComplete: done}).add(o, {r: 1500, t: 6, duration: 1300, ease: 'in(2)', onUpdate: ap}, 0)
      .add(A, {scale: [1, 1.08], filter: ['brightness(1)', 'brightness(.5)'], duration: 1300, ease: 'in(2)'}, 0);
  },
  tiles(A, B, done) {
    const C = 8, R = 4, tw = W / C, th = H / R, ts = tiles(C * R); hide(B);
    ts.forEach((t, i) => Object.assign(t.style, {left: (i % C) * tw + 'px', top: Math.floor(i / C) * th + 'px', width: tw + 1 + 'px', height: th + 1 + 'px', background: PAL[(i * 7) % PAL.length], transform: 'scale(0)'}));
    createTimeline({onComplete: () => { ov.innerHTML = ''; done(); }})
      .add(ts, {scale: [0, 1], rotate: [45, 0], duration: 420, ease: 'out(3)', delay: stagger(16, {from: 'random'})}, 0)
      .call(() => { hide(A); show(B); }, 960)
      .add(ts, {scale: [1, 0], rotate: [0, -45], duration: 420, ease: 'in(3)', delay: stagger(16, {from: 'random'})}, 980);
  },
  glitch(A, B, done) {
    hide(B);
    const jit = () => [{to: utils.random(-60, 60), duration: 40}, {to: utils.random(-60, 60), duration: 40}, {to: utils.random(-40, 40), duration: 40}, {to: 0, duration: 40}];
    createTimeline({onComplete: done})
      .add(A, {x: jit(), filter: [{to: 'hue-rotate(90deg) contrast(1.8) saturate(2)', duration: 80}, {to: 'hue-rotate(-60deg) contrast(1.4)', duration: 80}, {to: 'none', duration: 80}],
        clipPath: [{to: 'inset(10% 0 40% 0)', duration: 60}, {to: 'inset(50% 0 10% 0)', duration: 60}, {to: 'inset(0 0 0 0)', duration: 60}], ease: steps(2)}, 0)
      .call(() => { hide(A); show(B); }, 260)
      .add(B, {x: jit(), clipPath: [{to: 'inset(30% 0 30% 0)', duration: 60}, {to: 'inset(5% 0 60% 0)', duration: 60}, {to: 'inset(0% 0 0% 0)', duration: 60}],
        filter: [{to: 'hue-rotate(-90deg) contrast(1.6)', duration: 90}, {to: 'none', duration: 90}], ease: steps(2)}, 270);
  },
  flip(A, B, done) {
    stage.style.perspective = '2200px';
    A.style.transformOrigin = '50% 100%'; B.style.transformOrigin = '50% 0%';
    createTimeline({onComplete: () => { stage.style.perspective = ''; done(); }})
      .add(A, {rotateX: [0, 90], filter: ['brightness(1)', 'brightness(.3)'], duration: 900, ease: 'in(3)'}, 0)
      .add(B, {rotateX: [-90, 0], filter: ['brightness(.3)', 'brightness(1)'], duration: 1000, ease: 'out(3)'}, 450);
  },
  dot(A, B, done) {
    const [d] = tiles(1); hide(B);
    Object.assign(d.style, {left: '96px', top: '940px', width: '120px', height: '120px', marginLeft: '-60px', marginTop: '-60px', borderRadius: '50%', background: '#F4C95D', transform: 'scale(0)'});
    createTimeline({onComplete: () => { ov.innerHTML = ''; done(); }})
      .add(d, {scale: [0, 1.2, 1], duration: 380, ease: 'out(3)'}, 0)
      .add(d, {scale: 40, duration: 700, ease: 'in(3)'}, 380)
      .call(() => { hide(A); show(B); d.style.left = '960px'; d.style.top = '540px'; }, 1090)
      .add(d, {scale: [40, 0], opacity: [1, .6], duration: 800, ease: 'out(3)'}, 1100);
  },
};
const TKEYS = D.transitions.map(t => t.key), TNAME = Object.fromEntries(D.transitions.map(t => [t.key, t.title]));

/* === НАВИГАЦИЯ === */
let cur = -1, busy = false;
function hud(type) {
  if (!type || REDUCED) return; hudEl.innerHTML = `Ауысу · <b>${esc(TNAME[type])}</b>`;
  createTimeline().add(hudEl, {opacity: [0, 1], y: [-12, 0], duration: 400, ease: 'outExpo'}, 0).add(hudEl, {opacity: 0, duration: 500}, 2300);
}
function go(j, forceType) {
  if (busy || j === cur || j < 0 || j >= N) return;
  const A = cur >= 0 ? SL[cur] : null, B = SL[j];
  build(B); B.el.classList.add('active'); B.el.style.zIndex = 3;
  history.replaceState(null, '', '#' + (j + 1));
  if (!A || REDUCED) { if (A) { A.el.classList.remove('active'); destroy(A); } cur = j; animate(B.el, {opacity: [0, 1], duration: 500}); return; }
  A.el.style.zIndex = 2; busy = true;
  const type = forceType || TKEYS[(j - 1 + TKEYS.length) % TKEYS.length];
  const done = () => { A.el.classList.remove('active'); clear(A.el, B.el); destroy(A); busy = false; };
  TR[type](A.el, B.el, done); cur = j; hud(type);
}
const next = () => go(cur + 1), prev = () => go(cur - 1);
let auto = QS.get('auto') === '1', autoT = null;
const dwell = +(QS.get('dwell') || 7000);
function autoplay() { clearTimeout(autoT); if (!auto) return; autoT = setTimeout(() => { if (cur < N - 1) { next(); autoplay(); } else auto = false; }, dwell); }
addEventListener('keydown', e => {
  if (['ArrowRight', ' ', 'PageDown', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
  else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === 'Home') go(0); else if (e.key === 'End') go(N - 1);
  else if (e.key === 'r' || e.key === 'R') { if (cur >= 0) build(SL[cur]); }
  else if (e.key === 'i' || e.key === 'I') $$('.bar').forEach(b => b.classList.toggle('off'));
  else if (e.key === 'a' || e.key === 'A') { auto = !auto; autoplay(); }
  else if (e.key === 'f' || e.key === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});
let x0 = null;
addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive: true});
addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) (dx < 0 ? next : prev)(); x0 = null; });
$('.deck-viewport').addEventListener('click', e => { (e.clientX > innerWidth / 3 ? next : prev)(); });
const scale = () => { const f = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `translate(${(innerWidth - W * f) / 2}px,${(innerHeight - H * f) / 2}px) scale(${f})`; };
scale(); addEventListener('resize', scale);
window.LAB = {go, next, prev, get cur() { return cur; }, N, TKEYS};
document.fonts.ready.then(() => { const h = parseInt(location.hash.slice(1)) || 1; go(Math.min(Math.max(h - 1, 0), N - 1)); autoplay(); });
})();
