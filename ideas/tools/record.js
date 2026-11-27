// Кез келген anime.js презентациясын виртуалды уақытта кадр-кадрымен MP4-ке жазу.
//   node ideas/tools/record.js <url> <out.mp4> [--size 1280x720] [--fps 30] [--slides 30] [--dwell 5500]
//                               [--next "LAB.next()"] [--warm 2000]
// Әр слайдта dwell мс жазады, сосын --next өрнегін орындап, келесі слайдқа өтеді.
// Кадрлар ffmpeg-ке тікелей беріледі (диск толмайды). Нәтиже — 30 fps біркелкі видео,
// компьютер баяу болса да анимация «секірмейді».
const {chromium} = require('playwright'); const {spawn} = require('child_process');
const VT = require('./vtime.js');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const [url, out] = process.argv.slice(2);
  const [w, h] = arg('size', '1280x720').split('x').map(Number), fps = +arg('fps', 30), slides = +arg('slides', 30), dwell = +arg('dwell', 5500);
  const nextJs = arg('next', 'LAB.next()'), warm = +arg('warm', 2000), dt = 1000 / fps;
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'medium', '-movflags', '+faststart', out], {stdio: ['pipe', 'inherit', 'inherit']});
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: w, height: h}});
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(VT);
  await p.goto(url);
  for (let i = 0; i < 40; i++) { await p.evaluate(() => window.__step(16)); await p.waitForTimeout(15); }   // қаріптер мен суреттер
  await p.evaluate(ms => window.__step(ms), warm);
  let frames = 0;
  const write = buf => new Promise(r => { if (!ff.stdin.write(buf)) ff.stdin.once('drain', r); else r(); });
  for (let s = 0; s < slides; s++) {
    if (s > 0) await p.evaluate(js => { eval(js); }, nextJs);
    for (let t = 0; t < dwell; t += dt) {
      await p.evaluate(d => window.__step(d), dt);
      await write(await p.screenshot({type: 'jpeg', quality: 88})); frames++;
    }
    process.stdout.write(`${s + 1} `);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`\n${out}: ${frames} кадр, ${(frames / fps).toFixed(1)} с; қателер: ${errs.slice(0, 3).join(' | ') || 'жоқ'}`);
  await b.close();
})();
