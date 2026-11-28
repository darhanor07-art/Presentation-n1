const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 720, height: 1008 } });
  await pg.goto('file://' + require('path').join(__dirname, '..', '..') + '/build/_d1.html?capture=1');
  await pg.waitForFunction(() => window.__mk && document.querySelector('#loader.done'), null, { timeout: 60000 });
  await pg.evaluate(() => window.__mk.ready);
  const seg = await pg.evaluate(() => window.__mk.segments.find(s => s.id === 's07'));
  const sv = seg.start + seg.len * 0.3; let T = 0;
  const step = async (dt, hold, name) => { T += dt; await pg.evaluate(([s, t, h]) => { window.__mk.render(s, t, { holding: h }); }, [sv, T, hold]); if (name) await pg.screenshot({ path: '' + require('path').join(__dirname, '..', '..') + '/stills/_d1/s07_' + name + '.jpg', quality: 80, type: 'jpeg' }); };
  await step(.05, false); for (let i = 0; i < 20; i++) await step(.05, true); await step(.02, true, 'hold');
  for (let i = 0; i < 12; i++) await step(.05, true);
  await step(.03, false); await step(.14, false, 'release'); await step(.2, false, 'impact'); await step(.3, false, 'after');
  await b.close();
})();
