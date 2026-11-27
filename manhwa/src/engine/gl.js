/* gl.js — WebGL2 "print / engraving" renderer */
(function () {
  'use strict';
  var MK = window.MK;
  var VS = '#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}';
  var FS = '#version 300 es\n' +
'precision highp float;\n' +
'uniform sampler2D uFill, uTone; uniform vec2 uRes, uShake, uMisreg, uLineOff; uniform float uDpr, uPeriod, uTime, uRippleW, uGrain;\n' +
'uniform vec4 uRipple, uFlash; out vec4 o;\n' +
'const vec3 INK=vec3(21.,17.,15.)/255., PAPER=vec3(238.,230.,214.)/255., RED=vec3(207.,42.,27.)/255.;\n' +
'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n' +
'float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),u.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x),u.y);}\n' +
'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p*=2.03;a*=.5;}return s;}\n' +
'float lines(float x,float tone){ float f=abs(fract(x)-.5)*2.; float aa=max(fwidth(x)*2.,1e-3);\n' +
'  float ink=(1.-smoothstep(tone-aa,tone+aa,f))*smoothstep(0.,.06,tone); return max(ink,smoothstep(.93,1.,tone)); }\n' +
'float redness(vec3 c){ return smoothstep(.22,.42,c.r-max(c.g,c.b)); }\n' +
'void main(){\n' +
'  vec2 css=gl_FragCoord.xy/uDpr; vec2 size=uRes/uDpr; css.y=size.y-css.y;\n' +
'  vec2 q=css+uShake;\n' +
'  vec2 d=q-uRipple.xy; float r=length(d); float k=(r-uRipple.z)/max(uRippleW,1.); float ring=exp(-k*k);\n' +
'  q+=(r>.001? d/r : vec2(0.))*uRipple.w*ring*sin(k*2.6);\n' +
'  vec2 uv=q/size;\n' +
'  vec3 base=texture(uFill,uv).rgb, shifted=texture(uFill,(q+uMisreg)/size).rgb;\n' +
'  vec3 col=mix(mix(base,PAPER,redness(base)),RED,redness(shifted));\n' +
'  vec3 T=texture(uTone,uv).rgb; float tone=T.r, ang=T.g*3.14159265; int style=int(floor(T.b*3.+.5));\n' +
'  vec2 lp=q+uLineOff; float ca=cos(ang), sa=sin(ang); vec2 p=vec2(ca*lp.x+sa*lp.y, -sa*lp.x+ca*lp.y);\n' +
'  float x; if(style==1){ float w=sin(p.y*.045+fbm(p*.012)*5.)*2.2+(fbm(p*vec2(.02,.004))-.5)*6.; x=(p.x+w)/(uPeriod*1.15);} else { x=(p.x+(vn(p*vec2(.05,.008))-.5)*1.2)/uPeriod; }\n' +
'  float brk=fbm(vec2(floor(x)*1.7, p.y*.03)); float tt=clamp(tone+(brk-.5)*.22*(1.-tone),0.,1.);\n' +
'  float ink;\n' +
'  if(style==3){ vec2 g=lp/(uPeriod*1.25); vec2 c=fract(g)-.5; float rr=length(c); float rad=sqrt(tone)*.62; float aa=fwidth(rr)*1.5; ink=(1.-smoothstep(rad-aa,rad+aa,rr))*smoothstep(0.,.05,tone); }\n' +
'  else { ink=lines(x,tt); if(style==2 && tone>.45){ float a2=ang+1.0; vec2 p2=vec2(cos(a2)*lp.x+sin(a2)*lp.y,0.); ink=max(ink,lines(p2.x/uPeriod,(tone-.45)/.55*.8)); } }\n' +
'  ink*=smoothstep(.004,.03,tone); if(tone>.985) ink=1.;\n' +
'  col=mix(col,INK,ink);\n' +
'  float cl=clamp(uRipple.w/14.,0.,1.);\n' +
'  float k2=(r-uRipple.z+uRippleW*.45)/max(uRippleW,1.)*1.0; float ring2=exp(-k2*k2*1.6);\n' +
'  col=mix(col,RED,smoothstep(.5,1.,ring2)*cl*.55*(1.-smoothstep(.75,1.,ring)));\n' +
'  col=mix(col,INK,smoothstep(.75,1.,ring)*cl*.85);\n' +
'  float lum=dot(col,vec3(.299,.587,.114)); col*=1.+(fbm(css*vec2(.9,.05))-.5)*uGrain*.12*smoothstep(.6,.85,lum);\n' +
'  vec2 vg=uv-.5; col*=1.-.07*dot(vg,vg)*2.;\n' +
'  col=mix(col,uFlash.rgb,uFlash.a); o=vec4(col,1.);\n' +
'}\n';

  var G = MK.GL = { ok: false };
  var gl, prog, U = {}, texF, texT, canvas;
  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function mkTex(unit) {
    var t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  G.init = function (cv, capture) {
    canvas = G.canvas = cv;
    gl = cv.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: !!capture, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 unavailable');
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    prog = p; gl.useProgram(p);
    ['uFill', 'uTone', 'uRes', 'uDpr', 'uPeriod', 'uTime', 'uShake', 'uMisreg', 'uRipple', 'uRippleW', 'uFlash', 'uGrain', 'uLineOff'].forEach(function (n) { U[n] = gl.getUniformLocation(p, n); });
    texF = mkTex(0); texT = mkTex(1);
    gl.uniform1i(U.uFill, 0); gl.uniform1i(U.uTone, 1);
    G.ok = true;
  };
  G.resize = function (cssW, cssH, dpr) {
    G.dpr = dpr; var w = Math.max(2, Math.round(cssW * dpr)), h = Math.max(2, Math.round(cssH * dpr));
    canvas.width = w; canvas.height = h; canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    gl.viewport(0, 0, w, h); G.cssW = cssW; G.cssH = cssH;
  };
  function up(unit, tex, src) {
    gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }
  /* u: {shake:[x,y], misreg:[x,y], ripple:[x,y,r,amp], rippleW, flash:[r,g,b,a], grain, time, lineOff:[x,y]} (css px) */
  G.draw = function (P, u) {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    up(0, texF, P.fillCanvas); up(1, texT, P.toneCanvas);
    var w = G.cssW, h = G.cssH;
    gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform1f(U.uDpr, G.dpr);
    gl.uniform1f(U.uPeriod, Math.min(5.2, Math.max(3.4, Math.min(w, h) / 190)));
    gl.uniform1f(U.uTime, u.time || 0);
    gl.uniform2f(U.uShake, u.shake[0], u.shake[1]); gl.uniform2f(U.uMisreg, u.misreg[0], u.misreg[1]);
    gl.uniform4f(U.uRipple, u.ripple[0], u.ripple[1], u.ripple[2], u.ripple[3]); gl.uniform1f(U.uRippleW, u.rippleW || 24);
    gl.uniform4f(U.uFlash, u.flash[0], u.flash[1], u.flash[2], u.flash[3]); gl.uniform1f(U.uGrain, u.grain);
    gl.uniform2f(U.uLineOff, u.lineOff ? u.lineOff[0] : 0, u.lineOff ? u.lineOff[1] : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
})();
