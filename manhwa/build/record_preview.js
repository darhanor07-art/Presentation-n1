// manhwa/build/record_preview.js — deterministic stills / preview video / realtime sanity of the BUILT manhwa/index.html
//   node build/record_preview.js --stills      (stills/<id>_<pp>.jpg, contact.jpg, art_sheet.jpg)
//   node build/record_preview.js --video       (manhwa/preview.mp4, 720x1280, 30 fps)
//   node build/record_preview.js --realtime    (non-capture page, programmatic scroll, error check)
const { chromium } = require('playwright'); const { spawn } = require('child_process');
const path = require('path'); const fs = require('fs'); const os = require('os');
//   Env: MK_HTML=<built html, rel. to manhwa/> (default index.html), MK_STILLS=<stills dir> (default stills),
//        MK_SEGS=<comma list of segment ids for --stills> (default all), MK_VIDEO=<mp4 path> (default preview.mp4)
const ROOT = path.join(__dirname, '..'), URL = 'file://' + path.join(ROOT, process.env.MK_HTML || 'index.html');
const STILLS = path.join(ROOT, process.env.MK_STILLS || 'stills'), SEGS = (process.env.MK_SEGS || '').split(',').filter(Boolean);
const has = k => process.argv.includes('--' + k);
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const SP = +(process.env.MK_SPEED || 0.55), TSP = +(process.env.MK_TSPEED || 0.8);

async function open(browser, w, h, query) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL + query);
  await page.waitForFunction(() => window.__mk && document.querySelector('#loader.done') || (document.body.dataset && document.body.dataset.err), null, { timeout: 60000 });
  await page.evaluate(() => window.__mk && window.__mk.ready);
  return { page, errs };
}
async function check(page, errs, what) {
  const e = await page.evaluate(() => document.body.dataset.err || '');
  if (e) errs.push('body.dataset.err: ' + e);
  if (errs.length) { console.error('FAIL (' + what + '):\n  ' + errs.slice(0, 8).join('\n  ')); process.exitCode = 1; return false; }
  return true;
}
const pad = n => String(n).padStart(2, '0');

async function stills() {
  fs.mkdirSync(STILLS, { recursive: true });
  const b = await chromium.launch({ args: ARGS });
  const { page, errs } = await open(b, 720, 1008, '?capture=1');
  const segs = await page.evaluate(() => window.__mk.segments);
  let T = 0; const files = [];
  const step = (s, dt, inp) => { T += dt; return page.evaluate(([s, t, i]) => { window.__mk.render(s, t, i); }, [s, T, inp]); };
  for (const g of segs) {
    if (SEGS.length && !SEGS.includes(g.id)) continue;
    for (const pp of [0.15, 0.5, 0.85]) {
      const s = g.start + pp * g.len, inp = { holding: !!g.hold && pp >= 0.5 };
      const ramp = Math.min(0.12, pp * g.len);
      for (let i = 0; i < 8; i++) await step(s - ramp * (1 - (i + 1) / 8), 1 / 30, inp);
      for (let i = 0; i < (g.hold && pp >= .5 ? 28 : 12); i++) await step(s, 0.1, inp);
      const f = path.join(STILLS, `${g.id}_${pad(Math.round(pp * 100))}.jpg`);
      await page.screenshot({ path: f, type: 'jpeg', quality: 86 }); files.push([g.id + ' p' + pp, f]);
    }
  }
  const ok1 = await check(page, errs, 'stills');
  // contact sheet
  const html = '<body style="margin:0;background:#222;font:12px monospace;color:#ddd"><div style="display:grid;grid-template-columns:repeat(3,240px);gap:6px;padding:6px">' +
    files.map(([l, f]) => `<figure style="margin:0"><img src="file://${f}" width="240" height="336" style="display:block"><figcaption>${l}</figcaption></figure>`).join('') + '</div></body>';
  const tmp = path.join(os.tmpdir(), 'mokpan_contact_' + process.pid + '.html'); fs.writeFileSync(tmp, html);
  const cp = await b.newPage({ viewport: { width: 3 * 246 + 6, height: 800 } });
  await cp.goto('file://' + tmp); await cp.waitForLoadState('load');
  await cp.screenshot({ path: path.join(STILLS, 'contact.jpg'), type: 'jpeg', quality: 85, fullPage: true }); fs.unlinkSync(tmp);
  await page.close();
  // art sheet
  const a = await open(b, 1000, 1400, '?art=1&capture=1');
  await a.page.evaluate(() => { window.__mk.render(0, 1.0); window.__mk.render(0, 1.1); });
  await a.page.screenshot({ path: path.join(STILLS, 'art_sheet.jpg'), type: 'jpeg', quality: 88 });
  const ok2 = await check(a.page, a.errs, 'art sheet');
  await b.close();
  console.log('stills:', files.length, 'files + contact.jpg + art_sheet.jpg ->', path.join(ROOT, 'stills'), ok1 && ok2 ? '(no errors)' : '(ERRORS)');
}

async function video() {
  const fps = 30, out = path.join(ROOT, process.env.MK_VIDEO || 'preview.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch({ args: ARGS });
  const { page, errs } = await open(b, 720, 1280, '?capture=1');
  const segs = await page.evaluate(() => window.__mk.segments), total = await page.evaluate(() => window.__mk.total);
  const write = buf => new Promise(r => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', r); else r(); });
  let T = 0, frames = 0, s = 0; const t0 = Date.now();
  const frame = async (sv, inp) => {
    T += 1 / fps; await page.evaluate(([s, t, i]) => { window.__mk.render(s, t, i); }, [sv, T, inp]);
    await write(await page.screenshot({ type: 'jpeg', quality: 90 })); frames++;
  };
  const wait = async (sec, inp) => { for (let i = 0; i < Math.round(sec * fps); i++) await frame(s, inp); };
  await wait(0.6);
  for (const g of segs) {
    const end = g.start + g.len, sp = g.kind === 'transition' ? TSP : SP; let paused = !g.hold;
    s = Math.max(s, g.start);
    while (s < end - 1e-6) {
      if (!paused && (s - g.start) / g.len >= 0.35) {
        paused = true; s = g.start + 0.35 * g.len;
        if (g.hold === 'press') await wait(2.6, { holding: true });
        else { await wait(1.6, { holding: true }); await wait(0.9, { holding: false }); }
        await wait(1.4);
      }
      s = Math.min(end, s + sp / fps); await frame(Math.min(s, total));
    }
  }
  await wait(1.8);
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  const ms = (Date.now() - t0) / frames; await check(page, errs, 'video');
  console.log(`preview.mp4: ${frames} frames, ${(frames / fps).toFixed(1)} s, ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${ms.toFixed(0)} ms/frame captured`);
  await b.close();
}

async function realtime() {
  const b = await chromium.launch({ args: ARGS });
  const page = await b.newPage({ viewport: { width: 720, height: 1008 } }); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL); await page.waitForSelector('#loader.done', { timeout: 60000 });
  const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), N = 40; const hashes = [];
  for (let i = 0; i <= N; i++) {
    await page.evaluate(y => window.scrollTo(0, y), H * i / N); await page.waitForTimeout(260);
    if (i % 8 === 0) { const buf = await page.screenshot({ type: 'jpeg', quality: 40 }); hashes.push(buf.length); }
  }
  const st = await page.evaluate(() => ({ s: window.__mkState.s, q: window.__mkState.q, h: document.documentElement.scrollHeight }));
  const ok = await check(page, errs, 'realtime');
  console.log('realtime: scrolled', N, 'steps; final s=%s q=%s docHeight=%s; screenshot sizes %j', st.s.toFixed(2), st.q, st.h, hashes, ok ? '(no errors)' : '');
  await b.close();
}

(async () => {
  if (has('stills')) await stills();
  if (has('video')) await video();
  if (has('realtime')) await realtime();
  if (!has('stills') && !has('video') && !has('realtime')) console.log('usage: node build/record_preview.js --stills | --video | --realtime');
})().catch(e => { console.error(e); process.exit(1); });
