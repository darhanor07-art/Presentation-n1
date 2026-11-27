/* =====================================================================
   АУЫСУЛАР ЖӘНЕ СОҢҒЫ КОМПОЗИЦИЯ
   path — камера бір әлемнің ішінде үздіксіз ұшады (орбита, сүңгу, лифт, қамшы-панорама…)
   ovl  — алдыңғы кадр «қатады», жаңа кадр шейдер арқылы ашылады (бұлт, жарылым, су, бу, жарқыл, өсу, кеуіп жарылу)
   Глич пен жолақ ауысулары жоқ. Әр ауысу түрі ең көбі екі рет қолданылады (META.tr).
   ===================================================================== */
'use strict';
const World = (() => {
const X = window.GEO, T = X.T, {clamp, lerp, ss, bump, E, V, PI, TAU} = X;

const TR = X.TR = {
  dawn:       {d: 4.2, kind: 'path'},
  orbit:      {d: 3.4, kind: 'path', orbit: 1},
  rack:       {d: 2.2, kind: 'path', rack: 1},
  wedge:      {d: 3.6, kind: 'path', wedge: 1},
  dive:       {d: 2.6, kind: 'path', dive: 1},
  whip:       {d: 1.15, kind: 'path', whip: 1},
  vertigo:    {d: 2.8, kind: 'path', vertigo: 1},
  plunge:     {d: 2.8, kind: 'path', plunge: 1},
  craneup:    {d: 3.0, kind: 'path', crane: 1},
  lift:       {d: 2.6, kind: 'path', lift: 1},
  pullback:   {d: 3.6, kind: 'path', pull: 1},
  cloudpunch: {d: 2.6, kind: 'ovl', ty: 3},
  ripple:     {d: 1.7, kind: 'ovl', ty: 2},
  fault:      {d: 2.2, kind: 'ovl', ty: 4},
  liquid:     {d: 2.1, kind: 'ovl', ty: 5},
  steam:      {d: 2.3, kind: 'ovl', ty: 6},
  flare:      {d: 2.2, kind: 'ovl', ty: 7},
  bloom:      {d: 2.6, kind: 'ovl', ty: 8},
  drycrack:   {d: 2.6, kind: 'ovl', ty: 9},
  jump:       {d: .9, kind: 'ovl', ty: 1},
};
// ауысу центрі (3D нүкте → экран) — толқын, өсу т.б. сол жерден басталады
const CEN = {
  10: () => V(-8.5, 0, 3.5),           // тамшы мұхитқа түседі
  19: () => X.ll(67, 48, X.RE).applyAxisAngle(V(0, 1, 0), X.EARTH.rotation.y),   // тіршілік Қазақстаннан тарайды
  24: () => V(X.BLOCK.LAKE.x, .4, X.BLOCK.LAKE.z),
};

/* ---------------------------------------------------------------- соңғы шейдер */
const FU = {tA: {value: null}, tB: {value: null}, uType: {value: 0}, uP: {value: 0}, uTime: {value: 0}, uAsp: {value: 16 / 9},
  uZB: {value: 0}, uFlash: {value: 0}, uFade: {value: 0}, uIris: {value: 0}, uCA: {value: 0}, uGrain: {value: .02},
  uCen: {value: new T.Vector2(.5, .5)}, uMB: {value: new T.Vector2()}};
const mFinal = X.sm(`
uniform sampler2D tA,tB;uniform float uType,uP,uTime,uAsp,uZB,uFlash,uFade,uIris,uCA,uGrain;uniform vec2 uCen,uMB;varying vec2 vUv;
#define PI 3.14159265
${X.GLN}
float bump(float x,float c,float w){return exp(-pow((x-c)/w,2.));}
vec3 SA(vec2 u){return texture2D(tA,clamp(u,0.,1.)).rgb;}
vec3 SB(vec2 u){return texture2D(tB,clamp(u,0.,1.)).rgb;}
vec3 zA(vec2 u,vec2 c,float k){vec3 s=vec3(0.);for(int i=0;i<10;i++){float f=float(i)/9.;s+=SA(c+(u-c)*(1.-k*f));}return s/10.;}
vec3 zB(vec2 u,vec2 c,float k){vec3 s=vec3(0.);for(int i=0;i<10;i++){float f=float(i)/9.;s+=SB(c+(u-c)*(1.-k*f));}return s/10.;}
vec3 baseB(vec2 u){
 if(length(uMB)+uZB<1e-4)return SB(u);
 vec3 c=vec3(0.);
 for(int i=0;i<14;i++){float f=float(i)/13.-.5;vec2 o=uMB*f+(u-uCen)*uZB*f;c+=vec3(SB(u+o*(1.+uCA)).r,SB(u+o).g,SB(u+o*(1.-uCA)).b);}
 return c/14.;}
vec2 vor(vec2 p,out vec2 cid){vec2 i=floor(p),f=fract(p);float m1=9.,m2=9.;vec2 best=vec2(0.);
 for(int a=-1;a<=1;a++)for(int b=-1;b<=1;b++){vec2 o=vec2(float(a),float(b));vec2 r=o+vec2(h21(i+o),h21(i+o+5.7))*.85+.075-f;float d=dot(r,r);
  if(d<m1){m2=m1;m1=d;best=i+o;}else if(d<m2)m2=d;}
 cid=best;return vec2(sqrt(m1),sqrt(m2)-sqrt(m1));}
void main(){
 vec2 u=vUv;float p=uP;int ty=int(uType+.5);vec2 a=vec2(uAsp,1.);vec3 c;
 if(ty==0)c=baseB(u);
 else if(ty==1){float k=smoothstep(0.,1.,p);float bl=sin(PI*p)*.01;vec3 ca=vec3(0.),cb=vec3(0.);
  for(int i=0;i<6;i++){float an=float(i)*1.0472;vec2 o=vec2(cos(an),sin(an))*bl;ca+=SA(u+o);cb+=SB(u+o);}c=mix(ca,cb,k)/6.;}
 else if(ty==2){ // ТОЛҚЫН: тамшы суға түскендей (алғашқы 22% — тамшы құлап келеді)
  p=clamp((p-.22)/.78,0.,1.);vec2 d=(u-uCen)*a;float r=length(d);float fr=p*2.2;
  float wv=sin((r-fr)*64.)*exp(-abs(r-fr)*9.)*(1.-p)*.03;vec2 off=d/max(r,1e-4)/a*wv;float k=smoothstep(fr+.03,fr-.12,r);
  c=mix(SA(u+off),SB(u+off*.4),k);c+=vec3(.85,.95,1.)*exp(-pow((r-fr)*14.,2.))*.25*(1.-p);}
 else if(ty==3){ // БҰЛТҚА СҮҢГУ: A ішке қарай тартылады, бұлт жабады, B бұлттан шығады
  float e1=smoothstep(0.,.55,p),e2=smoothstep(.45,1.,p);
  vec3 ca=zA(u,vec2(.5),e1*.35);ca=SA(vec2(.5)+(u-vec2(.5))/(1.+e1*1.4))*.5+ca*.5;
  vec3 cb=zB(vec2(.5)+(u-vec2(.5))/(1.18-.18*e2),vec2(.5),(1.-e2)*.25);
  float n=fbm2(u*a*2.6+vec2(p*1.6,uTime*.05))*.65+fbm2(u*a*7.+vec2(-p*3.,0.))*.35;
  float cov=smoothstep(.05,.45,p)*(1.-smoothstep(.55,.98,p));
  float cl=smoothstep(.42,.62,n+cov*1.05-.5);
  vec3 cloud=mix(vec3(.7,.76,.86),vec3(1.04,1.04,1.06),smoothstep(.3,.8,n));
  c=mix(p<.5?ca:cb,cloud,cl);c=mix(c,vec3(1.),bump(p,.5,.08)*.35);}
 else if(ty==4){ // ЖАРЫЛЫМ: экран жер сілкінісіндей жарылып, екі жағы ығысады
  float sh=(1.-smoothstep(.0,.75,p))*smoothstep(.0,.06,p);vec2 j=vec2(sin(uTime*71.)*.006,cos(uTime*53.)*.005)*sh;
  float cx=.52+.07*(fbm2(vec2(u.y*5.,1.3))-.5)*2.+.025*sin(u.y*23.);float grow=smoothstep(0.,.25,p);
  float crackY=1.-grow*1.2;bool on=u.y>crackY;float e=1.-pow(1.-smoothstep(.22,.85,p),3.);
  float side=u.x<cx?-1.:1.;vec2 off=vec2(side*.03,side*.26)*e;
  vec2 ua=u-off+j;bool inA=ua.x<1.&&ua.x>0.&&ua.y>0.&&ua.y<1.&&((side<0.&&ua.x<cx+.002)||(side>0.&&ua.x>cx-.002));
  float gap=abs(u.x-cx);c=SB((u-.5)/(1.06-.06*smoothstep(.3,1.,p))+.5)*(.55+.45*smoothstep(.3,.95,p));
  if(e<.002||inA)c=SA(e<.002?u+j:ua);
  float lip=smoothstep(.004+e*.02,.0,abs(gap-e*.03*(side>0.?1.:1.)))*step(.001,e);
  float line=smoothstep(.003,.0,gap)*(on?1.:0.)*(1.-e)*step(.01,p);
  c+=vec3(2.2,.9,.25)*(line*1.4+lip*.6)*(1.-smoothstep(.8,1.,p));
  c=mix(c,SB(u),smoothstep(.85,1.,p));}
 else if(ty==5){ // СУ ТОЛАДЫ: жаңа кадр су деңгейі сияқты төменнен көтеріледі
  float e=smoothstep(0.,1.,p);float L=mix(-.08,1.12,e);
  float surf=L+.022*sin(u.x*uAsp*9.+uTime*3.)+.012*sin(u.x*uAsp*23.-uTime*5.)+.006*sin(u.x*uAsp*61.+uTime*7.);
  vec2 wob=vec2(sin(u.y*40.+uTime*3.),cos(u.x*30.+uTime*2.))*.004*(1.-e);
  if(u.y<surf){c=SB(u+wob)*mix(vec3(.7,.9,1.05),vec3(1.),smoothstep(.7,1.,e));float b=smoothstep(.985,1.,h21(floor((u+vec2(0.,-uTime*.12))*vec2(120.,70.))))*(surf-u.y<.25?1.:0.);c+=b*.6;}
  else c=SA(u);
  float fl=exp(-pow((u.y-surf)*180.,2.));c=mix(c,vec3(.92,.98,1.),fl*.85*(1.-smoothstep(.95,1.,e)));}
 else if(ty==6){ // БУЛАНУ: ескі кадр бу болып жоғары ұшады
  float n=fbm2(u*a*5.+vec2(0.,-p*2.5-uTime*.2));float th=p*1.5-.25+(u.y)*.35;
  float k=smoothstep(th-.08,th+.08,n);vec2 up=vec2(0.,-(1.-k)*.06*p);
  vec3 ca=SA(u+up);float edge=exp(-pow((n-th)*14.,2.));
  c=mix(SB(u),ca,k);c+=vec3(.9,.96,1.)*edge*.8*(1.-smoothstep(.85,1.,p));}
 else if(ty==7){ // КҮН ЖАРҚЫЛЫ: жоғарғы оң бұрыштан шыққан сәуле экранды ағартып, жаңа кадрға ауысады
  vec2 s=vec2(.86,.84);vec2 d=(u-s)*a;float r=length(d);float k=smoothstep(0.,.5,p)*(1.-smoothstep(.5,1.,p));
  float bloom=exp(-r*mix(6.,1.2,k));float streak=exp(-abs(d.y)*90.)*exp(-abs(d.x)*1.5);
  vec3 base=p<.5?SA(u):SB(u);
  vec3 fl=vec3(1.,.92,.8)*(bloom*2.+streak*1.5)*k;
  for(int i=1;i<4;i++){float fi=float(i);vec2 g=s+(vec2(.5)-s)*fi*.55;float gr=length((u-g)*a);fl+=vec3(.5+fi*.1,.6,1.)*smoothstep(.05+fi*.02,.0,abs(gr-.04*fi))*.25*k;}
  c=base+fl;c=mix(c,vec3(1.,.97,.92),smoothstep(.35,.5,p)*(1.-smoothstep(.5,.68,p))*.9);}
 else if(ty==8){ // ТІРШІЛІК ӨСУІ: жасыл тамыр-тамыр шекарамен жаңа кадр «өсіп» шығады
  vec2 d=(u-uCen)*a;float r=length(d);float n=fbm2(u*a*4.+3.);float fr=p*2.1;
  float g=r+(n-.5)*.35;float k=smoothstep(fr+.02,fr-.02,g);
  float vein=smoothstep(.06,.0,abs(fract(fbm2(u*a*9.)*6.)-.5))*exp(-pow((g-fr)*7.,2.));
  c=mix(SA(u),SB(u),k);c+=vec3(.25,1.3,.45)*vein*(1.-p)*1.2+vec3(.2,.9,.3)*exp(-pow((g-fr)*16.,2.))*.5*(1.-p);}
 else if(ty==9){ // КЕУІП ЖАРЫЛУ: ескі кадр құрғақ сазға айналып, қабыршақ болып түседі
  vec2 cid;vec2 vr=vor(u*a*7.,cid);vec2 cc=(cid+.5)/7./a;float dl=h21(cid)*.35+length((cc-uCen)*a)*.45;
  float cr=smoothstep(dl*.6,dl*.6+.12,p);float loc=clamp((p-dl-.15)/.35,0.,1.);
  float edge=smoothstep(.07*cr,.0,vr.y)*cr;
  vec2 pc=cc+(u-cc)/max(1.-loc*.9,.05);vec2 cid2;vec2 vr2=vor(pc*a*7.,cid2);bool same=length(cid2-cid)<.5;
  vec3 dry=mix(SA(pc),vec3(.72,.62,.48)*dot(SA(pc),vec3(.3,.59,.11))*1.4,cr*.55);
  c=(loc<.999&&same)?dry*(1.-edge*.85)*(1.-loc*.4):SB(u)*(.6+.4*smoothstep(.4,1.,p));
  if(loc>0.&&!same)c=SB(u)*(.6+.4*smoothstep(.4,1.,p));}
 c=mix(c,vec3(1.,.97,.9),clamp(uFlash,0.,1.));
 if(uIris>0.){float r=length((u-.5)*a);c*=smoothstep(uIris+.1,uIris-.1,r);}
 c*=1.-uFade;
 c+=(h21(u*vec2(1931.,1171.)+fract(uTime*7.31)*91.)-.5)*uGrain;
 gl_FragColor=vec4(c,1.);}`, FU);

/* ---------------------------------------------------------------- камера жолдары */
const _m = new T.Matrix4();
const quatOf = (pos, look, up) => { _m.lookAt(pos, look, up); return new T.Quaternion().setFromRotationMatrix(_m); };
function pathCam(A, B, p, tr, ctx) {
  let pos, q, fov = lerp(A.fov, B.fov, E.io3(p)), coc = lerp(A.coc, B.coc, p), focus = 1 / lerp(1 / A.focus, 1 / B.focus, E.io3(p));
  const fx = {mb: [0, 0], zb: 0, flash: 0, fade: 0, iris: 0, ca: 0, expo: 1};
  const qA = quatOf(A.pos, A.look, A.up), qB = quatOf(B.pos, B.look, B.up);
  if (tr.orbit || tr.wedge) {   // пивот айналасымен доға бойымен (Жерді не адамдарды айналып өту)
    const piv = ctx.set === 'space' ? V(0, 0, 0) : A.look.clone().lerp(B.look, .5);
    const ra = A.pos.clone().sub(piv), rb = B.pos.clone().sub(piv), la = ra.length(), lb = rb.length(), e = E.ioS(p);
    const qa = new T.Quaternion().setFromUnitVectors(V(0, 0, 1), ra.clone().normalize()), qb = new T.Quaternion().setFromUnitVectors(V(0, 0, 1), rb.clone().normalize());
    const qq = qa.clone().slerp(qb, e); pos = V(0, 0, 1).applyQuaternion(qq).multiplyScalar(lerp(la, lb, e) * (1 + .08 * Math.sin(PI * e))).add(piv);
    const look = A.look.clone().lerp(B.look, E.io3(p)); q = quatOf(pos, look, V(0, 1, 0));
  } else if (tr.vertigo) {
    const dB = B.pos.distanceTo(B.look), low = B.pos.clone().addScaledVector(B.look.clone().sub(B.pos).normalize(), dB * .45), dL = dB * .55;
    const fovW = 2 * Math.atan(Math.tan(B.fov * PI / 360) * dB / dL) * 180 / PI;
    if (p < .55) { const e = E.io3(p / .55); const mid = A.pos.clone().lerp(low, .5).add(V(0, .6, 0));
      pos = new T.CatmullRomCurve3([A.pos, mid, low], false, 'centripetal').getPointAt(e); q = qA.clone().slerp(qB, e); fov = lerp(A.fov, fovW, e); }
    else { const e = E.io3((p - .55) / .45); pos = low.clone().lerp(B.pos, e); q = qB.clone(); const d = lerp(dL, dB, e); fov = 2 * Math.atan(Math.tan(B.fov * PI / 360) * dB / d) * 180 / PI; }
    fx.zb = bump(p, .55, .12) * .035;
  } else if (tr.lift || tr.crane || tr.pull || tr.plunge || tr.dive) {
    const e = (tr.dive ? E.io3 : E.ioS)(p);
    let mid = A.pos.clone().lerp(B.pos, .5);
    if (tr.crane) mid.y = Math.max(A.pos.y, B.pos.y) + 1.2;
    if (tr.pull) mid = mid.add(B.pos.clone().sub(A.pos).multiplyScalar(.12)).add(V(0, 2, 0));
    if (tr.plunge) mid = V(lerp(A.pos.x, B.pos.x, .55), .9, lerp(A.pos.z, B.pos.z, .55));
    pos = new T.CatmullRomCurve3([A.pos, mid, B.pos], false, 'centripetal').getPointAt(e);
    // нысан кадрдан шығып кетпеуі үшін: қарайтын нүктені интерполяциялап, lookAt арқылы бағыттаймыз
    const lk = A.look.clone().lerp(B.look, (tr.dive ? E.io3 : E.ioS)(clamp((p - .05) / .9)));
    q = quatOf(pos, lk, V(0, 1, 0));
    if (tr.dive) { fx.zb = bump(p, .5, .18) * .05; }
    if (tr.lift) { fx.zb = bump(p, .5, .2) * .02; }
  } else {
    const e = (tr.whip ? E.io5 : tr.rack ? E.io3 : E.ioS)(p);
    pos = A.pos.clone().lerp(B.pos, e); q = qA.clone().slerp(qB, e);
    if (tr.rack) { coc = Math.max(coc, 2.6 * bump(p, .5, .22)); focus = 1 / lerp(1 / Math.max(A.focus, .1), 1 / Math.max(B.focus, .1), ss(.35, .65, p)); }
    if (tr.whip) { const e2 = E.io5(Math.min(1, p + .02)); const q2 = qA.clone().slerp(qB, e2), fwd = V(0, 0, -1);
      const d1 = fwd.clone().applyQuaternion(q), d2 = fwd.clone().applyQuaternion(q2);
      const ang = d1.angleTo(d2) / .02 * (1 / 30) / tr.d;
      const right = V(1, 0, 0).applyQuaternion(q), upv = V(0, 1, 0).applyQuaternion(q), dd = d2.clone().sub(d1);
      const sx = dd.dot(right), sy = dd.dot(upv), n = Math.hypot(sx, sy) || 1;
      const k = Math.min(.22, ang / (fov * PI / 180) * 2.2 + bump(p, .5, .15) * .06); fx.mb = [sx / n * k, sy / n * k * 1.78]; fx.ca = Math.min(.5, k * 2); }
  }
  const up = V(0, 1, 0).applyQuaternion(q), look = pos.clone().add(V(0, 0, -1).applyQuaternion(q));
  return {pos, look, up, fov, coc, focus, fx};
}

/* ---------------------------------------------------------------- API */
let cacheA = null, SLT = [];
const shotOf = (i, t) => X.shotCam(X.SL[i].shot, t);
function useCam(c, expo = 1) { X.setCam(c.pos, c.look, c.fov, c.up); X.PU.uFocus.value = Math.max(.15, c.focus); X.PU.uCoc.value = c.coc; X.PU.uExpo.value = expo * curExpo; }
let curExpo = 1;
const EXPO = {space: 1.0, ground: .92};
const trName = (i, from) => from === i - 1 ? (i === 0 ? 'dawn' : SLT[i]) : (from == null || from < 0) ? (i === 0 ? 'dawn' : 'jump') : 'jump';
function dur(i, from) { return TR[trName(i, from)].d; }
function project(c, w) { X.setCam(c.pos, c.look, c.fov, c.up); X.cam.updateMatrixWorld(true); const v = w.clone().project(X.cam); return new T.Vector2(v.x * .5 + .5, v.y * .5 + .5); }
function stageAt(i, tau, a, cam) { X.stage(i, tau, a, cam); curExpo = EXPO[X.slideSet(i)]; }
function renderA(from) {
  const key = from + '|' + X.size().join('x'); if (cacheA === key) return; cacheA = key;
  if (from < 0 || from >= X.SL.length) { X.R.setRenderTarget(X.rt.A); X.R.setClearColor(0x000000, 1); X.R.clear(); return; }
  const D = TR[trName(from, from - 1)].d, c = shotOf(from, 60); stageAt(from, 60, 60 - D, c); useCam(c); X.renderShot(X.rt.A);
}
function frame(i, tau, from) {
  const trn = trName(i, from), tr = TR[trn], D = tr.d, p = clamp(tau / D), a = tau - D;
  Object.assign(FU.uMB.value, {x: 0, y: 0}); FU.uZB.value = FU.uFlash.value = FU.uFade.value = FU.uIris.value = FU.uCA.value = 0;
  FU.uType.value = 0; FU.uP.value = p; FU.uTime.value = tau + i * 3.1; FU.uAsp.value = X.size()[0] / X.size()[1]; FU.uCen.value.set(.5, .5);
  const id = i + 1;
  if (tau < D && tr.kind === 'path') {
    const B = shotOf(i, tau);
    const A = trn === 'dawn' ? X.shotCam('black', 0) : shotOf(from, 60);
    const c = pathCam(A, B, p, tr, {set: X.slideSet(i)});
    stageAt(i, tau, a, c);
    if (trn === 'dawn') { FU.uFade.value = 1 - ss(0, .5, p); }
    if (tr.wedge) X.setCut(E.io3(ss(.15, .9, p)));                 // кесік ашылады (бөлік ұшып кетеді)
    if (tr.whip && id === 6) X.setCut(p < .5 ? 1 : 0);              // қамшы кезінде кесік жабылады
    if (tr.plunge) X.PU.uUnder.value = ss(.55, .75, p);
    if (tr.lift || tr.crane) X.SKYU.uAlt.value = clamp(X.y2alt(c.pos.y) / 130);
    useCam(c, c.fx.expo); X.renderShot(X.rt.B);
    FU.uMB.value.set(...c.fx.mb); FU.uZB.value = c.fx.zb; FU.uCA.value = c.fx.ca; FU.uFlash.value = Math.max(FU.uFlash.value, c.fx.flash);
    FU.uFade.value = Math.max(FU.uFade.value, c.fx.fade); FU.uIris.value = c.fx.iris;
  } else if (tau < D) {
    renderA(from);
    const B = shotOf(i, tau); stageAt(i, tau, a, B); useCam(B); X.renderShot(X.rt.B);
    if (CEN[id] && (from === i - 1)) { const w = CEN[id](); FU.uCen.value.copy(project(B, w)); useCam(B); }
    if (id === 24) FU.uCen.value.copy(project(B, CEN[24]()));
    FU.uType.value = tr.ty;
  } else {
    const B = shotOf(i, tau); stageAt(i, tau, a, B); useCam(B); X.renderShot(X.rt.B);
  }
  FU.tA.value = X.rt.A.texture; FU.tB.value = X.rt.B.texture;
  X.pass(mFinal, null);
}
return {
  async init(cv, IMG, o = {}) { X.init3(cv, o); await X.loadAssets(IMG); SLT = o.tr || []; return this; },
  frame, dur, TR, X,
  resize(w, h) { X.setSize(w, h); cacheA = null; },
  // 3D нүктелердің экрандағы орны (1920×1080 сахна координатасы): DOM жапсырмалары мен детальдар үшін
  probe(i, pts, tau = 6) {
    const D = TR[trName(i, i - 1)].d, c = shotOf(i, D + tau); stageAt(i, D + tau, tau, c);
    X.setCam(c.pos, c.look, c.fov, c.up); X.scene.updateMatrixWorld(true); X.cam.updateMatrixWorld(true);
    const out = {}; for (const k in pts) { const p = pts[k]().clone().project(X.cam); out[k] = [(p.x * .5 + .5) * 1920, (1 - (p.y * .5 + .5)) * 1080, p.z < 1]; }
    cacheA = null; return out;
  },
  // камераның қазіргі биіктігі (лифт слайдтарындағы есептегіш үшін)
  alt() { return X.y2alt(X.cam.position.y); },
  invalidate() { cacheA = null; },
};
})();
