/* =====================================================================
   COMBOS — anime.js 4.5 комбо-кітапханасы (презентацияларға арналған)
   Әр комбо: Combos.<аты>(root, opts) → {tl, destroy}
     root — 1920×1080 өлшемді контейнер; комбо оның ішін өзі құрады.
     destroy() — барлық анимацияны тоқтатып, контейнерді тазалайды.
   Суреттер: window.COMBO_IMG = {cls: 'data:…', …}  (жоқ болса — градиент)
   Тәуелділік: anime.js 4.5 (UMD, global `anime`), Rubik + Caveat қаріптері.
   Лицензия: MIT. Авторы: x ≠ 0 жобасы.
   ===================================================================== */
(function (root) {
'use strict';
const A = root.anime;
const {animate, createTimeline, createTimer, stagger, splitText, scrambleText, svg, utils, spring, createLayout, steps} = A;
const P = {ink: '#12161F', ink2: '#1C2230', chalk: '#F5F0E6', yel: '#F4C95D', cor: '#F28B6C', min: '#8FD3B6', sky: '#9CCBEA',
  board: '#26443A', wood: '#C8925A', brick: '#B9573A', plaster: '#EFE4CF'};
const W = 1920, H = 1080, NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2;
let UID = 0;
const IMG = k => ((root.COMBO_IMG || {})[k]) || '';
const url = k => IMG(k) ? `url("${IMG(k)}")` : `linear-gradient(135deg,${P.board},${P.sky})`;

/* ---------------------------------------------------------------- көмекшілер */
function el(tag, cls, parent, style, text) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (style) Object.assign(e.style, style);
  if (text !== undefined) e.textContent = text; if (parent) parent.appendChild(e); return e;
}
function sv(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
  if (text !== undefined) e.textContent = text; if (parent) parent.appendChild(e); return e;
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
function kit(host) {
  const live = []; const keep = x => (live.push(x), x);
  host.innerHTML = ''; host.classList.add('cb-root');
  return {
    root: host, keep,
    a: (t, p) => keep(animate(t, p)),
    tl: p => keep(createTimeline(p)),
    timer: p => keep(createTimer(p)),
    destroy() { live.splice(0).forEach(x => { try { x.revert(); } catch (e) { try { x.pause(); } catch (_) {} } }); host.innerHTML = ''; host.removeAttribute('style'); },
  };
}
function bigText(parent, text, style) {
  return el('div', 'cb-t', parent, Object.assign({position: 'absolute', font: '800 96px/1 Rubik, sans-serif', color: P.chalk, whiteSpace: 'nowrap'}, style), text);
}
function chips(parent, text, style) { return el('div', 'cb-k', parent, Object.assign({position: 'absolute', font: '700 44px/1 Caveat, cursive', color: P.yel}, style), text); }
// Мәтін бөлігінің ішіндегі «сия» нүктесі (әріптің жуан сызығының ортасы) — зум осы нүктеге
function inkPoint(ch, fontPx, font = 'Rubik') {
  const c = document.createElement('canvas'); c.width = Math.ceil(fontPx * 1.4); c.height = Math.ceil(fontPx * 1.4);
  const g = c.getContext('2d'); g.font = `800 ${fontPx}px ${font}`; g.textBaseline = 'alphabetic';
  const m = g.measureText(ch), base = Math.round(fontPx * 1.1); g.fillText(ch, 0, base);
  const asc = m.actualBoundingBoxAscent || fontPx * .7, y = Math.round(base - asc * .5);
  const row = g.getImageData(0, y, c.width, 1).data; let best = null, s = -1;
  for (let x = 0; x <= c.width; x++) { const on = x < c.width && row[x * 4 + 3] > 140;
    if (on && s < 0) s = x; if (!on && s >= 0) { if (!best) best = [s, x]; s = -1; } }
  return best ? {dx: (best[0] + best[1]) / 2, dy: -(base - y), w: m.width} : {dx: m.width * .2, dy: -asc * .5, w: m.width};
}
// Мәтінді нүктелерге айналдыру (бөлшектерге арналған)
function textPoints(text, fontPx, step, cx = W / 2, base = 640) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.font = `800 ${fontPx}px Rubik`; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(text, cx, base);
  const d = g.getImageData(0, 0, W, H).data, pts = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
  return pts;
}

/* ---------------------------------------------------------------- стильдер (бір рет) */
const CSS = `
.cb-root{position:absolute;inset:0;overflow:hidden;font-family:Rubik,system-ui,sans-serif;color:${P.chalk};background:${P.ink}}
.cb-root *{box-sizing:border-box}
.cb-full{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:visible}
.cb-bg{position:absolute;inset:0;background-size:cover;background-position:center;will-change:transform}
.cb-glass{position:absolute;border-radius:28px;background:rgba(18,22,31,.72);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 24px 70px rgba(0,0,0,.35),inset 0 0 0 1.5px rgba(245,240,230,.12)}
.cb-bub{position:absolute;left:0;top:0;width:120px;height:120px;border-radius:50%;display:grid;place-items:center;font:800 54px/1 Rubik;color:${P.ink};will-change:transform}
.cb-acc{position:absolute;top:0;height:1080px;overflow:hidden}
.cb-acc .tab{position:absolute;left:0;top:0;font:800 44px/1 Rubik;color:${P.ink};white-space:nowrap;transform-origin:0 0}
.cb-acc .body{position:absolute;left:190px;top:170px;width:1180px;color:${P.ink}}
.cb-acc .body h3{font:800 92px/1 Rubik;margin:0 0 22px}
.cb-acc .body p{font:400 34px/1.35 Rubik;margin:0 0 26px;max-width:760px}
.cb-acc .pic{position:absolute;right:0;top:330px;width:640px;height:360px;border-radius:26px;background-size:cover;background-position:center;box-shadow:0 30px 60px rgba(0,0,0,.25)}
.cb-hex{position:absolute;background-repeat:no-repeat;background-size:1920px 1080px;will-change:transform}
.cb-col{position:absolute;overflow:hidden;height:300px;width:190px}
.cb-col .strip{position:absolute;left:0;top:0;width:100%;font:800 300px/300px Rubik;text-align:center;color:${P.chalk}}
.cb-node{position:absolute;width:260px;height:260px;border-radius:50%;background-size:cover;background-position:center;box-shadow:0 0 0 7px ${P.chalk},0 22px 60px rgba(0,0,0,.45)}
.cb-node b{position:absolute;left:50%;top:290px;transform:translateX(-50%);font:700 34px/1 Rubik;white-space:nowrap;color:${P.chalk};text-shadow:0 2px 12px rgba(0,0,0,.6)}
.cb-tile{position:absolute;background:${P.chalk};box-shadow:inset 0 0 0 2px rgba(18,22,31,.12);will-change:transform}
.cb-stripe{position:absolute;top:-120px;height:1320px;overflow:hidden;transform:skewX(-14deg);box-shadow:0 30px 70px rgba(0,0,0,.4)}
.cb-stripe i{position:absolute;inset:0 -260px;background-size:cover;background-position:center;transform:skewX(14deg)}
.cb-cloud{position:absolute;border-radius:50%;filter:blur(10px);background:radial-gradient(circle at 30% 40%,rgba(255,255,255,.95),rgba(255,255,255,0) 60%),radial-gradient(circle at 65% 55%,rgba(255,250,240,.85),rgba(255,255,255,0) 58%),radial-gradient(circle at 45% 70%,rgba(255,245,235,.8),rgba(255,255,255,0) 55%)}
.cb-card3{position:absolute;width:360px;height:400px;transform-style:preserve-3d}
.cb-card3 .f,.cb-card3 .b{position:absolute;inset:0;border-radius:26px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}
.cb-card3 .f{background:radial-gradient(circle at 30% 20%,#2A3348,${P.ink});box-shadow:inset 0 0 0 2px rgba(245,240,230,.14);display:grid;place-items:center;font:800 150px/1 Rubik;color:rgba(245,240,230,.9)}
.cb-card3 .b{transform:rotateY(180deg);background-size:cover;background-position:center}
.cb-card3 .b span{position:absolute;left:24px;bottom:22px;font:800 36px/1 Rubik;color:${P.chalk};text-shadow:0 2px 14px rgba(0,0,0,.7)}
.cb-card3 .shine{position:absolute;top:-20%;bottom:-20%;width:40%;left:0;background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.55),rgba(255,255,255,0));transform:translateX(-160%) skewX(-12deg)}
.cb-dot{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:rgba(245,240,230,.55)}
.cb-num{position:absolute;width:200px;height:260px;border-radius:28px;display:grid;place-items:center;font:800 150px/1 Rubik;color:${P.ink};background:${P.chalk};transform-origin:50% 100%;box-shadow:0 18px 40px rgba(0,0,0,.25)}
.cb-shadow{position:absolute;height:34px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.45),rgba(0,0,0,0))}
.cb-blob{position:absolute;width:820px;height:820px;filter:blur(70px);mix-blend-mode:screen;border-radius:42% 58% 70% 30%/45% 45% 55% 55%}
.cb-ccard{position:absolute;width:420px;height:240px;border-radius:24px;background-size:cover;background-position:center;box-shadow:0 20px 50px rgba(0,0,0,.4)}
.cb-par{position:absolute;width:18px;height:18px;border-radius:5px;left:0;top:0}
`;
function ensureCSS() { if (document.getElementById('combo-css')) return; const s = document.createElement('style'); s.id = 'combo-css'; s.textContent = CSS; document.head.appendChild(s); }

const Combos = {};

/* =====================================================================
   1 · МӘТІН-ТЕРЕЗЕ → ӘРІПТІҢ ІШІНЕ ЗУМ (knockout zoom)
   Шабыт: ROME / CHINA / DUBAI тәсілі (PowerPoint: Merge Shapes → Subtract + Morph)
   ===================================================================== */
Combos.knockoutZoom = (host, o = {}) => {
  ensureCSS(); const k = kit(host), id = 'ko' + (++UID), word = o.word || 'x≠0', fs = o.size || 600, base = o.base || 760;
  host.style.background = P.chalk;
  const bg = el('div', 'cb-bg', host, {backgroundImage: url(o.img || 'cls')});
  const s = sv('svg', {viewBox: '0 0 1920 1080', class: 'cb-full'}, host);
  const m = sv('mask', {id, maskUnits: 'userSpaceOnUse', x: -20000, y: -20000, width: 60000, height: 60000}, sv('defs', {}, s));
  sv('rect', {x: -20000, y: -20000, width: 60000, height: 60000, fill: '#fff'}, m);
  const meas = sv('text', {x: 0, y: 0, 'font-size': fs, 'font-family': 'Rubik', 'font-weight': 800}, s, word);
  const total = meas.getComputedTextLength(), x0 = (W - total) / 2, chars = [...word];
  const ext = chars.map((c, i) => meas.getExtentOfChar(i)); meas.remove();
  const letters = chars.map((c, i) => { const t = sv('text', {x: x0 + ext[i].x, y: base, 'font-size': fs, 'font-family': 'Rubik', 'font-weight': 800, fill: '#000'}, m, c);
    t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 100%'; return t; });
  const panel = sv('g', {}, s); sv('rect', {x: -20000, y: -20000, width: 60000, height: 60000, fill: P.chalk, mask: `url(#${id})`}, panel);
  const zi = o.zoomChar ?? chars.length - 1, ip = inkPoint(chars[zi], fs);
  const ox = x0 + ext[zi].x + ip.dx, oy = base + ip.dy;
  panel.style.transformOrigin = `${ox}px ${oy}px`;
  const kick = chips(host, o.kicker || 'Мәтін — терезе', {left: '160px', top: '150px', color: P.board});
  const ttl = bigText(host, o.title || 'Әріптің ішіне кірдік', {left: '160px', top: o.titleTop || '680px', fontSize: '84px', opacity: 0, textShadow: '0 6px 30px rgba(0,0,0,.55)'});
  const tw = splitText(ttl, {words: true}).words;
  const tl = k.tl({defaults: {ease: 'outExpo'}});
  tl.add(bg, {scale: [1.35, 1], duration: 5200, ease: 'inOut(2)'}, 0)
    .add(letters, {translateY: [420, 0], scale: [.4, 1], opacity: [0, 1], duration: 1300, delay: stagger(110)}, 150)
    .add(kick, {opacity: [0, 1], x: [-40, 0], duration: 900}, 300)
    .add(kick, {opacity: 0, duration: 400}, 2300)
    .add(panel, {scale: [1, o.zoom || 70], duration: 1700, ease: 'in(4)'}, 2400)
    .call(() => { panel.style.display = 'none'; }, 4120)
    .add(ttl, {opacity: [0, 1], duration: 10}, 4000)
    .add(tw, {y: [70, 0], opacity: [0, 1], filter: ['blur(10px)', 'blur(0px)'], duration: 1000, delay: stagger(90)}, 4050);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   2 · ТЕРЕҢДІК ҚАБАТТАРЫ (parallax depth + depth of field)
   Шабыт: «Blueberry» Morph (34,7 млн қаралым) — жақын нысан үлкен әрі бұлыңғыр
   ===================================================================== */
Combos.parallaxDepth = (host, o = {}) => {
  ensureCSS(); const k = kit(host), r = rng(o.seed || 7);
  host.style.background = `radial-gradient(120% 90% at 50% 35%, #2A3450, ${P.ink})`;
  const glyphs = Array.from(o.glyphs || '0123456789+−×÷=≠x√%π');
  const cols = [P.yel, P.cor, P.min, P.sky, P.chalk];
  const L = [{n: 18, s: [.32, .5], blur: 3.2, op: .55, sp: 22, sw: 18}, {n: 12, s: [.75, 1.05], blur: 0, op: 1, sp: 48, sw: 36}, {n: 7, s: [1.8, 2.5], blur: 11, op: .92, sp: 120, sw: 90}];
  const items = [], cam = {gx: 0, gy: 0, pull: 1};
  L.forEach((l, li) => {
    for (let i = 0; i < l.n; i++) {
      const c = pick(cols, r), e = el('div', 'cb-bub', host, {background: `radial-gradient(circle at 32% 28%, #fff8, ${c} 42%, ${c})`, filter: l.blur ? `blur(${l.blur}px)` : '', opacity: 0, zIndex: li * 10}, pick(glyphs, r));
      items.push({e, li, l, x: r() * W, y: r() * (H + 400) - 200, s: lerp(l.s[0], l.s[1], r()), ph: r() * TAU, f: .25 + r() * .5});
    }
    if (li === 1) {
      const t = bigText(host, o.title || 'Тереңдік', {left: '50%', top: '42%', transform: 'translate(-50%,-50%)', fontSize: '170px', zIndex: 15, opacity: 0});
      items.title = t;
    }
  });
  const sub = el('div', '', host, {position: 'absolute', left: '50%', top: '58%', transform: 'translateX(-50%)', font: '700 52px/1 Caveat', color: P.yel, zIndex: 15, opacity: 0}, o.sub || 'алыс · орта · жақын');
  const t0 = performance.now();
  k.timer({onUpdate: () => {
    const t = (performance.now() - t0) / 1000;
    for (const it of items) {
      const d = [0.35, 1, 2.6][it.li], y = ((it.y - t * it.l.sp) % (H + 400) + H + 400) % (H + 400) - 200;
      const x = it.x + Math.sin(t * it.f + it.ph) * it.l.sw + cam.gx * d;
      const sc = it.s * (1 + (cam.pull - 1) * d * .6);
      it.e.style.transform = `translate(${x - 60}px,${y - 60 + cam.gy * d}px) rotate(${Math.sin(t * .6 + it.ph) * 18}deg) scale(${sc})`;
    }
  }});
  const tl = k.tl();
  tl.add(cam, {pull: [2.4, 1], duration: 2200, ease: 'out(4)'}, 0)
    .add(items.map(i => i.e), {opacity: (e, i) => [0, items[i].l.op], duration: 1200, delay: stagger(25, {from: 'random'}), ease: 'out(2)'}, 0)
    .add(items.title, {opacity: [0, 1], scale: [.7, 1], filter: ['blur(16px)', 'blur(0px)'], duration: 1400, ease: 'outExpo'}, 700)
    .add(sub, {opacity: [0, 1], y: [20, 0], duration: 900, ease: 'outExpo'}, 1300);
  k.a(cam, {gx: [-80, 80], gy: [-20, 20], duration: 4200, ease: 'inOutSine', alternate: true, loop: true, delay: 1500});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   3 · БЕТБЕЛГІ-АККОРДЕОН (accordion tabs)
   Шабыт: A-B-C-D Morph (9,9 млн), PowerPoint School бетбелгілері (12,6 млн), Бразилия жолақтары (372 мың ♥)
   ===================================================================== */
Combos.accordionTabs = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  const D = o.items || [
    {t: 'Шарт', p: 'Не болды? Айару жауапты біледі, бірақ айта алмайды.', img: 'aya', c: P.yel, ic: '●'},
    {t: 'Белгісіз', p: 'Сөйлеу қиындығы ойлау қиындығына тең емес.', img: 'win', c: P.cor, ic: '▲'},
    {t: 'Формула', p: 'UDL: қатысу, ұсыну, әрекет және білдіру.', img: 'board', c: P.min, ic: '■'},
    {t: 'Шешу', p: 'Карточка, сан түзуі, күту уақыты, жұп.', img: 'pair', c: P.sky, ic: '◆'}];
  const n = D.length, cw = 150, ew = W - (n - 1) * cw;
  const panels = D.map((d, i) => {
    const p = el('div', 'cb-acc', host, {left: i * cw + 'px', width: cw + 'px', background: d.c});
    const tab = el('div', 'tab', p, {}, `${d.ic}  ${d.t}`);
    const body = el('div', 'body', p, {opacity: 0});
    el('h3', '', body, {}, d.t); el('p', '', body, {}, d.p);
    const pic = el('div', 'pic', body, {backgroundImage: url(d.img)});
    return {p, tab, body, pic, h: body.querySelector('h3'), para: body.querySelector('p')};
  });
  const tabPos = (on) => on ? {rotate: 0, x: 190, y: 90, scale: 1} : {rotate: -90, x: 52, y: 880, scale: 1};
  panels.forEach(pn => utils.set(pn.tab, tabPos(false)));
  let cur = -1;
  const go = j => {
    const tl = k.tl({defaults: {duration: 1100, ease: 'inOut(4)'}});
    panels.forEach((pn, i) => {
      const left = i <= j ? i * cw : ew + (i - 1) * cw, width = i === j ? ew : cw;
      tl.add(pn.p, {left, width}, 0);
      if (i === j) {
        tl.add(pn.tab, {...tabPos(true), ease: 'out(4)', duration: 900}, 250)
          .add([pn.h, pn.para], {opacity: [0, 1], y: [50, 0], filter: ['blur(10px)', 'blur(0px)'], duration: 800, ease: 'outExpo', delay: stagger(120)}, 500)
          .add(pn.body, {opacity: [0, 1], duration: 200}, 450)
          .add(pn.pic, {clipPath: ['inset(0 100% 0 0 round 26px)', 'inset(0 0% 0 0 round 26px)'], scale: [1.15, 1], duration: 1100, ease: 'inOut(3)'}, 600);
      } else if (i === cur) {
        tl.add(pn.body, {opacity: 0, duration: 300, ease: 'out(2)'}, 0).add(pn.tab, {...tabPos(false), duration: 900}, 100);
      }
    });
    cur = j;
  };
  const tl = k.tl(); tl.call(() => go(0), 100);
  let j = 0; k.timer({duration: 3000, loop: true, onLoop: () => { j = (j + 1) % n; go(j); }});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   4 · ҰЯШЫҚТЫ МАСКА (hexagon mosaic over a moving image)
   Шабыт: «Tigers in the wild» алтыбұрыштар (216 мың ♥), үшбұрышты мозаика (10 мың ♥)
   ===================================================================== */
Combos.mosaicMask = (host, o = {}) => {
  ensureCSS(); const k = kit(host), R = o.r || 112, w = Math.sqrt(3) * R, h = 2 * R, g = 4.5;
  host.style.background = o.frame || P.cor;
  const poly = `polygon(50% ${g}%, ${100 - g * .87}% ${25 + g * .5}%, ${100 - g * .87}% ${75 - g * .5}%, 50% ${100 - g}%, ${g * .87}% ${75 - g * .5}%, ${g * .87}% ${25 + g * .5}%)`;
  const cells = []; let rows = 0, cols = 0;
  for (let ry = 0, y = -R * .5; y < H + R; ry++, y += 1.5 * R) {
    rows++; let c = 0;
    for (let x = (ry % 2 ? w / 2 : 0) - w / 2; x < W + w; x += w) {
      const e = el('div', 'cb-hex', host, {left: x - w / 2 + 'px', top: y - h / 2 + 'px', width: w + 'px', height: h + 'px', clipPath: poly,
        backgroundImage: url(o.img || 'cls'), backgroundPosition: `calc(var(--px) - ${x - w / 2}px) calc(var(--py) - ${y - h / 2}px)`});
      cells.push({e, x, y, ry}); c++;
    }
    cols = Math.max(cols, c);
  }
  host.style.setProperty('--px', '0px'); host.style.setProperty('--py', '0px');
  const card = el('div', 'cb-glass', host, {left: '120px', top: '110px', padding: '30px 44px', opacity: 0});
  el('div', '', card, {font: '800 84px/1 Rubik', color: P.chalk}, o.title || 'Ұяшықтар');
  el('div', '', card, {font: '700 44px/1.1 Caveat', color: P.yel, marginTop: '10px'}, o.sub || 'сурет — ара ұясының ішінде');
  const cx = W / 2, cy = H / 2, dist = c => Math.hypot(c.x - cx, c.y - cy);
  const tl = k.tl();
  tl.add(cells.map(c => c.e), {scale: [0, 1], rotate: [-60, 0], opacity: [0, 1], duration: 900, ease: spring({bounce: .35, duration: 900}),
      delay: (e, i) => dist(cells[i]) * 1.1}, 0)
    .add(card, {opacity: [0, 1], x: [-60, 0], duration: 900, ease: 'outExpo'}, 1500);
  k.a(host, {'--px': ['0px', '-150px'], '--py': ['0px', '-50px'], duration: 9000, ease: 'inOutSine', alternate: true, loop: true});
  k.timer({duration: 3400, loop: true, onLoop: () => {
    k.a(cells.map(c => c.e), {scale: [{to: 1.1, duration: 260, ease: 'out(2)'}, {to: 1, duration: 520, ease: 'inOut(2)'}],
      filter: [{to: 'brightness(1.35)', duration: 260}, {to: 'brightness(1)', duration: 520}], delay: (e, i) => cells[i].x * .45});
  }});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   5 · САНАУЫШ-БАРАБАН (odometer + scramble label + photo crossfade)
   Шабыт: «Numbers animation in PowerPoint» (6 млн), Canva санауышы
   ===================================================================== */
function odometer(k, parent, digits, opt = {}) {
  const dh = opt.dh || 300, dw = opt.dw || 190, cols = [];
  const wrap = el('div', '', parent, Object.assign({position: 'absolute', height: dh + 'px', width: digits * dw + 'px'}, opt.style || {}));
  for (let i = 0; i < digits; i++) {
    const c = el('div', 'cb-col', wrap, {left: i * dw + 'px', height: dh + 'px', width: dw + 'px'});
    const s = el('div', 'strip', c, {font: `800 ${dh}px/${dh}px Rubik`, color: opt.color || P.chalk});
    s.innerHTML = Array.from({length: 30}, (_, n) => `<div>${n % 10}</div>`).join('');
    cols.push({s, pos: 0});
  }
  const set = (value, tl, at = 0, d0 = 900) => {
    const str = String(value).padStart(digits, '0');
    cols.forEach((c, i) => {
      const dgt = +str[i], cur = c.pos % 10; utils.set(c.s, {y: -cur * dh}); c.pos = cur;
      const spins = (i === digits - 1 ? 2 : i === digits - 2 ? 1 : (dgt !== cur ? 1 : 0));
      const target = Math.min(29, spins * 10 + dgt) + (spins === 0 && dgt < cur ? 10 : 0);
      const dur = d0 + i * 260;
      tl.add(c.s, {y: [{to: -target * dh + 26, duration: dur, ease: 'inOut(3)'}, {to: -target * dh, duration: 320, ease: 'outBack(2.2)'}],
        filter: [{to: 'blur(9px)', duration: dur * .45}, {to: 'blur(0px)', duration: dur * .55 + 320}]}, at);
      c.pos = target;
    });
  };
  return {wrap, set};
}
Combos.odometer = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  const steps_ = o.steps || [[1934, 'Выготский: «Ойлау және сөйлеу»', 'board'], [1984, 'CAST ұйымы құрылды', 'cls'], [2002, 'Роуз бен Мейердің кітабы', 'note'], [2018, 'UDL 2.2', 'desk'], [2024, 'UDL 3.0', 'aya']];
  const bgA = el('div', 'cb-bg', host, {opacity: 0}), bgB = el('div', 'cb-bg', host, {opacity: 0});
  el('div', '', host, {position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(12,14,20,.92) 0%, rgba(12,14,20,.55) 60%, rgba(12,14,20,.25) 100%)'});
  const od = odometer(k, host, 4, {style: {left: '150px', top: '330px'}});
  const lab = el('div', '', host, {position: 'absolute', left: '160px', top: '680px', font: '700 64px/1.1 Caveat', color: P.yel, width: '1200px'}, '');
  const kick = el('div', '', host, {position: 'absolute', left: '160px', top: '230px', font: '700 30px/1 Rubik', letterSpacing: '.18em', color: 'rgba(245,240,230,.75)'}, 'ЖЫЛ');
  const track = el('div', '', host, {position: 'absolute', left: '160px', top: '820px', width: '1100px', height: '4px', background: 'rgba(245,240,230,.2)', borderRadius: '2px'});
  const fill = el('div', '', track, {position: 'absolute', left: 0, top: 0, height: '4px', width: '0px', background: P.yel, borderRadius: '2px'});
  const dots = steps_.map((s, i) => el('div', '', track, {position: 'absolute', left: (i / (steps_.length - 1)) * 1100 - 9 + 'px', top: '-7px', width: '18px', height: '18px', borderRadius: '50%', background: P.ink, boxShadow: `0 0 0 3px ${P.chalk}`}));
  let i = 0, front = bgA, back = bgB;
  const step = () => {
    const [v, text, img] = steps_[i], tl = k.tl();
    back.style.backgroundImage = url(img); [front, back] = [back, front];
    tl.add(front, {opacity: [0, 1], scale: [1.18, 1.04], duration: 1600, ease: 'out(3)'}, 0).add(back, {opacity: 0, duration: 900}, 300);
    od.set(v, tl, 0);
    tl.add(lab, {innerHTML: scrambleText({text, chars: '0123456789x≠+−', revealRate: 40})}, 150)
      .add(fill, {width: (i / (steps_.length - 1)) * 1100, duration: 1200, ease: 'inOut(3)'}, 0)
      .add(dots[i], {background: P.yel, scale: [{to: 1.8, duration: 220}, {to: 1, duration: 500}], duration: 700}, 900)
      .add(od.wrap, {scale: [{to: 1.06, duration: 200}, {to: 1, duration: 600, ease: 'outElastic(1,.5)'}]}, 1500);
    i = (i + 1) % steps_.length;
    if (i === 0) tl.add(dots, {background: P.ink, duration: 10}, 2800).add(fill, {width: 0, duration: 10}, 2800);
  };
  const tl = k.tl(); tl.add(kick, {opacity: [0, 1], y: [20, 0], duration: 800, ease: 'outExpo'}, 0).call(step, 100);
  k.timer({duration: 3000, loop: true, delay: 100, onLoop: step});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   6 · ХАБ: ШЕҢБЕРДЕН ІШКЕ КІРУ (slide zoom hub)
   Шабыт: «PowerPoint Slide Zoom» (6,8 млн) — бөлімдер шеңбер ішінде
   ===================================================================== */
Combos.hubZoom = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  const N = o.nodes || [['aya', 'Айару'], ['board', 'Тақта'], ['win', 'Терезе'], ['clock', 'Сағат']];
  const bg = el('div', 'cb-bg', host, {backgroundImage: url(o.bg || 'night'), filter: 'blur(14px) brightness(.45)', transform: 'scale(1.1)'});
  const s = sv('svg', {viewBox: '0 0 1920 1080', class: 'cb-full'}, host);
  const orbit = sv('ellipse', {cx: 960, cy: 540, rx: 560, ry: 300, fill: 'none', stroke: 'rgba(245,240,230,.35)', 'stroke-width': 3, 'stroke-dasharray': '6 16'}, s);
  const hub = el('div', '', host, {position: 'absolute', left: '835px', top: '415px', width: '250px', height: '250px', borderRadius: '50%', display: 'grid', placeItems: 'center',
    background: P.yel, color: P.ink, font: '800 74px/1 Rubik', boxShadow: '0 0 0 14px rgba(244,201,93,.25), 0 0 90px rgba(244,201,93,.45)'}, o.hub || 'x≠0');
  const pos = N.map((n, i) => { const a = -Math.PI / 2 + i * TAU / N.length + Math.PI / 4; return [960 + Math.cos(a) * 560, 540 + Math.sin(a) * 300]; });
  const nodes = N.map(([img, name], i) => { const e = el('div', 'cb-node', host, {left: pos[i][0] - 130 + 'px', top: pos[i][1] - 130 + 'px', backgroundImage: url(img)}); el('b', '', e, {}, name); return e; });
  const zoom = el('div', '', host, {position: 'absolute', inset: 0, overflow: 'hidden', visibility: 'hidden'});
  const zimg = el('div', 'cb-bg', zoom, {});
  el('div', '', zoom, {position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(10,12,18,.85), rgba(10,12,18,0) 55%)'});
  const zt = bigText(zoom, '', {left: '160px', bottom: '340px', fontSize: '120px'}), zs = el('div', '', zoom, {position: 'absolute', left: '165px', bottom: '280px', font: '700 46px/1 Caveat', color: P.yel}, 'бөлімнің ішіндеміз');
  const tl = k.tl();
  tl.add(hub, {scale: [0, 1], duration: 900, ease: 'outBack(1.8)'}, 0)
    .add(nodes, {scale: [0, 1], opacity: [0, 1], duration: 900, ease: spring({bounce: .4, duration: 900}), delay: stagger(140)}, 300);
  k.a(orbit, {strokeDashoffset: [0, -440], duration: 6000, ease: 'linear', loop: true});
  let j = 0;
  const cycle = () => {
    const [x, y] = pos[j], [img, name] = N[j], t = k.tl({defaults: {ease: 'inOut(4)'}});
    zimg.style.backgroundImage = url(img); zt.textContent = name; const st = {r: 130, s: 1.7};
    const apply = () => { zoom.style.clipPath = `circle(${st.r}px at ${x}px ${y}px)`; zimg.style.transform = `scale(${st.s})`; zimg.style.transformOrigin = `${x}px ${y}px`; };
    t.call(() => { zoom.style.visibility = 'visible'; apply(); }, 0)
      .add(nodes.filter((_, i) => i !== j).concat(hub), {scale: .6, opacity: .15, filter: 'blur(6px)', duration: 900}, 0)
      .add(st, {r: 1400, s: 1, duration: 1300, onUpdate: apply}, 100)
      .add([zt, zs], {opacity: [0, 1], y: [50, 0], duration: 800, ease: 'outExpo', delay: stagger(120)}, 1100)
      .add([zt, zs], {opacity: 0, duration: 400}, 2600)
      .add(st, {r: 130, s: 1.7, duration: 1100, onUpdate: apply}, 2800)
      .call(() => { zoom.style.visibility = 'hidden'; }, 3900)
      .add(nodes.filter((_, i) => i !== j).concat(hub), {scale: 1, opacity: 1, filter: 'blur(0px)', duration: 800}, 3500)
      .add(nodes[j], {boxShadow: [`0 0 0 7px ${P.chalk},0 22px 60px rgba(0,0,0,.45)`, `0 0 0 7px ${P.yel},0 22px 60px rgba(0,0,0,.45)`], scale: [{to: 1.15, duration: 200}, {to: 1, duration: 500}]}, 3900);
    j = (j + 1) % N.length;
  };
  tl.call(cycle, 1800); k.timer({duration: 4600, loop: true, delay: 1800, onLoop: cycle});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   7 · АЙНАЛМАЛЫ ДӨҢГЕЛЕК (wheel menu: ring rotate + counter-rotate icons + center swap)
   Шабыт: «Pumpkins · Costumes · Candy» дөңгелегі (48 мың ♥)
   ===================================================================== */
Combos.wheelMenu = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  const items = o.items || [['+', 'Қосу', 'board'], ['−', 'Азайту', 'note'], ['×', 'Көбейту', 'desk'], ['÷', 'Бөлу', 'aya'], ['=', 'Теңдік', 'pair'], ['≠', 'Теңсіздік', 'tri']];
  const n = items.length, cx = 1260, cy = 540, R1 = 250, R2 = 430, seg = 360 / n, gap = 1.6;
  host.style.background = `radial-gradient(90% 90% at 65% 50%, #232B3D, ${P.ink})`;
  const s = sv('svg', {viewBox: '0 0 1920 1080', class: 'cb-full'}, host);
  const ring = sv('g', {}, s); ring.style.transformOrigin = `${cx}px ${cy}px`;
  const cols = [P.yel, P.min, P.sky, P.cor, P.wood, P.plaster];
  const arc = (a0, a1) => { const p = (r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
    const [x1, y1] = p(R2, a0), [x2, y2] = p(R2, a1), [x3, y3] = p(R1, a1), [x4, y4] = p(R1, a0);
    return `M${x1} ${y1} A${R2} ${R2} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${R1} ${R1} 0 0 0 ${x4} ${y4} Z`; };
  const segs = items.map(([ic], i) => {
    const a0 = -90 + i * seg + gap, a1 = -90 + (i + 1) * seg - gap, mid = (a0 + a1) / 2 * Math.PI / 180;
    const g = sv('g', {}, ring); const p = sv('path', {d: arc(a0, a1), fill: cols[i % cols.length], 'fill-opacity': .28}, g);
    const t = sv('text', {x: cx + (R1 + R2) / 2 * Math.cos(mid), y: cy + (R1 + R2) / 2 * Math.sin(mid) + 26, 'text-anchor': 'middle', 'font-size': 76, 'font-family': 'Rubik', 'font-weight': 800, fill: P.chalk}, g, ic);
    t.style.transformBox = 'fill-box'; t.style.transformOrigin = '50% 50%';
    return {g, p, t, mid, dx: Math.cos(mid) * 26, dy: Math.sin(mid) * 26};
  });
  const ptr = sv('path', {d: `M${cx} ${cy - R2 - 50} l-26 -40 h52 Z`, fill: P.yel}, s);
  const center = el('div', '', host, {position: 'absolute', left: cx - R1 + 14 + 'px', top: cy - R1 + 14 + 'px', width: (R1 - 14) * 2 + 'px', height: (R1 - 14) * 2 + 'px', borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 6px ${P.chalk}`});
  const cA = el('div', 'cb-bg', center), cB = el('div', 'cb-bg', center, {opacity: 0});
  const title = bigText(host, '', {left: '150px', top: '400px', fontSize: '130px'}), kick = chips(host, o.kicker || 'Амалдар дөңгелегі', {left: '155px', top: '320px'});
  let cur = 0, rot = 0, front = cA, back = cB;
  const show = (i, first) => {
    const t = k.tl({defaults: {duration: 1100, ease: 'outBack(1.4)'}});
    const target = -(i * seg + seg / 2);   // белсенді сегмент — жоғарыда (меңзердің астында)
    let dr = target - rot; while (dr > 0) dr -= 360; if (!first && dr === 0) dr = -360; rot += dr;
    t.add(ring, {rotate: rot}, 0).add(segs.map(sg => sg.t), {rotate: -rot}, 0);
    segs.forEach((sg, k_) => { const on = k_ === i;
      t.add(sg.p, {fillOpacity: on ? 1 : .28, duration: 600, ease: 'out(2)'}, on ? 500 : 0)
       .add(sg.g, {translateX: on ? sg.dx : 0, translateY: on ? sg.dy : 0, duration: 700, ease: 'outBack(2)'}, on ? 600 : 0)
       .add(sg.t, {fill: on ? P.ink : P.chalk, duration: 300}, on ? 600 : 0); });
    back.style.backgroundImage = url(items[i][2]); [front, back] = [back, front];
    t.add(front, {opacity: [0, 1], scale: [1.3, 1], duration: 900, ease: 'out(3)'}, 300).add(back, {opacity: 0, duration: 600}, 500);
    title.textContent = items[i][1]; const ch = splitText(title, {chars: true}).chars;
    t.add(ch, {y: [90, 0], opacity: [0, 1], rotate: [12, 0], duration: 800, ease: 'outExpo', delay: stagger(35)}, 500);
    cur = i;
  };
  const tl = k.tl();
  tl.add(ring, {scale: [.4, 1], opacity: [0, 1], duration: 1100, ease: 'outBack(1.4)'}, 0).add(kick, {opacity: [0, 1], x: [-40, 0], duration: 800, ease: 'outExpo'}, 300)
    .call(() => show(0, true), 200);
  k.timer({duration: 2400, loop: true, delay: 200, onLoop: () => show((cur + 1) % n)});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   8 · ҰШАҚ ҰШЫП ӨТЕДІ (motion path + bank + perspective scale + trail + clouds)
   Шабыт: 3D ұшақ Morph (33 мың ♥), Бірінші дүниежүзілік соғыс ұшақтары (1,95 млн ♥)
   ===================================================================== */
Combos.flyby = (host, o = {}) => {
  ensureCSS(); const k = kit(host), r = rng(11);
  host.style.background = `linear-gradient(180deg, #7FB3DE 0%, ${P.sky} 45%, ${P.plaster} 100%)`;
  const clouds = Array.from({length: 9}, (_, i) => { const sc = .5 + r() * 1.3, e = el('div', 'cb-cloud', host, {width: 420 * sc + 'px', height: 170 * sc + 'px', opacity: .55 + r() * .4});
    return {e, x: r() * (W + 600) - 300, y: 80 + r() * 760, sp: 20 + sc * 45}; });
  const s = sv('svg', {viewBox: '0 0 1920 1080', class: 'cb-full'}, host);
  const d1 = 'M -260 860 C 320 900, 560 240, 980 420 S 1560 860, 2200 220';
  const path = sv('path', {d: d1, fill: 'none', stroke: 'none'}, s);
  const trail = sv('path', {d: d1, fill: 'none', stroke: 'rgba(255,255,255,.85)', 'stroke-width': 5, 'stroke-linecap': 'round'}, s);
  const path2 = sv('path', {d: d1, fill: 'none', stroke: 'none', transform: 'translate(-140 110)'}, s);
  const plane = (scale) => { const g = sv('g', {}, s); const p = sv('g', {transform: `scale(${scale})`}, g);
    sv('path', {d: 'M-70 -6 L72 0 L-70 46 L-38 4 Z', fill: P.chalk, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round'}, p);
    sv('path', {d: 'M-70 -6 L72 0 L-38 4 Z', fill: P.cor, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round'}, p);
    sv('path', {d: 'M-38 4 L72 0 L-30 26 Z', fill: '#E3D7C4', stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round'}, p);
    return {g, p}; };
  const p1 = plane(1.7), p2 = plane(1.05);
  const front = Array.from({length: 2}, (_, i) => { const e = el('div', 'cb-cloud', host, {width: '900px', height: '330px', opacity: .9}); return {e, x: i ? 1500 : -300, y: i ? 760 : 820, sp: 160}; });
  const ttl = bigText(host, o.title || 'Ұшып өту', {left: '160px', top: '170px', fontSize: '130px', color: P.ink, opacity: 0});
  const sub = el('div', '', host, {position: 'absolute', left: '165px', top: '320px', font: '700 50px/1 Caveat', color: P.brick, opacity: 0}, 'жол + бұрылыс + жақындау + із');
  const t0 = performance.now();
  k.timer({onUpdate: () => { const t = (performance.now() - t0) / 1000;
    for (const c of clouds.concat(front)) c.e.style.transform = `translate(${((c.x + t * c.sp) % (W + 1000)) - 500}px, ${c.y}px)`; }});
  const fly = (tl, at) => {
    const dr = svg.createDrawable(trail);
    tl.add(p1.g, {...svg.createMotionPath(path), duration: 3600, ease: 'inOut(1.6)'}, at)
      .add(p1.p, {scale: [{from: .7, to: 1.6, duration: 1800, ease: 'inOut(2)'}, {to: .9, duration: 1800, ease: 'inOut(2)'}],
        scaleY: [{to: .78, duration: 900}, {to: 1.1, duration: 900}, {to: .8, duration: 900}, {to: 1, duration: 900}]}, at)
      .add(dr, {draw: ['0 0', '0 1'], duration: 3600, ease: 'inOut(1.6)'}, at)
      .add(trail, {opacity: [{to: 1, duration: 200}, {to: 0, duration: 900, delay: 3300}]}, at)
      .add(p2.g, {...svg.createMotionPath(path2), duration: 3600, ease: 'inOut(1.6)'}, at + 380);
  };
  const tl = k.tl({loop: true, loopDelay: 400});
  fly(tl, 0);
  tl.add(ttl, {opacity: [0, 1], y: [40, 0], duration: 900, ease: 'outExpo'}, 2600).add(sub, {opacity: [0, 1], duration: 800}, 2900)
    .add([ttl, sub], {opacity: 0, duration: 500}, 5200);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   9 · КЕСТЕ-ВИТРАЖ (grid of tiles flips away, text tiles stay)
   Шабыт: «Professional slide design in 31 seconds» кесте (15,6 млн), Luis Urrutia (135 мың ♥)
   ===================================================================== */
Combos.gridReveal = (host, o = {}) => {
  ensureCSS(); const k = kit(host), C = 8, Rw = 5, tw = W / C, th = H / Rw;
  const bg = el('div', 'cb-bg', host, {backgroundImage: url(o.img || 'cls')});
  host.style.perspective = '1400px';
  const keepSet = new Set([25, 26, 27, 14]);
  const tiles = []; for (let r = 0; r < Rw; r++) for (let c = 0; c < C; c++) {
    const i = r * C + c, e = el('div', 'cb-tile', host, {left: c * tw + 'px', top: r * th + 'px', width: tw + 1 + 'px', height: th + 1 + 'px'});
    tiles.push({e, r, c, i});
  }
  const go = tiles.filter(t => !keepSet.has(t.i)), stay = tiles.filter(t => keepSet.has(t.i));
  const head = el('div', '', host, {position: 'absolute', left: tw + 'px', top: 3 * th + 'px', width: 3 * tw + 'px', height: th + 'px', display: 'flex', alignItems: 'center', padding: '0 40px', font: '800 76px/1 Rubik', color: P.ink, opacity: 0}, o.title || 'Кесте-витраж');
  const cap = el('div', '', host, {position: 'absolute', left: 6 * tw + 'px', top: 1 * th + 'px', width: tw + 'px', height: th + 'px', display: 'grid', placeItems: 'center', font: '700 44px/1.05 Caveat', color: P.brick, textAlign: 'center', opacity: 0}, o.sub || 'бір кесте — бір сурет');
  const tl = k.tl();
  tl.add(bg, {scale: [1.2, 1], duration: 3200, ease: 'out(3)'}, 0)
    .add(go.map(t => t.e), {rotateX: [0, -92], opacity: [1, 0], translateZ: [0, 120], duration: 800, ease: 'in(2)', delay: (e, i) => (go[i].r + go[i].c) * 70}, 300)
    .add(stay.map(t => t.e), {background: P.chalk, scale: [{to: .94, duration: 300}, {to: 1, duration: 500, ease: 'outBack(2)'}]}, 1100)
    .add(head, {opacity: [0, 1], duration: 10}, 1500)
    .add(head, {innerHTML: scrambleText({text: o.title || 'Кесте-витраж', chars: '□■▢▣', revealRate: 30})}, 1500)
    .add(cap, {opacity: [0, 1], y: [20, 0], duration: 700, ease: 'outExpo'}, 2000);
  k.timer({duration: 2200, loop: true, delay: 1000, onLoop: () => {
    const sel = utils.shuffle(go.slice()).slice(0, 4).map(t => t.e);
    k.a(sel, {rotateX: [{to: 0, duration: 450, ease: 'out(3)'}, {to: 92, duration: 450, ease: 'in(2)', delay: 500}], opacity: [{to: .92, duration: 300}, {to: 0, duration: 450, delay: 650}], delay: stagger(90)});
  }});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   10 · ҚИҒАШ ЖОЛАҚТАР (skewed panels + counter-moving images + focus accordion)
   Шабыт: «Viral PowerPoints» параллелограмдары (4,8 млн)
   ===================================================================== */
Combos.diagonalStripes = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  host.style.background = `linear-gradient(120deg, ${P.ink}, #222A3B)`;
  const imgs = o.imgs || ['aya', 'board', 'win', 'sunset'], x0 = 760, sw = 300, gap = 30;
  const st = imgs.map((im, i) => { const e = el('div', 'cb-stripe', host, {left: x0 + i * (sw + gap) + 'px', width: sw + 'px'}); const inner = el('i', '', e, {backgroundImage: url(im)}); return {e, inner}; });
  const ttl = bigText(host, '', {left: '120px', top: '360px', fontSize: '104px', lineHeight: '1.04', whiteSpace: 'nowrap'});
  ttl.innerHTML = o.titleHTML || 'Қиғаш<br>жолақтар';
  const sub = el('div', '', host, {position: 'absolute', left: '125px', top: '610px', font: '700 46px/1.15 Caveat', color: P.yel, width: '560px'}, o.sub || 'сурет терезелері қарсы бағытта жылжиды');
  const ch = splitText(ttl, {chars: true}).chars;
  const tl = k.tl();
  st.forEach((s, i) => { const dir = i % 2 ? -1 : 1;
    tl.add(s.e, {y: [dir * 1300, 0], duration: 1300, ease: 'out(4)'}, i * 130).add(s.inner, {y: [-dir * 520, 0], duration: 1500, ease: 'out(4)'}, i * 130); });
  tl.add(ch, {x: [-70, 0], skewX: [24, 0], opacity: [0, 1], duration: 900, ease: 'outExpo', delay: stagger(28)}, 700)
    .add(sub, {opacity: [0, 1], y: [24, 0], duration: 800, ease: 'outExpo'}, 1300);
  st.forEach((s, i) => k.a(s.inner, {x: [-24, 24], duration: 3800 + i * 500, ease: 'inOutSine', alternate: true, loop: true}));
  let f = 0;
  k.timer({duration: 2600, loop: true, onLoop: () => {
    f = (f + 1) % st.length; let x = x0;
    st.forEach((s, i) => { const w = i === f ? 520 : 226; k.a(s.e, {left: x, width: w, duration: 1000, ease: 'inOut(4)'}); x += w + gap; });
  }});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   11 · КИНО АТМОСФЕРАСЫ (Ken Burns + cloud parallax + light rays + letter-spacing title)
   Шабыт: «The Roman Empire» before/after (14 млн), «Cinematic presentations» (3,2 млн)
   ===================================================================== */
Combos.cinematicClouds = (host, o = {}) => {
  ensureCSS(); const k = kit(host), r = rng(5);
  const bg = el('div', 'cb-bg', host, {backgroundImage: url(o.img || 'ext'), inset: '-4%', filter: 'saturate(1.15) brightness(.72) contrast(1.08) sepia(.25)'});
  el('div', '', host, {position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,150,80,.35), rgba(120,60,90,.25) 60%, rgba(10,10,20,.55))', mixBlendMode: 'soft-light'});
  const rays = el('div', '', host, {position: 'absolute', left: '-50%', top: '-80%', width: '200%', height: '220%', mixBlendMode: 'screen', opacity: .5,
    background: 'repeating-conic-gradient(from 200deg at 50% 30%, rgba(255,214,150,0) 0deg, rgba(255,214,150,.22) 5deg, rgba(255,214,150,0) 11deg, rgba(255,214,150,0) 19deg)'});
  const layers = [{n: 4, y: [120, 420], s: [.9, 1.4], sp: 22, op: .45}, {n: 4, y: [260, 700], s: [1.3, 2], sp: 48, op: .6}, {n: 3, y: [760, 1000], s: [2.4, 3.2], sp: 95, op: .9}];
  const cl = [];
  layers.forEach(L => { for (let i = 0; i < L.n; i++) { const sc = lerp(L.s[0], L.s[1], r()); const e = el('div', 'cb-cloud', host, {width: 460 * sc + 'px', height: 180 * sc + 'px', opacity: 0});
    cl.push({e, x: r() * W, y: lerp(L.y[0], L.y[1], r()), sp: L.sp * (r() * .5 + .75), op: L.op}); } });
  const vig = el('div', '', host, {position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(5,6,10,.82) 100%)'});
  const ttl = bigText(host, o.title || 'БІР САБАҚТЫҢ ТАРИХЫ', {left: 0, right: 0, top: '420px', textAlign: 'center', font: '500 100px/1 Rubik', letterSpacing: '.18em', textShadow: '0 6px 40px rgba(0,0,0,.75)'});
  const line = el('div', '', host, {position: 'absolute', left: '760px', top: '570px', width: '400px', height: '3px', background: P.yel, transformOrigin: '50% 50%'});
  const sub = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '600px', textAlign: 'center', font: '700 60px/1 Caveat', color: P.yel, textShadow: '0 4px 20px rgba(0,0,0,.7)'}, o.sub || 'таңнан күн батқанға дейін');
  const ch = splitText(ttl, {chars: true}).chars;
  const t0 = performance.now();
  k.timer({onUpdate: () => { const t = (performance.now() - t0) / 1000; for (const c of cl) c.e.style.transform = `translate(${((c.x + t * c.sp) % (W + 1400)) - 700}px, ${c.y}px)`; }});
  k.a(bg, {scale: [1.04, 1.16], x: [0, -50], duration: 14000, ease: 'inOutSine', alternate: true, loop: true});
  k.a(rays, {rotate: [0, 18], duration: 16000, ease: 'inOutSine', alternate: true, loop: true});
  k.a(vig, {opacity: [.75, .95], duration: 3000, ease: 'inOutSine', alternate: true, loop: true});
  const tl = k.tl();
  tl.add(cl.map(c => c.e), {opacity: (e, i) => [0, cl[i].op], duration: 2000, ease: 'out(2)', delay: stagger(80)}, 0)
    .add(ch, {opacity: [0, 1], filter: ['blur(18px)', 'blur(0px)'], y: [20, 0], duration: 1600, ease: 'out(3)', delay: stagger(55, {from: 'center'})}, 400)
    .add(ttl, {letterSpacing: ['.5em', '.18em'], duration: 2600, ease: 'out(3)'}, 300)
    .add(line, {scaleX: [0, 1], duration: 1200, ease: 'inOut(3)'}, 1600)
    .add(sub, {opacity: [0, 1], y: [16, 0], duration: 1000, ease: 'outExpo'}, 2000);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   12 · УАҚЫТ СЫЗЫҒЫ (dot travel + progress + count-up years + spring cards + camera pan)
   Шабыт: Leila Gharani: timeline (6,8 млн), «Roman Empire» уақыт сызығы
   ===================================================================== */
Combos.timelineDot = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  const D = o.items || [[1934, 'Выготский', '«Ойлау және сөйлеу»', P.yel], [1984, 'CAST', 'ұйым құрылды', P.cor], [2002, 'Роуз · Мейер', 'кітап', P.min], [2018, 'UDL 2.2', 'нұсқаулық', P.sky], [2024, 'UDL 3.0', 'жаңа нұсқа', P.yel]];
  host.style.background = `linear-gradient(180deg, #1A2131, ${P.ink})`;
  const track = el('div', '', host, {position: 'absolute', left: 0, top: 0, width: '3600px', height: '1080px'});
  const X = i => 360 + i * 620, Y = 700;
  const wm = el('div', '', host, {position: 'absolute', right: '-40px', bottom: '-90px', font: '800 460px/1 Rubik', color: 'rgba(245,240,230,.05)'}, String(D[0][0]));
  el('div', '', track, {position: 'absolute', left: '0px', top: Y - 2 + 'px', width: '3600px', height: '4px', background: 'rgba(245,240,230,.18)'});
  const prog = el('div', '', track, {position: 'absolute', left: '0px', top: Y - 3 + 'px', width: '0px', height: '6px', background: `linear-gradient(90deg, ${P.yel}, ${P.cor})`, borderRadius: '3px'});
  const stops = D.map((d, i) => el('div', '', track, {position: 'absolute', left: X(i) - 14 + 'px', top: Y - 14 + 'px', width: '28px', height: '28px', borderRadius: '50%', background: P.ink, boxShadow: `0 0 0 4px rgba(245,240,230,.5)`}));
  const rings = D.map((d, i) => el('div', '', track, {position: 'absolute', left: X(i) - 30 + 'px', top: Y - 30 + 'px', width: '60px', height: '60px', borderRadius: '50%', border: `3px solid ${d[3]}`, opacity: 0}));
  const cards = D.map((d, i) => { const c = el('div', 'cb-glass', track, {left: X(i) - 240 + 'px', top: Y - 470 + 'px', width: '480px', padding: '34px 40px', opacity: 0});
    el('div', '', c, {width: '54px', height: '54px', borderRadius: i % 3 === 0 ? '50%' : '10px', background: d[3], transform: i % 3 === 1 ? 'rotate(45deg) scale(.8)' : ''});
    el('div', '', c, {font: '800 54px/1.05 Rubik', marginTop: '18px', color: P.chalk}, d[1]); el('div', '', c, {font: '700 40px/1.1 Caveat', color: d[3], marginTop: '8px'}, d[2]); return c; });
  const year = el('div', '', track, {position: 'absolute', left: X(0) - 200 + 'px', top: Y + 60 + 'px', width: '400px', textAlign: 'center', font: '800 120px/1 Rubik', color: P.chalk}, String(D[0][0]));
  const dot = el('div', '', track, {position: 'absolute', left: X(0) - 22 + 'px', top: Y - 22 + 'px', width: '44px', height: '44px', borderRadius: '50%', background: P.yel, boxShadow: `0 0 0 10px rgba(244,201,93,.25), 0 0 50px ${P.yel}`});
  const yr = {v: D[0][0]};
  let i = 0;
  const step = () => {
    const t = k.tl({defaults: {ease: 'inOut(3)', duration: 1100}});
    const x = X(i), pan = Math.min(0, 760 - x);
    t.add(dot, {left: x - 22}, 0).add(year, {left: x - 200}, 0).add(prog, {width: x}, 0).add(track, {x: pan, duration: 1300}, 0)
      .add(yr, {v: D[i][0], duration: 1000, ease: 'out(3)', onUpdate: () => { year.textContent = wm.textContent = Math.round(yr.v); }}, 0)
      .add(stops[i], {background: D[i][3], duration: 300}, 900)
      .add(rings[i], {scale: [1, 3.4], opacity: [1, 0], duration: 900, ease: 'out(3)'}, 950)
      .add(cards[i], {opacity: [0, 1], y: [60, 0], scale: [.7, 1], duration: 900, ease: spring({bounce: .45, duration: 900})}, 950)
      .add(dot, {scale: [{to: 1.5, duration: 160}, {to: 1, duration: 500, ease: 'outElastic(1,.5)'}]}, 950);
    if (i > 0) t.add(cards[i - 1], {opacity: .35, scale: .88, y: 30, duration: 700}, 700);
    i++;
    if (i === D.length) { i = 0; t.add(cards, {opacity: 0, duration: 500}, 2900).add(stops, {background: P.ink, duration: 10}, 3400).add(prog, {width: 0, duration: 800}, 2900).set(yr, {v: D[0][0]}, 3400); }
  };
  const tl = k.tl(); tl.call(step, 200);
  k.timer({duration: 2500, loop: true, delay: 200, onLoop: step});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   13 · ЖЫРТЫЛҒАН ҚАҒАЗ (shake → tear halves → stickers drop with bounce → stamp + screen shake)
   Шабыт: «The First World War» презентациясы (1,95 млн ♥)
   ===================================================================== */
Combos.tornPaper = (host, o = {}) => {
  ensureCSS(); const k = kit(host), r = rng(23);
  const scene = el('div', '', host, {position: 'absolute', inset: 0});
  el('div', 'cb-bg', scene, {backgroundImage: url(o.img || 'cls')});
  el('div', '', scene, {position: 'absolute', inset: 0, background: 'rgba(12,14,20,.35)'});
  const pts = []; for (let x = -20; x <= W + 20; x += 48) pts.push([x, 540 + (r() - .5) * 70]);
  const top = 'polygon(0 0, 100% 0, ' + pts.slice().reverse().map(([x, y]) => `${x}px ${y}px`).join(', ') + ')';
  const bot = 'polygon(' + pts.map(([x, y]) => `${x}px ${y}px`).join(', ') + ', 100% 100%, 0 100%)';
  const paper = c => { const p = el('div', '', scene, {position: 'absolute', inset: 0, clipPath: c, background: '#FBF9F3',
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(120,170,205,.35) 0 2px, transparent 2px 54px), linear-gradient(90deg, transparent 230px, rgba(220,90,90,.5) 230px 233px, transparent 233px)', boxShadow: '0 0 40px rgba(0,0,0,.4)'});
    el('div', '', p, {position: 'absolute', left: '300px', top: '420px', font: '800 150px/1 Rubik', color: P.ink, whiteSpace: 'nowrap'}, o.title || 'Жыртылған бет');
    el('div', '', p, {position: 'absolute', left: '310px', top: '600px', font: '700 60px/1 Caveat', color: P.brick}, 'тарта бер…'); return p; };
  const pT = paper(top), pB = paper(bot);
  const cards = ['7', '+', '5', '=', '12'].map((c, i) => el('div', 'cb-num', scene, {left: 420 + i * 230 + 'px', top: '420px', opacity: 0, background: i === 4 ? P.yel : P.chalk}, c));
  const stamp = el('div', '', scene, {position: 'absolute', left: '1340px', top: '180px', padding: '20px 40px', border: `10px solid ${P.cor}`, borderRadius: '24px', font: '800 130px/1 Rubik', color: P.cor, opacity: 0, transform: 'rotate(-10deg)'}, o.stamp || 'x≠0');
  const dust = Array.from({length: 10}, () => el('div', '', scene, {position: 'absolute', left: '1540px', top: '280px', width: '18px', height: '18px', borderRadius: '50%', background: P.cor, opacity: 0}));
  const tl = k.tl();
  tl.add([pT, pB], {x: [{to: -8, duration: 60}, {to: 7, duration: 60}, {to: -5, duration: 60}, {to: 4, duration: 60}, {to: 0, duration: 60}]}, 700)
    .add(pT, {y: -760, x: -90, rotate: -8, duration: 1100, ease: 'in(3)'}, 1050)
    .add(pB, {y: 760, x: 110, rotate: 7, duration: 1100, ease: 'in(3)'}, 1120)
    .add(cards, {y: [-700, 0], opacity: [0, 1], rotate: () => [utils.random(-35, 35), utils.random(-7, 7)], duration: 1200, ease: 'outBounce', delay: stagger(170)}, 1700)
    .add(stamp, {scale: [3.2, 1], opacity: [0, 1], duration: 420, ease: 'in(4)'}, 3000)
    .add(scene, {x: [{to: 14, duration: 50}, {to: -12, duration: 50}, {to: 8, duration: 50}, {to: -4, duration: 50}, {to: 0, duration: 60}],
      y: [{to: -10, duration: 50}, {to: 8, duration: 50}, {to: -5, duration: 50}, {to: 0, duration: 110}]}, 3420)
    .add(dust, {x: () => utils.random(-240, 240), y: () => utils.random(-160, 200), scale: [1.4, 0], opacity: [{to: 1, duration: 40}, {to: 0, duration: 700}], duration: 740, ease: 'out(3)'}, 3420);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   14 · СУРЕТ РАМАСЫНЫҢ ІШІНЕ (gallery pan + 3D sway + spotlight + zoom into frame)
   Шабыт: Van Gogh галереясы (Yerassyl, 32,7 мың ♥)
   ===================================================================== */
Combos.frameZoom = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  const imgs = o.imgs || ['ext', 'win', 'sunset'];
  host.style.background = '#16120E'; host.style.perspective = '1600px';
  const cam = el('div', '', host, {position: 'absolute', left: 0, top: 0, width: '4200px', height: '1080px', transformOrigin: '0 0'});
  el('div', '', cam, {position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #CDBFA8 0%, #B9A88E 70%, #4A3A2C 70.2%, #2E241B 100%)'});
  const F = imgs.map((im, i) => { const fx = 700 + i * 1300, fy = 430;
    const spot = el('div', '', cam, {position: 'absolute', left: fx - 520 + 'px', top: '-60px', width: '1040px', height: '900px', background: 'radial-gradient(ellipse 50% 60% at 50% 0%, rgba(255,240,210,.6), rgba(255,240,210,0) 70%)', mixBlendMode: 'screen', opacity: 0});
    const fr = el('div', '', cam, {position: 'absolute', left: fx - 300 + 'px', top: fy - 200 + 'px', width: '600px', height: '400px', padding: '26px', background: '#F7F1E6', boxShadow: '0 0 0 22px #8E6440, 0 0 0 26px #5E4028, 0 40px 80px rgba(0,0,0,.5)'});
    const pic = el('div', '', fr, {width: '100%', height: '100%', backgroundImage: url(im), backgroundSize: 'cover', backgroundPosition: 'center'});
    return {fx, fy, spot, fr, pic, im}; });
  const full = el('div', 'cb-bg', host, {opacity: 0});
  const ttl = bigText(host, '', {left: '150px', bottom: '320px', fontSize: '110px', opacity: 0, textShadow: '0 6px 30px rgba(0,0,0,.6)'});
  const C = {x: 0, y: 0, s: 1, ry: 0};
  const apply = () => { cam.style.transform = `translate(${C.x}px, ${C.y}px) scale(${C.s}) rotateY(${C.ry}deg)`; };
  const lookAt = (i, s) => ({x: W / 2 - F[i].fx * s, y: H / 2 - F[i].fy * s, s});
  Object.assign(C, lookAt(0, .78)); apply();
  let i = 0;
  const cycle = () => {
    const f = F[i], t = k.tl({defaults: {ease: 'inOut(3)'}}), name = (o.names || ['Мектеп', 'Терезе', 'Күн батуы'])[i] || '';
    t.add(C, {...lookAt(i, .78), ry: [i % 2 ? 6 : -6, 0], duration: 1600, onUpdate: apply}, 0)
      .add(f.spot, {opacity: [{to: 1, duration: 120}, {to: .3, duration: 80}, {to: 1, duration: 500}]}, 900)
      .add(C, {...lookAt(i, 3.6), duration: 1500, ease: 'in(3)', onUpdate: apply}, 1900)
      .call(() => { full.style.backgroundImage = url(f.im); }, 1900)
      .add(full, {opacity: [0, 1], scale: [1.15, 1], duration: 500, ease: 'out(2)'}, 2950)
      .call(() => { ttl.textContent = name; }, 3300)
      .add(ttl, {opacity: [0, 1], y: [40, 0], duration: 800, ease: 'outExpo'}, 3300)
      .add([ttl, full], {opacity: 0, duration: 600}, 5000)
      .add(f.spot, {opacity: 0, duration: 600}, 5000)
      .add(C, {...lookAt(i, .78), duration: 1200, onUpdate: apply}, 5000);
    i = (i + 1) % F.length;
  };
  const tl = k.tl(); tl.call(cycle, 100);
  k.timer({duration: 6400, loop: true, delay: 100, onLoop: cycle});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   15 · ПІШІННІҢ ӨЗГЕРУІ (SVG morph + rotate + colour + scramble label + shadow)
   Біздің комбо: үш автордың фигуралары бір-біріне айналады
   ===================================================================== */
Combos.shapeMorph = (host, o = {}) => {
  ensureCSS(); const k = kit(host), cx = 960, cy = 420, R = 220;
  host.style.background = `radial-gradient(80% 80% at 50% 45%, #253048, ${P.ink})`;
  const s = sv('svg', {viewBox: '0 0 1920 1080', class: 'cb-full'}, host);
  const poly = (n, rot, rr = R) => Array.from({length: n}, (_, i) => { const a = rot + i * TAU / n; return `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`; });
  const star = Array.from({length: 10}, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * .45 : R * 1.05; return `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`; });
  const shapes = [
    ['шеңбер', `M${cx - R} ${cy} A${R} ${R} 0 1 1 ${cx + R} ${cy} A${R} ${R} 0 1 1 ${cx - R} ${cy} Z`, P.yel],
    ['үшбұрыш', 'M' + poly(3, -Math.PI / 2, R * 1.15).join(' L') + ' Z', P.cor],
    ['шаршы', 'M' + poly(4, -Math.PI / 4, R * 1.12).join(' L') + ' Z', P.min],
    ['жұлдыз', 'M' + star.join(' L') + ' Z', P.sky],
  ];
  const defs = sv('defs', {}, s); const targets = shapes.map(([, d], i) => sv('path', {id: `sm${UID}_${i}`, d}, defs)); UID++;
  const sh = sv('ellipse', {cx, cy: cy + R + 70, rx: R * .9, ry: 24, fill: 'rgba(0,0,0,.45)'}, s);
  const main = sv('path', {d: shapes[0][1], fill: shapes[0][2]}, s); main.style.transformBox = 'fill-box'; main.style.transformOrigin = '50% 50%';
  sh.style.transformBox = 'fill-box'; sh.style.transformOrigin = '50% 50%';
  const lab = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '770px', textAlign: 'center', font: '800 84px/1 Rubik', color: P.chalk}, shapes[0][0]);
  const kick = chips(host, o.kicker || 'бір пішін — көп күй', {left: 0, right: 0, top: '120px', textAlign: 'center'});
  let i = 0, rot = 0;
  const step = () => {
    i = (i + 1) % shapes.length; rot += 120; const [name, , c] = shapes[i];
    const t = k.tl({defaults: {duration: 1200, ease: 'inOut(3)'}});
    t.add(main, {d: svg.morphTo(targets[i], 1), fill: c, rotate: rot, scale: [{to: .78, duration: 600}, {to: 1, duration: 600, ease: 'outBack(2)'}]}, 0)
      .add(sh, {scaleX: [{to: .6, duration: 600}, {to: 1, duration: 600}], opacity: [{to: .5, duration: 600}, {to: 1, duration: 600}]}, 0)
      .add(lab, {innerHTML: scrambleText({text: name, chars: '●▲■★', revealRate: 30})}, 300);
  };
  const tl = k.tl();
  tl.add(main, {scale: [0, 1], rotate: [-180, 0], duration: 1200, ease: 'outBack(1.6)'}, 0).add(kick, {opacity: [0, 1], y: [20, 0], duration: 800}, 300);
  k.timer({duration: 2000, loop: true, onLoop: step});
  k.a(main, {translateY: [-14, 14], duration: 1700, ease: 'inOutSine', alternate: true, loop: true});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   16 · ОРБИТА (3D-tilted rings rotate, planets counter-rotate, tilt breathing, comet)
   Біздің комбо: үш автор — үш орбита
   ===================================================================== */
Combos.orbitSystem = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  host.style.background = `radial-gradient(70% 70% at 50% 50%, #222B44, ${P.ink})`; host.style.perspective = '1500px';
  const sys = el('div', '', host, {position: 'absolute', left: '960px', top: '540px', width: 0, height: 0, transformStyle: 'preserve-3d'});
  const ringsD = [[540, P.yel, '●', 9000, 1], [800, P.cor, '▲', 14000, -1], [1060, P.min, '■', 22000, 1]];
  const rings = ringsD.map(([d, c, ic, dur, dir]) => {
    const r = el('div', '', sys, {position: 'absolute', left: -d / 2 + 'px', top: -d / 2 + 'px', width: d + 'px', height: d + 'px', borderRadius: '50%', border: '3px dashed rgba(245,240,230,.35)', transformStyle: 'preserve-3d'});
    const p = el('div', '', r, {position: 'absolute', left: d / 2 - 50 + 'px', top: '-50px', width: '100px', height: '100px', borderRadius: '50%', display: 'grid', placeItems: 'center',
      background: c, color: P.ink, font: '800 46px/1 Rubik', boxShadow: `0 0 40px ${c}`}, ic);
    return {r, p, dur, dir};
  });
  const comet = Array.from({length: 7}, (_, i) => { const a = (-90 - i * 3.2) * Math.PI / 180, d = 1060;
    return el('div', '', rings[2].r, {position: 'absolute', left: d / 2 + Math.cos(a) * d / 2 - 9 + i + 'px', top: d / 2 + Math.sin(a) * d / 2 - 9 + i + 'px', width: 18 - i * 2 + 'px', height: 18 - i * 2 + 'px', borderRadius: '50%', background: P.chalk, opacity: 1 - i * .13}); });
  const core = el('div', '', host, {position: 'absolute', left: '830px', top: '410px', width: '260px', height: '260px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: P.chalk, color: P.ink, font: '800 76px/1 Rubik'}, o.core || 'x≠0');
  const tilt = {x: 66};
  const applyTilt = () => { sys.style.transform = `rotateX(${tilt.x}deg)`; rings.forEach(R => { R.p.style.transform = `rotateZ(${-R.ang}deg) rotateX(${-tilt.x}deg)`; }); };
  rings.forEach(R => { R.ang = 0; });
  const t0 = performance.now();
  k.timer({onUpdate: () => { const t = performance.now() - t0;
    rings.forEach(R => { R.ang = (t / R.dur) * 360 * R.dir; R.r.style.transform = `rotateZ(${R.ang}deg) scale(${R.sc ?? 1})`; }); applyTilt(); }});
  k.a(tilt, {x: [58, 72], duration: 4200, ease: 'inOutSine', alternate: true, loop: true});
  k.a(core, {boxShadow: ['0 0 0 0 rgba(244,201,93,.0), 0 0 60px rgba(244,201,93,.35)', '0 0 0 26px rgba(244,201,93,.18), 0 0 120px rgba(244,201,93,.6)'], duration: 1600, ease: 'inOutSine', alternate: true, loop: true});
  const tl = k.tl();
  rings.forEach(R => { R.sc = 0; });
  tl.add(core, {scale: [0, 1], duration: 900, ease: 'outBack(2)'}, 0)
    .add(rings, {sc: [0, 1], duration: 1200, ease: spring({bounce: .35, duration: 1200}), delay: stagger(220)}, 300)
    .add(rings.map(R => R.p), {opacity: [0, 1], duration: 400, delay: stagger(220)}, 700);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   17 · ЖАРЫЛЫС → ЖИНАЛУ (~400 бөлшек мәтінге жиналып, қайта шашырайды)
   Біздің комбо
   ===================================================================== */
Combos.explodeAssemble = (host, o = {}) => {
  ensureCSS(); const k = kit(host), r = rng(3);
  host.style.background = `radial-gradient(90% 90% at 50% 50%, #1F2638, ${P.ink})`;
  const pts = textPoints(o.text || 'x≠0', o.size || 460, o.step || 22, W / 2, 700);
  const cols = [P.yel, P.cor, P.min, P.sky, P.chalk];
  const parts = pts.map(([x, y]) => ({e: el('div', 'cb-par', host, {background: pick(cols, r)}), x: x - 9, y: y - 9, sx: r() * W, sy: r() * H}));
  parts.forEach(p => utils.set(p.e, {x: p.sx, y: p.sy, rotate: utils.random(0, 360), scale: utils.random(.3, 1.2, 2), opacity: 0}));
  const E = parts.map(p => p.e);
  const sub = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '820px', textAlign: 'center', font: '700 56px/1 Caveat', color: P.yel, opacity: 0}, o.sub || 'бөлшектерден — бүтінге');
  const tl = k.tl({loop: true, loopDelay: 300});
  tl.add(E, {x: (e, i) => parts[i].x, y: (e, i) => parts[i].y, rotate: 0, scale: 1, opacity: 1, duration: 1500, ease: 'out(4)', delay: stagger(3, {from: 'random'})}, 0)
    .add(sub, {opacity: [0, 1], y: [20, 0], duration: 700, ease: 'outExpo'}, 1700)
    .add(E, {scale: [{to: 1.7, duration: 220}, {to: 1, duration: 420}], delay: (e, i) => parts[i].x * .55}, 2300)
    .add(sub, {opacity: 0, duration: 400}, 4300)
    .add(E, {x: (e, i) => parts[i].x + (parts[i].x - W / 2) * utils.random(.6, 1.8, 2), y: [{to: (e, i) => parts[i].y - utils.random(120, 420), duration: 600, ease: 'out(2)'}, {to: H + 200, duration: 900, ease: 'in(2)'}],
      rotate: () => utils.random(-540, 540), opacity: [{to: 1, duration: 1200}, {to: 0, duration: 300}], duration: 1500, ease: 'out(1.5)', delay: stagger(2, {from: 'center'})}, 4400)
    .set(E, {x: (e, i) => parts[i].sx, y: (e, i) => parts[i].sy, scale: .5, opacity: 0}, 6300);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   18 · ӘРІПТЕР САРҚЫРАМАСЫ (3D flip + rise + blur + colour per char, highlighter, hand underline, wave)
   Біздің комбо
   ===================================================================== */
Combos.textCascade = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  host.style.background = `${P.ink}`;
  el('div', '', host, {position: 'absolute', inset: 0, opacity: .5, backgroundImage: 'linear-gradient(rgba(156,203,234,.08) 2px, transparent 2px), linear-gradient(90deg, rgba(156,203,234,.08) 2px, transparent 2px)', backgroundSize: '64px 64px'});
  const box = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '330px', textAlign: 'center', perspective: '900px'});
  const t1 = el('div', '', box, {font: '800 170px/1.05 Rubik', color: P.chalk, display: 'inline-block', position: 'relative'});
  const w1 = el('span', '', t1, {}, o.a || 'Әріп сайын '); const hl = el('span', '', t1, {position: 'relative', display: 'inline-block'});
  const mark = el('i', '', hl, {position: 'absolute', left: '-14px', right: '-14px', top: '18%', bottom: '4%', background: P.yel, borderRadius: '14px', transformOrigin: '0 50%', transform: 'scaleX(0)'});
  const w2 = el('span', '', hl, {position: 'relative'}, o.b || 'тірі');
  const s = sv('svg', {viewBox: '0 0 900 60', width: 900, height: 60, style: 'position:absolute;left:0;top:100%;overflow:visible'}, w1);
  const under = sv('path', {d: 'M10 30 C 160 6, 300 52, 460 26 S 760 10, 880 34', fill: 'none', stroke: P.cor, 'stroke-width': 10, 'stroke-linecap': 'round'}, s);
  const sub = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '650px', textAlign: 'center', font: '400 46px/1.3 Rubik', color: 'rgba(245,240,230,.85)'}, o.sub || 'бір әріп — бес қозғалыс: айналу, көтерілу, фокус, түс, өлшем');
  const c1 = splitText(w1, {chars: true}).chars, c2 = splitText(w2, {chars: true}).chars, sw = splitText(sub, {words: true}).words;
  utils.set([...c1, ...c2], {transformOrigin: '50% 100%'});
  const tl = k.tl();
  tl.add([...c1, ...c2], {rotateX: [-100, 0], y: [90, 0], opacity: [0, 1], filter: ['blur(14px)', 'blur(0px)'], color: [P.yel, P.chalk], scale: [1.3, 1], duration: 1300, ease: 'outExpo', delay: stagger(45)}, 0)
    .add(mark, {scaleX: [0, 1], duration: 700, ease: 'outExpo'}, 1300)
    .add(c2, {color: P.ink, duration: 300}, 1400)
    .add(svg.createDrawable(under), {draw: ['0 0', '0 1'], duration: 900, ease: 'inOut(3)'}, 1700)
    .add(sw, {opacity: [0, 1], y: [24, 0], duration: 700, ease: 'outExpo', delay: stagger(60)}, 2000);
  k.a(c2, {y: [{to: -26, duration: 300, ease: 'out(2)'}, {to: 0, duration: 500, ease: 'outBounce'}], delay: stagger(90, {start: 3000}), loopDelay: 1600, loop: true});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   19 · СЕКІРІП ТҮСУ (gravity + squash & stretch + bounce + shadow + hop to centre)
   Біздің комбо: «7 + 5 = 12» карточкалары
   ===================================================================== */
Combos.squashDrop = (host, o = {}) => {
  ensureCSS(); const k = kit(host), floor = 820;
  host.style.background = `linear-gradient(180deg, #202838 0%, ${P.ink} ${floor}px, #5A3E28 ${floor}px, #3B2A1C 100%)`;
  const labels = o.cards || ['7', '+', '5', '=', '12'], n = labels.length, gap = 40, cw = 200, x0 = (W - (n * cw + (n - 1) * gap)) / 2;
  const sh = labels.map((l, i) => el('div', 'cb-shadow', host, {left: x0 + i * (cw + gap) - 10 + 'px', width: cw + 20 + 'px', top: floor - 17 + 'px', opacity: 0}));
  const cards = labels.map((l, i) => el('div', 'cb-num', host, {left: x0 + i * (cw + gap) + 'px', top: floor - 260 + 'px', background: i === n - 1 ? P.yel : P.chalk}, l));
  const ttl = chips(host, o.kicker || 'гравитация · қысылу · серпіліс', {left: 0, right: 0, top: '150px', textAlign: 'center', fontSize: '58px'});
  const tl = k.tl({loop: true, loopDelay: 800});
  tl.set(cards, {y: -1100, opacity: 1}, 0).set(sh, {opacity: 0}, 0).add(ttl, {opacity: [0, 1], y: [20, 0], duration: 800, ease: 'outExpo'}, 0);
  cards.forEach((c, i) => { const t = 200 + i * 190, Y = 0;
    tl.add(c, {y: [{from: -1100, to: Y, duration: 560, ease: 'in(2.4)'}, {to: Y - 140, duration: 270, ease: 'out(2)'}, {to: Y, duration: 250, ease: 'in(2)'}, {to: Y - 30, duration: 140, ease: 'out(2)'}, {to: Y, duration: 140, ease: 'in(2)'}],
        scaleY: [{from: 1.15, to: 1.15, duration: 540}, {to: .66, duration: 80}, {to: 1.06, duration: 200}, {to: 1, duration: 240}, {to: .9, duration: 60}, {to: 1, duration: 240}],
        scaleX: [{from: .9, to: .9, duration: 540}, {to: 1.28, duration: 80}, {to: .96, duration: 200}, {to: 1, duration: 240}, {to: 1.08, duration: 60}, {to: 1, duration: 240}],
        rotate: [{from: utils.random(-30, 30), to: utils.random(-8, 8), duration: 560}, {to: 0, duration: 800, ease: 'outElastic(1,.5)'}]}, t)
      .add(sh[i], {opacity: [{from: 0, to: .9, duration: 560, ease: 'in(2)'}, {to: .5, duration: 270}, {to: .9, duration: 250}], scaleX: [{from: .2, to: 1, duration: 560, ease: 'in(2)'}, {to: .7, duration: 270}, {to: 1, duration: 250}]}, t);
  });
  const last = cards[n - 1], hopX = W / 2 - (x0 + (n - 1) * (cw + gap)) - cw / 2;
  tl.add(last, {scaleY: [{to: .78, duration: 220, ease: 'out(2)'}, {to: 1.1, duration: 120}, {to: 1, duration: 400, delay: 500}], scaleX: [{to: 1.18, duration: 220}, {to: .92, duration: 120}, {to: 1, duration: 400, delay: 500}]}, 2300)
    .add(last, {x: hopX, y: [{to: -520, duration: 420, ease: 'out(2)'}, {to: -380, duration: 380, ease: 'in(2)'}], rotate: 360, scale: 1.25, duration: 800, ease: 'inOut(2)'}, 2520)
    .add(sh[n - 1], {opacity: 0, duration: 300}, 2520)
    .add(cards.slice(0, n - 1), {rotate: (e, i) => 6 + i * 2, y: [{to: -40, duration: 200, ease: 'out(2)'}, {to: 0, duration: 260, ease: 'in(2)'}], delay: stagger(80)}, 3300)
    .add(cards, {opacity: 0, duration: 500}, 4600).add(sh, {opacity: 0, duration: 500}, 4600).add(ttl, {opacity: 0, duration: 500}, 4600)
    .set(cards, {x: 0, scale: 1, rotate: 0, opacity: 1}, 5150);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   20 · АУДАРЫЛАТЫН КАРТАЛАР + ЖЫЛТЫР (3D flip wave, lift, shine sweep, idle float)
   Біздің комбо
   ===================================================================== */
Combos.flipCardsShine = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  host.style.background = `radial-gradient(90% 80% at 50% 40%, #273149, ${P.ink})`; host.style.perspective = '1800px';
  const D = o.cards || [['aya', 'Айару'], ['era', 'Ерасыл'], ['board', 'Тақта'], ['clock', 'Сағат'], ['note', 'Дәптер'], ['desk', 'Санауыш'], ['win', 'Терезе'], ['pair', 'Жұп']];
  const cols = 4, cw = 330, ch = 360, gx = 40, gy = 40, x0 = (W - (cols * cw + (cols - 1) * gx)) / 2, y0 = o.top ?? 90;
  const cards = D.map(([im, name], i) => { const c = el('div', 'cb-card3', host, {left: x0 + (i % cols) * (cw + gx) + 'px', top: y0 + Math.floor(i / cols) * (ch + gy) + 'px', width: cw + 'px', height: ch + 'px'});
    el('div', 'f', c, {}, '?'); const b = el('div', 'b', c, {backgroundImage: url(im)}); el('span', '', b, {}, name); const sh = el('div', 'shine', b); return {c, sh}; });
  const C = cards.map(c => c.c), S = cards.map(c => c.sh);
  const tl = k.tl({loop: true, loopDelay: 600});
  tl.add(C, {opacity: [0, 1], y: [80, 0], duration: 700, ease: 'outExpo', delay: stagger(60)}, 0)
    .add(C, {rotateY: [0, 180], scale: [{to: 1.12, duration: 450}, {to: 1, duration: 450}], duration: 900, ease: 'inOut(3)', delay: stagger(140, {grid: [cols, 2], from: 'first'})}, 700)
    .add(S, {x: ['-160%', '320%'], duration: 800, ease: 'inOut(2)', delay: stagger(140, {grid: [cols, 2], from: 'first'})}, 1500)
    .add(C, {y: [{to: -16, duration: 900, ease: 'inOutSine'}, {to: 0, duration: 900, ease: 'inOutSine'}], rotateX: [{to: 4, duration: 900}, {to: 0, duration: 900}], delay: stagger(120)}, 2600)
    .add(C, {rotateY: [180, 360], duration: 900, ease: 'inOut(3)', delay: stagger(110, {grid: [cols, 2], from: 'last'})}, 4800)
    .add(C, {opacity: 0, duration: 400}, 6300);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   21 · ГЛИТЧ (RGB split + slices + skew + scanlines, then resolve)
   Біздің комбо
   ===================================================================== */
Combos.glitchTitle = (host, o = {}) => {
  ensureCSS(); const k = kit(host), text = o.text || 'ҚАТЕ ЕМЕС';
  host.style.background = '#0C0F16';
  const wrap = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '380px', height: '240px'});
  const mk = (color, blend, clip) => el('div', '', wrap, {position: 'absolute', left: 0, right: 0, textAlign: 'center', font: '800 200px/1 Rubik', color, mixBlendMode: blend || 'normal', clipPath: clip || 'none'}, text);
  const base = mk(P.chalk), rr = mk(P.cor, 'screen'), cc = mk(P.min, 'screen');
  const bands = [[0, 22], [22, 41], [41, 63], [63, 82], [82, 100]].map(([a, b]) => mk(P.chalk, 'normal', `inset(${a}% 0 ${100 - b}% 0)`));
  utils.set(bands, {opacity: 0});
  const scan = el('div', '', host, {position: 'absolute', inset: 0, opacity: .25, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 2px, transparent 2px 6px)'});
  const code = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '700px', textAlign: 'center', font: '700 48px/1 Rubik', letterSpacing: '.2em', color: P.yel}, 'ERR 0x00');
  k.a(scan, {backgroundPositionY: ['0px', '120px'], duration: 1200, ease: 'linear', loop: true});
  const burst = () => {
    const t = k.tl();
    const jit = (amp) => [{to: utils.random(-amp, amp), duration: 50}, {to: utils.random(-amp, amp), duration: 50}, {to: utils.random(-amp, amp), duration: 50}, {to: utils.random(-amp, amp), duration: 50}, {to: 0, duration: 120}];
    bands.forEach(bd => t.add(bd, {opacity: [{to: 1, duration: 10}, {to: 1, duration: 260}, {to: 0, duration: 10}], x: jit(80), ease: steps(3)}, 0));
    t.add(rr, {x: jit(26), y: jit(6)}, 0).add(cc, {x: jit(26), y: jit(6)}, 0)
      .add(base, {skewX: [{to: 14, duration: 60}, {to: -9, duration: 60}, {to: 4, duration: 60}, {to: 0, duration: 120}], opacity: [{to: .4, duration: 40}, {to: 1, duration: 40}]}, 40)
      .add(code, {innerHTML: scrambleText({text: o.resolve || 'x ≠ 0 · OK', chars: '01ABCDEF#%&', revealRate: 24})}, 120);
  };
  const tl = k.tl(); tl.add([base, rr, cc], {opacity: [0, 1], duration: 300, ease: steps(4)}, 0).call(burst, 400);
  k.timer({duration: 2600, loop: true, delay: 400, onLoop: burst});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   22 · ТОЛҚЫН (rings + radial displacement of a dot field + elastic return + flash)
   Біздің комбо (x ≠ 0 презентациясындағы «Он екі!» дыбыс толқынынан)
   ===================================================================== */
Combos.rippleShockwave = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  host.style.background = `radial-gradient(80% 80% at 50% 50%, #1E2637, ${P.ink})`;
  const C = 26, Rr = 15, sp = 74, x0 = (W - (C - 1) * sp) / 2, y0 = (H - (Rr - 1) * sp) / 2, dots = [];
  for (let r = 0; r < Rr; r++) for (let c = 0; c < C; c++) { const x = x0 + c * sp, y = y0 + r * sp; dots.push({e: el('div', 'cb-dot', host, {left: x + 'px', top: y + 'px'}), x, y}); }
  const rings = Array.from({length: 3}, () => el('div', '', host, {position: 'absolute', width: '120px', height: '120px', marginLeft: '-60px', marginTop: '-60px', borderRadius: '50%', border: `4px solid ${P.yel}`, opacity: 0}));
  const ttl = bigText(host, o.title || '«Он екі!»', {left: 0, right: 0, top: '470px', textAlign: 'center', fontSize: '130px', textShadow: `0 0 40px ${P.ink}`});
  const origins = o.origins || [[960, 540], [560, 380], [1380, 720], [1500, 300]];
  let n = 0;
  const shock = () => {
    const [ox, oy] = origins[n++ % origins.length], t = k.tl();
    rings.forEach(r_ => { r_.style.left = ox + 'px'; r_.style.top = oy + 'px'; });
    t.add(rings, {scale: [0, 16], opacity: [{to: .95, duration: 80}, {to: 0, duration: 1500}], duration: 1600, ease: 'out(3)', delay: stagger(150)}, 0);
    dots.forEach(d => { const dx = d.x - ox, dy = d.y - oy, dist = Math.hypot(dx, dy) || 1, amp = 70 * Math.exp(-dist / 650), del = dist * .9;
      t.add(d.e, {x: [{to: dx / dist * amp, duration: 160, ease: 'out(2)'}, {to: 0, duration: 1000, ease: 'outElastic(1,.35)'}],
        y: [{to: dy / dist * amp, duration: 160, ease: 'out(2)'}, {to: 0, duration: 1000, ease: 'outElastic(1,.35)'}],
        scale: [{to: 1 + amp / 35, duration: 160}, {to: 1, duration: 700}], background: [{to: P.yel, duration: 120}, {to: 'rgba(245,240,230,.55)', duration: 900}]}, del); });
    t.add(ttl, {x: [{to: 10, duration: 50}, {to: -8, duration: 50}, {to: 5, duration: 50}, {to: 0, duration: 80}]}, Math.hypot(960 - ox, 540 - oy) * .9);
  };
  const tl = k.tl(); tl.add(dots.map(d => d.e), {scale: [0, 1], opacity: [0, 1], duration: 600, delay: stagger(6, {grid: [C, Rr], from: 'center'})}, 0).call(shock, 900);
  k.timer({duration: 2400, loop: true, delay: 900, onLoop: shock});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   23 · САН ТҮЗУІНДЕГІ СЕКІРІСТЕР (axis draw + ticks + ball hops along arcs + squash + equation)
   Біздің комбо (x ≠ 0: 7-ден 12-ге бес секіріс)
   ===================================================================== */
Combos.numberLineHops = (host, o = {}) => {
  ensureCSS(); const k = kit(host), X = i => 160 + i * 80, Y = 700, a = o.from ?? 7, b = o.to ?? 12;
  host.style.background = `linear-gradient(180deg, ${P.board}, #1D352D)`;
  const s = sv('svg', {viewBox: '0 0 1920 1080', class: 'cb-full'}, host);
  const axis = sv('line', {x1: 120, y1: Y, x2: 1800, y2: Y, stroke: P.chalk, 'stroke-width': 7, 'stroke-linecap': 'round'}, s);
  const ticks = Array.from({length: 21}, (_, i) => sv('line', {x1: X(i), y1: Y - (i % 5 ? 18 : 30), x2: X(i), y2: Y + (i % 5 ? 18 : 30), stroke: P.chalk, 'stroke-width': i % 5 ? 4 : 6, 'stroke-linecap': 'round'}, s));
  const nums = Array.from({length: 21}, (_, i) => sv('text', {x: X(i), y: Y + 80, 'text-anchor': 'middle', 'font-size': 40, 'font-family': 'Rubik', 'font-weight': 700, fill: P.chalk}, s, String(i)));
  const arcs = Array.from({length: b - a}, (_, j) => sv('path', {d: `M${X(a + j)} ${Y - 8} A40 40 0 0 1 ${X(a + j + 1)} ${Y - 8}`, fill: 'none', stroke: P.cor, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-dasharray': '2 0'}, s));
  const ring = sv('circle', {cx: X(b), cy: Y + 66, r: 40, fill: 'none', stroke: P.yel, 'stroke-width': 6}, s);
  const ball = sv('g', {}, s); const bc = sv('circle', {cx: 0, cy: -24, r: 24, fill: P.yel}, ball); bc.style.transformBox = 'fill-box'; bc.style.transformOrigin = '50% 100%';
  utils.set(ball, {translateX: X(a), translateY: Y - 8});
  const eq = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '220px', textAlign: 'center', font: '700 150px/1 Caveat', color: P.chalk}, `${a} + ${b - a} = ${b}`);
  const ech = splitText(eq, {chars: true}).chars;
  const tl = k.tl({loop: true, loopDelay: 1200});
  tl.set(ech, {opacity: 0}, 0).set([...nums, ...ticks, ...arcs, axis, ring], {opacity: 1}, 0).add(svg.createDrawable(axis), {draw: ['0 0', '0 1'], duration: 900, ease: 'inOut(3)'}, 0)
    .add(svg.createDrawable(ticks), {draw: ['0 0', '0 1'], duration: 300, delay: stagger(25)}, 500)
    .add(nums, {opacity: [0, 1], translateY: [20, 0], duration: 500, delay: stagger(25), ease: 'outExpo'}, 700)
    .add(ball, {opacity: [0, 1], duration: 300}, 1300);
  for (let j = 0; j < b - a; j++) { const t = 1600 + j * 620;
    tl.add(svg.createDrawable(arcs[j]), {draw: ['0 0', '0 1'], duration: 480, ease: 'inOut(2)'}, t)
      .add(ball, {...svg.createMotionPath(arcs[j]), rotate: 0, duration: 480, ease: 'inOut(2)'}, t)
      .add(bc, {scaleY: [{to: .62, duration: 90}, {to: 1.08, duration: 120}, {to: 1, duration: 140}], scaleX: [{to: 1.3, duration: 90}, {to: .95, duration: 120}, {to: 1, duration: 140}]}, t + 480)
      .add(nums[a + j + 1], {fill: [P.yel, P.chalk], duration: 600}, t + 480);
  }
  const tEnd = 1600 + (b - a) * 620;
  tl.add(svg.createDrawable(ring), {draw: ['0 0', '0 1'], duration: 600, ease: 'inOut(2)'}, tEnd)
    .add(ech, {opacity: [0, 1], scale: [.3, 1], y: [40, 0], duration: 700, ease: spring({bounce: .45, duration: 700}), delay: stagger(80)}, tEnd + 200)
    .add([...ech, ...nums, ...ticks, ...arcs, axis, ring, ball], {opacity: 0, duration: 500}, tEnd + 2600)
    .set(ball, {translateX: X(a), translateY: Y - 8}, tEnd + 3150);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   24 · ДИАГРАММА + FLIP ҚАЙТА ТІЗУ (bars spring, count-up, trend line, dot on path, createLayout sort)
   Біздің комбо — createLayout (anime.js 4.5) = HTML-дегі «Morph»
   ===================================================================== */
Combos.barsChart = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  host.style.background = `linear-gradient(180deg, #1A2132, ${P.ink})`;
  const data = o.data || [['Сөз', 42, P.sky], ['Сурет', 68, P.min], ['Карточка', 85, P.yel], ['Уақыт', 57, P.cor], ['Жұп', 74, P.wood], ['Сан түзуі', 91, P.plaster]];
  const chart = el('div', '', host, {position: 'absolute', left: '260px', top: '170px', width: '1400px', height: '640px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'});
  const grid = Array.from({length: 5}, (_, i) => el('div', '', host, {position: 'absolute', left: '240px', top: 170 + i * 160 + 'px', width: '1440px', height: '2px', background: 'rgba(245,240,230,.12)', transformOrigin: '0 50%'}));
  const cols = data.map(([name, v, c]) => { const col = el('div', '', chart, {width: '190px', height: '640px', position: 'relative'});
    const bar = el('div', '', col, {position: 'absolute', left: 0, right: 0, bottom: 0, height: v / 100 * 600 + 'px', background: c, borderRadius: '18px 18px 6px 6px', transformOrigin: '50% 100%'});
    const val = el('div', '', col, {position: 'absolute', left: 0, right: 0, bottom: v / 100 * 600 + 14 + 'px', textAlign: 'center', font: '800 52px/1 Rubik', color: P.chalk}, '0');
    el('div', '', col, {position: 'absolute', left: '-20px', right: '-20px', top: '656px', textAlign: 'center', font: '600 32px/1 Rubik', color: 'rgba(245,240,230,.8)'}, name);
    return {col, bar, val, v}; });
  const note = el('div', '', host, {position: 'absolute', right: '120px', top: '80px', font: '700 40px/1 Caveat', color: P.yel}, o.note || 'шартты мысал');
  const ttl = bigText(host, o.title || 'Өсу + қайта тізу', {left: '260px', top: '60px', fontSize: '72px'});
  const s = sv('svg', {viewBox: '0 0 1920 1080', class: 'cb-full', style: 'pointer-events:none'}, host);
  let line = null, dot = null;
  const drawLine = (t, at) => {
    if (line) line.remove(); if (dot) dot.remove();
    const pts = cols.map(c => { const r = c.col.getBoundingClientRect(), sr = host.getBoundingClientRect(), f = sr.width / W; return [(r.left - sr.left + r.width / 2) / f, (r.bottom - sr.top) / f - c.v / 100 * 600 - 70]; });
    line = sv('polyline', {points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: P.chalk, 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-dasharray': '1 0', opacity: .9}, s);
    const pth = sv('path', {d: 'M' + pts.map(p => p.join(' ')).join(' L'), fill: 'none', stroke: 'none'}, s);
    dot = sv('circle', {cx: 0, cy: 0, r: 16, fill: P.cor, stroke: P.chalk, 'stroke-width': 5}, s);
    t.add(svg.createDrawable(line), {draw: ['0 0', '0 1'], duration: 1100, ease: 'inOut(2)'}, at).add(dot, {...svg.createMotionPath(pth), duration: 1100, ease: 'inOut(2)'}, at);
  };
  const tl = k.tl();
  tl.add(grid, {scaleX: [0, 1], duration: 900, ease: 'inOut(3)', delay: stagger(80)}, 0)
    .add(cols.map(c => c.bar), {scaleY: [0, 1], duration: 1200, ease: spring({bounce: .35, duration: 1200}), delay: stagger(110)}, 300)
    .add(cols.map(c => c.val), {translateY: (e, i) => [cols[i].v / 100 * 600, 0], opacity: [0, 1], duration: 1200, ease: spring({bounce: .35, duration: 1200}), delay: stagger(110)}, 300);
  cols.forEach((c, i) => { const o_ = {v: 0}; tl.add(o_, {v: c.v, duration: 1200, ease: 'out(3)', onUpdate: () => { c.val.textContent = Math.round(o_.v); }}, 300 + i * 110); });
  tl.call(() => { const t = k.tl(); drawLine(t, 0); }, 1500);
  const layout = createLayout(chart, {duration: 1100, ease: 'inOut(4)'});
  let asc = true;
  k.timer({duration: 3200, loop: true, delay: 1000, onLoop: () => {
    if (line) { line.remove(); line = null; } if (dot) { dot.remove(); dot = null; }
    layout.record();
    cols.slice().sort((p, q) => asc ? p.v - q.v : q.v - p.v).forEach(c => chart.appendChild(c.col)); asc = !asc;
    layout.animate();
    const t = k.tl(); t.call(() => { const t2 = k.tl(); drawLine(t2, 0); }, 1200);
  }});
  return {tl, destroy() { try { layout.revert(); } catch (e) {} k.destroy(); }};
};

/* =====================================================================
   25 · СҰЙЫҚ ФОН (Lissajous blobs + border-radius morph + hue + glass card + gradient text)
   Біздің комбо
   ===================================================================== */
Combos.liquidBlobs = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  host.style.background = '#0E1220';
  const layer = el('div', '', host, {position: 'absolute', inset: 0});
  const B = [[P.cor, .21, .17, 0], [P.yel, .15, .23, 1.7], [P.min, .27, .13, 3.1], [P.sky, .12, .19, 4.4]].map(([c, fx, fy, ph]) => ({e: el('div', 'cb-blob', layer, {background: `radial-gradient(circle at 35% 35%, ${c}, ${c}00 70%)`}), fx, fy, ph}));
  const radii = ['42% 58% 70% 30% / 45% 45% 55% 55%', '70% 30% 46% 54% / 30% 39% 61% 70%', '50% 50% 34% 66% / 56% 68% 32% 44%', '38% 62% 63% 37% / 41% 44% 56% 59%'];
  B.forEach((b, i) => k.a(b.e, {borderRadius: [radii[i % 4], radii[(i + 1) % 4], radii[(i + 2) % 4]], duration: 7000 + i * 900, ease: 'inOutSine', alternate: true, loop: true}));
  const t0 = performance.now();
  k.timer({onUpdate: () => { const t = (performance.now() - t0) / 1000;
    B.forEach(b => { const x = 960 + Math.sin(t * b.fx * 2 + b.ph) * 520 - 410, y = 540 + Math.sin(t * b.fy * 2 + b.ph * 1.3) * 300 - 410, s = 1 + .18 * Math.sin(t * .7 + b.ph);
      b.e.style.transform = `translate(${x}px, ${y}px) scale(${s})`; }); }});
  k.a(layer, {filter: ['hue-rotate(0deg)', 'hue-rotate(40deg)'], duration: 6000, ease: 'inOutSine', alternate: true, loop: true});
  const cw_ = o.cardW || 1000, chh = o.cardH || 480;
  const card = el('div', '', host, {position: 'absolute', left: (W - cw_) / 2 + 'px', top: (H - chh) / 2 - 40 + 'px', width: cw_ + 'px', height: chh + 'px', borderRadius: '40px', background: 'rgba(255,255,255,.07)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.18), 0 40px 120px rgba(0,0,0,.35)', display: 'grid', placeItems: 'center', textAlign: 'center'});
  const tt = el('div', '', card, {font: `800 ${o.size || 150}px/1 Rubik`, backgroundImage: `linear-gradient(90deg, ${P.chalk}, ${P.yel}, ${P.cor}, ${P.min}, ${P.chalk})`, backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}, o.title || 'Сұйық фон');
  const st = el('div', '', card, {font: '700 54px/1 Caveat', color: 'rgba(245,240,230,.9)', marginTop: '-120px'}, o.sub || 'төрт дақ · төрт траектория');
  k.a(tt, {backgroundPosition: ['0% 50%', '100% 50%'], duration: 5000, ease: 'inOutSine', alternate: true, loop: true});
  const tl = k.tl();
  tl.add(B.map(b => b.e), {opacity: [0, 1], duration: 1500, delay: stagger(200)}, 0)
    .add(card, {opacity: [0, 1], scale: [.85, 1], filter: ['blur(20px)', 'blur(0px)'], duration: 1200, ease: 'outExpo'}, 400)
    .add(st, {opacity: [0, 1], y: [20, 0], duration: 800, ease: 'outExpo'}, 1100);
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   26 · КОНВЕЙЕР + САНАУЫШ (image strip with fisheye per frame, synced odometer)
   Шабыт: Canva «Match & Move» санауышы, «фильм таспасы» тәсілі
   ===================================================================== */
Combos.conveyorCounter = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  host.style.background = `linear-gradient(90deg, ${P.ink} 0%, #1C2436 100%)`;
  const D = o.items || [[24, 'оқушы сыныпта', 'cls'], [1, 'Айару — сөйлеуі қиын', 'aya'], [7, 'сабақтағы тәсіл', 'board'], [12, 'жауап — карточкада', 'pair'], [9, '10 есептің 9-ы дұрыс', 'note']];
  const od = odometer(k, host, 2, {dh: 330, dw: 210, style: {left: '170px', top: '300px'}});
  const lab = el('div', '', host, {position: 'absolute', left: '180px', top: '680px', font: '700 62px/1.1 Caveat', color: P.yel, width: '760px'}, '');
  const win = el('div', '', host, {position: 'absolute', left: '1130px', top: 0, width: '640px', height: '1080px', overflow: 'hidden',
    WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent)', maskImage: 'linear-gradient(180deg, transparent, #000 22%, #000 78%, transparent)', perspective: '1200px'});
  const strip = el('div', '', win, {position: 'absolute', left: '110px', top: 0, width: '420px'});
  const step = 270, cards = [];
  for (let i = 0; i < D.length * 3; i++) { const c = el('div', 'cb-ccard', strip, {top: i * step + 'px', backgroundImage: url(D[i % D.length][2])}); cards.push(c); }
  const S = {y: 540 - 120 - step * D.length};
  const fish = () => { strip.style.transform = `translateY(${S.y}px)`; cards.forEach((c, i) => { const cy = S.y + i * step + 120, d = cy - 540, a = Math.abs(d);
    c.style.transform = `scale(${1.12 - Math.min(a / 900, .4)}) rotateX(${-d / 18}deg)`; c.style.opacity = String(1 - Math.min(a / 650, .8));
    c.style.boxShadow = a < 80 ? `0 0 0 6px ${P.yel}, 0 20px 50px rgba(0,0,0,.45)` : '0 20px 50px rgba(0,0,0,.4)'; }); };
  fish();
  let i = 0;
  const next = () => { const [v, text] = D[i], t = k.tl();
    od.set(v, t, 0, 800);
    t.add(S, {y: 540 - 120 - step * (D.length + i), duration: 1000, ease: 'inOut(4)', onUpdate: fish}, 0)
      .add(lab, {innerHTML: scrambleText({text, chars: '0123456789', revealRate: 36})}, 150);
    i = (i + 1) % D.length; if (i === 0) t.set(S, {y: 540 - 120 - step * (D.length - 1)}, 1100).call(fish, 1100); };
  const tl = k.tl(); tl.call(next, 200);
  k.timer({duration: 2400, loop: true, delay: 200, onLoop: next});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   27 · ПРОЖЕКТОР (grayscale photo, coloured spotlight travels between people, lagging ring, label cards)
   Шабыт: Leila Gharani «Morph & Crop» (6,8 млн)
   ===================================================================== */
Combos.spotlightCrop = (host, o = {}) => {
  ensureCSS(); const k = kit(host);
  const POI = o.poi || [[929, 466, 120, 'Мұғалім', 'тақтада жазып тұр'], [638, 832, 130, 'Айару', 'жауапты біледі'], [829, 785, 120, 'Ерасыл', 'бірінші айқайлады']];
  const gray = el('div', 'cb-bg', host, {backgroundImage: url(o.img || 'cls'), filter: 'grayscale(1) brightness(.5)'});
  const color = el('div', 'cb-bg', host, {backgroundImage: url(o.img || 'cls')});
  const ring = el('div', '', host, {position: 'absolute', left: 0, top: 0, borderRadius: '50%', border: `6px solid ${P.yel}`, boxShadow: `0 0 40px rgba(244,201,93,.6)`});
  const card = el('div', 'cb-glass', host, {left: 0, top: 0, padding: '26px 34px', minWidth: '360px', opacity: 0});
  const cn = el('div', '', card, {font: '800 58px/1 Rubik', color: P.chalk}), cr = el('div', '', card, {font: '700 40px/1.1 Caveat', color: P.yel, marginTop: '8px'});
  const sp = {x: 960, y: 540, r: 0}, rg = {x: 960, y: 540, r: 0};
  const apply = () => { color.style.clipPath = `circle(${sp.r}px at ${sp.x}px ${sp.y}px)`; };
  const applyRing = () => { ring.style.transform = `translate(${rg.x - rg.r - 6}px, ${rg.y - rg.r - 6}px)`; ring.style.width = ring.style.height = 2 * rg.r + 12 + 'px'; };
  apply(); applyRing();
  let i = 0;
  const go = () => {
    const [x, y, r, name, role] = POI[i], t = k.tl();
    t.add(card, {opacity: 0, duration: 250}, 0)
      .add(sp, {x, y, r: [{to: r * .55, duration: 550, ease: 'in(2)'}, {to: r, duration: 600, ease: 'outBack(2)'}], duration: 1150, ease: 'inOut(4)', onUpdate: apply}, 0)
      .add(rg, {x, y, r: [{to: r * .5, duration: 650}, {to: r, duration: 700, ease: 'outElastic(1,.5)'}], duration: 1350, ease: 'inOut(3)', onUpdate: applyRing}, 120)
      .call(() => { cn.textContent = name; cr.textContent = role; const right = x + r + 400 < W;
        card.style.left = (right ? x + r + 40 : x - r - 440) + 'px'; card.style.top = Math.max(60, Math.min(H - 400, y - 90)) + 'px'; }, 1000)
      .add(card, {opacity: [0, 1], x: [x + r + 400 < W ? -40 : 40, 0], duration: 700, ease: 'outExpo'}, 1050)
      .add(cn, {innerHTML: scrambleText({text: name, chars: '●○', revealRate: 30})}, 1050);
    i = (i + 1) % (POI.length + 1);
    if (i === 0) { t.add(card, {opacity: 0, duration: 300}, 2300).add(sp, {r: 2300, duration: 1200, ease: 'in(3)', onUpdate: apply}, 2300).add(rg, {r: 0, duration: 600, onUpdate: applyRing}, 2300)
      .add(sp, {r: 0, duration: 10, onUpdate: apply}, 3600); i = 0; }
  };
  const tl = k.tl(); tl.add(gray, {scale: [1.1, 1], duration: 2000, ease: 'out(3)'}, 0).add(color, {scale: [1.1, 1], duration: 2000, ease: 'out(3)'}, 0).call(go, 400);
  k.timer({duration: 2700, loop: true, delay: 400, onLoop: go});
  return {tl, destroy: k.destroy};
};

/* =====================================================================
   28 · ҚОНТУР → СУРЕТПЕН ТОЛУ (stroke draw + image-filled text wipe + pattern pan + spacing)
   Шабыт: «NATURE» мәтін ішіндегі видео (82 мың ♥), «VAN GOGH» (16,2 млн)
   ===================================================================== */
Combos.textMaskFill = (host, o = {}) => {
  ensureCSS(); const k = kit(host), id = 'tm' + (++UID), word = o.word || 'СЫНЫП';
  host.style.background = `linear-gradient(135deg, ${P.ink}, #24304A)`;
  const s = sv('svg', {viewBox: '0 0 1920 1080', class: 'cb-full'}, host);
  const defs = sv('defs', {}, s);
  const pat = sv('pattern', {id: id + 'p', patternUnits: 'userSpaceOnUse', width: 1920, height: 1080, patternTransform: 'translate(0 0) scale(1.15)'}, defs);
  sv('image', {href: IMG(o.img || 'ext') || '', width: 1920, height: 1080, preserveAspectRatio: 'xMidYMid slice'}, pat);
  const clip = sv('clipPath', {id: id + 'c'}, defs); const cr = sv('rect', {x: 0, y: 1080, width: 1920, height: 1080}, clip);
  const T = (attrs) => sv('text', Object.assign({x: 960, y: 640, 'text-anchor': 'middle', 'font-size': 330, 'font-family': 'Rubik', 'font-weight': 800}, attrs), s, word);
  const fillT = T({fill: `url(#${id}p)`, 'clip-path': `url(#${id}c)`});
  const strokeT = T({fill: 'none', stroke: P.chalk, 'stroke-width': 4, 'stroke-dasharray': 2400, 'stroke-dashoffset': 2400});
  const sub = el('div', '', host, {position: 'absolute', left: 0, right: 0, top: '760px', textAlign: 'center', font: '700 56px/1 Caveat', color: P.yel, opacity: 0}, o.sub || 'алдымен контур, сосын — сурет');
  const tl = k.tl({loop: true, loopDelay: 1500});
  tl.add(strokeT, {strokeDashoffset: [2400, 0], duration: 1800, ease: 'inOut(2)'}, 0)
    .add([strokeT, fillT], {letterSpacing: ['40px', '0px'], duration: 2400, ease: 'out(3)'}, 0)
    .add(cr, {y: [1080, 0], duration: 1400, ease: 'inOut(3)'}, 1500)
    .add(pat, {patternTransform: ['translate(0 0) scale(1.15)', 'translate(-220 -90) scale(1.3)'], duration: 5000, ease: 'inOutSine'}, 1500)
    .add(strokeT, {stroke: [P.chalk, P.yel], strokeWidth: [4, 8], duration: 800}, 2700)
    .add(sub, {opacity: [0, 1], y: [20, 0], duration: 800, ease: 'outExpo'}, 2600)
    .add([sub, fillT, strokeT], {opacity: 0, duration: 600}, 6200)
    .set([fillT, strokeT], {opacity: 1, strokeDashoffset: 2400}, 6900).set(cr, {y: 1080}, 6900);
  return {tl, destroy: k.destroy};
};

/* ---------------------------------------------------------------- экспорт */
Combos.P = P; Combos.kit = kit; Combos.ensureCSS = ensureCSS; Combos.odometer = Combos.odometer; Combos.helpers = {el, sv, rng, inkPoint, textPoints, odometer};
root.Combos = Combos;
})(typeof window !== 'undefined' ? window : globalThis);
