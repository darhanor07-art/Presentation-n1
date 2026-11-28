// build/record.js — deterministic stills / preview video of the BUILT manhwa-spring/index.html
//   node build/record.js --stills      (stills/<scene>_<pp>.jpg + transitions + contact.jpg)
//   node build/record.js --video       (preview.mp4, 720x1280, 30 fps)
// Env: MS_HTML (built html relative to manhwa-spring/, default index.html), MS_SPEED (VH/s for video, default 0.8)
const { chromium } = require(process.env.PW_PATH || 'playwright'); const { spawn } = require('child_process');
const path = require('path'), fs = require('fs'), os = require('os');
const ROOT = path.join(__dirname, '..'), URL = 'file://' + path.join(ROOT, process.env.MS_HTML || 'index.html');
const STILLS = path.join(ROOT, 'stills'); const has = k => process.argv.includes('--' + k);
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const SP = +(process.env.MS_SPEED || 0.8); const pad = n => String(Math.round(n)).padStart(2, '0');

async function open(b, w, h) {
  const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }), errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL + '?capture=1');
  await page.waitForFunction(() => document.querySelector('#loader.done') || document.body.dataset.err, null, { timeout: 120000 });
  return { page, errs };
}
async function check(page, errs, what) {
  const e = await page.evaluate(() => document.body.dataset.err || ''); if (e) errs.push('body.dataset.err: ' + e);
  if (errs.length) { console.error('FAIL (' + what + '):\n  ' + errs.slice(0, 8).join('\n  ')); process.exitCode = 1; return false; } return true;
}
async function stills() {
  fs.mkdirSync(STILLS, { recursive: true });
  const b = await chromium.launch({ args: ARGS }), { page, errs } = await open(b, 720, 1280);
  const segs = await page.evaluate(() => window.__ms.segments); let T = 0; const files = [];
  const step = (s, dt) => { T += dt; return page.evaluate(([s, t]) => window.__ms.render(s, t), [s, T]); };
  const shot = async (s, name, wait) => {
    for (let i = 0; i < 10; i++) await step(s - .25 * (1 - (i + 1) / 10), 1 / 30);
    for (let i = 0; i < (wait || 14); i++) await step(s, .1);
    const f = path.join(STILLS, name + '.jpg'); await page.screenshot({ path: f, type: 'jpeg', quality: 88 }); files.push([name, f]);
  };
  const only = (process.env.MS_ONLY || '').split(',').filter(Boolean);
  for (let i = 0; i < segs.length; i++) {
    const g = segs[i];
    for (const pp of [.12, .35, .6, .88]) { const n = g.id + '_' + pad(pp * 100); if (!only.length || only.includes(g.id)) await shot(g.start + pp * g.len, n); }
    if (g.tr && (!only.length || only.includes(g.id))) for (const tt of [.3, .55, .8]) await shot(g.start + g.len - .35 + tt * .7, 'tr_' + g.id + '_' + pad(tt * 100), 0);
  }
  const ok = await check(page, errs, 'stills');
  const html = '<body style="margin:0;background:#222;font:12px monospace;color:#ddd"><div style="display:grid;grid-template-columns:repeat(6,200px);gap:6px;padding:6px">' +
    files.map(([l, f]) => `<figure style="margin:0"><img src="file://${f}" width="200" height="356" style="display:block"><figcaption>${l}</figcaption></figure>`).join('') + '</div></body>';
  const tmp = path.join(os.tmpdir(), 'ms_contact_' + process.pid + '.html'); fs.writeFileSync(tmp, html);
  const cp = await b.newPage({ viewport: { width: 6 * 206 + 6, height: 800 } }); await cp.goto('file://' + tmp); await cp.waitForLoadState('load');
  await cp.screenshot({ path: path.join(STILLS, 'contact.jpg'), type: 'jpeg', quality: 85, fullPage: true }); fs.unlinkSync(tmp);
  console.log('stills:', files.length, '->', STILLS, ok ? '(no errors)' : '(ERRORS)', 'placeholders:', JSON.stringify(await page.evaluate(() => window.__ms.placeholders)));
  await b.close();
}
async function video() {
  const fps = 30, out = path.join(ROOT, 'preview.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch({ args: ARGS }), { page, errs } = await open(b, 720, 1280), total = await page.evaluate(() => window.__ms.total);
  const write = buf => new Promise(r => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', r); else r(); });
  let T = 0, n = 0, s = 0; const t0 = Date.now();
  const frame = async sv => { T += 1 / fps; await page.evaluate(([s, t]) => window.__ms.render(s, t), [sv, T]); await write(await page.screenshot({ type: 'jpeg', quality: 88 })); n++; };
  for (let i = 0; i < fps * .8; i++) await frame(0);
  while (s < total) { s = Math.min(total, s + SP / fps); await frame(s); }
  for (let i = 0; i < fps * 2.5; i++) await frame(total);
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await check(page, errs, 'video');
  console.log(`preview.mp4: ${n} frames, ${(n / fps).toFixed(1)} s, ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${((Date.now() - t0) / n).toFixed(0)} ms/frame`); await b.close();
}
(async () => { if (has('stills')) await stills(); if (has('video')) await video(); if (!has('stills') && !has('video')) console.log('usage: node build/record.js --stills | --video'); })().catch(e => { console.error(e); process.exit(1); });
