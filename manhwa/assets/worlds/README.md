# assets/worlds — specs of the 3D worlds behind assets/gen

The MOKPAN backgrounds are generated with OpenMontage's free tools only (no API key):
`ThreeJSWorld` (`vendor/OpenMontage/tools/graphics/threejs_world.py`, HyperFrames + three.js) for the mountains, and a small custom
HyperFrames/three.js composition for the bell pavilion. Specs: `ridges.json`, `pavilion.json` (explicit_constraints vs inferred_details recorded).

Quality tier: **blockout** (procedural primitives, vertex colours). No GLTF catalogs are reachable offline (kenney.nl / CDNs are blocked),
and a production tier is not needed: the lit pass is only a luminance source and the ID pass a class mask; the final look comes from the
print shader (hatch angle / style per class, ink outlines) and the 2D art laid over it. Do not read the raw renders as finished art.

Pipeline: `python3 build/worlds/render_world.py ridges|pavilion` (build -> offline patch -> `hyperframes snapshot`, raw frames in
`build/_raw/`, git-ignored) then `python3 build/printize.py ridges|pavilion` (-> `assets/gen/`, lossless palette PNG FILL + TONE maps,
`manifest.json`). OpenMontage's generated runtime is AGPL and is only used as an offline renderer in /tmp; the shipped page contains rendered
media and our own JSON only.
