/* =====================================================================
   x ≠ 0 · АУЫСУЛАР ЖӘНЕ СОҢҒЫ КОМПОЗИЦИЯ
   Екі түр:  path — камера бір сыныптың ішінде үздіксіз ұшады;
             ovl  — алдыңғы кадр «қатады», жаңа кадр астынан ашылады.
   World.frame(i, tau, from) — бәрі детерминистік, видео экспортқа жарайды.
   ===================================================================== */
'use strict';
const World = (() => {
const X = X12, T = X.T, {clamp, lerp, ss, bump, E, V, PI, TAU} = X;

const TR = X.TR = {
  dawn:     {d: 4.6, kind: 'path'},
  flyin:    {d: 3.8, kind: 'path', via: [[-13, 2.3, 7.5], [-6.6, 1.86, 2.6], [-4.66, 1.8, 2.45], [-3.7, 1.92, 2.7]], tan: .9, win: 1},
  whip:     {d: 1.05, kind: 'path', whip: 1},
  rack:     {d: 1.9, kind: 'path', rack: 1},
  ripple:   {d: 1.5, kind: 'ovl', ty: 2},
  split:    {d: 2.5, kind: 'ovl', ty: 3},
  vertigo:  {d: 2.7, kind: 'path', vertigo: 1},
  dive:     {d: 2.4, kind: 'path', via: [[-2.42, 1.35, -.42], [-2.47, .48, -.46]], tan: .45, dive: 1},
  chalk:    {d: 1.7, kind: 'ovl', ty: 4},
  window:   {d: 2.6, kind: 'path', via: [[-2.7, 1.72, .55]], tan: .3, glare: 1},
  numline:  {d: 2.1, kind: 'ovl', ty: 5},
  page:     {d: 1.8, kind: 'ovl', ty: 6},
  flyout:   {d: 4.0, kind: 'path', via: [[-2.95, 1.55, 1.55], [-3.95, 1.86, 2.46], [-4.75, 1.82, 2.45], [-10.5, 3.6, 5.5], [-27, 10, 19]], tan: .35, win: 1},
  compass:  {d: 2.3, kind: 'ovl', ty: 7},
  equals:   {d: 1.9, kind: 'ovl', ty: 8},
  fraction: {d: 1.8, kind: 'ovl', ty: 9},
  tenframe: {d: 2.5, kind: 'ovl', ty: 10},
  clock:    {d: 2.3, kind: 'ovl', ty: 11},
  times:    {d: 1.8, kind: 'ovl', ty: 12},
  craneout: {d: 5.2, kind: 'path', via: [[-2.5, 2.3, 1.3], [-3.92, 1.86, 2.46], [-4.8, 1.82, 2.45], [-12, 3.4, -4], [-34, 6.5, -24]], tan: .12, win: 1, todA: .9},
  jump:     {d: .9, kind: 'ovl', ty: 1},
};
// слайдқа тән ауысу параметрлері (центр, бөлінген экранның жылжуы т.б.)
const TRX = {
  5: {cen3: () => { const v = V(); X.PEOPLE.era.j.head.getWorldPosition(v); return v.add(V(0, .06, -.1)); }},
  6: {sA: .36, sC: -.28},
  14: {cen3: () => V(4.43, 1.78, .45), r0: .3},
  21: {cen3: () => V(3.0, 2.55, -3.96)},
  22: {cen3: () => V(-.98, 1.49, -3.94)},
  23: {sA: -.12, sC: .05},
};

/* ---------------------------------------------------------------- соңғы шейдер */
const FU = {tA: {value: null}, tB: {value: null}, tC: {value: null}, tO: {value: null}, uType: {value: 0}, uP: {value: 0}, uTime: {value: 0}, uAsp: {value: 16 / 9},
  uZB: {value: 0}, uFlash: {value: 0}, uFade: {value: 0}, uIris: {value: 0}, uCA: {value: 0}, uGrain: {value: .022}, uOv: {value: 0}, uX1: {value: 0}, uX2: {value: 0},
  uCen: {value: new T.Vector2(.5, .5)}, uMB: {value: new T.Vector2()}, uS: {value: new T.Vector2()}};
const mFinal = X.sm(`
uniform sampler2D tA,tB,tC,tO;uniform float uType,uP,uTime,uAsp,uZB,uFlash,uFade,uIris,uCA,uGrain,uOv,uX1,uX2;uniform vec2 uCen,uMB,uS;varying vec2 vUv;
#define PI 3.14159265
float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}
vec3 SA(vec2 u){return texture2D(tA,clamp(u,0.,1.)).rgb;}
vec3 SB(vec2 u){return texture2D(tB,clamp(u,0.,1.)).rgb;}
vec3 SC(vec2 u){return texture2D(tC,clamp(u,0.,1.)).rgb;}
const vec3 CHK=vec3(.96,.94,.9);const vec3 INK=vec3(.071,.086,.122);
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
bool inR(vec2 u){return u.x>=0.&&u.x<=1.&&u.y>=0.&&u.y<=1.;}
vec3 paper(vec2 u0){vec2 g=u0*vec2(uAsp,1.)*24.;vec2 f=abs(fract(g)-.5);float l=smoothstep(.45,.5,max(f.x,f.y));
 vec3 b=mix(vec3(.97,.955,.92),vec3(.62,.79,.9),l*.6);float m=smoothstep(.003,.0,abs(u0.x-.12)/uAsp);b=mix(b,vec3(.86,.4,.38),m*.6);return mix(b,SA(u0),.06);}
bool piece(int ty,int i,vec2 u){
 if(ty==9){if(i==0)return u.x<.5&&u.y<.5;if(i==1)return u.x>=.5&&u.y<.5;if(i==2)return u.x<.5&&u.y>=.5;return u.x>=.5&&u.y>=.5;}
 if(i==0)return u.y>u.x&&u.y>1.-u.x; if(i==1)return u.x>=u.y&&u.x>=1.-u.y; if(i==2)return u.y<=u.x&&u.y<=1.-u.x; return u.x<u.y&&u.x<1.-u.y;}
vec2 pdir(int ty,int i){
 if(ty==9){if(i==0)return vec2(-1.,-1.);if(i==1)return vec2(1.,-1.);if(i==2)return vec2(-1.,1.);return vec2(1.,1.);}
 if(i==0)return vec2(0.,1.);if(i==1)return vec2(1.,0.);if(i==2)return vec2(0.,-1.);return vec2(-1.,0.);}
vec3 baseB(vec2 u){
 if(length(uMB)+uZB<1e-4)return SB(u);
 vec3 c=vec3(0.);
 for(int i=0;i<14;i++){float f=float(i)/13.-.5;vec2 o=uMB*f+(u-uCen)*uZB*f;c+=vec3(SB(u+o*(1.+uCA)).r,SB(u+o).g,SB(u+o*(1.-uCA)).b);}
 return c/14.;}
void main(){
 vec2 u=vUv;float p=uP;int ty=int(uType+.5);vec2 a=vec2(uAsp,1.);vec3 c;
 if(ty==0)c=baseB(u);
 else if(ty==1){float k=smoothstep(0.,1.,p);float bl=sin(PI*p)*.01;vec3 ca=vec3(0.),cb=vec3(0.);
  for(int i=0;i<6;i++){float an=float(i)*1.0472;vec2 o=vec2(cos(an),sin(an))*bl;ca+=SA(u+o);cb+=SB(u+o);}c=mix(ca,cb,k)/6.;}
 else if(ty==2){vec2 d=(u-uCen)*a;float r=length(d);float fr=p*2.2;
  float wv=sin((r-fr)*64.)*exp(-abs(r-fr)*9.)*(1.-p)*.028;vec2 off=d/max(r,1e-4)/a*wv;float k=smoothstep(fr+.03,fr-.12,r);
  c=mix(SA(u+off),SB(u+off*.4),k);c+=CHK*exp(-pow((r-fr)*14.,2.))*.22*(1.-p);}
 else if(ty==3){float q1=smoothstep(0.,.36,p),q3=smoothstep(.6,1.,p);float e1=1.-pow(1.-q1,3.),e3=q3*q3*(3.-2.*q3);
  float bx=mix(1.1,.5,e1)+(u.y-.5)*.12;float dy=e3*1.2;vec3 bg=SB((u-.5)/(1.06-.06*e3)+.5);
  if(u.x<bx){vec2 ua=vec2(u.x+uS.x*e1,u.y-dy);c=ua.y>=0.?SA(ua):bg;}
  else{vec2 uc=vec2(u.x-bx+.5+uS.y,u.y+dy);c=uc.y<=1.?SC(uc):bg;}
  c=mix(c,CHK,smoothstep(.007,.002,abs(u.x-bx)*uAsp)*(1.-e3)*step(.001,q1));}
 else if(ty==4){float n=fbm(u*vec2(5.,3.)+vec2(0.,uTime*.15));float f=u.x*.8+(1.-u.y)*.2;
  float fr=mix(-.35,1.35,p);float g=f+(n-.5)*.32;float k=smoothstep(fr+.015,fr-.015,g);
  c=mix(SA(u),SB(u),k);float band=exp(-pow((g-fr)*6.5,2.));float dust=smoothstep(.35,.85,fbm(u*vec2(48.,27.)+vec2(uTime*2.2,0.)));
  c=mix(c,CHK,clamp(band*(.3+.7*dust),0.,1.)*.9);}
 else if(ty==5){float s=smoothstep(.3,1.,p);s=s<.5?4.*s*s*s:1.-pow(-2.*s+2.,3.)/2.;vec3 acc=vec3(0.);
  for(int i=0;i<10;i++){float x=u.x+s+(float(i)/9.-.5)*uMB.x;acc+=x<1.?SA(vec2(x,u.y)):SB(vec2(x-1.,u.y));}c=acc/10.;}
 else if(ty==6){vec2 P_=u*a,O=vec2(uAsp,0.);vec2 dir=normalize(vec2(-uAsp,1.));float rad=.12;
  float dmax=dot(vec2(0.,1.)-O,dir);float e=p*p*(3.-2.*p);float f=mix(-rad*2.,dmax+PI*rad+.1,e);float d=dot(P_-O,dir);bool done=false;
  if(d>=f){float d0=2.*f-d-PI*rad;vec2 u0=(P_+dir*(d0-d))/a;if(d0>=0.&&inR(u0)){c=paper(u0)*.93;done=true;}}
  if(!done&&d>=f-rad&&d<=f){float th=PI-asin(clamp((f-d)/rad,-1.,1.));float d0=f-rad*th;vec2 u0=(P_+dir*(d0-d))/a;if(d0>=0.&&inR(u0)){c=paper(u0)*(.78+.22*sin(th));done=true;}}
  if(!done&&d>=f-rad&&d<=f){float th=asin(clamp((f-d)/rad,-1.,1.));float d0=f-rad*th;vec2 u0=(P_+dir*(d0-d))/a;if(d0>=0.&&inR(u0)){c=SA(u0)*(1.-.3*th/(PI*.5));done=true;}}
  if(!done&&d>f){c=SA(u);done=true;}
  if(!done){c=SB(u)*(1.-.45*exp(-max(f-rad-d,0.)*14.));}}
 else if(ty==7){vec2 d=(u-uCen)*a;float r=length(d);float rr=uX1+pow(smoothstep(.55,1.,p),2.)*1.9;
  float inside=smoothstep(rr+.004,rr-.004,r)*smoothstep(.4,.56,p);vec2 ub=uCen+(u-uCen)/(1.+.3*(1.-smoothstep(.5,1.,p)));
  c=mix(SA(u),SB(ub),inside);c*=1.-.35*(1.-inside)*smoothstep(0.,.25,p)*(1.-smoothstep(.62,.9,p));}
 else if(ty==8){float q1=smoothstep(0.,.42,p),q2=smoothstep(.42,.52,p),q3=smoothstep(.55,1.,p);float e1=1.-pow(1.-q1,3.),e3=q3*q3*(3.-2.*q3);
  float gap=mix(.05,0.,q2);float yT=mix(mix(1.02,.5+gap,e1),1.02,e3),yB=mix(mix(-.02,.5-gap,e1),-.02,e3);
  c=p<.5?SA(u):SB((u-.5)/(1.04-.04*e3)+.5);
  if(u.y>yT||u.y<yB){float n=fbm(u*vec2(28.,16.));vec3 dc=INK+n*.045;float edge=u.y>yT?u.y-yT:yB-u.y;
   dc=mix(dc,vec3(.957,.788,.365),smoothstep(.014,.0,edge));c=dc;}}
 else if(ty==9||ty==12){float q=smoothstep(.2,1.,p);float e=q*q;vec3 bg=SB((u-.5)/(1.1-.1*q)+.5);c=bg;
  vec2 Pa=(u-.5)*a;float sh=0.;vec3 pc=vec3(0.);bool hit=false;
  for(int i=0;i<4;i++){vec2 dr=pdir(ty,i);vec2 cen=vec2(.5)+dr*(ty==9?.25:.3);vec2 ca=(cen-.5)*a;
   vec2 tr=normalize(dr*a)*e*1.3;float sg=(i==0||i==3)?1.:-1.;float an=sg*e*.7;float sc=1.-.3*e;
   vec2 L=rot(-an)*(Pa-ca-tr)/sc+ca;vec2 uo=L/a+.5;
   if(inR(uo)&&piece(ty,i,uo)){pc=SA(uo)*(1.-.25*e);hit=true;
    float ed=ty==9?min(abs(uo.x-.5)*uAsp,abs(uo.y-.5)):min(abs(uo.y-uo.x),abs(uo.y-1.+uo.x))*.7;pc=mix(pc,CHK,smoothstep(.006,.0,ed)*.9);}
   vec2 Ls=rot(-an)*(Pa-vec2(.025,-.035)-ca-tr)/sc+ca;vec2 us=Ls/a+.5;if(inR(us)&&piece(ty,i,us))sh=1.;}
  c=mix(c,c*.45,sh*smoothstep(.2,.35,p));if(hit)c=pc;
  if(p<.25){float g=smoothstep(.0,.2,p);float ed=ty==9?min(abs(u.x-.5)*uAsp,abs(u.y-.5)):min(abs(u.y-u.x),abs(u.y-1.+u.x))*.7;
   float rr=length((u-.5)*a);c=mix(c,CHK,smoothstep(.006,.0,ed)*step(rr,g*1.2)*.9);}}
 else if(ty==10){vec2 g=vec2(5.,2.);vec2 cell=floor(u*g);vec2 lc=fract(u*g)-.5;float idx=(1.-cell.y)*5.+cell.x;
  float t0=.08+idx*.075;float f=clamp((p-t0)/.2,0.,1.);f=f*f*(3.-2.*f);float th=f*PI;float cs=cos(th);float w=abs(cs);
  if(abs(lc.x)>.5*w-.002)c=INK;
  else{float lx=lc.x/max(w,.001);float ly=lc.y/(1.+sin(th)*lx*.3*sign(cs));vec2 uu=(cell+vec2(lx,ly)+.5)/g;
   c=abs(ly)>.5?INK:(cs>0.?SA(uu):SB(uu));c*=.6+.4*w;}}
 else if(ty==11){vec2 d=(u-uCen)*a;float an=atan(d.x,d.y);if(an<0.)an+=2.*PI;float sw=uX1;float k=smoothstep(sw+.002,sw-.05,an);
  c=mix(SA(u),SB(u),k);c+=vec3(1.,.92,.75)*exp(-(sw-an)*5.)*step(an,sw)*.18*(1.-p);}
 c=mix(c,vec3(1.,.97,.9),clamp(uFlash,0.,1.));
 if(uIris>0.){float r=length((u-.5)*a);c*=smoothstep(uIris+.1,uIris-.1,r);}
 c*=1.-uFade;
 vec4 o=texture2D(tO,u);c=c*(1.-o.a*uOv)+o.rgb*uOv;
 c+=(h21(u*vec2(1931.,1171.)+fract(uTime*7.31)*91.)-.5)*uGrain;
 gl_FragColor=vec4(c,1.);}`, FU);

/* ---------------------------------------------------------------- бормен салынатын үстеме қабат (2D canvas) */
const OV = {c: X.canvas(960, 540)}; OV.g = OV.c.getContext('2d'); OV.tex = new T.CanvasTexture(OV.c); OV.tex.premultiplyAlpha = true; OV.tex.minFilter = T.LinearFilter;
FU.tO.value = OV.tex;
const CHALK = a => `rgba(245,240,230,${a})`;
function cline(g, pts, w, a = .95, col) { g.save(); g.strokeStyle = col || CHALK(a); g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = CHALK(.55 * a); g.shadowBlur = 5;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); g.restore(); }
function overlay(trn, p, info) {
  const g = OV.g; g.clearRect(0, 0, 960, 540); let on = 1;
  const C = [info.cen.x * 960, (1 - info.cen.y) * 540];
  if (trn === 'ripple') { for (let k = 0; k < 3; k++) { const r = (p * 2.2 - k * .14) * 540; if (r <= 4) continue; g.save(); g.globalAlpha = (1 - p) * (.85 - k * .22);
      g.strokeStyle = CHALK(1); g.lineWidth = 6 - k * 1.5; g.shadowColor = CHALK(.6); g.shadowBlur = 6; g.setLineDash([22 - k * 4, 12 + k * 6]); g.beginPath(); g.arc(C[0], C[1], r, 0, TAU); g.stroke(); g.restore(); } }
  else if (trn === 'numline') {
    let s = ss(.3, 1, p); s = s < .5 ? 4 * s ** 3 : 1 - (-2 * s + 2) ** 3 / 2;
    const fade = 1 - ss(.86, 1, p), draw = ss(0, .28, p), y = 330, step = 96, x0 = 72 - s * 960;
    g.save(); g.globalAlpha = fade;
    cline(g, [[24, y], [24 + (936 * 2) * draw, y]], 6);
    g.font = '700 46px Caveat'; g.textAlign = 'center'; g.fillStyle = CHALK(.95); g.shadowColor = CHALK(.5); g.shadowBlur = 4;
    for (let i = 0; i <= 20; i++) { const x = x0 + i * step; if (x < -40 || x > 1000) continue; const vis = ss(i * .012, i * .012 + .05, draw);
      if (vis <= 0) continue; g.globalAlpha = fade * vis; cline(g, [[x, y - (i % 5 ? 14 : 24)], [x, y + (i % 5 ? 14 : 24)]], i % 5 ? 4 : 6); g.fillText(String(i), x, y + 68); }
    const hop = ss(.32, .9, p); for (let k = 0; k < 5; k++) { const r = clamp(hop * 5 - k); if (r <= 0) continue; const xa = x0 + (7 + k) * step;
      g.globalAlpha = fade; g.strokeStyle = 'rgba(242,139,108,.95)'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(xa + step / 2, y, step / 2, PI, PI + PI * r); g.stroke(); }
    g.restore(); }
  else if (trn === 'compass') {
    const R = info.r0 * 540, ang = -PI / 2 + ss(.04, .5, p) * TAU, lift = ss(.5, .7, p), al = 1 - ss(.55, .75, p);
    const arcA = 1 - ss(.72, .95, p);
    g.save(); g.globalAlpha = arcA; g.strokeStyle = CHALK(.95); g.lineWidth = 6; g.shadowColor = CHALK(.6); g.shadowBlur = 6; g.lineCap = 'round';
    g.beginPath(); g.arc(C[0], C[1], R + ss(.55, 1, p) ** 2 * 1.9 * 540, -PI / 2, ang); g.stroke(); g.restore();
    if (al > 0) { const T_ = [C[0] + R * Math.cos(ang), C[1] + R * Math.sin(ang)], H = [(C[0] + T_[0]) / 2, (C[1] + T_[1]) / 2 - R * .95 - lift * 120];
      g.save(); g.globalAlpha = al;
      cline(g, [H, [C[0], C[1] - lift * 120]], 12, 1, '#2A3140'); cline(g, [H, [T_[0], T_[1] - lift * 120]], 12, 1, '#2A3140');
      cline(g, [[T_[0], T_[1] - lift * 120 - 30], [T_[0], T_[1] - lift * 120]], 10, 1, '#F4C95D');
      g.fillStyle = '#C9CED6'; g.beginPath(); g.arc(H[0], H[1], 16, 0, TAU); g.fill(); g.fillStyle = '#2A3140'; g.fillRect(H[0] - 6, H[1] - 46, 12, 32);
      g.restore(); } }
  else if (trn === 'tenframe') {
    const fade = ss(0, .08, p) * (1 - ss(.9, 1, p)), cw = 192, chh = 270;
    g.save(); g.globalAlpha = fade;
    for (let i = 0; i <= 5; i++) cline(g, [[i * cw, 0], [i * cw, 540]], 6); cline(g, [[0, 270], [960, 270]], 6);
    for (let k = 0; k < 10; k++) { const t0 = .08 + k * .075 + .1, r = clamp((p - t0) / .12); if (r <= 0) continue;
      const cx = (k % 5) * cw + cw / 2, cy = Math.floor(k / 5) * chh + chh / 2, s = E.oBack(r) * 58;
      g.fillStyle = k < 7 ? '#F28B6C' : '#F4C95D'; g.beginPath(); g.arc(cx, cy, s, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(cx - s * .3, cy - s * .3, s * .28, 0, TAU); g.fill(); }
    g.font = '700 84px Caveat'; g.textAlign = 'center'; g.fillStyle = CHALK(.95); g.globalAlpha = fade * ss(.82, .9, p); g.fillText('7 + 3 = 10', 480, 290);
    g.restore(); }
  else if (trn === 'clock') {
    const sw = info.sw, fade = 1 - ss(.85, 1, p);
    g.save(); g.globalAlpha = fade;
    g.strokeStyle = CHALK(.35); g.lineWidth = 3; g.setLineDash([4, 14]); g.beginPath(); g.arc(C[0], C[1], 250, 0, TAU); g.stroke(); g.setLineDash([]);
    const hand = (ang, len, w) => cline(g, [[C[0], C[1]], [C[0] + Math.sin(ang) * len, C[1] - Math.cos(ang) * len]], w);
    hand(sw, 600, 7); hand(sw / 12 + 2.6, 150, 11);
    g.fillStyle = CHALK(.95); g.beginPath(); g.arc(C[0], C[1], 12, 0, TAU); g.fill(); g.restore(); }
  else on = 0;
  if (on) OV.tex.needsUpdate = true; return on;
}

/* ---------------------------------------------------------------- камера жолдары */
const _m = new T.Matrix4(), _q1 = new T.Quaternion(), _q2 = new T.Quaternion(), _q3 = new T.Quaternion();
const quatOf = (pos, look, up) => { _m.lookAt(pos, look, up); return new T.Quaternion().setFromRotationMatrix(_m); };
function pathCam(A, B, p, tr) {
  let pos, q, fov = lerp(A.fov, B.fov, E.io3(p)), coc = lerp(A.coc, B.coc, p), focus = 1 / lerp(1 / A.focus, 1 / B.focus, E.io3(p));
  const fx = {mb: [0, 0], zb: 0, flash: 0, fade: 0, iris: 0, ca: 0, expo: 1};
  const qA = quatOf(A.pos, A.look, A.up), qB = quatOf(B.pos, B.look, B.up);
  if (tr.vertigo) {
    const dB = B.pos.distanceTo(B.look), low = B.pos.clone().addScaledVector(B.look.clone().sub(B.pos).normalize(), .62), dL = dB - .62;
    const fovW = 2 * Math.atan(Math.tan(B.fov * PI / 360) * dB / dL) * 180 / PI;
    if (p < .55) { const e = E.io3(p / .55); const mid = A.pos.clone().lerp(low, .5).add(V(0, .35, 0));
      const cv = new T.CatmullRomCurve3([A.pos, mid, low], false, 'centripetal'); pos = cv.getPointAt(e); q = qA.clone().slerp(qB, E.io3(p / .55)); fov = lerp(A.fov, fovW, e); }
    else { const e = E.io3((p - .55) / .45); pos = low.clone().lerp(B.pos, e); q = qB.clone(); const d = lerp(dL, dB, e); fov = 2 * Math.atan(Math.tan(B.fov * PI / 360) * dB / d) * 180 / PI; }
    fx.zb = bump(p, .78, .12) * .03;
  } else if (tr.via) {
    const pts = [A.pos, ...tr.via.map(v => V(...v)), B.pos], cv = new T.CatmullRomCurve3(pts, false, 'centripetal');
    const e = (tr.dive ? E.io3 : E.ioS)(p); pos = cv.getPointAt(e);
    q = qA.clone().slerp(qB, E.io3(clamp((p - .05) / .9)));
    if (tr.tan) { const tg = cv.getTangentAt(Math.min(e, .999)); const qt = quatOf(pos, pos.clone().add(tg), Math.abs(tg.y) > .9 ? V(0, 0, -1) : V(0, 1, 0));
      q.slerp(qt, tr.tan * Math.sin(PI * e) ** 2); }
    if (tr.win) { const k = bump(pos.x, -4.7, .45); fx.flash = k * .55; fx.zb = k * .06; fx.expo = 1 + k * .6; }
    if (tr.dive) { const k = bump(p, .55, .17); fx.iris = lerp(1.6, .28, k); fx.fade = k * .35; }
    if (tr.glare) { const k = bump(p, .8, .1); fx.flash = k * .6; fx.zb = k * .05; fx.expo = 1 + ss(.5, .85, p) * .4 - ss(.85, 1, p) * .4; }
  } else {
    const e = (tr.whip ? E.io5 : tr.rack ? E.io3 : E.o2)(p);
    pos = A.pos.clone().lerp(B.pos, e); q = qA.clone().slerp(qB, e);
    if (tr.rack) { coc = lerp(A.coc, B.coc, e) + 3.2 * bump(p, .5, .22); focus = 1 / lerp(1 / A.focus, 1 / B.focus, ss(.35, .65, p)); }
    if (tr.whip) { const e2 = E.io5(Math.min(1, p + .02)); const q2 = qA.clone().slerp(qB, e2), fwd = V(0, 0, -1);
      const d1 = fwd.clone().applyQuaternion(q), d2 = fwd.clone().applyQuaternion(q2);
      const ang = d1.angleTo(d2) / .02 * (1 / 30) / tr.d;   // бір кадрдағы бұрыш
      const right = V(1, 0, 0).applyQuaternion(q), upv = V(0, 1, 0).applyQuaternion(q), dd = d2.clone().sub(d1);
      const sx = dd.dot(right), sy = dd.dot(upv), n = Math.hypot(sx, sy) || 1;
      const k = Math.min(.22, ang / (fov * PI / 180) * 2.2); fx.mb = [sx / n * k, sy / n * k * 1.78]; fx.ca = Math.min(.5, k * 2); }
  }
  const up = V(0, 1, 0).applyQuaternion(q), look = pos.clone().add(V(0, 0, -1).applyQuaternion(q));
  return {pos, look, up, fov, coc, focus, fx};
}

/* ---------------------------------------------------------------- API */
let cacheA = null, last = null;
const shotOf = (i, t) => X.shotCam(X.SL[i].shot, t);
function useCam(c, expo = 1) { X.setCam(c.pos, c.look, c.fov, c.up); X.PU.uFocus.value = Math.max(.15, c.focus); X.PU.uCoc.value = c.coc;
  X.PU.uExpo.value = expo * curExpo; }
let curExpo = 1;
function todExpo(t) { curExpo = X.tod(t).expo; }
const trName = (i, from) => from === i - 1 ? (i === 0 ? 'dawn' : SLT[i]) : (from == null || from < 0) ? (i === 0 ? 'dawn' : 'jump') : 'jump';
let SLT = [];
function dur(i, from) { return TR[trName(i, from)].d; }
function project(c, w) { X.setCam(c.pos, c.look, c.fov, c.up); X.cam.updateMatrixWorld(true); const v = w.clone().project(X.cam); return new T.Vector2(v.x * .5 + .5, v.y * .5 + .5); }
function renderA(from) {
  const key = from + '|' + X.size().join('x'); if (cacheA === key) return; cacheA = key;
  if (from < 0 || from >= X.SL.length) { X.R.setRenderTarget(X.rt.A); X.R.setClearColor(0x000000, 1); X.R.clear(); return; }   // басынан ашылғанда — қара кадрдан
  const D = TR[trName(from, from - 1)].d; X.stage(from, 60, 60 - D); todExpo(X.SL[from].tod);
  useCam(shotOf(from, 60)); X.renderShot(X.rt.A);
}
function frame(i, tau, from) {
  const S = X.SL[i], trn = trName(i, from), tr = TR[trn], D = tr.d, p = clamp(tau / D), a = tau - D;
  Object.assign(FU.uMB.value, {x: 0, y: 0}); FU.uZB.value = FU.uFlash.value = FU.uFade.value = FU.uIris.value = FU.uCA.value = FU.uOv.value = 0;
  FU.uType.value = 0; FU.uP.value = p; FU.uTime.value = tau + i * 3.1; FU.uAsp.value = X.size()[0] / X.size()[1];
  if (tau < D && tr.kind === 'path') {
    X.stage(i, tau, a);
    const A = trn === 'dawn' ? X.shotCam('ext0', 0) : shotOf(from, 60), B = shotOf(i, tau);
    const c = pathCam(A, B, p, tr);
    if (trn === 'dawn') { const tt = lerp(0, S.tod, E.o2(p)); X.applyTod(X.tod(tt)); todExpo(tt); FU.uFade.value = 1 - ss(0, .32, p); }
    else if (tr.todA !== undefined) { const tt = lerp(tr.todA, S.tod, ss(.25, .8, p)); X.applyTod(X.tod(tt)); todExpo(tt); }
    else todExpo(S.tod);
    useCam(c, c.fx.expo); X.renderShot(X.rt.B);
    FU.uMB.value.set(...c.fx.mb); FU.uZB.value = c.fx.zb; FU.uCA.value = c.fx.ca; FU.uFlash.value = Math.max(FU.uFlash.value, c.fx.flash);
    FU.uFade.value = Math.max(FU.uFade.value, c.fx.fade); FU.uIris.value = c.fx.iris; FU.uCen.value.set(.5, .5);
  } else if (tau < D) {
    renderA(from);
    X.stage(i, tau, a); todExpo(S.tod); const B = shotOf(i, tau); useCam(B); X.renderShot(X.rt.B);
    const ex = TRX[i + 1] || {};
    let cen = new T.Vector2(.5, .5); if (ex.cen3) cen = project(B, ex.cen3()); useCam(B);
    if (tr.ty === 3) { const Cc = X.shotCam(S.split.shot, tau); useCam(Cc); X.renderShot(X.rt.C); FU.uS.value.set(ex.sA || 0, ex.sC || 0); }
    FU.uType.value = tr.ty; FU.uCen.value.copy(cen); FU.uX1.value = tr.ty === 7 ? (ex.r0 || .3) : tr.ty === 11 ? E.io3(p) * TAU : 0;
    if (tr.ty === 5) FU.uMB.value.set(bump(p, .65, .17) * .09, 0);
    FU.uOv.value = overlay(trn, p, {cen, r0: ex.r0 || .3, sw: FU.uX1.value});
  } else {
    X.stage(i, tau, a); todExpo(S.tod); useCam(shotOf(i, tau)); X.renderShot(X.rt.B);
  }
  FU.tA.value = X.rt.A.texture; FU.tB.value = X.rt.B.texture; FU.tC.value = X.rt.C.texture;
  X.pass(mFinal, null);
  last = {i, tau, from};
}
return {
  async init(cv, IMG, o = {}) { X.init3(cv, o); await X.loadAssets(IMG); X.mountPortrait(); X.finish(); SLT = o.tr || []; return this; },
  frame, dur, TR, X,
  resize(w, h) { X.setSize(w, h); cacheA = null; },
  probe(i) {   // 3D нысандардың экрандағы орны (1920×1080 сахна координатасы) — DOM детальдары үшін
    const D = TR[trName(i, i - 1)].d, tau = D + 4; X.stage(i, tau, tau - D);
    const c = X.shotCam(X.SL[i].shot, tau); X.setCam(c.pos, c.look, c.fov, c.up); X.scene.updateMatrixWorld(true); X.cam.updateMatrixWorld(true);
    const pr = v => { const p = v.clone().project(X.cam); return [(p.x * .5 + .5) * 1920, (1 - (p.y * .5 + .5)) * 1080]; };
    const card = new T.Vector3(); X.CARD.getWorldPosition(card);
    const nb = new T.Vector3(.12, .01, -.08); X.NB.A.grp.localToWorld(nb);
    cacheA = null; return {card: pr(card), nb: pr(nb)};
  },
  invalidate() { cacheA = null; },
};
})();
