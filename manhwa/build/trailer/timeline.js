// manhwa/build/trailer/timeline.js — replicates the scroll/hold schedule of build/record_preview.js --video
// and writes build/trailer/timeline.json (segment times + audio event times, seconds on the preview.mp4 clock).
//   node build/trailer/timeline.js            (env MK_HTML = built html relative to manhwa/, default index.html)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs'); const cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..'), URL = 'file://' + path.join(ROOT, process.env.MK_HTML || 'index.html') + '?capture=1';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const FPS = 30, SP = +(process.env.MK_SPEED || 0.55), TSP = +(process.env.MK_TSPEED || 0.8);
const r3 = x => Math.round(x * 1000) / 1000;

(async () => {
  const b = await chromium.launch({ args: ARGS });
  const page = await b.newPage({ viewport: { width: 720, height: 1280 } });
  await page.goto(URL);
  await page.waitForFunction(() => window.__mk && window.__mk.segments && window.__mk.segments.length, null, { timeout: 60000 });
  const segs = await page.evaluate(() => window.__mk.segments), total = await page.evaluate(() => window.__mk.total);
  await b.close();

  // ---- schedule simulation (mirrors record_preview.js video()) ----
  let frames = 0, s = 0; const log = [];            // log: [frameIdx, s] for scroll frames
  const holds = {};                                  // segId -> {start,end,released}
  const frame = () => { frames++; };
  const wait = sec => { for (let i = 0; i < Math.round(sec * FPS); i++) frame(); };
  const t = () => frames / FPS;
  const segT = {};
  wait(0.6);
  for (const g of segs) {
    const end = g.start + g.len, sp = g.kind === 'transition' ? TSP : SP; let paused = !g.hold;
    s = Math.max(s, g.start);
    segT[g.id] = { start: t(), log: [] };
    while (s < end - 1e-6) {
      if (!paused && (s - g.start) / g.len >= 0.35) {
        paused = true; s = g.start + 0.35 * g.len;
        const h = holds[g.id] = { start: t() };
        if (g.hold === 'press') { wait(2.6); h.release = t(); }
        else { wait(1.6); h.release = t(); wait(0.9); }
        h.end = t(); wait(1.4);
      }
      s = Math.min(end, s + sp / FPS);
      segT[g.id].log.push([frames / FPS, s]); frame();
    }
    segT[g.id].end = t();
  }
  wait(1.8);
  const duration = frames / FPS;

  const G = id => segs.find(g => g.id === id); if (!G('s01')) throw new Error('no s01');
  // time at which the scroll first reaches progress p (0..1) in segment id; if p falls in/at the hold pause, the pause start
  const at = (id, p) => {
    const g = G(id); if (!g) return null; const target = g.start + p * g.len;
    for (const [tt, sv] of segT[id].log) if (sv >= target - 1e-9) return r3(tt);
    return r3(segT[id].end);
  };
  const ev = {};
  const put = (k, v) => { if (v != null) ev[k] = v; };
  put('s01_seal', at('s01', 0.6));
  put('s03_door_start', at('s03', 0.3)); put('s03_door_end', at('s03', 0.8));
  put('s04_brush1', at('s04', 0.55)); put('s04_brush2', at('s04', 0.72));
  put('s05_paper_drop', at('s05', 0.25));
  if (holds.s05) { put('s05_rub_start', r3(holds.s05.start)); put('s05_rub_end', r3(holds.s05.release)); put('s05_peel_start', r3(holds.s05.start + 2.2)); }
  put('s06_eyes_open', at('s06', 0.36)); put('s06_roar', at('s06', 0.86));
  for (let i = 0; i < 4; i++) put('t06_claw' + i, at('t06', 0.08 * i));
  if (holds.s07) { put('s07_hold_start', r3(holds.s07.start)); put('s07_release', r3(holds.s07.release)); put('s07_bell', r3(holds.s07.release + 0.28)); }
  put('s08_crack', at('s08', 0)); put('s08_split', at('s08', 0.35));
  put('t08_ribbon', at('t08', 0.2)); put('s09_end_seal', at('s09', 0.5));

  const out = {
    fps: FPS, duration: r3(duration), frames, leadIn: 0.6, tail: 1.8, speeds: { scene: SP, transition: TSP },
    segments: segs.map(g => ({ id: g.id, kind: g.kind, hold: g.hold || null, vhStart: g.start, vhLen: g.len, start: r3(segT[g.id].start), end: r3(segT[g.id].end), hold_window: holds[g.id] ? { start: r3(holds[g.id].start), release: r3(holds[g.id].release), end: r3(holds[g.id].end) } : undefined })),
    events: ev
  };
  fs.writeFileSync(path.join(__dirname, 'timeline.json'), JSON.stringify(out, null, 2));
  console.log(`timeline.json: ${out.duration} s, ${frames} frames, ${segs.length} segments, ${Object.keys(ev).length} events`);
  const pv = path.join(ROOT, 'preview.mp4');
  if (fs.existsSync(pv)) {
    const d = parseFloat(cp.execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', pv]).toString());
    const ok = Math.abs(d - duration) <= 1 / FPS + 1e-3;
    console.log(`preview.mp4 duration ${d.toFixed(3)} s vs timeline ${duration.toFixed(3)} s: ${ok ? 'MATCH' : 'MISMATCH (preview.mp4 stale? re-run record_preview.js --video)'}`);
    if (!ok && !process.env.MK_ALLOW_MISMATCH) process.exitCode = 2;
  }
})().catch(e => { console.error(e); process.exit(1); });
