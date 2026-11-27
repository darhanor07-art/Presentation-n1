// topic10/index.html-ді нақты уақытта ойнатып, preview видеосын жазады.
// Іске қосу: node topic10/build/record_preview.js <url> <out_dir> [res]
const {chromium} = require('playwright');
(async () => {
  const [url, out, res = '800'] = process.argv.slice(2);
  const b = await chromium.launch({args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']});
  const c = await b.newContext({viewport: {width: 1280, height: 720}, recordVideo: {dir: out, size: {width: 1280, height: 720}}});
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${url}?res=${res}`); await p.waitForTimeout(6500);
  const hold = {9: 6500, 3: 5500, 12: 6000, 27: 5500, 29: 7000};   // ұзақ анимациясы бар слайдтар
  for (let i = 2; i <= 30; i++) {
    await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(hold[i] || 4800);
  }
  await p.waitForTimeout(1500);
  console.log('errors', errs.length, errs.slice(0, 3));
  await c.close(); await b.close();
})();
