// node build/worlds/s07_ripple_debug.js <outDir> — only the live 3D bell through the print shader (no 2D fx) at several tau since impact
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.resolve(process.argv[2] || 'stills/_e'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 720, height: 1008 }, deviceScaleFactor: 1 });
  await pg.goto('file://' + path.join(__dirname, '..', '..', 'index.html') + '?capture=1');
  await pg.waitForFunction(() => window.__mk && document.querySelector('#loader.done')); await pg.evaluate(() => window.__mk.ready);
  for (const tau of [-1, 0.06, 0.15, 0.3, 0.6]) {
    await pg.evaluate((tau) => {
      const P = MK.P, L = MK.art.bellLive(); P.begin(); P.cover({ c: 'red', t: .5, a: 0 });
      L.update({ th: 0, tauI: tau, p: .3, t: 1 }); L.render(P);
      MK.GL.draw(P, { time: 0, grain: 1, shake: [0, 0], misreg: [0, 0], ripple: [0, 0, -1e4, 0], rippleW: 24, flash: [0, 0, 0, 0] });
    }, tau);
    await pg.screenshot({ path: OUT + '/rip_' + (tau < 0 ? 'none' : Math.round(tau * 100)) + '.png', clip: { x: 130, y: 180, width: 400, height: 620 } });
  }
  await b.close();
})();
