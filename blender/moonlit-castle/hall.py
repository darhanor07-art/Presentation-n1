"""Gothic great hall at night (the castle INTERIOR, manhwa page 8), bpy 5.x, Cycles CPU.

  python hall.py [plate back fg door] [--quick] [--force] [--build-only]

Nave: pointed-arch windows with mullions and tracery in the left aisle wall (a moon sun lamp + volume haze make
the light shafts), stone columns, ribbed vault, polished dark floor with blue petals, a carpet runner, iron
candelabra / sconces (the only warm light: candle amber #FFCF8A) and, at the far end on three steps, a tall arched
mirror-door with a carved stone frame and a softly glowing lavender swirl.

Outputs (900x1260, 16-bit PNG):  plates/plate_hall.png (full), layers/hall_back.png (opaque, near columns and the
foreground candelabra hidden from the camera but still casting shadows), layers/hall_fg.png (RGBA, only those near
objects, everything else holdout), plates/plate_hall_door.png (low angle close to the door).
Existing outputs are skipped (--force to redo).  --quick = 450x630, 16 spp, into renders/spring/_preview/.
Saves hall.blend.  Does not import build_scene.py (helpers re-implemented / taken from nodeutil.py).
"""
import sys, os, math, time
import numpy as np
import bpy, bmesh
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nodeutil import *

HERE = os.path.dirname(os.path.abspath(__file__))
QUICK = "--quick" in sys.argv
FORCE = "--force" in sys.argv
BUILD_ONLY = "--build-only" in sys.argv
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
OUT = os.path.join(HERE, "hall.blend")
RS = os.path.join(HERE, "renders", "spring")
W, H = (450, 630) if QUICK else (900, 1260)
SPP = 16 if QUICK else int(os.environ.get("HALL_SPP", "56"))

# palette (linear)
INDIGO = (0.019, 0.023, 0.133)      # #262A66
VIOLET = (0.070, 0.072, 0.325)      # #4B4C9A
LAVENDER = (0.397, 0.381, 0.807)    # #A9A6E8
PERI = (0.275, 0.366, 1.0)          # #8FA3FF
MOON = (0.84, 0.81, 1.0)            # #ECE9FF
AMBER = (1.0, 0.624, 0.254)         # #FFCF8A  (the only warm colour)

# hall dimensions (m): nave along +Y, door wall at YD
XC, XW = 2.6, 5.2          # column axis / outer wall inner face
YB, YD = -3.5, 20.0
ZS = 8.9                   # vault spring
COLS_Y = (2.0, 7.5, 13.0)
WIN_Y = (-0.75, 4.75, 10.25, 16.5)
FG_COL_Y = 7.5

GROUP = {"name": "back"}
COLL = {}


def adopt(ob, group=None):
    g = group or GROUP["name"]
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    COLL[g].objects.link(ob)
    return ob


class MB:
    def __init__(self):
        self.v, self.f, self.m = [], [], []

    def vert(self, p):
        self.v.append((float(p[0]), float(p[1]), float(p[2])))
        return len(self.v) - 1

    def face(self, idx, mat=0):
        self.f.append(list(idx)); self.m.append(mat)

    def finish(self, name, mats, smooth=False, recalc=True, group=None):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.update()
        if recalc:
            bm = bmesh.new(); bm.from_mesh(me)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(me); bm.free()
        me.polygons.foreach_set("material_index", self.m)
        me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
        for m in mats:
            me.materials.append(m)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return adopt(ob, group)


def box(mb, cx, cy, z0, sx, sy, h, mat=0, rot=0.0):
    c, s = math.cos(rot), math.sin(rot)
    pts = []
    for z in (z0, z0 + h):
        for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            lx, ly = dx * sx / 2, dy * sy / 2
            pts.append(mb.vert((cx + lx * c - ly * s, cy + lx * s + ly * c, z)))
    b = pts
    for q in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        mb.face([b[i] for i in q], mat)


def lathe(mb, cx, cy, prof, sides=24, mat=0, cz=0.0, sc=1.0):
    rings = []
    for r, z in prof:
        rings.append([mb.vert((cx + r * sc * math.cos(2 * math.pi * i / sides), cy + r * sc * math.sin(2 * math.pi * i / sides), cz + z * sc))
                      for i in range(sides)])
    for k in range(len(rings) - 1):
        for i in range(sides):
            j = (i + 1) % sides
            mb.face((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]), mat)
    mb.face(rings[0][::-1], mat)
    mb.face(rings[-1], mat)


def tube(name, pts, radii, mat, sides=8):
    """round tube along a polyline (parallel-transport frames), capped; returns the object."""
    pts = [np.array(p, float) for p in pts]
    mb = MB()
    T0 = pts[1] - pts[0]; T0 /= np.linalg.norm(T0)
    ref = np.array([0, 1.0, 0]) if abs(T0[1]) < 0.9 else np.array([1.0, 0, 0])
    n1 = np.cross(T0, ref); n1 /= np.linalg.norm(n1)
    rings = []
    for k, p in enumerate(pts):
        T = pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]; T /= np.linalg.norm(T)
        n1 = n1 - T * n1.dot(T); n1 /= np.linalg.norm(n1)
        n2 = np.cross(T, n1)
        rings.append([mb.vert(p + radii[k] * (n1 * math.cos(2 * math.pi * a / sides) + n2 * math.sin(2 * math.pi * a / sides))) for a in range(sides)])
    for r in range(len(rings) - 1):
        for i in range(sides):
            j = (i + 1) % sides
            mb.face((rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]))
    mb.face(rings[0][::-1]); mb.face(rings[-1])
    return mb.finish(name, [mat], smooth=True)


def arch_poly(w, hs, m=7):
    """pointed arch outline (s, h) from bottom-left, ccw (as in build_scene.py)."""
    pts = [(-w / 2, 0.0), (w / 2, 0.0), (w / 2, hs)]
    for k in range(1, m + 1):
        a = math.radians(60.0 * k / m)
        pts.append((-w / 2 + w * math.cos(a), hs + w * math.sin(a)))
    for k in range(m - 1, 0, -1):
        a = math.radians(60.0 * k / m)
        pts.append((w / 2 - w * math.cos(a), hs + w * math.sin(a)))
    pts.append((-w / 2, hs))
    return pts


def arch_prism(mb, P, w, hs, d0, d1, mat=0):
    """solid pointed-arch prism; P(s, h, d) -> world xyz."""
    pts = arch_poly(w, hs)
    a = [mb.vert(P(s, h, d0)) for s, h in pts]
    b = [mb.vert(P(s, h, d1)) for s, h in pts]
    n = len(pts)
    mb.face(a, mat); mb.face(b[::-1], mat)
    for i in range(n):
        j = (i + 1) % n
        mb.face((a[i], a[j], b[j], b[i]), mat)


def arch_ring(mb, P, win, wout, d0, d1, mat=0):
    """ring (frame) between two pointed-arch outlines (w, hs): inner -> outer, depth d0..d1."""
    pi, po = arch_poly(*win), arch_poly(*wout)
    n = len(pi)
    ai = [mb.vert(P(s, h, d0)) for s, h in pi]; bi = [mb.vert(P(s, h, d1)) for s, h in pi]
    ao = [mb.vert(P(s, h, d0)) for s, h in po]; bo = [mb.vert(P(s, h, d1)) for s, h in po]
    for i in range(n):
        j = (i + 1) % n
        mb.face((ai[i], ai[j], ao[j], ao[i]), mat)       # front strip
        mb.face((bi[i], bo[i], bo[j], bi[j]), mat)       # back strip
        mb.face((ai[i], bi[i], bi[j], ai[j]), mat)       # inner reveal
        mb.face((ao[i], ao[j], bo[j], bo[i]), mat)       # outer side


# ----------------------------------------------------------------------------
# materials
# ----------------------------------------------------------------------------
def world_pos(nt):
    return sepxyz(nt, nd(nt, "ShaderNodeNewGeometry").outputs["Position"])


def mat_stone(name="HallStone", tint=1.0, rough=0.78, block=(1.15, 0.52)):
    m, nt = new_mat(name)
    ox, oy, oz = world_pos(nt)
    uv = combxyz(nt, mt(nt, "ADD", ox, oy), oz, 0.0)
    br = nd(nt, "ShaderNodeTexBrick")
    br.offset = 0.5; br.offset_frequency = 2
    br.inputs["Mortar Size"].default_value = 0.03
    br.inputs["Mortar Smooth"].default_value = 0.2
    br.inputs["Brick Width"].default_value = block[0]
    br.inputs["Row Height"].default_value = block[1]
    br.inputs["Color1"].default_value = (0.20 * tint, 0.20 * tint, 0.33 * tint, 1)
    br.inputs["Color2"].default_value = (0.13 * tint, 0.13 * tint, 0.25 * tint, 1)
    lk(nt, uv, br.inputs["Vector"])
    pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
    n1 = noise_tex(nt, pos, 0.8, 6)
    n2 = noise_tex(nt, pos, 14.0, 5, 0.6)
    col = mixc(nt, br.outputs["Color"], (0.05 * tint, 0.055 * tint, 0.13 * tint), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n1, 0.40), 1.6, clamp=True))
    col = mixc(nt, col, (0.30 * tint, 0.30 * tint, 0.45 * tint), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n2, 0.55), 1.2, clamp=True))
    hgt = mt(nt, "ADD", mt(nt, "MULTIPLY", br.outputs["Fac"], 0.7), mt(nt, "MULTIPLY", n2, 0.35))
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.05
    lk(nt, out_sock(hgt), bump.inputs["Height"])
    b = principled(nt, Base_Color=col, Roughness=rough)
    lk(nt, bump.outputs["Normal"], b.inputs["Normal"])
    mat_output(nt, b)
    return m


def mat_floor():
    m, nt = new_mat("PolishedFloor")
    ox, oy, oz = world_pos(nt)
    uv = combxyz(nt, ox, oy, 0.0)
    br = nd(nt, "ShaderNodeTexBrick")
    br.offset = 0.0
    br.inputs["Mortar Size"].default_value = 0.02
    br.inputs["Mortar Smooth"].default_value = 0.1
    br.inputs["Brick Width"].default_value = 1.3
    br.inputs["Row Height"].default_value = 1.3
    br.inputs["Color1"].default_value = (0.030, 0.034, 0.090, 1)
    br.inputs["Color2"].default_value = (0.016, 0.018, 0.060, 1)
    lk(nt, uv, br.inputs["Vector"])
    pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
    n1 = noise_tex(nt, pos, 1.2, 6)
    n2 = noise_tex(nt, pos, 9.0, 4)
    col = mixc(nt, br.outputs["Color"], (0.07, 0.07, 0.19), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n1, 0.45), 1.3, clamp=True))
    rough = mt(nt, "ADD", 0.11, mt(nt, "MULTIPLY", n2, 0.16))
    rough = mt(nt, "ADD", rough, mt(nt, "MULTIPLY", br.outputs["Fac"], 0.5))   # grout is matte
    b = principled(nt, Base_Color=col, Roughness=rough)
    b.inputs["Specular IOR Level"].default_value = 0.8
    b.inputs["Coat Weight"].default_value = 0.35
    b.inputs["Coat Roughness"].default_value = 0.05
    mat_output(nt, b)
    return m


def mat_carpet():
    m, nt = new_mat("Carpet")
    ox, oy, oz = world_pos(nt)
    sx = mt(nt, "ABSOLUTE", ox)
    pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
    nz = noise_tex(nt, pos, 60.0, 3)
    stripe = ramp(nt, sx, [(0.0, (0.03, 0.03, 0.15)), (0.60, (0.03, 0.03, 0.15)), (0.62, (0.20, 0.21, 0.58)),
                           (0.70, (0.20, 0.21, 0.58)), (0.72, (0.03, 0.03, 0.12)), (0.76, (0.03, 0.03, 0.12)),
                           (0.78, (0.07, 0.07, 0.30)), (1.0, (0.07, 0.07, 0.30))], interp="CONSTANT")
    # ramp positions are on |x|: scale x so that 0.85 m -> 1.0
    col = mixc(nt, stripe, (0.01, 0.01, 0.05), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", nz, 0.4), 1.0, clamp=True))
    b = principled(nt, Base_Color=col, Roughness=0.92)
    b.inputs["Sheen Weight"].default_value = 0.5
    mat_output(nt, b)
    # remap |x| so that 0..0.85 m -> 0..1
    for n in nt.nodes:
        if n.bl_idname == "ShaderNodeMath" and n.operation == "ABSOLUTE":
            d = nd(nt, "ShaderNodeMath", operation="DIVIDE")
            d.inputs[1].default_value = 0.85
            lk(nt, n.outputs[0], d.inputs[0])
            for l in list(nt.links):
                if l.from_node == n and l.to_node != d:
                    nt.links.new(d.outputs[0], l.to_socket)
    return m


def mat_iron():
    m, nt = new_mat("Iron")
    b = principled(nt, Base_Color=(0.025, 0.027, 0.045), Roughness=0.42, Metallic=0.85)
    mat_output(nt, b)
    return m


def mat_wax():
    m, nt = new_mat("Wax")
    b = principled(nt, Base_Color=(0.55, 0.53, 0.68), Roughness=0.5)
    b.inputs["Emission Color"].default_value = (*PERI, 1)
    b.inputs["Emission Strength"].default_value = 0.05
    mat_output(nt, b)
    return m


def mat_flame():
    m, nt = new_mat("Flame")
    e = nd(nt, "ShaderNodeEmission")
    e.inputs["Color"].default_value = (*AMBER, 1)
    e.inputs["Strength"].default_value = 60.0
    mat_output(nt, e)
    return m


def mat_petal():
    m, nt = new_mat("BluePetal")
    pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
    n = noise_tex(nt, pos, 70.0, 1)
    col = ramp(nt, n, [(0.30, VIOLET), (0.5, PERI), (0.70, LAVENDER)])
    b = principled(nt, Base_Color=col, Roughness=0.4)
    lk(nt, out_sock(col), b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 0.10
    b.inputs["Subsurface Weight"].default_value = 0.3 if "Subsurface Weight" in b.inputs else 0
    mat_output(nt, b)
    return m


def mat_mirror():
    m, nt = new_mat("MirrorDoor")
    obj = texcoord(nt, "Object")
    n1 = noise_tex(nt, obj, 1.1, 5, 0.55, distortion=2.5)
    wv = nd(nt, "ShaderNodeTexWave", wave_type="RINGS", rings_direction="SPHERICAL", wave_profile="SIN")
    wv.inputs["Scale"].default_value = 1.1
    wv.inputs["Distortion"].default_value = 14.0
    wv.inputs["Detail"].default_value = 2.0
    wv.inputs["Detail Scale"].default_value = 1.0
    wv.inputs["Detail Roughness"].default_value = 0.6
    lk(nt, obj, wv.inputs["Vector"])
    pat = mt(nt, "ADD", mt(nt, "MULTIPLY", n1, 0.8), mt(nt, "MULTIPLY", wv.outputs["Fac"], 0.25))
    col = ramp(nt, pat, [(0.15, (0.20, 0.21, 0.58)), (0.5, LAVENDER), (0.85, MOON)])
    ox, oy, oz = sepxyz(nt, obj)
    # soft vignette towards the rim, brighter in the middle/upper part
    r = mt(nt, "SQRT", mt(nt, "ADD", mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", ox, ox), 0.45), mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", oz, oz), 0.05)))
    vig = mt(nt, "SUBTRACT", 1.15, mt(nt, "MULTIPLY", r, 0.45), clamp=True)
    e = nd(nt, "ShaderNodeEmission")
    lk(nt, out_sock(col), e.inputs["Color"])
    lk(nt, out_sock(mt(nt, "MULTIPLY", vig, mt(nt, "ADD", 1.1, mt(nt, "MULTIPLY", n1, 1.0)))), e.inputs["Strength"])
    mat_output(nt, e)
    return m


def mat_haze():
    m, nt = new_mat("HazeVolume")
    v = nd(nt, "ShaderNodeVolumePrincipled")
    v.inputs["Color"].default_value = (0.78, 0.80, 1.0, 1)
    v.inputs["Density"].default_value = float(os.environ.get("HALL_DENSITY", "0.04"))
    v.inputs["Anisotropy"].default_value = 0.55
    o = nd(nt, "ShaderNodeOutputMaterial")
    lk(nt, v.outputs["Volume"], o.inputs["Volume"])
    return m


# ----------------------------------------------------------------------------
# geometry
# ----------------------------------------------------------------------------
def build_shell(M):
    L = XW + 0.7
    # floor and end walls
    mb = MB(); box(mb, 0, (YB + YD) / 2 + 0.5, -0.4, 2 * L, YD - YB + 2, 0.4); mb.finish("Floor", [M["floor"]])
    mb = MB()
    box(mb, 0, YD + 0.5, 0, 2 * L, 1.0, 14.5)
    box(mb, 0, YB - 0.5, 0, 2 * L, 1.0, 14.5)
    box(mb, XW + 0.35, (YB + YD) / 2, 0, 0.7, YD - YB, 9.3)             # right wall
    mb.finish("Walls", [M["stone"]])
    # left wall with window openings (boolean)
    mb = MB(); box(mb, -XW - 0.35, (YB + YD) / 2, 0, 0.7, YD - YB, 9.3); wall = mb.finish("LeftWall", [M["stone"]])
    cut = MB()
    WZ, WW, WHS = 2.4, 1.9, 3.7
    for yc in WIN_Y:
        arch_prism(cut, lambda s, h, d, yc=yc: (-XW + d, yc + s, WZ + h), WW, WHS, -1.2, 0.2)
    co = cut.finish("Cutter", [M["stone"]])
    bm_ = wall.modifiers.new("Bool", "BOOLEAN"); bm_.operation = "DIFFERENCE"; bm_.object = co; bm_.solver = "EXACT"
    with bpy.context.temp_override(object=wall, active_object=wall, selected_objects=[wall]):
        bpy.ops.object.modifier_apply(modifier="Bool")
    bpy.data.objects.remove(co)
    # window frames, mullions, tracery  (left) and blind arcade (right)
    mb = MB(); mdark = MB()
    for yc in WIN_Y:
        PL = lambda s, h, d, yc=yc: (-XW + d, yc + s, WZ + h)
        arch_ring(mb, PL, (WW, WHS), (WW + 0.55, WHS + 0.12), -0.02, 0.16)
        arch_ring(mb, PL, (WW + 0.55, WHS + 0.12), (WW + 0.80, WHS + 0.18), -0.02, 0.07)
        # sill
        box(mb, -XW + 0.12, yc, WZ - 0.1, 0.5, WW + 1.0, 0.12)
        # mullions: two vertical + a centre one, with a ring in the apex
        box(mb, -XW - 0.2, yc, WZ, 0.14, 0.11, WHS + 0.6, 0)
        PR = lambda s, h, d, yc=yc: (XW - d, yc + s, 0.0 + h)
        arch_ring(mb, PR, (WW, WHS - 0.2), (WW + 0.55, WHS - 0.08), -0.02, 0.14)
        # blind arch back panel (right wall), slightly darker
        arch_prism(mdark, PR, WW, WHS - 0.2, -0.02, 0.03)
    mb.finish("WindowFrames", [M["stone"]])
    mdark.finish("BlindArches", [M["stone_dark"]])
    # tracery rings (torus) at each window apex
    for yc in WIN_Y:
        z = WZ + WHS + 0.62 * WW
        bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.05, major_segments=28, minor_segments=8,
                                         location=(-XW - 0.18, yc, z), rotation=(0, math.radians(90), 0))
        adopt(bpy.context.object).data.materials.append(M["stone"])
        for dy in (-0.33, 0.33):
            bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.04, major_segments=20, minor_segments=8,
                                             location=(-XW - 0.18, yc + dy, WZ + WHS + 0.18 * WW), rotation=(0, math.radians(90), 0))
            adopt(bpy.context.object).data.materials.append(M["stone"])
        mb = MB()
        for dy in (-0.33, 0.33):
            box(mb, -XW - 0.18, yc + dy, WZ, 0.10, 0.08, WHS + 0.2)
        box(mb, -XW - 0.18, yc, WZ + WHS * 0.5, 0.10, WW + 0.1, 0.09)
        mb.finish("Mullions", [M["stone"]])


def build_ceiling(M):
    a, h = XC, 3.9
    R = (a * a + h * h) / (2 * a)
    # explicit: left half centre at (+(R - a), 0), right half centre at (-(R - a), 0)
    def zz(x):
        c = -(R - a) if x >= 0 else (R - a)
        return math.sqrt(max(R * R - (x - c) ** 2, 0.0))
    xs = np.linspace(-a, a, 25)
    ys = np.linspace(YB, YD, 2)
    mb = MB()
    rows = [[mb.vert((x, y, ZS + zz(x))) for x in xs] for y in ys]
    for i in range(len(xs) - 1):
        mb.face((rows[0][i], rows[1][i], rows[1][i + 1], rows[0][i + 1]))
    mb.finish("NaveVault", [M["stone_dark"]], recalc=False)
    mb = MB()
    for s in (-1, 1):
        box(mb, s * XC, (YB + YD) / 2, ZS - 0.65, 0.7, YD - YB, 0.65)                       # arcade beam
        box(mb, s * (XC + XW) / 2, (YB + YD) / 2, ZS, XW - XC, YD - YB, 0.4)                # aisle ceiling slab
        for y in COLS_Y + (YD - 0.3,):
            box(mb, s * (XC + XW) / 2, y, ZS - 0.28, XW - XC, 0.4, 0.28)                    # aisle rib
    mb.finish("AisleCeil", [M["stone_dark"]])
    # ribs: transverse arches, diagonals (groin ribs), ridge
    def rib(pts, name, r=0.13):
        tube(name, pts, [r] * len(pts), M["stone"], sides=6)
    xs2 = np.linspace(-a, a, 21)
    for y in COLS_Y + (YD - 0.15,):
        rib([(x, y, ZS + zz(x) - 0.06) for x in xs2], "Rib")
    bays = list(COLS_Y) + [YD]
    for y0, y1 in zip(bays[:-1], bays[1:]):
        for sgn in (1, -1):
            pts = []
            for t in np.linspace(0, 1, 21):
                x = sgn * (-a + 2 * a * t)
                pts.append((x, y0 + (y1 - y0) * t, ZS + zz(x) - 0.03))
            rib(pts, "Groin", 0.11)
        # bosses
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, segments=14, ring_count=8, location=((0), (y0 + y1) / 2, ZS + h - 0.1))
        o = adopt(bpy.context.object); o.data.materials.append(M["stone"])
    rib([(0, y, ZS + h - 0.04) for y in np.linspace(YB, YD, 12)], "Ridge", 0.1)


def build_columns(M):
    prof = [(0.62, 0.0), (0.62, 0.22), (0.50, 0.30), (0.44, 0.45), (0.40, 0.75), (0.39, 4.5), (0.40, ZS - 1.4), (0.43, ZS - 1.0),
            (0.44, ZS - 0.82), (0.56, ZS - 0.72), (0.62, ZS - 0.55), (0.66, ZS - 0.28), (0.70, ZS - 0.22), (0.70, ZS)]
    for y in COLS_Y:
        for s in (-1, 1):
            GROUP["name"] = "fg" if (abs(y - FG_COL_Y) < 0.1) else "back"
            mb = MB(); lathe(mb, s * XC, y, prof, sides=28)
            mb.finish("Column", [M["stone"]], smooth=True)
    GROUP["name"] = "back"


def build_door(M):
    z0 = 0.54
    cx = 0.0
    PD = lambda s, h, d: (cx + s, YD - d, z0 + h)
    # steps
    mb = MB()
    for k, (yy, zz_) in enumerate(((17.4, 0.18), (18.2, 0.36), (19.0, 0.54))):
        box(mb, 0, (yy + YD) / 2, 0, 4.6, YD - yy, zz_)
    mb.finish("Steps", [M["stone"]])
    # frame: stepped archivolts
    DW, DH = 3.0, 3.6
    mb = MB()
    arch_ring(mb, PD, (DW, DH), (DW + 0.45, DH + 0.1), -0.02, 0.35)
    arch_ring(mb, PD, (DW + 0.45, DH + 0.1), (DW + 0.95, DH + 0.2), -0.02, 0.22)
    arch_ring(mb, PD, (DW + 0.95, DH + 0.2), (DW + 1.45, DH + 0.3), -0.02, 0.10)
    mb.finish("DoorFrame", [M["stone_dark"]])
    # reveal columns (colonettes), carved bands
    mb = MB()
    for s in (-1, 1):
        lathe(mb, s * (DW / 2 + 0.22), YD - 0.42, [(0.11, z0), (0.11, z0 + 0.15), (0.08, z0 + 0.2), (0.075, z0 + DH - 0.2), (0.11, z0 + DH - 0.1), (0.11, z0 + DH)], sides=12)
    mb.finish("Colonettes", [M["stone"]], smooth=True)
    # crocket-like finials along the outer archivolt
    pts = arch_poly(DW + 1.45, DH + 0.3)
    mb = MB()
    for i, (s, h) in enumerate(pts[3:-1:2]):
        c = PD(s * 1.0, h + 0.08, 0.05)
        box(mb, c[0], c[1] - 0.04, c[2], 0.14, 0.14, 0.2, rot=0.5)
    mb.finish("Crockets", [M["stone"]])
    # mirror pane
    mbm = MB()
    arch_prism(mbm, lambda s, h, d: (cx + s, YD - d, z0 + h), DW, DH, 0.02, 0.06)
    pane = mbm.finish("MirrorPane", [M["mirror"]], recalc=True)
    # object-space origin at the pane centre for the swirl texture
    mv = Vector((0, YD - 0.04, z0 + 3.0))
    pane.data.transform(__import__("mathutils").Matrix.Translation(-mv))
    pane.location = mv
    # soft light spilling from the mirror
    ld = bpy.data.lights.new("MirrorGlow", "AREA"); ld.shape = "RECTANGLE"; ld.size = 3.0; ld.size_y = 5.5
    ld.color = LAVENDER; ld.energy = float(os.environ.get("HALL_MIRROR_W", "220")); ld.spread = math.radians(160)
    lo = bpy.data.objects.new("MirrorGlow", ld); lo.location = (0, YD - 0.5, z0 + 3.0)
    lo.rotation_euler = (math.radians(-90), 0, 0)
    lo.visible_camera = False
    bpy.context.scene.collection.objects.link(lo)


def flame_light(name, p, watts, r=0.05):
    ld = bpy.data.lights.new(name, "POINT"); ld.color = AMBER; ld.energy = watts; ld.shadow_soft_size = r
    lo = bpy.data.objects.new(name, ld); lo.location = p
    bpy.context.scene.collection.objects.link(lo)


FLAME_PROF = [(1e-4, 0.0), (0.45, 0.15), (0.60, 0.40), (0.42, 0.72), (0.18, 1.0), (1e-4, 1.35)]


def candle(mbw, mbf, x, y, z, cup=True, h=0.17):
    lathe(mbw, x, y, [(0.021, z), (0.021, z + h)], sides=10)
    lathe(mbf, x, y, FLAME_PROF, sides=10, cz=z + h + 0.004, sc=0.032)


def candelabra(M, x, y, s=1.0, watts=90.0, rot=0.0):
    mbi, mbw, mbf = MB(), MB(), MB()
    lathe(mbi, x, y, [(0.27 * s, 0), (0.27 * s, 0.03 * s), (0.14 * s, 0.07 * s), (0.06 * s, 0.14 * s), (0.032 * s, 0.30 * s), (0.032 * s, 0.62 * s),
                      (0.065 * s, 0.68 * s), (0.032 * s, 0.76 * s), (0.032 * s, 1.18 * s), (0.07 * s, 1.24 * s), (0.032 * s, 1.30 * s)], sides=16)
    top = 1.30 * s
    lathe(mbi, x, y, [(1e-4, top), (0.05 * s, top + 0.0), (0.05 * s, top + 0.03 * s), (0.02 * s, top + 0.03 * s), (1e-4, top + 0.03 * s)], sides=12)
    candle(mbw, mbf, x, y, top + 0.03 * s, h=0.20 * s)
    for k in range(4):
        ang = rot + k * math.pi / 2
        ca, sa = math.cos(ang), math.sin(ang)
        pts, rad = [], []
        for t in np.linspace(0, 1, 9):
            rr = 0.30 * s * math.sin(t * math.pi / 2)
            zz = 1.12 * s + 0.30 * s * (1 - math.cos(t * math.pi / 2)) * 0.9 + 0.02 * s * t
            pts.append((x + ca * rr, y + sa * rr, zz)); rad.append(0.013 * s)
        tube("Arm", pts, rad, M["iron"], sides=6)
        ex, ey, ez = pts[-1]
        lathe(mbi, ex, ey, [(1e-4, ez), (0.04 * s, ez), (0.04 * s, ez + 0.03 * s), (0.018 * s, ez + 0.03 * s), (1e-4, ez + 0.03 * s)], sides=10)
        candle(mbw, mbf, ex, ey, ez + 0.03 * s, h=0.16 * s)
    mbi.finish("CandelabraIron", [M["iron"]], smooth=True)
    mbw.finish("CandleWax", [M["wax"]], smooth=True)
    mbf.finish("CandleFlames", [M["flame"]], smooth=True)
    flame_light("CandleLight", (x, y, top + 0.45 * s), watts)


def sconce(M, y, z, side=1, watts=40.0):
    x = side * XW
    mbi, mbw, mbf = MB(), MB(), MB()
    box(mbi, x - side * 0.02, y, z - 0.14, 0.04, 0.14, 0.34)
    box(mbi, x - side * 0.13, y, z - 0.10, 0.26, 0.04, 0.04)
    cx = x - side * 0.26
    lathe(mbi, cx, y, [(1e-4, z - 0.10), (0.05, z - 0.10), (0.05, z - 0.07), (0.02, z - 0.07), (1e-4, z - 0.07)], sides=10)
    candle(mbw, mbf, cx, y, z - 0.07, h=0.19)
    mbi.finish("SconceIron", [M["iron"]]); mbw.finish("SconceWax", [M["wax"]], smooth=True); mbf.finish("SconceFlame", [M["flame"]], smooth=True)
    flame_light("SconceLight", (cx, y, z + 0.18), watts, 0.04)


def build_carpet(M):
    mb = MB()
    box(mb, 0, (YB + 17.4) / 2, 0.0, 1.7, 17.4 - YB, 0.025)
    for yy, zz_ in ((17.4, 0.18), (18.2, 0.36), (19.0, 0.54)):
        box(mb, 0, yy + 0.4, zz_, 1.7, 0.8, 0.025)
    mb.finish("Carpet", [M["carpet"]])


def build_petals(M, n=2600):
    rnd = np.random.default_rng(8)
    # clusters: along the carpet, in the light patches, uniform sprinkle, more near the camera
    xs = np.concatenate([rnd.normal(0, 1.1, int(n * 0.45)), rnd.uniform(-XC - 1.2, XC + 1.2, int(n * 0.40)), rnd.normal(0.8, 0.6, int(n * 0.15))])
    ys = np.concatenate([YB + 3 + rnd.beta(1.1, 1.8, len(xs)) * 21])
    ys = np.clip(ys, -1.5, 17.1)
    z = np.where(np.abs(xs) < 0.85, 0.03, 0.006)
    N = len(xs)
    L = rnd.uniform(0.055, 0.095, N); Wd = L * rnd.uniform(0.40, 0.55, N)
    yaw = rnd.uniform(0, 2 * np.pi, N); pitch = rnd.normal(0, 0.12, N); roll = rnd.normal(0, 0.12, N)
    nu, nv = 4, 3
    u = np.linspace(0, 1, nu); v = np.linspace(-1, 1, nv)
    U, V = np.meshgrid(u, v, indexing="ij")
    prof = np.sin(np.pi * np.clip(U, 0, 1) ** 0.75) * 0.9 + 0.12
    lx = (U - 0.5)[None] * L[:, None, None]
    ly = (V * prof)[None] * (Wd / 2)[:, None, None] * 2 * 0.5
    lz = (0.4 * (V ** 2) * Wd[:, None, None] * 0.6 + 0.35 * (U ** 2) * L[:, None, None]) + 0.002
    P = np.stack([lx, ly, lz], -1)
    cy, sy = np.cos(yaw), np.sin(yaw); cp, sp = np.cos(pitch), np.sin(pitch); cr, sr = np.cos(roll), np.sin(roll)
    R = np.zeros((N, 3, 3))
    Rz = np.stack([np.stack([cy, -sy, 0 * cy], -1), np.stack([sy, cy, 0 * cy], -1), np.stack([0 * cy, 0 * cy, 1 + 0 * cy], -1)], 1)
    Ry = np.stack([np.stack([cp, 0 * cp, sp], -1), np.stack([0 * cp, 1 + 0 * cp, 0 * cp], -1), np.stack([-sp, 0 * cp, cp], -1)], 1)
    Rx = np.stack([np.stack([1 + 0 * cr, 0 * cr, 0 * cr], -1), np.stack([0 * cr, cr, -sr], -1), np.stack([0 * cr, sr, cr], -1)], 1)
    R = Rz @ Ry @ Rx
    Pw = np.einsum("nij,nabj->nabi", R, P) + np.stack([xs, ys, z], -1)[:, None, None, :]
    verts = Pw.reshape(-1, 3)
    faces = []
    for k in range(N):
        b = k * nu * nv
        for i in range(nu - 1):
            for j in range(nv - 1):
                faces.append((b + i * nv + j, b + (i + 1) * nv + j, b + (i + 1) * nv + j + 1, b + i * nv + j + 1))
    me = bpy.data.meshes.new("Petals"); me.from_pydata(verts.tolist(), [], faces); me.update()
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.materials.append(M["petal"])
    ob = bpy.data.objects.new("Petals", me); bpy.context.scene.collection.objects.link(ob)
    adopt(ob)


def build_volume(M):
    mb = MB(); box(mb, 0, (YB + YD) / 2, 0.02, 2 * XW - 0.3, YD - YB - 0.2, 13.5)
    vol = mb.finish("Haze", [M["haze"]])
    vol.visible_shadow = False
    return vol


def build_lights():
    sc = bpy.context.scene
    d = Vector((0.78, -0.22, -0.60)).normalized()      # direction the moonlight travels (from upper-left, beyond the door)
    ld = bpy.data.lights.new("Moon", "SUN"); ld.energy = float(os.environ.get("HALL_MOON", "22.0")); ld.color = MOON; ld.angle = math.radians(1.0)
    lo = bpy.data.objects.new("Moon", ld); lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(lo)
    # faint cool fill hidden in the vault
    la = bpy.data.lights.new("VaultFill", "AREA"); la.shape = "RECTANGLE"; la.size = 3.5; la.size_y = 20.0
    la.color = PERI; la.energy = float(os.environ.get("HALL_FILL", "70"))
    lf = bpy.data.objects.new("VaultFill", la); lf.location = (0, 9, 11.4); lf.visible_camera = False
    sc.collection.objects.link(lf)
    # world: moonlit indigo sky seen through the windows
    w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.05, 0.065, 0.26, 1); bg.inputs["Strength"].default_value = 1.2


def build_cameras():
    sc = bpy.context.scene
    cd = bpy.data.cameras.new("CAM_HALL"); cd.lens = 28.0; cd.clip_start = 0.05; cd.clip_end = 80
    co = bpy.data.objects.new("CAM_HALL", cd); co.location = (0.0, -1.0, 1.6); co.rotation_euler = (math.radians(90), 0, 0)
    sc.collection.objects.link(co)
    cd2 = bpy.data.cameras.new("CAM_HALL_DOOR"); cd2.lens = 28.0; cd2.clip_start = 0.05; cd2.clip_end = 80
    c2 = bpy.data.objects.new("CAM_HALL_DOOR", cd2); c2.location = (1.0, 12.2, 0.7)
    c2.rotation_euler = (Vector((0.0, YD, 3.4)) - c2.location).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(c2)
    return co, c2


def setup_render(sc):
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = SPP
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.03
    cy.adaptive_min_samples = 12
    cy.use_light_tree = True
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    cy.max_bounces = 7; cy.diffuse_bounces = 4; cy.glossy_bounces = 4
    cy.transmission_bounces = 2; cy.volume_bounces = 1; cy.transparent_max_bounces = 4
    cy.caustics_reflective = False; cy.caustics_refractive = False
    cy.sample_clamp_indirect = 6.0
    cy.volume_step_rate = 1.5
    cy.volume_max_steps = 192
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"
    sc.render.use_persistent_data = True
    sc.render.compositor_device = "CPU"
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    sc.view_settings.exposure = float(os.environ.get("HALL_EXPOSURE", "0.0"))


def setup_compositor(sc):
    ng = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    sc.compositing_node_group = ng
    rl = ng.nodes.new("CompositorNodeRLayers")
    gl = ng.nodes.new("CompositorNodeGlare")
    gl.inputs["Type"].default_value = "Fog Glow"
    gl.inputs["Threshold"].default_value = 1.0
    gl.inputs["Strength"].default_value = 0.5
    if "Size" in gl.inputs:
        gl.inputs["Size"].default_value = 0.65
    go = ng.nodes.new("NodeGroupOutput")
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"])
    ng.links.new(gl.outputs["Image"], go.inputs[0])


# ----------------------------------------------------------------------------
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    for g in ("back", "fg"):
        c = bpy.data.collections.new(g.upper()); sc.collection.children.link(c); COLL[g] = c
    GROUP["name"] = "back"
    M = dict(stone=mat_stone(), stone_dark=mat_stone("HallStoneDark", 0.65), floor=mat_floor(), carpet=mat_carpet(), iron=mat_iron(),
             wax=mat_wax(), flame=mat_flame(), petal=mat_petal(), mirror=mat_mirror(), haze=mat_haze())
    build_shell(M); build_ceiling(M); build_columns(M); build_door(M); build_carpet(M); build_petals(M)
    # candle light: foreground candelabra (fg layer), mid-ground and by the steps, wall sconces on the right wall
    GROUP["name"] = "fg"; candelabra(M, 1.45, 3.4, 1.0, 70.0, rot=0.3)
    GROUP["name"] = "back"
    candelabra(M, -1.35, 10.8, 1.15, 70.0, rot=0.9)
    candelabra(M, 1.7, 15.3, 1.2, 60.0, rot=0.1)
    candelabra(M, -2.05, 17.1, 1.2, 60.0, rot=0.6)
    candelabra(M, 2.05, 17.1, 1.2, 60.0, rot=0.4)
    for y in (4.75, 10.25, 16.5):
        sconce(M, y, 3.1, side=1)
    vol = build_volume(M)
    build_lights()
    cam, cam2 = build_cameras()
    setup_render(sc); setup_compositor(sc)
    sc.camera = cam
    return sc, vol, cam, cam2


def set_mode(sc, vol, mode):
    sc.render.film_transparent = mode in ("fg", "fgvol")
    sc.render.use_compositing = mode not in ("fg", "fgvol")
    vol.hide_render = mode == "fg"
    for o in COLL["fg"].objects:
        o.visible_camera = mode != "back"
        o.is_holdout = False
    for o in COLL["back"].objects:
        o.is_holdout = mode in ("fg", "fgvol")


JOBS = {
    "plate": ("plates", "plate_hall", "plate", "cam"),
    "back": ("layers", "hall_back", "back", "cam"),
    "fg": ("layers", "hall_fg", "fg", "cam"),
    "fgvol": ("_preview", "hall_fg_vol", "fgvol", "cam"),       # same as fg but with the haze (colour source for hall_fg)
    "door": ("plates", "plate_hall_door", "plate", "cam2"),
}


def main():
    t0 = time.time()
    sc, vol, cam, cam2 = build()
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    print("built + saved in %.1fs" % (time.time() - t0), flush=True)
    if BUILD_ONLY:
        return
    for name in (ARGS or ["plate", "back", "fg"]):
        sub, fname, mode, camname = JOBS[name]
        d = os.path.join(RS, "_preview") if (QUICK or sub == "_preview") else os.path.join(RS, sub)
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, fname + ".png")
        if os.path.exists(path) and not FORCE:
            print("skip", path, flush=True); continue
        set_mode(sc, vol, mode)
        sc.camera = cam if camname == "cam" else cam2
        sc.render.filepath = path
        t = time.time()
        bpy.ops.render.render(write_still=True)
        print("RENDERED %s in %.1fs" % (path, time.time() - t), flush=True)


def combine_fg():
    """hall_fg.png = haze-lit colour (fgvol: haze in front of the near objects) + the clean alpha of the no-haze fg pass
    (renders/spring/_preview/hall_fg_alpha.png).  bpy's python has no Pillow, so the merge runs in the system python3."""
    import subprocess
    code = (
        "from PIL import Image\n"
        "import sys\n"
        "a,v,o=sys.argv[1:4]\n"
        "A=Image.open(a).convert('RGBA');V=Image.open(v).convert('RGB');V.putalpha(A.getchannel('A'));V.save(o)\n")
    P = lambda *x: os.path.join(RS, *x)
    subprocess.run(["python3", "-c", code, P("_preview", "hall_fg_alpha.png"), P("_preview", "hall_fg_vol.png"), P("layers", "hall_fg.png")], check=True)
    print("combined -> layers/hall_fg.png", flush=True)


if "combine" in ARGS:
    combine_fg()
else:
    main()
