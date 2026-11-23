/* =====================================================================
   GROUND — ДИОРАМА-ЛАНДШАФТ: төрт қабық бір блокта
   Блок: x ∈ [−12, 12] (батыс → шығыс), z ∈ [−8, 8] (оңтүстік → солтүстік, алдыңғы бет = солтүстік), түбі y = −6.
   Батыста мұхит пен субдукция, алдыңғы шетте жартысы кесілген жанартау, ортада көл мен дала,
   шығыста биіктік белдеулері бар тау мен мұздық. Бүйір беттерінде — жер қыртысының қимасы.
   ===================================================================== */
'use strict';
(() => {
const X = window.GEO, T = X.T;
const {PI, TAU, clamp, lerp, ss, bump, E, rng, V, lin, noise2, fbm, ridged, GLN, M, canvas, ctex, mesh, merge, m4, GROUND, NODEPTH, sun, hemi} = X;
const BX = 12, BZ = 8, BOT = -6;
const SPOT = {x: 2.3, z: 5.6};   // балалар тұратын ашық төбе
const VX = -3.4, VZ = 8.0;                 // жанартау (алдыңғы шетте — қимасы көрінеді)
const LAKE = {x: .3, z: 2.7, rx: 2.05, rz: 1.3, lvl: .38};
const FAULT = 2.6, HYPO = V(2.35, -3.1, BZ);   // жарылым және жер сілкінісінің ошағы (алдыңғы бетте)
X.BLOCK = {BX, BZ, BOT, VX, VZ, LAKE, FAULT, HYPO};
const coastX = z => -6.0 + .9 * Math.sin(z * .45 + 1.0) + .35 * Math.sin(z * 1.3 + .4);
X.coastX = coastX;

/* ---------------------------------------------------------------- өзен (тау мұздығынан көлге, көлден мұхитқа) */
const spl = pts => new T.CatmullRomCurve3(pts.map(([x, z]) => V(x, 0, z)), false, 'centripetal');
const RIV = [
  {c: spl([[10.1, -5.4], [9.3, -4.3], [8.2, -3.1], [7.0, -2.0], [5.8, -.9], [4.5, .1], [3.2, 1.2], [2.25, 2.05]]), w0: .09, w1: .24, h0: 4.05, h1: LAKE.lvl + .01},
  {c: spl([[-1.65, 2.5], [-2.8, 2.05], [-4.0, 1.7], [-5.2, 1.35], [-6.6, 1.1], [-7.4, 1.0]]), w0: .2, w1: .3, h0: LAKE.lvl - .02, h1: -.08},
];
for (const r of RIV) { r.pts = r.c.getSpacedPoints(220); r.len = r.c.getLength(); }
// нүктеден өзенге дейінгі ең жақын қашықтық, параметр s және арна түбінің биіктігі
function riverInfo(x, z) {
  let best = {d: 1e9, s: 0, r: null};
  for (const r of RIV) { const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) { const ax = P[i].x, az = P[i].z, bx = P[i + 1].x - ax, bz = P[i + 1].z - az;
      const L2 = bx * bx + bz * bz, t = clamp(((x - ax) * bx + (z - az) * bz) / L2), dx = x - ax - bx * t, dz = z - az - bz * t, d = dx * dx + dz * dz;
      if (d < best.d) best = {d, s: (i + t) / (P.length - 1), r}; } }
  best.d = Math.sqrt(best.d);
  if (best.r) { const r = best.r; best.bed = lerp(r.h0, r.h1, Math.pow(best.s, r === RIV[0] ? .62 : 1)); best.w = lerp(r.w0, r.w1, best.s); }
  return best;
}
X.riverInfo = riverInfo;

/* ---------------------------------------------------------------- биіктік функциясы */
const mtnMask = (x, z) => ss(3.4, 8.4, x + .9 * Math.sin(z * .45)) * (.42 + .58 * ss(7.5, -5.5, z));
function baseH(x, z) {
  let h = .6 + .16 * fbm(x * .11 + 3, z * .11 - 2, 4) + .05 * fbm(x * .55, z * .55, 3);
  const xc = coastX(z);
  // шөл төбешіктері (артқы-сол жақ)
  const des = ss(.5, -3.8, z) * ss(4.2, 1.2, x) * ss(xc + 1.2, xc + 3.2, x);
  if (des > 0) h += des * (.1 + .09 * Math.sin(x * 2.3 + z * .8 + fbm(x * .3, z * .3, 3) * 3.5) + .05 * fbm(x * 1.3, z * 1.3, 3));
  // тау
  const mm = mtnMask(x, z);
  if (mm > 0) { const mx = x + .9 * Math.sin(z * .45); h += mm * (.55 + 6.2 * ridged(x * .16 + 4.1, z * .16 + 1.3, 5) * ss(3.4, 10.5, mx)); }
  // солтүстік қырат
  h += .18 * ss(4.5, 8, z) * (.5 + .5 * fbm(x * .3 + 9, z * .3, 3));
  return h;
}
function H(x, z, ri) {
  let h = baseH(x, z);
  // мұхит: жағалау → қайраң → науа (шұңғыма) → терең түп
  const xc = coastX(z);
  if (x < xc + 1.4) {
    const t = ss(xc + 1.1, xc - .45, x);
    const sea = lerp(-2.0, -.28, ss(xc - 2.5, xc - .35, x)) - .72 * Math.exp(-(((x - (xc - 2.75)) / .7) ** 2)) + .06 * fbm(x * .5, z * .5, 3);
    h = lerp(h, sea, t);
  }
  // жанартау (конус + кратер)
  const dv = Math.hypot(x - VX, z - VZ);
  if (dv < 3.1) { const k = Math.max(0, 1 - dv / 2.95); h += 3.0 * Math.pow(k, 1.5) * (1 + .04 * noise2(x * 3, z * 3)) - .5 * Math.exp(-((dv / .34) ** 2)); }
  // өзен арнасы мен аңғары
  ri = ri || riverInfo(x, z);
  if (ri.d < 3) {
    const bed = ri.bed, w = ri.w;
    const valley = bed + .12 + .55 * ri.d + .35 * ri.d * ri.d;   // V тәрізді аңғар
    if (h > valley) h = lerp(h, valley, ss(3, 0, ri.d) * (ri.r === RIV[0] ? 1 : .6));
    const ch = bed - .07 * ss(w * 1.6, 0, ri.d);
    if (ri.d < w * 2.4) h = Math.min(h, lerp(ch, h, ss(w * .9, w * 2.4, ri.d)));
  }
  // көл
  const e = Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
  if (e < 1.5) { const bed = LAKE.lvl - .42 * (1 - Math.min(e, 1) ** 2) - .02; h = lerp(Math.min(h, bed + (e > 1 ? (e - 1) * .9 : 0)), h, ss(1.0, 1.5, e)); if (e < 1) h = Math.min(h, bed); }
  return h;
}
X.H = H;
const slopeAt = (x, z) => { const e = .06; return Math.hypot(H(x + e, z) - H(x - e, z), H(x, z + e) - H(x, z - e)) / (2 * e); };

/* ---------------------------------------------------------------- түстер (биіктік белдеулері, зоналар) */
const C = {};
for (const [k, h] of Object.entries({forest: '#5C8E3F', fsteppe: '#7A9E4A', steppe: '#B3A85C', dry: '#BFA866', semi: '#BFA673', sand: '#CDAE7C',
  decid: '#5B8C3C', spruce: '#2D5034', alpine: '#7DAD52', rock: '#8C857C', rockD: '#645E58', snow: '#F2F5F8', ice: '#CFE4F2', beach: '#E2CF9F',
  sfloor: '#C2B089', deep: '#46555E', volc: '#3B3431', ash: '#5E5550', moist: '#5E8E44'})) C[k] = lin(h);
const _c = new T.Color(), _d = new T.Color();
// белдеу шекаралары (әлем биіктігі; 1 бірлік ≈ 900 м): дала <0.9 · жапырақты орман/алма <1.8 · шырша <3.1 · альпі <3.8 · тас/қар
const BELT = X.BELT = {steppe: .9, decid: 1.8, spruce: 3.1, alpine: 3.8, snow: 4.05};
function groundColor(x, z, h, sl, ri) {
  const xc = coastX(z);
  if (h < .02 && x < xc + .6) { const d = clamp(-h / 2); return _c.copy(C.sfloor).lerp(C.deep, ss(0, .9, d)); }
  // жазық зоналары: солтүстік (алдыңғы) орманды дала → дала → шөлейт → шөл (артқы)
  const zn = z + 1.2 * fbm(x * .2, z * .2, 3);
  if (zn > 4.6) _c.copy(C.fsteppe).lerp(C.forest, ss(4.6, 7, zn) * .6);
  else if (zn > .6) _c.copy(C.steppe).lerp(C.fsteppe, ss(2.5, 4.6, zn));
  else if (zn > -2.6) _c.copy(C.semi).lerp(C.steppe, ss(-2.6, .6, zn));
  else _c.copy(C.sand).lerp(C.semi, ss(-5, -2.6, zn));
  _c.lerp(C.dry, .15 + .15 * noise2(x * .9, z * .9));
  // тау белдеулері (биіктік бойынша)
  const mm = mtnMask(x, z), bn = .12 * noise2(x * 1.1 + 4, z * 1.1);
  if (mm > .05 && h > BELT.steppe - .15) {
    const hb = h + bn;
    if (hb < BELT.decid) _d.copy(C.decid).lerp(C.fsteppe, .25);
    else if (hb < BELT.spruce) _d.copy(C.spruce);
    else if (hb < BELT.alpine) _d.copy(C.alpine);
    else if (hb < BELT.snow) _d.copy(C.rock).lerp(C.rockD, .4);
    else _d.copy(C.snow);
    _c.lerp(_d, ss(BELT.steppe - .15, BELT.steppe + .2, h) * ss(0, .25, mm));
  }
  // жартас (тік беткей)
  if (sl > .9 && h > .5) _c.lerp(h > BELT.snow + .2 ? C.rock : C.rockD, ss(.9, 1.6, sl) * .85);
  // мұздық (өзеннің басы)
  const gl = Math.hypot(x - 10.6, (z + 6.1) * .8);
  if (h > 3.2 && gl < 2.3) _c.lerp(C.ice, ss(2.3, 1.2, gl) * ss(3.2, 3.7, h));
  // жағажай
  if (x < xc + .9 && h < .14 && h >= .02) _c.lerp(C.beach, ss(.9, .1, x - xc) * .9);
  // өзен мен көл жағасы ылғалды
  if (ri.d < .9 && h < 1.4) _c.lerp(C.moist, ss(.9, .15, ri.d) * .55);
  const e = Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz); if (e < 1.35) _c.lerp(C.moist, ss(1.35, 1.0, e) * .5);
  // жанартау
  const dv = Math.hypot(x - VX, z - VZ);
  if (dv < 3) { _d.copy(C.volc).lerp(C.ash, .5 + .5 * noise2(x * 2, z * 2)); _c.lerp(_d, ss(3, 2.2, dv)); }
  return _c;
}

/* ---------------------------------------------------------------- жер беті (терраин) */
const GU = X.GU = {uTime: {value: 0}, uQuake: {value: 0}, uQ: {value: V(HYPO.x, 0, HYPO.z)}, uQt: {value: 0}, uDry: {value: 0}, uBio: {value: 0},
  uBelt: {value: -1}, uSnowLine: {value: 0}, uSun: {value: V(-.55, .62, .55).normalize()}};
let TER = null;
function buildTerrain() {
  const nx = 240, nz = 160, g = new T.PlaneGeometry(BX * 2, BZ * 2, nx, nz); g.rotateX(-PI / 2);
  const P = g.attributes.position, col = new Float32Array(P.count * 3);
  const HS = X.HSAMP = {nx, nz, h: new Float32Array(P.count)};
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), ri = riverInfo(x, z), h = H(x, z, ri); P.setY(i, h); HS.h[i] = h;
  }
  g.computeVertexNormals();
  const N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), h = P.getY(i), sl = Math.sqrt(1 - N.getY(i) ** 2) / Math.max(N.getY(i), .05);
    const c = groundColor(x, z, h, sl, riverInfo(x, z)); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  const mat = new T.MeshStandardMaterial({vertexColors: true, roughness: .93, metalness: 0});
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, GU);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader = `varying vec3 vWP;uniform float uTime,uQuake,uQt,uDry,uBio,uBelt;uniform vec3 uQ;\n${GLN}\n` + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
 {float e=length(vec2((vWP.x-${LAKE.x.toFixed(2)})/${LAKE.rx.toFixed(2)},(vWP.z-${LAKE.z.toFixed(2)})/${LAKE.rz.toFixed(2)}));
  float salt=uDry*smoothstep(1.02,.55+.45*(1.-uDry),e)*smoothstep(${(LAKE.lvl + .02).toFixed(2)},${(LAKE.lvl - .1).toFixed(2)},vWP.y);
  vec3 sc=mix(vec3(.86,.84,.78),vec3(.96,.95,.92),n2(vWP.xz*14.));diffuseColor.rgb=mix(diffuseColor.rgb,sc,salt);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.05,.92,.75),uDry*.35*smoothstep(3.5,1.,e));}
 if(uBelt>=0.){float lo=uBelt<.5?0.:uBelt<1.5?${BELT.steppe}:uBelt<2.5?${BELT.decid}:uBelt<3.5?${BELT.spruce}:${BELT.alpine};
  float hi=uBelt<.5?${BELT.steppe}:uBelt<1.5?${BELT.decid}:uBelt<2.5?${BELT.spruce}:uBelt<3.5?${BELT.alpine}:9.;
  float inb=smoothstep(lo-.04,lo+.04,vWP.y)*smoothstep(hi+.04,hi-.04,vWP.y)*step(3.,vWP.x);diffuseColor.rgb*=mix(.62,1.18,inb);}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
 if(uQuake>0.){float d=length(vWP.xz-uQ.xz);float fr=uQt*2.6;float ring=exp(-pow((d-fr)*3.2,2.))+.6*exp(-pow((d-fr+.9)*3.2,2.))+.35*exp(-pow((d-fr+1.8)*3.2,2.));
  totalEmissiveRadiance+=vec3(2.2,1.3,.4)*ring*uQuake*smoothstep(9.,0.,d);
  totalEmissiveRadiance+=vec3(3.,1.6,.4)*exp(-d*d*20.)*uQuake*(.6+.4*sin(uTime*14.));}
 if(uBio>0.){float g=clamp((diffuseColor.g-max(diffuseColor.r,diffuseColor.b)*.9)*6.,0.,1.);totalEmissiveRadiance+=vec3(.15,.6,.25)*g*uBio*(.6+.4*sin(uTime*2.+vWP.x*.8));}`);
  };
  TER = X.TER = new T.Mesh(g, mat); TER.receiveShadow = true; TER.castShadow = true; GROUND.add(TER);
}

/* ---------------------------------------------------------------- бүйір беттері: жер қыртысының қимасы (GLSL) */
const SU2 = X.SFACE = {uTime: GU.uTime, uQuake: GU.uQuake, uQt: GU.uQt, uSub: {value: 0}, uAqu: {value: 0}, uMag: {value: .6}, uLith: {value: 0}, uSoil: {value: 0},
  uSel: {value: -1}, uFault: {value: 1}};
const STRATA = `
float coastX(float z){return -6.+.9*sin(z*.45+1.)+.35*sin(z*1.3+.4);}
float mtn(float x,float z){return smoothstep(3.4,8.4,x+.9*sin(z*.45))*(.42+.58*smoothstep(7.5,-5.5,z));}
float cells(vec2 p){vec2 i=floor(p),f=fract(p);float m=9.;for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++){vec2 o=vec2(float(a),float(b));vec2 r=o+vec2(h21(i+o),h21(i+o+7.3))-f;m=min(m,dot(r,r));}return sqrt(m);}
// id: 0 топырақ,1 шөгінді,2 сулы қабат,3 гранит,4 базальт,5 мантия,6 мұхит шөгіндісі,7 мұхит базальты,8 субдукция тақтасы,9 магма,10 жанартау қабаты
vec3 strata(float x,float y,float z,float dep,float top,out float id,out float glow){
 glow=0.;float xc=coastX(z);bool ocean=x<xc-.1&&top<.05;float mm=mtn(x,z);float t=uTime;
 float fw=smoothstep(6.5,7.9,z);   // алдыңғы бетке тән нысандар (жанартау, ошақ)
 // қатпарлану (тау астында) және жарылым бойындағы ығысу
 float yf=y+mm*.6*sin(x*1.15+z*.25+1.)+mm*.25*sin(x*2.7);
 float fxl=${FAULT.toFixed(2)}+(y+1.)*.2;float east=step(fxl,x);yf+=east*.24*uFault;
 vec3 c;id=1.;
 // --- мұхит астындағы қыртыс ---
 if(ocean){ if(dep<.12){c=mix(vec3(.5,.48,.42),vec3(.62,.6,.53),n2(vec2(x*30.,y*60.)));id=6.;}
   else if(dep<1.15){float cl=cells(vec2(x*7.,y*9.));c=mix(vec3(.11,.13,.14),vec3(.22,.25,.26),smoothstep(.15,.5,cl));c*=.85+.3*smoothstep(.0,.08,cl);id=7.;}
   else {c=mix(vec3(.11,.13,.08),vec3(.16,.18,.11),n2(vec2(x*9.,y*9.)));id=5.;} }
 else {
 // --- құрлық қыртысы ---
 float soilT=mix(.07,.22,smoothstep(-6.,6.,z))*(1.-smoothstep(.2,.6,mm))+.02;
 float sedB=-1.75+.3*sin(x*.31+z*.2)+mm*.35;float graB=-3.85-mm*1.6;float moho=-5.25-mm*.6;
 if(dep<soilT){float k=dep/soilT;vec3 chern=vec3(.022,.017,.014),chest=vec3(.1,.07,.045),gray=vec3(.28,.22,.16);
   c=mix(chern,chest,smoothstep(5.,1.,z));c=mix(c,gray,smoothstep(0.,-4.,z));c=mix(c,c*2.2+vec3(.05,.035,.02),smoothstep(.55,1.,k));
   c*=.85+.3*n2(vec2(x*90.,dep*90.));
   float rx=abs(fract(x*7.+fbm2(vec2(x*3.,dep*9.))*1.3)-.5);float root=smoothstep(.035,.0,rx)*smoothstep(.95,.1,k)*step(.5,h21(vec2(floor(x*7.),2.)));
   c=mix(c,vec3(.42,.3,.2),root*.75);
   float st=smoothstep(.985,1.,h21(floor(vec2(x*60.,dep*60.))));c=mix(c,vec3(.5,.46,.4),st*.8);
   float bug=smoothstep(.993,1.,h21(floor(vec2(x*120.,dep*120.)+floor(uTime*.6))));c+=vec3(.45,.9,.4)*bug*uSoil;
   id=0.;}
 else if(y>sedB){float b=floor((yf+10.)*3.1+fbm2(vec2(x*.6,yf))*.7);float r=h21(vec2(b,3.1));
   vec3 s1=vec3(.5,.36,.2),s2=vec3(.3,.25,.2),s3=vec3(.58,.53,.44),s4=vec3(.42,.22,.13),s5=vec3(.44,.33,.23);
   c=r<.2?s1:r<.4?s2:r<.6?s3:r<.8?s4:s5;c*=.88+.2*n2(vec2(x*20.,yf*80.));id=1.;
   // сулы қабат (жерасты суы)
   float aq=step(-1.27,yf)*step(yf,-.95)*smoothstep(xc+.6,xc+1.4,x)*smoothstep(5.,4.,x);
   if(aq>0.){c=mix(vec3(.55,.48,.33),vec3(.4,.55,.62),.4)*(.9+.2*n2(vec2(x*40.,y*40.)));id=2.;
     float fl=smoothstep(.82,.95,n2(vec2((x+t*.55)*7.,y*16.)));c+=vec3(.25,.6,1.2)*fl*uAqu;glow+=fl*uAqu;} }
 else if(y>graB){vec2 gq=vec2(x,y)*38.+vec2(fbm2(vec2(x,y)*3.),fbm2(vec2(y,x)*3.))*1.5;float cl=cells(gq);float sp=h21(floor(gq+.5));
   c=mix(vec3(.46,.36,.32),vec3(.55,.36,.3),step(.5,sp));c=mix(c,vec3(.66,.64,.6),step(.84,sp));c=mix(c,vec3(.08,.07,.07),step(.95,sp));
   c*=.88+.16*smoothstep(.0,.25,cl);id=3.;}
 else if(y>moho){c=mix(vec3(.2,.22,.21),vec3(.29,.31,.29),n2(vec2(x*12.,y*12.)));id=4.;}
 else {c=mix(vec3(.11,.13,.08),vec3(.16,.18,.11),n2(vec2(x*9.,y*9.)));id=5.;}
 // жанартау конусы: лава мен күл қабаттары
 float dv=abs(x-(${VX.toFixed(2)}));
 if(fw>.5&&dv<3.&&y>.25&&dep<3.4){float L=fract(dep*4.2+sin(x*2.)*.2);vec3 lv=mix(vec3(.16,.13,.12),vec3(.42,.37,.34),step(.55,L));c=mix(c,lv,smoothstep(3.,2.2,dv));id=10.;}
 }
 // --- субдукция: мұхит тақтасы материк астына сүңгиді ---
 float xt=xc-2.75;float dx=x-xt;
 if(dx>0.){float ys=-2.72-.26*dx-.055*dx*dx;if(y<ys&&y>ys-.95){float ch=fract((dx*.9-y*.4)*1.6-t*.35*uSub);
   c=mix(vec3(.1,.12,.14),vec3(.17,.2,.22),n2(vec2(dx*8.,y*8.)));float ar=smoothstep(.25,.0,abs(fract(dx*.55-t*.18*uSub)-.5))*smoothstep(.45,.05,abs(y-(ys-.47)));c+=vec3(.35,.55,.9)*ar*uSub*.6;id=8.;}}
 // --- магма: тақтадан көтеріліп, ошаққа жиналады, конус арқылы кратерге ---
 if(fw>.5){vec2 q=vec2((x-(${VX.toFixed(2)}))/.95,(y+3.)/.48);float ch=length(q);float flow=fbm2(vec2(x*3.,y*3.-t*.6));
  float cham=smoothstep(1.,.85,ch);float cw=.07+.03*sin(y*4.+t);float cond=smoothstep(cw,cw*.5,abs(x-(${VX.toFixed(2)})-.08*sin(y*2.5)))*step(-3.,y)*step(y,top-.05);
  float blobs=0.;for(int i=0;i<4;i++){float fi=float(i);float py=mod(t*.45*uMag+fi*.62,2.3);vec2 bp=vec2((${VX.toFixed(2)})+.25*sin(fi*2.3),-5.3+py);blobs+=smoothstep(.2,.05,length((vec2(x,y)-bp)*vec2(1.,1.4)))*step(py,2.1);}
  float m=max(max(cham,cond),blobs);
  if(m>0.){vec3 mc=mix(vec3(1.5,.22,.03),vec3(2.8,.85,.12),flow);c=mix(c,mc*(.4+.6*uMag),m);glow+=m*uMag;id=9.;}}
 // --- жарылым сызығы және ошақтан тараған толқындар ---
 float fl=smoothstep(.028,.008,abs(x-fxl))*step(-4.4,y)*step(y,top-.02);c=mix(c,vec3(.06,.05,.05),fl*.85*uFault);
 if(uQuake>0.&&fw>.5){float d=length(vec2(x,y)-vec2(${HYPO.x.toFixed(2)},${HYPO.y.toFixed(2)}));float fr=uQt*2.6;
  float ring=exp(-pow((d-fr)*4.,2.))+.6*exp(-pow((d-fr+.8)*4.,2.))+.35*exp(-pow((d-fr+1.6)*4.,2.));
  c+=vec3(2.6,1.5,.4)*ring*uQuake*smoothstep(8.,0.,d);c+=vec3(4.,2.2,.6)*exp(-d*d*30.)*uQuake*(.7+.3*sin(t*16.));glow+=ring*uQuake;}
 // мантия түбіндегі жылу
 c+=vec3(.9,.25,.05)*smoothstep(-5.6,-6.,y)*.6;
 return c;}
`;
function buildFaces() {
  const mat = new T.ShaderMaterial({side: T.DoubleSide, uniforms: Object.assign({uLight: {value: 1}}, SU2, {uFaceN: {value: V(0, 0, 1)}, uSunD: GU.uSun}),
    vertexShader: 'attribute float dep;attribute float top;varying float vDep,vTop;varying vec3 vW;void main(){vDep=dep;vTop=top;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float uTime,uQuake,uQt,uSub,uAqu,uMag,uLith,uSoil,uSel,uFault;uniform vec3 uFaceN,uSunD;varying float vDep,vTop;varying vec3 vW;${GLN}${STRATA}
void main(){float id,glow;vec3 c=strata(vW.x,vW.y,vW.z,vDep,vTop,id,glow);
 float lit=.55+.5*max(dot(uFaceN,normalize(uSunD)),0.);c*=lit;
 c*=1.-.35*smoothstep(-5.,-6.,vW.y);c*=.8+.2*smoothstep(0.,.05,vDep);
 if(uSel>=0.){float on=step(abs(id-uSel),.01);if(uSel>4.5&&uSel<5.5)on=max(on,step(abs(id-7.),.01));c=mix(c*.45,c*1.25+vec3(.06),on);}
 if(uSoil>0.){float on=step(id,.5);c=mix(c,c*.55,uSoil*(1.-on)*.6);}
 if(uLith>0.){c=mix(c,c*.55+vec3(.35,.14,.05),uLith*.4);}
 gl_FragColor=vec4(c,1.);}`});
  X.FACEMAT = mat;
  // беттер: [ось бойы, басталуы, соңы, тұрақты координата, нормаль]
  const faces = [
    {axis: 'x', a: -BX, b: BX, k: BZ, n: V(0, 0, 1)}, {axis: 'x', a: BX, b: -BX, k: -BZ, n: V(0, 0, -1)},
    {axis: 'z', a: BZ, b: -BZ, k: -BX, n: V(-1, 0, 0)}, {axis: 'z', a: -BZ, b: BZ, k: BX, n: V(1, 0, 0)},
  ];
  X.FACES = faces.map(f => {
    const n = 480, rows = 2, P = [], D = [], TP = [], I = [];
    for (let i = 0; i <= n; i++) { const s = lerp(f.a, f.b, i / n), x = f.axis === 'x' ? s : f.k, z = f.axis === 'x' ? f.k : s, top = H(x, z);
      for (let j = 0; j <= rows; j++) { const y = lerp(top, BOT, j / rows); P.push(x, y, z); D.push(top - y); TP.push(top); } }
    for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) { const a = i * (rows + 1) + j, b = a + rows + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('dep', new T.Float32BufferAttribute(D, 1));
    g.setAttribute('top', new T.Float32BufferAttribute(TP, 1)); g.setIndex(I); g.computeVertexNormals();
    const m = mat.clone(); m.uniforms = Object.assign({}, mat.uniforms, {uFaceN: {value: f.n}});
    const me = new T.Mesh(g, m); GROUND.add(me); return me;
  });
  // түбі
  mesh(new T.PlaneGeometry(BX * 2, BZ * 2), M('#1a1210', {roughness: 1}), 0, BOT, 0, GROUND, {r: [PI / 2, 0, 0], cast: false});
}

/* ---------------------------------------------------------------- су: мұхит беті, көл, өзен, су бағанының қимасы */
const WU = X.WU = {uTime: GU.uTime, uSun: GU.uSun, uLevel: {value: 0}, uHi: {value: 0}};
const WATER_FS = `uniform float uTime,uHi;uniform vec3 uSun;varying vec3 vW;varying float vDep;${GLN}
vec3 wn(vec2 p){float t=uTime;float e=.05;
 float h0=fbm2(p*.9+vec2(t*.07,t*.05))+.5*n2(p*3.+vec2(-t*.25,t*.18));
 float hx=fbm2((p+vec2(e,0.))*.9+vec2(t*.07,t*.05))+.5*n2((p+vec2(e,0.))*3.+vec2(-t*.25,t*.18));
 float hz=fbm2((p+vec2(0.,e))*.9+vec2(t*.07,t*.05))+.5*n2((p+vec2(0.,e))*3.+vec2(-t*.25,t*.18));
 return normalize(vec3(-(hx-h0)/e*.35,1.,-(hz-h0)/e*.35));}
void main(){vec3 n=wn(vW.xz);vec3 v=normalize(cameraPosition-vW);float fr=.04+.96*pow(1.-max(dot(n,v),0.),5.);
 float d=vDep;vec3 sh=vec3(.12,.62,.62),dp=vec3(.012,.09,.2);vec3 c=mix(sh,dp,smoothstep(0.,1.6,d));
 vec3 sky=mix(vec3(.55,.75,.95),vec3(.25,.45,.8),clamp(n.y,0.,1.));c=mix(c,sky,fr*.7);
 vec3 h=normalize(normalize(uSun)+v);c+=vec3(1.,.95,.85)*pow(max(dot(n,h),0.),160.)*3.;
 float foam=smoothstep(.09,.0,d)*(.5+.5*n2(vW.xz*9.+uTime*.6));c=mix(c,vec3(.95),foam*.8);
 c+=vec3(.1,.4,.9)*uHi*(.3+.2*sin(uTime*2.+vW.x));
 float a=mix(.55,.93,smoothstep(0.,.7,d));a=max(a,foam);
 if(!gl_FrontFacing){c=mix(vec3(.25,.65,.8),vec3(.8,.95,1.),pow(max(n.y,0.),40.)*.5+.15*n2(vW.xz*3.+uTime*.4));a=.85;}
 gl_FragColor=vec4(c,a);}`;
function buildWater() {
  // мұхит беті (бүкіл блокты жабады, құрлық оны жасырады)
  { const nx = 120, nz = 80, g = new T.PlaneGeometry(BX * 2, BZ * 2, nx, nz); g.rotateX(-PI / 2);
    const P = g.attributes.position, D = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) D[i] = Math.max(0, -H(P.getX(i), P.getZ(i)));
    g.setAttribute('dep', new T.BufferAttribute(D, 1));
    const m = new T.ShaderMaterial({uniforms: WU, transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: 'attribute float dep;varying float vDep;varying vec3 vW;uniform float uLevel;void main(){vDep=dep;vec4 w=modelMatrix*vec4(position,1.);w.y+=uLevel;vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: WATER_FS});
    X.SEA = new T.Mesh(g, m); X.SEA.renderOrder = 2; GROUND.add(X.SEA); NODEPTH.push(X.SEA); }
  // көл
  { const g = new T.CircleGeometry(1, 72); g.rotateX(-PI / 2); const P = g.attributes.position, D = new Float32Array(P.count);
    for (let i = 0; i < P.count; i++) { const x = LAKE.x + P.getX(i) * LAKE.rx * 1.04, z = LAKE.z + P.getZ(i) * LAKE.rz * 1.04; D[i] = Math.max(0, LAKE.lvl - H(x, z)); }
    g.setAttribute('dep', new T.BufferAttribute(D, 1));
    const LU = Object.assign({}, WU, {uLevel: {value: 0}});
    const m = new T.ShaderMaterial({uniforms: LU, transparent: true, depthWrite: false,
      vertexShader: 'attribute float dep;varying float vDep;varying vec3 vW;void main(){vDep=dep;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: WATER_FS});
    X.LAKEM = new T.Mesh(g, m); X.LAKEM.position.set(LAKE.x, LAKE.lvl, LAKE.z); X.LAKEM.scale.set(LAKE.rx * 1.04, 1, LAKE.rz * 1.04); X.LAKEM.renderOrder = 2; GROUND.add(X.LAKEM); NODEPTH.push(X.LAKEM); }
  // өзен таспасы
  { const m = new T.ShaderMaterial({uniforms: {uTime: GU.uTime, uDry: GU.uDry}, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv;varying vec3 vW;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `uniform float uTime,uDry;varying vec2 vUv;varying vec3 vW;${GLN}
void main(){float f=n2(vec2(vUv.x*60.-uTime*1.6,vUv.y*3.))*.6+n2(vec2(vUv.x*140.-uTime*2.6,vUv.y*7.))*.4;
 vec3 c=mix(vec3(.03,.26,.45),vec3(.16,.55,.78),f);c+=vec3(.8)*smoothstep(.74,.92,f)*.45;
 float e=smoothstep(0.,.18,vUv.y)*smoothstep(1.,.82,vUv.y);gl_FragColor=vec4(c,e*.92*(1.-uDry*smoothstep(.5,1.,vUv.x)*.0));}`});
    X.RIVERS = RIV.map((r, ri) => {
      const n = r.pts.length, P = [], U = [], I = [];
      for (let i = 0; i < n; i++) { const p = r.pts[i], q = r.pts[Math.min(n - 1, i + 1)], o = r.pts[Math.max(0, i - 1)];
        const tx = q.x - o.x, tz = q.z - o.z, L = Math.hypot(tx, tz) || 1, nx = -tz / L, nz = tx / L, s = i / (n - 1), w = lerp(r.w0, r.w1, s) * 1.05;
        const bed = lerp(r.h0, r.h1, Math.pow(s, ri === 0 ? .62 : 1)) + .03;
        for (const k of [-1, 1]) { const x = p.x + nx * w * k, z = p.z + nz * w * k; P.push(x, Math.max(bed, ri === 1 ? -0.01 : bed), z); U.push(s * r.len / 3, k < 0 ? 0 : 1); } }
      for (let i = 0; i < n - 1; i++) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setIndex(I);
      const me = new T.Mesh(g, m); me.renderOrder = 3; GROUND.add(me); NODEPTH.push(me); return me; }); }
  // су бағанының қимасы (алдыңғы және сол бет): жоғары ашық, тереңде қараңғы
  { const m = new T.ShaderMaterial({uniforms: {uTime: GU.uTime}, transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: 'attribute float sd;varying float vSd;varying vec3 vW;void main(){vSd=sd;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `uniform float uTime;varying float vSd;varying vec3 vW;${GLN}
void main(){float d=-vW.y;vec3 c=mix(vec3(.1,.5,.72),vec3(.01,.06,.16),smoothstep(0.,2.4,d));
 float ca=pow(max(0.,sin((vW.x+vW.z)*3.+fbm2(vec2(vW.x+vW.z,vW.y)*2.+uTime*.25)*5.)*.5+.5),6.)*smoothstep(1.2,0.,d)*.35;c+=vec3(.5,.85,1.)*ca;
 float sp=smoothstep(.985,1.,h21(floor(vec2((vW.x+vW.z)*40.,vW.y*40.+uTime*.6))))*.6;c+=vec3(.7,.9,1.)*sp*smoothstep(0.,1.,d);
 c=mix(c,vec3(.9,.97,1.),smoothstep(.03,0.,d)*.5);gl_FragColor=vec4(c,.9);}`});
    const strip = (pts) => { const P = [], S = [], I = []; pts.forEach(([x, z, top], i) => { P.push(x, 0, z, x, Math.min(top, 0), z); S.push(0, 1); if (i) { const a = (i - 1) * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('sd', new T.Float32BufferAttribute(S, 1)); g.setIndex(I); return g; };
    const fr = [], lf = [];
    for (let i = 0; i <= 200; i++) { const x = lerp(-BX, BX, i / 200), h = H(x, BZ); if (h < 0) fr.push([x, BZ + .002, h]); }
    for (let i = 0; i <= 160; i++) { const z = lerp(-BZ, BZ, i / 160), h = H(-BX, z); if (h < 0) lf.push([-BX - .002, z, h]); }
    X.WATERFACES = [strip(fr), strip(lf)].map(g => { const me = new T.Mesh(g, m); me.renderOrder = 1; GROUND.add(me); NODEPTH.push(me); return me; }); }
}

/* ---------------------------------------------------------------- өсімдіктер (instancing) */
const VEG = X.VEG = {};
function inst(geo, mat, list, parent = GROUND) {
  const im = new T.InstancedMesh(geo, mat, list.length), m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  list.forEach((o, i) => { e.set(o.rx || 0, o.ry || 0, o.rz || 0); q.setFromEuler(e); m.compose(V(o.x, o.y, o.z), q, V(o.s, o.s * (o.sy || 1), o.s)); im.setMatrixAt(i, m);
    if (o.c) im.setColorAt(i, o.c); });
  im.castShadow = true; im.receiveShadow = true; parent.add(im); return im;
}
function buildVegetation() {
  const r = rng(42), vmat = new T.MeshStandardMaterial({vertexColors: true, roughness: .85});
  // шырша (тянь-шань шыршасы): үш конус + дің
  const spruceG = merge([[new T.CylinderGeometry(.03, .04, .3, 6), m4(0, .15, 0), '#5A3E2B'], [new T.ConeGeometry(.2, .42, 8), m4(0, .42, 0), '#264A2E'],
    [new T.ConeGeometry(.16, .36, 8), m4(0, .64, 0), '#2C5434'], [new T.ConeGeometry(.11, .3, 8), m4(0, .84, 0), '#33603A']]);
  // жапырақты ағаш (алма, өрік, көктерек)
  const decG = merge([[new T.CylinderGeometry(.025, .035, .34, 6), m4(0, .17, 0), '#6B4A33'], [new T.IcosahedronGeometry(.2, 1), m4(0, .46, 0, 1, .9, 1), '#5E9A3F'],
    [new T.IcosahedronGeometry(.14, 1), m4(.1, .56, .05), '#6DA848']]);
  // қайың (ақ діңді)
  const birchG = merge([[new T.CylinderGeometry(.02, .03, .42, 6), m4(0, .21, 0), '#E9E6DE'], [new T.IcosahedronGeometry(.16, 1), m4(0, .5, 0, 1, 1.25, 1), '#7FB24E']]);
  // бұта (арша, сексеуіл)
  const bushG = merge([[new T.IcosahedronGeometry(.1, 0), m4(0, .06, 0, 1.3, .7, 1.3), '#3E5A36']]);
  // шөп шоғыры
  const grassG = merge([[new T.ConeGeometry(.012, .1, 3), m4(0, .05, 0), '#A8AC5A'], [new T.ConeGeometry(.01, .085, 3), m4(.012, .04, .006, 1, 1, 1, .1, 0, -.45), '#9DA552'],
    [new T.ConeGeometry(.01, .08, 3), m4(-.012, .04, -.004, 1, 1, 1, -.1, 0, .45), '#B3AE62'], [new T.ConeGeometry(.009, .075, 3), m4(0, .036, .014, 1, 1, 1, .5, 0, 0), '#A0A858']]);
  const L = {spruce: [], dec: [], birch: [], bush: [], grass: [], sax: []}, tint = (h, k) => lin(h).multiplyScalar(k);
  const okWater = (x, z, h) => { const ri = riverInfo(x, z); const e = Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz); return ri.d > ri.w * 2.6 + .05 && e > 1.12 && h > .12; };
  for (let i = 0; i < 26000; i++) {
    const x = lerp(-BX + .2, BX - .2, r()), z = lerp(-BZ + .2, BZ - .2, r()), h = H(x, z); if (!okWater(x, z, h)) continue;
    const sl = slopeAt(x, z), mm = mtnMask(x, z), dv = Math.hypot(x - VX, z - VZ); if (dv < 3.1 || Math.hypot(x - SPOT.x, z - SPOT.z) < 2.9) continue;
    const hb = h + .12 * noise2(x * 1.1 + 4, z * 1.1), s = .75 + r() * .5;
    if (mm > .1 && hb > BELT.decid && hb < BELT.spruce && sl < 1.25) { if (r() < .55) L.spruce.push({x, y: h - .02, z, s: s * .9, ry: r() * TAU, c: tint('#ffffff', .8 + r() * .35)}); continue; }
    if (mm > .1 && hb > BELT.steppe && hb < BELT.decid && sl < 1.1) { if (r() < .32) L.dec.push({x, y: h - .02, z, s: s * .85, ry: r() * TAU, c: tint('#ffffff', .8 + r() * .4)}); continue; }
    if (mm > .1 && hb > BELT.spruce && hb < BELT.alpine && sl < 1.2) { if (r() < .25) L.bush.push({x, y: h, z, s: s * .8, ry: r() * TAU, c: tint('#ffffff', .8 + r() * .3)}); continue; }
    if (z > 4.6 + fbm(x * .4, z * .4) * 1.2 && mm < .1 && r() < .085) { (r() < .6 ? L.birch : L.dec).push({x, y: h - .02, z, s: s * .8, ry: r() * TAU, c: tint('#ffffff', .85 + r() * .3)}); continue; }
    if (mm < .2 && z > -2.6 && h < 1.2 && r() < .09) { L.grass.push({x, y: h, z, s: .8 + r() * .7, ry: r() * TAU, c: tint(z > 1 ? '#ffffff' : '#E8D9A0', .85 + r() * .3)}); continue; }
    if (mm < .2 && z < -2.6 && r() < .012) L.sax.push({x, y: h, z, s: .7 + r() * .6, ry: r() * TAU, c: tint('#9FA77A', 1)});
    const ri = riverInfo(x, z); if (ri.d < .7 && h < 1.6 && r() < .2) L.dec.push({x, y: h - .02, z, s: s * .7, ry: r() * TAU, c: tint('#ffffff', .9 + r() * .3)});
  }
  VEG.spruce = inst(spruceG, vmat, L.spruce); VEG.dec = inst(decG, vmat, L.dec); VEG.birch = inst(birchG, vmat, L.birch);
  VEG.bush = inst(bushG, vmat, L.bush); VEG.grass = inst(grassG, vmat, L.grass); VEG.sax = inst(bushG, vmat, L.sax);
  VEG.grass.castShadow = false; VEG.L = L;
}

/* ---------------------------------------------------------------- киіктер (табын) және құстар */
const HERD = X.HERD = {n: 11, parts: {}};
function buildFauna() {
  const fur = new T.MeshStandardMaterial({color: lin('#C9A46A'), roughness: .9}), dark = new T.MeshStandardMaterial({color: lin('#7A6043'), roughness: .9}),
    horn = new T.MeshStandardMaterial({color: lin('#E9D9A8'), roughness: .5});
  const n = HERD.n, mk = (g, m) => { const im = new T.InstancedMesh(g, m, n); im.castShadow = true; im.frustumCulled = false; GROUND.add(im); return im; };
  HERD.parts = {body: mk(new T.CapsuleGeometry(.038, .15, 4, 8).rotateZ(PI / 2), fur), head: mk(new T.SphereGeometry(.03, 10, 8).scale(1.3, 1, .9), fur),
    nose: mk(new T.SphereGeometry(.022, 8, 6).scale(1.2, 1, 1), dark), neck: mk(new T.CylinderGeometry(.014, .022, .09, 6), fur), leg: mk(new T.CylinderGeometry(.007, .005, .13, 5), dark),
    horn: mk(new T.ConeGeometry(.008, .07, 5), horn)};
  HERD.parts.leg.count = n * 4; HERD.parts.leg.instanceMatrix = new T.InstancedBufferAttribute(new Float32Array(n * 4 * 16), 16); HERD.parts.leg.count = n * 4;
  HERD.parts.horn.instanceMatrix = new T.InstancedBufferAttribute(new Float32Array(n * 2 * 16), 16); HERD.parts.horn.count = n * 2;
  const r = rng(9); HERD.a = Array.from({length: n}, (_, i) => ({ox: (r() - .5) * 1.6, oz: (r() - .5) * 1.1, ph: r() * TAU, sp: .9 + r() * .3, male: i % 3 === 0, s: .9 + r() * .25}));
  // құстар
  const wingG = new T.BufferGeometry(); wingG.setAttribute('position', new T.Float32BufferAttribute([0, 0, -.025, 0, 0, .025, .11, 0, 0], 3)); wingG.computeVertexNormals();
  const bm = new T.MeshBasicMaterial({color: lin('#2A2622'), side: T.DoubleSide});
  X.BIRDS = {n: 12, L: new T.InstancedMesh(wingG, bm, 12), R: new T.InstancedMesh(wingG, bm, 12)}; X.BIRDS.L.frustumCulled = X.BIRDS.R.frustumCulled = false;
  GROUND.add(X.BIRDS.L, X.BIRDS.R);
}
const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = V(1, 1, 1), _p = V(0, 0, 0), _m2 = new T.Matrix4();
function tickFauna(t, on = 1) {
  const P = HERD.parts; for (const k in P) P[k].visible = on > 0;
  if (on > 0) {
    const cx = 2.6 - ((t * .05) % 3.2), cz = -.2;   // табын батысқа баяу жылжиды
    HERD.a.forEach((a, i) => {
      const x = cx + a.ox + Math.sin(t * .3 + a.ph) * .05, z = cz + a.oz, y = H(x, z), ph = t * 6 * a.sp + a.ph, bob = Math.abs(Math.sin(ph)) * .008;
      const yaw = PI + Math.sin(t * .2 + a.ph) * .25, root = new T.Matrix4().compose(V(x, y + .13 + bob, z), _q.setFromEuler(_e.set(0, yaw, 0)), _s.set(a.s, a.s, a.s));
      const put = (im, idx, lx, ly, lz, rx = 0, ry = 0, rz = 0, sc = 1) => { _m.compose(_p.set(lx, ly, lz), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sc, sc, sc)); _m2.multiplyMatrices(root, _m); im.setMatrixAt(idx, _m2); };
      put(P.body, i, 0, .02, 0); put(P.neck, i, .1, .06, 0, 0, 0, -.75); put(P.head, i, .14, .1, 0); put(P.nose, i, .172, .088, 0);
      const sw = Math.sin(ph) * .5;
      put(P.leg, i * 4, .07, -.065, .022, 0, 0, sw); put(P.leg, i * 4 + 1, .07, -.065, -.022, 0, 0, -sw); put(P.leg, i * 4 + 2, -.07, -.065, .022, 0, 0, -sw); put(P.leg, i * 4 + 3, -.07, -.065, -.022, 0, 0, sw);
      const hs = a.male ? 1 : .001; put(P.horn, i * 2, .13, .15, .012, .15, 0, -.2, hs); put(P.horn, i * 2 + 1, .13, .15, -.012, -.15, 0, -.2, hs);
    });
    for (const k in P) P[k].instanceMatrix.needsUpdate = true;
  }
  // құстар көлдің үстінде айналады
  const B = X.BIRDS; B.L.visible = B.R.visible = on > 0;
  for (let i = 0; i < B.n; i++) {
    const a = t * .35 + i * TAU / B.n * .35 + (i % 3) * .3, rr = 2.2 + (i % 4) * .35, x = LAKE.x + Math.cos(a) * rr, z = LAKE.z - .3 + Math.sin(a) * rr * .7, y = 2.3 + Math.sin(t + i) * .15 + (i % 3) * .2;
    const yaw = -a, fl = Math.sin(t * 9 + i * 1.7) * .7;
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, yaw, fl)), _s.set(1, 1, 1)); B.L.setMatrixAt(i, _m);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, yaw + PI, fl)), _s.set(1, 1, 1)); B.R.setMatrixAt(i, _m);
  }
  B.L.instanceMatrix.needsUpdate = B.R.instanceMatrix.needsUpdate = true;
}

/* ---------------------------------------------------------------- бұлттар, жаңбыр, бу, жанартау түтіні */
let PUFF = null;
function puffTex() {
  const c = canvas(128, 128), g = c.getContext('2d'), r = rng(4);
  for (let i = 0; i < 34; i++) { const a = r() * TAU, d = Math.pow(r(), .7) * 30, x = 64 + Math.cos(a) * d, y = 70 + Math.sin(a) * d * .7, rr = 12 + r() * 20, gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.55, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  return ctex(c, {srgb: false});
}
const CLD = X.CLD = [];
function cloud(cx, cy, cz, n, sx, sy, seed, base = '#F5F7FA', shade = '#9AA8B8') {
  const r = rng(seed), grp = new T.Group(); grp.position.set(cx, cy, cz); GROUND.add(grp);
  for (let i = 0; i < n; i++) { const x = (r() - .5) * sx, y = (r() - .2) * sy, z = (r() - .5) * sx * .6, s = .9 + r() * 1.4;
    const k = clamp((y / sy) + .35), c = lin(shade).lerp(lin(base), k);
    const sp = new T.Sprite(new T.SpriteMaterial({map: PUFF, color: c, transparent: true, depthWrite: false, opacity: 1})); sp.position.set(x, y, z); sp.scale.set(s * 1.25, s * 1.0, 1);
    sp.userData.base = sp.position.clone(); grp.add(sp); NODEPTH.push(sp); }
  CLD.push(grp); return grp;
}
function buildSkyStuff() {
  PUFF = puffTex();
  X.CL = {mtn: cloud(8.2, 7.6, -2.6, 30, 4.6, 1.2, 1, '#F2F4F7', '#7D8796'), sea: cloud(-8.8, 5.6, -1.5, 22, 3.4, 1, 2), fair1: cloud(-1.5, 6.2, -5.2, 9, 2.2, .6, 3), fair2: cloud(4.5, 7.4, -6.4, 8, 2, .5, 5)};
  // жаңбыр (тау бұлтының астында)
  { const n = 420, r = rng(8), P = new Float32Array(n * 6), g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3));
    const m = new T.LineBasicMaterial({color: new T.Color(.75, .85, 1).multiplyScalar(1.4), transparent: true, opacity: .55, depthWrite: false});
    X.RAIN = new T.LineSegments(g, m); X.RAIN.frustumCulled = false; GROUND.add(X.RAIN); NODEPTH.push(X.RAIN);
    X.RAIN.userData.d = Array.from({length: n}, () => { const x = 8.2 + (r() - .5) * 4.6, z = -2.6 + (r() - .5) * 2.6; return {x, z, g: H(x, z), o: r()}; }); }
  // бу (мұхиттан көтерілетін)
  { const n = 140, r = rng(12), g = new T.BufferGeometry(), P = new Float32Array(n * 3); g.setAttribute('position', new T.BufferAttribute(P, 3));
    const m = new T.PointsMaterial({map: PUFF, size: .5, color: new T.Color(.85, .92, 1), transparent: true, opacity: .35, depthWrite: false, sizeAttenuation: true});
    X.VAPOR = new T.Points(g, m); X.VAPOR.frustumCulled = false; GROUND.add(X.VAPOR); NODEPTH.push(X.VAPOR);
    X.VAPOR.userData.d = Array.from({length: n}, () => ({x: -11 + r() * 4.2, z: -6 + r() * 11, o: r(), sp: .5 + r() * .5})); }
  // жанартау: кратер жарығы + түтін
  { const crater = mesh(new T.CircleGeometry(.3, 24), new T.MeshBasicMaterial({color: new T.Color(5, 1.4, .25)}), VX, H(VX, VZ - .05) + .03, VZ - .02, GROUND, {r: [-PI / 2, 0, 0], cast: false});
    X.CRATER = crater; X.LAVA = new T.PointLight(0xff7a2a, 3, 6, 1.6); X.LAVA.position.set(VX, H(VX, VZ - .3) + .6, VZ - .5); GROUND.add(X.LAVA);
    const r = rng(21); X.SMOKE = Array.from({length: 26}, (_, i) => { const sp = new T.Sprite(new T.SpriteMaterial({map: PUFF, color: lin('#5B5552'), transparent: true, depthWrite: false, opacity: .7}));
      GROUND.add(sp); NODEPTH.push(sp); sp.userData = {o: i / 26, dx: (r() - .5) * .5, dz: (r() - .5) * .3}; return sp; }); }
}
function tickSky(t, o) {
  // бұлттардың баяу қозғалысы
  for (const g of CLD) g.children.forEach((s, i) => { s.position.x = s.userData.base.x + Math.sin(t * .15 + i) * .08; });
  X.CL.sea.position.x = o.seaCloudX ?? -8.8;
  const R = X.RAIN, P = R.geometry.attributes.position; R.visible = (o.rain ?? 0) > 0; R.material.opacity = .55 * (o.rain ?? 0);
  if (R.visible) { R.userData.d.forEach((d, i) => { const top = 6.0, len = top - d.g, y = top - ((t * 7 + d.o * len) % len); P.setXYZ(i * 2, d.x, y, d.z); P.setXYZ(i * 2 + 1, d.x - .03, y - .22, d.z); }); P.needsUpdate = true; }
  const Vp = X.VAPOR, VP = Vp.geometry.attributes.position; Vp.visible = (o.vapor ?? 0) > 0; Vp.material.opacity = .4 * (o.vapor ?? 0);
  if (Vp.visible) { Vp.userData.d.forEach((d, i) => { const k = (t * .12 * d.sp + d.o) % 1; VP.setXYZ(i, d.x + k * 1.2 + Math.sin(t + i) * .1, .1 + k * 4.8, d.z + Math.sin(t * .7 + i) * .1); }); VP.needsUpdate = true; }
  const sm = o.smoke ?? 1; X.SMOKE.forEach(s => { const k = (t * .07 + s.userData.o) % 1, y0 = H(VX, VZ - .1);
    s.position.set(VX + s.userData.dx * k * 3 + k * 1.8, y0 + .2 + k * 3.6, VZ - .3 + s.userData.dz * k * 2 - k * .8); const sc = .4 + k * 2.2; s.scale.set(sc, sc, 1);
    s.material.opacity = .7 * Math.sin(PI * Math.min(1, k * 1.15)) * sm; s.visible = sm > 0; });
  X.LAVA.intensity = (2.2 + Math.sin(t * 7) * .5 + Math.sin(t * 13) * .3) * (o.lava ?? 1);
}

/* ---------------------------------------------------------------- аспан күмбезі және атмосфера «лифті» */
const SKY = X.SKYU = {uAlt: {value: 0}, uSun: GU.uSun, uTime: GU.uTime, uDusk: {value: 0}, uUnder: {value: 0}};
// биіктік (км) → әлем y (масштаб шартты: 0–20 км = 1:1, 20–100 км сығылған, 100+ км қатты сығылған)
const alt2y = X.alt2y = km => km <= 20 ? km : km <= 100 ? 20 + (km - 20) * .5 : 60 + (km - 100) * .07;
const y2alt = X.y2alt = y => y <= 20 ? y : y <= 60 ? 20 + (y - 20) * 2 : 100 + (y - 60) / .07;
// стандарт атмосфера: биіктік → температура (°C)
X.tempAt = km => { const P = [[0, 15], [11, -56.5], [20, -56.5], [32, -44.5], [47, -2.5], [51, -2.5], [71, -58.5], [86, -86], [100, -78], [150, 400], [300, 800], [500, 1000], [800, 1100]];
  for (let i = 1; i < P.length; i++) if (km <= P[i][0]) return lerp(P[i - 1][1], P[i][1], (km - P[i - 1][0]) / (P[i][0] - P[i - 1][0])); return 1100; };
function buildSkyDome() {
  const m = new T.ShaderMaterial({side: T.BackSide, depthWrite: false, uniforms: SKY,
    vertexShader: 'varying vec3 vD;void main(){vD=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader: `uniform float uAlt,uDusk,uUnder;uniform vec3 uSun;varying vec3 vD;
void main(){vec3 d=normalize(vD);float y=d.y;float a=uAlt;
 vec3 top=mix(vec3(.07,.2,.52),vec3(.02,.04,.14),smoothstep(.0,.35,a));top=mix(top,vec3(0.),smoothstep(.3,.75,a));
 vec3 hor=mix(vec3(.5,.7,.9),vec3(.18,.32,.62),smoothstep(.05,.45,a));hor=mix(hor,vec3(.01,.02,.05),smoothstep(.45,.9,a));
 vec3 c=mix(hor,top,pow(clamp(y,0.,1.),.5));
 vec3 gnd=mix(vec3(.05,.1,.2),vec3(.01,.02,.05),smoothstep(0.,.4,a));c=mix(c,gnd,smoothstep(.02,-.35,y));
 // жерге жақын жұқа көгілдір жолақ (биікте көрінеді)
 c+=vec3(.2,.45,1.)*exp(-pow((y+.02+a*.08)*18.,2.))*smoothstep(.3,.7,a)*.8;
 c=mix(c,c*vec3(1.1,.75,.55)+vec3(.15,.05,.0),uDusk*smoothstep(.4,-.1,y));
 float s=max(dot(d,normalize(uSun)),0.);c+=vec3(1.,.9,.75)*(pow(s,700.)*30.+pow(s,24.)*.35*(1.-a*.6));
 c=mix(c,mix(vec3(.01,.06,.12),vec3(.1,.4,.55),smoothstep(-.3,.6,y)),uUnder);
 gl_FragColor=vec4(c,1.);}`});
  X.DOME = new T.Mesh(new T.SphereGeometry(900, 48, 24), m); X.DOME.renderOrder = -10; X.DOME.frustumCulled = false; GROUND.add(X.DOME);
  // «лифт» нысандары
  const EL = X.ELEV = new T.Group(); GROUND.add(EL);
  const ringM = col => new T.ShaderMaterial({transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: {uC: {value: col}, uA: {value: 1}},
    vertexShader: 'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 uC;uniform float uA;varying vec2 vP;void main(){float r=length(vP)/26.;float a=(smoothstep(1.,.2,r)*.06+exp(-pow((r-.92)*30.,2.))*.0)*uA;float grid=smoothstep(.97,1.,abs(sin(vP.x*1.2))*abs(sin(vP.y*1.2)))*.0;gl_FragColor=vec4(uC*(a+grid),1.);}'});
  X.LAYERS = [[12, '#7FD3FF'], [50, '#B79BFF'], [85, '#FF9FD0'], [690, '#FFD27F']].map(([km, h]) => { const c = lin(h).multiplyScalar(2);
    const me = mesh(new T.CircleGeometry(26, 64), ringM(c), 0, alt2y(km), 0, EL, {r: [-PI / 2, 0, 0], cast: false, recv: false}); NODEPTH.push(me); me.userData.km = km; return me; });
  // озон қабаты: 20–30 км
  { const m2 = new T.ShaderMaterial({transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: {uTime: GU.uTime, uA: {value: 1}},
      vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uTime,uA;varying vec3 vP;${GLN}void main(){float r=length(vP.xy)/24.;float n=fbm2(vP.xy*.18+uTime*.03);gl_FragColor=vec4(vec3(.5,.28,1.)*smoothstep(1.,.3,r)*(.06+.08*n)*uA,1.);}`});
    X.OZ2 = [21, 23.5, 26].map(km => { const me = mesh(new T.CircleGeometry(24, 48), m2, 0, alt2y(km), 0, EL, {r: [-PI / 2, 0, 0], cast: false, recv: false}); NODEPTH.push(me); return me; }); }
  // ұшақ (≈10 км) + ізі
  { const pl = new T.Group(), wm = M('#EEF1F5', {roughness: .4});
    mesh(new T.CapsuleGeometry(.07, .6, 4, 10).rotateZ(PI / 2), wm, 0, 0, 0, pl); mesh(new T.BoxGeometry(.16, .015, .9), wm, -.02, 0, 0, pl); mesh(new T.BoxGeometry(.1, .2, .015), wm, -.33, .1, 0, pl); mesh(new T.BoxGeometry(.08, .012, .3), wm, -.32, .02, 0, pl);
    pl.position.set(0, alt2y(10.5), -2); EL.add(pl); X.PLANE = pl;
    const tr = mesh(new T.PlaneGeometry(1, .05), new T.MeshBasicMaterial({color: new T.Color(1.6, 1.7, 1.8), transparent: true, opacity: .5, depthWrite: false, side: T.DoubleSide}), 0, 0, 0, EL, {cast: false, recv: false}); X.TRAIL = tr; NODEPTH.push(tr); }
  // метеорлар (мезосфера)
  { const n = 10, g = new T.BufferGeometry(), P = new Float32Array(n * 6), Cc = new Float32Array(n * 6); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('color', new T.BufferAttribute(Cc, 3));
    X.METEOR = new T.LineSegments(g, new T.LineBasicMaterial({vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending})); X.METEOR.frustumCulled = false; EL.add(X.METEOR); NODEPTH.push(X.METEOR); }
  // поляр шұғыласы (термосфера) — толқынды перде
  { const g = new T.PlaneGeometry(30, 7, 120, 1); const m3 = new T.ShaderMaterial({transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, uniforms: {uTime: GU.uTime, uA: {value: 1}},
      vertexShader: `uniform float uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.25+uTime*.3)*2.4+sin(p.x*.6-uTime*.2)*.9;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `uniform float uTime,uA;varying vec2 vUv;${GLN}void main(){float n=fbm2(vec2(vUv.x*14.+uTime*.2,uTime*.1));float y=vUv.y;
 vec3 c=mix(vec3(.2,1.6,.6),vec3(1.,.3,1.3),smoothstep(.45,1.,y));float a=smoothstep(0.,.12,y)*smoothstep(1.,.35,y)*(.3+.7*smoothstep(.25,.75,n))*smoothstep(0.,.1,vUv.x)*smoothstep(1.,.9,vUv.x);
 gl_FragColor=vec4(c*a*uA*.9,1.);}`});
    X.AURORA = mesh(g, m3, 0, alt2y(220) + 3.5, -14, EL, {cast: false, recv: false}); NODEPTH.push(X.AURORA); }
  // ХҒС (≈400 км)
  { const iss = new T.Group(), sp = M('#2B3A6B', {roughness: .3, metalness: .6, emissive: '#0A1230'}), tr = M('#D9DCE2', {roughness: .4, metalness: .5});
    mesh(new T.BoxGeometry(1.6, .04, .04), tr, 0, 0, 0, iss); for (const s of [-1, 1]) for (const k of [-1, 1]) mesh(new T.BoxGeometry(.32, .01, .7), sp, s * .62 + k * .18, 0, 0, iss);
    mesh(new T.CylinderGeometry(.06, .06, .5, 10).rotateX(PI / 2), tr, 0, -.05, 0, iss); iss.position.set(-3, alt2y(400), -6); EL.add(iss); X.ISS = iss; }
  EL.visible = false;
}
function tickElev(t, o) {
  const on = o.elev ?? 0; X.ELEV.visible = on > 0;
  SKY.uAlt.value = clamp(y2alt(o.camY ?? 0) / 130); SKY.uDusk.value = o.dusk ?? 0;
  if (X.STARMAT) X.STARMAT.uniforms.uA.value = ss(.25, .7, SKY.uAlt.value) + (o.stars ?? 0);
  if (!on) return;
  X.PLANE.position.set(-6 + ((t * .9) % 14), alt2y(10.5), -2); X.TRAIL.position.set(X.PLANE.position.x - 1.9, X.PLANE.position.y, -2); X.TRAIL.scale.set(3.4, 1, 1);
  X.ISS.position.set(-4 + ((t * .25) % 10), alt2y(400), -6); X.ISS.rotation.y = t * .05;
  const MP = X.METEOR.geometry.attributes.position, MC = X.METEOR.geometry.attributes.color;
  for (let i = 0; i < 10; i++) { const k = (t * .55 + i * .37) % 2.2, a = i * 2.39, x0 = Math.cos(a) * 10, z0 = -8 + Math.sin(a) * 6, y0 = alt2y(98 - (i % 3) * 6);
    const p = Math.min(k, 1), x = x0 + p * 6, y = y0 - p * 9, z = z0 + p * 2, f = k < 1 ? Math.sin(PI * k) : 0;
    MP.setXYZ(i * 2, x - 1.6, y + 2.4, z - .5); MP.setXYZ(i * 2 + 1, x, y, z); MC.setXYZ(i * 2, 0, 0, 0); MC.setXYZ(i * 2 + 1, 3 * f, 2.6 * f, 1.8 * f); }
  MP.needsUpdate = MC.needsUpdate = true;
}

/* ---------------------------------------------------------------- адамдар (алдыңғы презентациядағы кейіпкер стилі) */
const EYE_D = new T.MeshBasicMaterial({color: lin('#1A1412')}), EYE_W = new T.MeshBasicMaterial({color: 0xffffff});
const joint = (parent, x, y, z) => { const j = new T.Group(); j.position.set(x, y, z); parent.add(j); return j; };
const part = (geo, mat, parent, x, y, z, sx = 1, sy = 1, sz = 1, o = {}) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  if (o.r) m.rotation.set(o.r[0], o.r[1], o.r[2]); m.castShadow = o.cast !== false; m.receiveShadow = true; parent.add(m); return m; };
function person(o) {
  const P = {g: new T.Group(), j: {}}, k = .116, L = {hy: .4, tor: .3, torR: .108, sh: .27, neck: .32, armR: .038, up: .15, fore: .135, legR: .052, th: .24, sh2: .34};
  const sk = M(o.skin, {roughness: .58}), top = M(o.top, {roughness: .85}), bot = M(o.bottom, {roughness: .85}), shoe = M('#3A2E2A', {roughness: .6}), hm = M(o.hair, {roughness: .55});
  const hips = P.j.hips = joint(P.g, 0, .62, 0), spine = P.j.spine = joint(hips, 0, .02, 0);
  part(cap(L.torR, L.tor - L.torR * 1.2), top, spine, 0, L.tor / 2 + .01, 0, 1, 1, .78);
  if (o.pack) { part(new T.BoxGeometry(.16, .2, .09), M(o.pack, {roughness: .7}), spine, 0, .17, .11); }
  const neck = joint(spine, 0, L.neck, 0); part(GC_, sk, neck, 0, .02, 0, k * .32, .05, k * .32);
  const head = P.j.head = joint(neck, 0, .045, 0), hc = joint(head, 0, k * .95, 0);
  part(GS_, sk, hc, 0, 0, 0, k * 1.02, k * .98, k * .98);
  for (const s of [-1, 1]) { const e = joint(hc, s * .38 * k, .02 * k, -.9 * k); part(GSL_, EYE_D, e, 0, 0, 0, .15 * k, .19 * k, .08 * k, {cast: false}); part(GSL_, EYE_W, e, s * .03 * k + .03 * k, .06 * k, -.06 * k, .045 * k, .045 * k, .02 * k, {cast: false}); }
  part(new T.TorusGeometry(.2 * k, .035 * k, 6, 16, PI), EYE_D, hc, 0, -.35 * k, -.88 * k, 1, 1, 1, {r: [0, 0, PI], cast: false});
  part(new T.SphereGeometry(1, 28, 18, 0, TAU, 0, 1.72), hm, hc, 0, .03 * k, .03 * k, 1.07 * k, 1.07 * k, 1.07 * k, {r: [.62, 0, 0]});
  if (o.style === 'braids') for (const s of [-1, 1]) for (let i = 0; i < 5; i++) part(GSL_, hm, hc, s * (.82 - i * .02) * k, (-.35 - i * .27) * k, (.25 + i * .05) * k, .2 * k, .2 * k, .2 * k);
  if (o.style === 'short') part(GSL_, hm, hc, 0, .7 * k, -.6 * k, .82 * k, .2 * k, .4 * k, {r: [.6, 0, 0]});
  if (o.hat) { part(new T.CylinderGeometry(1.25 * k, 1.25 * k, .02, 20), M(o.hat), hc, 0, .78 * k, 0); part(new T.SphereGeometry(1, 20, 12, 0, TAU, 0, PI / 2), M(o.hat), hc, 0, .7 * k, 0, 1.0 * k, .7 * k, 1.0 * k); }
  for (const s of [-1, 1]) { const nm = s < 0 ? 'L' : 'R';
    const sh = P.j['sh' + nm] = joint(spine, s * (L.torR + L.armR * .55), L.sh, 0); part(cap(L.armR, L.up - L.armR), top, sh, 0, -L.up / 2, 0);
    const el = P.j['el' + nm] = joint(sh, 0, -L.up, 0); part(cap(L.armR * .9, L.fore - L.armR), top, el, 0, -L.fore / 2, 0);
    const ha = joint(el, 0, -L.fore, 0); part(GS_, sk, ha, 0, -.012, 0, L.armR * 1.05, L.armR * 1.2, L.armR * .85);
    const hp = P.j['hp' + nm] = joint(hips, s * L.legR * 1.1, 0, 0); part(cap(L.legR, L.th - L.legR), bot, hp, 0, -L.th / 2, 0);
    const kn = P.j['kn' + nm] = joint(hp, 0, -L.th, 0); part(cap(L.legR * .9, L.sh2 - L.legR), bot, kn, 0, -L.sh2 / 2, 0);
    part(X.rbox(L.legR * 1.9, L.legR * 1.4, L.legR * 3, L.legR * .5), shoe, kn, 0, -L.sh2 - L.legR * .2, -L.legR * .7); }
  GROUND.add(P.g); return P;
}
const GS_ = new T.SphereGeometry(1, 28, 18), GSL_ = new T.SphereGeometry(1, 14, 10), GC_ = new T.CylinderGeometry(1, 1, 1, 18);
const _capm = new Map(); function cap(r, l) { const k = r + ',' + l; if (!_capm.has(k)) _capm.set(k, new T.CapsuleGeometry(r, l, 6, 14)); return _capm.get(k); }
const POSE = {
  stand: {spine: [0, 0, 0], head: [0, 0, 0], shL: [.06, 0, .1], elL: [.15, 0, 0], shR: [.06, 0, -.1], elR: [.15, 0, 0], hpL: [0, 0, .02], knL: [0, 0, 0], hpR: [0, 0, -.02], knR: [0, 0, 0]},
  point: {spine: [0, 0, 0], head: [.15, 0, 0], shR: [2.5, 0, -.25], elR: [.1, 0, 0], shL: [.06, 0, .1], elL: [.2, 0, 0], hpL: [0, 0, .02], knL: [0, 0, 0], hpR: [0, 0, -.02], knR: [0, 0, 0]},
  wave: {spine: [0, 0, 0], head: [.1, 0, 0], shR: [2.9, 0, -.5], elR: [.5, 0, 0], shL: [.06, 0, .1], elL: [.2, 0, 0], hpL: [0, 0, .02], knL: [0, 0, 0], hpR: [0, 0, -.02], knR: [0, 0, 0]},
  look: {spine: [-.05, 0, 0], head: [.35, 0, 0], shL: [.3, 0, .2], elL: [1.2, 0, 0], shR: [.3, 0, -.2], elR: [1.2, 0, 0], hpL: [0, 0, .02], knL: [0, 0, 0], hpR: [0, 0, -.02], knR: [0, 0, 0]},
};
function pose(P, name, t = 0) { const A = POSE[name]; for (const n in A) { const j = P.j[n]; if (j) j.rotation.set(...A[n]); }
  P.j.spine.scale.y = 1 + Math.sin(t * 2.1 + P.ph) * .012; P.j.head.rotation.y += Math.sin(t * .43 + P.ph) * .08; if (name === 'wave') P.j.elR.rotation.x += Math.sin(t * 6) * .3; }
X.KIDS = [];
function buildPeople() {
  const a = person({skin: '#EDC6A3', hair: '#2A201B', style: 'braids', top: '#E9874E', bottom: '#2F3A4A', pack: '#3FA7F0'}); a.ph = 1;
  const b = person({skin: '#E2B48F', hair: '#1F1A17', style: 'short', top: '#5FD08A', bottom: '#33384A', pack: '#F7C548', hat: '#A88BFF'}); b.ph = 2.4;
  X.KIDS = [a, b]; X.SPOT = SPOT;
}
function tickPeople(t, o) {
  const on = o.kids ?? 0; X.KIDS.forEach(K => K.g.visible = on > 0); if (!on) return;
  const sc = o.kidScale ?? .3, S = X.SPOT, h = H(S.x, S.z);
  X.KIDS.forEach((K, i) => { const x = S.x + (i ? .22 : 0), z = S.z + (i ? .06 : 0); K.g.position.set(x, H(x, z) - .005, z); K.g.scale.setScalar(sc);
    K.g.rotation.y = (o.kidYaw ?? PI * .92) + (i ? -.25 : .1); pose(K, (o.kidPose || ['point', 'look'])[i] || 'stand', t); });
}

/* ---------------------------------------------------------------- жарық, күн */
function tickLight(o) {
  const s = GU.uSun.value; if (o.sunDir) s.copy(o.sunDir).normalize();
  sun.position.copy(s).multiplyScalar(40); sun.target.position.set(0, 0, 0);
  sun.intensity = 3.1 * (o.sunI ?? 1); sun.color.set(o.sunC || '#FFF1DE'); hemi.intensity = .65 * (o.hemiI ?? 1);
}

/* ---------------------------------------------------------------- құрастыру және әр кадрдағы күй */
// балықтар (су асты көрінісі үшін)
function buildFish() { const g = new T.SphereGeometry(.045, 10, 6).scale(2.2, .7, .55), m = new T.MeshStandardMaterial({color: lin('#E07A2E'), roughness: .35, metalness: .3, emissive: lin('#3A1404')});
  X.FISH = new T.InstancedMesh(g, m, 26); X.FISH.frustumCulled = false; X.FISH.visible = false; GROUND.add(X.FISH); }
function tickFish(t) { if (!X.FISH || !X.FISH.visible) return; for (let i = 0; i < 26; i++) { const a = t * .35 + i * .24, r = 1.2 + (i % 5) * .18;
  _m.compose(_p.set(-9.2 + Math.cos(a) * r, -1.15 + Math.sin(t * .7 + i) * .12 + (i % 3) * .1, 2.2 + Math.sin(a) * r * .6), _q.setFromEuler(_e.set(0, -a, 0)), _s.set(1, 1, 1)); X.FISH.setMatrixAt(i, _m); }
  X.FISH.instanceMatrix.needsUpdate = true; }
X.buildGround = () => { buildTerrain(); buildFaces(); buildWater(); buildVegetation(); buildFauna(); buildSkyStuff(); buildSkyDome(); buildPeople(); buildFish(); };
X.groundTick = (t, o = {}) => {
  GU.uTime.value = t; tickLight(o);
  GU.uQuake.value = o.quake ?? 0; GU.uQt.value = o.quakeT ?? 0; GU.uDry.value = o.dry ?? 0; GU.uBio.value = o.bio ?? 0; GU.uBelt.value = o.belt ?? -1;
  SU2.uSub.value = o.sub ?? 0; SU2.uAqu.value = o.aqu ?? 0; SU2.uMag.value = o.mag ?? .6; SU2.uLith.value = o.lith ?? 0; SU2.uSoil.value = o.soil ?? 0; SU2.uSel.value = o.sel ?? -1; SU2.uFault.value = o.fault ?? 1;
  WU.uHi.value = o.waterHi ?? 0;
  // Арал: көл тартылады
  const dry = o.dry ?? 0; X.LAKEM.scale.set(LAKE.rx * 1.04 * (1 - dry * .72), 1, LAKE.rz * 1.04 * (1 - dry * .72)); X.LAKEM.position.y = LAKE.lvl - dry * .3; X.LAKEM.visible = dry < .98;
  X.LAKEM.position.x = LAKE.x - dry * .5;
  tickFauna(t, o.fauna ?? 1); tickSky(t, o); tickElev(t, o); tickPeople(t, o);
  PU_UNDER(o); tickFish(t);
};
const UFOG = new T.FogExp2(0x062a44, .24);
const PU_UNDER = o => { const u = o.under ?? 0; X.PU.uUnder.value = u; X.PU.uHaze.value = o.haze ?? 0; SKY.uUnder.value = u; X.scene.fog = u > .01 ? UFOG : null;
  if (X.FISH) X.FISH.visible = u > .01 || (o.fish ?? 0) > 0; };
})();
