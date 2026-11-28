// node build/worlds/s07_live_check.js <outDir> [html]  — s07 hold -> release -> impact -> +0.3/+0.8/+1.5 s frames, capture ms/frame, determinism pair.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.resolve(process.argv[2] || path.join(ROOT, 'stills/_e'));
const HTML = path.resolve(ROOT, process.argv[3] || 'index.html');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 720, height: 1008 }, deviceScaleFactor: 1 }); const errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  await pg.goto('file://' + HTML + '?capture=1');
  await pg.waitForFunction(() => window.__mk && document.querySelector('#loader.done') || document.body.dataset.err, null, { timeout: 90000 });
  await pg.evaluate(() => window.__mk.ready);
  const seg = await pg.evaluate(() => window.__mk.segments.find(s => s.id === 's07'));
  const sv = seg.start + seg.len * 0.3; let T = 0, n = 0, ms = 0;
  const step = async (dt, hold, name) => {
    T += dt; const t0 = Date.now();
    await pg.evaluate(([s, t, h]) => { window.__mk.render(s, t, { holding: h }); }, [sv, T, hold]); ms += Date.now() - t0; n++;
    if (name) await pg.screenshot({ path: OUT + '/s07_' + name + '.jpg', quality: 85, type: 'jpeg' });
  };
  await step(.05, false); await step(.05, true, 'hold0'); for (let i = 0; i < 12; i++) await step(.05, true); await step(.02, true, 'hold');
  for (let i = 0; i < 10; i++) await step(.05, true);
  await step(.03, false); await step(.14, false, 'release');
  await step(.2, false, 'impact'); await step(.1, false, 'p0.3'); await step(.5, false, 'p0.8'); await step(.7, false, 'p1.5');
  console.log('capture ms/frame (render call only): %s over %d frames', (ms / n).toFixed(1), n);
  // determinism: same (s,t) twice
  const shot = async f => { await pg.evaluate(([s, t]) => { window.__mk.render(s, t, { holding: false }); }, [sv, T]); await pg.screenshot({ path: f, type: 'png' }); };
  await shot(OUT + '/_det_a.png'); await shot(OUT + '/_det_b.png');
  const a = fs.readFileSync(OUT + '/_det_a.png'), c = fs.readFileSync(OUT + '/_det_b.png'); console.log('determinism PNG bytes equal:', a.equals(c));
  console.log('three:', await pg.evaluate(() => window.MK.three ? JSON.stringify({ ok: MK.three.ok }) : 'absent'));
  console.log('errs:', errs.slice(0, 6), await pg.evaluate(() => document.body.dataset.err || ''));
  await b.close();
})();
