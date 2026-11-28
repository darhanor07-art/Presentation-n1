/* three.js — MK.three: LIVE three.js layer rendered offscreen and composited into the FILL + TONE canvases (see ENGINE.md "Live 3D").
   Two-pass print render: every mesh made with MK.three.mesh(geo, print) has a FILL material (flat palette colour) and a TONE material
   (lambert-ish tone from 3 lights -> R=tone, G=hatch angle/180, B=style), rendered one after the other and drawn into P.ctxF / P.ctxT.
   Deterministic: no THREE.Clock / Date / performance here — scenes pass time (mixer.setTime(sec)) and dt. */
(function () {
  'use strict';
  var MK = window.MK, clamp = MK.clamp, T = MK.three = { gen: 0, W: 1400 };
  var STY = { line: 0, grain: 85, cross: 170, dots: 255 };
  var state = 0, R = null, scene = null, U = null, sizeW = 0, sizeH = 0, warned = false;   // state: 0 untried, 1 ok, 2 failed

  function warn(m, e) { if (!warned) { warned = true; try { console.warn('[MK.three] ' + m + (e ? ': ' + (e.message || e) : '') + ' - falling back to 2D sprites'); } catch (_) { } } }
  function fail(m, e) { state = 2; warn(m, e); }

  /* ---------------- GLSL ---------------- */
  var VIB = [
    'uniform vec4 uRip;', 'uniform vec3 uRipC; uniform vec3 uAx;',        // uRip = (tau, amp, k, omega); medal (wave source) and bell axis in world space
    'float ripW(vec3 wp, out float cs){ cs=0.; float tau=uRip.x; if(uRip.y<=0.||tau<0.) return 0.;',
    '  float d=length(wp-uRipC), front=900.*tau; float g=1.-smoothstep(front-70.,front+10.,d);',
    '  float env=exp(-tau/.9)*g, ph=uRip.z*d-uRip.w*tau; cs=env*cos(ph); return env*sin(ph); }',
    'vec3 ripDir(vec3 wp){ vec3 r=vec3(wp.x-uAx.x,0.,wp.z-uAx.z); float l=length(r); return l>1e-3? r/l : vec3(0.,0.,1.); }'
  ].join('\n');
  /* object-space displacement of `pos` (used by FILL, TONE and OUTLINE vertex shaders alike so all three move identically) */
  var VIBFN = [
    'void vibrate(inout vec3 pos, vec3 wn, out float w, out vec3 tilt){ w=0.; tilt=vec3(0.);',
    '  #ifdef VIB', '  vec4 wp=modelMatrix*vec4(pos,1.); float cs; w=ripW(wp.xyz,cs);',
    '  if(uRip.y>0.){ vec3 rd=ripDir(wp.xyz); pos+=transpose(mat3(modelMatrix))*(rd*uRip.y*w);',
    '    vec3 dir=normalize(wp.xyz-uRipC+vec3(1e-4)); vec3 td=dir-wn*dot(dir,wn); float tl=length(td); tilt=(tl>1e-3? td/tl : vec3(0.))*(uRip.y*uRip.z*cs); }',
    '  #endif', '}'
  ].join('\n');
  var VS_TONE = VIB + '\n' + VIBFN + '\n' + [
    'varying vec3 vN; varying float vW; varying vec3 vTilt;',
    'void main(){ vec3 pos=position; vec3 wn=normalize((normalMatrix*normal)*mat3(viewMatrix));',
    '  float w; vec3 tilt; vibrate(pos,wn,w,tilt); vN=wn; vW=w; vTilt=tilt;',
    '  gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(pos,1.); }'
  ].join('\n');
  var FS_TONE = [
    'uniform vec3 uKeyD,uKeyC,uRimD,uRimC,uSky,uGrd; uniform float uFlash,uAlb; uniform vec4 uTn; uniform vec2 uLev,uEnc;',
    'varying vec3 vN; varying float vW; varying vec3 vTilt;',
    'void main(){ vec3 n=normalize(vN);',
    '  #ifdef DBL', '  if(!gl_FrontFacing) n=-n;', '  #endif',
    '  #ifdef VIB', '  n=normalize(n-vTilt*1.7);', '  #endif',
    '  vec3 irr=uKeyC*max(dot(n,uKeyD),0.)+uRimC*max(dot(n,uRimD),0.)+mix(uGrd,uSky,n.y*.5+.5);',
    '  float lum=dot(irr,vec3(.2126,.7152,.0722))*uAlb/3.14159265;',
    '  float lit=clamp((lum-uLev.x)/(uLev.y-uLev.x)+uFlash*.5,0.,1.);',
    '  #ifdef VIB', '  lit=clamp(lit+vW*.3,0.,1.);', '  #endif',
    '  float tone=uTn.x+(uTn.y-uTn.x)*pow(1.-lit,uTn.z);',
    '  gl_FragColor=vec4(tone,uEnc.x,uEnc.y,1.); }'
  ].join('\n');
  /* inverted-hull outline: back faces pushed along the view-space normal (screen px = world units) and back in depth */
  var VS_OUT = VIB + '\n' + VIBFN + '\n' + [
    'uniform float uOw;',
    'void main(){ vec3 pos=position; vec3 wn=normalize((normalMatrix*normal)*mat3(viewMatrix));',
    '  float w; vec3 tilt; vibrate(pos,wn,w,tilt);',
    '  vec4 mv=viewMatrix*modelMatrix*vec4(pos,1.); vec2 d2=(normalMatrix*normal).xy; float l=length(d2);',
    '  mv.xy+=(l>1e-3? d2/l : vec2(0.))*uOw; mv.z-=uOw*2.; gl_Position=projectionMatrix*mv; }'
  ].join('\n');
  var FS_OUT = 'uniform vec3 uCol; void main(){ gl_FragColor=vec4(uCol,1.); }';
  /* injected into MeshBasicMaterial (FILL) of vibrating meshes */
  function fillVib(shader) {
    shader.uniforms.uRip = U.uRip; shader.uniforms.uRipC = U.uRipC; shader.uniforms.uAx = U.uAx;
    shader.vertexShader = shader.vertexShader.replace('void main() {', '#define VIB 1\n' + VIB + '\n' + VIBFN + '\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec3 wn0=normalize(normal); float w0; vec3 t0; vibrate(transformed,wn0,w0,t0); }');
  }

  /* ---------------- init ---------------- */
  function init() {
    if (state) return;
    var THREE = window.THREE;
    if (!THREE) { fail('three.min.js missing'); return; }
    try {
      THREE.ColorManagement.enabled = false;
      R = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      R.setPixelRatio(1); R.outputColorSpace = THREE.LinearSRGBColorSpace; R.toneMapping = THREE.NoToneMapping; R.setClearColor(0x000000, 0);
      R.domElement.addEventListener('webglcontextlost', function (e) { e.preventDefault(); state = 2; warn('WebGL context lost'); }, false);
      R.domElement.addEventListener('webglcontextrestored', function () { state = 1; T.gen++; warned = false; }, false);
      scene = new THREE.Scene();
      var V3 = function (x, y, z) { return { value: new THREE.Vector3(x, y, z) }; };
      U = T.U = {
        uKeyD: V3(0, 0, 0), uKeyC: V3(0, 0, 0), uRimD: V3(0, 0, 0), uRimC: V3(0, 0, 0), uSky: V3(0, 0, 0), uGrd: V3(0, 0, 0),
        uFlash: { value: 0 }, uRip: { value: new THREE.Vector4(0, 0, 1, 1) }, uRipC: V3(0, 0, 0), uAx: V3(0, 0, 0)
      };
      state = 1;
      T.setLights({ key: { dir: [-700, 1500, 900], color: 0xfff0dc, i: 3.1 }, rim: { dir: [900, 500, -800], color: 0xffc8b0, i: 1.9 }, hemi: { sky: 0xf0d8d0, ground: 0x40201c, i: 1.1 } });
    } catch (e) { fail('WebGL renderer unavailable', e); }
  }
  Object.defineProperty(T, 'renderer', { get: function () { init(); return R; } });   // debugging / tests only
  Object.defineProperty(T, 'ok', { get: function () { init(); return state === 1; } });

  function hex(c) { return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255]; }
  /* lights: {key:{dir:[x,y,z] (world, y up), color:hex, i}, rim:{...}, hemi:{sky,ground,i}} */
  T.setLights = function (L) {
    init(); if (state !== 1) return;
    function dir(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    function col(c, i) { var h = hex(c); return [h[0] * i, h[1] * i, h[2] * i]; }
    var a;
    if (L.key) { a = dir(L.key.dir); U.uKeyD.value.set(a[0], a[1], a[2]); a = col(L.key.color, L.key.i); U.uKeyC.value.set(a[0], a[1], a[2]); }
    if (L.rim) { a = dir(L.rim.dir); U.uRimD.value.set(a[0], a[1], a[2]); a = col(L.rim.color, L.rim.i); U.uRimC.value.set(a[0], a[1], a[2]); }
    if (L.hemi) { a = col(L.hemi.sky, L.hemi.i); U.uSky.value.set(a[0], a[1], a[2]); a = col(L.hemi.ground, L.hemi.i); U.uGrd.value.set(a[0], a[1], a[2]); }
  };
  /* key-light flash (tone brightening) 0..1 ; surface ripple: ripple(tau, amp, medalWorld[x,y,z], axisWorld[x,z]) (tau<0 or amp 0 = off) */
  T.flash = function (v) { if (U) U.uFlash.value = v; };
  T.ripple = function (tau, amp, medal, axis, k, omega) {
    if (!U) return;
    U.uRip.value.set(tau, amp, k || (Math.PI * 2 / 80), omega || (Math.PI * 2 * 3.2));
    if (medal) U.uRipC.value.set(medal[0], medal[1], medal[2]); if (axis) U.uAx.value.set(axis[0], 0, axis[1]);
  };

  /* ---------------- print meshes ---------------- */
  function rgb01(c) { var v = typeof c === 'string' ? (MK.PAL[c] || [0, 0, 0]) : c; return [v[0] / 255, v[1] / 255, v[2] / 255]; }
  /* print = {fill, a, h, t0, t1, gamma, vib, dbl, o (outline width, world units), alb, lev:[lo,hi]} */
  T.material = function (print) {
    init(); var THREE = window.THREE, pr = print || {}, c = rgb01(pr.fill || 'paper');
    var side = pr.dbl ? THREE.DoubleSide : THREE.FrontSide, defs = {}; if (pr.vib) defs.VIB = 1; if (pr.dbl) defs.DBL = 1;
    var fill = new THREE.MeshBasicMaterial({ side: side });
    fill.color.setRGB(c[0], c[1], c[2]);
    if (pr.vib) { fill.onBeforeCompile = fillVib; fill.customProgramCacheKey = function () { return 'mkvib'; }; }
    var u = {
      uKeyD: U.uKeyD, uKeyC: U.uKeyC, uRimD: U.uRimD, uRimC: U.uRimC, uSky: U.uSky, uGrd: U.uGrd, uFlash: U.uFlash,
      uRip: U.uRip, uRipC: U.uRipC, uAx: U.uAx,
      uAlb: { value: pr.alb == null ? .85 : pr.alb }, uTn: { value: new THREE.Vector4(pr.t0 || 0, pr.t1 == null ? (pr.t0 || 0) : pr.t1, pr.gamma || 1, 0) }, uLev: { value: new THREE.Vector2(pr.lev ? pr.lev[0] : .12, pr.lev ? pr.lev[1] : .8) },
      uEnc: { value: new THREE.Vector2(((((pr.a || 0) % 180) + 180) % 180) / 180, (STY[pr.h || 'line'] || 0) / 255) }
    };
    var tone = new THREE.ShaderMaterial({ vertexShader: VS_TONE, fragmentShader: FS_TONE, uniforms: u, defines: defs, side: side });
    var out = { fill: fill, tone: tone };
    if (pr.o) {
      var mk = function (col) { return new THREE.ShaderMaterial({ vertexShader: VS_OUT, fragmentShader: FS_OUT, defines: pr.vib ? { VIB: 1 } : {}, side: THREE.BackSide, uniforms: { uCol: { value: new THREE.Vector3(col[0], col[1], col[2]) }, uOw: { value: pr.o }, uRip: U.uRip, uRipC: U.uRipC, uAx: U.uAx } }); };
      out.ofill = mk(rgb01(pr.oc || 'ink')); out.otone = mk([0, 0, 0]);
    }
    return out;
  };
  /* mesh with FILL+TONE (+outline hull) materials; materials are swapped per pass by MK.three.render */
  T.mesh = function (geo, print) {
    init(); var THREE = window.THREE, m = new THREE.Mesh(geo, null), mats = T.material(print);
    m.userData.mats = mats; m.material = mats.fill; m.userData.print = print;
    if (mats.ofill) {
      var h = new THREE.Mesh(geo, mats.ofill); h.userData.mats = { fill: mats.ofill, tone: mats.otone }; h.userData.isHull = true; h.renderOrder = 1; m.add(h);   // hull after the solids: depth-rejected early
    }
    return m;
  };
  /* bake several transformed primitive geometries into ONE static mesh: parts = [{g, p:[x,y,z], r:[rx,ry,rz], s:[sx,sy,sz], m?:parentObject3D}] */
  T.bake = function (parts, print) {
    init(); var THREE = window.THREE, o = new THREE.Object3D(), pos = [], nor = [], idx = [], off = 0;
    parts.forEach(function (pt) {
      o.position.set(pt.p ? pt.p[0] : 0, pt.p ? pt.p[1] : 0, pt.p ? pt.p[2] : 0);
      o.rotation.set(pt.r ? pt.r[0] : 0, pt.r ? pt.r[1] : 0, pt.r ? pt.r[2] : 0);
      o.scale.set(pt.s ? pt.s[0] : 1, pt.s ? pt.s[1] : 1, pt.s ? pt.s[2] : 1); o.updateMatrix();
      if (pt.m) { pt.m.updateMatrix(); o.matrix.premultiply(pt.m.matrix); }   // pt.m: parent Object3D (local transform baked in)
      var g = pt.g.clone(); g.applyMatrix4(o.matrix);
      var pa = g.attributes.position.array, na = g.attributes.normal.array, ix = g.index ? g.index.array : null, i, n = g.attributes.position.count;
      for (i = 0; i < pa.length; i++) { pos.push(pa[i]); nor.push(na[i]); }
      if (ix) for (i = 0; i < ix.length; i++) idx.push(ix[i] + off); else for (i = 0; i < n; i++) idx.push(i + off);
      off += n; g.dispose(); pt.g.dispose();
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
    geo.setIndex(new THREE.BufferAttribute(off > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    return T.mesh(geo, print);
  };
  /* dispose geometries + all materials of a group (call on rebuild) */
  T.dispose = function (root) {
    var seen = [];
    root.traverse(function (o) {
      if (o.geometry && seen.indexOf(o.geometry) < 0) { seen.push(o.geometry); o.geometry.dispose(); }
      var m = o.userData && o.userData.mats; if (m) for (var k in m) if (m[k] && m[k].dispose) m[k].dispose();
    });
  };
  /* ortho camera (frustum is re-fitted to the 2D world transform at every render) */
  T.camera = function () { init(); var c = new window.THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 3000); c.position.set(0, 0, 1000); return c; };
  /* AnimationMixer for `root` playing `clip` as a clamped one-shot, scrubbed with mixer.setTime(sec) */
  T.player = function (root, clip) {
    var THREE = window.THREE, mx = new THREE.AnimationMixer(root), a = mx.clipAction(clip);
    a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); mx.setTime(0); return mx;
  };

  /* ---------------- procedural motion (skill patterns, integrated with the engine's dt) ---------------- */
  /* scalar smooth-damp: returns the new value, velocity kept in vel.v */
  T.smoothDamp = function (cur, target, vel, smoothTime, dt) {
    var om = 2 / Math.max(1e-4, smoothTime), x = om * dt, e = 1 / (1 + x + .48 * x * x + .235 * x * x * x), ch = cur - target;
    var tmp = (vel.v + om * ch) * dt; vel.v = (vel.v - om * tmp) * e; return target + (ch + tmp) * e;
  };
  T.Spring = function (k, d) { this.k = k == null ? 100 : k; this.d = d == null ? 20 : d; this.x = 0; this.v = 0; this.t = 0; };
  T.Spring.prototype.update = function (dt) { var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n; for (var i = 0; i < n; i++) { this.v += (-this.k * (this.x - this.t) - this.d * this.v) * h; this.x += this.v * h; } return this.x; };

  /* ---------------- render ---------------- */
  /* fit the ortho frustum to the CURRENT 2D transform of the fill canvas: world (x, y-down) <-> canvas pixels; three y = 1400 - y */
  function fit(cam, P) {
    var M = P.ctxF.getTransform(), a = M.a || 1, d = M.d || 1, H = T.W;
    cam.left = (0 - M.e) / a; cam.right = (P.w - M.e) / a; cam.top = H - (0 - M.f) / d; cam.bottom = H - (P.h - M.f) / d;
    cam.updateProjectionMatrix();
    var an = cam.userData.anchor;      // zoom about a world point (x, y-down): keeps that point fixed on screen when cam.zoom != 1
    if (an) { var z = cam.zoom || 1, cx = (cam.left + cam.right) / 2, cy = (cam.top + cam.bottom) / 2; cam.position.x = (an[0] - cx) * (1 - 1 / z); cam.position.y = (H - an[1] - cy) * (1 - 1 / z); }
  }
  function setPass(root, pass) {
    root.traverse(function (o) { var m = o.userData && o.userData.mats; if (m) o.material = pass === 'fill' ? m.fill : m.tone; });
  }
  /* group: Object3D to draw (added to the internal scene), camera: MK.three.camera(). Draws into the fill / tone canvases
     under the current 2D transform + clip (respects P.fillOnly / P.toneOnly). Returns false if three is unavailable. */
  T.render = function (group, camera, P) {
    if (!T.ok) return false;
    try {
      if (P.w !== sizeW || P.h !== sizeH) { R.setSize(P.w, P.h, false); sizeW = P.w; sizeH = P.h; }
      if (group.parent !== scene) scene.add(group);
      fit(camera, P);
      var cv = R.domElement;
      [['fill', P._f, P.ctxF], ['tone', P._t, P.ctxT]].forEach(function (pp) {
        if (!pp[1]) return;
        setPass(group, pp[0]); R.render(scene, camera);
        var c = pp[2]; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(cv, 0, 0); c.restore();
      });
      return true;
    } catch (e) { fail('render failed', e); return false; }
  };
})();
