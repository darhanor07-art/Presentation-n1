/* placeholders.js — procedurally drawn stand-ins for eye close-ups and characters.
   Used only when assets/manifest.json has no real asset with that name (see MS.eyeImg / MS.charImgs). */
(function () {
  const MS = window.MS = window.MS || {};
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const cache = {};

  function label(g, text, x, y, size, col) {
    g.save(); g.font = '500 ' + size + 'px monospace'; g.textAlign = 'center'; g.fillStyle = col || 'rgba(38,42,102,.75)';
    g.fillText(text, x, y); g.restore();
  }

  /* ---------- eyes: 1200x420 ---------- */
  MS.phEye = function (name) {
    if (cache[name]) return cache[name];
    const c = mk(1200, 420), g = c.getContext('2d');
    const who = name.indexOf('tair') === 0 ? 'tair' : 'aiaru';
    const st = name.replace(/^(aiaru|tair)_/, '');
    let open = .8, gx = 0, gy = 0, pupil = .42;
    const m = /^pupil_(\d)$/.exec(st);
    if (m) { open = .86; pupil = .24 + (+m[1]) * .075; }
    else if (st === 'wide') { open = 1.08; pupil = .3; }
    else if (st === 'half') open = .42;
    else if (st === 'closed') open = .03;
    else if (st === 'glance_up') { open = .84; gy = -.5; gx = .15; }
    else if (st === 'narrow') { open = .5; pupil = .5; }
    else if (st === 'glance') { open = .66; gx = .55; }
    const iris = who === 'tair' ? ['#3B4FD0', '#10185E', '#06083A'] : ['#B9B4F2', '#6E6AB8', '#2C2A6A'];
    // skin
    let sk = g.createLinearGradient(0, 0, 0, 420);
    sk.addColorStop(0, '#8C86C4'); sk.addColorStop(.28, '#D9D0EE'); sk.addColorStop(.7, '#EEE8F8'); sk.addColorStop(1, '#C9C0E6');
    g.fillStyle = sk; g.fillRect(0, 0, 1200, 420);
    const cx = 600, cy = 225, ew = 400, eh = 120 * open;
    // brow
    g.strokeStyle = who === 'tair' ? '#14153A' : '#2A2358'; g.lineCap = 'round'; g.lineWidth = who === 'tair' ? 34 : 20;
    g.beginPath(); g.moveTo(cx - 420, 105); g.quadraticCurveTo(cx - 40, who === 'tair' ? 38 : 20, cx + 420, who === 'tair' ? 92 : 78); g.stroke();
    // almond
    const path = () => {
      g.beginPath(); g.moveTo(cx - ew, cy + 14);
      g.quadraticCurveTo(cx - 20, cy + 14 - eh * 2.1, cx + ew, cy + 6);
      g.quadraticCurveTo(cx + 20, cy + 14 + eh * .8, cx - ew, cy + 14); g.closePath();
    };
    path(); g.fillStyle = '#F8F6FF'; g.fill();
    if (open > .08) {
      g.save(); path(); g.clip();
      const R = Math.min(142, 190 * Math.min(open, 1) + 30) * (who === 'tair' ? .92 : 1), ix = cx + gx * 160, iy = cy - 20 + gy * 40 - (1 - Math.min(open, 1)) * 0;
      const ig = g.createRadialGradient(ix, iy - R * .3, R * .1, ix, iy, R);
      ig.addColorStop(0, iris[0]); ig.addColorStop(.6, iris[1]); ig.addColorStop(1, iris[2]);
      g.fillStyle = ig; g.beginPath(); g.arc(ix, iy, R, 0, 6.2832); g.fill();
      g.fillStyle = '#05061F'; g.beginPath(); g.arc(ix, iy, R * pupil, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(ix - R * .34, iy - R * .36, R * .17, 0, 6.2832); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(ix + R * .3, iy + R * .3, R * .08, 0, 6.2832); g.fill();
      // upper lid shadow
      let ls = g.createLinearGradient(0, cy - eh * 1.2, 0, cy - eh * .2); ls.addColorStop(0, 'rgba(20,18,70,.55)'); ls.addColorStop(1, 'rgba(20,18,70,0)');
      g.fillStyle = ls; g.fillRect(0, cy - eh * 1.4, 1200, eh * 1.3);
      g.restore();
    }
    // lid line + lashes
    g.strokeStyle = '#14123E'; g.lineWidth = 11; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx - ew, cy + 14); g.quadraticCurveTo(cx - 20, cy + 14 - eh * 2.1, cx + ew, cy + 6); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(cx - ew, cy + 14); g.quadraticCurveTo(cx + 20, cy + 14 + eh * .8, cx + ew, cy + 6); g.stroke();
    g.lineWidth = 6;
    for (let i = 0; i < 7; i++) {
      const u = .1 + i * .13, x = cx - ew + u * 2 * ew, y = cy + 10 - Math.sin(u * 3.14) * eh * 1.05;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 24 + i * 3, y - 20 - eh * .12); g.stroke();
    }
    label(g, 'placeholder · ' + name, 600, 404, 22);
    return cache[name] = c;
  };

  /* ---------- characters: 640x1100, bottom-anchored ---------- */
  function blob(g, pts, fill) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i + 1 < pts.length; i += 2) g.quadraticCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); g.closePath(); g.fillStyle = fill; g.fill(); }

  MS.phChar = function (name, variant) {
    const key = name + '#' + variant; if (cache[key]) return cache[key];
    const c = mk(640, 1100), g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
    const sw = (variant - 1);              // -1 / 0 / +1 wind pose
    if (name.indexOf('tair') === 0) {
      // 3/4 view, dark coat with silver embroidery
      const coat = g.createLinearGradient(0, 330, 0, 1100); coat.addColorStop(0, '#2A2C66'); coat.addColorStop(1, '#0C0D2A');
      blob(g, [[170, 1100], [150, 560, 230, 380], [320, 330, 410, 360], [520, 400, 500, 640], [470, 900, 490, 1100]], coat);
      g.strokeStyle = 'rgba(210,208,250,.7)'; g.lineWidth = 3;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(230 + i * 24, 430 + i * 14); g.bezierCurveTo(240 + i * 22, 560, 210 + i * 28, 700, 240 + i * 26, 900); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 8; g.beginPath(); g.moveTo(320, 350); g.lineTo(300, 760); g.stroke();
      blob(g, [[262, 300], [270, 360, 320, 370], [370, 360, 378, 300]], '#D9D0EE');             // neck
      const sk = g.createLinearGradient(240, 130, 390, 300); sk.addColorStop(0, '#EEE8F8'); sk.addColorStop(1, '#BDB5DD');
      g.fillStyle = sk; g.beginPath(); g.ellipse(322, 205, 66, 88, .06, 0, 6.2832); g.fill();
      blob(g, [[246, 190], [230, 90, 322, 84], [420, 80, 396, 190], [380, 140, 340, 128], [300, 140, 270, 160 + sw * 6], [256, 175, 246, 190]], '#14143C');
      blob(g, [[250, 160], [215, 200 + sw * 10, 236, 260], [244, 220, 262, 190]], '#14143C');
      g.fillStyle = 'rgba(60,70,200,.9)'; g.beginPath(); g.ellipse(344, 205, 9, 5, 0, 0, 6.2832); g.fill();
      g.strokeStyle = '#8E86B8'; g.lineWidth = 3; g.beginPath(); g.moveTo(330, 250); g.quadraticCurveTo(342, 256, 356, 248); g.stroke();
      label(g, name, 320, 1060, 30, 'rgba(236,233,255,.8)');
    } else {
      // Aiaru from behind: long dark hair in wind, white dress, blue ribbon
      const dress = g.createLinearGradient(0, 330, 0, 1100); dress.addColorStop(0, '#F4F1FF'); dress.addColorStop(1, '#AEA9E6');
      const w1 = 120 + sw * 22;
      blob(g, [[240, 330], [190, 480, 150 - w1 * .2, 760], [110 - w1 * .3, 960, 90 - w1 * .4, 1100], [330, 1090, 560 + w1 * .3, 1100], [540 + w1 * .3, 940, 470 + w1 * .2, 760], [430, 520, 410, 330], [330, 300, 240, 330]], dress);
      g.strokeStyle = 'rgba(120,116,200,.35)'; g.lineWidth = 3;
      for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(260 + i * 20, 420); g.quadraticCurveTo(230 + i * 38 + sw * 12, 760, 170 + i * 62 + sw * 30, 1090); g.stroke(); }
      g.fillStyle = '#E6DCF0'; g.fillRect(300, 270, 40, 70);
      const hair = g.createLinearGradient(0, 80, 0, 900); hair.addColorStop(0, '#2A2A66'); hair.addColorStop(1, '#0B0B2C');
      blob(g, [[250, 190], [240, 80, 322, 76], [410, 76, 396, 190], [440 + sw * 30, 420, 420 + sw * 70, 640], [410 + sw * 90, 800, 360 + sw * 130, 900], [330 + sw * 60, 820, 300 + sw * 40, 650], [250 + sw * 20, 800, 200 + sw * 30, 880], [200, 640, 230, 420], [240, 300, 250, 190]], hair);
      g.strokeStyle = 'rgba(169,166,232,.55)'; g.lineWidth = 3;
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(280 + i * 18, 110); g.quadraticCurveTo(250 + i * 30 + sw * 20, 480, 250 + i * 34 + sw * 90, 860); g.stroke(); }
      g.fillStyle = '#6F8CFF'; g.beginPath(); g.ellipse(366, 236, 26, 14, .5, 0, 6.2832); g.ellipse(398, 262, 24, 12, -.6, 0, 6.2832); g.fill();
      g.strokeStyle = '#6F8CFF'; g.lineWidth = 6; g.beginPath(); g.moveTo(372, 244); g.quadraticCurveTo(410 + sw * 30, 380, 380 + sw * 60, 560); g.stroke();
      label(g, name, 320, 1070, 30, 'rgba(38,42,102,.8)');
    }
    return cache[key] = c;
  };
})();
