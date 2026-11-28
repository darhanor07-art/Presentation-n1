/* Page 9 — pair_0..3: both of Merey's eyes (1600x560). Same face every frame; pupils contract 0->3; frame 3 has tears. Uses window.EYE (eyes.js). */
(function () {
  const P = PAINT, L = P.lib, PAL = L.PAL;
  const W0 = 1600, H0 = 560;
  const CITY = [
    { x: -.42, y: -.40, r: .12, c: '#ffd98a', a: .95 }, { x: .30, y: -.34, r: .085, c: '#9fe8de', a: .9 }, { x: -.08, y: -.58, r: .06, c: '#ffffff', a: .9 },
    { x: .48, y: .05, r: .05, c: '#F2C230', a: .8 }, { x: -.52, y: .12, r: .07, c: '#bcd4ff', a: .75 }, { x: .08, y: .46, r: .045, c: '#ffe9b0', a: .7 }, { x: -.3, y: .38, r: .035, c: '#8fd8ff', a: .6 }
  ];
  const PUPIL = [.64, .52, .41, .30];

  function frame(k, i) {
    const E = window.EYE, c = L.layer(), seed = 6300;
    const s = Object.assign({}, E.styles.MEREY, { catch: 'city', cityLights: CITY, pupil: PUPIL[i], depth: 1.1, veins: i === 3 ? 2.2 : 1, tear: i === 3 ? 1 : (i === 2 ? .15 : 0), catchSide: -1 });
    s.skin = { lit: '#d6a78f', mid: '#b3846e', shade: '#6a4743', rose: '#c6786c', cool: '#76729a' };
    E.skin(c, s, seed);
    // nose bridge: lit ridge between the eyes, soft shadow plates on both sides
    c.save(); c.globalCompositeOperation = 'screen'; let g = c.createLinearGradient(700, 0, 900, 0); g.addColorStop(0, 'rgba(230,190,160,0)'); g.addColorStop(.5, 'rgba(236,196,168,.32)'); g.addColorStop(1, 'rgba(230,190,160,0)'); c.fillStyle = g; c.fillRect(700, 0, 200, 560); c.restore();
    c.save(); g = c.createLinearGradient(560, 0, 700, 0); g.addColorStop(0, 'rgba(60,36,36,.0)'); g.addColorStop(1, 'rgba(60,36,36,.3)'); c.fillStyle = g; c.fillRect(560, 0, 140, 560); g = c.createLinearGradient(900, 0, 1040, 0); g.addColorStop(0, 'rgba(60,36,36,.3)'); g.addColorStop(1, 'rgba(60,36,36,0)'); c.fillStyle = g; c.fillRect(900, 0, 140, 560); c.restore();
    const gL = E.make({ cx: 392, cy: 318, a: 225, tilt: .06, mirror: -1, open: i === 3 ? .9 : 1, Hu: .43, Hl: .32, R: .40 });
    const gR = E.make({ cx: 1208, cy: 318, a: 225, tilt: .06, mirror: 1, open: i === 3 ? .9 : 1, Hu: .43, Hl: .32, R: .40 });
    [[gL, seed + 1], [gR, seed + 2]].forEach(([g, sd]) => E.socket(c, g, s, sd));
    E.pores(c, s, seed);
    [[gL, seed + 1], [gR, seed + 2]].forEach(([g, sd]) => { E.ball(c, g, s, 6300); E.lids(c, g, s, sd); });
    // red, wet rims in the last frames
    if (i >= 2) [gL, gR].forEach(g => { c.save(); c.filter = `blur(${3 * c.q}px)`; c.globalCompositeOperation = 'multiply'; c.strokeStyle = L.rgba('#c0555a', i === 3 ? .5 : .25); c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); g.lo.slice(3, 68).forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore(); });
    [[gL, seed + 1], [gR, seed + 2]].forEach(([g, sd]) => E.brow(c, g, s, sd));
    // light: warm window left, cool city right
    L.glow(c, -60, 260, 560, '#ffcf8a', .22, 'screen'); L.glow(c, 1660, 240, 600, '#7fd0d4', .22, 'screen'); L.glow(c, 800, -80, 520, '#a8c4e8', .1, 'screen');
    // rain drops on skin (same positions every frame; they creep down a little)
    E.skinDrops(c, s, seed + 5, 24, [[20, 30, 190, 540], [560, 20, 1040, 120], [610, 150, 990, 540], [1420, 30, 1590, 540], [200, 450, 580, 550], [1020, 450, 1400, 550]], { k: .95 });
    // a few longer trails of water running down the skin
    const r = L.rng(seed + 9); c.save(); c.lineCap = 'round';
    for (let j = 0; j < 9; j++) { const x = 40 + r() * 1520, y = 20 + r() * 140, l = 80 + r() * 230 + i * 14; c.strokeStyle = `rgba(205,222,240,${.05 + r() * .06})`; c.lineWidth = 3 + r() * 5; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 6, y + l * .4, x - 8, y + l * .7, x + 3, y + l); c.stroke(); }
    c.restore();
    if (i === 3) { E.tear(c, gL, s, seed, 190); E.tear(c, gR, s, seed + 3, 120); }
    // city light reflected on wet skin: soft coloured streaks
    c.save(); c.globalCompositeOperation = 'screen'; [[140, 90, '#ffd98a'], [1480, 150, '#7fe0d0'], [820, 60, '#bcd4ff']].forEach(([x, y, col]) => { L.glow(c, x, y, 120, col, .12, 'screen'); }); c.restore();
    E.finish(c, s, seed, .62);
    return c;
  }
  for (let i = 0; i < 4; i++) P.register('pair_' + i, { w: W0, h: H0, alpha: false, seed: 6300 + i }, async (k) => frame(k, i));
})();
