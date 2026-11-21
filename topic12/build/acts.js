/* =====================================================================
   x ≠ 0 · СЛАЙДТАРДЫҢ 3D КҮЙІ
   Әр слайд үшін: ракурс, тәулік уақыты, тақтадағы жазу, дәптерлер,
   «12» карточкасы, кейіпкерлердің позасы мен әрекеті.
   X.stage(i, t, a): i — слайд (0-ден), t — слайдқа кіргеннен бергі уақыт,
   a — ауысу біткеннен бергі уақыт (ауысу кезінде теріс).
   ===================================================================== */
'use strict';
(() => {
const X = X12, T = X.T, {clamp, lerp, ss, bump, E, rng, V, PAL, PI, TAU, chalkText, chalkPath, circlePts} = X;
const P = X.PEOPLE, Wd = X.world, {AY, ER, DZ, DESK_Y} = Wd;
const CH = 'rgba(245,240,230,.94)', YE = 'rgba(244,201,93,.97)', CO = 'rgba(242,139,108,.97)', MI = 'rgba(143,211,182,.97)';
const INKB = 'rgba(38,62,120,.92)', PEN = 'rgba(70,74,88,.9)';

/* ---------------------------------------------------------------- тақта */
const BOARD = X.BOARD;
BOARD.bg = (() => { const c = X.canvas(2048, 614), g = c.getContext('2d'), r = rng(11);
  g.fillStyle = PAL.board; g.fillRect(0, 0, 2048, 614);
  const gr = g.createLinearGradient(0, 0, 0, 614); gr.addColorStop(0, 'rgba(255,255,255,.035)'); gr.addColorStop(1, 'rgba(0,0,0,.1)'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 614);
  for (let i = 0; i < 26; i++) { g.save(); g.globalAlpha = .012 + r() * .022; g.strokeStyle = '#F5F0E6'; g.lineWidth = 40 + r() * 70; g.lineCap = 'round';
    g.beginPath(); g.arc(r() * 2048, r() * 614, 80 + r() * 220, r() * 6, r() * 6 + 1.2 + r() * 1.5); g.stroke(); g.restore(); }
  g.globalAlpha = .05; g.fillStyle = '#F5F0E6'; g.font = '700 90px Caveat'; g.fillText('3 + 4 = 7', 1560, 560); g.globalAlpha = 1;
  return c; })();
function chalkGrain(g, w, h, seed) { const r = rng(seed); g.save(); g.fillStyle = PAL.board;
  for (let i = 0; i < 5200; i++) { g.globalAlpha = .25 + r() * .35; const s = 1 + r() * 2.4; g.fillRect(r() * w, r() * h, s, s); } g.restore(); }
function shapeIcon(g, kind, cx, cy, s, color, rev = 1) {
  if (kind === 'circle') chalkPath(g, circlePts(cx, cy, s, 54), color, 9, rev);
  if (kind === 'triangle') chalkPath(g, [[cx, cy - s], [cx + s * 1.1, cy + s * .8], [cx - s * 1.1, cy + s * .8]], color, 9, rev, true);
  if (kind === 'square') chalkPath(g, [[cx - s * .85, cy - s * .85], [cx + s * .85, cy - s * .85], [cx + s * .85, cy + s * .85], [cx - s * .85, cy + s * .85]], color, 9, rev, true);
}
X.shapeIcon = shapeIcon;
function drawBoard(key, a) {
  const g = BOARD.g; g.drawImage(BOARD.bg, 0, 0);
  const warm = () => { chalkText(g, '6 + 4 = 10', 110, 262, 84); chalkText(g, '9 + 1 = 10', 110, 392, 84); };
  if (key !== 'udl' && key !== 'tri') chalkText(g, 'Сынып жұмысы', 1024, 92, 64, CH, 1, 'center');
  if (key === 's2') warm();
  if (key === 's3') { warm(); chalkText(g, '7 + 5 = ?', 1080, 390, 200, CH, clamp(a / 2.2), 'center'); }
  if (key === 's6' || key === 'sum') { warm(); const w = chalkText(g, '7 + 5 = ', 700, 390, 200); chalkText(g, '12', 700 + w, 390, 200, YE);
    if (key === 's6') chalkText(g, '8 + 6 = ?', 1560, 300, 110);
    else { chalkText(g, 'Айару — көрсетеді', 1480, 250, 64, MI); chalkText(g, 'Ерасыл — жазады', 1480, 340, 64, CO); chalkText(g, '8 + 6 = ?', 1560, 480, 100); } }
  if (key === 'udl') { const cols = [['circle', 'Неге?', 'Қатысу', YE], ['triangle', 'Не?', 'Ұсыну', CO], ['square', 'Қалай?', 'Әрекет', MI]];
    cols.forEach(([k, q, w, c], i) => { const cx = 360 + i * 664, r = clamp((a - .2 - i * .7) / .8);
      shapeIcon(g, k, cx, 190, 80, c, r); chalkText(g, q, cx, 400, 110, CH, ss(.4, 1, r), 'center'); chalkText(g, w, cx, 520, 72, c, ss(.6, 1, r), 'center');
      if (i) chalkPath(g, [[cx - 332, 80], [cx - 332, 560]], 'rgba(245,240,230,.35)', 4, ss(0, .4, r)); }); }
  if (key === 'steps') { const r1 = clamp(a / 1.6), r2 = clamp((a - 1.4) / 1.6);
    chalkText(g, '1. Алмаларды сана', 90, 230, 84, CH, r1);
    for (let i = 0; i < 12; i++) { const rv = clamp((a - .6 - i * .08) / .25), cx = 150 + i * 72 + (i >= 7 ? 40 : 0);
      if (rv > 0) { chalkPath(g, circlePts(cx, 330, 26, 30), i < 7 ? CO : YE, 7, rv); chalkPath(g, [[cx, 304], [cx + 6, 284]], MI, 6, rv); } }
    chalkText(g, '+', 150 + 7 * 72 - 26, 345, 70, CH, clamp((a - 1.2) / .3));
    chalkText(g, '2. Қосындыны карточкамен көрсет', 90, 480, 84, CH, r2);
    chalkPath(g, [[1520, 380], [1660, 380], [1660, 560], [1520, 560]], YE, 8, clamp((a - 2.6) / .8), true);
    chalkText(g, '?', 1590, 515, 120, YE, clamp((a - 3.2) / .4), 'center'); }
  if (key === 'tri') { const r = clamp(a / 1.6);
    const A_ = [520, 90], B_ = [880, 540], C_ = [160, 540]; chalkPath(g, [A_, B_, C_], CH, 10, r, true);
    [[A_, B_, '1'], [B_, C_, '2'], [C_, A_, '3']].forEach(([p, q, n], i) => chalkText(g, n, (p[0] + q[0]) / 2 + [40, 0, -70][i], (p[1] + q[1]) / 2 + [0, 75, 0][i], 80, CO, clamp((a - 1.4 - i * .25) / .3), 'center'));
    const w0 = chalkText(g, 'үшбұ', 1100, 250, 130, CH, clamp((a - 2.0) / .6)); chalkText(g, 'р', 1100 + w0, 250, 130, YE, clamp((a - 2.4) / .3));
    chalkText(g, 'ыш', 1100 + w0 + 52, 250, 130, CH, clamp((a - 2.5) / .4));
    chalkText(g, '3 қабырға · 3 бұрыш', 1100, 410, 76, MI, clamp((a - 2.9) / .8)); }
  if (key === 'home') { chalkText(g, 'Үй тапсырмасы', 1024, 210, 96, YE, 1, 'center'); chalkText(g, '«Дүкен» ойыны', 1024, 330, 96, CH, 1, 'center');
    chalkText(g, 'нан 7 + сүт 5 = ?', 1024, 470, 110, CH, 1, 'center'); }
  chalkGrain(g, 2048, 614, 5);
  BOARD.tex.needsUpdate = true;
}
const NL = X.NL;
const nlX = i => 64 + i * 96;
function drawNL(key, a) {
  const g = NL.g; g.fillStyle = '#F7F1E4'; g.fillRect(0, 0, 2048, 112);
  g.strokeStyle = PAL.ink; g.lineWidth = 5; g.beginPath(); g.moveTo(30, 50); g.lineTo(2018, 50); g.stroke();
  g.fillStyle = PAL.ink; g.font = '700 38px Rubik'; g.textAlign = 'center';
  for (let i = 0; i <= 20; i++) { g.lineWidth = i % 5 ? 4 : 7; g.beginPath(); g.moveTo(nlX(i), 36); g.lineTo(nlX(i), 64); g.stroke(); g.fillText(String(i), nlX(i), 102); }
  if (key === 'hop') {
    for (let k = 0; k < 5; k++) { const r = clamp((a - .2 - k * .45) / .4); if (r <= 0) continue; g.save(); g.strokeStyle = PAL.coral; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.arc(nlX(7 + k) + 48, 50, 46, PI, PI + PI * r); g.stroke(); g.restore(); }
    const h = clamp((a - 2.5) / .4);
    if (h > 0) { g.save(); g.strokeStyle = PAL.yellow; g.lineWidth = 8; g.globalAlpha = h; g.beginPath(); g.arc(nlX(12), 90, 30 * (1 + .3 * (1 - h)), 0, TAU); g.stroke(); g.restore(); }
  }
  NL.tex.needsUpdate = true;
}
/* ---------------------------------------------------------------- дәптерлер, журнал */
function gridPaper(g, w, h, ruled = false) {
  g.fillStyle = '#FBF9F3'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,170,205,.45)'; g.lineWidth = 1.4;
  for (let x = 8; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 8; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.fillStyle = 'rgba(90,70,60,.25)'; g.fillRect(w / 2 - 3, 0, 6, h);
  const gr = g.createLinearGradient(w / 2 - 40, 0, w / 2 + 40, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(60,40,30,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(w / 2 - 40, 0, 80, h);
  g.strokeStyle = 'rgba(220,90,90,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w - 70, 0); g.lineTo(w - 70, h); g.stroke();
}
const hand = (g, txt, x, y, size, color, rev = 1) => chalkText(g, txt, x, y, size, color, rev, 'left', 'Caveat', 600);
function drawNB(key, a) {
  const o = X.NB[key[0]], g = o.g; gridPaper(g, 1024, 720);
  if (key === 'A' || key === 'Aanim') { const k = key === 'Aanim' ? a : 99;
    chalkPath(g, [[230, 120], [400, 420], [60, 420]], PEN, 6, clamp(k / 1.1), true);
    chalkPath(g, circlePts(250, 580, 80, 40), PEN, 6, clamp((k - 1.1) / .8));
    hand(g, 'үшбұрыш', 600, 220, 84, INKB, clamp((k - 1.9) / .9)); hand(g, 'шеңбер', 600, 380, 84, INKB, clamp((k - 2.6) / .8));
    hand(g, '3 қабырға', 600, 540, 64, 'rgba(176,70,60,.9)', clamp((k - 3.2) / .8)); }
  if (key === 'E' || key === 'Eanim' || key === 'Edone') { hand(g, '6 + 4 = 10', 80, 150, 80, INKB); hand(g, '9 + 1 = 10', 80, 280, 80, INKB);
    const r = key === 'Edone' ? 1 : key === 'Eanim' ? clamp((a - 1.3) / 1.5) : 0;
    if (r > 0) { hand(g, '7 + 5 = 12', 580, 200, 96, 'rgba(176,60,50,.95)', r); } }
  o.tex.needsUpdate = true;
}
function drawJR(key, a) {
  const g = X.world.JOURNAL.g; g.fillStyle = '#FBF8F0'; g.fillRect(0, 0, 1024, 720);
  g.strokeStyle = 'rgba(120,170,205,.5)'; g.lineWidth = 1.5; for (let y = 120; y < 720; y += 56) { g.beginPath(); g.moveTo(40, y); g.lineTo(984, y); g.stroke(); }
  g.fillStyle = 'rgba(90,70,60,.25)'; g.fillRect(509, 0, 6, 720);
  hand(g, 'Бақылау күнделігі', 50, 96, 64, 'rgba(38,68,58,.95)'); hand(g, 'Айару · 2-сынып', 560, 96, 60, 'rgba(38,68,58,.95)');
  if (key === 'obs') { const lines = [['Топта: 3 есеп —', 50, 220], ['карточкамен ✓', 50, 276], ['Жеке: 10 есептің 9-ы', 50, 388], ['сан түзуімен ✓', 50, 444],
      ['Тірек + күту', 560, 220], ['уақыты берілгенде —', 560, 276], ['өз бетімен', 560, 332], ['орындайды!', 560, 388]];
    lines.forEach(([t, x, y], i) => hand(g, t, x, y, 50, INKB, clamp((a - .3 - i * .42) / .5)));
    const r = clamp((a - 3.8) / .6); if (r > 0) { g.save(); g.globalAlpha = r; g.strokeStyle = 'rgba(176,60,50,.9)'; g.lineWidth = 6; g.beginPath(); g.ellipse(760, 640, 210, 56, -.04, 0, TAU); g.stroke();
      hand(g, 'x = 12', 660, 664, 70, 'rgba(176,60,50,.95)'); g.restore(); } }
  X.world.JOURNAL.tex.needsUpdate = true;
}
const DRAW = {board: drawBoard, nl: drawNL, nbA: drawNB, nbE: drawNB, jr: drawJR};
const lastKey = {};
function paint(kind, key, a, animDur) {   // кілт өзгергенде немесе анимация кезінде ғана қайта салады
  const q = !animDur ? 'static' : a <= -1 ? 'pre' : a >= animDur ? 'done' : Math.round(a * 30);
  const k = key + '|' + q; if (lastKey[kind] === k) return; lastKey[kind] = k;
  DRAW[kind](key, q === 'pre' ? 0 : (q === 'done' || q === 'static') ? 99 : q / 30);
}
/* ---------------------------------------------------------------- бос карточкалар */
const LOOSE = [];
[10, 11, 13].forEach((n, i) => { const c = X.canvas(128, 170), g = c.getContext('2d'); g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, 128, 170);
  g.fillStyle = [PAL.sky, PAL.mint, PAL.coral][i]; g.fillRect(0, 0, 128, 18); g.fillStyle = PAL.ink; g.font = '800 82px Rubik'; g.textAlign = 'center'; g.fillText(String(n), 64, 122);
  const m = X.mesh(new T.PlaneGeometry(.06, .08), new T.MeshStandardMaterial({map: X.ctex(c), roughness: .45}), AY.x + .02 + i * .055, DESK_Y + .002, DZ - .16 + (i % 2) * .01, X.scene, {r: [-PI / 2, 0, (i - 1) * .25], cast: false});
  LOOSE.push(m); });

/* =====================================================================
   СЛАЙДТАР КЕСТЕСІ
   ===================================================================== */
// board: тақта · nl: сан түзуі · nbA/nbE: дәптерлер · jr: журнал · card: «12» қайда · min: сағат (минут)
const SL = X.SL = [
 /* 1*/ {shot: 'ext', tod: .2, board: 's2', min: 500, card: 'desk'},
 /* 2*/ {shot: 'wide', tod: .2, board: 's2', min: 545, card: 'desk'},
 /* 3*/ {shot: 'board', tod: .2, board: 's3', boardAnim: 3.2, min: 547, card: 'desk'},
 /* 4*/ {shot: 'ayaru', tod: .2, board: 's3', min: 548, card: 'reach'},
 /* 5*/ {shot: 'erasyl', tod: .2, board: 's3', min: 548, card: 'hand'},
 /* 6*/ {shot: 'teacher', tod: .2, board: 's6', min: 549, card: 'hand', split: {shot: 'ayaruC'}},
 /* 7*/ {shot: 'topdesk', tod: .2, board: 's6', min: 550, card: 'desk'},
 /* 8*/ {shot: 'underdesk', tod: .2, board: 's6', min: 550, card: 'lap'},
 /* 9*/ {shot: 'front', tod: .2, board: 's6', min: 551, card: 'lap'},
 /*10*/ {shot: 'window', tod: .2, board: 's6', min: 553, card: 'lap'},
 /*11*/ {shot: 'backwall', tod: .2, board: 's6', min: 555, card: 'lap'},
 /*12*/ {shot: 'notebook', tod: .2, board: 's6', nbA: 'Aanim', nbAnim: 4.2, min: 556, card: 'lap'},
 /*13*/ {shot: 'extwide', tod: .2, board: 's6', min: 558, card: 'lap'},
 /*14*/ {shot: 'portrait', tod: .2, board: 's6', min: 560, card: 'lap'},
 /*15*/ {shot: 'boardudl', tod: .2, board: 'udl', boardAnim: 3.2, min: 562, card: 'lap'},
 /*16*/ {shot: 'side', tod: .2, board: 'udl', min: 564, card: 'show', dline: 1},
 /*17*/ {shot: 'numwall', tod: .2, board: 'udl', nl: 'hop', nlAnim: 3.2, min: 566, card: 'desk', dline: 1},
 /*18*/ {shot: 'boardsteps', tod: .2, board: 'steps', boardAnim: 3.8, nl: 'hop', min: 568, card: 'desk', dline: 1},
 /*19*/ {shot: 'teacherdesk', tod: .2, board: 'steps', nl: 'hop', min: 570, card: 'desk', dline: 1, chips: 'anim'},
 /*20*/ {shot: 'cards', tod: .2, board: 'steps', nl: 'hop', min: 571, card: 'desk', dline: 1, aac: 1},
 /*21*/ {shot: 'clock', tod: .2, board: 'steps', nl: 'hop', min: 572, card: 'desk', dline: 1, aac: 1, tick: 1},
 /*22*/ {shot: 'boardtri', tod: .2, board: 'tri', boardAnim: 3.8, nl: 'hop', min: 574, card: 'desk', dline: 1, aac: 1},
 /*23*/ {shot: 'miniboards', tod: .2, board: 'tri', nl: 'hop', min: 576, card: 'desk', dline: 1, aac: 1, mini: 1, split: {shot: 'minicl'}},
 /*24*/ {shot: 'pair', tod: .2, board: 'sum', nl: 'hop', nbE: 'Eanim', nbAnim: 3, min: 578, card: 'place', dline: 1, aac: 1},
 /*25*/ {shot: 'overhead', tod: .2, board: 'sum', nl: 'hop', nbE: 'Edone', min: 580, card: 'line', dline: 1, aac: 1},
 /*26*/ {shot: 'journal', tod: .2, board: 'sum', nl: 'hop', nbE: 'Edone', jr: 'obs', jrAnim: 4.6, min: 582, card: 'line', dline: 1, aac: 1},
 /*27*/ {shot: 'evening', tod: .7, board: 'home', nl: 'hop', nbE: 'Edone', jr: 'obs', min: 990, card: 'mom', dline: 1, aac: 1, after: 1},
 /*28*/ {shot: 'sunset', tod: .82, board: 'home', nl: 'hop', nbE: 'Edone', jr: 'obs', min: 1065, card: 'line', dline: 1, aac: 1, after: 2},
 /*29*/ {shot: 'topdesk2', tod: .86, board: 'home', nl: 'hop', nbE: 'Edone', jr: 'obs', min: 1090, card: 'center', dline: 1, aac: 1, after: 2},
 /*30*/ {shot: 'night', tod: 1, board: 'home', nl: 'hop', nbE: 'Edone', jr: 'obs', min: 1260, card: 'center', dline: 1, aac: 1, after: 2},
];

/* ---------------------------------------------------------------- кейіпкерлер */
const kidsAll = X.KIDS.filter(k => k !== P.aya && k !== P.era);
const headYaw = (K, tx, tz) => { const dx = tx - K.g.position.x, dz = tz - K.g.position.z; return clamp(Math.atan2(-dx, -dz), -.7, .7); };
const _v = V(0, 0, 0), _q = new T.Quaternion(), _m = new T.Matrix4(), _e = new T.Euler();
let lapPose = false;
function cardAt(mode, t) {
  if (mode === 'show') mode = 'hand';
  const C = X.CARD; C.visible = true;
  const flat = (x, y, z, ry) => { C.position.set(x, y, z); C.rotation.set(-PI / 2, 0, ry); };
  if (mode === 'desk') return flat(AY.x + .19, DESK_Y + .004, DZ - .06, -.25);
  if (mode === 'center') return flat(-2.4, DESK_Y + .004, DZ + .02, .08);
  if (mode === 'line') { X.world.DLINE.updateMatrixWorld(); _v.set(X.dlineX(12), .004, -.085); X.world.DLINE.localToWorld(_v); return flat(_v.x, _v.y, _v.z, 0); }
  if (mode === 'hand' || mode === 'mom') { const K = P.aya; K.g.updateMatrixWorld(true);
    K.j.haR.getWorldPosition(_v); const yaw = K.g.rotation.y;
    C.position.copy(_v).add(V(-Math.sin(yaw) * .03, .05, -Math.cos(yaw) * .03)); C.rotation.set(-.12, yaw + PI, 0); return; }
  if (mode === 'lap') { if (lapPose) { P.aya.g.updateMatrixWorld(true); const a = V(), b = V(); P.aya.j.haR.getWorldPosition(a); P.aya.j.haL.getWorldPosition(b);
    C.position.copy(a.add(b).multiplyScalar(.5)).add(V(0, .03, -.02)); C.rotation.set(-1.15, 0, 0); } else { C.position.set(AY.x, .47, AY.z - .16); C.rotation.set(-PI / 2, 0, .3); } return; }
}
function kidsDefault(t, pose = 'attend', look = null) {
  for (const K of X.KIDS) { K.g.visible = true; X.pose(K, pose); if (look) K.j.head.rotation.y += headYaw(K, look[0], look[1]); X.idle(K, t); K.face.set('smile'); }
}
function teacherAt(x, z, ry, pa, pb, k, t, mouth = 'smile') { const Tc = P.tch; Tc.g.visible = true; Tc.g.position.set(x, 0, z); Tc.g.rotation.y = ry; X.pose(Tc, pa, pb, k); X.idle(Tc, t, .7); Tc.face.set(mouth); }
const talk = (t, on = 1) => on && (Math.sin(t * 11) > .1 || Math.sin(t * 7.3) > .6) ? 'open' : 'smile';
function hopKids(t) {
  const h1 = P.h1, h2 = P.h2; h1.g.visible = h2.g.visible = true;
  const cyc = (t * 1.25) % 11, n = Math.floor(cyc), f = cyc - n;
  const xs = [-7.45, -7.82, -8.2, -8.57, -8.94, -9.31, -9.68, -10.05, -10.42, -10.8, -11.15, -7.0];
  const x = lerp(xs[n], xs[n + 1] ?? -7.0, E.ioS(f)), dbl = n === 3 || n === 6;
  h1.g.position.set(n >= 10 ? lerp(-11.15, -7.0, f) : x, -.45 + Math.sin(PI * f) * .22 * (n < 10 ? 1 : 0), -.3 + (n >= 10 ? Math.sin(PI * f) * .5 : 0));
  h1.g.rotation.y = n >= 10 ? -PI / 2 : PI / 2; X.pose(h1, dbl ? 'stand' : 'hop'); h1.face.set('smile'); X.idle(h1, t);
  h2.g.position.set(-6.95, -.45, .75); h2.g.rotation.y = PI / 2 + .5; X.pose(h2, 'wait'); h2.face.set('open'); X.idle(h2, t);
}

X.stage = (i, t, a) => {
  const S = SL[i], id = i + 1;
  X.applyTod(X.tod(S.tod)); X.tick(t + i * 7.3);
  // тақта, сан түзуі, дәптер, журнал
  paint('board', S.board, a, S.boardAnim); paint('nl', S.nl || 'plain', a, S.nlAnim);
  paint('nbA', S.nbA === 'Aanim' ? 'Aanim' : 'A', a, S.nbA === 'Aanim' ? S.nbAnim : 0);
  paint('nbE', S.nbE || 'E', a, S.nbE === 'Eanim' ? S.nbAnim : 0);
  paint('jr', S.jr || 'blank', a, S.jrAnim);
  const sec = id === 21 ? 20 + Math.max(0, a) : (t * 1 + i * 13);
  X.setClock(S.min + (id === 21 ? Math.max(0, a) / 60 : 0), sec);
  // заттар
  Wd.DLINE.visible = !!S.dline; Wd.AAC.visible = !!S.aac; Wd.AACB.visible = !!S.aac; LOOSE.forEach(m => m.visible = !S.aac);
  Wd.MINI.forEach(b => b.visible = false); Wd.deskLight.intensity = 0;
  Wd.TENF.userData.chips.forEach((c, k) => { const p = X.tenChip(k);
    if (S.chips === 'anim') { const tk = .3 + (k < 10 ? k * .32 : 3.4 + (k - 10) * .3); const r = clamp((a - tk) / .35);
      c.visible = r > 0; c.position.set(p.x, p.y + (1 - E.o3(r)) * .25, p.z); }
    else { c.visible = id > 19; c.position.copy(p); } });
  Wd.DUST.visible = S.tod < .95; X.dustLevel(id === 28 ? 1.6 : id >= 27 ? 1.2 : .8);
  // адамдар
  for (const k of ['tch', 'log', 'mom', 'h1', 'h2']) P[k].g.visible = false;
  const kidsOn = !S.after;
  X.KIDS.forEach(K => K.g.visible = kidsOn);
  if (kidsOn) { kidsDefault(t, 'attend', [.9, -3.35]); if (id <= 26 && S.tod < .5) hopKids(t); }
  P.aya.face.set('flat'); P.era.face.set('smile');
  P.aya.g.position.set(AY.x, 0, AY.z); P.aya.g.rotation.y = 0;
  let card = S.card; lapPose = false;
  switch (id) {
    case 1: teacherAt(.9, -3.35, 0, 'write', null, 0, t); break;
    case 2: teacherAt(.9, -3.35, 0, 'write', null, 0, t); P.tch.j.elR.rotation.x += Math.sin(t * 5) * .12; break;
    case 3: { const w = clamp(a / 2.2), st = ss(2.3, 3.2, a);
      teacherAt(lerp(lerp(-.35, .55, w), 1.3, st), -3.35, lerp(0, PI - .7, ss(2.6, 3.4, a)), 'write', 'explain', st, t, a > 3.2 ? talk(t) : 'smile');
      if (st <= 0) { P.tch.j.shR.rotation.x += Math.sin(t * 9) * .06 * (w < 1 ? 1 : 0); P.tch.j.shR.rotation.z = lerp(.35, -.35, w); } break; }
    case 4: { teacherAt(.35, -3.35, 0, 'write', null, 0, t); const r = ss(.1, 1.1, a), up = ss(1.35, 2.1, a);
      X.pose(P.aya, up > 0 ? 'reach' : 'attend', up > 0 ? 'handMid' : 'reach', up > 0 ? up : r); X.idle(P.aya, t, .5); card = a > 1.05 ? 'hand' : 'desk'; break; }
    case 5: { teacherAt(.35, -3.35, 0, 'write', null, 0, t); X.pose(P.aya, 'handMid'); X.idle(P.aya, t, .3); P.aya.face.set('o');
      X.pose(P.era, 'attend', 'handUp', ss(.05, .35, t)); X.idle(P.era, t, .4); P.era.face.set(t > .08 ? 'open' : 'smile'); break; }
    case 6: { const turn = ss(.1, .9, a); teacherAt(.55, -3.35, lerp(0, PI - .25, turn), 'write', 'explain', turn, t, a > .5 && a < 2.2 ? talk(t) : 'smile');
      const low = ss(.35, 1.5, t); X.pose(P.aya, 'handMid', 'sad', low); P.aya.face.set('flat'); X.idle(P.aya, t, .3);
      X.pose(P.era, 'handUp', 'attend', ss(.0, .6, t)); P.era.face.set('smile'); X.idle(P.era, t); break; }
    case 7: teacherAt(.9, -3.25, PI - .2, 'explain', null, 0, t); X.pose(P.aya, 'sad'); X.idle(P.aya, t, .4); break;
    case 8: teacherAt(.9, -3.25, PI - .2, 'explain', null, 0, t); X.pose(P.aya, 'lap'); X.idle(P.aya, t, .3); Wd.deskLight.intensity = 1.1; lapPose = true;
      P.aya.j.elR.rotation.x += Math.sin(t * 1.7) * .03; break;
    case 9: X.pose(P.aya, 'lap'); X.idle(P.aya, t, .3); P.aya.j.head.rotation.x = -.55; X.pose(P.era, 'handUp'); X.idle(P.era, t); P.era.face.set('open'); break;
    case 10: case 11: case 13: case 14: teacherAt(.9, -3.25, PI - .2, 'explain', null, 0, t, talk(t, id !== 13)); X.pose(P.aya, 'lap'); X.idle(P.aya, t, .3); break;
    case 12: teacherAt(.9, -3.25, PI - .2, 'explain', null, 0, t); X.pose(P.aya, 'write'); X.idle(P.aya, t, .3); P.aya.j.elR.rotation.x += Math.sin(t * 6) * .08; break;
    case 15: teacherAt(lerp(lerp(-1.4, 1.35, clamp(a / 3.0)), 2.45, ss(3.0, 3.8, a)), -3.4, lerp(0, PI - .5, ss(3.2, 3.9, a)), 'write', 'explain', ss(3.0, 3.8, a), t); P.tch.j.shR.rotation.x += Math.sin(t * 8) * .05; X.pose(P.aya, 'attend'); break;
    case 16: teacherAt(.4, -3.25, PI - .3, 'open', null, 0, t); X.pose(P.aya, 'attend', 'show', ss(.2, 1.0, a)); X.idle(P.aya, t, .4); P.aya.face.set(a > 1 ? 'smile' : 'flat');
      X.pose(P.era, 'look'); P.era.j.head.rotation.y = .55; X.idle(P.era, t, .4); break;
    case 17: teacherAt(-1.6, -3.35, PI - .1, 'explain', null, 0, t); break;
    case 18: teacherAt(1.45, -3.3, PI - .5, 'explain', null, 0, t, talk(t)); P.tch.j.shR.rotation.x = 1.6; break;
    case 19: teacherAt(1.05, -3.45, PI - .3, 'hold', null, 0, t); break;
    case 20: { teacherAt(.9, -3.25, PI - .2, 'explain', null, 0, t); const r = ss(.3, 1.3, a); X.pose(P.aya, 'attend', 'reach', r); P.aya.j.shR.rotation.z = lerp(-.14, .3, r); P.aya.face.set('smile'); X.idle(P.aya, t, .3); break; }
    case 21: teacherAt(.9, -3.25, PI - .2, 'hold', null, 0, t); X.pose(P.aya, 'attend'); break;
    case 22: teacherAt(1.75, -3.3, PI - .4, 'explain', null, 0, t, talk(t)); P.tch.j.shR.rotation.x = lerp(.6, 1.5, ss(.2, .8, a)); break;
    case 23: { teacherAt(-1.9, -3.3, PI - .1, 'open', null, 0, t);
      X.KIDS.forEach((K, k) => { const r = ss(.0 + (k % 7) * .16, .5 + (k % 7) * .16, Math.max(a, 0) + .9); X.pose(K, 'attend', 'board', r); K.face.set('smile'); }); Wd.MINI.forEach(b => b.visible = true); break; }
    case 24: { teacherAt(.9, -3.25, PI - .2, 'open', null, 0, t); const r = ss(.2, 1.1, a); X.pose(P.aya, 'attend', 'place', r); P.aya.face.set('smile');
      card = a > 1.0 ? 'line' : 'hand'; if (a > 1.0) X.pose(P.aya, 'place', 'attend', ss(1.2, 1.9, a));
      X.pose(P.era, 'attend', 'write', ss(.9, 1.4, a)); P.era.j.elR.rotation.x += a > 1.3 && a < 2.9 ? Math.sin(t * 14) * .1 : 0; X.idle(P.era, t, .3); break; }
    case 25: X.pose(P.aya, 'attend'); P.aya.face.set('smile'); X.pose(P.era, 'attend'); break;
    case 26: teacherAt(2.75, -3.45, PI, 'hold', null, 0, t); P.aya.face.set('smile'); break;
    case 27: { teacherAt(3.05, -3.4, PI, 'talk', null, 0, t, talk(t + .5)); const L = P.log; L.g.visible = true; L.g.position.set(2.05, 0, -2.55); L.g.rotation.y = -PI / 2 + .25; X.pose(L, 'explain'); X.idle(L, t, .6); L.face.set(talk(t + 2.1, Math.sin(t * .8) > 0));
      const Mm = P.mom; Mm.g.visible = true; Mm.g.position.set(3.25, 0, -1.85); Mm.g.rotation.y = .25; X.pose(Mm, 'hold'); X.idle(Mm, t, .6); Mm.face.set('smile');
      const A_ = P.aya; A_.g.visible = true; A_.g.position.set(3.75, 0, -1.75); A_.g.rotation.y = .5; X.pose(A_, 'stand'); A_.j.shR.rotation.set(1.3, 0, -.2); A_.j.elR.rotation.x = .9; A_.face.set('smile'); X.idle(A_, t);
      card = 'hand'; break; }
  }
  if (card) cardAt(card, t);
  X.CARD.visible = !!card && !(S.after === 2 && card === 'hand');
};
X.shotCam = (name, t, push = .12, drift = .01) => {   // ракурс + баяу жылжу + қолмен түсіргендей тербеліс
  const s = X.SHOTS[name], d = s.l.clone().sub(s.p).normalize();
  const k = E.o2(clamp(t / 18)) * (s.push ?? push);
  const A = s.drift ?? drift, pos = s.p.clone().addScaledVector(d, k).add(V(Math.sin(t * .41 + 1.3) * A, Math.sin(t * .53) * A * .6, Math.sin(t * .37 + 2) * A));
  const look = s.l.clone().add(V(Math.sin(t * .31) * A * .8, Math.sin(t * .47 + 1) * A * .5, 0));
  return {pos, look, fov: s.fov, up: s.u, focus: s.focus - k, coc: s.coc};
};
})();
