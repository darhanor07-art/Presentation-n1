// topic10/index.html-ден PPTX үшін материал шығарады:
//   bg/NN.jpg      — слайдтың WebGL фоны (тыныш күй)
//   gfx/NN.png     — мәтінсіз графика қабаты (мөлдір)
//   frames/NN/*.jpg — NN-слайдқа кіру ауысуының кадрлары (30 fps, 1280×720)
//   meta.json      — мәтін блоктарының орны мен стилі
// Іске қосу: node topic10/build/export_assets.js http://localhost:8765/topic10/index.html <out_dir>
const {chromium} = require('playwright');
const fs = require('fs');
(async () => {
  const [url, out] = process.argv.slice(2);
  for (const d of ['bg', 'gfx', 'frames']) fs.mkdirSync(`${out}/${d}`, {recursive: true});
  const b = await chromium.launch({args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: 1920, height: 1080}});
  await p.goto(url + '?static=1'); await p.waitForFunction(() => window.deckAPI, null, {timeout: 60000}); await p.waitForTimeout(800);
  await p.addStyleTag({content: `.notext,.notext *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}
    .hint,.notes{display:none!important}`});
  const n = await p.evaluate(() => deckAPI.count);
  const pad = k => String(k).padStart(2, '0');
  const save = async (path, dataUrl) => fs.writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  const meta = [];
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => { deckAPI.show(i); deckAPI.bg(i); }, i); await p.waitForTimeout(120);
    await save(`${out}/bg/${pad(i + 1)}.jpg`, await p.evaluate(() => deckAPI.grab()));
    // мәтін элементтері: тікелей мәтіні бар, SVG емес, графикалық деп белгіленбеген
    const data = await p.evaluate(i => {
      const s = document.querySelectorAll('.deck-stage > .slide')[i];
      const st = document.getElementById('deckStage').getBoundingClientRect();
      const isText = e => !e.closest('svg') && !e.closest('.btxt') && !e.closest('.letters') &&
        [...e.childNodes].some(c => (c.nodeType === 3 && c.textContent.trim()) || c.nodeName === 'BR');
      const els = [...s.querySelectorAll('*')].filter(isText);
      // ішкі (inline) элементтерді бөлек емес, ата-анасының жүгіртпесі ретінде аламыз
      const top = els.filter(e => !els.some(o => o !== e && o.contains(e) && ['SPAN','B','EM','I','STRONG'].includes(e.tagName) && getComputedStyle(e).display === 'inline'));
      const texts = top.map(e => {
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        const runs = [];
        const walk = (node, sty) => node.childNodes.forEach(c => {
          if (c.nodeType === 3) runs.push({t: c.textContent, s: sty});
          else if (c.nodeName === 'BR') runs.push({t: '\n', s: sty});
          else if (c.nodeType === 1 && !c.closest('svg')) { const k = getComputedStyle(c);
            if (k.display === 'inline') walk(c, {c: k.color, w: k.fontWeight, z: parseFloat(k.fontSize), i: k.fontStyle}); }
        });
        walk(e, null);
        return {x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height, tag: e.tagName, cls: e.className && e.className.baseVal === undefined ? e.className : '',
          size: parseFloat(cs.fontSize), weight: cs.fontWeight, style: cs.fontStyle, color: cs.color, align: cs.textAlign,
          lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3, tt: cs.textTransform, ls: parseFloat(cs.letterSpacing) || 0, runs};
      }).filter(t => t.w > 2 && t.h > 2);
      top.forEach(e => e.classList.add('notext'));
      return {texts, act: META[i].act, tr: META[i].tr, kind: META[i].kind};
    }, i);
    // графика қабаты: мәтінсіз, фонсыз
    await p.evaluate(() => { document.getElementById('gl').style.visibility = 'hidden';
      for (const sel of ['.deck-stage', '.deck-viewport', 'body', 'html']) document.querySelector(sel).style.background = 'transparent'; });
    await p.screenshot({path: `${out}/gfx/${pad(i + 1)}.png`, omitBackground: true});
    await p.evaluate(() => { document.getElementById('gl').style.visibility = '';
      document.querySelectorAll('.notext').forEach(e => e.classList.remove('notext')); });
    meta.push({n: i + 1, ...data});
  }
  fs.writeFileSync(`${out}/meta.json`, JSON.stringify(meta, null, 1));
  // ауысу кадрлары (SKIP_FRAMES=1 болса өткізіледі)
  if (process.env.SKIP_FRAMES) { console.log('frames skipped'); await b.close(); return; }
  await p.evaluate(() => deckAPI.size(1280, 720));
  for (let i = 0; i < n; i++) {
    const dur = await p.evaluate(i => deckAPI.dur(i), i), F = Math.max(24, Math.round(dur / 1000 * 30));
    fs.mkdirSync(`${out}/frames/${pad(i + 1)}`, {recursive: true});
    for (let f = 0; f < F; f++) {
      const u = await p.evaluate(([i, q]) => { deckAPI.frame(i, q); return deckAPI.grab(); }, [i, f / (F - 1)]);
      await save(`${out}/frames/${pad(i + 1)}/${String(f).padStart(3, '0')}.jpg`, u);
    }
    process.stdout.write(`${i + 1}:${F} `);
  }
  console.log('\nexported', n);
  await b.close();
})();
