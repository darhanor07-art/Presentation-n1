/* =====================================================================
   x ≠ 0 · БІР СЫНЫП — 3D әлем (three.js r149)
   Бөлме, терезелер, парталар, тақта, сыртқы аула, кейіпкерлер,
   тәулік уақыты және post-processing (HDR → DOF + bloom + градация).
   fx.js осы ішкі API-ді (window.X12) пайдаланып ауысуларды құрады.
   ===================================================================== */
'use strict';
(() => {
const T = THREE;
T.ColorManagement.legacyMode = false;
const X = window.X12 = {T};
const PI = Math.PI, TAU = PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const bump = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
const E = {
  lin: t => t, o2: t => 1 - (1 - t) ** 2, o3: t => 1 - (1 - t) ** 3, i2: t => t * t, i3: t => t ** 3,
  io2: t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2, io3: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
  io5: t => t < .5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2, ioS: t => -(Math.cos(PI * t) - 1) / 2,
  oBack: t => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2,
};
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const col = h => new T.Color(h);
const V = (x, y, z) => new T.Vector3(x, y, z);
const PAL = {board: '#26443A', wood: '#C8925A', plaster: '#EFE4CF', brick: '#B9573A', sky: '#9CCBEA',
  ink: '#12161F', chalk: '#F5F0E6', yellow: '#F4C95D', coral: '#F28B6C', mint: '#8FD3B6'};
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => '#' + hx(a).map((v, i) => Math.round(lerp(v, hx(b)[i], t)).toString(16).padStart(2, '0')).join('');
Object.assign(X, {PI, TAU, clamp, lerp, ss, bump, E, rng, col, V, PAL, mixHex});

/* ---------------------------------------------------------------- материалдар, канвас */
const _mc = new Map();
function M(c, o = {}) {
  const k = c + '|' + JSON.stringify(o); let m = _mc.get(k);
  if (!m) { const p = {...o}; if (p.emissive) p.emissive = col(p.emissive);
    m = new T.MeshStandardMaterial({color: col(c), roughness: .78, metalness: 0, ...p}); _mc.set(k, m); }
  return m;
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function ctex(c, o = {}) { const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 8;
  if (o.rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(o.rep[0], o.rep[1]); }
  if (o.off) t.offset.set(o.off[0], o.off[1]); return t; }
const TM = (map, o = {}) => new T.MeshStandardMaterial({map, roughness: .8, metalness: 0, ...o});
X.M = M; X.canvas = canvas; X.ctex = ctex;

/* ---------------------------------------------------------------- геометрия */
const _rb = new Map();
function rbox(w, h, d, r) {   // жиектері дөңгеленген қорап (центрде, z бойымен экструзия)
  const k = [w, h, d, r].join(); if (_rb.has(k)) return _rb.get(k);
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const W_ = w - 2 * r, H_ = h - 2 * r, x = -W_ / 2, y = -H_ / 2, q = Math.min(r * .8, W_ / 2, H_ / 2);
  const s = new T.Shape();
  s.moveTo(x + q, y); s.lineTo(x + W_ - q, y); s.quadraticCurveTo(x + W_, y, x + W_, y + q); s.lineTo(x + W_, y + H_ - q);
  s.quadraticCurveTo(x + W_, y + H_, x + W_ - q, y + H_); s.lineTo(x + q, y + H_); s.quadraticCurveTo(x, y + H_, x, y + H_ - q);
  s.lineTo(x, y + q); s.quadraticCurveTo(x, y, x + q, y);
  const g = new T.ExtrudeGeometry(s, {depth: Math.max(1e-4, d - 2 * r), bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 2, curveSegments: 3, steps: 1});
  g.translate(0, 0, -(d - 2 * r) / 2); _rb.set(k, g); return g;
}
const GB = new T.BoxGeometry(1, 1, 1), GS = new T.SphereGeometry(1, 28, 18), GSL = new T.SphereGeometry(1, 14, 10),
  GC = new T.CylinderGeometry(1, 1, 1, 20), GCL = new T.CylinderGeometry(1, 1, 1, 8), GP = new T.PlaneGeometry(1, 1);
const _cap = new Map();
const cap = (r, l) => { const k = r + ',' + l; if (!_cap.has(k)) _cap.set(k, new T.CapsuleGeometry(r, l, 6, 14)); return _cap.get(k); };

const scene = X.scene = new T.Scene();
const cam = X.cam = new T.PerspectiveCamera(50, 16 / 9, .02, 1400);
const room = new T.Group(), STAT = new T.Group(), dyn = new T.Group();
scene.add(room, STAT, dyn);
function mesh(geo, mat, x, y, z, parent, o = {}) {
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z);
  if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]); if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false;
  (parent || STAT).add(m); return m;
}
const bx = (w, h, d, mat, x, y, z, parent, o = {}) => mesh(GB, mat, x, y, z, parent, {...o, s: [w, h, d]});
const rb = (w, h, d, r, mat, x, y, z, parent, o) => mesh(rbox(w, h, d, r), mat, x, y, z, parent, o);
const cyl = (r, h, mat, x, y, z, parent, o = {}) => mesh(o.lo ? GCL : GC, mat, x, y, z, parent, {...o, s: [r, h, r]});
X.mesh = mesh; X.bx = bx; X.rb = rb;

// статикалық объектілерді материалы бойынша біріктіру (draw call азаяды)
function mergeStatic() {
  STAT.updateMatrixWorld(true);
  const groups = new Map(), kill = [];
  STAT.traverse(o => { if (!o.isMesh) return; const k = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); kill.push(o); });
  const v = new T.Vector3(), nm = new T.Matrix3();
  for (const list of groups.values()) {
    let n = 0; const parts = list.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; n += g.attributes.position.count; return [o, g]; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let k = 0;
    for (const [o, g] of parts) {
      const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; nm.getNormalMatrix(o.matrixWorld);
      for (let i = 0; i < P.count; i++, k++) {
        v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
        v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[k * 3] = v.x; nor[k * 3 + 1] = v.y; nor[k * 3 + 2] = v.z;
        if (U) { uv[k * 2] = U.getX(i); uv[k * 2 + 1] = U.getY(i); }
      }
    }
    const G = new T.BufferGeometry(); G.setAttribute('position', new T.BufferAttribute(pos, 3));
    G.setAttribute('normal', new T.BufferAttribute(nor, 3)); G.setAttribute('uv', new T.BufferAttribute(uv, 2));
    G.computeBoundingSphere(); G.computeBoundingBox();
    const m = new T.Mesh(G, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow;
    room.add(m);
  }
  kill.forEach(o => o.parent.remove(o)); scene.remove(STAT);
}

/* ---------------------------------------------------------------- рендерер және post */
let R, W = 1600, H = 900, MSAA = 4;
const rt = X.rt = {};
const mk = (w, h, o) => new T.WebGLRenderTarget(Math.max(2, w | 0), Math.max(2, h | 0), Object.assign({minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false}, o));
function alloc() {
  Object.values(rt).forEach(r => r.dispose());
  const HF = T.HalfFloatType, w2 = W >> 1, h2 = H >> 1;
  rt.hdr = mk(W, H, {type: HF, depthBuffer: true, samples: MSAA}); rt.hdr.depthTexture = new T.DepthTexture(W, H, T.UnsignedIntType);   // 24-бит тереңдік
  rt.dep = mk(w2, h2, {type: HF, depthBuffer: true}); rt.dep.depthTexture = new T.DepthTexture(w2, h2, T.UnsignedIntType);
  rt.q1 = mk(w2, h2, {type: HF}); rt.q1b = mk(w2, h2, {type: HF});
  rt.q2 = mk(W >> 2, H >> 2, {type: HF}); rt.q2b = mk(W >> 2, H >> 2, {type: HF});
  rt.q3 = mk(W >> 3, H >> 3, {type: HF}); rt.q3b = mk(W >> 3, H >> 3, {type: HF});
  for (const k of ['A', 'B', 'C']) rt[k] = mk(W, H, {});
}
X.size = () => [W, H];
X.setSize = (w, h) => { W = w; H = h; R.setSize(w, h, false); alloc(); };
const VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const sm = X.sm = (fs, u) => new T.ShaderMaterial({vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false});
const fsScene = new T.Scene(), fsCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsQuad = new T.Mesh(new T.PlaneGeometry(2, 2));
fsQuad.frustumCulled = false; fsScene.add(fsQuad);
const pass = X.pass = (mat, target) => { fsQuad.material = mat; R.setRenderTarget(target); R.render(fsScene, fsCam); };
const mDown = sm(`uniform sampler2D t;uniform vec2 px;varying vec2 vUv;
void main(){vec3 c=texture2D(t,vUv+px*vec2(-1.,-1.)).rgb+texture2D(t,vUv+px*vec2(1.,-1.)).rgb+texture2D(t,vUv+px*vec2(-1.,1.)).rgb+texture2D(t,vUv+px*vec2(1.,1.)).rgb;
gl_FragColor=vec4(min(c*.25,vec3(48.)),1.);}`, {t: {value: null}, px: {value: new T.Vector2()}});
const mBlur = sm(`uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;
void main(){vec3 c=texture2D(t,vUv).rgb*.227027;c+=(texture2D(t,vUv+dir*1.384615).rgb+texture2D(t,vUv-dir*1.384615).rgb)*.316216;
c+=(texture2D(t,vUv+dir*3.230769).rgb+texture2D(t,vUv-dir*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}`, {t: {value: null}, dir: {value: new T.Vector2()}});
const down = (s, d) => { mDown.uniforms.t.value = s.texture; mDown.uniforms.px.value.set(1 / s.width, 1 / s.height); pass(mDown, d); };
const blur = (a, b, k = 1) => { mBlur.uniforms.t.value = a.texture; mBlur.uniforms.dir.value.set(k / a.width, 0); pass(mBlur, b);
  mBlur.uniforms.t.value = b.texture; mBlur.uniforms.dir.value.set(0, k / a.height); pass(mBlur, a); };
const PU = X.PU = {tC: {value: null}, tB1: {value: null}, tB2: {value: null}, tB3: {value: null}, tD: {value: null},
  uFocus: {value: 3}, uCoc: {value: 0}, uExpo: {value: 1}, uBloom: {value: .26}, uSat: {value: 1.05}, uVig: {value: .55},
  uLift: {value: V(0, 0, 0)}, uGain: {value: V(1, 1, 1)}, uGamma: {value: V(1, 1, 1)}, uTint: {value: V(1, 1, 1)}};
const mComp = sm(`uniform sampler2D tC,tB1,tB2,tB3,tD;uniform float uFocus,uCoc,uExpo,uBloom,uSat,uVig;uniform vec3 uLift,uGain,uGamma,uTint;varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
 vec3 c=texture2D(tC,vUv).rgb; float d=texture2D(tD,vUv).r;
 float k=clamp(abs(1./max(d,.03)-1./uFocus)*uCoc,0.,1.);
 vec3 b1=texture2D(tB1,vUv).rgb,b2=texture2D(tB2,vUv).rgb,b3=texture2D(tB3,vUv).rgb;
 c=mix(c,mix(b1,b2,smoothstep(.45,1.,k)),smoothstep(.0,.45,k));
 vec3 gl=b2*.4+b3*.6; c+=max(gl-.9,0.)*uBloom+gl*uBloom*.03;
 c*=uExpo*uTint; c=aces(c); c=pow(c,vec3(1./2.2));
 c=uGain*(c+uLift*(1.-c)); c=pow(max(c,0.),uGamma); c=mix(c,c*c*(3.-2.*c),.28);
 float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,uSat);
 vec2 q=vUv-.5; c*=1.-uVig*dot(q,q)*1.7;
 gl_FragColor=vec4(c,1.);}`, PU);
const depthMat = new T.ShaderMaterial({vertexShader: `varying float vD;
#include <common>
void main(){
#include <begin_vertex>
#include <project_vertex>
vD=-mvPosition.z;}`, fragmentShader: 'varying float vD;void main(){gl_FragColor=vec4(vD,0.,0.,1.);}'});
const NODEPTH = [];   // мөлдір объектілер тереңдік өтуінде жасырылады
const _cc = new T.Color();
X.renderShot = target => {          // ағымдағы камера мен күйден LDR кадр
  R.shadowMap.needsUpdate = true;
  R.setClearColor(0x000000, 1); R.setRenderTarget(rt.hdr); R.render(scene, cam);
  NODEPTH.forEach(o => { o.userData.v = o.visible; o.visible = false; });
  scene.overrideMaterial = depthMat; R.getClearColor(_cc); R.setClearColor(_cc.setRGB(900, 0, 0), 1);
  R.setRenderTarget(rt.dep); R.render(scene, cam); scene.overrideMaterial = null; R.setClearColor(0x000000, 1);
  NODEPTH.forEach(o => { o.visible = o.userData.v; });
  down(rt.hdr, rt.q1); blur(rt.q1, rt.q1b); down(rt.q1, rt.q2); blur(rt.q2, rt.q2b, 1.2); down(rt.q2, rt.q3); blur(rt.q3, rt.q3b, 1.6);
  PU.tC.value = rt.hdr.texture; PU.tB1.value = rt.q1.texture; PU.tB2.value = rt.q2.texture; PU.tB3.value = rt.q3.texture; PU.tD.value = rt.dep.texture;
  pass(mComp, target);
};
X.init3 = (cv, o = {}) => {
  R = X.R = new T.WebGLRenderer({canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserve});
  R.setPixelRatio(1); R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.shadowMap.autoUpdate = false;
  R.outputEncoding = T.LinearEncoding; R.toneMapping = T.NoToneMapping;
  if (o.msaa !== undefined) MSAA = o.msaa;
  sun.shadow.mapSize.set(o.shadow || 2048, o.shadow || 2048);
  X.setSize(o.w || 1600, o.h || 900);
};

/* ---------------------------------------------------------------- жарық және аспан */
const sun = new T.DirectionalLight(0xffffff, 3); sun.castShadow = true;
{ const c = sun.shadow.camera; c.left = -8; c.right = 8; c.top = 8; c.bottom = -8; c.near = 1; c.far = 50; }
sun.shadow.bias = -.0005; sun.shadow.normalBias = .025; sun.shadow.radius = 4;
scene.add(sun, sun.target);
const hemi = new T.HemisphereLight(0xffffff, 0x444444, .6); scene.add(hemi);
const lampA = new T.PointLight(0xFFE2B8, 0, 11, 1.3); lampA.position.set(-1.2, 2.85, -1.1);
const lampB = new T.PointLight(0xFFE2B8, 0, 11, 1.3); lampB.position.set(1.4, 2.85, 1.6);
const bounce = new T.PointLight(0xFFD9B0, 0, 8, 1.5); bounce.position.set(-2.6, .55, -.2);
const deskLight = new T.PointLight(0xFFC58A, 0, 1.8, 2); deskLight.position.set(-2.62, .36, .5);
scene.add(lampA, lampB, bounce, deskLight);
const skyU = {top: {value: col('#6EA6D8')}, hor: {value: col('#CFE4F2')}, gnd: {value: col('#9A8F84')}, sunDir: {value: V(-1, .4, 0).normalize()},
  sunCol: {value: col('#FFE9CF')}, stars: {value: 0}, time: {value: 0}};
const sky = new T.Mesh(new T.SphereGeometry(1000, 40, 20), new T.ShaderMaterial({side: T.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `uniform vec3 top,hor,gnd,sunDir,sunCol;uniform float stars,time;varying vec3 vP;
float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
void main(){vec3 d=normalize(vP);float y=d.y;
 vec3 c=mix(hor,top,pow(clamp(y,0.,1.),.5)); c=mix(c,gnd,smoothstep(.0,-.06,y));
 float s=max(dot(d,normalize(sunDir)),0.);
 c+=sunCol*(pow(s,6.)*.4+pow(s,90.)*1.2+pow(s,1800.)*40.)*smoothstep(-.12,.04,sunDir.y);
 if(stars>0.&&y>0.){vec3 q=floor(d*420.);float st=step(.9972,h(q));float tw=.55+.45*sin(time*2.6+h(q+1.)*60.);c+=vec3(1.,.95,.85)*st*tw*stars*2.*smoothstep(0.,.2,y);}
 gl_FragColor=vec4(c,1.);}`}));
sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
scene.fog = new T.Fog(0xCFE4F2, 40, 340);

// тәулік уақыты: 0 таң · .2 таңертең · .7 кеш · .82 күн бату · .9 ымырт · 1 түн
const TOD = [
  {t: 0, el: 3, az: 196, sun: '#FF8A62', sI: .2, top: '#27304C', hor: '#B98289', gnd: '#3E3436', hs: '#5E6A92', hg: '#2E2830', hI: .28, lamps: 0, expo: 1.05, stars: .7, fog: '#7A6E86', win: .05,
   lift: [.02, .015, .045], gain: [1, .95, 1.02], sat: .9, skyEl: -2, skyAz: 196},
  {t: .08, el: 8, az: 200, sun: '#FFB07A', sI: 2.2, top: '#557AB0', hor: '#F2B497', gnd: '#6E5C55', hs: '#9DB0D4', hg: '#6B5A50', hI: .5, lamps: 0, expo: 1, stars: 0, fog: '#D8B4A6', win: .25,
   lift: [.02, .012, .03], gain: [1.04, .98, .96], sat: 1.05, skyEl: 6, skyAz: 200},
  {t: .2, el: 27, az: 208, sun: '#FFEAD2', sI: 3.1, top: '#6CA4D6', hor: '#D3E6F3', gnd: '#9A8F84', hs: '#BBD8EE', hg: '#8F7764', hI: .72, lamps: .22, expo: 1, stars: 0, fog: '#CFE4F2', win: .4,
   lift: [.004, .006, .014], gain: [1.03, 1.0, .96], sat: 1.08, skyEl: 27, skyAz: 208},
  {t: .7, el: 11, az: 214, sun: '#FFC889', sI: 2.8, top: '#6A92C4', hor: '#F2D2A6', gnd: '#8E7A68', hs: '#B2C2D8', hg: '#8A6A50', hI: .55, lamps: .45, expo: 1.02, stars: 0, fog: '#E8CFAE', win: .35,
   lift: [.01, .006, .012], gain: [1.07, .98, .88], sat: 1.12, skyEl: 11, skyAz: 214},
  {t: .82, el: 6, az: 206, sun: '#FF9752', sI: 2.6, top: '#56679F', hor: '#F5A468', gnd: '#6E5446', hs: '#9AA0C2', hg: '#74503F', hI: .45, lamps: .7, expo: 1.06, stars: 0, fog: '#E4A87E', win: .2,
   lift: [.025, .01, .03], gain: [1.08, .96, .86], sat: 1.12, skyEl: 4.5, skyAz: 206},
  {t: .9, el: 2, az: 200, sun: '#C07A8A', sI: .15, top: '#26305E', hor: '#A86A74', gnd: '#2C2632', hs: '#4E5888', hg: '#2E2836', hI: .32, lamps: 1, expo: 1.12, stars: .25, fog: '#5E5270', win: 0,
   lift: [.02, .015, .05], gain: [.98, .96, 1.04], sat: 1, skyEl: -4, skyAz: 248},
  {t: 1, el: 42, az: 118, sun: '#7E90C8', sI: .32, top: '#080D1E', hor: '#1C2846', gnd: '#101018', hs: '#202B52', hg: '#121218', hI: .2, lamps: 1, expo: 1.18, stars: 1, fog: '#141B30', win: 0,
   lift: [.01, .02, .05], gain: [.92, .97, 1.08], sat: .95, skyEl: -20, skyAz: 250},
];
const _ca = new T.Color(), _cb = new T.Color();
const lc = (a, b, t) => _ca.set(a).lerp(_cb.set(b), t).clone();
const lv = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
let TODNOW = null;
X.tod = t => {
  let i = 0; while (i < TOD.length - 2 && t > TOD[i + 1].t) i++;
  const A = TOD[i], B = TOD[i + 1], k = clamp((t - A.t) / (B.t - A.t));
  const o = {t, el: lerp(A.el, B.el, k), az: lerp(A.az, B.az, k), sI: lerp(A.sI, B.sI, k), hI: lerp(A.hI, B.hI, k), lamps: lerp(A.lamps, B.lamps, k),
    expo: lerp(A.expo, B.expo, k), stars: lerp(A.stars || 0, B.stars || 0, k), win: lerp(A.win, B.win, k), sat: lerp(A.sat, B.sat, k),
    lift: lv(A.lift, B.lift, k), gain: lv(A.gain, B.gain, k), skyEl: lerp(A.skyEl, B.skyEl, k), skyAz: lerp(A.skyAz, B.skyAz, k)};
  for (const c of ['sun', 'top', 'hor', 'gnd', 'hs', 'hg', 'fog']) o[c] = lc(A[c], B[c], k);
  return o;
};
const dirOf = (el, az) => { el *= PI / 180; az *= PI / 180; return V(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)); };
let shaftsDirty = true; const lastSun = V();
function applyTod(o) {
  TODNOW = o;
  const d = dirOf(o.el, o.az);
  sun.target.position.set(-.5, 1, 0); sun.position.copy(sun.target.position).addScaledVector(d, 24);
  sun.color.copy(o.sun); sun.intensity = o.sI;
  if (d.distanceTo(lastSun) > 1e-3) { lastSun.copy(d); shaftsDirty = true; }
  hemi.color.copy(o.hs); hemi.groundColor.copy(o.hg); hemi.intensity = o.hI;
  skyU.top.value.copy(o.top); skyU.hor.value.copy(o.hor); skyU.gnd.value.copy(o.gnd); skyU.sunDir.value.copy(dirOf(o.skyEl, o.skyAz));
  skyU.sunCol.value.copy(o.sun).multiplyScalar(o.skyEl > -3 ? 1 : 0); skyU.stars.value = o.stars;
  scene.fog.color.copy(o.fog);
  lampA.intensity = lampB.intensity = o.lamps * 1.25;
  LAMPMAT.emissiveIntensity = .3 + o.lamps * 2.6;
  bounce.intensity = o.sI * (o.el > 0 ? .55 : 0);
  WINGLASS.emissiveIntensity = o.win; STREETMAT.emissiveIntensity = o.t > .86 ? 6 * ss(.86, .95, o.t) : 0;
  PU.uLift.value.set(...o.lift); PU.uGain.value.set(...o.gain); PU.uSat.value = o.sat;
  setShafts(o);
}
X.applyTod = applyTod;

/* ---------------------------------------------------------------- шрифт күттіру, кескіндер */
X.loadAssets = async (IMG) => {
  const probe = 'Әә Ғғ Ққ Ңң Өө Ұұ Үү Һһ Іі 0123456789 +−=?';
  await Promise.all(['600 60px Caveat', '700 60px Caveat', '400 60px Rubik', '600 60px Rubik', '800 60px Rubik'].map(f => document.fonts.load(f, probe).catch(() => 0)));
  await document.fonts.ready;
  X.imgs = {};
  await Promise.all(Object.entries(IMG || {}).map(([k, src]) => new Promise(res => { const im = new Image(); im.onload = () => { X.imgs[k] = im; res(); }; im.onerror = res; im.src = src; })));
};

/* =====================================================================
   КАНВАС ТЕКСТУРАЛАРЫ
   ===================================================================== */
const CHALK = 'rgba(245,240,230,.94)', CYEL = 'rgba(244,201,93,.97)', CCOR = 'rgba(242,139,108,.97)', CMIN = 'rgba(143,211,182,.97)';
function chalkText(g, txt, x, y, size, color = CHALK, reveal = 1, align = 'left', font = 'Caveat', weight = 700) {
  if (reveal <= 0) return 0;
  g.save(); g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'alphabetic';
  const w = g.measureText(txt).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  if (reveal < 1) { g.beginPath(); g.rect(x0 - 12, y - size * 1.3, (w + 24) * reveal, size * 1.8); g.clip(); }
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 2.5; g.fillText(txt, x, y); g.restore(); return w;
}
function chalkPath(g, pts, color = CHALK, w = 7, reveal = 1, close = false) {   // бормен сызылған сынық сызық
  if (reveal <= 0) return;
  const P = close ? [...pts, pts[0]] : pts; let L = 0; const seg = [];
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); L += l; }
  let rem = L * reveal; g.save(); g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = color; g.shadowBlur = 2;
  g.beginPath(); g.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length && rem > 0; i++) { const f = Math.min(1, rem / seg[i - 1]); g.lineTo(lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f)); rem -= seg[i - 1]; }
  g.stroke(); g.restore();
}
const circlePts = (cx, cy, r, n = 48, a0 = -PI / 2) => Array.from({length: n + 1}, (_, i) => [cx + r * Math.cos(a0 + i / n * TAU), cy + r * Math.sin(a0 + i / n * TAU)]);
function speckle(g, w, h, color, n, seed) { const r = rng(seed); g.save(); g.fillStyle = color;
  for (let i = 0; i < n; i++) { g.globalAlpha = .18 + r() * .3; const s = 1 + r() * 2.2; g.fillRect(r() * w, r() * h, s, s); } g.restore(); }
X.chalkText = chalkText; X.chalkPath = chalkPath; X.circlePts = circlePts;

function floorCanvas() {
  const c = canvas(2048, 2048), g = c.getContext('2d'), r = rng(7), sx = 2048 / 9, sz = 2048 / 8, pw = .15 * sz;
  g.fillStyle = PAL.wood; g.fillRect(0, 0, 2048, 2048);
  for (let y = 0; y < 2048; y += pw) {
    let x = -r() * 300;
    while (x < 2048) { const len = (1.1 + r() * 1.5) * sx;
      g.fillStyle = mixHex('#B57E4C', '#D7A66F', r()); g.fillRect(x, y, len, pw);
      g.globalAlpha = .1; g.strokeStyle = '#7E5230'; g.lineWidth = 1.2;
      for (let k = 0; k < 6; k++) { const yy = y + 3 + r() * (pw - 6); g.beginPath(); g.moveTo(x, yy);
        g.bezierCurveTo(x + len * .3, yy + (r() - .5) * 7, x + len * .6, yy + (r() - .5) * 7, x + len, yy + (r() - .5) * 5); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = 'rgba(70,40,18,.4)'; g.fillRect(x, y, 2, pw); x += len; }
    g.fillStyle = 'rgba(70,40,18,.32)'; g.fillRect(0, y, 2048, 2);
  }
  const ao = (x0, y0, x1, y1, a) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(45,28,14,${a})`); gr.addColorStop(1, 'rgba(45,28,14,0)'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 2048); };
  ao(0, 0, .45 * sx, 0, .45); ao(2048, 0, 2048 - .45 * sx, 0, .4); ao(0, 0, 0, .45 * sz, .4); ao(0, 2048, 0, 2048 - .45 * sz, .4);
  return c;
}
const WAIN = mixHex(PAL.sky, PAL.plaster, .3);
function wallCanvas(wm, hm, seed) {
  const ppm = 200, c = canvas(Math.round(wm * ppm), Math.round(hm * ppm)), g = c.getContext('2d'), w = c.width, h = c.height, Y = m => h - m * ppm;
  g.fillStyle = PAL.plaster; g.fillRect(0, 0, w, h); speckle(g, w, h, '#D8CBB2', 5000, seed);
  g.fillStyle = WAIN; g.fillRect(0, Y(.95), w, .95 * ppm); speckle(g, w, .95 * ppm, '#8FB4CB', 1500, seed + 1);
  g.fillStyle = '#B98250'; g.fillRect(0, Y(1.0), w, .055 * ppm); g.fillStyle = 'rgba(255,240,210,.35)'; g.fillRect(0, Y(1.0), w, 3);
  g.fillStyle = '#7A5536'; g.fillRect(0, Y(.1), w, .1 * ppm); g.fillStyle = 'rgba(255,230,200,.25)'; g.fillRect(0, Y(.1), w, 2);
  const ao = (x0, y0, x1, y1, a) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(50,36,26,${a})`); gr.addColorStop(1, 'rgba(50,36,26,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); };
  ao(0, 0, 0, .45 * ppm, .32); ao(0, h, 0, h - .3 * ppm, .3); ao(0, 0, .5 * ppm, 0, .26); ao(w, 0, w - .5 * ppm, 0, .26);
  return c;
}

/* ---------------------------------------------------------------- бөлме */
const ROOM = {x0: -4.5, x1: 4.5, z0: -4, z1: 4, h: 3.2};
const WINZ = [-2.6, -.2, 2.2], WIN = {w: 1.6, y0: .95, y1: 2.55};
const floorMat = TM(ctex(floorCanvas()), {roughness: .62});
mesh(GP, floorMat, 0, 0, 0, room, {r: [-PI / 2, 0, 0], s: [9, 8, 1], cast: false});
const wallMat = (wm, seed) => TM(ctex(wallCanvas(wm, 3.2, seed)), {roughness: .92});
mesh(GP, wallMat(9, 21), 0, 1.6, -4, room, {s: [9, 3.2, 1]});                               // алдыңғы қабырға
mesh(GP, wallMat(9, 22), 0, 1.6, 4, room, {r: [0, PI, 0], s: [9, 3.2, 1]});                 // артқы
mesh(GP, wallMat(8, 23), 4.5, 1.6, 0, room, {r: [0, -PI / 2, 0], s: [8, 3.2, 1]});          // оң
{ // сол қабырға: терезе ойықтары бар қалың қабырға
  const s = new T.Shape(); s.moveTo(-4, 0); s.lineTo(4, 0); s.lineTo(4, 3.2); s.lineTo(-4, 3.2); s.lineTo(-4, 0);
  for (const z of WINZ) { const p = new T.Path(); p.moveTo(z - .8, WIN.y0); p.lineTo(z - .8, WIN.y1); p.lineTo(z + .8, WIN.y1); p.lineTo(z + .8, WIN.y0); p.lineTo(z - .8, WIN.y0); s.holes.push(p); }
  const g = new T.ExtrudeGeometry(s, {depth: .3, bevelEnabled: false, curveSegments: 1});
  const t = ctex(wallCanvas(8, 3.2, 24)); t.repeat.set(1 / 8, 1 / 3.2); t.offset.set(.5, 0); t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
  const m = new T.Mesh(g, [TM(t, {roughness: .92}), M('#E7DAC2', {roughness: .9})]); m.rotation.y = -PI / 2; m.position.set(-4.5, 0, 0);
  m.castShadow = m.receiveShadow = true; room.add(m);
}
{ // төбе
  const c = canvas(1024, 1024), g = c.getContext('2d'); g.fillStyle = '#F3ECDD'; g.fillRect(0, 0, 1024, 1024);
  const gr = g.createRadialGradient(512, 512, 200, 512, 512, 760); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,45,30,.35)'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  mesh(GP, TM(ctex(c), {roughness: .95}), 0, 3.2, 0, room, {r: [PI / 2, 0, 0], s: [9, 8, 1]});
}
const LAMPMAT = new T.MeshStandardMaterial({color: col('#FFF6E6'), emissive: col('#FFE8C4'), emissiveIntensity: 1, roughness: .5});
for (const x of [-2.4, .2, 2.8]) for (const z of [-1.6, 1.4]) { rb(1.15, .06, .32, .02, M('#E6DED0'), x, 3.17, z); bx(1.05, .012, .24, LAMPMAT, x, 3.135, z, null, {cast: false}); }

/* ---------------------------------------------------------------- терезелер */
const FRAME = M('#F2EEE6', {roughness: .5}), SILL = M('#D9B88E', {roughness: .55}), GLASS = new T.MeshBasicMaterial({color: col('#CFE6F5'), transparent: true, opacity: .07, depthWrite: false, side: T.DoubleSide});
const openCasement = new T.Group(); room.add(openCasement);
for (const z of WINZ) {
  const yc = (WIN.y0 + WIN.y1) / 2, hh = WIN.y1 - WIN.y0;
  for (const [dz, dy, w, h] of [[0, WIN.y1 - .03 - yc, 1.6, .06], [0, WIN.y0 + .03 - yc, 1.6, .06], [-.77, 0, .06, hh], [.77, 0, .06, hh], [0, .34, 1.6, .05]])
    bx(.12, h, w, FRAME, -4.62, yc + dy, z + dz);
  bx(.08, hh - .1, .05, FRAME, -4.62, yc, z);
  rb(.34, .05, 1.78, .015, SILL, -4.38, WIN.y0 - .02, z);                           // ішкі терезе алды
  bx(.2, .03, 1.75, M('#9A9C9E', {roughness: .4, metalness: .4}), -4.9, WIN.y0 - .03, z);  // сыртқы
  const gl = mesh(GP, GLASS, -4.66, yc + .12, z - (z === 2.2 ? .4 : 0), room, {r: [0, PI / 2, 0], s: [z === 2.2 ? .76 : 1.5, hh - .4, 1], cast: false, recv: false});
  NODEPTH.push(gl);
  if (z !== 2.2) { const gl2 = mesh(GP, GLASS, -4.66, yc - .2 + .17, z, room, {r: [0, PI / 2, 0], s: [1.5, .28, 1], cast: false, recv: false}); NODEPTH.push(gl2); }
  // радиатор
  const rad = M('#EDEBE6', {roughness: .45});
  for (let k = 0; k < 11; k++) bx(.07, .5, .06, rad, -4.38, .45, z - .55 + k * .11);
  bx(.05, .04, 1.2, M('#CFCAC0'), -4.36, .2, z);
  // перде (бүйірге жиналған)
  for (const s of [-1, 1]) { const cz = z + s * .98;
    for (let k = 0; k < 4; k++) mesh(GCL, M(k % 2 ? PAL.coral : mixHex(PAL.coral, PAL.brick, .35), {roughness: .95}), -4.36 + (k % 2) * .03, 1.85, cz + (k - 1.5) * .055, null, {s: [.035, 2.05, .035]});
    bx(.04, .06, .3, M(PAL.yellow), -4.33, 1.55, cz); }
  // гүлдер
  const pot = M(PAL.brick, {roughness: .7}), leaf = M(mixHex(PAL.board, PAL.mint, .45), {roughness: .8, flatShading: true}), leaf2 = M(mixHex(PAL.board, PAL.mint, .7), {roughness: .8, flatShading: true});
  for (const dz of z === 2.2 ? [-.5] : z === -.2 ? [-.62] : [-.45, .5]) {
    mesh(new T.CylinderGeometry(.075, .055, .13, 16), pot, -4.36, WIN.y0 + .07, z + dz);
    const r_ = rng(Math.round(z * 10 + dz * 7 + 50));
    for (let k = 0; k < 5; k++) mesh(new T.IcosahedronGeometry(.07 + r_() * .04, 0), k % 2 ? leaf : leaf2, -4.36 + (r_() - .5) * .08, WIN.y0 + .2 + r_() * .14, z + dz + (r_() - .5) * .12);
  }
}
{ // ашық терезе жармасы (камера осы арқылы ұшып кіреді)
  const g = openCasement; g.position.set(-4.78, (WIN.y0 + WIN.y1) / 2, 3.0);
  const hh = WIN.y1 - WIN.y0 - .12;
  bx(.05, hh, .05, FRAME, 0, 0, -.025, g); bx(.05, hh, .05, FRAME, 0, 0, -.755, g); bx(.05, .05, .78, FRAME, 0, hh / 2, -.39, g); bx(.05, .05, .78, FRAME, 0, -hh / 2, -.39, g);
  const gl = mesh(GP, GLASS, 0, 0, -.39, g, {r: [0, PI / 2, 0], s: [.72, hh - .05, 1], cast: false, recv: false}); NODEPTH.push(gl);
  g.rotation.y = 1.3;
}

/* ---------------------------------------------------------------- тақта, сан түзуі, сағат */
const BOARD = X.BOARD = {c: canvas(2048, 614), key: ''};
BOARD.g = BOARD.c.getContext('2d'); BOARD.tex = ctex(BOARD.c);
rb(4.18, 1.36, .06, .015, M('#A7764A', {roughness: .6}), 0, 1.5, -3.975);
mesh(GP, new T.MeshStandardMaterial({map: BOARD.tex, roughness: .9}), 0, 1.5, -3.94, room, {s: [4, 1.2, 1], cast: false});
rb(4.1, .05, .12, .015, M('#A7764A', {roughness: .6}), 0, .88, -3.89);
for (const [x, c] of [[-1.5, '#F5F0E6'], [-1.4, '#F4C95D'], [-1.32, '#F5F0E6'], [1.2, '#F28B6C']]) mesh(GC, M(c, {roughness: .9}), x, .918, -3.88, null, {r: [0, 0, PI / 2], s: [.009, .08, .009]});
rb(.16, .045, .065, .01, M('#C8925A'), 1.55, .93, -3.88); bx(.15, .015, .06, M('#3A3A3A'), 1.55, .9, -3.88);
const NL = X.NL = {c: canvas(2048, 112), key: ''}; NL.g = NL.c.getContext('2d'); NL.tex = ctex(NL.c);
rb(4.7, .3, .03, .008, M('#A7764A'), 0, 2.43, -3.98);
mesh(GP, new T.MeshStandardMaterial({map: NL.tex, roughness: .85}), 0, 2.43, -3.96, room, {s: [4.6, .25, 1], cast: false});
// сағат
const CLOCK = new T.Group(); CLOCK.position.set(3.0, 2.55, -3.96); room.add(CLOCK);
{ const c = canvas(512, 512), g = c.getContext('2d'); g.fillStyle = '#FBF8F1'; g.beginPath(); g.arc(256, 256, 250, 0, TAU); g.fill();
  g.fillStyle = PAL.ink; g.font = '600 62px Rubik'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU; g.fillText(String(i), 256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190); }
  for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r0 = i % 5 ? 232 : 220; g.lineWidth = i % 5 ? 3 : 7; g.strokeStyle = PAL.ink;
    g.beginPath(); g.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); g.lineTo(256 + Math.sin(a) * 244, 256 - Math.cos(a) * 244); g.stroke(); }
  CLOCK.userData.face = c;
  mesh(new T.CircleGeometry(.24, 48), new T.MeshStandardMaterial({map: ctex(c), roughness: .5}), 0, 0, .012, CLOCK, {cast: false});
  mesh(new T.TorusGeometry(.25, .025, 12, 48), M('#A7764A', {roughness: .5}), 0, 0, .012, CLOCK);
  mesh(new T.CylinderGeometry(.26, .26, .03, 40), M('#E8E1D3'), 0, 0, -.005, CLOCK, {r: [PI / 2, 0, 0]});
  const hand = (w, l, c_, z) => { const p = new T.Group(); p.position.z = z; CLOCK.add(p); const m = new T.Mesh(GB, M(c_, {roughness: .4})); m.scale.set(w, l, .006); m.position.y = l / 2 - .02; m.castShadow = true; p.add(m); return p; };
  CLOCK.userData.h = hand(.018, .13, PAL.ink, .02); CLOCK.userData.m = hand(.012, .19, PAL.ink, .026); CLOCK.userData.s = hand(.005, .2, PAL.brick, .032);
  mesh(GS, M(PAL.brick), 0, 0, .036, CLOCK, {s: [.014, .014, .01]});
}
X.setClock = (min, sec) => { const u = CLOCK.userData; u.h.rotation.z = -(min / 720) * TAU; u.m.rotation.z = -(min / 60) * TAU; u.s.rotation.z = -Math.floor(sec) / 60 * TAU; };

/* ---------------------------------------------------------------- плакаттар, портрет, есік, сөрелер */
function poster(kind) {
  const c = canvas(512, 704), g = c.getContext('2d');
  const bgc = {shapes: PAL.sky, nums: PAL.yellow, ten: PAL.mint, signs: PAL.coral, clock: mixHex(PAL.sky, PAL.plaster, .5), line: mixHex(PAL.yellow, PAL.plaster, .4)}[kind];
  g.fillStyle = bgc; g.fillRect(0, 0, 512, 704); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(24, 24, 464, 656);
  g.fillStyle = PAL.ink; g.font = '800 54px Rubik'; g.textAlign = 'center';
  const title = {shapes: 'Фигуралар', nums: 'Сандар', ten: 'Ондық', signs: 'Белгілер', clock: 'Уақыт', line: 'Сан түзуі'}[kind];
  g.fillText(title, 256, 104);
  g.lineWidth = 10; g.lineJoin = 'round';
  if (kind === 'shapes') { g.fillStyle = PAL.yellow; g.beginPath(); g.arc(150, 250, 80, 0, TAU); g.fill(); g.fillStyle = PAL.coral; g.beginPath(); g.moveTo(360, 170); g.lineTo(450, 330); g.lineTo(270, 330); g.fill();
    g.fillStyle = PAL.mint; g.fillRect(170, 400, 170, 170); g.fillStyle = PAL.ink; g.font = '600 34px Rubik'; g.fillText('шеңбер', 150, 372); g.fillText('үшбұрыш', 360, 372); g.fillText('шаршы', 255, 622); }
  if (kind === 'nums') { g.font = '700 50px Rubik'; for (let i = 1; i <= 20; i++) { const cx = 96 + ((i - 1) % 4) * 107, cy = 190 + Math.floor((i - 1) / 4) * 98;
    g.fillStyle = [PAL.coral, PAL.sky, PAL.mint, PAL.yellow][(i - 1) % 4]; g.beginPath(); g.arc(cx, cy - 16, 42, 0, TAU); g.fill(); g.fillStyle = PAL.ink; g.fillText(String(i), cx, cy); } }
  if (kind === 'ten') { for (let i = 0; i < 10; i++) { const cx = 96 + (i % 5) * 80, cy = 230 + Math.floor(i / 5) * 90; g.strokeStyle = PAL.ink; g.lineWidth = 5; g.strokeRect(cx - 38, cy - 42, 76, 84);
      if (i < 7) { g.fillStyle = PAL.brick; g.beginPath(); g.arc(cx, cy, 28, 0, TAU); g.fill(); } else { g.fillStyle = PAL.yellow; g.beginPath(); g.arc(cx, cy, 28, 0, TAU); g.fill(); } }
    g.fillStyle = PAL.ink; g.font = '800 70px Rubik'; g.fillText('7 + 3 = 10', 256, 470); g.font = '600 44px Rubik'; g.fillText('10 + 2 = 12', 256, 560); }
  if (kind === 'signs') { g.font = '800 120px Rubik'; [['+', 150, 260], ['−', 362, 260], ['=', 150, 450], ['>', 362, 450], ['<', 256, 620]].forEach(([s, x, y], i) => { g.fillStyle = [PAL.brick, PAL.board, PAL.ink, PAL.brick, PAL.board][i]; g.fillText(s, x, y); }); }
  if (kind === 'clock') { g.strokeStyle = PAL.ink; g.lineWidth = 9; g.beginPath(); g.arc(256, 360, 170, 0, TAU); g.stroke(); g.lineWidth = 12; g.beginPath(); g.moveTo(256, 360); g.lineTo(256, 240); g.moveTo(256, 360); g.lineTo(340, 400); g.stroke();
    g.font = '600 40px Rubik'; g.fillStyle = PAL.ink; for (const [n, a] of [[12, 0], [3, 1], [6, 2], [9, 3]]) g.fillText(String(n), 256 + Math.sin(a * PI / 2) * 135, 374 - Math.cos(a * PI / 2) * 135); }
  if (kind === 'line') { g.strokeStyle = PAL.ink; g.lineWidth = 6; g.beginPath(); g.moveTo(50, 420); g.lineTo(462, 420); g.stroke(); g.font = '600 32px Rubik'; g.fillStyle = PAL.ink;
    for (let i = 0; i <= 10; i++) { const x = 60 + i * 39; g.beginPath(); g.moveTo(x, 404); g.lineTo(x, 436); g.stroke(); g.fillText(String(i), x, 478); }
    g.strokeStyle = PAL.brick; g.lineWidth = 6; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(60 + (4 + k) * 39 + 19.5, 410, 19.5, PI, 0); g.stroke(); } g.fillStyle = PAL.ink; g.font = '800 64px Rubik'; g.fillText('4 + 3 = 7', 256, 300); }
  return c;
}
{ const kinds = ['shapes', 'nums', 'ten', 'signs', 'clock', 'line'];
  kinds.forEach((k, i) => { const x = -3.35 + i * 1.34;
    rb(.68, .9, .02, .006, M('#A7764A'), x, 1.78, 3.985);
    mesh(GP, new T.MeshStandardMaterial({map: ctex(poster(k)), roughness: .7}), x, 1.78, 3.972, room, {r: [0, PI, 0], s: [.62, .84, 1], cast: false}); }); }
// артқы қабырға: сөрелер, сөмкелер
{ const shelf = M('#D9B88E', {roughness: .6});
  rb(3.6, .9, .38, .02, shelf, -2.3, .45, 3.78);
  for (let k = 0; k < 6; k++) { const x = -3.85 + k * .62; rb(.52, .32, .3, .03, M([PAL.sky, PAL.yellow, PAL.mint, PAL.coral, PAL.sky, PAL.mint][k], {roughness: .7}), x, .3, 3.52);
    rb(.52, .3, .3, .03, M([PAL.coral, PAL.mint, PAL.yellow, PAL.sky, PAL.yellow, PAL.coral][k], {roughness: .7}), x, .66, 3.52); }
  const r_ = rng(31);
  for (let k = 0; k < 9; k++) { const x = .6 + k * .42; bx(.05, .05, .08, M('#7A7A7A', {metalness: .5, roughness: .4}), x, 1.32, 3.96);
    const bc = [PAL.coral, PAL.board, PAL.sky, PAL.yellow, PAL.brick, PAL.mint, PAL.coral, PAL.sky, PAL.board][k];
    rb(.3, .38, .16, .06, M(bc, {roughness: .85}), x + (r_() - .5) * .03, 1.06, 3.9, null, {r: [0, 0, (r_() - .5) * .1]});
    rb(.2, .14, .05, .03, M(mixHex(bc, '#000000', .2), {roughness: .85}), x, .98, 3.81); }
  bx(4.2, .04, .12, M('#B98250'), 2.3, 1.36, 3.94);
}
// оң қабырға: есік, портрет, рамалар, кітап сөресі
{ rb(1.05, 2.15, .08, .02, M('#A7764A'), 4.46, 1.075, -2.75, null, {r: [0, PI / 2, 0]});
  rb(.95, 2.05, .05, .015, M(PAL.wood, {roughness: .55}), 4.43, 1.03, -2.75, null, {r: [0, PI / 2, 0]});
  mesh(GS, M('#C9C2B4', {metalness: .7, roughness: .3}), 4.38, 1.0, -2.38, null, {s: [.03, .03, .03]});
  bx(.02, .5, .3, M(PAL.plaster), 4.41, 1.6, -2.75);
  // Роуз портреті (кескін кейін X.mountPortrait-та қойылады)
  rb(.72, .9, .05, .012, M('#8E6440', {roughness: .5}), 4.465, 1.75, .45, null, {r: [0, PI / 2, 0]});
  mesh(GP, M('#F3ECDD'), 4.437, 1.75, .45, null, {r: [0, -PI / 2, 0], s: [.62, .8, 1], cast: false});
  const pl = canvas(512, 96), pg = pl.getContext('2d'); pg.fillStyle = '#C9A26A'; pg.fillRect(0, 0, 512, 96); pg.fillStyle = PAL.ink; pg.font = '700 44px Rubik'; pg.textAlign = 'center'; pg.fillText('Дэвид Роуз · UDL', 256, 62);
  mesh(GP, new T.MeshStandardMaterial({map: ctex(pl), roughness: .4, metalness: .3}), 4.44, 1.205, .45, room, {r: [0, -PI / 2, 0], s: [.32, .06, 1], cast: false});
  for (const [z, k] of [[-.95, 'shapes'], [1.85, 'ten']]) { rb(.52, .68, .04, .01, M('#8E6440'), 4.47, 1.75, z, null, {r: [0, PI / 2, 0]});
    mesh(GP, new T.MeshStandardMaterial({map: ctex(poster(k === 'shapes' ? 'line' : 'nums')), roughness: .7}), 4.445, 1.75, z, room, {r: [0, -PI / 2, 0], s: [.44, .6, 1], cast: false}); }
  // кітап сөресі
  rb(.4, 1.6, 1.2, .02, M('#B98250'), 4.28, .8, 3.0);
  const r_ = rng(41);
  for (let s = 0; s < 3; s++) for (let k = 0; k < 9; k++) { const hgt = .2 + r_() * .1;
    bx(.22, hgt, .08, M([PAL.coral, PAL.board, PAL.sky, PAL.yellow, PAL.brick, PAL.mint][(k + s) % 6], {roughness: .8}), 4.2, .22 + s * .5 + hgt / 2, 2.55 + k * .11); }
}
// алдыңғы қабырға: пробка тақта
{ rb(.9, .7, .03, .01, M('#A7764A'), -3.4, 1.7, -3.98); bx(.82, .62, .01, M('#C49A68', {roughness: 1}), -3.4, 1.7, -3.96);
  const r_ = rng(51); for (let k = 0; k < 6; k++) bx(.18, .2, .004, M([PAL.yellow, PAL.mint, PAL.coral, PAL.sky, PAL.chalk, PAL.yellow][k]), -3.7 + (k % 3) * .29, 1.82 - Math.floor(k / 3) * .26, -3.952, null, {r: [0, 0, (r_() - .5) * .3]});
  rb(.6, 1.9, .45, .02, M('#D9B88E'), 4.05, .95, -3.7);
}

/* ---------------------------------------------------------------- парталар */
const COLS = [-2.4, .2, 2.8], ROWS = [-1.4, .4, 2.2], DESK_Y = .62;
const deskWood = M(PAL.wood, {roughness: .55}), metal = M('#3A3F48', {roughness: .45, metalness: .55}), chairWood = M('#D6A570', {roughness: .55});
function desk(x, z) {
  rb(1.24, .04, .52, .012, deskWood, x, DESK_Y - .02, z);
  rb(1.16, .02, .36, .008, M('#B98250', {roughness: .6}), x, DESK_Y - .14, z - .07);
  for (const sx of [-1, 1]) { bx(.03, DESK_Y - .04, .03, metal, x + sx * .57, (DESK_Y - .04) / 2, z - .22); bx(.03, DESK_Y - .04, .03, metal, x + sx * .57, (DESK_Y - .04) / 2, z + .22);
    bx(.03, .03, .46, metal, x + sx * .57, .1, z); bx(.03, .03, .4, metal, x + sx * .57, DESK_Y - .17, z - .03); }
  bx(1.1, .25, .02, M('#B98250'), x, DESK_Y - .25, z - .245);
}
function chair(x, z) {
  rb(.38, .03, .36, .012, chairWood, x, .365, z);
  rb(.36, .17, .025, .01, chairWood, x, .66, z + .19, null, {r: [-.08, 0, 0]});
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(.024, .35, .024, metal, x + sx * .16, .175, z + sz * .15);
  for (const sx of [-1, 1]) bx(.022, .32, .022, metal, x + sx * .16, .52, z + .18);
}
const SEATS = [];
COLS.forEach((x, ci) => ROWS.forEach((z, ri) => { desk(x, z); for (const s of [-1, 1]) { chair(x + s * .3, z + .42); SEATS.push({x: x + s * .3, z: z + .42, ci, ri, s}); } }));
X.SEATS = SEATS;
// партадағы ұсақ заттар (басқа оқушылар)
{ const r_ = rng(61);
  COLS.forEach((x, ci) => ROWS.forEach((z, ri) => { if (ci === 0 && ri === 1) return;
    for (const s of [-1, 1]) { const c = [PAL.sky, PAL.coral, PAL.mint, PAL.yellow, PAL.brick][Math.floor(r_() * 5)];
      rb(.17, .012, .23, .004, M(c, {roughness: .7}), x + s * .3 + (r_() - .5) * .06, DESK_Y + .006, z + .05, null, {r: [0, (r_() - .5) * .4, 0]});
      cyl(.006, .15, M(PAL.yellow), x + s * .3 + .12, DESK_Y + .007, z + .1, null, {r: [PI / 2, 0, r_() * 2], lo: true}); } })); }

/* ---------------------------------------------------------------- мұғалім үстелі */
const TD = {x: 3.0, z: -2.75, y: .76};
rb(1.45, .05, .72, .015, deskWood, TD.x, TD.y - .025, TD.z);
rb(.45, .7, .66, .015, M('#B98250', {roughness: .6}), TD.x + .45, .36, TD.z);
for (let k = 0; k < 3; k++) { bx(.4, .2, .01, M('#C8925A'), TD.x + .45, .2 + k * .22, TD.z + .335); bx(.12, .02, .02, M('#E0D8CC', {metalness: .6}), TD.x + .45, .26 + k * .22, TD.z + .345); }
bx(1.3, .45, .02, M('#B98250'), TD.x, .48, TD.z + .3);
for (const sx of [-1]) { bx(.04, .72, .04, metal, TD.x + sx * .68, .36, TD.z - .3); bx(.04, .72, .04, metal, TD.x + sx * .68, .36, TD.z + .3); }
{ const g = new T.Group(); g.position.set(TD.x, 0, TD.z - .62); room.add(g);   // мұғалім орындығы
  rb(.46, .04, .44, .015, M('#7A5536'), 0, .48, 0, g); rb(.44, .4, .04, .015, M('#7A5536'), 0, .78, -.2, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(.03, .47, .03, metal, sx * .19, .235, sz * .18, g); }
// санауыш (абакус)
const ABACUS = new T.Group(); ABACUS.position.set(TD.x - .56, TD.y, TD.z - .14); ABACUS.rotation.y = .25; room.add(ABACUS);
{ const fr = M('#A7764A', {roughness: .5});
  bx(.36, .02, .1, fr, 0, .01, 0, ABACUS); bx(.02, .3, .03, fr, -.17, .16, 0, ABACUS); bx(.02, .3, .03, fr, .17, .16, 0, ABACUS); bx(.36, .02, .03, fr, 0, .31, 0, ABACUS);
  const beads = new T.InstancedMesh(GSL, M('#ffffff', {roughness: .35}), 100); const m4 = new T.Matrix4(), q = new T.Quaternion();
  for (let r = 0; r < 10; r++) { mesh(GC, M('#B8B8B8', {metalness: .6, roughness: .3}), 0, .04 + r * .027, 0, ABACUS, {r: [0, 0, PI / 2], s: [.003, .32, .003]});
    for (let k = 0; k < 10; k++) { const x = (k < 5 ? -.14 + k * .021 : .02 + (k - 5) * .021);
      m4.compose(V(x, .04 + r * .027, 0), q, V(.0115, .0115, .0115)); beads.setMatrixAt(r * 10 + k, m4); beads.setColorAt(r * 10 + k, col(k < 5 ? PAL.brick : PAL.yellow)); } }
  beads.castShadow = true; ABACUS.add(beads); }
// ондық рамка (10 ұяшық) + фишкалар (19-слайдта жанданады)
const TENF = new T.Group(); TENF.position.set(TD.x - .22, TD.y, TD.z + .12); TENF.rotation.y = -.08; room.add(TENF);
{ rb(.5, .02, .22, .006, M('#B98250', {roughness: .5}), 0, .01, 0, TENF);
  for (let i = 0; i <= 5; i++) bx(.008, .018, .2, M('#7A5536'), -.24 + i * .096, .025, 0, TENF);
  bx(.49, .018, .008, M('#7A5536'), 0, .025, -.096, TENF); bx(.49, .018, .008, M('#7A5536'), 0, .025, 0, TENF); bx(.49, .018, .008, M('#7A5536'), 0, .025, .096, TENF);
  TENF.userData.chips = Array.from({length: 12}, (_, i) => { const m = mesh(new T.CylinderGeometry(.034, .034, .012, 24), M(i < 7 ? PAL.brick : i < 10 ? PAL.yellow : PAL.mint, {roughness: .4}), 0, 0, 0, TENF); return m; }); }
X.tenChip = (i) => { const k = i % 5, r = Math.floor(i / 5); return i < 10 ? V(-.192 + k * .096, .03, -.048 + r * .096) : V(.33 + (i - 10) * .08, .012, .05); };
// журнал (бақылау дәптері)
const JOURNAL = {c: canvas(1024, 720), key: ''}; JOURNAL.g = JOURNAL.c.getContext('2d'); JOURNAL.tex = ctex(JOURNAL.c);
{ const g = new T.Group(); g.position.set(TD.x + .15, TD.y + .004, TD.z - .02); g.rotation.y = .12; room.add(g); JOURNAL.grp = g;
  rb(.44, .012, .3, .004, M(PAL.board, {roughness: .6}), 0, 0, 0, g);
  mesh(GP, new T.MeshStandardMaterial({map: JOURNAL.tex, roughness: .9}), 0, .008, 0, g, {r: [-PI / 2, 0, 0], s: [.42, .29, 1], cast: false}); }
// кесе, қарындаш сауыты, кітаптар
cyl(.04, .09, M(PAL.coral, {roughness: .4}), TD.x - .55, TD.y + .045, TD.z + .18);
cyl(.035, .1, M(PAL.board), TD.x + .55, TD.y + .05, TD.z - .2);
for (let k = 0; k < 4; k++) cyl(.004, .16, M([PAL.yellow, PAL.coral, PAL.sky, PAL.mint][k]), TD.x + .55 + (k - 1.5) * .012, TD.y + .12, TD.z - .2 + (k % 2) * .01, null, {r: [(k - 1.5) * .08, 0, (k - 1.5) * .1], lo: true});
for (let k = 0; k < 3; k++) rb(.24, .035, .17, .006, M([PAL.sky, PAL.brick, PAL.yellow][k]), TD.x + .58, TD.y + .02 + k * .036, TD.z + .2, null, {r: [0, k * .2, 0]});

/* ---------------------------------------------------------------- Айарудың партасы: карточка, тақтайша, дәптер */
const AY = {x: -2.7, z: .82}, ER = {x: -2.1, z: .82}, DZ = ROWS[1];
function aacCanvas() {
  const c = canvas(512, 704), g = c.getContext('2d');
  g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, 512, 704); g.strokeStyle = PAL.board; g.lineWidth = 8; g.strokeRect(8, 8, 496, 688);
  g.fillStyle = PAL.ink; g.font = '700 40px Rubik'; g.textAlign = 'center'; g.fillText('Менің математикам', 256, 64);
  const cells = [...Array.from({length: 21}, (_, i) => String(i)), '+', '−', '=', '>', '<'];
  const cc = [PAL.sky, PAL.yellow, PAL.mint, PAL.coral];
  cells.forEach((s, i) => { const cx = 62 + (i % 5) * 97, cy = 112 + Math.floor(i / 5) * 92;
    g.fillStyle = i > 20 ? PAL.board : cc[Math.floor(i / 5) % 4]; g.fillRect(cx - 42, cy, 84, 80);
    g.fillStyle = i > 20 ? '#FBF8F1' : PAL.ink; g.font = `800 ${s.length > 1 ? 44 : 50}px Rubik`; g.fillText(s, cx, cy + 58); });
  g.font = '700 36px Rubik'; [['көп', 100], ['аз', 256], ['тең', 412]].forEach(([w, x]) => { g.fillStyle = PAL.coral; g.fillRect(x - 70, 636, 140, 52); g.fillStyle = PAL.ink; g.fillText(w, x, 674); });
  return c;
}
const AAC = mesh(GP, new T.MeshStandardMaterial({map: ctex(aacCanvas()), roughness: .35}), AY.x - .17, DESK_Y + .0072, DZ - .02, dyn, {r: [-PI / 2, 0, .1], s: [.19, .26, 1], cast: false});
const AACB = rb(.2, .006, .27, .002, M('#FFFFFF', {roughness: .3}), AY.x - .17, DESK_Y + .002, DZ - .02, dyn, {r: [0, .1, 0]});
AAC.onBeforeRender = () => { AACB.visible = AAC.visible; };
const NB = X.NB = {};   // дәптерлер: Айару (A) мен Ерасыл (E)
function notebook(key, x, z, rotY) {
  const o = NB[key] = {c: canvas(1024, 720), key: ''}; o.g = o.c.getContext('2d'); o.tex = ctex(o.c);
  const g = new T.Group(); g.position.set(x, DESK_Y + .004, z); g.rotation.y = rotY; dyn.add(g); o.grp = g;
  rb(.33, .008, .23, .003, M(key === 'A' ? PAL.coral : PAL.sky, {roughness: .7}), 0, 0, 0, g);
  mesh(GP, new T.MeshStandardMaterial({map: o.tex, roughness: .9}), 0, .006, 0, g, {r: [-PI / 2, 0, 0], s: [.32, .225, 1], cast: false});
  return o;
}
notebook('A', AY.x + .06, DZ + .02, .05); notebook('E', ER.x + .03, DZ + .03, -.1);
cyl(.0055, .15, M(PAL.yellow), AY.x + .2, DESK_Y + .008, DZ + .1, dyn, {r: [PI / 2, 0, -.6], lo: true});
cyl(.0055, .15, M(PAL.coral), ER.x + .17, DESK_Y + .008, DZ + .12, dyn, {r: [PI / 2, 0, .4], lo: true});
// «12» карточкасы
const CARD = new T.Group(); dyn.add(CARD); X.CARD = CARD;
{ const c = canvas(256, 340), g = c.getContext('2d');
  g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, 256, 340); g.fillStyle = PAL.yellow; g.fillRect(0, 0, 256, 24); g.fillRect(0, 316, 256, 24); g.fillRect(0, 0, 18, 340); g.fillRect(238, 0, 18, 340);
  g.fillStyle = PAL.ink; g.font = '800 170px Rubik'; g.textAlign = 'center'; g.fillText('12', 128, 236);
  rb(.09, .12, .004, .002, M('#FFFDF7', {roughness: .4}), 0, 0, 0, CARD);
  mesh(GP, new T.MeshStandardMaterial({map: ctex(c), roughness: .4}), 0, 0, .0026, CARD, {s: [.088, .118, 1], cast: false});
  mesh(GP, new T.MeshStandardMaterial({map: ctex(c), roughness: .4}), 0, 0, -.0026, CARD, {r: [0, PI, 0], s: [.088, .118, 1], cast: false}); }
// партадағы кішкентай сан түзуі (16-слайдтан бастап)
const DLINE = new T.Group(); dyn.add(DLINE); DLINE.position.set(-2.4, DESK_Y + .003, DZ - .17);
{ const c = canvas(2048, 128), g = c.getContext('2d'); g.fillStyle = '#FBF8F1'; g.fillRect(0, 0, 2048, 128); g.strokeStyle = PAL.ink; g.lineWidth = 6;
  g.beginPath(); g.moveTo(40, 52); g.lineTo(2008, 52); g.stroke(); g.fillStyle = PAL.ink; g.font = '700 42px Rubik'; g.textAlign = 'center';
  for (let i = 0; i <= 20; i++) { const x = 60 + i * 96.4; g.lineWidth = i % 5 ? 4 : 7; g.beginPath(); g.moveTo(x, 34); g.lineTo(x, 70); g.stroke(); g.fillText(String(i), x, 112); }
  DLINE.userData.base = c; rb(1.1, .004, .07, .0015, M('#FFFFFF'), 0, 0, 0, DLINE);
  const t = ctex(c); DLINE.userData.tex = t; mesh(GP, new T.MeshStandardMaterial({map: t, roughness: .5}), 0, .0025, 0, DLINE, {r: [-PI / 2, 0, 0], s: [1.08, .067, 1], cast: false});
  DLINE.userData.chip = mesh(new T.CylinderGeometry(.016, .016, .006, 20), M(PAL.coral, {roughness: .4}), -.54 + .02 + 12 * (1.04 / 20), .006, -.005, DLINE); }
X.dlineX = n => -.54 + .02 + n * (1.04 / 20);

/* ---------------------------------------------------------------- сырт: мектеп, аула, ағаштар */
const OUT = new T.Group(); scene.add(OUT);
const TREES = [], CLOUDS = [];
const BX0 = -4.8;   // қасбет жазықтығы
{ // қасбет: біздің үш тереземіз ғана ашық
  const c = canvas(2048, 512), g = c.getContext('2d'), zw = 56, hy = 11.95, px = 2048 / zw, py = 512 / hy, Y = y => 512 - (y + .45) * py;
  g.fillStyle = mixHex(PAL.plaster, '#ffffff', .25); g.fillRect(0, 0, 2048, 512); speckle(g, 2048, 512, '#D9CDB6', 9000, 71);
  g.fillStyle = PAL.brick; g.fillRect(0, Y(0), 2048, .45 * py); g.fillRect(0, Y(3.5), 2048, .35 * py); g.fillRect(0, Y(7.1), 2048, .35 * py); g.fillRect(0, Y(11.5), 2048, .6 * py);
  g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < 512; y += 6) g.fillRect(0, y, 2048, 1);
  const t = ctex(c); t.repeat.set(1 / zw, 1 / hy); t.offset.set(.5, .45 / hy);
  const s = new T.Shape(); s.moveTo(-28, -.45); s.lineTo(28, -.45); s.lineTo(28, 11.5); s.lineTo(-28, 11.5); s.lineTo(-28, -.45);
  for (const z of WINZ) { const p = new T.Path(); p.moveTo(z - .8, WIN.y0); p.lineTo(z + .8, WIN.y0); p.lineTo(z + .8, WIN.y1); p.lineTo(z - .8, WIN.y1); p.lineTo(z - .8, WIN.y0); s.holes.push(p); }
  const m = new T.Mesh(new T.ShapeGeometry(s), TM(t, {roughness: .9})); m.rotation.y = -PI / 2; m.position.x = BX0;
  m.receiveShadow = true; m.castShadow = true; OUT.add(m);
}
const WINGLASS = new T.MeshStandardMaterial({color: col('#33475C'), roughness: .12, metalness: .3, emissive: col('#9CCBEA'), emissiveIntensity: .4});
const STREETMAT = new T.MeshStandardMaterial({color: col('#FFF1D6'), emissive: col('#FFD9A0'), emissiveIntensity: 0, roughness: .4});
{ // басқа терезелер (instanced)
  const list = [];
  for (let f = 0; f < 3; f++) for (let k = -10; k <= 10; k++) { const z = -2.6 + k * 2.4; if (f === 0 && WINZ.some(w => Math.abs(w - z) < .1)) continue; if (f === 0 && Math.abs(z - 9.4) < 1.3) continue; list.push([z, f * 3.6]); }
  const fr = new T.InstancedMesh(GB, M('#F2EEE6', {roughness: .5}), list.length * 4), gl = new T.InstancedMesh(GB, WINGLASS, list.length), sl = new T.InstancedMesh(GB, M('#9A9C9E', {roughness: .4, metalness: .4}), list.length);
  const m4 = new T.Matrix4(), q = new T.Quaternion(); let n = 0;
  list.forEach(([z, y0], i) => { const yc = y0 + 1.75;
    m4.compose(V(BX0 - .035, yc, z), q, V(.04, 1.6, 1.6)); gl.setMatrixAt(i, m4);
    for (const [dy, dz, h, w] of [[.8, 0, .07, 1.68], [-.8, 0, .07, 1.68], [0, .8, 1.68, .07], [0, -.8, 1.68, .07]]) { m4.compose(V(BX0 - .065, yc + dy, z + dz), q, V(.1, h, w)); fr.setMatrixAt(n++, m4); }
    m4.compose(V(BX0 - .12, y0 + .93, z), q, V(.22, .04, 1.75)); sl.setMatrixAt(i, m4); });
  for (const o of [fr, gl, sl]) { o.castShadow = o.receiveShadow = true; OUT.add(o); }
  // мектептің басқа беттері, шатыр, кіреберіс
  const plas = M(mixHex(PAL.plaster, '#ffffff', .15), {roughness: .9});
  bx(16, 12, .4, plas, BX0 + 8, 5.5, -28.2, OUT); bx(16, 12, .4, plas, BX0 + 8, 5.5, 28.2, OUT);
  bx(16.6, .7, 56.8, M(PAL.brick, {roughness: .8}), BX0 + 8, 11.85, 0, OUT);
  bx(16, .3, 56, M('#8E8A86'), BX0 + 8, 11.4, 0, OUT);
  bx(16, 12, .3, plas, BX0 + 16, 5.5, 0, OUT);
  // кіреберіс
  bx(3.4, .18, 2.6, M('#E2D8C6'), BX0 - 1.3, 3.3, 9.4, OUT); for (const s of [-1, 1]) cyl(.09, 3.3, M('#EFE9DE'), BX0 - 2.7, 1.2, 9.4 + s * 1.1, OUT);
  rb(.12, 2.4, 1.8, .02, M(PAL.wood, {roughness: .5}), BX0 - .02, .95, 9.4, OUT); bx(.06, 2.5, .05, M('#7A5536'), BX0 - .06, .95, 9.4, OUT);
  for (let k = 0; k < 3; k++) bx(1.2 - k * .3, .15, 3.4, M('#CFC6B8'), BX0 - .6 + k * .15, -.37 + k * .15, 9.4, OUT);
  const sc = canvas(1024, 192), sg = sc.getContext('2d'); sg.fillStyle = PAL.board; sg.fillRect(0, 0, 1024, 192); sg.fillStyle = PAL.chalk; sg.font = '800 120px Rubik'; sg.textAlign = 'center'; sg.fillText('МЕКТЕП', 512, 148);
  mesh(GP, new T.MeshStandardMaterial({map: ctex(sc), roughness: .6}), BX0 - .08, 4.05, 9.4, OUT, {r: [0, -PI / 2, 0], s: [3.2, .6, 1]});
}
{ // жер: асфальт аула, шөп, жол
  const c = canvas(2048, 2048), g = c.getContext('2d'), r = rng(81);
  g.fillStyle = mixHex(PAL.board, PAL.mint, .55); g.fillRect(0, 0, 2048, 2048); speckle(g, 2048, 2048, mixHex(PAL.board, PAL.mint, .3), 30000, 82); speckle(g, 2048, 2048, mixHex(PAL.mint, PAL.yellow, .3), 12000, 83);
  // координата: x∈[-120,-4.8] → u, z∈[-90,90] → v
  const U = x => (x + 120) / 115.2 * 2048, Vz = z => (z + 90) / 180 * 2048;
  g.fillStyle = '#9C958C'; g.fillRect(U(-17), 0, U(-4.8) - U(-17), 2048); speckle(g, 2048, 2048, '#8A837A', 0, 1);
  g.fillStyle = '#A39C92'; g.fillRect(U(-17), Vz(-30), U(-4.8) - U(-17), Vz(30) - Vz(-30));
  g.fillStyle = '#B5AEA3'; g.fillRect(U(-60), Vz(8.2), U(-17) - U(-60), Vz(10.6) - Vz(8.2));
  speckle(g, 2048, 2048, '#7F786F', 26000, 84);
  const t = ctex(c); t.anisotropy = 8;
  mesh(GP, TM(t, {roughness: .95}), -62.4, -.45, 0, OUT, {r: [-PI / 2, 0, 0], s: [115.2, 180, 1], cast: false});
  mesh(GP, M(mixHex(PAL.board, PAL.mint, .45), {roughness: 1}), 0, -.5, 0, OUT, {r: [-PI / 2, 0, 0], s: [1400, 1400, 1], cast: false});
}
{ // классика (сандар асфальтта)
  const c = canvas(512, 1024), g = c.getContext('2d'); g.clearRect(0, 0, 512, 1024);
  const cells = [[1, 0, 0], [2, 0, 1], [3, 0, 2], [4, -1, 3], [5, 1, 3], [6, 0, 4], [7, -1, 5], [8, 1, 5], [9, 0, 6], [10, 0, 7]];
  g.strokeStyle = 'rgba(250,246,238,.95)'; g.lineWidth = 9; g.fillStyle = 'rgba(250,246,238,.95)'; g.font = '700 74px Caveat'; g.textAlign = 'center';
  const cw = 160, ch = 122;
  cells.forEach(([n, cx, cy]) => { const x = 256 + (cx === 0 ? -cw / 2 : cx < 0 ? -cw : 0), y = 1000 - (cy + 1) * ch;
    g.strokeRect(x, y, cw, ch); g.fillStyle = ['rgba(244,201,93,.95)', 'rgba(242,139,108,.95)', 'rgba(143,211,182,.95)', 'rgba(250,246,238,.95)'][n % 4]; g.fillText(String(n), x + cw / 2, y + ch / 2 + 26); });
  const t = ctex(c);
  mesh(GP, new T.MeshStandardMaterial({map: t, transparent: true, roughness: .9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2}), -9.2, -.445, -.3, OUT, {r: [-PI / 2, 0, PI / 2], s: [2.1, 4.2, 1], cast: false});
}
// ағаштар, орындықтар, шамдар, алыстағы қала
{ const r = rng(91), trunk = M('#6B4A33', {roughness: .9}), leafs = [mixHex(PAL.board, PAL.mint, .2), mixHex(PAL.board, PAL.mint, .45), mixHex(PAL.board, PAL.yellow, .25), mixHex(PAL.wood, PAL.brick, .25)].map(c => M(c, {roughness: .85, flatShading: true}));
  const spots = [[-14, -15], [-19, -2.5], [-16, 5], [-21, 8.5], [-13.5, 19], [-26, -14], [-30, 4], [-24, -22], [-34, 18], [-38, -8], [-20, 26], [-44, 10], [-14, -20], [-28, 30], [-48, -18]];
  spots.forEach(([x, z], i) => { const s = .8 + r() * .55; const g = new T.Group(); g.position.set(x, -.45, z); g.scale.setScalar(s); OUT.add(g);
    mesh(new T.CylinderGeometry(.14, .2, 2.4, 7), trunk, 0, 1.2, 0, g);
    const lm = leafs[i % 7 === 3 ? 3 : Math.floor(r() * 3)];
    for (let k = 0; k < 4; k++) mesh(new T.IcosahedronGeometry(1.1 + r() * .5, 1), lm, (r() - .5) * 1.2, 2.8 + k * .55 + r() * .3, (r() - .5) * 1.2, g);
    g.userData.sway = r() * 6; TREES.push(g); });
  for (const [x, z] of [[-11.5, -5.5], [-11.5, 5]]) { const g = new T.Group(); g.position.set(x, -.45, z); OUT.add(g);
    rb(.45, .05, 1.6, .01, M(PAL.wood), 0, .45, 0, g); rb(.05, .35, 1.6, .01, M(PAL.wood), .2, .7, 0, g);
    for (const s of [-1, 1]) bx(.4, .45, .05, metal, 0, .22, s * .7, g); }
  for (const [x, z] of [[-13, -12], [-13, 1.5], [-13, 14]]) { cyl(.06, 4.2, M('#3A3F48', {metalness: .5, roughness: .4}), x, 1.65, z, OUT);
    mesh(GS, STREETMAT, x + .25, 3.8, z, OUT, {s: [.22, .14, .22]}); bx(.5, .06, .06, M('#3A3F48'), x + .12, 3.75, z, OUT); }
  const cm = [mixHex(PAL.sky, PAL.plaster, .4), mixHex(PAL.sky, '#ffffff', .35), mixHex(PAL.sky, PAL.board, .25)].map(c => M(c, {roughness: 1}));
  for (let k = 0; k < 40; k++) { const z = -220 + k * 11 + r() * 6, hh = 8 + r() * 26, x = -170 - r() * 60;
    bx(8 + r() * 10, hh, 7 + r() * 8, cm[k % 3], x, hh / 2 - .5, z, OUT, {cast: false}); }
  for (let k = 0; k < 18; k++) { const z = -160 + k * 19, x = -110 - r() * 30; mesh(new T.IcosahedronGeometry(4 + r() * 3, 0), leafs[1], x, 1.5, z, OUT, {cast: false}); }
}
// бұлттар
{ const c = canvas(256, 128), g = c.getContext('2d'), r = rng(101);
  for (let k = 0; k < 26; k++) { const x = 40 + r() * 176, y = 70 + (r() - .5) * 30, rr = 18 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); }
  const t = new T.CanvasTexture(c); const mat = new T.SpriteMaterial({map: t, color: 0xffffff, transparent: true, depthWrite: false, fog: false});
  X.CLOUDMAT = mat;
  for (let k = 0; k < 12; k++) { const s = new T.Sprite(mat); s.position.set(-140 - r() * 160, 40 + r() * 50, -200 + k * 36 + r() * 20); s.scale.set(70 + r() * 50, 26 + r() * 14, 1); s.userData.v = .6 + r(); OUT.add(s); CLOUDS.push(s); NODEPTH.push(s); }
}

/* ---------------------------------------------------------------- күн сәулесі шоқтары және шаң */
const SHAFTS = [];
const shaftMat = new T.ShaderMaterial({transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
  uniforms: {uCol: {value: col('#FFE9CF')}, uI: {value: .12}},
  vertexShader: 'attribute float aT;attribute float aU;varying float vT;varying float vU;varying float vZ;varying vec3 vN;varying vec3 vV;void main(){vT=aT;vU=aU;vec4 w=modelViewMatrix*vec4(position,1.);vZ=-w.z;vV=normalize(-w.xyz);vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*w;}',
  fragmentShader: 'uniform vec3 uCol;uniform float uI;varying float vT;varying float vU;varying float vZ;varying vec3 vN;varying vec3 vV;void main(){float f=abs(dot(vN,vV));float e=sin(3.14159*clamp(vU,0.,1.));float a=pow(1.-vT,1.6)*uI*f*e*e*smoothstep(.4,2.2,vZ);gl_FragColor=vec4(uCol*a,1.);}'});
function setShafts(o) {
  const d = dirOf(o.el, o.az).negate(); const vis = o.el > 1 && o.sI > .5;
  if (shaftsDirty) { shaftsDirty = false;
    SHAFTS.forEach(m => { m.geometry.dispose(); m.parent.remove(m); }); SHAFTS.length = 0;
    if (d.x > .05) for (const z of WINZ) {
      const L = Math.min(9, (4.4 - -4.5) / d.x), pts = [], tt = [];
      const c0 = [[-4.62, WIN.y0, z - .78], [-4.62, WIN.y1, z - .78], [-4.62, WIN.y1, z + .78], [-4.62, WIN.y0, z + .78]];
      const c1 = c0.map(([x, y, zz]) => { const k = Math.min(L, (y - .0) / Math.max(.05, -d.y)); return [x + d.x * k, y + d.y * k, zz + d.z * k]; });
      const quad = (a, b, c, e, ta, tb) => { pts.push(...a, ...b, ...c, ...a, ...c, ...e); tt.push(ta, ta, tb, ta, tb, tb); };
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(c0[i], c0[j], c1[j], c1[i], 0, 1); }
      // tt ретін түзетеміз: әр төртбұрыштың бірінші екі нүктесі терезеде (0), соңғы екеуі еденде (1)
      const t2 = [], u2 = []; for (let i = 0; i < 4; i++) { t2.push(0, 0, 1, 0, 1, 1); u2.push(0, 1, 1, 0, 1, 0); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); g.setAttribute('aT', new T.Float32BufferAttribute(t2, 1)); g.setAttribute('aU', new T.Float32BufferAttribute(u2, 1)); g.computeVertexNormals();
      const m = new T.Mesh(g, shaftMat); m.frustumCulled = false; m.renderOrder = 5; room.add(m); SHAFTS.push(m); NODEPTH.push(m);
    }
  }
  shaftMat.uniforms.uCol.value.copy(o.sun); shaftMat.uniforms.uI.value = vis ? (o.el < 15 ? .5 : .28) * Math.min(1, o.sI / 2.5) : 0;
  SHAFTS.forEach(m => m.visible = vis);
}
const DUST = (() => {
  const n = 420, r = rng(111), pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = -4.3 + r() * 4.5; pos[i * 3 + 1] = .3 + r() * 2.4; pos[i * 3 + 2] = -3.5 + r() * 7; seed[i] = r() * 100; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aS', new T.BufferAttribute(seed, 1));
  const mat = new T.ShaderMaterial({transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: {uT: {value: 0}, uI: {value: 1}, uCol: {value: col('#FFE9CF')}},
    vertexShader: 'attribute float aS;uniform float uT;varying float vA;void main(){vec3 p=position;p.x+=sin(uT*.21+aS)*.25;p.y+=sin(uT*.13+aS*1.7)*.18;p.z+=cos(uT*.17+aS*.7)*.25;vec4 w=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(3.2/-w.z,1.,5.)*(1.+.3*sin(aS));vA=(.5+.5*sin(uT*1.3+aS*3.))*smoothstep(.8,1.8,-w.z);gl_Position=projectionMatrix*w;}',
    fragmentShader: 'uniform float uI;uniform vec3 uCol;varying float vA;void main(){vec2 q=gl_PointCoord-.5;float a=smoothstep(.5,.0,length(q));gl_FragColor=vec4(uCol*a*vA*uI,1.);}'});
  const p = new T.Points(g, mat); p.frustumCulled = false; room.add(p); NODEPTH.push(p); return p;
})();

/* =====================================================================
   КЕЙІПКЕРЛЕР
   ===================================================================== */
const PEOPLE = X.PEOPLE = {};
const EYE_D = new T.MeshBasicMaterial({color: col('#1A1412')}), EYE_W = new T.MeshBasicMaterial({color: col('#FFFFFF')});
const joint = (parent, x, y, z) => { const j = new T.Group(); j.position.set(x, y, z); parent.add(j); return j; };
const part = (geo, mat, parent, x, y, z, sx = 1, sy = 1, sz = 1, o = {}) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]); m.castShadow = o.cast !== false; m.receiveShadow = true; parent.add(m); return m; };
function face(head, o, k) {   // k — бас радиусы
  const dark = EYE_D, white = EYE_W;
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = joint(head, s * .38 * k, .02 * k, -.9 * k); eyes.push(e);
    part(GSL, dark, e, 0, 0, 0, .15 * k, .19 * k, .08 * k, {cast: false});
    part(GSL, white, e, s * .03 * k + .03 * k, .06 * k, -.06 * k, .045 * k, .045 * k, .02 * k, {cast: false});
    part(cap(.018 * k, .12 * k), M(o.hair, {roughness: .7}), head, s * .38 * k, .3 * k, -.9 * k, 1, 1, .6, {r: [0, 0, PI / 2 + s * .12], cast: false});
    part(GSL, M(PAL.coral, {roughness: 1, transparent: true, opacity: .42}), head, s * .62 * k, -.2 * k, -.74 * k, .14 * k, .08 * k, .06 * k, {cast: false});
    part(GSL, M(o.skin, {roughness: .6}), head, s * 1.0 * k, -.02 * k, 0, .17 * k, .22 * k, .12 * k);
  }
  part(GSL, M(mixHex(o.skin, PAL.brick, .2), {roughness: .6}), head, 0, -.18 * k, -.98 * k, .09 * k, .08 * k, .07 * k, {cast: false});
  const mouth = joint(head, 0, -.44 * k, -.86 * k);
  const smile = part(new T.TorusGeometry(.2 * k, .035 * k, 6, 16, PI), dark, mouth, 0, .09 * k, -.02 * k, 1, 1, 1, {r: [0, 0, PI], cast: false});
  const open = part(GSL, M('#5A2422', {roughness: .5}), mouth, 0, 0, -.01 * k, .17 * k, .14 * k, .08 * k, {cast: false});
  const flat = part(cap(.025 * k, .2 * k), dark, mouth, 0, .02 * k, -.02 * k, 1, 1, 1, {r: [0, 0, PI / 2], cast: false});
  return {eyes, set: m => { smile.visible = m === 'smile'; open.visible = m === 'open' || m === 'o'; flat.visible = m === 'flat'; open.scale.set(m === 'o' ? .11 * k : .17 * k, m === 'o' ? .12 * k : .15 * k, .08 * k); }};
}
function hair(head, o, k) {
  const hm = M(o.hair, {roughness: .55});
  const capm = part(new T.SphereGeometry(1, 28, 18, 0, TAU, 0, 1.72), hm, head, 0, .03 * k, .03 * k, 1.07 * k, 1.07 * k, 1.07 * k, {r: [.62, 0, 0]});
  if (o.style === 'braids' || o.style === 'bob' || o.style === 'pony' || o.style === 'bun') part(GSL, hm, head, 0, .66 * k, -.62 * k, .7 * k, .2 * k, .36 * k, {r: [.45, 0, 0]});
  if (o.style === 'braids') for (const s of [-1, 1]) { for (let i = 0; i < 5; i++) part(GSL, hm, head, s * (.82 - i * .02) * k, (-.35 - i * .27) * k, (.25 + i * .05) * k, .2 * k, .2 * k, .2 * k);
    part(new T.TorusGeometry(.12 * k, .05 * k, 8, 16), M(o.ribbon || PAL.coral, {roughness: .6}), head, s * .74 * k, -1.65 * k, .48 * k, 1, 1, 1, {r: [PI / 2, 0, 0]}); }
  if (o.style === 'pony') { for (let i = 0; i < 5; i++) part(GSL, hm, head, 0, (.3 - i * .25) * k, (1.05 + Math.sin(i * .6) * .15) * k, .24 * k, .26 * k, .24 * k); }
  if (o.style === 'bun') part(GS, hm, head, 0, .65 * k, .72 * k, .46 * k, .42 * k, .42 * k);
  if (o.style === 'bob') for (const s of [-1, 1]) part(GSL, hm, head, s * .82 * k, -.3 * k, .15 * k, .32 * k, .75 * k, .7 * k);
  if (o.style === 'short') { part(GSL, hm, head, 0, .7 * k, -.6 * k, .82 * k, .2 * k, .4 * k, {r: [.6, 0, 0]}); part(GSL, hm, head, .15 * k, 1.0 * k, -.2 * k, .5 * k, .22 * k, .5 * k, {r: [.3, .4, .2]}); }
  if (o.style === 'long') { part(GSL, hm, head, 0, -.6 * k, .55 * k, .95 * k, 1.3 * k, .6 * k); }
  return capm;
}
function person(o) {
  // o: {adult, skin, hair, style, top, bottom, shoe, collar, skirt, glasses}
  const A = !!o.adult, P = {o, g: new T.Group(), j: {}, adult: A};
  const k = A ? .112 : .116;                // бас радиусы
  const L = A ? {hy: .86, tor: .5, torR: .16, sh: .44, neck: .52, armR: .045, up: .27, fore: .25, legR: .07, th: .42, sh2: .4} : {hy: .4, tor: .3, torR: .108, sh: .27, neck: .32, armR: .038, up: .15, fore: .135, legR: .052, th: .24, sh2: .34};
  P.L = L;
  const sk = M(o.skin, {roughness: .58}), top = M(o.top, {roughness: .85}), bot = M(o.bottom, {roughness: .85}), shoe = M(o.shoe || '#3A2E2A', {roughness: .6});
  const hips = P.j.hips = joint(P.g, 0, L.hy, 0);
  const spine = P.j.spine = joint(hips, 0, .02, 0);
  part(cap(L.torR, L.tor - L.torR * 1.2), top, spine, 0, L.tor / 2 + .01, 0, 1, 1, .78);
  if (o.collar) part(new T.TorusGeometry(L.torR * .62, L.torR * .16, 8, 20), M(o.collar, {roughness: .7}), spine, 0, L.tor - .005, -.008, 1, 1, .85, {r: [PI / 2 - .2, 0, 0]});
  if (o.skirt) part(new T.CylinderGeometry(L.torR * .95, L.torR * 1.75, .5, 20, 1, true), M(o.skirt, {roughness: .85, side: T.DoubleSide}), hips, 0, -.2, 0, 1, 1, .85);
  const neck = joint(spine, 0, L.neck, 0); part(GC, sk, neck, 0, .02, 0, k * .32, .05, k * .32);
  const head = P.j.head = joint(neck, 0, .045, 0);
  const hc = joint(head, 0, k * .95, 0);
  part(GS, sk, hc, 0, 0, 0, k * 1.02, k * .98, k * .98);
  P.face = face(hc, o, k); hair(hc, o, k);
  if (o.glasses) { const gm = M('#2A2420', {roughness: .3, metalness: .4});
    for (const s of [-1, 1]) part(new T.TorusGeometry(.19 * k, .025 * k, 6, 20), gm, hc, s * .38 * k, .02 * k, -.95 * k, 1, 1, 1, {cast: false});
    part(GB, gm, hc, 0, .04 * k, -1.0 * k, .2 * k, .03 * k, .03 * k, {cast: false}); }
  for (const s of [-1, 1]) {
    const nm = s < 0 ? 'L' : 'R';
    const sh = P.j['sh' + nm] = joint(spine, s * (L.torR + L.armR * .55), L.sh, 0);
    part(cap(L.armR, L.up - L.armR), top, sh, 0, -L.up / 2, 0);
    const el = P.j['el' + nm] = joint(sh, 0, -L.up, 0);
    part(cap(L.armR * .9, L.fore - L.armR), o.sleeve === false ? sk : top, el, 0, -L.fore / 2, 0);
    const ha = P.j['ha' + nm] = joint(el, 0, -L.fore, 0);
    part(GS, sk, ha, 0, -.012, 0, L.armR * 1.05, L.armR * 1.2, L.armR * .85);
    const hp = P.j['hp' + nm] = joint(hips, s * L.legR * 1.1, 0, 0);
    part(cap(L.legR, L.th - L.legR), o.skirt ? sk : bot, hp, 0, -L.th / 2, 0);
    const kn = P.j['kn' + nm] = joint(hp, 0, -L.th, 0);
    part(cap(L.legR * .9, L.sh2 - L.legR), o.skirt || o.shorts ? (o.tights ? M(o.tights) : sk) : bot, kn, 0, -L.sh2 / 2, 0);
    part(rbox(L.legR * 1.9, L.legR * 1.4, L.legR * 3, L.legR * .5), shoe, kn, 0, -L.sh2 - L.legR * .2, -L.legR * .7);
  }
  P.phase = rng(o.seed || 1)() * 10;
  dyn.add(P.g); return P;
}
// позалар
const KP = {};
KP.sit = {hy: .4, hips: [0, 0, 0], spine: [-.06, 0, 0], head: [-.08, 0, 0], shL: [1.05, 0, .14], elL: [.55, 0, 0], shR: [1.05, 0, -.14], elR: [.55, 0, 0],
  hpL: [1.52, 0, .05], knL: [-1.5, 0, 0], hpR: [1.52, 0, -.05], knR: [-1.5, 0, 0]};
const kp = (base, o) => ({...KP[base], ...o});
Object.assign(KP, {
  attend: kp('sit', {head: [.02, 0, 0]}),
  reach: kp('sit', {spine: [-.2, -.12, 0], head: [-.32, -.38, 0], shR: [1.25, 0, -.5], elR: [.2, 0, 0]}),
  handMid: kp('sit', {spine: [-.04, 0, 0], head: [.04, 0, 0], shR: [2.0, 0, -.18], elR: [1.05, 0, 0]}),
  handUp: kp('sit', {spine: [.04, 0, -.06], head: [.16, 0, .05], shR: [2.95, 0, -.12], elR: [.25, 0, 0], shL: [.9, 0, .2], elL: [.7, 0, 0]}),
  sad: kp('sit', {spine: [-.16, 0, 0], head: [-.42, .12, 0], shR: [.5, 0, -.06], elR: [.95, 0, 0], shL: [.5, 0, .06], elL: [.95, 0, 0]}),
  lap: kp('sit', {spine: [-.1, 0, 0], head: [-.5, 0, 0], shR: [.32, 0, -.18], elR: [1.2, 0, 0], shL: [.32, 0, .18], elL: [1.2, 0, 0]}),
  show: kp('sit', {spine: [.02, 0, 0], head: [.06, -.1, 0], shR: [1.9, 0, -.32], elR: [.75, 0, 0]}),
  place: kp('sit', {spine: [-.28, .05, 0], head: [-.5, .1, 0], shR: [1.25, 0, -.08], elR: [.3, 0, 0]}),
  write: kp('sit', {spine: [-.18, 0, 0], head: [-.42, 0, 0], shR: [1.1, 0, -.2], elR: [.75, 0, 0], shL: [1.15, 0, .25], elL: [.6, 0, 0]}),
  board: kp('sit', {spine: [.02, 0, 0], head: [.04, 0, 0], shL: [1.95, 0, .22], elL: [.85, 0, 0], shR: [1.95, 0, -.22], elR: [.85, 0, 0]}),
  look: kp('sit', {head: [-.05, -.45, 0], spine: [-.06, -.1, 0]}),
  stand: {hy: .62, hips: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], shL: [.06, 0, .1], elL: [.15, 0, 0], shR: [.06, 0, -.1], elR: [.15, 0, 0], hpL: [0, 0, .02], knL: [0, 0, 0], hpR: [0, 0, -.02], knR: [0, 0, 0]},
});
KP.hop = {...KP.stand, shL: [.5, 0, .9], elL: [.4, 0, 0], shR: [.5, 0, -.9], elR: [.4, 0, 0], hpL: [.9, 0, .02], knL: [-1.7, 0, 0]};
KP.wait = {...KP.stand, head: [-.1, .3, 0], shL: [.2, 0, .12], elL: [1.2, 0, 0], shR: [.2, 0, -.12], elR: [1.2, 0, 0]};
const AP = {};
AP.stand = {hy: .86, hips: [0, 0, 0], spine: [0, 0, 0], head: [0, 0, 0], shL: [.05, 0, .07], elL: [.2, 0, 0], shR: [.05, 0, -.07], elR: [.2, 0, 0], hpL: [0, 0, 0], knL: [0, 0, 0], hpR: [0, 0, 0], knR: [0, 0, 0]};
const ap = (o) => ({...AP.stand, ...o});
Object.assign(AP, {
  write: ap({head: [.12, .25, 0], spine: [0, .15, 0], shR: [2.45, 0, -.25], elR: [.45, 0, 0], shL: [.2, 0, .1], elL: [.8, 0, 0]}),
  explain: ap({head: [-.05, 0, 0], shR: [1.0, 0, -.4], elR: [1.1, 0, 0], shL: [.35, 0, .1], elL: [.8, 0, 0]}),
  open: ap({head: [-.08, 0, 0], shR: [.8, 0, -.55], elR: [.7, 0, 0], shL: [.8, 0, .55], elL: [.7, 0, 0]}),
  talk: ap({head: [-.12, 0, 0], shR: [.7, 0, -.15], elR: [1.4, 0, 0], shL: [.7, 0, .15], elL: [1.4, 0, 0]}),
  hold: ap({head: [-.2, 0, 0], shR: [.55, 0, -.2], elR: [1.3, 0, 0], shL: [.55, 0, .2], elL: [1.3, 0, 0]}),
});
const JN = ['hips', 'spine', 'head', 'shL', 'elL', 'shR', 'elR', 'hpL', 'knL', 'hpR', 'knR'];
function pose(P, a, b, k = 0) {
  const lib = P.adult ? AP : KP; const A = typeof a === 'string' ? lib[a] : a, B = typeof b === 'string' ? lib[b] : (b || A);
  const e = E.ioS(clamp(k));
  for (const n of JN) { const j = P.j[n]; if (!j || !A[n]) continue; const x = A[n], y = B[n] || x; j.rotation.set(lerp(x[0], y[0], e), lerp(x[1], y[1], e), lerp(x[2], y[2], e)); }
  P.j.hips.position.y = lerp(A.hy, B.hy, e);
}
function idle(P, t, amt = 1) {   // тыныс алу, көз жұму, басын сәл қозғау
  const ph = P.phase, s = P.j.spine, h = P.j.head;
  s.scale.y = 1 + Math.sin(t * 2.1 + ph) * .012 * amt;
  h.rotation.x += Math.sin(t * .7 + ph) * .03 * amt; h.rotation.y += Math.sin(t * .43 + ph * 2) * .05 * amt;
  const bl = ((t + ph * 3) % 4.2) < .13 ? .12 : 1; P.face.eyes.forEach(e => e.scale.y = bl);
}
X.pose = pose; X.idle = idle;
const SKIN = ['#EDC6A3', '#E2B48F', '#F1D2B4', '#DCAA84', '#E8BD97'], HAIRC = ['#2A201B', '#3A2A22', '#1F1A17', '#4A3428', '#2E2320'];
const TOPS = [PAL.sky, PAL.mint, PAL.yellow, PAL.coral, mixHex(PAL.board, PAL.mint, .35), PAL.wood, mixHex(PAL.sky, PAL.board, .3), mixHex(PAL.brick, PAL.coral, .5)];
PEOPLE.aya = person({skin: '#EDC6A3', hair: '#2A201B', style: 'braids', top: PAL.brick, collar: '#FBF8F1', bottom: '#2F3A4A', shoe: '#5A3A2A', ribbon: PAL.yellow, seed: 3});
PEOPLE.era = person({skin: '#E2B48F', hair: '#1F1A17', style: 'short', top: mixHex(PAL.board, PAL.mint, .35), collar: '#FBF8F1', bottom: '#2F3A4A', seed: 5});
PEOPLE.aya.g.position.set(AY.x, 0, AY.z); PEOPLE.era.g.position.set(ER.x, 0, ER.z);
const KIDS = X.KIDS = [];
{ const r = rng(121); const empty = new Set(['1-2-L', '2-0-R']);
  SEATS.forEach((s, i) => { if (s.ci === 0 && s.ri === 1) return; if (empty.has(`${s.ci}-${s.ri}-${s.s < 0 ? 'L' : 'R'}`)) return;
    const girl = r() < .5;
    const P = person({skin: SKIN[Math.floor(r() * 5)], hair: HAIRC[Math.floor(r() * 5)], style: girl ? ['bob', 'pony', 'braids', 'bun'][Math.floor(r() * 4)] : 'short',
      top: TOPS[Math.floor(r() * TOPS.length)], collar: r() < .6 ? '#FBF8F1' : null, bottom: r() < .5 ? '#2F3A4A' : '#3B3A44', ribbon: [PAL.yellow, PAL.coral, PAL.mint][Math.floor(r() * 3)], seed: 200 + i});
    P.g.position.set(s.x, 0, s.z); P.seat = s; KIDS.push(P); });
  KIDS.push(PEOPLE.aya, PEOPLE.era); }
PEOPLE.tch = person({adult: true, skin: '#E8BD97', hair: '#2E2320', style: 'bun', top: '#D9A443', collar: '#FBF8F1', bottom: '#2F3A4A', skirt: PAL.board, tights: '#4A3F3A', glasses: true, shoe: '#4A2E22', seed: 9});
PEOPLE.log = person({adult: true, skin: '#F1D2B4', hair: '#4A3428', style: 'bob', top: PAL.sky, collar: '#FFFFFF', bottom: '#2F3A4A', seed: 11});
PEOPLE.mom = person({adult: true, skin: '#E2B48F', hair: '#1F1A17', style: 'long', top: PAL.coral, collar: PAL.yellow, bottom: '#3B3A44', skirt: mixHex(PAL.brick, '#3B3A44', .5), tights: '#3B3A44', seed: 13});
PEOPLE.h1 = person({skin: '#F1D2B4', hair: '#3A2A22', style: 'pony', top: PAL.yellow, bottom: '#2F3A4A', ribbon: PAL.coral, seed: 15});
PEOPLE.h2 = person({skin: '#DCAA84', hair: '#1F1A17', style: 'short', top: PAL.sky, bottom: '#3B3A44', seed: 17});
// мини-тақталар (23-слайд)
const MINI = [];
{ const c = canvas(256, 180), g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 256, 180); g.strokeStyle = '#D0D4D8'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 174);
  g.fillStyle = '#2B5DA8'; g.font = '700 130px Caveat'; g.textAlign = 'center'; g.fillText('12', 128, 140);
  const tx = ctex(c);
  KIDS.forEach(P => { const b = new T.Group(); P.j.spine.add(b); b.position.set(0, .4, -.24); b.rotation.x = .12;
    rb(.25, .18, .01, .006, M('#2E3440', {roughness: .5}), 0, 0, 0, b); mesh(GP, new T.MeshStandardMaterial({map: tx, roughness: .3}), 0, 0, -.0056, b, {r: [0, PI, 0], s: [.24, .17, 1], cast: false});
    b.visible = false; MINI.push(b); }); }

/* =====================================================================
   КАМЕРА РАКУРСТАРЫ
   ===================================================================== */
const UP = V(0, 1, 0), DN = V(0, 0, -1);
const SHOTS = X.SHOTS = {
  ext0:     {pos: [-31, .75, 23], look: [-4.8, 4.4, -3.5], fov: 44},
  ext:      {pos: [-25.5, 1.4, 16.5], look: [-4.8, 3.6, -2.2], fov: 44, coc: .03},
  wide:     {pos: [-3.45, 2.14, 3.55], look: [.9, 1.0, -2.9], fov: 58, coc: .15},
  board:    {pos: [-.35, 1.42, -1.6], look: [-.6, 1.42, -3.95], fov: 50, coc: .35},
  ayaru:    {pos: [-3.05, .97, -.18], look: [-2.72, .9, .78], fov: 32, coc: 1.4, drift: 0, push: 0},
  erasyl:   {pos: [-1.6, .99, -.2], look: [-1.72, .92, .8], fov: 32, coc: 1.4},
  ayaruC:   {pos: [-2.96, .95, -.16], look: [-2.7, .86, .8], fov: 34, coc: 1.4},
  teacher:  {pos: [-.2, 1.45, -1.8], look: [.2, 1.5, -3.35], fov: 36, coc: 1.0},
  topdesk:  {pos: [-1.95, 2.35, .42], look: [-1.95, .62, .44], fov: 52, up: DN, coc: .2, drift: 0, push: 0},
  underdesk:{pos: [-2.47, .3, .21], look: [-2.72, .57, .64], fov: 62, coc: .7, drift: 0, push: 0},
  front:    {pos: [1.4, 1.72, -3.4], look: [-.7, .8, 2.2], fov: 60, coc: .12},
  window:   {pos: [-3.85, 1.62, .35], look: [-9.8, -.3, -.7], fov: 52, coc: .05},
  backwall: {pos: [-.1, 1.55, .35], look: [-.1, 1.62, 4.0], fov: 62, coc: .1},
  notebook: {pos: [-2.68, 1.14, .5], look: [-2.66, .62, .38], fov: 42, coc: .6, drift: 0, push: 0},
  extwide:  {pos: [-48, 14, 30], look: [-4.8, 3.6, -5], fov: 38, coc: 0},
  portrait: {pos: [3.0, 1.72, .3], look: [4.46, 1.74, .45], fov: 38, coc: .7},
  boardudl: {pos: [.55, 1.48, -1.2], look: [.85, 1.5, -3.95], fov: 52, coc: .25},
  side:     {pos: [-1.2, 1.12, .08], look: [-2.45, .78, .62], fov: 46, coc: .7},
  numwall:  {pos: [.75, 1.85, -2.35], look: [.4, 2.42, -3.95], fov: 46, coc: .5},
  boardsteps:{pos: [-.35, 1.45, -1.6], look: [-.35, 1.45, -3.95], fov: 50, coc: .3},
  teacherdesk:{pos: [2.05, 1.35, -1.85], look: [2.62, .82, -2.72], fov: 44, coc: .9},
  cards:    {pos: [-3.22, 1.16, .96], look: [-2.93, .62, .36], fov: 42, coc: 1.1},
  clock:    {pos: [2.25, 2.0, -2.55], look: [3.0, 2.55, -3.96], fov: 30, coc: .9},
  boardtri: {pos: [.2, 1.48, -1.7], look: [-.3, 1.5, -3.95], fov: 48, coc: .35},
  minicl:   {pos: [-.08, 1.0, -1.88], look: [-.1, .9, -.98], fov: 38, coc: 1.1},
  miniboards:{pos: [.4, 2.35, -3.55], look: [-.5, .95, 1.2], fov: 58, coc: .1},
  pair:     {pos: [-2.75, 1.08, -.4], look: [-2.95, .74, .62], fov: 48, coc: .9},
  overhead: {pos: [-2.4, 1.8, .74], look: [-2.4, .62, .76], fov: 50, up: DN, coc: .2},
  journal:  {pos: [3.3, 1.32, -2.42], look: [3.22, .77, -2.8], fov: 40, coc: .8},
  evening:  {pos: [.75, 1.55, .25], look: [2.15, 1.0, -2.8], fov: 50, coc: .4},
  sunset:   {pos: [3.7, 1.85, 3.4], look: [-2.2, .95, -1.4], fov: 60, coc: .15},
  topdesk2: {pos: [-2.0, 1.95, .42], look: [-2.0, .62, .44], fov: 50, up: DN, coc: .25, drift: 0, push: 0},
  night:    {pos: [-52, 7, -38], look: [-4.8, 3.2, -.2], fov: 34, coc: 0},
};
for (const s of Object.values(SHOTS)) { s.p = V(...s.pos); s.l = V(...s.look); s.u = s.up || UP; s.focus = s.focus || s.p.distanceTo(s.l); s.coc = s.coc || 0; }
X.UP = UP; X.DN = DN;
X.setCam = (pos, look, fov, up = UP) => { cam.position.copy(pos); cam.up.copy(up); cam.lookAt(look); cam.fov = fov; cam.aspect = W / H;
  cam.near = pos.x < -5.2 ? Math.min(.6, .05 + (-5.2 - pos.x) * .08) : .025; cam.updateProjectionMatrix(); sky.position.copy(pos); };

/* =====================================================================
   ҚОЗҒАЛЫС (АНИМАЦИЯ) КӨМЕКШІЛЕРІ
   ===================================================================== */
X.world = {sky, sun, hemi, lampA, lampB, bounce, deskLight, DUST, CLOCK, TENF, ABACUS, AAC, AACB, DLINE, MINI, openCasement, OUT, CLOUDS, TREES, JOURNAL, STREETMAT, WINGLASS, LAMPMAT, AY, ER, DZ, DESK_Y, TD};
X.tick = (gt) => {   // жалпы уақытқа тәуелді ұсақ қозғалыстар
  DUST.material.uniforms.uT.value = gt; skyU.time.value = gt;
  TREES.forEach(g => { g.rotation.z = Math.sin(gt * .9 + g.userData.sway) * .015; g.rotation.x = Math.sin(gt * .7 + g.userData.sway * 2) * .012; });
  CLOUDS.forEach(c => { c.position.z = ((c.userData.z0 ??= c.position.z) + gt * c.userData.v * 1.4 + 230) % 460 - 230; });
};
X.dustLevel = v => { DUST.material.uniforms.uI.value = v; DUST.material.uniforms.uCol.value.copy(TODNOW ? TODNOW.sun : col('#FFE9CF')); };
X.mountPortrait = () => {
  const im = X.imgs.rose; if (!im) return;
  const c = canvas(400, 500), g = c.getContext('2d'); g.drawImage(im, 440, 0, 400, 500, 0, 0, 400, 500);
  mesh(GP, new T.MeshStandardMaterial({map: ctex(c), roughness: .5}), 4.432, 1.78, .45, room, {r: [0, -PI / 2, 0], s: [.52, .65, 1], cast: false});
};
X.finish = () => { mergeStatic(); };
})();
