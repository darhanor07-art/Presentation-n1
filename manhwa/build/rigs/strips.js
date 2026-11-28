// Frame strips for the D2 rig check. node build/rigs/strips.js  (env MK_HTML default build/_d2.html, MK_OUT default stills/_d2/extra)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..'), URL = 'file://' + path.join(ROOT, process.env.MK_HTML || 'build/_d2.html') + '?capture=1';
const OUT = path.join(ROOT, process.env.MK_OUT || 'stills/_d2/extra'); fs.mkdirSync(OUT, { recursive: true });
const STRIPS = {
  s03_carve: { seg: 's03', ps: [.9, .9, .9, .9, .9, .9, .9, .9], dt: .11 },
  s06_wake: { seg: 's06', ps: [.3, .38, .46, .52, .6, .72, .88, .93, .97], dt: 0 },
  s09_walk: { seg: 's09', ps: [.08, .2, .3, .45, .55, .68, .82, .95, 1], dt: 0 },
};
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await b.newPage({ viewport: { width: 720, height: 1008 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL); await page.waitForFunction(() => window.__mk && document.querySelector('#loader.done'), null, { timeout: 60000 }); await page.evaluate(() => window.__mk.ready);
  const segs = await page.evaluate(() => window.__mk.segments); let T = 100;
  for (const [name, d] of Object.entries(STRIPS)) {
    const g = segs.find(x => x.id === d.seg);
    for (let i = 0; i < d.ps.length; i++) {
      const s = g.start + d.ps[i] * g.len;
      for (let k = 0; k < 6; k++) { T += d.dt ? d.dt / 6 : .05; await page.evaluate(([s, t]) => window.__mk.render(s, t), [s - .02 * (5 - k), T]); }
      await page.evaluate(([s, t]) => window.__mk.render(s, t), [s, T]);
      await page.screenshot({ path: path.join(OUT, `${name}_${i}.jpg`), type: 'jpeg', quality: 88 });
    }
  }
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'strips ok'); await b.close();
})();
