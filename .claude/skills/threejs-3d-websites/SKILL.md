---
name: threejs-3d-websites
description: Use when building Three.js (r150+) scenes that need to animate — hero pages, product viewers, scroll-driven sites, GLTF character rigs, morph-target faces, interactive WebGL backgrounds. Covers AnimationMixer / AnimationAction, skeletal bone access, morph targets, blending, procedural oscillation, smooth-damp and spring motion, animation loop, render lifecycle and the most common Three.js pitfalls. Does NOT cover raw GLSL shader writing, raw BufferGeometry internals or non-Three engines (use creative::p5js or godot for that).
version: 1.0.0
author: Hermes Agent + CloudAI-X/threejs-skills (adapted)
license: MIT
sources:
  - https://github.com/CloudAI-X/threejs-skills (~2.3k stars — core API cheatsheet)
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [threejs, webgl, 3d, animation, gltf, morph-targets, skeletal, frontend, creative, web]
    related_skills: [claude-design, popular-web-designs, architecture-diagram, pretext]
---

# Three.js for 3D Websites

API reference + the 20 % of advice that prevents 80 % of bugs. Targets
Three.js r150+ (modern ESM imports, modern `WebGLRenderer`, modern
`EffectComposer`).

For full per-topic cheatsheets see CloudAI-X/threejs-skills
(`threejs-animation`, `threejs-fundamentals`, `threejs-loaders`,
`threejs-materials`, `threejs-lighting`, `threejs-postprocessing`,
`threejs-shaders`, `threejs-geometry`, `threejs-textures`,
`threejs-interaction`). This skill is the **hub** you load first.

## When To Use

- Building a hero-section / landing page with WebGL elements
- Loading and playing a GLTF character animation
- Scroll-driven or cursor-driven 3D scene
- Product viewer (rotate / zoom / colour swap)
- Adding a subtle animated background to a normal site
- Switching a 2D `<img>` hero for an in-browser 3D scene

**Don't use for:**
- Pure pixel shaders / GLSL playground (use creative::p5js or write GLSL by hand)
- Non-Three engines (Babylon / Pixi / PlayCanvas / Regl)
- Server-side rendering of 3D — Three.js is browser-only
- CAD / engineering precision — Three.js floats lose precision at huge distances

## Quick Start (minimal animate-on-a-loop)

```javascript
import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const key = new THREE.DirectionalLight(0xffffff, 1.5);
key.position.set(3, 5, 4);
scene.add(key);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xff6633 }),
);
scene.add(cube);

const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();      // seconds since last frame
  const t  = clock.getElapsedTime();
  cube.rotation.y += dt;            // frame-rate independent
  cube.position.y = Math.sin(t) * 0.4;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
```

---

## Animation System (the part most LLMs get wrong)

Three.js animation has **three classes**. Get these in your head and the
rest is just configuration:

| Class | Role |
|-------|------|
| **`AnimationClip`** | Container of `KeyframeTrack`s — pure data |
| **`AnimationMixer`** | Plays clips on an Object3D root. **Owns the timeline.** |
| **`AnimationAction`** | Per-clip playback handle (speed, weight, loop, fade) |

A clip on its own does nothing — you need a mixer, and the mixer needs
an `update(dt)` call **every frame**.

### AnimationClip — build a clip from keyframes

```javascript
// Bounce a cube up and down
const track = new THREE.NumberKeyframeTrack(".position[y]", [0, 1, 2], [0, 1, 0]);
const clip  = new THREE.AnimationClip("bounce", 2, [track]);
```

Five track types for five property shapes:

| Track | Property shape | Example path |
|-------|----------------|--------------|
| `NumberKeyframeTrack` | scalar / single channel | `.opacity`, `.material.opacity` |
| `VectorKeyframeTrack` | Vec2 / Vec3 flat array | `.position`, `.scale` |
| `QuaternionKeyframeTrack` | Quaternion flat array | `.quaternion` |
| `ColorKeyframeTrack` | RGB flat array | `.material.color` |
| `StringKeyframeTrack` | string per frame | `.morphTargetInfluences[smile]` |

```javascript
// Quaternion track (rotation must be quaternion, not euler!)
const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
new THREE.QuaternionKeyframeTrack(".quaternion",
  [0, 1],
  [q1.x, q1.y, q1.z, q1.w, q2.x, q2.y, q2.z, q2.w]);

// Color track
new THREE.ColorKeyframeTrack(".material.color",
  [0, 0.5, 1],
  [1, 0, 0,   0, 1, 0,   0, 0, 1]);

// Morph target by name (the LLM-friendly way)
new THREE.StringKeyframeTrack(".morphTargetInfluences[smile]", [0, 1], ["0", "1"]);
```

### Interpolation

```javascript
track.setInterpolation(THREE.InterpolateLinear);    // default
track.setInterpolation(THREE.InterpolateSmooth);    // cubic spline
track.setInterpolation(THREE.InterpolateDiscrete);   // step / hold
```

### AnimationMixer — the brain

```javascript
const mixer = new THREE.AnimationMixer(model);

// In the loop — REQUIRED for any clip on this mixer
function tick() {
  mixer.update(clock.getDelta());
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// Events
mixer.addEventListener("finished", (e) => console.log("done:", e.action.getClip().name));
mixer.addEventListener("loop",     (e) => console.log("loop:", e.action.getClip().name));
```

### AnimationAction — playback control

```javascript
const action = mixer.clipAction(clip);

// Lifecycle
action.play();                     // start (resumes if paused)
action.stop();                     // stop + reset
action.reset();                    // reset state, keep bound
action.halt(0.3);                  // fade out 0.3 s then stop

// Time / speed
action.time      = 0.5;            // seek
action.timeScale = 1;              // negative = reverse
action.paused    = false;

// Loops
action.loop       = THREE.LoopRepeat;     // default — infinite
action.loop       = THREE.LoopOnce;       // play once
action.loop       = THREE.LoopPingPong;   // A → B → A → B …
action.repetitions = 3;                   // cap on Repeat / PingPong
action.clampWhenFinished = true;          // freeze last frame

// Weight (for blending multiple actions)
action.setEffectiveWeight(1);   // 0..1, smoother than `action.weight = …`

// Blending
action.blendMode = THREE.NormalAnimationBlendMode;     // default
action.blendMode = THREE.AdditiveAnimationBlendMode;   // overlay (e.g. breathing)

// Fade in / out
action.reset().fadeIn(0.5).play();
action.fadeOut(0.5);

// Crossfade
action1.crossFadeTo(action2, 0.5, true);
action2.play();
```

---

## Loading GLTF Animations

```javascript
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
loader.load("character.glb", (gltf) => {
  scene.add(gltf.scene);
  const mixer = new THREE.AnimationMixer(gltf.scene);

  // gltf.animations is an array of AnimationClip, one per track in the file
  console.log(gltf.animations.map((c) => c.name));

  // Helper: find by name
  const walk = THREE.AnimationClip.findByName(gltf.animations, "Walk");
  mixer.clipAction(walk).play();

  // Store on mesh/rig for the loop
  gltf.scene.userData.mixer = mixer;
});

// In the tick loop:
//   if (model.userData.mixer) model.userData.mixer.update(dt);
```

Async / Promise variant (modern Three.js):

```javascript
const gltf = await loader.loadAsync("character.glb");
scene.add(gltf.scene);
```

---

## Skeletal Animation — bones, not just clips

```javascript
// Skinned meshes carry a `skeleton` field
const skinned = model.getObjectByProperty("type", "SkinnedMesh");
const skeleton = skinned.skeleton;

// Iterate bones
skeleton.bones.forEach((b) => console.log(b.name, b.position, b.rotation));

// Find by name — typical: Head, RightHand, Hips
const head = skeleton.bones.find((b) => b.name === "Head");

// Drive a bone procedurally (overrides mixer for that channel)
function tick() {
  if (head) head.rotation.y = Math.sin(clock.getElapsedTime()) * 0.3;
  mixer.update(dt);
}

// Attach an object to a bone (weapon → RightHand)
const sword = new THREE.Mesh(swordGeo, swordMat);
sword.position.set(0, 0, 0.5);
head.add(sword);   // or: hand.add(sword)

// Visualise the rig
scene.add(new THREE.SkeletonHelper(model));
```

---

## Morph Targets — blend mesh shapes

```javascript
const mesh = ...;          // a Mesh whose geometry has morphAttributes
console.log(Object.keys(mesh.geometry.morphAttributes));   // 'position', 'normal', …

mesh.morphTargetInfluences;        // Float32Array of weights
mesh.morphTargetDictionary;        // name → index

// By index
mesh.morphTargetInfluences[0] = 0.5;

// By name (preferred — survives reorders)
mesh.morphTargetInfluences[ mesh.morphTargetDictionary["smile"] ] = 1;

// Procedural facial animation
function tick() {
  const t = clock.getElapsedTime();
  mesh.morphTargetInfluences[mesh.morphTargetDictionary["smile"]] =
    (Math.sin(t) + 1) / 2;
}
```

---

## Animation Blending — drive locomotion from one number

```javascript
const idle = mixer.clipAction(THREE.AnimationClip.findByName(clips, "Idle"));
const walk = mixer.clipAction(THREE.AnimationClip.findByName(clips, "Walk"));
const run  = mixer.clipAction(THREE.AnimationClip.findByName(clips, "Run"));

[idle, walk, run].forEach((a) => { a.play(); a.setEffectiveWeight(0); });
idle.setEffectiveWeight(1);

function applySpeed(speed) {                 // speed ∈ [0, 10]
  if (speed < 0.1) {
    idle.setEffectiveWeight(1); walk.setEffectiveWeight(0); run.setEffectiveWeight(0);
  } else if (speed < 5) {
    const t = speed / 5;
    idle.setEffectiveWeight(1 - t); walk.setEffectiveWeight(t); run.setEffectiveWeight(0);
  } else {
    const t = Math.min((speed - 5) / 5, 1);
    idle.setEffectiveWeight(0); walk.setEffectiveWeight(1 - t); run.setEffectiveWeight(t);
  }
}
```

### Additive blending — overlay e.g. breathing on top of walk

```javascript
const base = mixer.clipAction(baseClip); base.play();
const add  = mixer.clipAction(addClip);
add.blendMode = THREE.AdditiveAnimationBlendMode;
add.play();

// Optional: convert a clip to additive if it was authored as absolute
THREE.AnimationUtils.makeClipAdditive(addClip);
```

---

## Procedural motion patterns (no clips, just `Math`)

### Smooth-damp (Unreal-style camera follow)

```javascript
const target = new THREE.Vector3();
const current = new THREE.Vector3();
const velocity = new THREE.Vector3();

function smoothDamp(c, t, v, smoothTime, dt) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = c.clone().sub(t);
  const temp = v.clone().add(change.clone().multiplyScalar(omega)).multiplyScalar(dt);
  v.sub(temp.clone().multiplyScalar(omega)).multiplyScalar(exp);
  return t.clone().add(change.add(temp).multiplyScalar(exp));
}

function tick() {
  current.copy(smoothDamp(current, target, velocity, 0.3, dt));
  camera.position.copy(current);
}
```

### Spring (critically damped if `damping = 2 * sqrt(stiffness)`)

```javascript
class Spring {
  constructor(stiffness = 100, damping = 20) {
    this.k = stiffness; this.d = damping; this.x = 0; this.v = 0; this.t = 0;
  }
  update(dt) {
    const a = -this.k * (this.x - this.t) - this.d * this.v;
    this.v += a * dt; this.x += this.v * dt;
    return this.x;
  }
}
const hover = new Spring(80, 18); hover.t = 1;
function tick() { cube.position.y = hover.update(dt); }
```

### Oscillation table

| Pattern | Code |
|---------|------|
| Sine wave | `Math.sin(t * 2) * amp` |
| Bounce (always positive) | `Math.abs(Math.sin(t * 3)) * amp` |
| Circle | `(Math.cos(t), 0, Math.sin(t)) * r` |
| Figure-8 | `(Math.sin(t), 0, Math.sin(t * 2)) * r` |

Use `clock.getElapsedTime()` not `Date.now() / 1000` — pause-aware and not affected by system clock jumps.

---

## Animation Utilities

```javascript
const found = THREE.AnimationClip.findByName(clips, "Walk");

const part    = THREE.AnimationUtils.subclip(clip, "walk-only", 0, 30, 30);
const additive = THREE.AnimationUtils.makeClipAdditive(additiveClip, 0, baseClip);

const clone      = clip.clone();
const duration   = clip.duration;

clip.optimize();      // drop redundant keyframes — do this once on load
clip.resetDuration(); // recompute duration from tracks
```

---

## Loop, Time & Lifecycle

### Always this shape

```javascript
const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();      // seconds since last frame
  const t  = clock.getElapsedTime();
  // 1. update animations
  // 2. update physics / UI state
  // 3. renderer.render(scene, camera)
  requestAnimationFrame(tick);
}
tick();
```

**Do not** multiply by `0.01` and call it "frame-rate independent" — use `dt`. Browsers throttle `requestAnimationFrame` on background tabs to ~1 Hz; using `t` for everything still works because `clock.getElapsedTime()` returns wall time, but any `t * speed` integration breaks.

### Resize

```javascript
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();      // required after fov/aspect/near/far
  renderer.setSize(innerWidth, innerHeight);
});
```

### Hot module reload / cleanup

Always call `renderer.dispose()` and `geometry.dispose()` + `material.dispose()` on unload, or you leak GPU memory every reload during dev. For full scene disposers:

```javascript
scene.traverse((o) => {
  if (o.geometry) o.geometry.dispose();
  if (o.material) {
    if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
    else o.material.dispose();
  }
});
renderer.dispose();
```

---

## Performance Rules of Thumb

1. **Don't render when nothing changed** — gate the `tick` body.
2. **Limit `pixelRatio` to 2** — `Math.min(devicePixelRatio, 2)`. Higher is wasted GPU.
3. **One renderer, one scene, share materials** — clone only when you need independent uniforms.
4. **Shadow maps are expensive** — only enable on 1–2 directional lights, keep `mapSize` ≤ 2048.
5. **InstancedMesh** for > ~50 copies of the same geometry (particles, trees, icons).
6. **Pause mixers off-screen** — visibility test or `mixer.stopAction(j.name)`.
7. **`clip.optimize()` once on load** — drops redundant keyframes.
8. **Reuse `Vector3` / `Quaternion`** in hot loops — `new` allocates.

---

## Common Pitfalls

1. **Forgetting `mixer.update(dt)`** → clip plays in head, scene looks frozen. **Always** update mixer in the loop.
2. **Quaternion vs Euler** — keyframing `.rotation` with number values doesn't composite correctly; keyframe a `.quaternion` track with quaternion keyframes.
3. **`morphTargetInfluences` indexed wrong** — always go through `morphTargetDictionary["name"]`; index 0 ≠ name "smile".
4. **Setting `action.weight = 1` to "enable" it** — use `setEffectiveWeight(1)` and call `.play()` first, otherwise nothing animates.
5. **GLTFLoader path is `three/examples/jsm/...`** — that's correct for the npm `three` package and the CDN `unpkg.com/three@VERSION/examples/jsm/`. Don't reference `three/addons/` unless you've aliased it.
6. **Bone rotation in an animated rig** — if a bone is being driven by an action and you also write to it, your write is overwritten each frame by the mixer. Set the bone *after* `mixer.update()` if you need to override per-frame.
7. **Texture loaded with bad CORS / no `crossOrigin`** — the texture uploads but is poisoned (black). Add `texture.crossOrigin = "anonymous"` and serve the asset with `Access-Control-Allow-Origin`.
8. **"`unused` ShaderMaterial uniform" warnings** — WebGL warns but doesn't fail. Cosmetic. If it bugs you, prune uniforms from `defines`.
9. **Memory leak across hot reloads** — call the dispose loop above in any HMR `dispose` hook.
10. **`Math.sin(t * speed)` is not "frame-rate independent"** — it is, but only if `t = clock.getElapsedTime()`, not `t += dt`. Picking the wrong one is the classic bug.
11. **`renderer.setSize` doesn't recompute canvas CSS** — pair with `renderer.domElement.style.width = ...` only when you need the canvas to be a specific CSS size independent of its drawing buffer.
12. **Loading `character.glb` then immediately reading `gltf.animations` outside the callback** — `loader.load` is async. Use `loadAsync` or the callback.

---

## Verification Checklist

- [ ] `mixer.update(dt)` called every frame; visible animation confirms it.
- [ ] No `WebGL: INVALID_OPERATION` or `INVALID_VALUE` in console.
- [ ] `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- [ ] On resize: `camera.updateProjectionMatrix()` + `renderer.setSize(...)`.
- [ ] DevTools → Memory → JS heap stabilises across HMR cycles (no leaks).
- [ ] `clip.optimize()` called once on load for large GLTF files.
- [ ] GPU frame time < 16 ms on a 2020-era laptop at 1080p.
- [ ] GLTF models load via `loadAsync` (or callback) — no sync `.animations` access.
- [ ] Dispose loop runs on HMR / route change.
- [ ] First frame is deterministic (no flicker from late-loading textures).

---

## One-Shot Recipes

### Recipe: scroll-driven hero scene

```javascript
// Page scroll → camera Z
addEventListener("scroll", () => {
  camera.position.z = 5 + scrollY * 0.01;
});

// Page scroll → material colour
mat.color.setHSL((scrollY / document.body.scrollHeight) % 1, 0.7, 0.5);
```

### Recipe: orbit controls (mouse rotate / zoom)

```javascript
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
function tick() { controls.update(); /* … */ }
```

### Recipe: GLTF character with idle + walk blending

```javascript
const gltf = await loader.loadAsync("hero.glb");
scene.add(gltf.scene);
const mixer = new THREE.AnimationMixer(gltf.scene);
const idle = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "Idle"));
const walk = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "Walk"));
idle.play(); walk.play();
idle.setEffectiveWeight(1); walk.setEffectiveWeight(0);
// Map a UI slider 0..1 to walk weight; render with mixer.update(dt).
```

### Recipe: pause all animations when tab hidden

```javascript
document.addEventListener("visibilitychange", () => {
  if (document.hidden) renderer.setAnimationLoop(null);  // pause
  else                     renderer.setAnimationLoop(tick); // resume
});
// Modern loop pattern — replaces requestAnimationFrame(tick); in tick itself
renderer.setAnimationLoop(tick);
```

### Recipe: render target → texture

```javascript
const target = new THREE.WebGLRenderTarget(512, 512);
// … instead of renderer.render(scene, camera) do:
renderer.setRenderTarget(target);
renderer.render(scene, camera);
renderer.setRenderTarget(null);
// Now `target.texture` is a regular Texture you can assign to a material.
```

---

## See Also (in this hub)

| Topic | Where to look |
|-------|---------------|
| Shader materials | CloudAI-X/threejs-skills → `threejs-shaders` |
| PBR / materials | CloudAI-X/threejs-skills → `threejs-materials` |
| EffectComposer / bloom | CloudAI-X/threejs-skills → `threejs-postprocessing` |
| Loader patterns & DRACO | CloudAI-X/threejs-skills → `threejs-loaders` |
| Picking / controls | CloudAI-X/threejs-skills → `threejs-interaction` |
| For a designer-styled page surface, load | `claude-design` or `popular-web-designs` alongside |

<!-- Installed from https://github.com/oxso1teee/hermes-threejs-skills @ 3be9e9a (MIT). -->
