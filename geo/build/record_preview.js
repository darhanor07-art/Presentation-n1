// geo/preview.mp4 — бүкіл презентацияның видеосы, виртуалды уақытта кадр-кадрымен (3D + мәтін анимациялары бірге).
//   node geo/build/record_preview.js [--fps 24] [--dwell 4200] [--size 1280x720]
// Әр слайд: ауысу ұзақтығы + dwell мс. Компьютер баяу болса да видео біркелкі шығады (ideas/tools/vtime.js).
const {chromium} = require('playwright'); const {spawn} = require('child_process'); const path = require('path');
const VT = require(path.join(__dirname, '..', '..', 'ideas', 'tools', 'vtime.js'));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const fps = +arg('fps', 24), dwell = +arg('dwell', 4200), [w, h] = arg('size', '1280x720').split('x').map(Number), dt = 1000 / fps;
  const out = path.join(__dirname, '..', 'preview.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'medium', '-movflags', '+faststart', out], {stdio: ['pipe', 'inherit', 'inherit']});
  const b = await chromium.launch({args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']});
  const p = await b.newPage({viewport: {width: w, height: h}});
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(VT);
  await p.goto('file://' + path.join(__dirname, '..', 'index.html') + '?q=lo&msaa=0#1');
  for (let i = 0; i < 900; i++) { if (await p.evaluate(() => !!document.querySelector('#loader.done') || !!document.body.dataset.err)) break; await p.evaluate(() => window.__step(16)); await p.waitForTimeout(100); }
  const write = buf => new Promise(r => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', r); else r(); });
  const N = await p.evaluate(() => META.length); let frames = 0;
  for (let s = 0; s < N; s++) {
    if (s > 0) await p.evaluate(() => deck.go(deck.cur + 1));
    const D = await p.evaluate(i => World.dur(i, i - 1), s) * 1000, T = D + (s === N - 1 ? 9000 : dwell);
    for (let t = 0; t < T; t += dt) { await p.evaluate(d => window.__step(d), dt); await write(await p.screenshot({type: 'jpeg', quality: 86})); frames++; }
    process.stdout.write(`${s + 1} `);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`\n${out}: ${frames} кадр, ${(frames / fps).toFixed(1)} с; қателер: ${errs.slice(0, 3).join(' | ') || 'жоқ'}`);
  await b.close();
})();
