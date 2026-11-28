// manhwa/build/trailer/posters.js — 3 high-res stills -> manhwa/posters/{title,tiger,finale}.jpg (1080x1512, DPR 1, ?capture=1)
//   node build/trailer/posters.js   (env MK_HTML = built html relative to manhwa/)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..'), URL = 'file://' + path.join(ROOT, process.env.MK_HTML || 'index.html') + '?capture=1';
const OUT = path.join(ROOT, 'posters'); fs.mkdirSync(OUT, { recursive: true });
const SHOTS = [['title', 's01', 0.85], ['tiger', 's06', 0.6], ['finale', 's09', 0.9]];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await b.newPage({ viewport: { width: 1080, height: 1512 }, deviceScaleFactor: 1 }); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.__mk && document.querySelector('#loader.done') || (document.body.dataset && document.body.dataset.err), null, { timeout: 60000 });
  await page.evaluate(() => window.__mk.ready);
  const segs = await page.evaluate(() => window.__mk.segments); let T = 0;
  for (const [name, id, p] of SHOTS) {
    const g = segs.find(x => x.id === id); if (!g) { console.error('missing segment', id); process.exitCode = 1; continue; }
    const s = g.start + p * g.len, ramp = Math.min(0.12, p * g.len);
    const step = (sv, dt) => { T += dt; return page.evaluate(([a, t]) => window.__mk.render(a, t, { holding: false }), [sv, T]); };
    for (let i = 0; i < 8; i++) await step(s - ramp * (1 - (i + 1) / 8), 1 / 30);
    for (let i = 0; i < 10; i++) await step(s, 0.1);                       // ~1 s of settle
    const f = path.join(OUT, name + '.jpg');
    await page.screenshot({ path: f, type: 'jpeg', quality: 90 });
    console.log(name, id, 'p=' + p, (fs.statSync(f).size / 1024).toFixed(0) + ' KB');
  }
  const e = await page.evaluate(() => document.body.dataset.err || ''); if (e) errs.push(e);
  if (errs.length) { console.error('ERRORS', errs.slice(0, 5)); process.exitCode = 1; }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
