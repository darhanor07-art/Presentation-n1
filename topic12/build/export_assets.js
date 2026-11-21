// topic12/index.html-ден PPTX және preview үшін материал шығарады.
//   node topic12/build/export_assets.js <out> --stills          → bg/NN.jpg, gfx/NN.png, props/*.png, meta.json
//   node topic12/build/export_assets.js <out> --frames 1-15     → frames/NN/000.jpg … (30 fps, 1280×720)
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', 'index.html') + '?static=1&q=hi' + (process.argv[3] === '--frames' ? '&msaa=0' : '');
// ауысудан кейін видеоға қосылатын «әрекет» уақыты (секунд): тақтаға жазу, карточка көтеру т.б.
const HOLD = {1: 1.2, 2: 1.5, 3: 3.4, 4: 2.4, 5: 1.0, 6: 1.6, 7: 1.0, 8: 1.0, 9: 1.0, 10: 2.0, 11: 1.0, 12: 4.3, 13: 1.2, 14: 1.5, 15: 4.0,
  16: 1.4, 17: 3.4, 18: 4.0, 19: 4.2, 20: 1.6, 21: 5.6, 22: 4.0, 23: 2.2, 24: 3.2, 25: 1.0, 26: 4.8, 27: 1.5, 28: 1.5, 29: 1.2, 30: 2.0};
const ARGS = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'];
const pad = k => String(k).padStart(2, '0');
const save = (p, dataUrl) => fs.writeFileSync(p, Buffer.from(dataUrl.split(',')[1], 'base64'));
async function open(b, opts = {}) {
  const p = await b.newPage({viewport: {width: 1920, height: 1080}, ...opts});
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs;
  await p.goto(URL); await p.waitForFunction(() => window.deckAPI || document.body.dataset.err, null, {timeout: 240000});
  const err = await p.evaluate(() => document.body.dataset.err); if (err) throw new Error(err);
  await p.waitForTimeout(500); return p;
}
(async () => {
  const [out, mode, range] = process.argv.slice(2);
  const b = await chromium.launch({args: ARGS});
  if (mode === '--stills') {
    for (const d of ['bg', 'gfx', 'props']) fs.mkdirSync(`${out}/${d}`, {recursive: true});
    const p = await open(b);
    await p.addStyleTag({content: `.notext,.notext *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}
      #notes,.edit-toggle,.edit-hotzone,.toast{display:none!important} .panel::before{display:none!important}`});
    const n = await p.evaluate(() => deckAPI.count), meta = [];
    for (let i = 0; i < n; i++) {
      const D = await p.evaluate(i => deckAPI.dur(i), i);
      await p.evaluate(i => deckAPI.show(i), i);
      save(`${out}/bg/${pad(i + 1)}.jpg`, await p.evaluate(([i, t]) => deckAPI.frame(i, t), [i, D + HOLD[i + 1] + 2]));
      await p.waitForTimeout(80);
      const data = await p.evaluate(i => {
        const st = document.getElementById('deckStage').getBoundingClientRect();
        const roots = [document.querySelectorAll('.deck-stage > .slide')[i], document.getElementById('hud')];
        const isText = e => !e.closest('svg') && !e.closest('#props') && [...e.childNodes].some(c => (c.nodeType === 3 && c.textContent.trim()) || c.nodeName === 'BR');
        const els = roots.flatMap(r => [r, ...r.querySelectorAll('*')]).filter(isText).filter(e => getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > .05);
        const INL = ['SPAN', 'B', 'EM', 'I', 'STRONG', 'SMALL'];
        const top = els.filter(e => !els.some(o => o !== e && o.contains(e) && INL.includes(e.tagName) && getComputedStyle(e).display === 'inline'));
        const texts = top.map(e => {
          const r = e.getBoundingClientRect(), cs = getComputedStyle(e), runs = [];
          const walk = (node, sty) => node.childNodes.forEach(c => {
            if (c.nodeType === 3) runs.push({t: c.textContent, s: sty});
            else if (c.nodeName === 'BR') runs.push({t: '\n', s: sty});
            else if (c.nodeType === 1 && !c.closest('svg')) { const k = getComputedStyle(c);
              if (k.display === 'inline' || k.display === 'inline-block') walk(c, {c: k.color, w: k.fontWeight, z: parseFloat(k.fontSize), i: k.fontStyle, f: k.fontFamily, hide: c.classList.contains('gx') ? 1 : 0, deco: k.textDecorationLine}); }
          });
          walk(e, null);
          const rg = document.createRange(); rg.selectNodeContents(e); const rr = rg.getBoundingClientRect();
          return {x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height, tx: rr.left - st.left, tw: rr.width, size: parseFloat(cs.fontSize), weight: cs.fontWeight, style: cs.fontStyle,
            color: cs.color, align: cs.textAlign, family: cs.fontFamily, lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3, tt: cs.textTransform,
            ls: parseFloat(cs.letterSpacing) || 0, deco: cs.textDecorationLine, ws: cs.whiteSpace, runs, credits: !!e.closest('#credits'),
            vmid: /grid|flex/.test(cs.display) && cs.alignItems === 'center', hcen: /grid|flex/.test(cs.display) && (cs.justifyItems === 'center' || cs.justifyContent === 'center')};
        }).filter(t => t.w > 2 && t.h > 2 && t.y < 1080 && t.y + t.h > 0);
        top.forEach(e => e.classList.add('notext'));
        return {texts, props: deckAPI.props(i), act: META[i].act, tr: META[i].tr, who: META[i].who};
      }, i);
      // графика қабаты: мәтінсіз, 3D-сызусыз, детальдарсыз
      await p.evaluate(() => { document.getElementById('gl').style.visibility = 'hidden'; document.getElementById('props').style.visibility = 'hidden';
        for (const s of ['.deck-stage', '.deck-viewport', 'body', 'html']) document.querySelector(s).style.background = 'transparent'; });
      await p.screenshot({path: `${out}/gfx/${pad(i + 1)}.png`, omitBackground: true});
      await p.evaluate(() => { document.getElementById('gl').style.visibility = ''; document.getElementById('props').style.visibility = '';
        document.querySelectorAll('.notext').forEach(e => e.classList.remove('notext')); });
      meta.push({n: i + 1, dur: D, hold: HOLD[i + 1], ...data}); process.stdout.write(`${i + 1} `);
    }
    fs.writeFileSync(`${out}/meta.json`, JSON.stringify(meta, null, 1));
    // детальдардың суреттері (2× сапа, мөлдір фон)
    const q = await open(b, {deviceScaleFactor: 2});
    await q.evaluate(() => { for (const s of ['.deck-stage', '.deck-viewport', 'body', 'html']) document.querySelector(s).style.background = 'transparent';
      document.getElementById('gl').style.visibility = 'hidden'; document.querySelectorAll('.slide').forEach(s => s.classList.remove('active')); document.getElementById('hud').style.display = 'none'; });
    for (const [k, v] of [['x', ''], ['eq', ''], ['eq', 'neq'], ['c', ''], ['t', ''], ['s', ''], ['nl', ''], ['card', '']]) {
      await q.evaluate(([k, v]) => { document.querySelectorAll('.prop').forEach(e => e.style.opacity = 0); const el = document.getElementById('p-' + k);
        anime.utils.set(el, {x: 20, y: 20, scale: 1, rotate: 0, opacity: 1}); const sl = el.querySelector('.slash'); if (sl) anime.utils.set(sl, {opacity: v ? 1 : 0, scale: 1}); }, [k, v]);
      await q.waitForTimeout(60);
      await (await q.$('#p-' + k)).screenshot({path: `${out}/props/${k}${v ? '_' + v : ''}.png`, omitBackground: true});
    }
    console.log('\nstills', n, p.errs.slice(0, 3));
  } else if (mode === '--overlays') {   // preview үшін: мәтін + графика + детальдар (3D-сызусыз, мөлдір фон)
    fs.mkdirSync(`${out}/ovl`, {recursive: true});
    const p = await open(b);
    await p.addStyleTag({content: '#notes,.edit-toggle,.edit-hotzone,.toast{display:none!important}'});
    await p.evaluate(() => { document.getElementById('gl').style.visibility = 'hidden'; for (const s of ['.deck-stage', '.deck-viewport', 'body', 'html']) document.querySelector(s).style.background = 'transparent'; });
    const n = await p.evaluate(() => deckAPI.count);
    for (let i = 0; i < n; i++) { await p.evaluate(i => deckAPI.show(i), i); await p.waitForTimeout(120); await p.screenshot({path: `${out}/ovl/${pad(i + 1)}.png`, omitBackground: true}); }
    console.log('overlays', n);
  } else if (mode === '--frames') {
    const [a, z] = (range || '1-30').split('-').map(Number);
    const p = await open(b);
    await p.evaluate(() => deckAPI.size(1280, 720));
    for (let n = a; n <= z; n++) {
      const i = n - 1, D = await p.evaluate(i => deckAPI.dur(i), i), F = Math.round((D + HOLD[n]) * 30), dir = `${out}/frames/${pad(n)}`;
      fs.mkdirSync(dir, {recursive: true});
      for (let f = 0; f < F; f++) { const fp = `${dir}/${String(f).padStart(3, '0')}.jpg`; if (fs.existsSync(fp)) continue;
        save(fp, await p.evaluate(([i, t]) => deckAPI.frame(i, t), [i, f / 30])); }
      process.stdout.write(`${n}:${F} `);
    }
    console.log('\nframes done', p.errs.slice(0, 3));
  }
  await b.close();
})();
