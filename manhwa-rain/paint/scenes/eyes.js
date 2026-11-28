/* Eyes (P2): realistic painted close-ups. Exposes window.EYE (used by p09_eyes.js too).
   keys: eye_merey_closed / eye_merey_half / eye_merey_open (SAME eye, lid varies), eye_sanzhar.
   Approach: skin = brush glazes + 2D shading + pore grain; sclera/iris/lids/lashes/brows = 2D strokes (radial iris fibres,
   tapered lash clumps, hair strokes) + brush hatch for crease/under-eye; light passes in 2D. */
(function () {
  const P = PAINT, L = P.lib;
  const E = (window.EYE = {});
  const PI = Math.PI, TAU = PI * 2, lerp = (a, b, t) => a + (b - a) * t, cl = L.clamp, sst = L.smoothstep;
  const sin = Math.sin, cos = Math.cos;

  /* ---------------- geometry ---------------- */
  E.make = function (o) {
    const g = Object.assign({ cx: 600, cy: 420, a: 300, tilt: .07, mirror: 1, open: 1, Hu: .42, Hl: .32, R: .40, ci: [0, -.045], cornerIn: .06, cornerOut: -.05, lidClosed: .13 }, o);
    const th = -g.tilt * g.mirror, cs = cos(th), sn = sin(th);
    g.P = (u, v) => { const x = g.mirror * u * g.a, y = v * g.a; return [g.cx + x * cs - y * sn, g.cy + x * sn + y * cs]; };
    g.corner = t => g.cornerIn * (1 - t) + g.cornerOut * t;
    g.upperOpen = t => g.corner(t) - g.Hu * Math.pow(sin(PI * Math.pow(t, .8)), .85);
    g.lowerOpen = t => g.corner(t) + g.Hl * Math.pow(sin(PI * Math.pow(t, 1.15)), 1.1);
    g.closedLine = t => g.corner(t) + g.lidClosed * sin(PI * t);
    g.upperV = t => lerp(g.closedLine(t), g.upperOpen(t), g.open);
    g.lowerV = t => lerp(g.closedLine(t), g.lowerOpen(t), sst(0, 1, g.open));
    g.creaseV = t => g.corner(t) * .5 - (.60 + .12 * g.open) * Math.pow(sin(PI * Math.pow(t, .85)), .9);
    g.tu = t => -1 + 2 * t;
    const N = 70;
    g.up = []; g.lo = []; g.cr = [];
    for (let i = 0; i <= N; i++) { const t = i / N; g.up.push(g.P(g.tu(t), g.upperV(t))); g.lo.push(g.P(g.tu(t), g.lowerV(t))); g.cr.push(g.P(g.tu(t), g.creaseV(t))); }
    g.ic = g.P(g.ci[0], g.ci[1]); g.Rp = g.R * g.a; // iris centre (canvas) + radius px
    return g;
  };
  const path = (c, pts, close) => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (close) c.closePath(); };
  const aperture = (c, g) => { const pts = g.up.concat(g.lo.slice().reverse()); path(c, pts, true); };
  const normals = (pts) => { const sg = Math.sign(pts[pts.length - 1][0] - pts[0][0]) || 1; return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; return [sg * ty, -sg * tx, tx, ty]; }); }; // [nx,ny,tx,ty], n = "up/left of travel"
  const off = (pts, d) => { const N = normals(pts); return pts.map((p, i) => [p[0] + N[i][0] * (typeof d === 'function' ? d(i / (pts.length - 1)) : d), p[1] + N[i][1] * (typeof d === 'function' ? d(i / (pts.length - 1)) : d)]); };
  // tapered stroke polygon along sample points; wf(s) width at s in 0..1
  const taper = (c, pts, wf) => {
    const n = pts.length, A = [], B = [];
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const w = wf(i / (n - 1)) / 2; A.push([pts[i][0] - ty * w, pts[i][1] + tx * w]); B.push([pts[i][0] + ty * w, pts[i][1] - tx * w]); }
    c.beginPath(); A.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); for (let i = n - 1; i >= 0; i--) c.lineTo(B[i][0], B[i][1]); c.closePath(); c.fill();
  };
  const bez = (p0, p1, p2, p3, n = 14) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; };
  const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };
  const tmpLayer = (c) => L.layer(c.fw, c.fh);
  // draw f(layer) onto c blurred
  const blurDo = (c, px, f, op, a) => { const t = tmpLayer(c); f(t); L.blit(c, t, { blur: px, op: op || 'source-over', alpha: a === undefined ? 1 : a }); };

  /* ---------------- skin ---------------- */
  // style s.skin = {lit, mid, shade, rose, cool}, s.lx = light x direction (-1 from left)
  E.skin = function (c, s, seed) {
    const W = c.fw, H = c.fh, sk = s.skin, lx = s.lx;
    const gx = c.createLinearGradient(lx < 0 ? 0 : W, 0, lx < 0 ? W : 0, 0);
    gx.addColorStop(0, sk.lit); gx.addColorStop(.5, sk.mid); gx.addColorStop(1, sk.shade);
    c.fillStyle = gx; c.fillRect(0, 0, W, H);
    L.vgrad(c, [[0, L.rgba(sk.lit, .22)], [.35, L.rgba(sk.lit, 0)], [.8, L.rgba(sk.shade, .15)], [1, L.rgba(sk.shade, .38)]]);
    // large-scale mottling (blood flow / pigment)
    const n1 = L.noiseAlpha(W, H, { sx: 1.3, sy: 1.3, oct: 4, seed: seed + 1, lo: .3, hi: .8, color: sk.rose, res: 10, max: .32 }); L.blit(c, n1, { op: 'multiply', alpha: .75 });
    const n2 = L.noiseAlpha(W, H, { sx: 1, sy: 1.6, oct: 4, seed: seed + 2, lo: .4, hi: .85, color: sk.cool, res: 10, max: .3 }); L.blit(c, n2, { op: 'multiply', alpha: .7 });
    // watercolour glazes (warm / cool split)
    const r = L.rng(seed + 5);
    L.glaze(c, [{ color: sk.rose, op: 55 }, { color: sk.cool, op: 45 }], (b, i, rnd) => { for (let j = 0; j < 7; j++) b.polygon(L.blobPts(rnd() * W, rnd() * H, 120 + rnd() * 260, 90 + rnd() * 170, { n: 14, rough: .3, rnd })); }, { seed: seed + 6, bleed: .45, tex: .65, border: .05, alpha: .38 });
  };
  E.pores = function (c, s, seed, rect) {
    const W = c.fw, H = c.fh, r = L.rng(seed + 33), R = rect || [0, 0, W, H], area = (R[2] - R[0]) * (R[3] - R[1]);
    const n = Math.round(area / 36 * (c.q < 1 ? .6 : 1));
    c.save();
    for (let i = 0; i < n; i++) { const x = R[0] + r() * (R[2] - R[0]), y = R[1] + r() * (R[3] - R[1]); const d = r(); c.fillStyle = d < .62 ? `rgba(40,20,20,${.05 + r() * .09})` : `rgba(255,236,226,${.03 + r() * .06})`; const rr = .55 + r() * 1.25; ell(c, x, y, rr, rr * (.7 + r() * .5), r() * 3); c.fill(); }
    // fine micro-wrinkle lines
    c.strokeStyle = 'rgba(40,20,20,.05)'; c.lineWidth = .8;
    for (let i = 0; i < n / 14; i++) { const x = R[0] + r() * (R[2] - R[0]), y = R[1] + r() * (R[3] - R[1]), a = r() * PI, l = 6 + r() * 16; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + cos(a) * l * .5 + r() * 3, y + sin(a) * l * .5 + r() * 3, x + cos(a) * l, y + sin(a) * l); c.stroke(); }
    c.restore();
  };

  /* shading around one eye: orbit, lid fold, brow-bone, under-eye */
  E.socket = function (c, g, s, seed) {
    const sk = s.skin, a = g.a, lx = s.lx, r = L.rng(seed + 11), q = c.q;
    // orbital hollow
    c.save(); c.translate(g.cx, g.cy); c.rotate(-g.tilt * g.mirror); c.scale(1.7, 1);
    let rg = c.createRadialGradient(0, -a * .1, a * .3, 0, -a * .1, a * .85); rg.addColorStop(0, L.rgba(sk.shade, .0)); rg.addColorStop(.55, L.rgba(sk.shade, .16 * s.depth)); rg.addColorStop(1, L.rgba(sk.shade, 0)); c.fillStyle = rg; c.fillRect(-a * 1.2, -a * 1.2, a * 2.4, a * 2.4); c.restore();
    // lid skin between margin and crease: rosy tint + convex highlight
    const lid = g.up.concat(g.cr.slice().reverse());
    const lidGap = 1 - g.open;
    blurDo(c, 7, (t) => { t.fillStyle = L.rgba(sk.rose, .16 + .22 * lidGap); path(t, lid, true); t.fill(); }, 'multiply', 1);
    const mid = g.P(.05, (g.upperV(.45) + g.creaseV(.45)) / 2);
    c.save(); path(c, lid, true); c.clip(); c.globalCompositeOperation = 'screen';
    rg = c.createRadialGradient(mid[0] - lx * -a * .05, mid[1] - a * .02, 0, mid[0], mid[1], a * (.38 + .18 * lidGap)); rg.addColorStop(0, L.rgba(L.mix(sk.lit, '#fff', .15), .22 + .22 * lidGap)); rg.addColorStop(1, L.rgba(sk.lit, 0)); c.fillStyle = rg; c.fillRect(mid[0] - a, mid[1] - a, a * 2, a * 2); c.restore();
    // shadow cast by the upper lashes line onto the lid skin and eyeball handled elsewhere; crease: soft shadow + dark line
    blurDo(c, 9, (t) => { t.strokeStyle = L.rgba('#2a1214', .55 * s.depth); t.lineWidth = a * .07; t.lineCap = 'round'; path(t, g.cr.slice(5, 66)); t.stroke(); }, 'multiply', 1);
    c.save(); c.lineCap = 'round'; const crs = g.cr;
    for (let i = 6; i < 66; i += 2) { const w = Math.sin(PI * (i - 6) / 60); c.strokeStyle = L.rgba('#2b1315', .5 * w * s.depth); c.lineWidth = 1 + 2.4 * w; c.beginPath(); c.moveTo(crs[i][0], crs[i][1]); c.lineTo(crs[i + 2][0], crs[i + 2][1]); c.stroke(); } c.restore();
    // brow-bone shadow band above crease, and lit bone further up
    blurDo(c, 16, (t) => { t.strokeStyle = L.rgba(sk.shade, .6 * s.depth); t.lineWidth = a * .22; path(t, off(g.cr.slice(8, 64), a * .13)); t.stroke(); }, 'multiply', .8);
    blurDo(c, 20, (t) => { t.strokeStyle = L.rgba(sk.lit, .55); t.lineWidth = a * .16; path(t, off(g.cr.slice(10, 62), a * .42)); t.stroke(); }, 'screen', .3);
    // under-eye: lower lid thickness, tear-trough shadow (cool), cheek highlight
    blurDo(c, 12, (t) => { t.strokeStyle = L.rgba(s.trough, .5 * s.depth); t.lineWidth = a * .15; path(t, off(g.lo.slice(6, 66), -a * .20)); t.stroke(); }, 'multiply', .85);
    blurDo(c, 22, (t) => { t.strokeStyle = L.rgba(sk.lit, .55); t.lineWidth = a * .20; path(t, off(g.lo.slice(12, 60), -a * .5)); t.stroke(); }, 'screen', .26);
    // lower-lid ledge: thin lit line just under the margin, with its shadow beneath
    c.save(); c.lineCap = 'round'; path(c, off(g.lo.slice(2, 68), -a * .045)); c.strokeStyle = L.rgba(L.mix(sk.lit, '#ffd5c4', .3), .22); c.lineWidth = a * .016; c.stroke(); c.restore();
    // crease hatch (brush pencil) + under-eye fine lines
    L.paint(c, (b, rnd) => {
      b.set('2B', '#000', .5);
      for (let i = 9; i < 64; i += 2) { const p = g.cr[i], nrm = normals(g.cr)[i]; const l = a * (.04 + .05 * rnd()); b.line(p[0] - nrm[0] * a * .01 + rnd() * 2, p[1] - nrm[1] * a * .01, p[0] - nrm[0] * (l + a * .01) + nrm[2] * l * .6, p[1] - nrm[1] * (l + a * .01) + nrm[3] * l * .6); }
      for (let i = 14; i < 58; i += 3) { const p = g.lo[i], nrm = normals(g.lo)[i]; const l = a * (.05 + .07 * rnd()); b.line(p[0] + nrm[0] * a * .09, p[1] + nrm[1] * a * .09, p[0] + nrm[0] * a * .09 + nrm[2] * l * .4, p[1] + nrm[1] * a * .09 + l * (nrm[3] > 0 ? 1 : 1) * .8); }
    }, { seed: seed + 12, mode: 'mask', color: L.mix(sk.shade, '#1a0c0e', .5), alpha: .38, gain: 1.7 });
  };

  /* ---------------- eyeball ---------------- */
  // s.iris = {inner, mid, outer, rim}, s.catch = 'window'|'headlight'|'city', s.pupil = fraction of iris radius
  E.ball = function (c, g, s, seed) {
    const a = g.a, ic = g.ic, R = g.Rp, Rp = R * s.pupil, r = L.rng(seed + 21), q = c.q;
    if (g.open < .03) return;
    c.save(); aperture(c, g); c.clip();
    // --- sclera: grey-pink falloff from the iris to the corners, never pure white
    c.fillStyle = s.sclera[1]; c.fillRect(g.cx - a * 1.3, g.cy - a, a * 2.6, a * 2);
    let rg = c.createRadialGradient(ic[0], ic[1], R * .9, ic[0], ic[1], a * 1.15); rg.addColorStop(0, s.sclera[0]); rg.addColorStop(.55, s.sclera[1]); rg.addColorStop(1, s.sclera[2]); c.fillStyle = rg; c.fillRect(g.cx - a * 1.3, g.cy - a, a * 2.6, a * 2);
    // inner corner: caruncle pink glow
    const inn = g.P(-.93, .02); rg = c.createRadialGradient(inn[0], inn[1], 0, inn[0], inn[1], a * .26); rg.addColorStop(0, L.rgba('#c47468', .85)); rg.addColorStop(.6, L.rgba('#b9776f', .4)); rg.addColorStop(1, L.rgba('#b9776f', 0)); c.fillStyle = rg; c.fillRect(inn[0] - a * .3, inn[1] - a * .3, a * .6, a * .6);
    // fine capillaries
    c.lineCap = 'round'; for (let i = 0; i < 9; i++) { const side = i < 5 ? -1 : 1; const st = g.P(side * (.88 + r() * .1), (r() - .3) * .2); const en = g.P(side * (.5 + r() * .15), (r() - .5) * .3); c.strokeStyle = L.rgba('#a8423f', .08 + r() * .1 * s.veins); c.lineWidth = .7 + r() * .6; c.beginPath(); c.moveTo(st[0], st[1]); c.quadraticCurveTo((st[0] + en[0]) / 2 + (r() - .5) * 18, (st[1] + en[1]) / 2 + (r() - .5) * 18, en[0], en[1]); c.stroke(); }
    // --- iris
    c.save(); c.beginPath(); c.arc(ic[0], ic[1], R, 0, TAU); c.clip();
    rg = c.createRadialGradient(ic[0], ic[1], Rp * .9, ic[0], ic[1], R); const I = s.iris;
    rg.addColorStop(0, L.mix(I.inner, I.mid, .2)); rg.addColorStop(.45, I.mid); rg.addColorStop(.88, I.outer); rg.addColorStop(1, I.rim); c.fillStyle = rg; c.fillRect(ic[0] - R, ic[1] - R, R * 2, R * 2);
    const ramp = (t) => t < .5 ? L.mix(I.inner, I.mid, t / .5) : L.mix(I.mid, I.outer, (t - .5) / .5);
    const nStroke = Math.round(s.strokes * (q < 1 ? .55 : 1));
    // radial fibres: dark and light, jittered hue/value
    for (let i = 0; i < nStroke; i++) {
      const ang = r() * TAU, t0 = r(), rr0 = Rp * (.92 + r() * .12), rr1 = R * (.55 + .45 * Math.pow(r(), .55));
      const mid = (rr0 + rr1) / 2 / R, col = L.hsl(ramp(cl((mid - Rp / R) / (1 - Rp / R), 0, 1)), (r() - .5) * 14, (r() - .5) * .16, (r() < .5 ? -1 : 1) * (.03 + r() * .1));
      const bend = (r() - .5) * .12;
      c.strokeStyle = L.rgba(col, .16 + r() * .38); c.lineWidth = (.7 + r() * 1.8) * (R / 130);
      c.beginPath(); c.moveTo(ic[0] + cos(ang) * rr0, ic[1] + sin(ang) * rr0); c.quadraticCurveTo(ic[0] + cos(ang + bend) * (rr0 + rr1) / 2, ic[1] + sin(ang + bend) * (rr0 + rr1) / 2, ic[0] + cos(ang + bend * 1.6) * rr1, ic[1] + sin(ang + bend * 1.6) * rr1); c.stroke();
    }
    // long dark furrows from the limbus inwards + bright thin fibres from the pupil
    for (let i = 0; i < nStroke * .25; i++) { const ang = r() * TAU; c.strokeStyle = L.rgba(I.rim, .25 + r() * .3); c.lineWidth = (.8 + r() * 1.4) * (R / 130); const r0 = R * (.98), r1 = R * (.62 + r() * .2); c.beginPath(); c.moveTo(ic[0] + cos(ang) * r0, ic[1] + sin(ang) * r0); c.lineTo(ic[0] + cos(ang + (r() - .5) * .06) * r1, ic[1] + sin(ang + (r() - .5) * .06) * r1); c.stroke(); }
    for (let i = 0; i < nStroke * .3; i++) { const ang = r() * TAU; c.strokeStyle = L.rgba(L.mix(I.inner, '#ffffff', .18), .12 + r() * .22); c.lineWidth = (.5 + r() * 1.0) * (R / 130); const r0 = Rp * 1.02, r1 = Rp + (R - Rp) * (.25 + r() * .3); c.beginPath(); c.moveTo(ic[0] + cos(ang) * r0, ic[1] + sin(ang) * r0); c.lineTo(ic[0] + cos(ang + (r() - .5) * .08) * r1, ic[1] + sin(ang + (r() - .5) * .08) * r1); c.stroke(); }
    // collarette: wavy bright ring + dark ring inside it
    const rc = Rp + (R - Rp) * .36;
    for (let pass = 0; pass < 2; pass++) { c.beginPath(); for (let i = 0; i <= 120; i++) { const an = i / 120 * TAU, j = (L.noise(cos(an) * 3 + 9, sin(an) * 3 + 9, seed) - .5) * R * .07 + (r() - .5) * R * .012; const rad = rc + j + (pass ? -R * .035 : 0); const x = ic[0] + cos(an) * rad, y = ic[1] + sin(an) * rad; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.strokeStyle = pass ? L.rgba(I.outer, .35) : L.rgba(L.mix(I.inner, '#fff', .15), .38); c.lineWidth = (pass ? 3.4 : 2.6) * (R / 130); c.stroke(); }
    // crypts: tiny dark flecks
    for (let i = 0; i < 26; i++) { const an = r() * TAU, rad = rc + (r() - .3) * R * .22; c.fillStyle = L.rgba(I.rim, .3 + r() * .25); ell(c, ic[0] + cos(an) * rad, ic[1] + sin(an) * rad, (2 + r() * 3) * R / 130, (1 + r() * 2) * R / 130, an); c.fill(); }
    // pupil ruff shade + pupil
    rg = c.createRadialGradient(ic[0], ic[1], Rp * .95, ic[0], ic[1], Rp * 1.45); rg.addColorStop(0, L.rgba('#000', .55)); rg.addColorStop(1, L.rgba('#000', 0)); c.fillStyle = rg; c.fillRect(ic[0] - R, ic[1] - R, R * 2, R * 2);
    rg = c.createRadialGradient(ic[0], ic[1], 0, ic[0], ic[1], Rp * 1.07); rg.addColorStop(0, '#040304'); rg.addColorStop(.86, '#050304'); rg.addColorStop(1, 'rgba(5,3,4,0)'); c.fillStyle = rg; c.fillRect(ic[0] - R, ic[1] - R, R * 2, R * 2);
    // caustic glow in the lower iris (light focused through the cornea, opposite the light)
    c.globalCompositeOperation = 'screen';
    const cxg = ic[0] - s.lx * R * .32, cyg = ic[1] + R * .5; rg = c.createRadialGradient(cxg, cyg, 0, cxg, cyg, R * .85); rg.addColorStop(0, L.rgba(s.caustic, .55 * s.causticA)); rg.addColorStop(.5, L.rgba(s.caustic, .2 * s.causticA)); rg.addColorStop(1, L.rgba(s.caustic, 0)); c.fillStyle = rg; c.fillRect(ic[0] - R, ic[1] - R, R * 2, R * 2);
    c.globalCompositeOperation = 'source-over';
    // limbal ring
    rg = c.createRadialGradient(ic[0], ic[1], R * .68, ic[0], ic[1], R * 1.02); rg.addColorStop(0, L.rgba(I.rim, 0)); rg.addColorStop(.6, L.rgba(I.rim, .45)); rg.addColorStop(.9, L.rgba(I.rim, .95)); rg.addColorStop(1, L.rgba(I.rim, 1)); c.fillStyle = rg; c.fillRect(ic[0] - R, ic[1] - R, R * 2, R * 2);
    c.restore(); // iris clip
    // soft limbus edge on the sclera side
    c.strokeStyle = L.rgba(I.rim, .5); c.lineWidth = 2.2 * R / 130; c.beginPath(); c.arc(ic[0], ic[1], R * 1.005, 0, TAU); c.stroke();
    blurDo(c, 3.5, (t) => { t.strokeStyle = L.rgba('#1a0f10', .5); t.lineWidth = R * .07; t.beginPath(); t.arc(ic[0], ic[1], R * 1.04, 0, TAU); t.stroke(); }, 'multiply', .75);
    // --- shadow of the upper lid + lashes over the eyeball
    blurDo(c, a * .045, (t) => { const top = g.up.slice(); t.fillStyle = L.rgba('#0c0608', .85); path(t, top.concat([[top[top.length - 1][0] + a * .3, g.cy - a * 2], [top[0][0] - a * .3, g.cy - a * 2]]), true); t.fill(); }, 'source-over', .78);
    blurDo(c, a * .03, (t) => { t.translate(0, a * .1); t.fillStyle = L.rgba('#0c0608', .55); const top = g.up.slice(); path(t, top.concat([[top[top.length - 1][0] + a * .3, g.cy - a * 2], [top[0][0] - a * .3, g.cy - a * 2]]), true); t.fill(); }, 'source-over', .35 * s.depth);
    // lower lid: a faint reflected-light veil, then a wet meniscus line
    blurDo(c, a * .02, (t) => { t.fillStyle = L.rgba('#120a0c', .5); const lo = g.lo.slice(); path(t, lo.concat([[lo[lo.length - 1][0] + a * .3, g.cy + a * 2], [lo[0][0] - a * .3, g.cy + a * 2]]), true); t.fill(); }, 'source-over', .5);
    c.restore(); // aperture clip
    // wet tear line along the lower margin (inside the aperture) + inner-corner highlight
    c.save(); aperture(c, g); c.clip();
    c.lineCap = 'round';
    blurDo(c, 1.2, (t) => { t.strokeStyle = L.rgba(s.wet, .55 + .2 * s.tear); t.lineWidth = a * .02 * (1 + 1.4 * s.tear); path(t, off(g.lo.slice(3, 68), a * .018 * (1 + s.tear))); t.stroke(); }, 'screen', 1);
    c.strokeStyle = L.rgba('#fff', .5); c.lineWidth = Math.max(1, a * .006); path(c, off(g.lo.slice(10, 62), a * .026 * (1 + s.tear))); c.stroke();
    c.restore();
    // --- catchlights (corneal reflection; clipped to the iris disc + a bit)
    c.save(); aperture(c, g); c.clip(); c.beginPath(); c.arc(ic[0], ic[1], R * 1.02, 0, TAU); c.clip();
    c.globalCompositeOperation = 'screen';
    const k = R / 130; const sx = s.catchSide; // -1: upper-left, +1: upper-right
    rg = c.createLinearGradient(ic[0] + sx * R * .6, ic[1] - R * .7, ic[0] - sx * R * .3, ic[1] + R * .2); rg.addColorStop(0, 'rgba(255,255,255,.2)'); rg.addColorStop(.5, 'rgba(255,255,255,.04)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rg; c.fillRect(ic[0] - R, ic[1] - R, R * 2, R * 2);
    if (s.catch === 'window') {
      const wx = ic[0] + sx * R * .42, wy = ic[1] - R * .36, ww = R * .50, wh = R * .42;
      blurDo(c, 5 * k, (t) => { t.fillStyle = 'rgba(255,240,205,.7)'; t.fillRect(wx - ww * .55, wy - wh * .55, ww * 1.1, wh * 1.1); }, 'screen', .55);
      c.save(); c.translate(wx, wy); c.rotate(sx * .09); c.filter = `blur(${.9 * q * k}px)`;
      const rr = (x, y, w, h) => { c.fillStyle = 'rgba(255,248,232,.97)'; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, 3 * k * 2); else c.rect(x, y, w, h); c.fill(); };
      const gp = ww * .045; rr(-ww / 2, -wh / 2, ww / 2 - gp, wh / 2 - gp); rr(gp, -wh / 2, ww / 2 - gp, wh / 2 - gp); rr(-ww / 2, gp, ww / 2 - gp, wh / 2 - gp); rr(gp, gp, ww / 2 - gp, wh / 2 - gp);
      c.restore();
      // secondary, small soft reflection low on the opposite side
      blurDo(c, 1.4 * k, (t) => { t.fillStyle = 'rgba(255,238,205,.8)'; ell(t, ic[0] - sx * R * .46, ic[1] + R * .5, R * .075, R * .06, .5); t.fill(); }, 'screen', .75);
      blurDo(c, 5 * k, (t) => { t.strokeStyle = 'rgba(255,210,150,.6)'; t.lineWidth = R * .07; t.beginPath(); t.arc(ic[0], ic[1], R * .9, .15 * PI, .85 * PI); t.stroke(); }, 'screen', .45);
    } else if (s.catch === 'headlight') {
      const hx = ic[0] + sx * R * .36, hy = ic[1] - R * .22;
      blurDo(c, 9 * k, (t) => { t.fillStyle = 'rgba(190,220,255,.7)'; ell(t, hx, hy, R * .5, R * .22); t.fill(); }, 'screen', .55);
      [[0, 0, .105], [R * .24, R * .05, .07]].forEach(([dx, dy, rad]) => { blurDo(c, 1.2 * k, (t) => { t.fillStyle = 'rgba(255,255,255,1)'; ell(t, hx + dx * -sx, hy + dy, R * rad, R * rad * .92); t.fill(); }, 'screen', 1); blurDo(c, 4 * k, (t) => { t.fillStyle = 'rgba(180,215,255,.9)'; ell(t, hx + dx * -sx, hy + dy, R * rad * 1.6, R * rad * 1.5); t.fill(); }, 'screen', .55); });
      blurDo(c, 1.6 * k, (t) => { const gg = t.createLinearGradient(hx - R * .7, 0, hx + R * .7, 0); gg.addColorStop(0, 'rgba(210,230,255,0)'); gg.addColorStop(.5, 'rgba(230,242,255,.95)'); gg.addColorStop(1, 'rgba(210,230,255,0)'); t.fillStyle = gg; t.fillRect(hx - R * .7, hy - R * .012, R * 1.4, R * .024); }, 'screen', .8);
      blurDo(c, 1.2 * k, (t) => { t.fillStyle = 'rgba(210,230,255,.8)'; ell(t, ic[0] - sx * R * .42, ic[1] + R * .46, R * .05, R * .04); t.fill(); }, 'screen', .7);
    } else { // city: coloured bokeh reflections
      const lights = s.cityLights; lights.forEach((l, i) => { const x = ic[0] + l.x * R, y = ic[1] + l.y * R; blurDo(c, 1.5 * k, (t) => { t.fillStyle = L.rgba(l.c, .95); ell(t, x, y, l.r * R, l.r * R * .92); t.fill(); }, 'screen', l.a); blurDo(c, 6 * k, (t) => { t.fillStyle = L.rgba(l.c, .8); ell(t, x, y, l.r * R * 1.7, l.r * R * 1.6); t.fill(); }, 'screen', .35 * l.a); });
      blurDo(c, 5 * k, (t) => { t.strokeStyle = 'rgba(255,214,150,.6)'; t.lineWidth = R * .07; t.beginPath(); t.arc(ic[0], ic[1], R * .9, .15 * PI, .85 * PI); t.stroke(); }, 'screen', .4);
    }
    c.restore();
  };

  /* ---------------- lids, lashes ---------------- */
  E.lids = function (c, g, s, seed) {
    const a = g.a, r = L.rng(seed + 41), o = g.open, lash = s.lash;
    // upper lash line (thick liner, thicker mid/outer)
    c.save(); c.fillStyle = lash.color;
    const upSeg = g.up.slice(2, 69);
    blurDo(c, .8, (t) => { t.fillStyle = lash.color; taper(t, upSeg.map(p => p), (u) => a * lash.liner * (.2 + .8 * Math.pow(sin(PI * Math.pow(u, .85)), .8)) * (.7 + .3 * o)); }, 'source-over', .95);
    // lines slightly above the margin: thickened liner offset upward by half its width
    const lin = off(upSeg, (u) => a * lash.liner * .42 * (.2 + .8 * Math.pow(sin(PI * Math.pow(u, .85)), .8)));
    c.fillStyle = L.rgba(lash.color, .9); taper(c, lin, (u) => a * lash.liner * .8 * (.15 + .85 * Math.pow(sin(PI * Math.pow(u, .85)), .8)));
    c.restore();
    // lashes: clumps
    const nClump = lash.clumps, lashes = [];
    for (let i = 0; i < nClump; i++) {
      const tc = .08 + .9 * (i + r() * .5) / nClump, nIn = r.int(2, 4); const cl0 = lash.len * (.55 + .6 * Math.pow(tc, 1.1)) * (.85 + r() * .3);
      for (let j = 0; j < nIn; j++) lashes.push({ t: cl(tc + (r() - .5) * .018, .05, .99), L: cl0 * (.78 + r() * .4), da: (r() - .5) * 11, w: lash.w * (.7 + r() * .6) });
    }
    c.save();
    lashes.forEach((ls, i) => {
      const t = ls.t, base = g.P(g.tu(t), g.upperV(t));
      const sweep = lerp(8, 62, Math.pow(t, .9)) + ls.da;
      let al = (-90 + sweep) + (1 - o) * (150 + (r() - .5) * 8), curl = 26 + r() * 12;
      const a0 = al * PI / 180, a1 = (al - curl * (2 * o - 1)) * PI / 180;
      // map local angle (u,v axes) to canvas through mirror/tilt
      const dirv = (ang) => { const lx = cos(ang), ly = sin(ang); const th = -g.tilt * g.mirror; const x = g.mirror * lx, y = ly; return [x * cos(th) - y * sin(th), x * sin(th) + y * cos(th)]; };
      const Ln = ls.L * a, d0 = dirv(a0), d1 = dirv((a0 + a1) / 2), d2 = dirv(a1);
      const p0 = [base[0] + d0[0] * 1, base[1] + d0[1] * 1], p1 = [p0[0] + d0[0] * Ln * .38, p0[1] + d0[1] * Ln * .38], p2 = [p1[0] + d1[0] * Ln * .34, p1[1] + d1[1] * Ln * .34], p3 = [p2[0] + d2[0] * Ln * .28, p2[1] + d2[1] * Ln * .28];
      const pts = bez(p0, p1, p2, p3, 12);
      c.fillStyle = L.rgba(i % 5 === 0 ? lash.color2 : lash.color, .78 + r() * .2);
      taper(c, pts, (u) => ls.w * a * 0.012 * (1 - Math.pow(u, .9)) + .35);
    });
    c.restore();
    // lower lashes: short, sparse, fine
    if (lash.lower > 0 && o > .25) {
      c.save(); const nl = lash.lower;
      for (let i = 0; i < nl; i++) {
        const t = .2 + .78 * (i + r() * .6) / nl, base = g.P(g.tu(t), g.lowerV(t));
        const ang = (82 + lerp(-10, 36, t) + (r() - .5) * 14) * PI / 180; const th = -g.tilt * g.mirror; const lx = cos(ang), ly = sin(ang), x = g.mirror * lx, y = ly; const d = [x * cos(th) - y * sin(th), x * sin(th) + y * cos(th)];
        const Ln = a * lash.lowerLen * (.6 + .6 * r()); const p0 = [base[0], base[1] + 1], p3 = [p0[0] + d[0] * Ln, p0[1] + d[1] * Ln]; const pts = bez(p0, [p0[0] + d[0] * Ln * .3, p0[1] + d[1] * Ln * .3], [p0[0] + d[0] * Ln * .7 + g.mirror * Ln * .12, p0[1] + d[1] * Ln * .7], p3, 8);
        c.fillStyle = L.rgba(lash.color2, .5 + r() * .25); taper(c, pts, (u) => a * .008 * (1 - u) + .3);
      }
      c.restore();
    }
    // rim light on the lid margin: thin cool glint along the upper lid edge crest + lower lid rim shadow
    c.save(); c.lineCap = 'round'; path(c, off(g.up.slice(12, 62), -a * .004)); c.strokeStyle = L.rgba(s.rim, .22 * Math.min(1, o + .3)); c.lineWidth = Math.max(1, a * .005); c.stroke(); c.restore();
  };

  /* ---------------- brows ---------------- */
  E.brow = function (c, g, s, seed) {
    const a = g.a, r = L.rng(seed + 51), B = s.brow; const th = -g.tilt * g.mirror;
    const pts = [[-1.12 + B.dx, -1.02 + B.dy], [-.6, -1.2 + B.dy + B.arch * .3], [-.0, -1.3 + B.dy + B.arch], [.55, -1.24 + B.dy + B.arch * .5], [1.12, -1.05 + B.dy + B.drop]];
    const sm = L.smooth(pts.map(p => g.P(p[0], p[1])), false, 14);
    const N = normals(sm), n = sm.length;
    // underlay: soft dark density (brush pencil wash) so the hair reads as a mass
    blurDo(c, a * .03, (t) => { t.strokeStyle = L.rgba(B.color, .5); t.lineCap = 'round'; for (let i = 0; i < n - 1; i++) { const u = i / (n - 1); t.lineWidth = a * B.thick * 1.5 * (.35 + .65 * sin(PI * Math.pow(u, .9))); t.beginPath(); t.moveTo(sm[i][0], sm[i][1]); t.lineTo(sm[i + 1][0], sm[i + 1][1]); t.stroke(); } }, 'multiply', .8);
    const cnt = Math.round(B.n * (c.q < 1 ? .6 : 1));
    c.save();
    for (let i = 0; i < cnt; i++) {
      const u = Math.pow(r(), 1.0), idx = Math.min(n - 1, Math.floor(u * (n - 1))), p = sm[idx], nm = N[idx];
      const hh = a * B.thick * (.3 + .7 * sin(PI * cl(u * .94 + .03, 0, 1))) * (r() * 2 - 1) * .8;
      const bx = p[0] + nm[0] * hh, by = p[1] + nm[1] * hh;
      // hair direction: inner hairs upward, then along the brow, outer slightly down
      const tx = nm[2], ty = nm[3], lift = lerp(62, -10, Math.pow(u, .7)) * PI / 180;
      const ax = tx * cos(lift) + nm[0] * sin(lift), ay = ty * cos(lift) + nm[1] * sin(lift), ang0 = Math.atan2(ay, ax);
      const len = a * (.12 + .08 * r()) * (.8 + .5 * sin(PI * u)), wdt = a * .009 * (.7 + r() * .7);
      const q1 = [bx + ax * len * .5 + nm[0] * len * .05, by + ay * len * .5 + nm[1] * len * .05], q2 = [bx + ax * len, by + ay * len + len * .07];
      const col = L.hsl(B.color, (r() - .5) * 10, 0, (r() - .5) * .1);
      c.fillStyle = L.rgba(col, .55 + r() * .4);
      taper(c, bez([bx, by], [(bx + q1[0]) / 2, (by + q1[1]) / 2], q1, q2, 7), (uu) => wdt * (1 - Math.pow(uu, 1.2)) * (uu < .12 ? .5 + uu * 4 : 1) + .25);
    }
    c.restore();
  };

  /* ---------------- extra: drops, wet tear, finish ---------------- */
  E.drop = function (c, x, y, rx, ry, rot, o = {}) {
    const k = o.k || 1, tint = o.tint || '#bcd2e6';
    c.save(); c.translate(x, y); c.rotate(rot || 0);
    c.fillStyle = 'rgba(10,6,8,.38)'; ell(c, rx * .12, ry * .22, rx * 1.1, ry * 1.08); c.fill();  // contact shadow below-right
    // body: lens that shows a darker lower edge, lighter upper centre
    let g = c.createRadialGradient(-rx * .25, -ry * .3, 0, 0, 0, Math.max(rx, ry) * 1.1); g.addColorStop(0, L.rgba(tint, .35)); g.addColorStop(.7, L.rgba(tint, .16)); g.addColorStop(1, 'rgba(15,10,14,.3)'); c.fillStyle = g; ell(c, 0, 0, rx, ry); c.fill();
    c.strokeStyle = 'rgba(12,8,10,.32)'; c.lineWidth = Math.max(.8, rx * .09); ell(c, rx * .04, ry * .06, rx * .96, ry * .96); c.stroke();
    c.save(); c.globalCompositeOperation = 'screen'; c.strokeStyle = L.rgba('#fff', .62 * (o.spec || 1)); c.lineWidth = Math.max(.8, rx * .12); c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, rx * .84, 3.5, 4.6); c.stroke();
    c.strokeStyle = L.rgba(o.glint || '#ffdca0', .4); c.beginPath(); c.arc(0, 0, rx * .8, .5, 1.3); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.95)'; ell(c, -rx * .32, -ry * .36, Math.max(.8, rx * .14), Math.max(.7, ry * .12)); c.fill(); c.restore();
    c.restore();
  };
  E.skinDrops = function (c, s, seed, n, rects, o = {}) {
    const r = L.rng(seed + 61);
    for (let i = 0; i < n; i++) { const R = r.pick(rects); const x = R[0] + r() * (R[2] - R[0]), y = R[1] + r() * (R[3] - R[1]); const big = r() < .18; const rx = (big ? 11 + r() * 9 : 3.5 + r() * 6) * (o.k || 1); E.drop(c, x, y, rx, rx * (1 + r() * .35), (r() - .5) * .5, { k: o.k, tint: s.dropTint, glint: s.dropGlint }); if (big && r() < .6) { c.save(); c.strokeStyle = 'rgba(190,210,230,.12)'; c.lineWidth = rx * .8; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y - rx * 4 * (1 + r() * 2)); c.lineTo(x, y - rx); c.stroke(); c.restore(); } }
  };
  E.tear = function (c, g, s, seed, len) {
    const a = g.a; const t0 = g.mirror === 1 ? .22 : .22; const st = g.P(g.tu(t0), g.lowerV(t0) + .01);
    const end = [st[0] + g.mirror * -a * .03, st[1] + len]; const pts = bez(st, [st[0] - g.mirror * a * .02, st[1] + len * .3], [end[0] + g.mirror * a * .03, st[1] + len * .65], end, 22);
    const w = (u) => a * (.075 * (1 - u * .35)) * Math.pow(sin(PI * Math.min(1, u * 8 + .1) / 2 + .0), .4);
    // water track on skin: darker lower edge, lifted lit core, bright specular
    c.save(); c.fillStyle = 'rgba(20,12,16,.34)'; taper(c, pts.map(p => [p[0] + a * .012, p[1] + a * .01]), (u) => w(u) * 1.06); c.restore();
    c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = L.rgba(s.dropTint, .22); taper(c, pts, (u) => w(u) * .95);
    c.fillStyle = 'rgba(255,255,255,.4)'; taper(c, pts.map(p => [p[0] - a * .012, p[1]]), (u) => w(u) * .18 * (1 - u * .5)); c.restore();
    // the drop at the end
    E.drop(c, end[0], end[1] + a * .03, a * .052, a * .075, 0, { tint: s.dropTint, glint: s.dropGlint, spec: 1.2 });
    // brimming meniscus on the lower lid
  };
  E.finish = function (c, s, seed, vig) {
    L.vignette(c, vig === undefined ? .55 : vig);
    L.grain(c, { a: .07, seed: 9 });
  };

  /* ---------------- styles ---------------- */
  const MEREY = {
    skin: { lit: '#c59a85', mid: '#a47b69', shade: '#664844', rose: '#b86f66', cool: '#6d6a8a' }, lx: -1, depth: 1, trough: '#5a4660',
    sclera: ['#d3c9c6', '#c1b3b1', '#7d6672'], veins: 1, wet: '#ffe6e0', tear: 0, rim: '#b8d4e8',
    iris: { inner: '#a8662c', mid: '#6b3a1b', outer: '#2c170c', rim: '#0b0605' }, pupil: .38, strokes: 780, caustic: '#ffb468', causticA: 1, catch: 'window', catchSide: -1,
    lash: { color: '#0e0809', color2: '#1d1210', liner: .034, clumps: 17, len: .2, w: 1.15, lower: 16, lowerLen: .075 },
    brow: { color: '#1e1412', n: 380, thick: .11, dx: 0, dy: 0, arch: -.02, drop: .05 },
    dropTint: '#c4d8ea', dropGlint: '#ffd9a0'
  };
  const SANZHAR = {
    skin: { lit: '#8d8186', mid: '#5c5662', shade: '#262a3a', rose: '#6c5560', cool: '#2f4066' }, lx: 1, depth: 1.25, trough: '#242a45',
    sclera: ['#b4b0b2', '#9a9499', '#565262'], veins: .7, wet: '#d7e6ff', tear: 0, rim: '#cfe2ff',
    iris: { inner: '#3b6cb8', mid: '#17407f', outer: '#0a1a3f', rim: '#040813' }, pupil: .36, strokes: 840, caustic: '#6fa0ff', causticA: .9, catch: 'headlight', catchSide: 1,
    lash: { color: '#0a0a0e', color2: '#16161c', liner: .03, clumps: 15, len: .15, w: 1.15, lower: 12, lowerLen: .06 },
    brow: { color: '#14141a', n: 420, thick: .115, dx: 0, dy: .02, arch: .005, drop: .05 },
    dropTint: '#bcd2e6', dropGlint: '#cfe2ff'
  };
  E.styles = { MEREY, SANZHAR };

  /* ---------------- single-eye compositions ---------------- */
  function mereyEye(k, open) {
    const c = L.layer(), seed = 6100, s = MEREY;
    E.skin(c, s, seed);
    const g = E.make({ cx: 600, cy: 425, a: 300, tilt: .07, mirror: 1, open, Hu: .43, Hl: .32, R: .40 });
    E.socket(c, g, s, seed);
    E.pores(c, s, seed);
    E.ball(c, g, s, seed);
    E.lids(c, g, s, seed);
    E.brow(c, g, s, seed);
    // rim light: cool city light from the right on skin; warm window light from the left
    L.glow(c, 1260, 300, 640, '#7fbfd0', .22, 'screen'); L.glow(c, -40, 360, 620, '#ffcf8a', .2, 'screen');
    E.skinDrops(c, s, seed, 18, [[60, 40, 340, 650], [840, 120, 1160, 650], [380, 560, 840, 690], [420, 20, 800, 110]], { k: 1 });
    // glass feel: faint streaks of water running over the whole shot
    c.save(); c.globalCompositeOperation = 'screen'; c.lineCap = 'round'; const r = L.rng(seed + 77);
    for (let i = 0; i < 7; i++) { const x = r() * 1200, y = r() * 300; c.strokeStyle = `rgba(200,220,240,${.05 + r() * .06})`; c.lineWidth = 3 + r() * 5; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 8, y + 100, x - 10, y + 220, x + 4, y + 300 + r() * 200); c.stroke(); }
    c.restore();
    E.finish(c, s, seed, .55);
    return c;
  }
  P.register('eye_merey_closed', { w: 1200, h: 700, alpha: false, seed: 6101 }, async (k) => mereyEye(k, 0));
  P.register('eye_merey_half', { w: 1200, h: 700, alpha: false, seed: 6102 }, async (k) => mereyEye(k, .5));
  P.register('eye_merey_open', { w: 1200, h: 700, alpha: false, seed: 6103 }, async (k) => mereyEye(k, 1));

  P.register('eye_sanzhar', { w: 1200, h: 700, alpha: false, seed: 6200 }, async (k) => {
    const c = L.layer(), seed = 6200, s = SANZHAR;
    E.skin(c, s, seed);
    const g = E.make({ cx: 600, cy: 410, a: 300, tilt: .03, mirror: -1, open: 1, Hu: .36, Hl: .27, R: .36, ci: [0, -.03], cornerIn: .05, cornerOut: -.025, lidClosed: .1 });
    E.socket(c, g, s, seed);
    E.pores(c, s, seed);
    E.ball(c, g, s, seed);
    E.lids(c, g, s, seed);
    E.brow(c, g, s, seed);
    // headlight raking from the right: cold rim on brow bone, cheek and lower lid; left side stays in shadow
    L.glow(c, 1300, 200, 760, '#bcd8ff', .3, 'screen'); L.glow(c, 1180, 600, 420, '#a8c6f0', .16, 'screen');
    c.save(); const gr = c.createLinearGradient(0, 0, 1200, 0); gr.addColorStop(0, 'rgba(6,8,16,.5)'); gr.addColorStop(.5, 'rgba(6,8,16,0)'); c.fillStyle = gr; c.fillRect(0, 0, 1200, 700); c.restore();
    E.finish(c, s, seed, .7);
    return c;
  });
})();
