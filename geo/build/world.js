/* =====================================================================
   ЖЕРДІҢ ТӨРТ ҚАБЫҒЫ · 3D ӘЛЕМ (three.js r149)
   Екі сахна бір әлемде:
     SPACE  — ғарыштағы Жер: текстура, бұлт, атмосфера жарығы, кесілген сына,
              тақта шекаралары, Қазақстан, озон қабаты, тіршілік толқыны
     GROUND — диорама-ландшафт: мұхит, жанартау қимасы, жазық, көл, өзен, тау,
              мұздық, орман, киіктер, бұлт, жаңбыр, атмосфера «лифті»
   Рендер: HDR → bloom → DOF → ACES → түс түзету. Бәрі детерминистік: кадр уақыттан ғана тәуелді.
   ===================================================================== */
'use strict';
(() => {
const T = THREE;
const X = window.GEO = {T};
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
const V = (x, y, z) => new T.Vector3(x, y, z);
const lin = h => new T.Color(h).convertSRGBToLinear();   // sRGB → сызықтық (рендер сызықтық кеңістікте)
const PAL = {ink: '#0A0F1C', chalk: '#F4F1EA', sun: '#F7C548', litho: '#E9874E', hydro: '#3FA7F0', atmo: '#A88BFF', bio: '#5FD08A'};
Object.assign(X, {PI, TAU, clamp, lerp, ss, bump, E, rng, V, lin, PAL});

/* ---------------------------------------------------------------- шу функциялары (JS) */
const _perm = (() => { const r = rng(7), p = Array.from({length: 256}, (_, i) => i); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p.concat(p); })();
const _g2 = (h, x, y) => { const a = (h & 7) * PI / 4; return Math.cos(a) * x + Math.sin(a) * y; };
function noise2(x, y) {   // Перлин шуы, [-1, 1]
  const X0 = Math.floor(x), Y0 = Math.floor(y), xf = x - X0, yf = y - Y0, xi = X0 & 255, yi = Y0 & 255;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const aa = _perm[_perm[xi] + yi], ab = _perm[_perm[xi] + yi + 1], ba = _perm[_perm[xi + 1] + yi], bb = _perm[_perm[xi + 1] + yi + 1];
  return lerp(lerp(_g2(aa, xf, yf), _g2(ba, xf - 1, yf), u), lerp(_g2(ab, xf, yf - 1), _g2(bb, xf - 1, yf - 1), u), v) * 1.4;
}
const fbm = (x, y, o = 5) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); f *= 2.03; a *= .5; } return s; };
const ridged = (x, y, o = 5) => { let s = 0, a = .5, f = 1, w = 1; for (let i = 0; i < o; i++) { let n = 1 - Math.abs(noise2(x * f, y * f)); n *= n; s += n * a * w; w = clamp(n * 1.6); f *= 2.1; a *= .5; } return s; };
Object.assign(X, {noise2, fbm, ridged});
// GLSL шу кітапханасы (шейдерлерге ортақ)
const GLN = `
float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float h31(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm2(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
`;
X.GLN = GLN;

/* ---------------------------------------------------------------- материалдар, канвас, геометрия */
const _mc = new Map();
function M(c, o = {}) {
  const k = c + '|' + JSON.stringify(o); let m = _mc.get(k);
  if (!m) { const p = {...o}; if (p.emissive) p.emissive = lin(p.emissive);
    m = new T.MeshStandardMaterial({color: lin(c), roughness: .8, metalness: 0, ...p}); _mc.set(k, m); }
  return m;
}
const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function ctex(c, o = {}) { const t = new T.CanvasTexture(c); t.encoding = o.srgb === false ? T.LinearEncoding : T.sRGBEncoding; t.anisotropy = 8;
  if (o.rep) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(o.rep[0], o.rep[1]); } return t; }
X.M = M; X.canvas = canvas; X.ctex = ctex;
const GS = new T.SphereGeometry(1, 28, 18), GSL = new T.SphereGeometry(1, 14, 10), GB = new T.BoxGeometry(1, 1, 1), GC = new T.CylinderGeometry(1, 1, 1, 18);
const _cap = new Map();
const cap = (r, l) => { const k = r + ',' + l; if (!_cap.has(k)) _cap.set(k, new T.CapsuleGeometry(r, l, 6, 14)); return _cap.get(k); };
function rbox(w, h, d, r) { const s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new T.ExtrudeGeometry(s, {depth: d, bevelEnabled: false, curveSegments: 4}); g.translate(0, 0, -d / 2); return g; }
function mesh(geo, mat, x, y, z, parent, o = {}) {
  const m = new T.Mesh(geo, mat); m.position.set(x, y, z);
  if (o.s) m.scale.set(...o.s); if (o.r) m.rotation.set(...o.r);
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; if (parent) parent.add(m); return m;
}
// бірнеше геометрияны бір буферге біріктіру (позиция, нормаль, түс)
function merge(list) {
  let n = 0; const parts = list.map(([g, m4, c]) => { const gg = g.index ? g.toNonIndexed() : g.clone(); if (m4) gg.applyMatrix4(m4); n += gg.attributes.position.count; return [gg, c]; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const [g, c] of parts) { const k = g.attributes.position.count; P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
    const cc = lin(c); for (let i = 0; i < k; i++) { C[(o + i) * 3] = cc.r; C[(o + i) * 3 + 1] = cc.g; C[(o + i) * 3 + 2] = cc.b; } o += k; }
  const G = new T.BufferGeometry(); G.setAttribute('position', new T.BufferAttribute(P, 3)); G.setAttribute('normal', new T.BufferAttribute(N, 3)); G.setAttribute('color', new T.BufferAttribute(C, 3));
  G.computeBoundingSphere(); return G;
}
const m4 = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new T.Matrix4().compose(V(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), V(sx, sy, sz));
Object.assign(X, {mesh, merge, m4, rbox});

/* ---------------------------------------------------------------- сахна, камера */
const scene = X.scene = new T.Scene();
const cam = X.cam = new T.PerspectiveCamera(40, 16 / 9, .02, 3000);
const SPACE = X.SPACE = new T.Group(), GROUND = X.GROUND = new T.Group();
scene.add(SPACE, GROUND);
X.setSet = s => { SPACE.visible = s === 'space'; GROUND.visible = s === 'ground'; X.SET = s; };

/* ---------------------------------------------------------------- рендерер және post */
let R, W = 1600, H = 900, MSAA = 4;
const rt = X.rt = {};
const mk = (w, h, o) => new T.WebGLRenderTarget(Math.max(2, w | 0), Math.max(2, h | 0), Object.assign({minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false, stencilBuffer: false, generateMipmaps: false}, o));
function alloc() {
  Object.values(rt).forEach(r => r.dispose());
  const HF = T.HalfFloatType, w2 = W >> 1, h2 = H >> 1;
  rt.hdr = mk(W, H, {type: HF, depthBuffer: true, samples: MSAA});
  rt.dep = mk(w2, h2, {type: HF, depthBuffer: true});
  rt.q1 = mk(w2, h2, {type: HF}); rt.q1b = mk(w2, h2, {type: HF});
  rt.q2 = mk(W >> 2, H >> 2, {type: HF}); rt.q2b = mk(W >> 2, H >> 2, {type: HF});
  rt.q3 = mk(W >> 3, H >> 3, {type: HF}); rt.q3b = mk(W >> 3, H >> 3, {type: HF});
  for (const k of ['A', 'B', 'C']) rt[k] = mk(W, H, {});
  PU.uPx.value.set(1 / W, 1 / H); PU.uFx.value = MSAA ? 0 : 1;
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
gl_FragColor=vec4(min(c*.25,vec3(60.)),1.);}`, {t: {value: null}, px: {value: new T.Vector2()}});
const mBlur = sm(`uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;
void main(){vec3 c=texture2D(t,vUv).rgb*.227027;c+=(texture2D(t,vUv+dir*1.384615).rgb+texture2D(t,vUv-dir*1.384615).rgb)*.316216;
c+=(texture2D(t,vUv+dir*3.230769).rgb+texture2D(t,vUv-dir*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}`, {t: {value: null}, dir: {value: new T.Vector2()}});
const down = (s, d) => { mDown.uniforms.t.value = s.texture; mDown.uniforms.px.value.set(1 / s.width, 1 / s.height); pass(mDown, d); };
const blur = (a, b, k = 1) => { mBlur.uniforms.t.value = a.texture; mBlur.uniforms.dir.value.set(k / a.width, 0); pass(mBlur, b);
  mBlur.uniforms.t.value = b.texture; mBlur.uniforms.dir.value.set(0, k / a.height); pass(mBlur, a); };
const PU = X.PU = {uPx: {value: new T.Vector2(1 / 1600, 1 / 900)}, uFx: {value: 0}, tC: {value: null}, tB1: {value: null}, tB2: {value: null}, tB3: {value: null}, tD: {value: null},
  uFocus: {value: 3}, uCoc: {value: 0}, uExpo: {value: 1}, uBloom: {value: .3}, uSat: {value: 1.06}, uVig: {value: .5},
  uLift: {value: V(0, 0, 0)}, uGain: {value: V(1, 1, 1)}, uGamma: {value: V(1, 1, 1)}, uTint: {value: V(1, 1, 1)},
  uUnder: {value: 0}, uUndCol: {value: V(.02, .16, .26)}, uTime: {value: 0}, uHaze: {value: 0}, uHazeCol: {value: V(.72, .6, .44)}};
const mComp = sm(`uniform sampler2D tC,tB1,tB2,tB3,tD;uniform float uFocus,uCoc,uExpo,uBloom,uSat,uVig,uFx,uUnder,uTime,uHaze;uniform vec2 uPx;
uniform vec3 uLift,uGain,uGamma,uTint,uUndCol,uHazeCol;varying vec2 vUv;
${GLN}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
const vec3 LW=vec3(.299,.587,.114);float lu(vec3 c){return dot(c/(1.+c),LW);}
vec3 fxaa(vec2 uv){vec3 m=texture2D(tC,uv).rgb;if(uFx<.5)return m;
 vec3 nw=texture2D(tC,uv+vec2(-1.,1.)*uPx).rgb,ne=texture2D(tC,uv+vec2(1.,1.)*uPx).rgb,sw=texture2D(tC,uv+vec2(-1.,-1.)*uPx).rgb,se=texture2D(tC,uv+vec2(1.,-1.)*uPx).rgb;
 float a=lu(nw),b=lu(ne),c=lu(sw),d=lu(se),e=lu(m);float mn=min(e,min(min(a,b),min(c,d))),mx=max(e,max(max(a,b),max(c,d)));
 vec2 dir=vec2(-((a+b)-(c+d)),((a+c)-(b+d)));float red=max((a+b+c+d)*.03125,1./128.);float rcp=1./(min(abs(dir.x),abs(dir.y))+red);dir=clamp(dir*rcp,-8.,8.)*uPx;
 vec3 A=.5*(texture2D(tC,uv+dir*(1./3.-.5)).rgb+texture2D(tC,uv+dir*(2./3.-.5)).rgb);vec3 B=A*.5+.25*(texture2D(tC,uv-dir*.5).rgb+texture2D(tC,uv+dir*.5).rgb);
 float lb=lu(B);return (lb<mn||lb>mx)?A:B;}
void main(){
 vec2 uv=vUv;
 if(uUnder>0.){uv+=vec2(sin(uv.y*22.+uTime*1.7),cos(uv.x*19.+uTime*1.3))*.0022*uUnder;}
 vec3 c=fxaa(uv);
 if(uCoc>0.){float d=texture2D(tD,uv).r;float k=clamp(abs(1./max(d,.03)-1./uFocus)*uCoc,0.,1.);
  vec3 b1=texture2D(tB1,uv).rgb,b2=texture2D(tB2,uv).rgb;c=mix(c,mix(b1,b2,smoothstep(.45,1.,k)),smoothstep(.0,.45,k));}
 vec3 b2=texture2D(tB2,uv).rgb,b3=texture2D(tB3,uv).rgb;
 vec3 gl=b2*.4+b3*.6;float lg=dot(gl,vec3(.2126,.7152,.0722));c+=gl*(max(lg-.9,0.)/max(lg,1e-4))*uBloom+gl*uBloom*.03;
 if(uUnder>0.){float dpt=1.-uv.y;vec3 w=uUndCol*(1.2-dpt*.6);float ca=pow(max(0.,sin(uv.x*40.+fbm2(uv*6.+uTime*.3)*6.)*.5+.5),8.)*(1.-dpt)*.25;
  c=mix(c,c*vec3(.35,.75,.95)+w,uUnder*.85)+ca*uUnder*vec3(.6,.9,1.);}
 if(uHaze>0.){float n=fbm2(uv*vec2(3.,2.)+vec2(uTime*.05,0.));c=mix(c,uHazeCol*(.7+.5*n),uHaze*(.55+.35*n));}
 c*=uExpo*uTint; c=aces(c); c=pow(c,vec3(1./2.2));
 c=uGain*(c+uLift*(1.-c)); c=pow(max(c,0.),uGamma); c=mix(c,c*c*(3.-2.*c),.22);
 float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,uSat);
 vec2 q=vUv-.5; c*=1.-uVig*dot(q,q)*1.7;
 gl_FragColor=vec4(c,1.);}`, PU);
const depthMat = new T.ShaderMaterial({vertexShader: `varying float vD;
#include <common>
void main(){
#include <begin_vertex>
#include <project_vertex>
vD=-mvPosition.z;}`, fragmentShader: 'varying float vD;void main(){gl_FragColor=vec4(vD,0.,0.,1.);}'});
const NODEPTH = X.NODEPTH = [];
const _cc = new T.Color();
X.renderShot = target => {
  R.shadowMap.needsUpdate = GROUND.visible;
  R.setClearColor(0x000000, 1); R.setRenderTarget(rt.hdr); R.render(scene, cam);
  if (PU.uCoc.value > .001) {
    NODEPTH.forEach(o => { o.userData.v = o.visible; o.visible = false; });
    scene.overrideMaterial = depthMat; R.setClearColor(_cc.setRGB(5000, 0, 0), 1);
    R.setRenderTarget(rt.dep); R.render(scene, cam); scene.overrideMaterial = null; R.setClearColor(0x000000, 1);
    NODEPTH.forEach(o => { o.visible = o.userData.v; });
  }
  down(rt.hdr, rt.q1); blur(rt.q1, rt.q1b); down(rt.q1, rt.q2); blur(rt.q2, rt.q2b, 1.2); down(rt.q2, rt.q3); blur(rt.q3, rt.q3b, 1.6);
  PU.tC.value = rt.hdr.texture; PU.tB1.value = rt.q1.texture; PU.tB2.value = rt.q2.texture; PU.tB3.value = rt.q3.texture; PU.tD.value = rt.dep.texture;
  pass(mComp, target);
};
X.init3 = (cv, o = {}) => {
  R = X.R = new T.WebGLRenderer({canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserve});
  R.setPixelRatio(1); R.shadowMap.enabled = true; R.shadowMap.type = o.pcf === 'hard' ? T.PCFShadowMap : T.PCFSoftShadowMap; R.shadowMap.autoUpdate = false;
  R.outputEncoding = T.LinearEncoding; R.toneMapping = T.NoToneMapping; R.localClippingEnabled = true;
  if (o.msaa !== undefined) MSAA = o.msaa;
  sun.shadow.mapSize.set(o.shadow || 2048, o.shadow || 2048);
  X.setSize(o.w || 1600, o.h || 900);
};
const UP = V(0, 1, 0);
X.setCam = (pos, look, fov, up = UP) => { cam.position.copy(pos); cam.up.copy(up); cam.lookAt(look); cam.fov = fov; cam.aspect = W / H; cam.updateProjectionMatrix(); };

/* ---------------------------------------------------------------- суреттерді жүктеу */
const TEX = X.TEX = {};
X.loadAssets = async IMG => {
  const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const ent = await Promise.all(Object.entries(IMG).map(async ([k, v]) => [k, await load(v)]));
  for (const [k, im] of ent) { const t = new T.Texture(im); t.needsUpdate = true; t.anisotropy = 8; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true; TEX[k] = t; }
  X.buildSpace(); X.buildGround();
};

/* =====================================================================
   SPACE — ҒАРЫШТАҒЫ ЖЕР
   ===================================================================== */
const RE = X.RE = 10;   // Жердің радиусы (әлем бірлігі)
// lon/lat → 3D (SphereGeometry UV-іне сәйкес: λ=0 → +X, λ=+90° → −Z)
const ll = X.ll = (lon, lat, r = RE) => { const a = lon * PI / 180, b = lat * PI / 180; return V(r * Math.cos(b) * Math.cos(a), r * Math.sin(b), -r * Math.cos(b) * Math.sin(a)); };
const SU = X.SU = {   // ғарыш сахнасына ортақ uniform-дар
  uSun: {value: V(1, .25, .35).normalize()}, uTime: {value: 0}, uBio: {value: 0}, uBioF: {value: 0}, uBioSeed: {value: ll(67, 48, 1)},
  uKz: {value: 0}, uWater: {value: 0}, uOzone: {value: 0}, uCloud: {value: 1}, uNight: {value: 1}, uAtm: {value: 1}, uLith: {value: 0}, uCut: {value: 0},
};
// октант кесігі: x>0, y>0, z>0 бөлігі «торт кесігіндей» суырылып, ұшып кетеді (k: 0 — жабық, 1 — толық ашық)
const cutPlanes = [new T.Plane(V(-1, 0, 0), 0), new T.Plane(V(0, -1, 0), 0), new T.Plane(V(0, 0, -1), 0)];
const keepBase = [new T.Plane(V(1, 0, 0), 0), new T.Plane(V(0, 1, 0), 0), new T.Plane(V(0, 0, 1), 0)], keepPlanes = keepBase.map(p => p.clone());
const PIECE_DIR = V(1, 1.05, 1).normalize();
let cutOn = null;
X.setCut = k => {
  SU.uCut.value = k; const on = k > .001;
  if (on !== cutOn) { cutOn = on; for (const m of CUTMATS) { m.clippingPlanes = on ? cutPlanes : null; m.needsUpdate = true; } }
  if (!CUT.faces) return;
  CUT.faces.forEach(f => f.visible = on);
  const P = CUT.piece; P.visible = on && k < .999;
  if (P.visible) { const e = E.io3(Math.min(1, k)); P.position.copy(PIECE_DIR).multiplyScalar(e * 26); P.rotation.set(e * .5, -e * .9, e * .3); P.updateMatrixWorld(true);
    keepPlanes.forEach((pl, i) => pl.copy(keepBase[i]).applyMatrix4(P.matrixWorld)); }
};
const CUTMATS = [], CUT = X.CUT = {};
const CLIPV = '\n#include <clipping_planes_pars_vertex>\n', CLIPVM = '\n#include <clipping_planes_vertex>\n', CLIPF = '\n#include <clipping_planes_pars_fragment>\n', CLIPFM = '\n#include <clipping_planes_fragment>\n';

X.buildSpace = () => {
  /* --- Жер --- */
  for (const k of ['day', 'night', 'clouds', 'mask']) if (TEX[k]) { TEX[k].wrapS = T.RepeatWrapping; }
  const earthMat = new T.ShaderMaterial({clipping: true, clipIntersection: true, uniforms: Object.assign({tDay: {value: TEX.day}, tNight: {value: TEX.night}, tCl: {value: TEX.clouds}, tMask: {value: TEX.mask}, uCloudRot: {value: 0}}, SU),
    vertexShader: `varying vec2 vUv;varying vec3 vN,vW;${CLIPV}
void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;${CLIPVM}}`,
    fragmentShader: `uniform sampler2D tDay,tNight,tCl,tMask;uniform vec3 uSun,uBioSeed;uniform float uTime,uBio,uBioF,uKz,uWater,uCloudRot,uCloud,uNight;varying vec2 vUv;varying vec3 vN,vW;
${CLIPF}${GLN}
void main(){${CLIPFM}
 vec3 n=normalize(vN);vec3 v=normalize(cameraPosition-vW);vec3 L=normalize(uSun);
 float nl=dot(n,L);float day=smoothstep(-.12,.22,nl);
 vec3 dc=pow(texture2D(tDay,vUv).rgb,vec3(2.2));
 vec4 mk=texture2D(tMask,vUv);float land=mk.r;float water=1.-land;
 // бұлт көлеңкесі
 vec2 cuv=vUv+vec2(uCloudRot,0.);float csh=texture2D(tCl,cuv+L.xz*.0015).r*uCloud;
 vec3 col=dc*(.06+1.25*max(nl,0.))*(1.-csh*.55);
 // су жарқылы
 vec3 h=normalize(L+v);float sp=pow(max(dot(n,h),0.),90.)*water*day;col+=vec3(1.,.93,.8)*sp*2.2;
 // мұхитты бөлектеу (гидросфера)
 col=mix(col,col*vec3(.55,.9,1.4)+vec3(.0,.03,.09)*day,water*uWater);
 // түнгі қалалар
 vec3 nc=pow(texture2D(tNight,vUv).rgb,vec3(2.2));col+=nc*vec3(1.,.75,.45)*1.6*(1.-day)*uNight;
 // атмосфералық шашырау (жиегінде көгілдір)
 float fr=pow(1.-max(dot(n,v),0.),3.);col=mix(col,vec3(.3,.55,1.)*(.15+day*.9),fr*.55*(.3+day));
 // Қазақстан
 float kz=mk.g;col=mix(col,col*1.25+vec3(.35,.24,.05)*(.25+day*.5),kz*uKz*.75);
 // тіршілік толқыны (биосфера)
 if(uBio>0.){float grn=clamp((dc.g-max(dc.r,dc.b)*.92)*9.,0.,1.)*land;float ang=acos(clamp(dot(n,normalize(uBioSeed)),-1.,1.));
  float front=smoothstep(uBioF,uBioF-.25,ang);float edge=exp(-pow((ang-uBioF)*9.,2.));
  float pl=water*smoothstep(.55,.8,fbm2(vUv*vec2(60.,30.)+uTime*.05))*(.5+.5*day)*.45;
  col+=(vec3(.12,.85,.35)*grn*(.4+.6*day)*1.6+vec3(.05,.55,.5)*pl*.6)*front*uBio+vec3(.4,1.,.5)*edge*uBio*.5*(land*.8+.2);}
 gl_FragColor=vec4(col,1.);}`});
  CUTMATS.push(earthMat);
  const EARTH = X.EARTH = new T.Mesh(new T.SphereGeometry(RE, 160, 96), earthMat); SPACE.add(EARTH);
  /* --- бұлттар --- */
  const cloudMat = new T.ShaderMaterial({clipping: true, clipIntersection: true, transparent: true, depthWrite: false, uniforms: Object.assign({tCl: {value: TEX.clouds}, uCloudRot: {value: 0}}, SU),
    vertexShader: `varying vec2 vUv;varying vec3 vN,vW;${CLIPV}void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;${CLIPVM}}`,
    fragmentShader: `uniform sampler2D tCl;uniform vec3 uSun;uniform float uCloudRot,uCloud;varying vec2 vUv;varying vec3 vN,vW;${CLIPF}
void main(){${CLIPFM}vec3 n=normalize(vN);float nl=dot(n,normalize(uSun));float a=texture2D(tCl,vUv+vec2(uCloudRot,0.)).r;a=smoothstep(.12,.85,a)*uCloud;
 float d=smoothstep(-.2,.3,nl);vec3 c=mix(vec3(.02,.025,.04),vec3(1.,.98,.95)*1.15,d);c=mix(c,vec3(1.,.6,.35),exp(-pow(nl*6.,2.))*.6);
 gl_FragColor=vec4(c,a*.95);}`});
  CUTMATS.push(cloudMat);
  const CLOUDS = X.CLOUDS = new T.Mesh(new T.SphereGeometry(RE * 1.012, 128, 72), cloudMat); SPACE.add(CLOUDS); NODEPTH.push(CLOUDS);
  /* --- атмосфера жарығы (жиек) --- */
  const atmMat = new T.ShaderMaterial({clipping: true, clipIntersection: true, transparent: true, depthWrite: false, side: T.BackSide, blending: T.AdditiveBlending, uniforms: SU,
    vertexShader: `varying vec3 vN,vW;${CLIPV}void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;${CLIPVM}}`,
    fragmentShader: `uniform vec3 uSun;uniform float uAtm,uOzone,uBio;varying vec3 vN,vW;${CLIPF}
void main(){${CLIPFM}vec3 n=normalize(vN);vec3 v=normalize(cameraPosition-vW);float rim=pow(clamp(1.+dot(n,v)*1.04,0.,1.),2.6);
 float nl=dot(-n,normalize(uSun));float d=smoothstep(-.35,.35,nl);
 vec3 c=mix(vec3(.03,.07,.22),vec3(.22,.55,1.45),d)+vec3(1.1,.45,.15)*exp(-pow(nl*4.5,2.))*.18;
 c=mix(c,vec3(.75,.45,1.6),uOzone*.6);c=mix(c,vec3(.35,1.3,.55),uBio*.35);
 gl_FragColor=vec4(c*rim*1.25*uAtm,1.);}`});
  CUTMATS.push(atmMat);
  const ATM = X.ATM = new T.Mesh(new T.SphereGeometry(RE * 1.06, 96, 64), atmMat); SPACE.add(ATM); NODEPTH.push(ATM);
  /* --- озон қабаты (жұқа күлгін қабық) --- */
  const ozMat = new T.ShaderMaterial({transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: SU,
    vertexShader: 'varying vec3 vN,vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float uOzone,uTime;varying vec3 vN,vW;${GLN}
void main(){vec3 n=normalize(vN);vec3 v=normalize(cameraPosition-vW);float rim=pow(1.-abs(dot(n,v)),2.2);float sh=.55+.45*fbm3(n*6.+vec3(0.,uTime*.08,0.));
 gl_FragColor=vec4(vec3(.55,.32,1.)*pow(rim,1.6)*1.5*sh*uOzone,1.);}`});
  const OZONE = X.OZONE = new T.Mesh(new T.SphereGeometry(RE * 1.03, 96, 64), ozMat); SPACE.add(OZONE); NODEPTH.push(OZONE);
  /* --- жұлдыздар --- */
  { const n = 6000, r = rng(11), P = new Float32Array(n * 3), C = new Float32Array(n * 3), S = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u), d = 900;
      P.set([Math.cos(a) * s * d, u * d, Math.sin(a) * s * d], i * 3);
      const t = r(), c = t < .15 ? [1, .78, .6] : t < .35 ? [.7, .82, 1] : [1, 1, 1], b = .25 + Math.pow(r(), 6) * 3.5;
      C.set(c.map(x => x * b), i * 3); S[i] = 1 + Math.pow(r(), 5) * 3.2; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('color', new T.BufferAttribute(C, 3)); g.setAttribute('sz', new T.BufferAttribute(S, 1));
    const sm_ = new T.ShaderMaterial({uniforms: {uTime: SU.uTime, uPx: {value: 1}, uA: {value: 1}}, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'attribute float sz;attribute vec3 color;varying vec3 vC;uniform float uTime,uPx,uA;void main(){vC=color*uA*(.75+.25*sin(uTime*1.7+position.x*.13+position.y*.07));vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=sz*uPx;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec3 vC;void main(){vec2 d=gl_PointCoord-.5;float a=smoothstep(.5,0.,length(d));gl_FragColor=vec4(vC*a,1.);}'});
    X.STARS = new T.Points(g, sm_); X.STARS.frustumCulled = false; scene.add(X.STARS); NODEPTH.push(X.STARS); X.STARMAT = sm_; }
  /* --- Күн --- */
  { const c = canvas(256, 256), g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.08, 'rgba(255,250,235,1)'); gr.addColorStop(.2, 'rgba(255,220,160,.55)'); gr.addColorStop(.5, 'rgba(255,170,90,.12)'); gr.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const sp = new T.Sprite(new T.SpriteMaterial({map: ctex(c, {srgb: false}), color: new T.Color(14, 12, 10), transparent: true, depthWrite: false, blending: T.AdditiveBlending}));
    sp.scale.set(46, 46, 1); SPACE.add(sp); X.SUNSPR = sp; NODEPTH.push(sp); }
  /* --- Ай --- */
  { const c = canvas(512, 256), g = c.getContext('2d'), r = rng(5); g.fillStyle = '#8d8a86'; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 900; i++) { const x = r() * 512, y = r() * 256, rr = Math.pow(r(), 3) * 14 + 1; g.fillStyle = `rgba(${r() < .5 ? '60,58,56' : '190,186,180'},${.08 + r() * .18})`; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(70,68,66,.35)'; g.beginPath(); g.ellipse(80 + r() * 350, 60 + r() * 140, 20 + r() * 40, 14 + r() * 26, r() * 3, 0, TAU); g.fill(); }
    X.MOON = mesh(new T.SphereGeometry(2.7, 64, 40), new T.MeshStandardMaterial({map: ctex(c), roughness: 1}), -70, 16, -95, SPACE, {cast: false, recv: false}); }
  /* --- сфера бетіндегі таспа: кесінділерден жалпақ сызық (WebGL-де сызық қалыңдығы жоқ) --- */
  const ribbon = (segs, w, attrs) => { const P = [], A = {}, I = []; for (const k in attrs) A[k] = [];
    for (let i = 0; i < segs.length; i += 2) { const a = segs[i], b = segs[i + 1], d = b.clone().sub(a), n = a.clone().add(b).normalize(), s = d.clone().cross(n).normalize().multiplyScalar(w / 2), base = P.length / 3;
      for (const q of [a.clone().add(s), a.clone().sub(s), b.clone().add(s), b.clone().sub(s)]) P.push(q.x, q.y, q.z);
      for (const k in attrs) { const v = attrs[k][i / 2]; A[k].push(...(Array.isArray(v) ? [v[0], v[0], v[1], v[1]] : [v, v, v, v])); }
      I.push(base, base + 1, base + 2, base + 1, base + 3, base + 2); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); for (const k in A) g.setAttribute(k, new T.Float32BufferAttribute(A[k], 1)); g.setIndex(I); return g; };
  /* --- Қазақстан шекарасы --- */
  { const segs = [], ds = []; let tot = 0;
    for (const r of KZ) { let prev = null; for (let i = 0; i + 1 < r.length; i += 2) { const p = ll(r[i], r[i + 1], RE * 1.0035);
      if (prev) { tot += p.distanceTo(prev); segs.push(prev, p); ds.push(tot - p.distanceTo(prev), tot); } prev = p; } }
    const dd = []; for (let i = 0; i < ds.length; i += 2) dd.push([ds[i] / tot, ds[i + 1] / tot]);
    const g = ribbon(segs, .055, {d: dd});
    const m = new T.ShaderMaterial({uniforms: {uRev: {value: 0}, uA: {value: 0}}, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'attribute float d;varying float vD;void main(){vD=d;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float uRev,uA;varying float vD;void main(){if(vD>uRev)discard;float head=exp(-pow((uRev-vD)*60.,2.));gl_FragColor=vec4(vec3(2.6,1.7,.45)*(1.+head*3.)*uA,1.);}'});
    X.KZLINE = new T.Mesh(g, m); SPACE.add(X.KZLINE); NODEPTH.push(X.KZLINE); X.KZLINE.renderOrder = 3; }
  /* --- литосфералық тақталар шекарасы --- */
  { const segs = [], typ = [], rnd = [], r = rng(3);
    for (const [ty, co] of PLATES) { const ph = r(); let prev = null;
      for (let i = 0; i + 1 < co.length; i += 2) { const p = ll(co[i], co[i + 1], RE * 1.004); if (prev && prev.distanceTo(p) < 2) { segs.push(prev, p); typ.push(ty, ty); rnd.push(ph, ph); } prev = p; } }
    const tyS = [], phS = []; for (let i = 0; i < typ.length; i += 2) { tyS.push(typ[i]); phS.push(rnd[i]); }
    const g = ribbon(segs, .05, {ty: tyS, ph: phS});
    const m = new T.ShaderMaterial({uniforms: {uA: {value: 0}, uTime: SU.uTime}, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'attribute float ty,ph;varying float vT,vP;varying vec3 vW;void main(){vT=ty;vP=ph;vW=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uA,uTime;varying float vT,vP;varying vec3 vW;void main(){vec3 c=mix(vec3(2.4,1.5,.35),vec3(2.8,.55,.25),vT);
 float pulse=.65+.35*sin(uTime*2.2+vP*20.+length(vW)*0.);gl_FragColor=vec4(c*pulse*uA,1.);}`});
    X.PLATES = new T.Mesh(g, m); SPACE.add(X.PLATES); NODEPTH.push(X.PLATES); }
  /* --- сына кесігінің беттері: Жердің ішкі қабаттары --- */
  { const layerMat = new T.ShaderMaterial({side: T.DoubleSide, uniforms: Object.assign({uSel: {value: -1}}, SU),
      vertexShader: 'varying vec3 vP;varying vec3 vW;void main(){vP=position;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `uniform float uTime,uLith,uSel;varying vec3 vP;varying vec3 vW;${GLN}
void main(){float r=length(vP)/${RE.toFixed(1)};vec2 p=vP.xy/${RE.toFixed(1)};float t=uTime;vec3 c;float id;
 // ішкі ядро (r<.2), сыртқы ядро (<.546), төменгі мантия (<.85), жоғарғы мантия (<.968), литосфералық мантия (<.988), қыртыс
 if(r<.2){float f=fbm2(p*20.+t*.05);c=mix(vec3(3.6,3.,1.9),vec3(2.4,1.7,.75),smoothstep(.0,.2,r))*(.9+.2*f);id=4.;}
 else if(r<.546){float f=fbm2(p*7.+vec2(t*.12,-t*.08));c=mix(vec3(1.15,.45,.06),vec3(1.75,.82,.16),f);c*=.85+.25*sin(r*60.-t*1.5+f*6.);id=3.;}
 else if(r<.85){float a=atan(p.y,p.x);vec2 q=vec2(a*3.,r*9.);float f=fbm2(q+vec2(sin(t*.15+r*8.),t*.1));float cell=sin(a*6.+t*.08)*.5+.5;
  c=mix(vec3(.34,.07,.025),vec3(.72,.2,.04),f*.8+cell*.25);id=2.;}
 else if(r<.968){float f=fbm2(p*14.+vec2(t*.05,0.));c=mix(vec3(.62,.2,.045),vec3(.42,.1,.03),f);id=1.;}
 else if(r<.988){float f=n2(p*90.);c=mix(vec3(.16,.14,.12),vec3(.26,.22,.17),f);id=.5;}
 else {float f=n2(p*160.);c=mix(vec3(.42,.3,.2),vec3(.6,.46,.3),f);id=0.;}
 // литосфераны бөлектеу (қыртыс + литосфералық мантия)
 float L=step(.968,r);c=mix(c,c*.5+vec3(1.4,.55,.2)*(.55+.45*sin(t*3.)),L*uLith*.8);
 float edge=smoothstep(.003,.0,abs(r-.2))+smoothstep(.003,.0,abs(r-.546))+smoothstep(.003,.0,abs(r-.85))+smoothstep(.002,.0,abs(r-.968))*1.5+smoothstep(.002,.0,abs(r-.988));
 c+=vec3(1.,.9,.8)*edge*.35;
 if(uSel>=0.&&abs(uSel-id)<.01)c*=1.35;
 gl_FragColor=vec4(c,1.);}`});
    const g = new T.CircleGeometry(RE * .999, 96, 0, PI / 2);
    const quarter = parent => { const a = new T.Mesh(g, layerMat), b = new T.Mesh(g, layerMat), c = new T.Mesh(g, layerMat);
      b.rotation.y = -PI / 2; c.rotation.x = PI / 2; parent.add(a, b, c); return [a, b, c]; };
    CUT.faces = quarter(SPACE); CUT.mat = layerMat;
    // ұшатын бөлік: сол Жер, бірақ тек октант қалады
    const pm = earthMat.clone(); pm.uniforms = earthMat.uniforms; pm.clippingPlanes = keepPlanes; pm.clipIntersection = false;
    CUT.piece = new T.Group(); SPACE.add(CUT.piece); CUT.pieceEarth = new T.Mesh(EARTH.geometry, pm); CUT.piece.add(CUT.pieceEarth);
    CUT.pieceFaces = quarter(CUT.piece); CUT.piece.visible = false; CUT.faces.forEach(f => f.visible = false); }
  /* --- озонға тиетін сәулелер: ультракүлгін (күлгін) тоқтайды, көрінетін жарық (сары) өтеді --- */
  { const n = 46, r = rng(17), rays = [];
    for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * RE * .92; rays.push({a, d, uv: i % 3 !== 0, ph: r(), sp: .55 + r() * .3}); }
    const P = new Float32Array(n * 6), C = new Float32Array(n * 6); const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('color', new T.BufferAttribute(C, 3));
    const m = new T.LineBasicMaterial({vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending});
    X.RAYS = new T.LineSegments(g, m); X.RAYS.frustumCulled = false; SPACE.add(X.RAYS); NODEPTH.push(X.RAYS); X.RAYS.userData.rays = rays;
    const fl = canvas(64, 64), fg = fl.getContext('2d'), gr = fg.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    fg.fillStyle = gr; fg.fillRect(0, 0, 64, 64); const ft = ctex(fl, {srgb: false});
    X.FLASH = Array.from({length: n}, () => { const s = new T.Sprite(new T.SpriteMaterial({map: ft, color: new T.Color(3, 1.6, 6), transparent: true, depthWrite: false, blending: T.AdditiveBlending})); s.scale.set(.6, .6, 1); s.visible = false; SPACE.add(s); NODEPTH.push(s); return s; }); }
};

/* ---------------------------------------------------------------- ғарыш күйі (әр кадрда) */
const _v1 = V(0, 0, 0), _v2 = V(0, 0, 0), _q = new T.Quaternion();
X.spaceTick = (t, o = {}) => {
  SU.uTime.value = t;
  const spin = o.spin ?? 0;   // Жердің айналуы (радиан) — Қазақстан камераға қарай
  X.EARTH.rotation.y = spin; X.CLOUDS.rotation.y = spin + t * .004; if (CUT.pieceEarth) CUT.pieceEarth.rotation.y = spin; X.KZLINE.rotation.y = spin; X.PLATES.rotation.y = spin;
  if (o.sun) SU.uSun.value.copy(o.sun).normalize();
  X.SUNSPR.position.copy(SU.uSun.value).multiplyScalar(600);
  X.SUNSPR.material.color.setRGB(14, 12, 10).multiplyScalar(o.sunI ?? 1);
  SU.uCloud.value = o.cloud ?? 1; SU.uKz.value = o.kz ?? 0; SU.uWater.value = o.water ?? 0; SU.uBio.value = o.bio ?? 0; SU.uBioF.value = o.bioF ?? 0;
  SU.uOzone.value = o.ozone ?? 0; SU.uAtm.value = o.atm ?? 1; SU.uLith.value = o.lith ?? 0; SU.uNight.value = o.night ?? 1;
  X.KZLINE.material.uniforms.uA.value = o.kzLine ?? 0; X.KZLINE.material.uniforms.uRev.value = o.kzRev ?? 1;
  X.PLATES.material.uniforms.uA.value = o.plates ?? 0; X.PLATES.visible = (o.plates ?? 0) > 0; X.KZLINE.visible = (o.kzLine ?? 0) > 0;
  X.OZONE.visible = (o.ozone ?? 0) > 0;
  X.setCut(o.cut ?? 0); CUT.mat.uniforms.uSel.value = o.sel ?? -1;
  X.STARMAT.uniforms.uPx.value = H / 900; X.STARMAT.uniforms.uA.value = 1;
  // сәулелер
  const rays = X.RAYS.userData.rays, P = X.RAYS.geometry.attributes.position, C = X.RAYS.geometry.attributes.color, on = o.rays ?? 0;
  X.RAYS.visible = on > 0;
  if (on > 0) {
    const S = SU.uSun.value, u = V(0, 1, 0).cross(S).normalize(), w = S.clone().cross(u).normalize();
    rays.forEach((ry, i) => {
      const base = u.clone().multiplyScalar(Math.cos(ry.a) * ry.d).addScaledVector(w, Math.sin(ry.a) * ry.d);
      const stopR = ry.uv ? RE * 1.03 : RE * 1.0;
      const b2 = base.lengthSq(), sR = Math.sqrt(Math.max(0, stopR * stopR - b2));   // тоқтайтын нүкте (Күн жақтағы бет)
      const L0 = 46, travel = L0 - sR, ph = (t * ry.sp + ry.ph) % 1.25, head = Math.min(ph, 1) * travel, len = 7;
      const hd = L0 - head, tl = Math.min(L0, hd + len);
      const p1 = base.clone().addScaledVector(S, tl), p2 = base.clone().addScaledVector(S, Math.max(hd, sR));
      P.setXYZ(i * 2, p1.x, p1.y, p1.z); P.setXYZ(i * 2 + 1, p2.x, p2.y, p2.z);
      const fade = (ph > 1 ? 0 : 1) * on, cc = ry.uv ? [1.6, .7, 3.2] : [2.6, 2.1, .9];
      C.setXYZ(i * 2, 0, 0, 0); C.setXYZ(i * 2 + 1, cc[0] * fade, cc[1] * fade, cc[2] * fade);
      const f = X.FLASH[i]; const hit = ph > .97 && ph < 1.12;
      f.visible = hit && on > 0; if (f.visible) { f.position.copy(base).addScaledVector(S, sR); const k = 1 - Math.abs(ph - 1.03) / .1; f.scale.setScalar((ry.uv ? .9 : .5) * Math.max(.2, k));
        f.material.color.setRGB(ry.uv ? 3.2 : 3, ry.uv ? 1.4 : 2.4, ry.uv ? 6 : 1).multiplyScalar(on); }
    });
    P.needsUpdate = C.needsUpdate = true;
  } else X.FLASH.forEach(f => f.visible = false);
};
// кесік беттеріндегі қабаттардың 3D нүктелері (жапсырмалар үшін): A беті z=0, x>0
X.cutPoint = (r, ang = .55) => V(RE * r * Math.cos(ang), RE * r * Math.sin(ang), .02);
// lon бойлығы камераның азимутына қарап тұратындай Жердің бұрылу бұрышы
X.spinFor = (lon, camPos, look = V(0, 0, 0)) => { const d = camPos.clone().sub(look); return -lon * PI / 180 - Math.atan2(d.z, d.x); };

/* =====================================================================
   GROUND — ДИОРАМА-ЛАНДШАФТ (ары қарай: world_ground.js)
   ===================================================================== */
const sun = X.sun = new T.DirectionalLight(0xffffff, 3); sun.castShadow = true;
{ const c = sun.shadow.camera; c.left = -17; c.right = 17; c.top = 14; c.bottom = -14; c.near = 1; c.far = 120; }
sun.shadow.bias = -.0006; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
GROUND.add(sun, sun.target);
const hemi = X.hemi = new T.HemisphereLight(0xbfd8ff, 0x5a4a38, .55); GROUND.add(hemi);
// ғарыштағы жарық (Ай, басқа стандарт материалдар үшін)
const spaceSun = new T.DirectionalLight(0xffffff, 2.2); spaceSun.position.set(60, 15, 21); SPACE.add(spaceSun);
const KZ = window.GEO_KZ || [], PLATES = window.GEO_PLATES || [];
X.defer = [];   // жер сахнасы осыған тіркеледі
})();
