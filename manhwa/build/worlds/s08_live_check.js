// node build/worlds/s08_live_check.js <outDir> — s08 strip p .02/.3/.4/.5/.6/.7/.85 -> s08_<pp>.jpg, ms/frame, determinism pair
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.resolve(process.argv[2] || path.join(ROOT, 'stills/_e'));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 720, height: 1008 }, deviceScaleFactor: 1 }); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('file://' + path.join(ROOT, 'index.html') + '?capture=1');
  await pg.waitForFunction(() => window.__mk && document.querySelector('#loader.done') || document.body.dataset.err, null, { timeout: 90000 });
  await pg.evaluate(() => window.__mk.ready);
  const seg = await pg.evaluate(() => window.__mk.segments.find(s => s.id === 's08'));
  let T = 0, n = 0, ms = 0;
  const step = async (pp, dt) => { T += dt; const t0 = Date.now(); await pg.evaluate(([s, t]) => { window.__mk.render(s, t, { holding: false }); }, [seg.start + pp * seg.len, T]); ms += Date.now() - t0; n++; };
  for (const pp of [0.02, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85]) {
    for (let i = 0; i < 6; i++) await step(pp - 0.06 * (1 - (i + 1) / 6), 1 / 30);
    for (let i = 0; i < 3; i++) await step(pp, 0.1);
    await pg.screenshot({ path: OUT + '/s08_' + String(Math.round(pp * 100)).padStart(2, '0') + '.jpg', quality: 85, type: 'jpeg' });
  }
  console.log('capture ms/frame:', (ms / n).toFixed(1), 'over', n);
  const shot = async f => { await pg.evaluate(([s, t]) => { window.__mk.render(s, t, { holding: false }); }, [seg.start + .55 * seg.len, T]); await pg.screenshot({ path: f, type: 'png' }); };
  await shot(OUT + '/_d8a.png'); await shot(OUT + '/_d8b.png');
  console.log('determinism equal:', fs.readFileSync(OUT + '/_d8a.png').equals(fs.readFileSync(OUT + '/_d8b.png')));
  console.log('errs', errs.slice(0, 5), await pg.evaluate(() => document.body.dataset.err || ''));
  await b.close();
})();
