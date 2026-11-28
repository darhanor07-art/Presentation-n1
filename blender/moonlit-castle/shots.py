"""Spring-manhwa background plates + parallax layers from moonlit_castle.blend (bpy 5.x, Cycles CPU).

  python shots.py [name ...] [--quick] [--force]

Names (900x1260 portrait):
  plates : plate_moon plate_macro plate_gate plate_tower plate_garden
           plate_ots_castle plate_ots_tair   (over-the-shoulder: Aiaru's shoulder/hair out of focus in front)
  seq    : feet_00 .. feet_11   (12-frame walk cycle, camera 30 cm above the flowers, renders/spring/seq)
  layers : moon_sky moon_castle   hero_sky hero_castle hero_fg   (RGBA, transparent film; stack bottom->top)
Existing outputs are skipped (resume safe).  --quick = 450x630, 16 spp -> renders/spring/_preview/.

Scene fixes applied in memory on every run (the .blend itself is not modified):
  * Moon gets a real maria + crater texture (emission is lower so the detail survives tone-mapping)
  * a rocky cliff foundation is lofted under the castle and the hill around it is lowered, so the
    castle stands on a crag instead of a flat slab
"""
import sys, os, math, time
import numpy as np
import bpy, bmesh
from mathutils import Vector, Quaternion
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nodeutil import *

HERE = os.path.dirname(os.path.abspath(__file__))
QUICK = "--quick" in sys.argv
FORCE = "--force" in sys.argv
SUB = "_preview" if QUICK else ""
OUT = {"plate": os.path.join(HERE, "renders", "spring", SUB or "plates"),
       "seq": os.path.join(HERE, "renders", "spring", SUB or "seq"),
       "layer": os.path.join(HERE, "renders", "spring", SUB or "layers")}
for d in OUT.values():
    os.makedirs(d, exist_ok=True)

CX, CY = 28.0, 330.0
MOON_AZ, MOON_EL = math.radians(8.5), math.radians(22.5)

# name -> (kind, camera, layer)   layer: None (full) | sky | castle | fg
SHOTS = {
    "plate_moon":   ("plate", "CAM_MOON", None),
    "plate_macro":  ("plate", "CAM_MACRO", None),
    "plate_gate":   ("plate", "CAM_GATE", None),
    "plate_tower":  ("plate", "CAM_TOWER", None),
    "plate_garden": ("plate", "CAM_GARDEN", None),
    "plate_ots_castle": ("plate", "CAM_OTS_CASTLE", None),
    "plate_ots_tair":   ("plate", "CAM_OTS_TAIR", None),
    "moon_sky":     ("layer", "CAM_MOON", "sky"),
    "moon_castle":  ("layer", "CAM_MOON", "castle"),
    "hero_sky":     ("layer", "CAM_HERO", "sky"),
    "hero_castle":  ("layer", "CAM_HERO", "castle"),
    "hero_fg":      ("layer", "CAM_HERO", "fg"),
}
for _i in range(12):
    SHOTS[f"feet_{_i:02d}"] = ("seq", "CAM_FEET", None)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "moonlit_castle.blend"), load_ui=False, use_scripts=False)
sc = bpy.context.scene
cy = sc.cycles
O = bpy.data.objects


# ----------------------------------------------------------------------------
# value noise (numpy) for the rock
# ----------------------------------------------------------------------------
class Noise:
    def __init__(self, seed):
        self.lat = np.random.default_rng(seed).random((256, 256))

    def __call__(self, x, y):
        x = np.asarray(x, float); y = np.asarray(y, float)
        xi = np.floor(x).astype(np.int64); yi = np.floor(y).astype(np.int64)
        fx = x - xi; fy = y - yi
        u = fx * fx * (3 - 2 * fx); v = fy * fy * (3 - 2 * fy)
        L = self.lat
        a = L[yi & 255, xi & 255]; b = L[yi & 255, (xi + 1) & 255]
        c = L[(yi + 1) & 255, xi & 255]; d = L[(yi + 1) & 255, (xi + 1) & 255]
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v

    def fbm(self, x, y, o=4):
        s, amp, tot, f = 0.0, 1.0, 0.0, 1.0
        for k in range(o):
            s = s + amp * self(x * f + 17.3 * k, y * f - 9.1 * k); tot += amp; amp *= 0.5; f *= 2.03
        return s / tot


NZ = Noise(91)
NZ2 = Noise(92)
sm = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(np.clip((np.asarray(x, float) - a) / (b - a), 0, 1))


# ----------------------------------------------------------------------------
# fix 1: moon texture
# ----------------------------------------------------------------------------
def fix_moon():
    m, nt = new_mat("MoonCraters")
    obj = texcoord(nt, "Object")
    R = O["Moon"].dimensions.x / 2
    vn = nd(nt, "ShaderNodeVectorMath", operation="SCALE")
    lk(nt, obj, vn.inputs[0]); vn.inputs["Scale"].default_value = 1.0 / R
    v = vn.outputs[0]
    # maria: big irregular dark seas
    warp = noise_tex(nt, v, 2.2, 3, 0.5)
    mare_n = noise_tex(nt, v, 1.25, 5, 0.58, 0.85)
    mare = ramp(nt, mt(nt, "ADD", mare_n, mt(nt, "MULTIPLY", warp, 0.25)), [(0.50, (1, 1, 1)), (0.60, (0, 0, 0))])
    small_mare = ramp(nt, noise_tex(nt, v, 5.0, 4, 0.6, 0.5), [(0.60, (0, 0, 0)), (0.72, (1, 1, 1))])

    def crater(scale, rc, w, gain, seed):
        vor = nd(nt, "ShaderNodeTexVoronoi", voronoi_dimensions="3D")
        vor.inputs["Scale"].default_value = scale
        vor.inputs["Randomness"].default_value = 1.0
        off = nd(nt, "ShaderNodeVectorMath", operation="ADD")
        lk(nt, v, off.inputs[0]); off.inputs[1].default_value = (seed, seed * 0.7, seed * 1.3)
        lk(nt, off.outputs[0], vor.inputs["Vector"])
        d = vor.outputs["Distance"]
        ring = mt(nt, "EXPONENT", mt(nt, "MULTIPLY", mt(nt, "POWER", mt(nt, "DIVIDE", mt(nt, "SUBTRACT", d, rc), w), 2.0), -1.0))
        floor = mt(nt, "SUBTRACT", 1.0, mt(nt, "DIVIDE", d, rc), clamp=True)
        return mt(nt, "MULTIPLY", ring, gain), mt(nt, "MULTIPLY", floor, gain)
    rings, floors = [], []
    for sc_, rc, w, g, s in ((5.0, 0.30, 0.05, 1.0, 3.0), (11.0, 0.30, 0.06, 0.8, 7.0), (24.0, 0.28, 0.07, 0.65, 11.0), (52.0, 0.27, 0.08, 0.5, 5.0)):
        r_, f_ = crater(sc_, rc, w, g, s)
        rings.append(r_); floors.append(f_)
    ring_sum = mt(nt, "ADD", mt(nt, "ADD", rings[0], rings[1]), mt(nt, "ADD", rings[2], rings[3]))
    floor_sum = mt(nt, "ADD", mt(nt, "ADD", floors[0], floors[1]), mt(nt, "ADD", floors[2], floors[3]))
    fine = noise_tex(nt, v, 90.0, 5, 0.6)
    broad = noise_tex(nt, v, 6.0, 4, 0.5)
    high = (0.95, 0.96, 1.0)
    col = mixc(nt, high, (0.62, 0.64, 0.82), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", broad, 0.35, clamp=True), 1.1))     # highland blotches
    col = mixc(nt, col, (0.30, 0.34, 0.60), mt(nt, "MULTIPLY", out_sock(mare), 0.88))                            # maria (blue-grey)
    col = mixc(nt, col, (0.24, 0.27, 0.50), mt(nt, "MULTIPLY", out_sock(small_mare), 0.35))
    col = mixc(nt, col, (0.20, 0.22, 0.42), mt(nt, "MULTIPLY", floor_sum, 0.55, clamp=True))                    # crater floors
    col = mixc(nt, col, (1.0, 1.0, 1.0), mt(nt, "MULTIPLY", ring_sum, 0.55, clamp=True))                         # bright rims
    col = mixc(nt, col, (0.45, 0.48, 0.68), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", fine, 0.5, clamp=True), 0.8))
    lw = nd(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.4
    em = nd(nt, "ShaderNodeEmission")
    lk(nt, out_sock(col), em.inputs["Color"])
    lk(nt, out_sock(mt(nt, "MULTIPLY", mt(nt, "ADD", 0.6, mt(nt, "MULTIPLY", lw.outputs["Facing"], 0.4)), 1.35)), em.inputs["Strength"])
    mat_output(nt, em)
    mo = O["Moon"]
    mo.data.materials.clear()
    mo.data.materials.append(m)
    mo.rotation_euler = (math.radians(75), math.radians(10), MOON_AZ + math.pi + math.radians(40))


# ----------------------------------------------------------------------------
# fix 2: rocky foundation + lowered hill
# ----------------------------------------------------------------------------
RA, RB, RR = 104.0, 34.0, 14.0      # rounded-rect half sizes / corner radius of the footprint (castle local)
FCX, FCY = CX, CY - 1.0


def rrect_sdf(x, y):
    qx = np.abs(x - FCX) - (RA - RR); qy = np.abs(y - FCY) - (RB - RR)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - RR


def rrect_perimeter(n):
    """n points evenly spaced along the rounded rectangle, with outward normals."""
    straight_x, straight_y = 2 * (RA - RR), 2 * (RB - RR)
    arc = math.pi * RR / 2
    L = 2 * straight_x + 2 * straight_y + 4 * arc
    pts, nrm = [], []
    for i in range(n):
        s = L * i / n
        segs = [("L", straight_x), ("A", arc), ("L", straight_y), ("A", arc), ("L", straight_x), ("A", arc), ("L", straight_y), ("A", arc)]
        # start at bottom-left of the bottom edge, walk counter-clockwise: bottom (+x), arc, right (+y), arc, top (-x), arc, left (-y), arc
        cur = s
        P = (0, 0); N = (0, -1)
        k = 0
        corner = [(RA - RR, -(RB - RR)), (RA - RR, RB - RR), (-(RA - RR), RB - RR), (-(RA - RR), -(RB - RR))]
        for kind, ln in segs:
            if cur <= ln:
                t = cur / ln
                if kind == "L":
                    if k == 0:
                        P = (-(RA - RR) + t * ln, -RB); N = (0, -1)
                    elif k == 2:
                        P = (RA, -(RB - RR) + t * ln); N = (1, 0)
                    elif k == 4:
                        P = ((RA - RR) - t * ln, RB); N = (0, 1)
                    else:
                        P = (-RA, (RB - RR) - t * ln); N = (-1, 0)
                else:
                    c = corner[(k - 1) // 2]
                    a0 = -math.pi / 2 + (k - 1) // 2 * math.pi / 2
                    a = a0 + t * math.pi / 2
                    N = (math.cos(a), math.sin(a)); P = (c[0] + RR * N[0], c[1] + RR * N[1])
                break
            cur -= ln; k += 1
        pts.append((FCX + P[0], FCY + P[1])); nrm.append(N)
    return np.array(pts), np.array(nrm)


def fix_foundation():
    Z0 = O["Castle"].location.z
    # lower the hill around the castle -> a cliff
    t = O["Terrain"]
    me = t.data
    co = np.zeros(len(me.vertices) * 3, np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    d = rrect_sdf(co[:, 0], co[:, 1])
    far = np.exp(-np.maximum(d - 60, 0) / 40.0)
    drop = 13.0 * (1 - sm(0, 60, d)) * (d > -2) * far
    drop = drop * (0.8 + 0.4 * NZ.fbm(co[:, 0] / 25, co[:, 1] / 25, 3))
    co[:, 2] -= drop.astype(np.float32)
    me.vertices.foreach_set("co", co.ravel()); me.update()
    # cliff loft
    n = 720
    P, N = rrect_perimeter(n)
    sarc = np.arange(n) * 1.0
    depths = np.concatenate([[-0.3, -0.3], np.linspace(0.0, 12, 16), np.linspace(13.5, 40, 16)])
    offs0 = np.concatenate([[-9.0, 0.0], np.zeros(16), np.zeros(16)])
    rings = []
    for k, dep in enumerate(depths):
        o = offs0[k] if k < 2 else (3.0 + 0.45 * dep + 0.012 * dep * dep)
        nz1 = NZ.fbm(sarc / 22.0 + 3.1, np.full(n, dep / 9.0 + 5.0), 4) - 0.5
        nz2 = NZ2.fbm(sarc / 6.0, np.full(n, dep / 3.5), 3) - 0.5
        ledge = 3.2 * (np.abs(((dep / 6.0) % 1.0) - 0.5) - 0.25) * (k > 1)
        amp = 1.3 + 0.5 * max(dep, 0)
        off = o + (nz1 * 2.6 + nz2 * 0.9) * amp * (k > 1) * 0.9 + ledge
        pts = P + N * off[:, None]
        z = Z0 + 0.3 - np.maximum(dep, 0) + (nz2 * 1.5 * (k > 1))
        # crags poking up near the top edge
        if k >= 2 and dep < 5:
            z += np.maximum(nz1 - 0.05, 0) * 14 * (1 - dep / 5)
        rings.append(np.column_stack([pts, z]))
    verts = np.concatenate(rings)
    faces = []
    nr = len(rings)
    for r in range(nr - 1):
        for i in range(n):
            j = (i + 1) % n
            faces.append((r * n + i, r * n + j, (r + 1) * n + j, (r + 1) * n + i))
    # closed bottom cap (hidden underground) so the shape is solid
    verts = np.vstack([verts, np.array([[FCX, FCY, Z0 - 50.0]])])
    c = len(verts) - 1
    for i in range(n):
        faces.append(((nr - 1) * n + (i + 1) % n, (nr - 1) * n + i, c))
    mat = bpy.data.materials["Rock"]
    ob = mesh_obj("Foundation", verts, faces, [mat], smooth=True)
    # orientation: outward normals (side faces)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()
    ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons))
    ob.visible_shadow = True
    return ob


# ----------------------------------------------------------------------------
# cameras
# ----------------------------------------------------------------------------
def ground(x, y):
    t = O["Terrain"]
    ok, loc, nrm, idx = t.ray_cast(Vector((x, y, 600.0)), Vector((0, 0, -1)))
    return loc.z if ok else 0.0


def make_cam(name, loc, target, lens, fstop=None, focus=None):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 36.0
    cd.clip_start = 0.03; cd.clip_end = 30000
    if fstop:
        cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.focus_distance = focus
    ob = bpy.data.objects.new(name, cd)
    sc.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return ob


def dirpt(loc, az_deg, el_deg, dist=1000.0):
    az, el = math.radians(az_deg), math.radians(el_deg)
    return (loc[0] + dist * math.sin(az) * math.cos(el), loc[1] + dist * math.cos(az) * math.cos(el), loc[2] + dist * math.sin(el))


def build_cameras():
    # moon + spires from below: tips rise out of the bottom of the frame
    p = (0.0, 2.0, 1.0)
    make_cam("CAM_MOON", p, dirpt(p, 6.5, 26.0), 78)
    # lone spire against the moon (telephoto)
    p = (0.0, 2.0, 1.0)
    make_cam("CAM_TOWER", p, dirpt(p, 8.2, 20.5), 135)
    # macro: ground level among flowers, big bokeh
    gx, gy = 0.50, -0.40
    p = (gx, gy, ground(gx, gy) + 0.20)
    tz = ground(0.08, 0.78) + 0.24
    tgt = Vector((0.08, 0.78, tz))
    make_cam("CAM_MACRO", p, tgt, 85, 1.8, (tgt - Vector(p)).length)
    # gate: castle base at ~120 m, slightly low
    gx, gy = 22.0, 190.0
    p = (gx, gy, ground(gx, gy) + 13.0)
    make_cam("CAM_GATE", p, (CX, 306.0, ground(CX, 306.0) + 22.0), 40)
    # low mist hugging the bare slope in front of the gate
    def gate_mist(nt):
        pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
        x, y, z = sepxyz(nt, pos)
        n1 = noise_tex(nt, pos, 0.05, 4, 0.55)
        zc = ground(25.0, 225.0)
        gz = mt(nt, "EXPONENT", mt(nt, "MULTIPLY", mt(nt, "POWER", mt(nt, "DIVIDE", mt(nt, "SUBTRACT", z, zc + 3.0), 7.0), 2.0), -1.0))
        v = nd(nt, "ShaderNodeVolumePrincipled"); v.inputs["Color"].default_value = (0.62, 0.66, 1.0, 1); v.inputs["Anisotropy"].default_value = 0.3
        lk(nt, out_sock(mt(nt, "MULTIPLY", gz, mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n1, 0.25, clamp=True), 0.045))), v.inputs["Density"])
        o = nd(nt, "ShaderNodeOutputMaterial"); lk(nt, v.outputs[0], o.inputs["Volume"])
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(25, 235, ground(25.0, 225.0) + 6))
    gm = bpy.context.object; gm.name = "GateMist"; gm.scale = (200, 150, 30); gm.visible_shadow = False
    mm, nt = new_mat("GateMist"); gate_mist(nt); gm.data.materials.append(mm)
    # garden: human height inside the flower field, looking toward the castle
    gx, gy = -0.4, 0.5
    p = (gx, gy, ground(gx, gy) + 1.55)
    make_cam("CAM_GARDEN", p, (10.0, 60.0, p[2] + 1.9), 32, 4.0, 7.0)
    # over-the-shoulder shots: position is finalised in prep_*() once the character is placed
    make_cam("CAM_OTS_CASTLE", (0, 5, 2), (28, 330, 30), 50, 2.0, 330.0)
    make_cam("CAM_OTS_TAIR", (0, 5, 2), (28, 330, 30), 50, 2.2, 5.0)


# ----------------------------------------------------------------------------
# characters in the castle scene (over-the-shoulder shots, feet sequence)
# ----------------------------------------------------------------------------
sys.path.insert(0, HERE)
import characters as C          # noqa: E402   (only the builders are used; no reset()/world_and_lights())


def place_char(who, P, loc, yaw_deg):
    """build_aiaru / build_tair into the open scene, parented to a root empty standing at `loc` (world metres)."""
    before = set(bpy.data.objects)
    C.build_aiaru(P) if who == "aiaru" else C.build_tair(P)
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new("Root_" + who, None)
    sc.collection.objects.link(root)
    root.location = loc
    root.rotation_euler = (0, 0, math.radians(yaw_deg))
    for o in new:
        if o.parent is None:
            o.parent = root
    return root, new


def yaw_to(x0, y0, x1, y1):
    """root yaw (deg) so that a character (facing +Y) looks from (x0,y0) toward (x1,y1)."""
    return math.degrees(math.atan2(-(x1 - x0), (y1 - y0)))


def char_light(name, direction_to, energy, color, angle, objs):
    """sun that only lights `objs` (light linking), so the castle plates stay untouched."""
    ld = bpy.data.lights.new(name, "SUN")
    ld.energy = energy; ld.color = color; ld.angle = math.radians(angle)
    ob = bpy.data.objects.new(name, ld)
    sc.collection.objects.link(ob)
    ob.rotation_euler = Vector(direction_to).to_track_quat("Z", "Y").to_euler()
    coll = bpy.data.collections.new(name + "_rcv")
    sc.collection.children.link(coll)
    for o in objs:
        coll.objects.link(o)
    ob.light_linking.receiver_collection = coll
    return ob, coll


def remove_all(objs, colls=()):
    for o in objs:
        try:
            bpy.data.objects.remove(o)
        except ReferenceError:
            pass
    for c in colls:
        bpy.data.collections.remove(c)


def cam_az(p):
    return math.degrees(math.atan2(CX - p[0], CY - p[1]))


def prep_ots_castle(name):
    sc.cycles_curves.shape = "THICK"
    ax, ay = 0.5, 7.0
    az = ground(ax, ay)
    yaw = yaw_to(ax, ay, CX, CY)
    root, objs = place_char("aiaru", dict(wind=0.30, lift=0.10, ph=0.8, view=0.0), (ax, ay, az), yaw)
    # camera behind and slightly right of her head
    a = math.radians(yaw)
    fwd = Vector((-math.sin(a), math.cos(a), 0)); right = Vector((math.cos(a), math.sin(a), 0))
    hd = Vector((ax, ay, az + 1.575))
    cp = hd - fwd * OTS_C["back"] + right * OTS_C["right"] + Vector((0, 0, OTS_C["up"]))
    cam = O["CAM_OTS_CASTLE"]
    cam.location = cp
    tgt = dirpt(cp, cam_az(cp) + OTS_C["yaw"], OTS_C["el"])
    cam.rotation_euler = (Vector(tgt) - cp).to_track_quat("-Z", "Y").to_euler()
    cam.data.dof.focus_distance = math.hypot(CX - cp.x, CY - cp.y)
    lights = []
    # cool moon rim from the front-right (edges of hair/shoulder), faint cold fill from the left behind
    l1, c1 = char_light("OTS_Rim", (0.55, 0.80, 0.50), 4.0, (0.70, 0.80, 1.0), 3.0, objs)
    l2, c2 = char_light("OTS_Fill", (-0.5, -0.6, 0.45), 0.9, (0.55, 0.62, 1.0), 20.0, objs)
    return lambda: remove_all(objs + [root, l1, l2], [c1, c2])


OTS_C = dict(back=0.88, right=0.15, up=-0.03, yaw=0.0, el=7.0)
TAIR_C = dict(back=0.98, right=0.25, look_az=-17.0, tair_off=4.5, dist=4.4, cam_up=-0.30, el=7.0, moon_up=3.5)


def set_moon(cp, az, el):
    """re-aim moon, halo and moon light for one plate; returns an undo function."""
    names = ("Moon", "MoonHalo", "MoonLight")
    old = {n: (O[n].location.copy(), O[n].rotation_euler.copy()) for n in names}
    d = Vector(dirpt((0, 0, 0), az, el, 1.0)).normalized()
    D = old["Moon"][0].length
    O["Moon"].location = d * D
    O["MoonHalo"].location = d * (D - 60)
    O["MoonHalo"].rotation_euler = (-d).to_track_quat("Z", "Y").to_euler()
    O["MoonLight"].rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    def undo():
        for n in names:
            O[n].location, O[n].rotation_euler = old[n][0], old[n][1]
    return undo


def prep_ots_tair(name):
    sc.cycles_curves.shape = "THICK"
    T = TAIR_C
    ax, ay = 0.5, 7.0
    az0 = ground(ax, ay)
    look = T["look_az"]
    yawA = -(look + T["tair_off"] * 0.5)
    rootA, objsA = place_char("aiaru", dict(wind=0.30, lift=0.10, ph=0.8, view=0.0), (ax, ay, az0), yawA)
    a = math.radians(yawA)
    fwd = Vector((-math.sin(a), math.cos(a), 0)); right = Vector((math.cos(a), math.sin(a), 0))
    hd = Vector((ax, ay, az0 + 1.575))
    cp = hd - fwd * T["back"] + right * T["right"] + Vector((0, 0, T["cam_up"]))
    cam = O["CAM_OTS_TAIR"]
    cam.location = cp
    tgt = dirpt(cp, look, T["el"])
    cam.rotation_euler = (Vector(tgt) - cp).to_track_quat("-Z", "Y").to_euler()
    # Tair stands in the flowers a few metres ahead, facing the camera
    ta = math.radians(look + T["tair_off"])
    tx, ty = cp.x + T["dist"] * math.sin(ta), cp.y + T["dist"] * math.cos(ta)
    rootT, objsT = place_char("tair", dict(wind=0.35, lift=0.1, ph=0.4, view=0.0), (tx, ty, ground(tx, ty)), yaw_to(tx, ty, cp.x, cp.y))
    cam.data.dof.focus_distance = T["dist"]
    head_el = math.degrees(math.atan2(ground(tx, ty) + 1.85 - cp.z, T["dist"]))
    T["moon_az"], T["moon_el"] = look + T["tair_off"] + 0.5, head_el + T["moon_up"]
    undo_moon = set_moon(cp, T["moon_az"], T["moon_el"])
    dm, dnt = new_mat("TairShadowSkin")
    mat_output(dnt, principled(dnt, Base_Color=(0.030, 0.022, 0.026), Roughness=0.7))
    for o in objsT:                                    # face / neck / hands: pure shadow, only hair + shoulders catch the rim
        if o.type == "MESH" and o.name.split(".")[0] in ("Head", "Neck", "Hand"):
            o.data.materials.clear(); o.data.materials.append(dm)
    for m in {m for o in objsT if o.type == "MESH" for m in o.data.materials}:     # keep him a dark silhouette
        for n in m.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                n.inputs["Sheen Weight"].default_value = 0.0
                c = n.inputs["Base Color"]
                if not c.is_linked:
                    c.default_value = tuple(v * 0.45 for v in c.default_value[:3]) + (1.0,)
    # moon rim light on Tair only (hair + shoulders) from behind; his face gets nothing from the camera-side key
    md = dirpt((0, 0, 0), T["moon_az"] + 6.0, T["moon_el"] + 14.0, 1.0)
    lT, cT = char_light("TairRim", md, 14.0, (0.70, 0.80, 1.0), 2.5, objsT)
    lA, cA = char_light("OTS_Rim", (0.55, 0.80, 0.50), 4.0, (0.70, 0.80, 1.0), 3.0, objsA)
    lF, cF = char_light("OTS_Fill", (-0.5, -0.6, 0.45), 0.9, (0.55, 0.62, 1.0), 20.0, objsA)
    # KeyFront (camera side) must not reach Tair's face
    keep = [o for o in bpy.data.objects if o not in objsT and o.type in ("MESH", "CURVES", "HAIR") or (o.type not in ("LIGHT", "CAMERA", "EMPTY") and o not in objsT)]
    kc = bpy.data.collections.new("KeyRcv"); sc.collection.children.link(kc)
    for o in keep:
        if o not in objsT and o.type not in ("LIGHT", "CAMERA", "EMPTY"):
            kc.objects.link(o)
    O["KeyFront"].light_linking.receiver_collection = kc
    def cleanup():
        O["KeyFront"].light_linking.receiver_collection = None
        undo_moon()
        remove_all(objsA + objsT + [rootA, rootT, lT, lA, lF], [cT, cA, cF, kc])
    return cleanup


# ---------------------------------------------------------------- feet walk cycle (12 frames, one full gait cycle)
FEET = dict(S0=(-0.6, 6.0), phi=-40.0, dist=1.3, cam_z=0.28, look_z=0.27, nflower=260, seed=7)
FEET_STATE = {}


def feet_setup():
    """once per process: clear the dense scatter around the lane, hand-place hero flowers + petals."""
    if FEET_STATE:
        return
    F = FEET
    C.GAIT_L = 0.9
    sx, sy = F["S0"]
    x0, x1, y0, y1 = sx - 1.3, sx + 1.7, sy - 2.5, sy + 2.4
    me = O["FlowerScatter"].data
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if x0 < v.co.x < x1 and y0 < v.co.y < y1], context="VERTS")
    bm.to_mesh(me); bm.free(); me.update()
    # grass stays but is cut down to short tufts around the lane so the ground is covered and the shoes stay readable
    me = O["GrassScatter"].data
    n_ = len(me.vertices)
    co = np.zeros(n_ * 3, np.float32); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    sc_ = np.zeros(n_ * 3, np.float32); me.attributes["scl"].data.foreach_get("vector", sc_); sc_ = sc_.reshape(-1, 3)
    m_ = (co[:, 0] > x0) & (co[:, 0] < x1) & (co[:, 1] > y0) & (co[:, 1] < y1)
    sc_[m_] *= 0.30
    # almost bare right under the walking lane (blades would pierce the shoes)
    ph_ = math.radians(FEET["phi"]); Dx, Dy = math.cos(ph_), math.sin(ph_)
    rx, ry = co[:, 0] - sx, co[:, 1] - sy
    along, lat = rx * Dx + ry * Dy, -rx * Dy + ry * Dx
    m2 = (along > -0.55) & (along < 0.9 + 0.55) & (np.abs(lat) < 0.30)
    sc_[m2 & m_] *= 0.35
    me.attributes["scl"].data.foreach_set("vector", sc_.ravel()); me.update()
    rng = np.random.default_rng(F["seed"])
    flowers = []
    n = F["nflower"]
    # denser close to the lane, thinning out to the sides / far ahead
    k = 0
    while len(flowers) < n:
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        lane = (x - (sx + 0.35)) ** 2 / 1.6 ** 2 + (y - (sy - 0.9)) ** 2 / 2.6 ** 2
        if rng.random() > math.exp(-lane * 0.9):
            continue
        var = int(rng.integers(0, 3))
        o = bpy.data.objects.new(f"HF_{k}", O[f"FlowerAsset{var}"].data)
        sc.collection.objects.link(o)
        s_ = rng.uniform(0.85, 1.4)
        o.rotation_mode = "QUATERNION"
        o.scale = (s_, s_, s_ * rng.uniform(0.9, 1.2))
        base = Vector((x, y, ground(x, y) - 0.02))
        o.location = base
        tilt = rng.normal(0, 0.15, 2)
        q0 = Quaternion((0, 0, 1), rng.uniform(0, 6.28)) @ Quaternion((1, 0, 0), tilt[0]) @ Quaternion((0, 1, 0), tilt[1])
        o["base"] = tuple(base); o["s"] = tuple(o.scale)
        flowers.append((o, base, q0))
        k += 1
    pet = []
    for i in range(24):
        o = bpy.data.objects.new(f"HP_{i}", O[f"PetalAsset{i % 2}"].data)
        sc.collection.objects.link(o)
        pet.append(o)
    FEET_STATE.update(flowers=flowers, petals=pet, rng=np.random.default_rng(99))


def feet_world(f, side, phi, S0):
    """world position of a foot's ankle / heel at heel strike for event bookkeeping (character-local -> world)."""
    th = math.radians(phi - 90.0)
    L = C.GAIT_L
    B = Vector((S0[0], S0[1], 0)) + Vector((math.cos(math.radians(phi)), math.sin(math.radians(phi)), 0)) * (L * f / 12.0)
    lx, ly = side * 0.066, 0.30 * L - 0.04
    return Vector((B.x + lx * math.cos(th) - ly * math.sin(th), B.y + lx * math.sin(th) + ly * math.cos(th), 0))


def prep_feet(name):
    sc.cycles_curves.shape = "THICK"
    feet_setup()
    F = FEET
    fi = int(name.split("_")[1])
    phi = F["phi"]
    th = math.radians(phi - 90.0)
    L = C.GAIT_L
    p = fi / 12.0
    S0 = F["S0"]
    D = Vector((math.cos(math.radians(phi)), math.sin(math.radians(phi)), 0))
    B = Vector((S0[0], S0[1], 0)) + D * (L * p)
    B.z = ground(B.x, B.y)
    wv = 0.18 * math.sin(2 * math.pi * p + 1.0)
    P = dict(wind=wv, lift=0.15 + 0.1 * math.sin(2 * math.pi * p), ph=0.9 + math.pi * p, view=0.0, gait_p=p, lower=True,
             sway=0.35 * math.cos(2 * math.pi * p + 0.6))
    root, objs = place_char("aiaru", P, (B.x, B.y, B.z), math.degrees(th))
    bpy.context.view_layer.update()
    feet = [o for o in objs if o.type == "EMPTY"]
    # camera travels with the body (planted foot stays planted in the world)
    off = Vector((0.16, -F["dist"], 0))
    cp = Vector((B.x + off.x, B.y + off.y, 0)); cp.z = ground(cp.x, cp.y) + F["cam_z"]
    if "CAM_FEET" in O:
        bpy.data.objects.remove(O["CAM_FEET"])
    if os.environ.get("FEET_DBG"):      # close look at the front foot (debug only)
        a0 = feet[0].matrix_world.translation
        cp = Vector((a0.x + 0.30, a0.y - 0.45, a0.z + 0.12))
        cam = make_cam("CAM_FEET", cp, (a0.x, a0.y, a0.z), 50, 8.0, (a0 - cp).length)
    else:
        cam = make_cam("CAM_FEET", cp, (B.x + 0.17, B.y, B.z + F["look_z"]), 50, 2.8, F["dist"] + 0.02)
    # flowers: bend away from the feet
    fp = []
    for e in feet:
        m = e.matrix_world
        a = m.translation.copy()
        d = (m.to_3x3() @ Vector((0, 1, 0))); d.z = 0; d.normalize()
        fp.append((a, d))
    for o, base, q0 in FEET_STATE["flowers"]:
        qq = q0.copy(); sc_ = Vector(o["s"]); hide = False
        for a, d in fp:
            heel = Vector((a.x, a.y, 0)) - d * 0.05
            t = max(0.0, min(1.0, (Vector((base.x, base.y, 0)) - heel).dot(d) / 0.24))
            c = heel + d * (0.24 * t)
            v = Vector((base.x - c.x, base.y - c.y, 0)); dd = v.length
            low = 1.0 - smooth_(0.10, 0.22, a.z - B.z)
            if dd < 0.028:
                hide = True
            infl = (1.0 - smooth_(0.05, 0.26, dd)) * (0.45 + 0.55 * low)
            if infl > 0 and dd > 1e-4:
                u = v / dd
                axis = Vector((-u.y, u.x, 0))
                qq = Quaternion(axis, 1.25 * infl) @ qq
        # keep a clear corridor between the lens and the feet (otherwise giant blurred heads hide the shoes)
        cxy = Vector((cp.x, cp.y, 0)); bxy = Vector((B.x, B.y, 0)); seg = bxy - cxy
        tt = max(0.0, min(1.0, (Vector((base.x, base.y, 0)) - cxy).dot(seg) / seg.length_squared))
        if (Vector((base.x, base.y, 0)) - (cxy + seg * tt)).length < 0.34 or (Vector((base.x, base.y, 0)) - cxy).length < 0.7:
            hide = True
        o.rotation_quaternion = qq
        o.scale = (0, 0, 0) if hide else sc_
    # petals lift on foot contact (events at frames -12,-6,0,6, alternating feet)
    pets = FEET_STATE["petals"]
    prng = np.random.default_rng(5)
    idx = 0
    for ev in (-12, -6, 0, 6):
        side = 1 if (ev // 6) % 2 == 0 else -1
        c0 = feet_world(ev, side, phi, S0)
        for j in range(4):
            o = pets[idx]; idx += 1
            r = np.random.default_rng(1000 + ev * 7 + j)
            tau = (fi - ev) / 24.0
            if tau < 0.04 or tau > 0.95:
                o.hide_render = True
                continue
            o.hide_render = False
            ang = r.uniform(0, 6.28); rad0 = r.uniform(0.11, 0.18)       # start well clear of the shoe
            vz, sp_ = r.uniform(0.35, 0.8), r.uniform(0.15, 0.35)
            pos = c0 + Vector((math.cos(ang) * (rad0 + sp_ * tau), math.sin(ang) * (rad0 + sp_ * tau), 0))
            pos.z = ground(pos.x, pos.y) + 0.05 + vz * tau - 0.8 * tau * tau
            o.location = pos
            sp = r.uniform(3, 7)
            o.rotation_euler = (r.uniform(0, 6.28) + sp * tau, r.uniform(0, 6.28) + sp * 0.6 * tau, r.uniform(0, 6.28))
            sz = r.uniform(0.28, 0.40)
            o.scale = (sz, sz, sz)
    for o in pets[idx:]:
        o.hide_render = True
    # light: faint cool lift on the shoes from the camera side so the white flats read against the backlight
    l1, c1 = char_light("FeetFill", (-0.35, -0.8, 0.45), 1.6, (0.62, 0.70, 1.0), 25.0, objs)
    return lambda: remove_all(objs + [root, l1], [c1])


smooth_ = lambda a, b, x: float(sm(a, b, x))
PREP = {"plate_ots_castle": prep_ots_castle, "plate_ots_tair": prep_ots_tair}
for _i in range(12):
    PREP[f"feet_{_i:02d}"] = prep_feet


# ----------------------------------------------------------------------------
# render
# ----------------------------------------------------------------------------
ALWAYS = set()
FLOWERISH = ["FlowerScatter", "GrassScatter", "FloatingPetals", "FG_Branch0", "FG_Branch1", "FG_LeavesL", "FG_LeavesR"] + \
            [o.name for o in bpy.data.objects if o.name.startswith("HeroFlower")]


def setup_visibility(layer, cam):
    for o in bpy.data.objects:
        if o.type == "MESH" and "Asset" not in o.name:
            o.hide_render = False
            o.is_holdout = False
    show = lambda names, v: [setattr(O[n], "hide_render", not v) for n in names if n in O]
    if layer is None:
        show(["MeadowMist"], cam in ("CAM_GARDEN", "CAM_HERO", "CAM_OTS_CASTLE", "CAM_OTS_TAIR"))
        show(["FloatingPetals"], cam == "CAM_MACRO")
        show(["GateMist"], cam == "CAM_GATE")
        if cam in ("CAM_OTS_CASTLE", "CAM_OTS_TAIR", "CAM_FEET"):      # nothing of the hero-lens foreground
            show(["FG_Branch0", "FG_Branch1", "FG_LeavesL", "FG_LeavesR"] + [o.name for o in bpy.data.objects if o.name.startswith("HeroFlower")], False)
        return
    show(["GateMist"], False)
    everything = [o.name for o in bpy.data.objects if o.type == "MESH" and "Asset" not in o.name]
    show(everything, False)
    if layer == "sky":
        show(["Moon", "MoonHalo"], True)
    elif layer == "castle":
        show(["Terrain", "Castle", "Foundation", "TreeScatter", "ValleyMist", "HazeBox"], True)
    elif layer == "fg":
        show(["Terrain"], True); O["Terrain"].is_holdout = True
        show(FLOWERISH + ["MeadowMist"], True)
        show(["FloatingPetals"], False)


def render(name):
    kind, cam, layer = SHOTS[name]
    path = os.path.join(OUT[kind], name + ".png")
    if os.path.exists(path) and not FORCE and not QUICK:
        print("SKIP", name, flush=True)
        return
    setup_visibility(layer, cam)
    cleanup = PREP[name](name) if name in PREP else None
    sc.camera = O[cam]
    W, H = (450, 630) if QUICK else (900, 1260)
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    cy.samples = 16 if QUICK else (36 if kind == "seq" else (40 if layer in ("sky",) else 56))
    cy.adaptive_threshold = 0.03 if QUICK else 0.02
    cy.volume_step_rate = 3.0
    cy.volume_max_steps = 96
    cy.use_denoising = True
    sc.render.film_transparent = layer is not None and layer != "sky"
    sc.render.use_compositing = layer in (None, "sky")
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA" if sc.render.film_transparent else "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"DONE {name} {time.time() - t:.0f}s", flush=True)
    if cleanup:
        cleanup()


if __name__ == "__main__":
    sc.render.compositor_device = "CPU"
    cy.device = "CPU"
    cy.use_adaptive_sampling = True
    cy.use_light_tree = True
    cy.denoiser = "OPENIMAGEDENOISE"
    sc.render.use_persistent_data = False
    fix_moon()
    fix_foundation()
    build_cameras()
    names = [a for a in sys.argv[1:] if not a.startswith("--") and a in SHOTS] or list(SHOTS)
    for n in names:
        render(n)
