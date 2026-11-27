// index.html-ден PPTX үшін фондарды, объектілерді және мәтін орындарын шығарады.
// Іске қосу: node build/export_assets.js <url> <out_dir>
const {chromium} = require('playwright');
const fs = require('fs');
(async () => {
  const [url, out] = process.argv.slice(2);
  fs.mkdirSync(out + '/bg', {recursive: true}); fs.mkdirSync(out + '/props', {recursive: true});
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 1920, height: 1080}});
  await p.goto(url); await p.waitForTimeout(2500);
  await p.addStyleTag({content: `.counter,.hint,.notes,.growbar,.fxlayer{display:none!important}
    .slide{visibility:hidden!important;opacity:1!important}.slide.cap-on{visibility:visible!important}
    .cap-on .fx{display:none!important}`});
  const n = await p.evaluate(() => document.querySelectorAll('.deck-stage > .slide').length);
  const meta = [];
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => {
      const S = [...document.querySelectorAll('.deck-stage > .slide')];
      S.forEach(s => s.classList.remove('active', 'cap-on', 'frozen'));
      S[i].classList.add('active', 'cap-on', 'frozen');
      S[i].style.setProperty('--td', '0s');
    }, i);
    await p.waitForTimeout(150);
    // 1) фон: тек .bg қабаты
    await p.evaluate(i => { const s = document.querySelectorAll('.deck-stage > .slide')[i];
      [...s.children].forEach(c => c.style.visibility = c.classList.contains('bg') ? 'visible' : 'hidden'); }, i);
    await p.screenshot({path: `${out}/bg/${String(i + 1).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 86});
    // 2) объектілер: мөлдір фонда
    await p.evaluate(i => { const s = document.querySelectorAll('.deck-stage > .slide')[i];
      [...s.children].forEach(c => c.style.visibility = c.classList.contains('props') ? 'visible' : 'hidden');
      document.querySelector('.deck-stage').style.background = 'transparent';
      document.querySelector('.deck-viewport').style.background = 'transparent';
      document.body.style.background = 'transparent'; document.documentElement.style.background = 'transparent'; }, i);
    const boxes = await p.evaluate(i => {
      const s = document.querySelectorAll('.deck-stage > .slide')[i];
      return [...s.querySelectorAll('.props > .propbox, .props > .rose-frame')].map(e => {
        const r = e.getBoundingClientRect(); const pad = 40;
        return {x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), w: Math.min(1920, r.right + pad) - Math.max(0, r.x - pad), h: Math.min(1080, r.bottom + pad + 30) - Math.max(0, r.y - pad)};
      });
    }, i);
    const props = [];
    for (let k = 0; k < boxes.length; k++) {
      const bx = boxes[k]; if (bx.w <= 0 || bx.h <= 0) continue;
      const f = `${String(i + 1).padStart(2, '0')}_${k}.png`;
      await p.screenshot({path: `${out}/props/${f}`, omitBackground: true, clip: {x: bx.x, y: bx.y, width: bx.w, height: bx.h}});
      props.push({file: f, ...bx});
    }
    // 3) мәтін мен карточкалар
    const data = await p.evaluate(i => {
      const s = document.querySelectorAll('.deck-stage > .slide')[i];
      [...s.children].forEach(c => c.style.visibility = '');
      const boxes = [...s.querySelectorAll('.panel:not(.lay-center), .note, .cr, .path-cap')].map(e => {
        const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return {cls: e.className.split(' ')[0], x: r.x, y: r.y, w: r.width, h: r.height, bg: cs.backgroundColor, lay: (e.className.match(/lay-(\w+)/) || [])[1] || ''};
      });
      const texts = [];
      s.querySelectorAll('*').forEach(e => {
        if (e.closest('svg') || e.closest('.bg') || e.closest('.props') || e.closest('.fx')) return;
        const direct = [...e.childNodes].some(n => (n.nodeType === 3 && n.textContent.trim()) || n.nodeName === 'BR');
        if (!direct) return;
        if (e.parentElement && e.parentElement !== s && [...e.parentElement.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !['DIV','SECTION'].includes(e.parentElement.tagName)) return;
        const r = e.getBoundingClientRect(); if (!r.width) return;
        const cs = getComputedStyle(e);
        // inline <b>/<em> ішіндегі мәтінді бөлек жүгіртпе (run) ретінде жинаймыз
        const runs = [];
        e.childNodes.forEach(n => {
          if (n.nodeType === 3) runs.push({t: n.textContent, b: null});
          else if (n.nodeName === 'BR') runs.push({t: '\n', b: null});
          else if (n.nodeType === 1 && ['B','EM','I','SPAN'].includes(n.nodeName) && !n.children.length && n.closest('p,h2,.cap,.path-cap')===e) {
            const c2 = getComputedStyle(n); runs.push({t: n.innerText + (n.nodeName==='B' && e.classList.contains('cap') || e.classList.contains('path-cap') ? '\n' : ''), b: {w: c2.fontWeight, c: c2.color, s: parseFloat(c2.fontSize), f: c2.fontFamily, i: c2.fontStyle}});
          }
        });
        texts.push({tag: e.tagName, cls: e.className, x: r.x, y: r.y, w: r.width, h: r.height,
          size: parseFloat(cs.fontSize), weight: cs.fontWeight, style: cs.fontStyle, family: cs.fontFamily, color: cs.color,
          align: cs.textAlign, lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3, tt: cs.textTransform, ls: cs.letterSpacing,
          runs});
      });
      return {boxes, texts, tr: s.dataset.tr, zx: +s.dataset.zx, zy: +s.dataset.zy, act: +s.dataset.act};
    }, i);
    await p.evaluate(() => { document.querySelector('.deck-stage').style.background = ''; document.body.style.background = ''; document.documentElement.style.background=''; document.querySelector('.deck-viewport').style.background=''; });
    meta.push({n: i + 1, props, ...data});
  }
  fs.writeFileSync(out + '/meta.json', JSON.stringify(meta, null, 1));
  console.log('exported', meta.length);
  await b.close();
})();
