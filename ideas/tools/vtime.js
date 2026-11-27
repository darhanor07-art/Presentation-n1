// Виртуалды уақыт: performance.now / Date.now / requestAnimationFrame / setTimeout / setInterval
// бетке addInitScript арқылы енгізіледі. Кейін window.__step(ms) уақытты алға жылжытады.
// Осының арқасында anime.js анимацияларын кадр-кадрымен, детерминистік түрде видеоға жазуға болады.
module.exports = `(() => {
  let now = 0; const t0 = Date.now(); const raf = new Map(); let rid = 0; const tm = new Map(); let tid = 0;
  const realNow = performance.now.bind(performance);
  performance.now = () => now;
  Date.now = () => t0 + now;
  window.requestAnimationFrame = cb => { const id = ++rid; raf.set(id, cb); return id; };
  window.cancelAnimationFrame = id => { raf.delete(id); };
  window.setTimeout = (fn, ms = 0, ...a) => { const id = ++tid; tm.set(id, {t: now + Math.max(0, +ms || 0), fn, a, iv: 0}); return id; };
  window.clearTimeout = id => { tm.delete(id); };
  window.setInterval = (fn, ms = 0, ...a) => { const id = ++tid; tm.set(id, {t: now + Math.max(1, +ms || 1), fn, a, iv: Math.max(1, +ms || 1)}); return id; };
  window.clearInterval = id => { tm.delete(id); };
  window.__vt = () => now;
  window.__step = (dt) => {
    const end = now + dt;
    for (;;) {
      let best = null;
      for (const [id, x] of tm) if (x.t <= end && (!best || x.t < best[1].t)) best = [id, x];
      if (!best) break;
      now = Math.max(now, best[1].t);
      if (best[1].iv) best[1].t += best[1].iv; else tm.delete(best[0]);
      try { typeof best[1].fn === 'function' ? best[1].fn(...best[1].a) : 0; } catch (e) { console.error(e); }
    }
    now = end;
    const q = [...raf.values()]; raf.clear();
    for (const cb of q) { try { cb(now); } catch (e) { console.error(e); } }
  };
})();`;
