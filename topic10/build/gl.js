/* =====================================================================
   GL — фон фотосы мен «видео» ауысуларды салатын WebGL қозғалтқышы.
   Бір фрагмент-шейдерде 8 ауысу бар: focus, iris, braille, fog, beam,
   ripple, tunnel, intro. Әр сурет «Сия мен шам» палитрасына бояуланады,
   сондықтан әртүрлі фотолар бір стильде көрінеді.
   ===================================================================== */
const GLSL_V = `attribute vec2 aPos; varying vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`;
const GLSL_F = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA, uB;
uniform float uAspA, uAspB, uZA, uZB, uGA, uGB, uP, uT, uScr, uType, uFade, uBA, uBB;
uniform vec2 uFA, uFB, uCen, uRes, uSA, uSB;
const vec3 INK = vec3(0.043,0.059,0.102);
const vec3 MID = vec3(0.235,0.290,0.372);
const vec3 LAMP = vec3(0.957,0.718,0.251);
const vec3 IVORY = vec3(0.961,0.937,0.894);
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=.5; } return v; }
vec2 cover(vec2 uv, float asp, float z, vec2 f){
  vec2 s = vec2(1.);
  if (asp > uScr) s.x = uScr/asp; else s.y = asp/uScr;
  vec2 win = s / z;
  vec2 c = clamp(f, win*.5, 1.-win*.5);
  return c + (uv-.5)*win;
}
vec3 gradeC(vec3 c, float g){
  float l = dot(c, vec3(.299,.587,.114));
  vec3 m = l < .45 ? mix(INK, MID, l/.45) : (l < .8 ? mix(MID, LAMP, (l-.45)/.35) : mix(LAMP, IVORY, (l-.8)/.2));
  return mix(c, m, g);
}
vec3 shadeC(vec3 c, vec2 uv, vec2 S){
  float d = 0.;
  if (S.x < .5) d = 0.;
  else if (S.x < 1.5) d = smoothstep(.80, .05, uv.x);
  else if (S.x < 2.5) d = smoothstep(.20, .95, uv.x);
  else if (S.x < 3.5) d = .45 + .55*smoothstep(.15, .85, length((uv-.5)*vec2(1.5,1.)));
  else if (S.x < 4.5) d = smoothstep(.42, 1., uv.y);
  else d = smoothstep(.58, 0., uv.y);
  c = mix(c, INK, clamp(S.y*d, 0., 1.));
  float v = smoothstep(1.25, .3, length((uv-.5)*vec2(1.25,1.)));
  return c * mix(.62, 1., v);
}
vec3 samp(sampler2D t, vec2 iu, float r){
  if (r < .0005) return texture2D(t, iu).rgb;
  vec3 acc = vec3(0.);
  for (int i=0;i<16;i++){ float fi=float(i); float a=fi*2.39996; float rr=sqrt((fi+.5)/16.)*r;
    acc += texture2D(t, iu + vec2(cos(a), sin(a))*rr).rgb; }
  return acc/16.;
}
vec3 sceneA(vec2 uv, float r){ return shadeC(gradeC(samp(uA, cover(uv, uAspA, uZA, uFA), max(r, uBA)), uGA), uv, uSA); }
vec3 sceneB(vec2 uv, float r){ return shadeC(gradeC(samp(uB, cover(uv, uAspB, uZB, uFB), max(r, uBB)), uGB), uv, uSB); }
void main(){
  vec2 uv = vUv; float p = uP; vec3 col;
  vec2 asp = vec2(uScr, 1.);
  if (uType < .5) {                                   /* rest */
    col = sceneB(uv, 0.);
  } else if (uType < 1.5) {                           /* focus: refocus like glasses */
    float m = smoothstep(.3,.7,p);
    col = mix(sceneA(uv, p*.035), sceneB(uv, (1.-p)*.035), m) + LAMP*.10*sin(p*3.14159);
  } else if (uType < 2.5) {                           /* iris: the eye closes and opens */
    float d = length((uv-uCen)*asp);
    float maxr = length(asp)*.55 + .1;
    float ang = atan(uv.y-uCen.y, (uv.x-uCen.x)*uScr);
    if (p < .5) { float r = mix(maxr, 0., smoothstep(0.,1.,p*2.)); col = d < r ? sceneA(uv,0.) : INK;
      col += LAMP*exp(-pow((d-r)/.025,2.))*(.6+.4*sin(ang*48.)); }
    else { float r = mix(0., maxr, smoothstep(0.,1.,(p-.5)*2.)); col = d < r ? sceneB(uv,0.) : INK;
      col += LAMP*exp(-pow((d-r)/.03,2.))*(.6+.4*sin(ang*48.+p*6.)); }
  } else if (uType < 3.5) {                           /* braille: tactile dot dissolve */
    vec2 q = uv*asp/0.024; vec2 gp = floor(q); vec2 lc = fract(q)-.5;
    vec2 cell = floor(gp/vec2(3.,4.)); vec2 inC = mod(gp, vec2(3.,4.));
    float isDot = (inC.x < 1.5 && inC.y < 2.5) ? 1. : 0.;
    float t0 = hash(cell)*.42 + uv.x*.36;
    float k = clamp((p - t0)/.2, 0., 1.);
    vec3 a = sceneA(uv,0.), b = sceneB(uv,0.);
    float inside = isDot*(1.-smoothstep(k*.62-.06, k*.62, length(lc)));
    col = mix(a*(1.-.3*smoothstep(0.,.5,p)), b, inside);
    col += LAMP*isDot*k*(1.-k)*4.*smoothstep(.45,.0,length(lc+vec2(.16,-.16)))*.4;
    col = mix(col, b, smoothstep(.8, 1., p));
  } else if (uType < 4.5) {                           /* fog: cataract-like milk */
    float n = fbm(uv*3.5 + vec2(uT*.05, 0.));
    vec3 fogc = mix(vec3(.78,.77,.74), IVORY, n);
    vec3 base = p < .5 ? sceneA(uv, p*.05) : sceneB(uv, (1.-p)*.05);
    col = mix(base, fogc, smoothstep(0.,1.,sin(p*3.14159))*.93);
  } else if (uType < 5.5) {                           /* beam: a sweep of lamplight */
    vec2 dir = normalize(vec2(1., .35));
    float x = dot((uv-.5)*asp, dir)/(length(asp)*.5)*.5+.5;
    float e = mix(-.15, 1.15, p);
    col = x < e ? sceneB(uv,0.) : sceneA(uv,0.);
    col += LAMP*exp(-pow((x-e)/.05,2.))*1.3 + IVORY*exp(-pow((x-e)/.012,2.))*.8;
  } else if (uType < 6.5) {                           /* ripple: a sound wave */
    vec2 dv = (uv-uCen)*asp; float d = length(dv);
    float r = p*(length(asp)*.62+.15);
    float w = sin((d-r)*70.)*exp(-abs(d-r)*14.)*.014*(1.-p*.6);
    vec2 off = d > 0. ? normalize(dv)/asp*w : vec2(0.);
    col = d < r ? sceneB(uv+off, 0.) : sceneA(uv+off, 0.);
    col += LAMP*exp(-pow((d-r)/.012,2.))*.9;
  } else if (uType < 7.5) {                           /* tunnel: camera flies in */
    vec2 c = uCen; vec3 a = vec3(0.), b = vec3(0.);
    float za = 1.+p*1.8, zb = .55+.45*p;
    for (int i=0;i<8;i++){ float fi=float(i)/8.;
      a += sceneA(c + (uv-c)/(za*(1.+fi*p*.12)), 0.);
      b += sceneB(c + (uv-c)/(zb*(1.+fi*(1.-p)*.12)), 0.); }
    col = mix(a/8., b/8., smoothstep(.35,.75,p));
  } else {                                            /* intro: light from one dot */
    float d = length((uv-uCen)*asp);
    float r = smoothstep(0.,1.,p)*(length(asp)*.62+.25);
    col = mix(INK, sceneB(uv,0.), 1.-smoothstep(r-.28, r, d));
    col += LAMP*exp(-pow(d/.035,2.))*(1.-p)*2.;
  }
  col += (hash(uv*uRes + fract(uT)*61.)-.5)*.032;
  col = mix(col, INK, uFade);
  gl_FragColor = vec4(col, 1.);
}`;

const TR_CODE = {rest:0, focus:1, iris:2, braille:3, fog:4, beam:5, ripple:6, tunnel:7, intro:8};
const SHADE_CODE = {N:0, L:1, R:2, C:3, T:4, B:5};

class GLStage {
  constructor(canvas){
    this.c = canvas;
    const gl = this.gl = canvas.getContext('webgl', {premultipliedAlpha:false, preserveDrawingBuffer:true, antialias:false});
    if (!gl) { this.ok = false; return; }
    this.ok = true;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = this.pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, GLSL_V)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, GLSL_F)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {}; ['uA','uB','uAspA','uAspB','uZA','uZB','uGA','uGB','uP','uT','uScr','uType','uFade','uFA','uFB','uCen','uRes','uSA','uSB','uBA','uBB']
      .forEach(n => this.u[n] = gl.getUniformLocation(pr, n));
    gl.uniform1i(this.u.uA, 0); gl.uniform1i(this.u.uB, 1);
    this.tex = {};
    this.blank = this.makeTex(null);
  }
  makeTex(img){
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([11,15,26]));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(w => gl.texParameteri(gl.TEXTURE_2D, w, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return {t, asp: img ? img.naturalWidth / img.naturalHeight : 16/9};
  }
  add(name, img){ if (this.ok) this.tex[name] = this.makeTex(img); }
  /* s = {bg, kb:[x,y], z, grade, shade}; zoom = actual zoom including Ken Burns drift */
  bind(unit, s, zoom){
    const gl = this.gl, T = this.tex[s.bg] || this.blank, U = this.u, k = unit ? 'B' : 'A';
    gl.activeTexture(unit ? gl.TEXTURE1 : gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.t);
    gl.uniform1f(U['uAsp'+k], T.asp); gl.uniform1f(U['uZ'+k], zoom); gl.uniform1f(U['uG'+k], s.grade);
    gl.uniform2f(U['uF'+k], s.kb[0], 1 - s.kb[1]);
    gl.uniform2f(U['uS'+k], SHADE_CODE[s.shade] || 0, s.shadeK ?? .78); gl.uniform1f(U['uB'+k], s.blur || 0);
  }
  draw({A, B, zA, zB, type='rest', p=0, t=0, cen=[.5,.5], fade=0}){
    if (!this.ok) return;
    const gl = this.gl, U = this.u, w = this.c.width, h = this.c.height;
    gl.viewport(0, 0, w, h);
    this.bind(0, A || B, zA ?? (A || B).z); this.bind(1, B, zB ?? B.z);
    gl.uniform1f(U.uP, p); gl.uniform1f(U.uT, t); gl.uniform1f(U.uScr, w / h); gl.uniform1f(U.uType, TR_CODE[type] ?? 0);
    gl.uniform1f(U.uFade, fade); gl.uniform2f(U.uCen, cen[0], 1 - cen[1]); gl.uniform2f(U.uRes, w, h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
