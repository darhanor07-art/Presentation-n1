---
name: p5-brush
description: Natural-media drawing in the browser with p5.brush 3.3.0 (MIT) — pencils, charcoal, markers, ink, watercolor fills with bleed and granulation, hatching, pastel "mass" fills, and vector fields that bend strokes. Use when a web manhwa / webtoon panel, presentation slide, poster or generative illustration should look hand-drawn or painted (pencil lineart, watercolor washes, ink hatching) instead of flat vector or 3D render; also for painting over Blender plates or animating strokes on scroll.
---

# p5.brush skill

Library: p5.brush **3.3.0** by Alejandro Campos Uribe, MIT (`LICENSE`).
Local copies live in this folder, so pages work offline and via `file://`:

| File | Use |
|---|---|
| `dist/brush.js` | **Standalone** UMD build (global `brush`), WebGL2 only, no p5 needed — default choice for our single-file pages |
| `dist/brush.esm.js` | Standalone ESM |
| `dist/p5.brush.js` / `dist/p5.brush.esm.js` | p5 build, needs **p5.js 2.x** and a `WEBGL` canvas |
| `references/llms.md` | Compact full API — read FIRST before writing code |
| `references/api.md` | Full README reference (p5 build) with every option |
| `references/standalone.md` | Standalone build details |
| `references/rendering.md` | How compositing / rendering works (performance, dirty rects) |
| `tools/brush-maker.html`, `tools/flowfield-maker.html` | Interactive designers that output `brush.add()` / `brush.addField()` code |
| `examples/` | Teaser sketches |

## Workflow

1. Read `references/llms.md` (≈24 KB). Decide the build: standalone unless the project already uses p5.
2. Never mix builds: standalone needs `brush.createCanvas`, `brush.push/pop/translate`, `brush.seed`, `brush.clear()` and **`brush.render()` at the end of every frame**; the p5 build uses p5's own `push/translate/randomSeed/background` and needs none of those.
3. WebGL origin is the canvas centre: `translate(-W/2, -H/2)` before drawing in top-left coordinates.
4. Call `brush.scaleBrushes(k)` to match canvas size (≈3 for 600×600, scale up proportionally) and `brush.seed(n)` for deterministic output (needed for recorded previews / stills).
5. For single-file builds, inline `dist/brush.js` into the HTML (like `manhwa-spring/build/build_html.py` inlines assets).
6. Verify with Playwright screenshots (Chromium is preinstalled; WebGL2 works headless). Check `console` errors.

## Recipes for manhwa / slides

Built-in brushes: `pen`, `rotring`, `2B`, `HB`, `2H`, `cpencil`, `pastel`, `crayon`, `charcoal`, `spray`, `marker` (`brush.box()` lists all, custom ones via `brush.add()`).

- **Pencil lineart:** `brush.set("HB", ink, 1)` + `brush.spline(points, 0.5)`; use pressure as 3rd value in points for tapered ends.
- **Ink outlines:** `"pen"` / `"rotring"` / `"marker"` brushes; `brush.wiggle(0.5)` for hand wobble.
- **Watercolor backgrounds:** `brush.fill(color, 90)` + `brush.fillBleed(0.2)` + `brush.fillTexture(0.5, 0.3)` + `brush.noStroke()` then `brush.rect/circle/polygon`. Layer 2–4 washes of the palette (e.g. indigo `#262A66`, lavender `#A9A6E8`, periwinkle `#8FA3FF`, moon white `#ECE9FF`, amber accent `#FFCF8A`).
- **Shading:** `brush.hatch(dist, angle, {rand, gradient})` + `brush.hatchStyle("2H", color, 1)`; dry pastel look with `brush.mass("crayon", color, {...})`.
- **Painting over a Blender plate:** draw the image into the page underneath (CSS stack or a 2D canvas), put the transparent brush canvas on top for linework and washes.
- **Scroll / draw-on animation:** strokes are drawn progressively by limiting how much of a spline/plot is drawn per frame, keyed to scroll progress; re-clear + re-draw deterministically with a fixed seed so frames are reproducible for `record.js`.
- Brushes are expensive per frame: for static art, render once (or to an offscreen target via `brush.load(canvas)`) and reuse as an image layer.

## Notes

- CDN alternative: `https://cdn.jsdelivr.net/npm/p5.brush@3.3.0` (p5 build). Prefer the local `dist/` copies.
- Keep the MIT notice (`LICENSE`) when shipping the library inside a page.
