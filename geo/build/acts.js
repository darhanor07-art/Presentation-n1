/* =====================================================================
   СЛАЙДТАРДЫҢ 3D КҮЙІ: камера ракурстары (SHOTS) және әр слайдтағы әлем күйі (stage)
   i — слайд индексі, t — слайд басталғаннан бергі уақыт (с), a — ауысу біткеннен бергі уақыт (с)
   ===================================================================== */
'use strict';
(() => {
const X = window.GEO, T = X.T, {PI, TAU, clamp, lerp, ss, bump, E, V} = X;
const B = X.BLOCK;
const kzSpin = (cam, look) => X.spinFor(67, cam, look);

/* ---------------------------------------------------------------- ракурстар */
// p — камера, l — қарайтын нүкте, fov, push — баяу жақындау, drift — тербеліс, set — сахна
const S = (set, p, l, fov, o = {}) => ({set, p: V(...p), l: V(...l), fov, u: V(0, 1, 0), push: o.push ?? .1, drift: o.drift ?? .012, coc: o.coc ?? 0, focus: o.focus ?? 20, f: o.f});
const SH = X.SHOTS = {
  black:    S('space', [-4, 2, 60], [0, 0, 0], 30),
  cover:    S('space', [-7.5, 6.5, 33], [3.2, .8, 0], 33, {push: .06}),
  hook:     S('space', [6.4, 16.5, 23], [0, 3.2, 0], 31, {push: .08}),
  shells:   S('space', [-15, 6, 30], [-4.2, .5, 0], 34, {push: .05}),
  cut:      S('space', [25, 18, 22], [1.2, .3, 1.2], 36, {push: .05}),
  cutedge:  S('space', [12.8, 11.2, 8.2], [6.1, 6.4, .9], 33, {push: .03, drift: .004}),
  plates:   S('space', [-2, 17.5, 25], [-1.4, 2, 0], 35, {push: .06}),
  ozone:    S('space', [-9, 5, 28], [3.5, 1, 0], 36, {push: .05}),
  bio:      S('space', [4, 13, 28], [-.5, 1, 0], 34, {push: .06}),
  volcano:  S('ground', [-10.6, 1.5, 22.6], [-3.9, -1.5, 8], 41),
  quake:    S('ground', [5.5, 2.2, 18.5], [2.6, -1.4, 8], 42, {drift: .008}),
  cliff:    S('ground', [-.6, -1.4, 13.2], [-.9, -2.3, 8], 38, {push: .05}),
  coast:    S('ground', [-16, 5.5, 13], [-7.5, -.2, 1.5], 40),
  aqua:     S('ground', [-21.5, 1.2, 15.5], [-10.5, -1.3, 3.5], 42),
  ocean:    S('ground', [-10.6, -.75, 5.4], [-8.4, -1.2, 1.0], 52, {push: .05, drift: .01}),
  cycle:    S('ground', [-3.5, 12.5, 25.5], [.8, 2.6, -.5], 44, {push: .05}),
  mountain: S('ground', [1.6, 5.6, 7.5], [8.6, 3.1, -3.4], 40),
  sky:      S('ground', [-2.5, 1.5, 6.5], [2.5, 6.8, -4.5], 48, {push: .04}),
  tropo:    S('ground', [-15, 4, 21], [0, 0, 0], 46, {f: 'tropo'}),
  upper:    S('ground', [-17, 22, 30], [0, 18, 0], 50, {f: 'upper'}),
  life:     S('ground', [.9, 1.3, -3.4], [1.9, .75, .3], 38, {push: .06}),
  zones:    S('ground', [2.2, 4.4, 9.4], [8.6, 2.9, -1.8], 42),
  soil:     S('ground', [1.55, .78, 9.9], [1.3, .5, 8], 27, {push: .03, drift: .003}),
  whole:    S('ground', [-19, 15, 29], [0, -.6, 0], 40, {push: .05}),
  aral:     S('ground', [-1.2, 4.4, 9.8], [.9, .2, 2.6], 40, {push: .05}),
  answer:   S('ground', [4.6, 1.6, 7.4], [2.3, 1.1, 5.6], 36, {f: 'answer'}),
  final:    S('ground', [-9, 9, 19], [0, 0, 0], 40, {f: 'final'}),
};
// уақытқа тәуелді ракурстар (лифт, айналу)
const F = {
  tropo(t) { const k = E.io2(clamp(t / 26)), y = lerp(3.5, 15.5, k); return {p: V(lerp(-14, -15.5, k), y, lerp(19, 22, k)), l: V(0, y - lerp(4.5, 9, k), 0)}; },
  upper(t) { const k = E.io2(clamp(t / 30)), y = lerp(21, 92, k); return {p: V(-17, y, 30), l: V(0, y - 2.5, 0)}; },
  answer(t) { const c = V(X.SPOT.x, X.H(X.SPOT.x, X.SPOT.z) + .22, X.SPOT.z), a = 2.0 + t * .012, r = 2.4; return {p: V(c.x + Math.sin(a) * r, c.y + .42 + Math.sin(t * .2) * .05, c.z + Math.cos(a) * r), l: c.clone().add(V(-Math.cos(a) * .62, .12, Math.sin(a) * .62))}; },
  final(t) { const k = E.io2(clamp(t / 34)); return {p: V(lerp(-9, -6, k), lerp(9, 72, k), lerp(19, 34, k)), l: V(0, lerp(0, 2, k), 0)}; },
};
X.shotCam = (name, t, push, drift) => {
  const s = SH[name]; let P = s.p, L = s.l;
  if (s.f) { const r = F[s.f](t); P = r.p; L = r.l; }
  const d = L.clone().sub(P).normalize(), k = E.o2(clamp(t / 18)) * (push ?? s.push), A = drift ?? s.drift;
  const pos = P.clone().addScaledVector(d, k * P.distanceTo(L) * .12).add(V(Math.sin(t * .41 + 1.3) * A, Math.sin(t * .53) * A * .6, Math.sin(t * .37 + 2) * A));
  const look = L.clone().add(V(Math.sin(t * .31) * A * .8, Math.sin(t * .47 + 1) * A * .5, 0));
  return {pos, look, fov: s.fov, up: s.u, focus: s.focus, coc: s.coc, set: s.set};
};

/* ---------------------------------------------------------------- слайдтар кестесі */
// space: {spin|kz, sun, kz, kzLine, plates, cut, lith, ozone, rays, bio}; ground: {quake, sub, mag, aqu, rain, vapor, elev, dry, kids, belt, soil}
const SUNG = V(-.55, .62, .55);
const SL = X.SL = [
 /* 1 */ {shot: 'cover'},
 /* 2 */ {shot: 'hook'},
 /* 3 */ {shot: 'shells'},
 /* 4 */ {shot: 'cut'},
 /* 5 */ {shot: 'cutedge'},
 /* 6 */ {shot: 'plates'},
 /* 7 */ {shot: 'volcano'},
 /* 8 */ {shot: 'quake'},
 /* 9 */ {shot: 'cliff'},
 /*10 */ {shot: 'coast'},
 /*11 */ {shot: 'aqua'},
 /*12 */ {shot: 'ocean'},
 /*13 */ {shot: 'cycle'},
 /*14 */ {shot: 'mountain'},
 /*15 */ {shot: 'sky'},
 /*16 */ {shot: 'tropo'},
 /*17 */ {shot: 'upper'},
 /*18 */ {shot: 'ozone'},
 /*19 */ {shot: 'bio'},
 /*20 */ {shot: 'life'},
 /*21 */ {shot: 'zones'},
 /*22 */ {shot: 'soil'},
 /*23 */ {shot: 'whole'},
 /*24 */ {shot: 'aral'},
 /*25 */ {shot: 'answer'},
 /*26 */ {shot: 'final'},
];
X.N = SL.length;
// ғарыштағы күй: Қазақстан камераға қарайтындай айналу
function space(id, t, a, cam) {
  const o = {sun: V(1, .3, .6), cloud: 1, night: 1};
  const kzFace = c => X.spinFor(67, c.pos.clone().sub(V(0, c.pos.y * .0, 0)), V(0, 0, 0)) + .25;
  switch (id) {
    case 1: { // мұқаба: Жердің жиегінен Күн шығады
      const k = ss(0, 9, t); o.sun = V(lerp(.25, .85, k), lerp(.12, .3, k), lerp(-1, -.35, k)); o.spin = -2.35 + t * .012; o.sunI = 1; break; }
    case 2: o.spin = kzFace(cam) + t * .004; o.kz = ss(.5, 2, a); o.kzLine = 1; o.kzRev = clamp(a / 2.2); o.sun = V(.9, .45, .75); break;
    case 3: o.spin = kzFace(cam) - .5 + t * .01; o.sun = V(-.2, .45, 1); o.kz = .4; break;
    case 4: o.spin = -2.1 + t * .006; o.sun = V(.85, .75, .7); o.cut = 1; o.sel = -1; break;
    case 5: o.spin = -2.1 + t * .006; o.sun = V(.85, .75, .7); o.cut = 1; o.lith = ss(.3, 1.5, a); break;
    case 6: o.spin = kzFace(cam) + .15 + t * .006; o.sun = V(.7, .55, .85); o.plates = ss(0, 1.2, a + .6); o.kz = .5; o.kzLine = .6; o.cloud = .55; break;
    case 18: o.spin = -1.6 + t * .008; o.sun = V(1, .18, .12); o.ozone = ss(0, 1.5, a + .5); o.rays = ss(.5, 2, a); o.atm = 1.3; break;
    case 19: o.spin = kzFace(cam) - .3 + t * .008; o.sun = V(.8, .45, .9); o.bio = 1; o.bioF = lerp(.0, 3.4, E.o2(clamp(a / 7))); break;
  }
  return o;
}
function ground(id, t, a, cam) {
  const o = {sunDir: SUNG, fauna: 1, camY: cam ? cam.pos.y : 0, mag: .5, rain: .0, smoke: 1, lava: 1};
  switch (id) {
    case 7: o.sub = 1; o.mag = 1; break;
    case 8: { const q = (Math.max(a, 0) % 4.2); o.quake = a > 0 ? 1 : 0; o.quakeT = q; o.mag = .5; break; }
    case 9: o.sel = -1; break;
    case 10: o.waterHi = ss(0, 1.5, a) * .4; break;
    case 11: o.waterHi = .25; break;
    case 12: o.under = 1; break;
    case 13: { const c = (Math.max(a, 0) % 18) / 18; o.vapor = 1; o.rain = ss(.35, .55, c) * (1 - ss(.85, .98, c)) + .25; o.aqu = 1; o.seaCloudX = lerp(-8.8, 6.5, ss(.1, .5, c)); break; }
    case 14: o.rain = .7; break;
    case 15: break;
    case 16: o.elev = 1; break;
    case 17: o.elev = 1; o.stars = .2; break;
    case 20: o.bio = .35 + .25 * Math.sin(t * .8); o.kids = 0; break;
    case 21: o.belt = a > 0 ? Math.floor((a / 3.2) % 6) - 1 : -1; if (o.belt > 4) o.belt = -1; break;
    case 22: o.soil = ss(0, 1.2, a); break;
    case 23: o.aqu = 1; o.vapor = .6; o.rain = .4; o.bio = .3; break;
    case 24: o.dry = E.io2(clamp((a - .5) / 9)); o.haze = ss(4, 9, a) * .2; o.fauna = 1 - ss(3, 8, a); break;
    case 25: o.kids = 1; o.kidScale = .42; o.kidPose = ['wave', 'point']; o.kidYaw = 2.0 + t * .012 + PI - .15; break;
    case 26: o.kids = 1; o.kidScale = .42; o.kidPose = ['wave', 'wave']; o.kidYaw = 2.5; o.elev = 1; o.stars = .3; break;
  }
  if (id === 24) o.dusk = ss(2, 9, a) * .5;
  return o;
}
X.stage = (i, t, a, cam) => {
  const id = i + 1, sh = SH[SL[i].shot], c = cam || X.shotCam(SL[i].shot, t);
  X.setSet(sh.set);
  if (sh.set === 'space') X.spaceTick(t + i * 3.7, space(id, t, a, c));
  else X.groundTick(t + i * 5.1, ground(id, t, a, c));
};
X.slideSet = i => SH[SL[i].shot].set;
})();
