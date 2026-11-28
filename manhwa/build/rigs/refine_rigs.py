#!/usr/bin/env python3
"""Step 2: REFINE the raw OpenMontage artifacts (assets/rig/generated/<char>/) to our actual drawing.
The generic SvgRigBuilder output (body/head/eye/limb parts at 640x480 guesses) is replaced by the parts, pivots, layers,
poses and timelines of the real MOKPAN art (src/art/carver.js, tiger.js); everything is validated against the
OpenMontage JSON schemas and written to assets/rig/<char>/{character_design,rig_plan,pose_library,action_timeline}.json.
Run (needs the OpenMontage venv for schema validation):
  cd vendor/OpenMontage && . .venv/bin/activate && python ../../manhwa/build/rigs/refine_rigs.py"""
import os, sys, json, copy
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
OM = os.path.join(os.path.dirname(ROOT), 'vendor', 'OpenMontage'); sys.path.insert(0, OM)
from schemas.artifacts import validate_artifact

def J(path): return json.load(open(path))
def dump(path, d):
    os.makedirs(os.path.dirname(path), exist_ok=True); json.dump(d, open(path, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

def px(*a): return [round(v * 1000) for v in a]            # art units (figure height = 1) -> design px (1000 = figure height)

# ------------------------------------------------------------------ CARVER
def carver_parts():
    """returns (parts, joints). parts = (id, kind, layer, parent, pivot_px, rotation_limit)"""
    P = []
    def add(i, kind, layer, parent, pv, rot=(-35, 35)): P.append((i, kind, layer, parent, pv, rot))
    # ----- standing (s09)
    add('stand_root', 'root', 0, None, px(0, 0), (-5, 5))
    add('stand_chima', 'skirt', 10, 'stand_root', px(0, -.745), (-12, 12))      # channels: hemP hemN (px lift), hem (px shift), flare
    add('stand_torso', 'torso', 30, 'stand_root', px(0, -.70), (-12, 12))
    for sx, s in ((-1, 'l'), (1, 'r')):
        add('stand_sleeve_%s_up' % s, 'limb', 35, 'stand_torso', px(sx * .092, -.835), (-45, 45))
        add('stand_sleeve_%s_lo' % s, 'limb', 36, 'stand_sleeve_%s_up' % s, px(sx * .17, -.76), (-45, 45))
    br = [(0, -.885), (.007, -.80), (-.004, -.72), (.004, -.66)]
    add('stand_neck', 'neck', 50, 'stand_torso', px(0, -.86), (-10, 10))
    add('stand_head', 'head', 60, 'stand_neck', px(0, -.885), (-25, 25))          # channels: tilt (look up), yaw (turn)
    prev = 'stand_head'
    for i, p in enumerate(br):
        add('stand_braid_%d' % i, 'braid', 40 + i, prev, px(*p), (-40, 40)); prev = 'stand_braid_%d' % i
    add('stand_daenggi', 'ribbon', 46, prev, px(0, -.612), (-40, 40))
    # ----- seated (s03)
    add('seat_root', 'root', 0, None, px(0, 0), (-5, 5))
    add('seat_chima', 'skirt', 10, 'seat_root', px(0, -.36), (-8, 8))
    add('seat_torso', 'torso', 30, 'seat_root', px(0, -.33), (-14, 14))
    add('seat_sleeve_l_up', 'limb', 35, 'seat_torso', px(-.17, -.74), (-35, 35))
    add('seat_sleeve_l_lo', 'limb', 36, 'seat_sleeve_l_up', px(-.31, -.50), (-35, 35))
    add('seat_sleeve_r_up', 'limb', 35, 'seat_torso', px(.17, -.74), (-35, 35))
    add('seat_sleeve_r_lo', 'limb', 36, 'seat_sleeve_r_up', px(.33, -.50), (-35, 35))   # the carving forearm
    add('seat_neck', 'neck', 50, 'seat_torso', px(0, -.80), (-10, 10))
    add('seat_head', 'head', 60, 'seat_neck', px(0, -.84), (-25, 25))
    br = [(0, -.815), (.012, -.66), (-.008, -.52), (.008, -.42)]
    prev = 'seat_head'
    for i, p in enumerate(br):
        add('seat_braid_%d' % i, 'braid', 40 + i, prev, px(*p), (-40, 40)); prev = 'seat_braid_%d' % i
    add('seat_daenggi', 'ribbon', 46, prev, px(0, -.325), (-40, 40))
    parts = [{'id': i, 'kind': k, 'layer': l, **({'parent': p} if p else {})} for i, k, l, p, _, _ in P]
    joints = {i: {'pivot': pv, 'rotation': list(r), 'scale': [.8, 1.2]} for i, _, _, _, pv, r in P}
    return parts, joints

def L(a=0, hz=1, ph=0, o=0, a2=0, ph2=0):
    d = {'a': a, 'hz': hz}
    if ph: d['ph'] = ph
    if o: d['o'] = o
    if a2: d['a2'] = a2
    if ph2: d['ph2'] = ph2
    return d

def carver_poses():
    gen = {}
    # --- seated: breath + carving cycle (1.1 Hz like the v1 arm cycle)
    breath = lambda: {'seat_torso': {'scaleY': L(.005, .28)}, 'seat_sleeve_l_up': {'rotation': L(.7, .28, .4)}, 'seat_sleeve_r_up': {'rotation': L(-.7, .28, .4)},
                      'seat_head': {'y': L(.8, .28, .9)}}
    gen['seat_idle'] = {'description': 'seated at the desk, breathing only', 'parts': {}, 'loops': breath(), 'hold_frames': 24,
                        'mocap': {'clip': 'sit', 'rate': .11, 'clock': 'wall', 'w': .25}}
    carve = breath()
    carve.update({
        'seat_sleeve_r_lo': {'rotation': L(11, 1.1, 0, 0, 3.2, 1.1)},                        # chisel push (fast) / return (slow)
        'seat_sleeve_r_up': {'rotation': L(-4.5, 1.1, .55)},
        'seat_torso': {'rotation': L(.9, 1.1, .3, 1.4), 'scaleY': L(.005, .28)},                # leans into the stroke
        'seat_head': {'rotation': L(.8, .55, .8, 1.6), 'y': L(.8, .28, .9, 4)},
        'seat_sleeve_l_up': {'rotation': L(.8, .28, .4, -1.2)}, 'seat_sleeve_l_lo': {'rotation': L(.6, 1.1, 2.0)},   # left hand steadies the block
        'seat_chima': {'rotation': L(.35, 1.1, 1.0)},
    })
    gen['seat_carve'] = {'description': 'carving loop: right forearm pushes the chisel, torso leans, head follows, braid trails', 'parts': {}, 'loops': carve, 'hold_frames': 24,
                         'transition': 'power2.inOut', 'mocap': {'clip': 'sit', 'rate': .11, 'clock': 'wall', 'w': .3}}
    # --- standing (s09)
    sbreath = {'stand_torso': {'scaleY': L(.004, .3)}, 'stand_sleeve_l_up': {'rotation': L(.8, .3, .4)}, 'stand_sleeve_r_up': {'rotation': L(-.8, .3, .4)},
               'stand_root': {'x': L(1.6, .12)}, 'stand_head': {'rotation': L(.5, .17, 1.0)}}
    gen['stand_idle'] = {'description': 'standing from behind, relaxed, light weight shift', 'parts': {}, 'loops': sbreath, 'hold_frames': 24}
    gen['stand_look_up'] = {'description': 'looks up at the sky tiger: head tips back, chest opens, shoulders lift, braid swings back',
                            'parts': {'stand_head': {'tilt': 1, 'y': -12, 'rotation': -1.5}, 'stand_neck': {'rotation': -2, 'scaleY': 1.03},
                                      'stand_torso': {'rotation': -2.5, 'y': -3}, 'stand_sleeve_l_up': {'rotation': 3.5}, 'stand_sleeve_r_up': {'rotation': -3.5},
                                      'stand_sleeve_l_lo': {'rotation': 2}, 'stand_sleeve_r_lo': {'rotation': -2}, 'stand_chima': {'rotation': .6}},
                            'loops': sbreath, 'hold_frames': 30, 'transition': 'power2.inOut'}
    gen['stand_turn'] = {'description': 'turns the head slightly (cheek edge shows), still tipped up, then relaxes',
                         'parts': {'stand_head': {'tilt': .55, 'yaw': .75, 'y': -6, 'rotation': -4}, 'stand_neck': {'rotation': -3}, 'stand_torso': {'rotation': -1.2, 'y': -1},
                                   'stand_sleeve_l_up': {'rotation': 1.5}, 'stand_sleeve_r_up': {'rotation': -1.5}},
                         'loops': sbreath, 'hold_frames': 18, 'transition': 'power2.inOut'}
    gen['stand_walk'] = {'description': 'walk toward the gate: CMU walk stride retargeted (spine lean, head, sleeves, hem swing, bob)',
                         'parts': {'stand_head': {'tilt': .25, 'yaw': .35, 'y': -3}}, 'loops': {}, 'hold_frames': 30, 'transition': 'power2.inOut',
                         'mocap': {'clip': 'walk', 'rate': 1.1, 'clock': 'scene', 'w': 1}}
    return gen

def carver_cycles():
    def seg(prefix, n): return ['%s_braid_%d' % (prefix, i) for i in range(n)] + ['%s_daenggi' % prefix]
    return {
        'chains': {
            'stand': {'segments': seg('stand', 4), 'lag': .085, 'width': 1.1, 'gain': [2.4, 2.6, 2.8, 3.0, 3.2],
                      'drivers': [{'k': 'stand_head.rotation', 'g': 1}, {'k': 'stand_torso.rotation', 'g': 1.2}, {'k': 'stand_root.x', 'g': -.55}, {'k': 'stand_root.y', 'g': .5}, {'k': 'stand_head.y', 'g': .25}],
                      'wind': {'a': .9, 'hz': .42}},
            'seat': {'segments': seg('seat', 4), 'lag': .09, 'width': 1.1, 'gain': [1.3, 1.4, 1.5, 1.6, 1.7],
                     'drivers': [{'k': 'seat_head.rotation', 'g': 1}, {'k': 'seat_torso.rotation', 'g': 1.6}, {'k': 'seat_root.x', 'g': -.4}],
                     'wind': {'a': .5, 'hz': .35}}},
        'mocap_map': {
            'walk': {'stand': {   # mocap track -> channel; P = screen-right side (mocap R, mirrored for the back view)
                'stand_torso.rotation': {'src': 'spine', 'g': 1.3}, 'stand_head.rotation': {'src': 'head', 'g': .9},
                'stand_root.y': {'src': 'bob', 'g': 900}, 'stand_root.x': {'src': 'sway', 'g': 2200},
                'stand_sleeve_r_up.rotation': {'src': 'upP', 'g': 2.2}, 'stand_sleeve_r_lo.rotation': {'src': 'loP', 'g': 1.6},
                'stand_sleeve_l_up.rotation': {'src': 'upN', 'g': 2.2}, 'stand_sleeve_l_lo.rotation': {'src': 'loN', 'g': 1.6},
                'stand_chima.hemP': {'src': 'liftP', 'g': 260}, 'stand_chima.hemN': {'src': 'liftN', 'g': 260},
                'stand_chima.hem': {'src': 'shift', 'g': 1500}, 'stand_chima.rotation': {'src': 'legP', 'g': .08}}},
            'sit': {'seat': {
                'seat_torso.rotation': {'src': 'spine', 'g': .5}, 'seat_head.rotation': {'src': 'head', 'g': .5},
                'seat_root.x': {'src': 'sway', 'g': 500}, 'seat_head.y': {'src': 'bob', 'g': 120}}}},
    }

def carver_timeline():
    A = lambda at, dur, pose, ease, note='': {'at_seconds': at, 'duration_seconds': dur, 'character_id': 'carver', 'action': pose, 'pose': pose, 'easing': ease, **({'notes': note} if note else {})}
    return {
        's03': (0, 4, 'seated carving loop behind the paper door; loop continues after the doors open', [
            A(0, .25, 'seat_idle', 'power2.out'), A(.15, .6, 'seat_carve', 'power2.inOut', 'loops run on wall time; this just ramps them in')]),
        's09': (0, 4, 'look up at the sky tiger -> turn head slightly -> walk ~5 steps toward the gate (clock = progress*4s)', [
            A(0, .3, 'stand_idle', 'power2.out'),
            A(.5, .9, 'stand_look_up', 'power2.inOut', 'p .12-.35'),
            A(1.55, .6, 'stand_turn', 'power2.inOut', 'p .39-.54'),
            A(1.7, .55, 'stand_walk', 'power2.inOut', 'walk starts at p .45; ~2.4 strides (about 5 steps) until p 1')])}

# ------------------------------------------------------------------ TIGER
def tiger_parts():
    P = []
    def add(i, kind, layer, parent, pv, rot=(-30, 30)): P.append((i, kind, layer, parent, pv, rot))
    add('face_root', 'root', 0, None, px(0, .10), (-5, 5))                     # breath scale pivot
    for sx, s in ((-1, 'l'), (1, 'r')):
        add('face_ear_%s' % s, 'ear', 10, 'face_root', px(sx * .66, -.68), (-25, 25))
    add('face_head', 'head', 20, 'face_root', px(0, 0), (-8, 8))
    for sx, s in ((-1, 'l'), (1, 'r')):
        add('face_lid_%s' % s, 'eyelid', 50, 'face_head', px(sx * .37, -.23), (-5, 5))      # channel: close 0..1
        add('face_pupil_%s' % s, 'pupil', 51, 'face_head', px(sx * .37, -.23), (-5, 5))     # channels: dilate, gx, gy
        add('face_brow_%s' % s, 'brow', 60, 'face_head', px(sx * .40, -.55), (-25, 25))
        add('face_whisker_%s' % s, 'whisker', 80, 'face_head', px(sx * .22, .30), (-20, 20))
    add('face_jaw', 'jaw', 70, 'face_head', px(0, .40), (-5, 5))                           # channel: open 0..1
    parts = [{'id': i, 'kind': k, 'layer': l, **({'parent': p} if p else {})} for i, k, l, p, _, _ in P]
    joints = {i: {'pivot': pv, 'rotation': list(r), 'scale': [.8, 1.2]} for i, _, _, _, pv, r in P}
    return parts, joints

def tiger_poses():
    br = {'face_root': {'scaleX': L(.006, .33), 'scaleY': L(.009, .33)}, 'face_whisker_l': {'rotation': L(.8, .33, 1)}, 'face_whisker_r': {'rotation': L(-.8, .33, 1)}}
    G = {}
    G['face_idle'] = {'description': 'neutral, breathing (head scale)', 'parts': {}, 'loops': br, 'hold_frames': 24}
    G['face_sleep'] = {'description': 'asleep in the red print: lids shut. Deliberately the REST pose (no offsets, no breath) so s06 p=0 equals s05 p=1', 'parts': {'face_lid_l': {'close': 1}, 'face_lid_r': {'close': 1}}, 'loops': {}, 'hold_frames': 24}
    G['face_wake'] = {'description': 'ink spreads: head lifts a hair, ears perk', 'parts': {'face_head': {'y': -10, 'scaleX': 1.01, 'scaleY': 1.01},
                      'face_ear_l': {'rotation': -6}, 'face_ear_r': {'rotation': 6}}, 'loops': br, 'hold_frames': 24, 'transition': 'power2.out'}
    G['face_furrow'] = {'description': 'brows knit and drop, eyes narrow, pupils tighten, whiskers draw back',
                        'parts': {'face_brow_l': {'rotation': 13, 'y': 14}, 'face_brow_r': {'rotation': -13, 'y': 14}, 'face_lid_l': {'close': .22}, 'face_lid_r': {'close': .22},
                                  'face_pupil_l': {'dilate': -.3}, 'face_pupil_r': {'dilate': -.3}, 'face_whisker_l': {'rotation': 3}, 'face_whisker_r': {'rotation': -3},
                                  'face_head': {'y': 8, 'scaleX': 1.015, 'scaleY': 1.015}, 'face_ear_l': {'rotation': 3}, 'face_ear_r': {'rotation': -3}},
                        'loops': br, 'hold_frames': 24, 'transition': 'power2.inOut'}
    G['face_roar'] = {'description': 'roar: jaw drops (mouth part), brows hard down, ears pinned back, whiskers flare, head surges', 'expression': 'fierce',
                      'parts': {'face_jaw': {'open': 1}, 'face_brow_l': {'rotation': 18, 'y': 20}, 'face_brow_r': {'rotation': -18, 'y': 20},
                                'face_lid_l': {'close': .3}, 'face_lid_r': {'close': .3}, 'face_pupil_l': {'dilate': -.45}, 'face_pupil_r': {'dilate': -.45},
                                'face_whisker_l': {'rotation': -7}, 'face_whisker_r': {'rotation': 7}, 'face_ear_l': {'rotation': 12}, 'face_ear_r': {'rotation': -12},
                                'face_head': {'y': -12, 'scaleX': 1.025, 'scaleY': 1.025}},
                      'loops': {'face_head': {'x': L(2.5, 9)}}, 'hold_frames': 24, 'transition': 'power3.out'}
    G['ear_flick_r'] = {'description': 'right ear flick (overlay pulse)', 'mode': 'overlay', 'env': [.3, .55], 'parts': {'face_ear_r': {'rotation': -17, 'scaleY': .93}}}
    G['ear_flick_l'] = {'description': 'left ear flick (overlay pulse)', 'mode': 'overlay', 'env': [.3, .55], 'parts': {'face_ear_l': {'rotation': 17, 'scaleY': .93}}}
    G['blink_slow'] = {'description': 'slow lazy blink for the sky tiger (overlay, periodic)', 'mode': 'overlay', 'every': 3.4, 'env': [.4, .6],
                       'parts': {'face_lid_l': {'close': 1}, 'face_lid_r': {'close': 1}, 'face_head': {'y': 3}}}
    G['sky_breathe'] = {'description': 'sky tiger slow breath: head scale + whisker drift', 'parts': {}, 'loops': {'face_root': {'scaleX': L(.012, .2), 'scaleY': L(.018, .2)},
                        'face_head': {'y': L(5, .2, 1.2)}, 'face_whisker_l': {'rotation': L(1.6, .2, 1)}, 'face_whisker_r': {'rotation': L(-1.6, .2, 1)}}, 'hold_frames': 24}
    return G

def tiger_timeline():
    A = lambda at, dur, pose, ease, note='': {'at_seconds': at, 'duration_seconds': dur, 'character_id': 'tiger', 'action': pose, 'pose': pose, 'easing': ease, **({'notes': note} if note else {})}
    return {
        's06': (0, 4, 'red print wakes (clock = progress*4s): ink 0-1.4s, eyes open 1.4-1.9s, ear flicks + furrow, roar at 3.4s', [
            A(0, .2, 'face_sleep', 'power2.out'), A(1.1, .45, 'face_wake', 'power2.out', 'p .28-.39 head lifts as ink completes'),
            A(2.0, .4, 'ear_flick_r', 'power2.out', 'p .50 ear flick'), A(2.35, .4, 'ear_flick_l', 'power2.out'),
            A(2.2, .9, 'face_furrow', 'power2.inOut', 'p .55-.77 brows knit during the push-in'),
            A(3.4, .4, 'face_roar', 'power3.out', 'p .85-.95 jaw opens = mouthOpen of v1')]),
        's09': (0, 4, 'sky tiger: breathes; slow blink about every 3.4s starting at 0.9s', [
            A(0, .3, 'sky_breathe', 'power2.out'), A(.9, .9, 'blink_slow', 'power1.inOut', 'overlay, periodic')])}

# ------------------------------------------------------------------ assemble + validate
DESIGN_NOTES = {
 'carver': {'role': 'protagonist, woodblock carver (각수), seen from behind',
            'body_type': 'young Korean woman, hanbok: short jeogori (jacket) + full chima (bell skirt), long single ink braid, BLUE daenggi ribbon with bow and two tails',
            'silhouette_notes': 'REFINED: art unit space = figure height 1.0 (design px 1000). Standing variant: feet-centre origin; seated variant: bottom-centre origin (cut by desk). Legs never drawn; mocap leg motion drives the chima hem.'},
 'tiger': {'role': 'minhwa tiger emblem: red print -> alive ink tiger; faint sky tiger in the finale',
           'body_type': 'front face emblem; art unit space = half the emblem size (head spans about -1..1), design px 1000 = 1 unit',
           'silhouette_notes': 'REFINED: eyes/lids/pupils/brows/ears/jaw/whiskers are separate transformable parts of one flat emblem.'}}

def main():
    for cid in ('carver', 'tiger'):
        gen = os.path.join(ROOT, 'assets', 'rig', 'generated', cid); out = os.path.join(ROOT, 'assets', 'rig', cid)
        # character_design: keep the generated one, refine notes
        cd = J(gen + '/character_design.json')
        for c in cd['characters']:
            c.update(DESIGN_NOTES[cid]); c['required_views'] = ['back'] if cid == 'carver' else ['front']
        cd['metadata'].update({'refined': True, 'refined_by': 'build/rigs/refine_rigs.py'}); validate_artifact('character_design', cd); dump(out + '/character_design.json', cd)
        # rig_plan
        rp = J(gen + '/rig_plan.json'); c0 = rp['characters'][0]
        parts, joints = carver_parts() if cid == 'carver' else tiger_parts()
        c0['parts'] = parts; c0['joints'] = joints; c0['layers'] = [p['id'] for p in sorted(parts, key=lambda p: p['layer'])]
        c0['views'] = ['back_stand', 'back_seat'] if cid == 'carver' else ['front']
        poses = carver_poses() if cid == 'carver' else tiger_poses()
        c0['required_poses'] = sorted(poses.keys()); c0['required_actions'] = c0.get('required_actions', [])
        c0['risks'] = (['stand/seat are two part-sets of one rig (ids prefixed stand_/seat_)', 'braid + daenggi are procedural secondary motion (damped lagged follow-through), not keyed',
                        'mocap is front-view 2D: retargeted as deltas (mirrored for the back view); legs are hidden by the chima so only hem/bob/lean are visible'] if cid == 'carver' else
                       ['custom channels (close, dilate, open, tilt) are read by src/art/tiger.js', 'sky mode reuses the same parts'])
        rp['metadata'].update({'refined': True, 'coordinate_space': 'design px; 1000 = figure height (carver) / 1 emblem unit (tiger); y down'})
        validate_artifact('rig_plan', rp); dump(out + '/rig_plan.json', rp)
        # pose_library
        pl = J(gen + '/pose_library.json'); p0 = pl['characters'][0]
        p0['poses'] = poses
        p0['action_cycles'] = carver_cycles() if cid == 'carver' else {'chains': {}, 'mocap_map': {}}
        p0['mouth_shapes'] = {'closed': {'description': 'jaw.open = 0'}, 'roar': {'description': 'jaw.open = 1 (tiger.js lowers the lower lip + fangs)'}} if cid == 'tiger' else p0.get('mouth_shapes', {})
        pl['metadata'].update({'refined': True, 'channels': 'rotation(deg) x y(px) scaleX scaleY + custom (hem hemP hemN flare, tilt yaw, close dilate gx gy open)',
                               'loops': '{a,hz,ph,o,a2,ph2} sinusoids added to the pose value, evaluated on wall time'})
        validate_artifact('pose_library', pl); dump(out + '/pose_library.json', pl)
        # action_timeline
        tl = {'version': '1.0', 'fps': 30, 'scenes': [], 'metadata': {'source': 'action_timeline_compiler (refined)', 'refined': True,
              'clock': 'scene seconds = scene progress p * 4.0 (len 1.6vh * 2.5 s/vh); s03 loops run on wall time',
              'design_scale': {cid: 1000}}}
        for sid, (a, b, desc, acts) in (carver_timeline() if cid == 'carver' else tiger_timeline()).items():
            tl['scenes'].append({'scene_id': sid, 'start_seconds': a, 'end_seconds': b, 'background': desc, 'camera': {'framing': 'portrait 1000x1400'}, 'effects': [], 'actions': acts})
        validate_artifact('action_timeline', tl); dump(out + '/action_timeline.json', tl)
        print(cid, 'refined:', len(parts), 'parts,', len(poses), 'poses')

if __name__ == '__main__': main()
