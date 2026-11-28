# MOKPAN character rigs (OpenMontage character-animation, free local tools, no API key)

Pipeline run (vendor/OpenMontage, `pipeline_defs/character-animation.yaml`): `CharacterSpecGenerator` -> `SvgRigBuilder` -> `PoseLibraryBuilder` -> `ActionTimelineCompiler`
for `carver` and `tiger` via `build/rigs/run_pipeline.py`.

- `generated/<char>/*.json` — RAW tool output (untouched): generic body/head/eye/limb rig at guessed pivots, idle/blink/look poses, a generic 3-action timeline.
- `<char>/*.json` — REFINED to our real drawing, schema-validated (`schemas/artifacts`) by `build/rigs/refine_rigs.py`:
  - character_design: our hanbok / minhwa descriptions, back/front view, coordinate-space notes.
  - rig_plan: parts, parents, pivots, layers, rotation limits replaced by the parts of `src/art/carver.js` (stand_* and seat_* sets: chima with deforming hem, jeogori, sleeves up/lo, neck, head, 4 braid segments, daenggi) and `src/art/tiger.js` (ears, brows, lids, pupils, jaw, whiskers, root/head breath).
  - pose_library: poses we actually need (seat_idle/seat_carve; stand_idle/look_up/turn/walk; face_sleep/wake/furrow/roar, ear flicks, slow blink, sky breathe) with procedural `loops`, overlay pulses and mocap hooks; `action_cycles` holds chain (braid/daenggi follow-through) and mocap-retarget maps.
  - action_timeline: our beats for s03 / s06 / s09 (scene clock = progress*4 s).
- `src/art/rigdata.js` is baked from the refined files + `assets/mocap` by `build/rigs/bake_rigdata.py`.
