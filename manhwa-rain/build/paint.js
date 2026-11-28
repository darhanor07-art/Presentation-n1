#!/usr/bin/env node
/* Playwright runner for the p5.brush painters.
   usage: node build/paint.js [key|prefix ...] [--quick] [--list]
   - no keys => every registered key
   - full run  : assets/<key>.webp (master q~88) + assets/manifest.json (merged) + assets/_review/<key>.jpg
   - --quick   : half-res, only writes assets/_review/<key>.jpg (never touches masters / manifest) */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW_PATH || 'playwright');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const quick = args.includes('--quick'), listOnly = args.includes('--list');
const wanted = args.filter(a => !a.startsWith('--'));
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  let errs = 0;
  page.on('console', m => { const t = m.text(); if (/GPU stall|GL Driver Message|willReadFrequently|Failed to load resource/.test(t)) return; if (m.type() === 'error' || m.type() === 'warning') { errs++; console.log('  [console.' + m.type() + ']', t); } });
  page.on('pageerror', e => { errs++; console.log('  [pageerror]', e.message); });
  await page.goto('file://' + path.join(ROOT, 'paint', 'painter.html'));
  await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
  const all = await page.evaluate(() => window.PAINT.keys());
  if (listOnly) { all.forEach(k => console.log(k.key, k.w + 'x' + k.h, k.alpha ? 'alpha' : '', k.kind)); await browser.close(); return; }
  const keys = wanted.length ? all.filter(k => wanted.some(w => k.key === w || k.key.startsWith(w))) : all;
  if (!keys.length) { console.log('no matching keys; registered:', all.map(k => k.key).join(' ')); await browser.close(); process.exit(1); }
  fs.mkdirSync(path.join(ROOT, 'assets', '_review'), { recursive: true });
  const mpath = path.join(ROOT, 'assets', 'manifest.json');
  let manifest = {}; try { manifest = JSON.parse(fs.readFileSync(mpath, 'utf8')); } catch (e) {}
  const t00 = Date.now(); let fail = 0;
  for (const k of keys) {
    const t0 = Date.now();
    try {
      const r = await page.evaluate(([key, q]) => window.PAINT.exportKey(key, q), [k.key, quick]);
      const buf = (u) => Buffer.from(u.split(',')[1], 'base64');
      fs.writeFileSync(path.join(ROOT, 'assets', '_review', k.key + '.jpg'), buf(r.review));
      let info = '';
      if (!quick) {
        const wb = buf(r.webp); fs.writeFileSync(path.join(ROOT, 'assets', k.key + '.webp'), wb);
        try { manifest = JSON.parse(fs.readFileSync(mpath, 'utf8')); } catch (e) { manifest = {}; }
        manifest[k.key] = { file: k.key + '.webp', w: r.W, h: r.H, alpha: r.alpha, kind: r.kind };
        fs.writeFileSync(mpath, JSON.stringify(Object.fromEntries(Object.keys(manifest).sort().map(x => [x, manifest[x]])), null, 2) + '\n');
        info = ' ' + (wb.length / 1024).toFixed(0) + ' KB';
      }
      if (r.stats) info += ' alpha[transp ' + (r.stats.transparent * 100).toFixed(0) + '% opaque ' + (r.stats.opaque * 100).toFixed(0) + '% mean ' + r.stats.mean.toFixed(2) + ']';
      console.log('OK  ' + k.key.padEnd(18) + ((Date.now() - t0) / 1000).toFixed(1).padStart(6) + 's  ' + r.w + 'x' + r.h + info);
    } catch (e) { fail++; console.log('ERR ' + k.key + ': ' + e.message.split('\n')[0]); }
  }
  console.log('done ' + keys.length + ' keys in ' + ((Date.now() - t00) / 1000).toFixed(1) + 's, failures ' + fail + ', console errors ' + errs + (quick ? ' (quick: masters untouched)' : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
