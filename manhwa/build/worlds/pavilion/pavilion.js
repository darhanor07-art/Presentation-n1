// MOKPAN pavilion / bell / striker-log composition (our own code; three.js + HyperFrames seek protocol).
// World units = the 1000 x 1400 safe frame of the web-manhwa (y DOWN in the spec, converted by Y()).
// Orthographic front view, render size 720x1008 (1 px = 1.389 units). config.js sets window.__PAV = {layer, pass}.
import * as THREE from "three";
const CFG = window.__PAV || { layer: "bell", pass: "lit" };
const W = 1000, H = 1400, D2R = Math.PI / 180;
const Y = (y) => H - y;                       // spec y (down) -> three y (up)
const ID = CFG.pass === "id";
const canvas = document.getElementById("world-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !ID, alpha: false, preserveDrawingBuffer: true });
renderer.setSize(720, 1008, false); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color(ID ? 0x000000 : 0x202020);
const cam = new THREE.OrthographicCamera(0, W, H, 0, -3000, 3000); cam.position.set(0, 0, 1000); scene.add(cam);

// ---------- ID key colours (flat, unlit) per class; lit pass = neutral albedo, lit by key / fill / rim ----------
const KEY = { // bg
  void: 0xffff00, pillar: 0xff0000, beam: 0x00ff00, rafter: 0x0000ff,
  // bell
  body: 0xff0000, band: 0x00ff00, knob: 0x0000ff, panel: 0xffff00, medal: 0xff00ff, petal: 0x00ffff, dragon: 0xffffff, tube: 0xff8000,
  // log
  log: 0xff0000, rope: 0x00ff00, bracket: 0x0000ff, twist: 0xffff00 };
const ALB = { void: 0x101010, pillar: 0xcfc6b6, beam: 0xd6cdbd, rafter: 0xcfc6b6, body: 0xd8cdb8, band: 0xd8cdb8, knob: 0xe0d4be, panel: 0xd2c6b0,
  medal: 0xdccfb6, petal: 0xe4d8c2, dragon: 0xd8cdb8, tube: 0xcfc2aa, log: 0xcfc6b6, rope: 0x9a8f7e, bracket: 0x6c6254, twist: 0xb4a994 };
const METAL = { body: .35, band: .35, knob: .4, panel: .3, medal: .35, petal: .35, dragon: .35, tube: .3 };
function mat(cls) {
  if (ID) return new THREE.MeshBasicMaterial({ color: KEY[cls] });
  return new THREE.MeshStandardMaterial({ color: ALB[cls], roughness: cls === "log" || cls === "pillar" || cls === "beam" ? .85 : .5, metalness: METAL[cls] || 0, flatShading: false });
}
function add(parent, geo, cls, x, y, z, rot, scl) {
  const m = new THREE.Mesh(geo, mat(cls)); m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]); if (scl) m.scale.set(scl[0], scl[1], scl[2]);
  parent.add(m); return m;
}
if (!ID) { // key upper-left (front), soft fill, rim from behind-right
  const key = new THREE.DirectionalLight(0xfff0dc, 3.1); key.position.set(-700, 1500, 900); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xf0d8d0, 0x40201c, 1.1));
  const rim = new THREE.DirectionalLight(0xffc8b0, 1.9); rim.position.set(900, 500, -800); scene.add(rim);
}

// ---------- 범종 profile (local y DOWN from the shoulder top, v1 numbers) ----------
const PROFILE = [[0, 0], [110, 2], [150, 22], [171, 70], [177, 200], [185, 420], [199, 620], [209, 700], [214, 754]];
const sp = new THREE.SplineCurve(PROFILE.map((p) => new THREE.Vector2(p[0], p[1])));
const SM = sp.getPoints(160);                        // smoothed (r, yd)
function R(yd) { // radius at depth yd
  if (yd <= 0) return SM[0].x;
  for (let i = 1; i < SM.length; i++) if (SM[i].y >= yd) { const a = SM[i - 1], b = SM[i], u = (yd - a.y) / Math.max(1e-6, b.y - a.y); return a.x + (b.x - a.x) * u; }
  return SM[SM.length - 1].x;
}
const lat = (pts, seg = 112, ps = 0, pl = Math.PI * 2) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], -p[1])), seg, ps, pl); // (r, yd) -> (r, y up)

function buildBell(root) {
  const g = new THREE.Group(); g.position.set(460, Y(300), 0); root.add(g);
  // barrel (rounded shoulder, almost straight barrel widening slightly to the lip; closed with a thin lip return)
  const body = SM.map((p) => [p.x, p.y]); body.push([205, 758], [190, 758]);
  add(g, lat(body), "body", 0, 0, 0);
  g.children[0].material.side = THREE.DoubleSide;
  // raised bands (lathe rings): upper 30..90, lower 690..740
  [[30, 90, 9], [690, 740, 8]].forEach(([y0, y1, rs]) => {
    const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14, yd = y0 + (y1 - y0) * u; pts.push([R(yd) + rs * Math.pow(Math.sin(Math.PI * u), .45), yd]); }
    add(g, lat(pts, 128), "band", 0, 0, 0);
    // thin beaded rim lines
    [y0 + 5, y1 - 5].forEach((yy) => add(g, new THREE.TorusGeometry(R(yy) + rs - 1, 2.6, 8, 128), "band", 0, -yy, 0, [Math.PI / 2, 0, 0]));
  });
  // 유곽 panels: lathe patches facing camera (screen angles -40 / -4 deg), 3x3 knobs
  [-40, -4].forEach((deg) => {
    const c = deg * D2R, hw = 50 / 177;
    const y0 = 110, y1 = 220, rz = 7;
    add(g, lat([[R(y0), y0], [R(y0) + rz, y0], [R(y1) + rz, y1], [R(y1), y1]], 12, c - hw, hw * 2), "panel", 0, 0, 0).material.side = THREE.DoubleSide;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const ph = c + (i - 1) * 30 / 177, yy = y0 + 20 + j * 35, r = R(yy) + rz;
      const k = add(g, new THREE.SphereGeometry(10, 20, 14), "knob", r * Math.sin(ph), -yy, r * Math.cos(ph), null, [1, 1, .8]); k.rotation.y = ph;
    }
  });
  // 당좌 lotus medallion at screen angle +36 deg, y=520 (the strike point)
  const mc = new THREE.Group(), ph = 36 * D2R, my = 520, base = R(my) - 14;
  mc.position.set(base * Math.sin(ph), -my, base * Math.cos(ph)); mc.rotation.y = ph; g.add(mc);
  add(mc, new THREE.SphereGeometry(66, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), "medal", 0, 0, 0, [Math.PI / 2, 0, 0], [1, .34, 1]);
  add(mc, new THREE.TorusGeometry(59, 3.6, 10, 72), "medal", 0, 0, 10);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; add(mc, new THREE.SphereGeometry(1, 20, 12), "petal", Math.cos(a) * 38, Math.sin(a) * 38, 17, [0, 0, a + Math.PI / 2], [13, 25, 5]); }
  add(mc, new THREE.SphereGeometry(1, 28, 16), "medal", 0, 0, 21, null, [19, 19, 7]);
  for (let k = 0; k < 6; k++) add(mc, new THREE.SphereGeometry(2.6, 8, 6), "knob", Math.cos(k * 1.047) * 9, Math.sin(k * 1.047) * 9, 28);
  // dragon loop (용뉴): S-shaped tube + head; sound tube (음통)
  const pts = [[-72, 6], [-60, -26], [-22, -34], [8, -62], [46, -54], [62, -22], [56, 6]].map((p) => new THREE.Vector3(p[0], -p[1], 0));
  add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 13, 12, false), "dragon", 0, 0, 0);
  add(g, new THREE.SphereGeometry(1, 20, 14), "dragon", -76, -4, 6, [0, 0, .5], [20, 13, 13]);
  add(g, new THREE.SphereGeometry(12, 16, 12), "dragon", 8, 64, 0);
  add(g, new THREE.CylinderGeometry(19, 22, 82, 28), "tube", 81, 33, -4);
  [60, 24].forEach((yy) => add(g, new THREE.TorusGeometry(21.5, 3.2, 8, 40), "band", 81, yy - 33 + 33 - 0, -4, [Math.PI / 2, 0, 0]));
  // hanging rod + pin up to the beam (hang point = (460,190))
  const rod = add(root, new THREE.CylinderGeometry(9, 9, 70, 16), "tube", 466, Y(220), 0);
  add(root, new THREE.CylinderGeometry(14, 14, 16, 24), "dragon", 460, Y(190), 40, [Math.PI / 2, 0, 0]);
}

function buildBG(root) {
  add(root, new THREE.PlaneGeometry(W * 3, 260), "void", 500, Y(40), -400);                       // dark roof void
  // rafter ends (서까래): two staggered rows, domed ends facing the camera
  for (let row = 0; row < 2; row++) for (let i = -2; i < 18; i++) {
    const x = i * 62 + (row ? 31 : 0), y = row ? 34 : 92, r = 26;
    add(root, new THREE.CylinderGeometry(r, r, 120, 24), "rafter", x, Y(y), -40, [Math.PI / 2, 0, 0]);
    add(root, new THREE.SphereGeometry(r, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), "rafter", x, Y(y), 22, [Math.PI / 2, 0, 0], [1, .45, 1]);
  }
  // crossbeam (창방) with studs
  add(root, new THREE.BoxGeometry(W * 3, 70, 90), "beam", 500, Y(155), 0);
  add(root, new THREE.BoxGeometry(W * 3, 12, 20), "beam", 500, Y(120), 52);
  for (let x = -330; x < 1400; x += 110) add(root, new THREE.SphereGeometry(8, 12, 8), "beam", x, Y(155), 50, null, [1, 1, .5]);
  // two pillars (기둥) with slight entasis + stone bases
  [-34, 1034].forEach((cx) => {
    const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12, yd = 190 + 1000 * u; pts.push([96 + 12 * Math.sin(Math.PI * Math.min(1, u * .9 + .1)) - 4 * u, yd]); }
    const geo = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], Y(p[1]))), 64);
    add(root, geo, "pillar", cx, 0, 0).material.side = THREE.DoubleSide;
    add(root, new THREE.CylinderGeometry(118, 124, 44, 48), "pillar", cx, Y(1168), 0);
  });
}

function buildLog(root, theta) {
  const L = 630, A1 = 760, A2 = 1000, TIP = 570, LEN = 1200, RAD = 46, sn = Math.sin(theta), cs = Math.cos(theta);
  const yc = 190 + L * cs, tipx = TIP + L * sn;
  [A1, A2].forEach((ax) => {
    const x0 = ax, y0 = 172, x1 = ax + L * sn, y1 = 190 + L * cs - RAD * .2, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    const ang = Math.atan2(dx, dy);                                          // rope direction (down)
    const holder = new THREE.Group(); holder.position.set((x0 + x1) / 2, Y((y0 + y1) / 2), 12); holder.rotation.z = ang; root.add(holder);
    add(holder, new THREE.CylinderGeometry(5.5, 5.5, len, 12), "rope", 0, 0, 0);
    for (let k = 14; k < len - 10; k += 15) add(holder, new THREE.TorusGeometry(5.8, 1.7, 6, 14), "twist", 0, len / 2 - k, 0, [Math.PI / 2, 0, 0]);
    // iron bracket around the log + knot at the beam
    const bx = ax + L * sn;
    add(root, new THREE.BoxGeometry(30, RAD * 2 + 10, RAD * 2 + 10), "bracket", bx, Y(yc), 0);
    for (let k = 0; k < 4; k++) add(root, new THREE.BoxGeometry(24, 2.6, RAD * 2 + 14), "twist", bx, Y(yc - RAD + 12 + k * 22), 0, [0, 0, .25]);
    add(root, new THREE.SphereGeometry(10, 12, 8), "bracket", x0, Y(y0), 14);
  });
  // striker log (당목): long cylinder along x, domed tip towards the bell
  add(root, new THREE.CylinderGeometry(RAD, RAD * 1.06, LEN, 40), "log", tipx + LEN / 2, Y(yc), 0, [0, 0, Math.PI / 2]);
  add(root, new THREE.SphereGeometry(RAD, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), "log", tipx, Y(yc), 0, [0, 0, Math.PI / 2], [.5, 1, 1]);
  for (let k = 0; k < 3; k++) add(root, new THREE.TorusGeometry(RAD + 1, 2.4, 6, 40), "twist", tipx + 90 + k * 230, Y(yc), 0, [0, Math.PI / 2, 0]);
}

const root = new THREE.Group(); scene.add(root);
const frameParam = (t) => Math.round(t);
function renderAt(t) {
  while (root.children.length) root.remove(root.children[0]);
  if (CFG.layer === "bg") buildBG(root);
  else if (CFG.layer === "bell") buildBell(root);
  else if (CFG.layer === "log") { const i = frameParam(t); buildLog(root, (-12 + 42 * i / 14) * D2R); }
  renderer.render(scene, cam);
}
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
window.__worldRenderAt = renderAt; window.__worldReady = true;
renderAt(window.__hfThreeTime || 0);
