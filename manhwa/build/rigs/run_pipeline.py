#!/usr/bin/env python3
"""Step 1: run OpenMontage's free character-animation tools (CharacterSpecGenerator -> SvgRigBuilder ->
PoseLibraryBuilder -> ActionTimelineCompiler) for the two MOKPAN characters (carver, tiger).
Raw tool output goes to assets/rig/generated/<char>/*.json (never edited). refine_rigs.py then writes the refined
artifacts to assets/rig/<char>/*.json.   Run:  cd vendor/OpenMontage && . .venv/bin/activate && python ../../manhwa/build/rigs/run_pipeline.py"""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))   # manhwa/
OM = os.path.join(os.path.dirname(ROOT), 'vendor', 'OpenMontage'); sys.path.insert(0, OM); os.chdir(OM)
from tools.character.character_animation import CharacterSpecGenerator, SvgRigBuilder, PoseLibraryBuilder, ActionTimelineCompiler

STYLE = {'visual_style': 'korean woodblock print (minhwa / manhwa), flat 1-colour print shader, hatch tones',
         'palette': ['red', 'ink', 'paper', 'blue (daenggi only)', 'gold (sky tiger eyes only)'],
         'line_style': 'bold ink outlines 3px, tapered strokes', 'texture': 'hatch / grain / dots tone layers'}
CHARS = {
  'carver': dict(
    spec={'id': 'carver', 'display_name': 'Carver (각수)', 'role': 'protagonist, woodblock carver',
          'body_type': 'young Korean woman in hanbok: short jeogori jacket + full chima skirt, long single braid with a BLUE daenggi ribbon, seen from BEHIND',
          'style': 'woodblock print, back view', 'silhouette_notes': 'wide sleeves, bell skirt, braid + ribbon tails readable in silhouette',
          'required_emotions': ['calm', 'focused', 'awe'],
          'required_actions': ['seated_carve_loop', 'breathe', 'look_up', 'turn_head', 'walk_away'],
          'required_views': ['back'], 'props': ['chisel (drawn in scene)'],
          'constraints': ['legs hidden by chima', 'face never visible (back view)', 'no extra colours besides blue daenggi']},
    scenes=[{'id': 's03', 'description': 'seated carving loop behind the paper door (also drawn as a blurred shadow)', 'start_seconds': 0, 'end_seconds': 4},
            {'id': 's09', 'description': 'looks up at the sky tiger, turns head slightly, walks 5 steps toward the gate', 'start_seconds': 0, 'end_seconds': 4, 'hero_moment': True}]),
  'tiger': dict(
    spec={'id': 'tiger', 'display_name': 'Tiger (범)', 'role': 'minhwa tiger emblem / antagonist-guardian',
          'body_type': 'front-facing minhwa tiger face emblem with ears, brows, eyelids, slit pupils, jaw, whisker bundles',
          'style': 'woodblock print, red then ink', 'silhouette_notes': 'round head, big ears, 王 mark on the forehead',
          'required_emotions': ['asleep', 'awake', 'wary', 'fierce'],
          'required_actions': ['wake', 'eyes_open', 'ear_flick', 'brow_furrow', 'roar', 'blink_slow', 'breathe'],
          'required_views': ['front'], 'props': [], 'constraints': ['face is a flat emblem: all motion is part transforms / channels']},
    scenes=[{'id': 's06', 'description': 'red print comes alive: wake, eyes open, ear flick, furrow, roar', 'start_seconds': 0, 'end_seconds': 4, 'hero_moment': True},
            {'id': 's09', 'description': 'sky tiger: slow blink and breathe', 'start_seconds': 0, 'end_seconds': 4}]),
}
for cid, c in CHARS.items():
    out = os.path.join(ROOT, 'assets', 'rig', 'generated', cid); os.makedirs(out, exist_ok=True)
    r1 = CharacterSpecGenerator().execute({'characters': [c['spec']], 'style': STYLE, 'brief': 'MOKPAN web-manhwa character ' + cid, 'output_path': out + '/character_design.json'}); assert r1.success, r1.error
    r2 = SvgRigBuilder().execute({'character_design': r1.data['character_design'], 'output_path': out + '/rig_plan.json'}); assert r2.success, r2.error
    r3 = PoseLibraryBuilder().execute({'rig_plan': r2.data['rig_plan'], 'output_path': out + '/pose_library.json'}); assert r3.success, r3.error
    r4 = ActionTimelineCompiler().execute({'scene_plan': {'scenes': c['scenes']}, 'character_ids': [cid], 'fps': 30, 'output_path': out + '/action_timeline.json'}); assert r4.success, r4.error
    print(cid, 'ok', [os.path.basename(a) for r in (r1, r2, r3, r4) for a in r.artifacts])
