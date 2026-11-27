# MOKPAN engine — API for scene authors

Classic scripts sharing `window.MK`. Add `src/scenes/sNN_name.js` / `tNN_name.js` (IIFE, `'use strict'`) and run `python3 build/build_html.py` (it globs scenes sorted by filename and rewrites the script block of `src/index.html`). After adding Hangul/Cyrillic text run `python3 build/fonts.py`.

## World
Safe frame 1000x1400, origin top-left, y down. `ctx.view.bounds` = {x0,y0,x1,y1} visible rect (beyond the frame on wide/tall screens): ALWAYS paint backgrounds over bounds (`P.cover(st)`). Hatch angle `a` in degrees (0 = vertical lines, 90 = horizontal); rotations in radians.

## Registering
```js
MK.scene({ id:'s03', order:30, len:1.6 /*vh*/, title:'..', hold:null|'press'|'pull',
  overlay:[ {type:'caption', at:[p0,p1], x,y,w, side:'l'|'r', rot, text},
            {type:'sfx', at:[p0,p1], x,y,size,rot, font:'impact'|'brush', color:'paper'|'red'|'ink', fx:'pop'|'shake'|'echo'|'wobble', text, gloss} ],
  init(state){}, update(ctx){}, draw(ctx){} });
MK.transition({ id:'t02', order:35, len:.6, from:'s02', to:'s03', kind:'scroll'|'flash'|'custom', parallaxA:1.3, flashColor:'paper', draw(ctx,q,drawA,drawB){} });
```
Orders: s01=10 t01=15 s02=20; leave gaps. Neighbours default to the previous/next scene by order.
`ctx = {p, t, dt, input, state, fx, ui, view, P, sfx, scene}`; transition ctx also has `q`. `drawA(p=1)` / `drawB(p=0)` draw the neighbour scenes (custom may pass their own p). Scenes not active are not drawn; `update` runs before `draw`, in transitions for both neighbours (p=1 / p=0).
- `ctx.fx` (reset every frame): `shake` px, `misreg:[dx,dy]` css px, `ripple:{x,y,r,amp,w}` (x,y,r world units; amp,w px), `flash:{c:'paper'|'red'|[r,g,b], a}`, `grain`.
- `ctx.ui.hold = {label:'꾹 · БАСЫП ТҰР', progress:0..1}` shows seal cursor / hold button; `ctx.input.holding` is true while held (mouse down, touch seal button, Space).
- `ctx.sfx(text,{key,x,y,size,rot,font,color,fx,gloss,life})`: imperative SFX; deduped by `key` per scene until the scene deactivates -> call it on an event edge.
- Stateless animation: derive everything from `p`, `t` and event times. `MK.event(state,key,p,p0,t,secPerP=2.5)` -> seconds since p crossed p0 (or -1; resets when p goes back below p0; robust to jumps). `MK.eventId(state,key)` counts triggers. Only meters integrate with dt: `MK.holdMeter(state,input,dt,{rise:1/2.2,fall:1/.9})` -> `{value,completed(latched),justCompleted,holding}`; `MK.holdReset(state)`.
- Timeline: `MK.timeline.segments` [{id,kind,start,len,hold}], `.total` (vh).

## Paint (ctx.P = MK.P): draws into FILL + TONE canvases
Style `st = {c:'red'|'ink'|'paper'|'blue'|'gold'|[r,g,b], t:0..1 | gradient, a:deg, h:'line'|'grain'|'cross'|'dots', stroke:{w,c}}`. Tone 0 = flat colour, no lines; 1 = solid ink. Gradients: `P.lin(x0,y0,x1,y1,[[0,t0],[1,t1]])`, `P.rad(cx,cy,r0,r1,stops)`; `c` may also be a colour gradient with colour-name stops.
`rect(x,y,w,h,st) circle(cx,cy,r,st) ellipse(cx,cy,rx,ry,st,rot) poly(pts,st,closed) path(svg|Path2D,st) stroke(pathOrPts,{w,c,dash,dashOffset,t?,a?,closed}) line(x0,y0,x1,y1,o) taper(pts,[w0,w1]|fn(u),st) taperPoly(...)->pts smooth(pts,steps,closed) text(str,x,y,{font,size,weight,align,baseline,vertical,spacing,lh},st) measure push pop translate rotate scale transform clip(pathOrPtsOrFn,inner) blur(worldPx,inner) alpha(a,inner) cover(st) toneOnly(fn) fillOnly(fn)`.
Fonts: 'Song Myung', 'Black Han Sans', 'East Sea Dokdo', 'IBM Plex Mono'(400/500), 'Cormorant Garamond'(600/700).
Palette `MK.PAL`, CSS vars `--red --ink --paper --blue --gold`. Rule: <=3 base colours + 1 accent per frame; blue and gold only in the finale.

## Art (MK.art, all take P)
`tiger(P,cx,cy,size,s)` s={mode:'block'|'print'|'alive'|'sky', mirror, eyeOpen, pupil(0 narrow..1 wide), mouthOpen, ink(0..1 radial red->ink from the eyes), carve, inked, reveal(fn(draw))}; returns/sets `s.tip={x,y,ang}` in block mode.
`carver(P,x,y,size,s)` s={pose:'stand'|'seat', t, arm, shadow}. `eave(P,x0,x1,y,depth,{chime,chimeX,rafter,bottom})`, `chime`, `eaveY`, `ridge(P,x0,x1,y,h,seed,st)`. `seal(P,x,y,size,text,{press})`, `chisel(P,x,y,ang,{size})` (tip at x,y), `inkBrush(P,x,y,w,ang,{wet,tip})`, `pad(P,x,y,r,rot)`, `sheet(P,{x,y,w,h},{rot,shadow})`.
FX (MK.fx, stateless; `tau` = seconds since the event): `chips/splinters/droplets(P,{seed,n,x,y,tau,dir,spread,speed,g,life,size,c})`, `particles(seed,n,spawnFn)`+`pos(pt,tau)`, `crackPath(seed,x,y0,y1,amp)`, `ribbon(pts,width,phase,amp)`, `decay(tau,k)`. Easing: `MK.ease.{linear,inQuad,outQuad,inOutQuad,inCubic,outCubic,inOutCubic,outBack,outExpo,smoothstep,range,seg}`, `MK.range`, `MK.rng(seed)`, `MK.noise1/2`, `MK.fbm1`, `MK.hash`.

## Dev / capture
`cd manhwa && python3 -m http.server 8765` -> `/src/index.html`. `?capture=1` -> `window.__mk.render(sVH,t,{holding,pointer})`; `?art=1` art sheet (`&zoom=tiger`). `node build/record_preview.js --stills|--video|--realtime`.
