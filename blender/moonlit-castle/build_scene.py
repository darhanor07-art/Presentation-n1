"""Moonlit Gothic castle - procedural Blender scene (bpy 5.x, Cycles).

Run:  python build_scene.py [--out moonlit_castle.blend]
Everything is generated from scratch with fixed seeds (deterministic).
Units: metres. Camera looks along +Y, +Z is up, +X is right.
"""
import sys, math, os
import numpy as np
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "moonlit_castle.blend")
if "--out" in sys.argv:
    OUT = sys.argv[sys.argv.index("--out") + 1]

# ----------------------------------------------------------------------------
# global layout constants
# ----------------------------------------------------------------------------
CX, CY = 28.0, 330.0                 # castle centre (x right, y away from camera)
MOON_AZ, MOON_EL = math.radians(-12.0), math.radians(27.0)
MOON_DIST, MOON_R = 4200.0, 4200.0 * math.tan(math.radians(2.6))
CAM_Z = 0.95

rng_global = np.random.default_rng(12345)

# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.node_groups):
        for b in list(blk):
            blk.remove(b)


def smooth(e0, e1, x):
    t = np.clip((np.asarray(x, float) - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


class Noise:
    def __init__(self, seed):
        r = np.random.default_rng(seed)
        self.lat = r.random((256, 256))

    def __call__(self, x, y):
        x = np.asarray(x, float); y = np.asarray(y, float)
        xi = np.floor(x).astype(np.int64); yi = np.floor(y).astype(np.int64)
        fx = x - xi; fy = y - yi
        u = fx * fx * (3 - 2 * fx); v = fy * fy * (3 - 2 * fy)
        L = self.lat
        a = L[yi & 255, xi & 255]; b = L[yi & 255, (xi + 1) & 255]
        c = L[(yi + 1) & 255, xi & 255]; d = L[(yi + 1) & 255, (xi + 1) & 255]
        return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v

    def fbm(self, x, y, octaves=4):
        s, amp, tot, f = 0.0, 1.0, 0.0, 1.0
        for o in range(octaves):
            s = s + amp * self(x * f + 17.3 * o, y * f - 9.1 * o)
            tot += amp; amp *= 0.5; f *= 2.03
        return s / tot


NZ = [Noise(s) for s in (1, 2, 3, 4, 5, 6, 7, 8)]

# ----------------------------------------------------------------------------
# terrain height function
# ----------------------------------------------------------------------------
def terrain_h(x, y):
    d_cam = np.hypot(x, y)
    rc = np.hypot((x - CX) * 0.85, y - CY)
    plateau = 1 - smooth(70, 115, rc)                   # 1 on flat castle top
    rise = 31.0 * (1 - smooth(75, 270, rc))
    valley = -6.5 * np.exp(-((y - 150.0) / 55.0) ** 2) * (0.6 + 0.4 * NZ[0].fbm(x / 300, 0 * x + 3, 2))
    near = smooth(4, 28, d_cam)
    hills = (NZ[0].fbm(x / 190, y / 190, 4) - 0.5) * 46 * smooth(25, 320, d_cam) * (1 - plateau)
    medium = (NZ[1].fbm(x / 38, y / 38, 3) - 0.5) * 2.6 * smooth(6, 70, d_cam) * (1 - plateau)
    micro = ((NZ[2].fbm(x / 3.2, y / 3.2, 2) - 0.5) * 0.35 + (NZ[3].fbm(x / 0.7, y / 0.7, 2) - 0.5) * 0.07)
    micro = micro * (0.25 + 0.75 * near) * (1 - 0.7 * plateau)
    slope = 0.016 * np.clip(y, 0, 220) * near
    ridge = 1 - np.abs(2 * NZ[4].fbm(x / 650, y / 650, 5) - 1)
    mount = 300 * ridge ** 2.2 * smooth(1000, 2600, d_cam) * smooth(250, 1400, y) * (1 - smooth(3000, 3900, d_cam))
    return rise + valley + hills + medium + micro + slope + mount


def build_grid():
    def axis(lo, hi, d0, g, start):
        pos = [start]
        d = d0
        while pos[-1] < hi:
            pos.append(pos[-1] + d); d *= g
        return np.array(pos)
    xr = axis(0, 3000, 0.45, 1.026, 0.0)
    xs = np.concatenate([-xr[:0:-1], xr])
    ys = axis(-60, 4000, 0.45, 1.026, 0.0)
    ys = np.concatenate([np.linspace(-60, 0, 20)[:-1], ys])
    return xs, ys


GX, GY = build_grid()
GXX, GYY = np.meshgrid(GX, GY)
GZ = terrain_h(GXX, GYY)
Z0 = float(terrain_h(np.array([CX]), np.array([CY]))[0])


def ground_z(x, y):
    """bilinear on the same grid as the mesh -> flowers sit on the surface."""
    x = np.asarray(x); y = np.asarray(y)
    i = np.clip(np.searchsorted(GX, x) - 1, 0, len(GX) - 2)
    j = np.clip(np.searchsorted(GY, y) - 1, 0, len(GY) - 2)
    fx = (x - GX[i]) / (GX[i + 1] - GX[i]); fy = (y - GY[j]) / (GY[j + 1] - GY[j])
    return ((GZ[j, i] * (1 - fx) + GZ[j, i + 1] * fx) * (1 - fy) +
            (GZ[j + 1, i] * (1 - fx) + GZ[j + 1, i + 1] * fx) * fy)


# ----------------------------------------------------------------------------
# node helpers
# ----------------------------------------------------------------------------
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    return m, nt


def nd(nt, typ, loc=(0, 0), **props):
    n = nt.nodes.new(typ)
    n.location = loc
    for k, v in props.items():
        setattr(n, k, v)
    return n


def setv(n, name, val):
    n.inputs[name].default_value = val


def lk(nt, a, b):
    nt.links.new(a, b)


def out_sock(x):
    return x.outputs[0] if hasattr(x, "outputs") else x


def inp(nt, node, name, v):
    """connect socket/node or set constant."""
    s = node.inputs[name]
    if isinstance(v, (int, float, tuple, list)):
        s.default_value = v
    else:
        lk(nt, out_sock(v), s)


def mt(nt, op, a, b=None, c=None, clamp=False):
    n = nd(nt, "ShaderNodeMath", operation=op, use_clamp=clamp)
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            lk(nt, out_sock(v), n.inputs[i])
    return n.outputs[0]


def ramp(nt, fac, stops, interp="LINEAR"):
    r = nd(nt, "ShaderNodeValToRGB")
    r.color_ramp.interpolation = interp
    el = r.color_ramp.elements
    while len(el) > len(stops):
        el.remove(el[-1])
    while len(el) < len(stops):
        el.new(0.5)
    for e, (p, col) in zip(el, stops):
        e.position = p
        e.color = col if len(col) == 4 else (*col, 1)
    lk(nt, out_sock(fac), r.inputs["Fac"])
    return r.outputs["Color"]


def principled(nt, **kw):
    n = nd(nt, "ShaderNodeBsdfPrincipled")
    for k, v in kw.items():
        k = k.replace("_", " ")
        if isinstance(v, (int, float, tuple, list)):
            if isinstance(v, (tuple, list)) and len(v) == 3 and len(n.inputs[k].default_value) == 4:
                v = (*v, 1.0)
            n.inputs[k].default_value = v
        else:
            lk(nt, out_sock(v), n.inputs[k])
    return n


def mat_output(nt, shader):
    o = nd(nt, "ShaderNodeOutputMaterial")
    lk(nt, out_sock(shader), o.inputs["Surface"])
    return o


def mixc(nt, a, b, fac, blend="MIX"):
    n = nd(nt, "ShaderNodeMix", data_type="RGBA", blend_type=blend)
    inp(nt, n, "Factor", fac)
    for nm, v in (("A", a), ("B", b)):
        s = n.inputs[nm]
        if isinstance(v, (tuple, list)):
            s.default_value = v if len(v) == 4 else (*v, 1)
        else:
            lk(nt, out_sock(v), s)
    return n.outputs["Result"]


def noise_tex(nt, vec, scale, detail=4.0, rough=0.55, distortion=0.0):
    n = nd(nt, "ShaderNodeTexNoise", noise_dimensions="3D")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    n.inputs["Distortion"].default_value = distortion
    if vec is not None:
        lk(nt, out_sock(vec), n.inputs["Vector"])
    return n.outputs["Fac"]


def texcoord(nt, which="Object"):
    t = nd(nt, "ShaderNodeTexCoord")
    return t.outputs[which]


def sepxyz(nt, vec):
    s = nd(nt, "ShaderNodeSeparateXYZ")
    lk(nt, out_sock(vec), s.inputs[0])
    return s.outputs


def attr_node(nt, name, typ="GEOMETRY"):
    a = nd(nt, "ShaderNodeAttribute", attribute_type=typ, attribute_name=name)
    return a


# ----------------------------------------------------------------------------
# materials
# ----------------------------------------------------------------------------
MATS = {}


def mat_ground():
    m, nt = new_mat("Ground")
    pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
    x, y, z = sepxyz(nt, pos)
    dist = mt(nt, "SQRT", mt(nt, "ADD", mt(nt, "MULTIPLY", x, x), mt(nt, "MULTIPLY", y, y)))
    n_big = noise_tex(nt, pos, 0.02, 5)
    n_mid = noise_tex(nt, pos, 0.6, 5)
    n_fin = noise_tex(nt, pos, 14.0, 4)
    base = ramp(nt, n_big, [(0.3, (0.006, 0.018, 0.028)), (0.55, (0.012, 0.030, 0.042)), (0.8, (0.022, 0.046, 0.060))])
    soil = mixc(nt, base, (0.030, 0.026, 0.040), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n_fin, 0.5), 2.0, clamp=True))
    # far-field flower speckle (flowers are sub-pixel from far away)
    vor = nd(nt, "ShaderNodeTexVoronoi", voronoi_dimensions="3D")
    lk(nt, pos, vor.inputs["Vector"]); vor.inputs["Scale"].default_value = 2.8
    speck = mt(nt, "SUBTRACT", 1.0, mt(nt, "DIVIDE", vor.outputs["Distance"], 0.35), clamp=True)
    cluster = ramp(nt, noise_tex(nt, pos, 0.045, 3), [(0.40, (0, 0, 0)), (0.65, (1, 1, 1))])
    far = smooth_node(nt, dist, 15.0, 90.0)
    mask = mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", speck, out_sock(cluster)), far)
    col = mixc(nt, soil, (0.10, 0.11, 0.32), mt(nt, "MULTIPLY", mask, 1.0))
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.4
    lk(nt, n_mid, bump.inputs["Height"])
    bsdf = principled(nt, Base_Color=col, Roughness=0.9)
    lk(nt, bump.outputs["Normal"], bsdf.inputs["Normal"])
    mat_output(nt, bsdf)
    return m


def smooth_node(nt, v, a, b):
    t = mt(nt, "DIVIDE", mt(nt, "SUBTRACT", v, a), b - a, clamp=True)
    return mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", t, t), mt(nt, "SUBTRACT", 3.0, mt(nt, "MULTIPLY", t, 2.0)))


def mat_grass():
    m, nt = new_mat("Grass")
    uv = nd(nt, "ShaderNodeUVMap", uv_map="UV").outputs["UV"]
    v = sepxyz(nt, uv)[1]
    tint = attr_node(nt, "tint", "INSTANCER").outputs["Fac"]
    c_root = (0.008, 0.022, 0.030)
    c_tip_a = (0.075, 0.190, 0.200)
    c_tip_b = (0.100, 0.200, 0.300)
    tip = mixc(nt, c_tip_a, c_tip_b, tint)
    col = mixc(nt, c_root, tip, mt(nt, "POWER", v, 0.8))
    bsdf = principled(nt, Base_Color=col, Roughness=0.55)
    tr = nd(nt, "ShaderNodeBsdfTranslucent"); lk(nt, out_sock(col), tr.inputs["Color"])
    mx = nd(nt, "ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.35
    lk(nt, bsdf.outputs[0], mx.inputs[1]); lk(nt, tr.outputs[0], mx.inputs[2])
    mat_output(nt, mx)
    return m


def mat_leaf(name="Leaf", base=(0.030, 0.120, 0.130)):
    m, nt = new_mat(name)
    uv = nd(nt, "ShaderNodeUVMap", uv_map="UV").outputs["UV"]
    u, v, _ = sepxyz(nt, uv)
    tint = attr_node(nt, "tint", "INSTANCER").outputs["Fac"]
    mid = mt(nt, "ABSOLUTE", mt(nt, "SUBTRACT", v, 0.5))
    rib = mt(nt, "SUBTRACT", 1.0, mt(nt, "MULTIPLY", mid, 22.0), clamp=True)
    side_v = mt(nt, "ABSOLUTE", mt(nt, "SINE", mt(nt, "ADD", mt(nt, "MULTIPLY", u, 40.0), mt(nt, "MULTIPLY", mid, 18.0))))
    veins = mt(nt, "MULTIPLY", mt(nt, "POWER", side_v, 8.0), 0.5)
    col = mixc(nt, base, (0.055, 0.19, 0.20), mt(nt, "ADD", u, mt(nt, "MULTIPLY", tint, 0.3)))
    col = mixc(nt, col, (0.14, 0.33, 0.30), mt(nt, "MAXIMUM", rib, veins))
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.002
    lk(nt, out_sock(mt(nt, "MAXIMUM", rib, veins)), bump.inputs["Height"])
    bsdf = principled(nt, Base_Color=col, Roughness=0.38)
    bsdf.inputs["Specular IOR Level"].default_value = 0.6
    lk(nt, bump.outputs["Normal"], bsdf.inputs["Normal"])
    tr = nd(nt, "ShaderNodeBsdfTranslucent"); lk(nt, out_sock(col), tr.inputs["Color"])
    mx = nd(nt, "ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.32
    lk(nt, bsdf.outputs[0], mx.inputs[1]); lk(nt, tr.outputs[0], mx.inputs[2])
    mat_output(nt, mx)
    return m


def mat_petal(name="Petal"):
    m, nt = new_mat(name)
    uv = nd(nt, "ShaderNodeUVMap", uv_map="UV").outputs["UV"]
    u, v, _ = sepxyz(nt, uv)
    tint = attr_node(nt, "tint", "INSTANCER").outputs["Fac"]
    dv = mt(nt, "ABSOLUTE", mt(nt, "SUBTRACT", v, 0.5))
    base = ramp(nt, u, [(0.0, (0.80, 0.78, 1.0)), (0.22, (0.80, 0.82, 1.0)), (0.6, (0.60, 0.66, 0.98)), (1.0, (0.42, 0.50, 0.95))])
    tintc = mixc(nt, (0.88, 0.96, 1.0), (1.0, 0.86, 1.0), tint)
    col = mixc(nt, base, tintc, 1.0, blend="MULTIPLY")
    # darker violet star rays from the throat
    ray = mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", 1.0, mt(nt, "MULTIPLY", dv, 11.0), clamp=True),
               mt(nt, "SUBTRACT", 1.0, mt(nt, "MULTIPLY", u, 2.4), clamp=True))
    col = mixc(nt, col, (0.34, 0.26, 0.85), mt(nt, "MULTIPLY", ray, 0.55))
    # fine veins
    veins = mt(nt, "ABSOLUTE", mt(nt, "SINE", mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", v, 0.5), 70.0)))
    vh = mt(nt, "MULTIPLY", mt(nt, "POWER", veins, 6.0), mt(nt, "SUBTRACT", 1.0, mt(nt, "MULTIPLY", u, 0.6)))
    col = mixc(nt, col, (0.50, 0.50, 0.95), mt(nt, "MULTIPLY", vh, 0.25))
    n_h = noise_tex(nt, None, 40.0, 3)
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.0004
    lk(nt, out_sock(mt(nt, "ADD", vh, mt(nt, "MULTIPLY", n_h, 0.4))), bump.inputs["Height"])
    bsdf = principled(nt, Base_Color=col, Roughness=0.42)
    bsdf.inputs["Subsurface Weight"].default_value = 0.35
    bsdf.inputs["Subsurface Radius"].default_value = (0.25, 0.25, 0.5)
    bsdf.inputs["Subsurface Scale"].default_value = 0.004
    bsdf.inputs["Sheen Weight"].default_value = 0.6
    bsdf.inputs["Sheen Roughness"].default_value = 0.4
    lk(nt, bump.outputs["Normal"], bsdf.inputs["Normal"])
    tr = nd(nt, "ShaderNodeBsdfTranslucent"); lk(nt, out_sock(col), tr.inputs["Color"])
    mx = nd(nt, "ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.4
    lk(nt, bsdf.outputs[0], mx.inputs[1]); lk(nt, tr.outputs[0], mx.inputs[2])
    mat_output(nt, mx)
    return m


def mat_simple(name, col, rough=0.5, emis=None, emis_strength=0.0):
    m, nt = new_mat(name)
    b = principled(nt, Base_Color=col, Roughness=rough)
    if emis:
        b.inputs["Emission Color"].default_value = (*emis, 1)
        b.inputs["Emission Strength"].default_value = emis_strength
    mat_output(nt, b)
    return m


def mat_stone():
    m, nt = new_mat("CastleStone")
    uv = nd(nt, "ShaderNodeUVMap", uv_map="UV").outputs["UV"]
    pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
    obj = texcoord(nt, "Object")
    ox, oy, oz = sepxyz(nt, obj)
    br = nd(nt, "ShaderNodeTexBrick")
    br.offset = 0.5; br.offset_frequency = 2
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.035
    br.inputs["Mortar Smooth"].default_value = 0.25
    br.inputs["Bias"].default_value = 0.0
    br.inputs["Brick Width"].default_value = 2.1
    br.inputs["Row Height"].default_value = 1.0
    br.inputs["Color1"].default_value = (0.26, 0.25, 0.32, 1)
    br.inputs["Color2"].default_value = (0.17, 0.17, 0.24, 1)
    lk(nt, uv, br.inputs["Vector"])
    n_col = noise_tex(nt, obj, 0.35, 6)
    n_fine = noise_tex(nt, obj, 9.0, 6, 0.6)
    n_big = noise_tex(nt, obj, 0.05, 3)
    # weathering: vertical streaks, grime near base, lichen patches
    cz = nd(nt, "ShaderNodeCombineXYZ")
    lk(nt, out_sock(mt(nt, "MULTIPLY", ox, 1.4)), cz.inputs["X"])
    lk(nt, out_sock(mt(nt, "MULTIPLY", oy, 1.4)), cz.inputs["Y"])
    lk(nt, out_sock(mt(nt, "MULTIPLY", oz, 0.07)), cz.inputs["Z"])
    streak = noise_tex(nt, cz.outputs[0], 1.8, 3, 0.5)
    grime = mt(nt, "SUBTRACT", 1.0, smooth_node(nt, oz, -2.0, 30.0), clamp=True)
    stone = mixc(nt, br.outputs["Color"], (0.20, 0.20, 0.27), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n_col, 0.35), 1.2, clamp=True))
    stone = mixc(nt, stone, (0.40, 0.40, 0.52), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n_big, 0.45), 1.4, clamp=True), blend="MIX")
    stone = mixc(nt, stone, (0.10, 0.11, 0.16), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", streak, 0.48), 2.2, clamp=True))
    stone = mixc(nt, stone, (0.03, 0.05, 0.05), mt(nt, "MULTIPLY", grime, mt(nt, "ADD", 0.35, mt(nt, "MULTIPLY", n_fine, 0.8), clamp=True)))
    mortar = br.outputs["Fac"]
    hgt = mt(nt, "ADD", mt(nt, "MULTIPLY", mortar, 0.7), mt(nt, "MULTIPLY", n_fine, 0.35))
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 1.0; bump.inputs["Distance"].default_value = 0.14
    lk(nt, out_sock(hgt), bump.inputs["Height"])
    bsdf = principled(nt, Base_Color=stone, Roughness=0.82)
    lk(nt, bump.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.35
    mat_output(nt, bsdf)
    return m


def mat_slate():
    m, nt = new_mat("Slate")
    uv = nd(nt, "ShaderNodeUVMap", uv_map="UV").outputs["UV"]
    obj = texcoord(nt, "Object")
    br = nd(nt, "ShaderNodeTexBrick")
    br.offset = 0.5; br.offset_frequency = 2
    br.inputs["Mortar Size"].default_value = 0.03
    br.inputs["Brick Width"].default_value = 0.9
    br.inputs["Row Height"].default_value = 0.8
    br.inputs["Color1"].default_value = (0.05, 0.055, 0.10, 1)
    br.inputs["Color2"].default_value = (0.03, 0.032, 0.07, 1)
    lk(nt, uv, br.inputs["Vector"])
    n = noise_tex(nt, obj, 1.5, 5)
    col = mixc(nt, br.outputs["Color"], (0.12, 0.14, 0.24), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n, 0.4), 1.3, clamp=True))
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 1.0; bump.inputs["Distance"].default_value = 0.12
    lk(nt, br.outputs["Fac"], bump.inputs["Height"])
    bsdf = principled(nt, Base_Color=col, Roughness=0.30)
    bsdf.inputs["Specular IOR Level"].default_value = 0.7
    lk(nt, bump.outputs["Normal"], bsdf.inputs["Normal"])
    mat_output(nt, bsdf)
    return m


def mat_glass():
    m, nt = new_mat("WindowGlass")
    wi = attr_node(nt, "wi").outputs["Fac"]
    wv = attr_node(nt, "wv").outputs["Fac"]
    flick = noise_tex(nt, texcoord(nt, "Object"), 0.9, 2)
    grad = ramp(nt, wv, [(0.0, (1.0, 0.80, 0.42)), (0.6, (1.0, 0.55, 0.20)), (1.0, (0.9, 0.35, 0.12))])
    b = principled(nt, Base_Color=(0.006, 0.010, 0.030), Roughness=0.08)
    b.inputs["Emission Color"].default_value = (1, 1, 1, 1)
    lk(nt, out_sock(grad), b.inputs["Emission Color"])
    lk(nt, out_sock(mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", wi, 9.0), mt(nt, "ADD", 0.7, flick))), b.inputs["Emission Strength"])
    mat_output(nt, b)
    return m


def mat_moon():
    m, nt = new_mat("Moon")
    obj = texcoord(nt, "Object")
    mare = ramp(nt, noise_tex(nt, obj, 1.6, 5, 0.6, 0.6), [(0.40, (1, 1, 1)), (0.60, (0.42, 0.45, 0.60))])
    vor = nd(nt, "ShaderNodeTexVoronoi", voronoi_dimensions="3D")
    lk(nt, out_sock(obj), vor.inputs["Vector"]); vor.inputs["Scale"].default_value = 7.0
    vor2 = nd(nt, "ShaderNodeTexVoronoi", voronoi_dimensions="3D")
    lk(nt, out_sock(obj), vor2.inputs["Vector"]); vor2.inputs["Scale"].default_value = 21.0
    crater = mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", 1.0, mt(nt, "MULTIPLY", mt(nt, "ABSOLUTE", mt(nt, "SUBTRACT", vor.outputs["Distance"], 0.32)), 8.0), clamp=True), 0.10)
    crater2 = mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", 1.0, mt(nt, "MULTIPLY", mt(nt, "ABSOLUTE", mt(nt, "SUBTRACT", vor2.outputs["Distance"], 0.3)), 9.0), clamp=True), 0.07)
    fine = noise_tex(nt, obj, 30.0, 6)
    col = mixc(nt, (0.58, 0.60, 0.70), (0.98, 0.98, 1.0), out_sock(mare))
    col = mixc(nt, col, (1.0, 1.0, 1.0), mt(nt, "ADD", crater, crater2))
    col = mixc(nt, col, (0.5, 0.52, 0.62), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", fine, 0.5), 0.8, clamp=True))
    lw = nd(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    limb = mt(nt, "SUBTRACT", 1.0, mt(nt, "MULTIPLY", lw.outputs["Facing"], 0.0))
    face = mt(nt, "ADD", 0.55, mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", 1.0, lw.outputs["Facing"]), -0.5))
    em = nd(nt, "ShaderNodeEmission")
    lk(nt, out_sock(col), em.inputs["Color"])
    lk(nt, out_sock(mt(nt, "MULTIPLY", mt(nt, "ADD", 0.65, mt(nt, "MULTIPLY", lw.outputs["Facing"], 0.35)), 1.0)), em.inputs["Strength"])
    mat_output(nt, em)
    return m


def build_world():
    w = bpy.data.worlds.new("NightSky")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nd(nt, "ShaderNodeTexCoord")
    d = nd(nt, "ShaderNodeVectorMath", operation="NORMALIZE")
    lk(nt, tc.outputs["Object"], d.inputs[0])
    dx, dy, dz = sepxyz(nt, d.outputs[0])
    z = mt(nt, "MAXIMUM", dz, 0.0)
    sky = ramp(nt, mt(nt, "POWER", z, 0.62), [(0.0, (0.34, 0.34, 0.85)), (0.16, (0.16, 0.14, 0.62)),
                                               (0.45, (0.07, 0.05, 0.34)), (1.0, (0.02, 0.015, 0.17))])
    # milky haze band
    ax = nd(nt, "ShaderNodeVectorMath", operation="DOT_PRODUCT")
    lk(nt, d.outputs[0], ax.inputs[0]); ax.inputs[1].default_value = (0.55, -0.35, 0.75)
    band = mt(nt, "EXPONENT", mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", ax.outputs["Value"], ax.outputs["Value"]), -14.0))
    cloud = noise_tex(nt, d.outputs[0], 3.0, 6, 0.62, 0.4)
    haze = mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", band, mt(nt, "SUBTRACT", cloud, 0.35, clamp=True)), mt(nt, "MULTIPLY", z, 3.0, clamp=True))
    skyc = mixc(nt, sky, (0.55, 0.45, 1.0), mt(nt, "MULTIPLY", haze, 0.55))
    # wispy high cloud near the moon side
    # stars
    def stars(scale, thresh, power, gain):
        v = nd(nt, "ShaderNodeTexVoronoi", voronoi_dimensions="3D")
        v.inputs["Scale"].default_value = scale
        lk(nt, d.outputs[0], v.inputs["Vector"])
        sx, sy, sz = sepxyz(nt, v.outputs["Color"])
        pt = mt(nt, "POWER", mt(nt, "SUBTRACT", 1.0, mt(nt, "DIVIDE", v.outputs["Distance"], 0.13), clamp=True), power)
        sel = mt(nt, "GREATER_THAN", sx, thresh)
        return mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", pt, sel), mt(nt, "MULTIPLY", sy, gain))
    st = mt(nt, "ADD", stars(110.0, 0.80, 3.0, 60.0), stars(240.0, 0.82, 3.0, 40.0))
    st = mt(nt, "MULTIPLY", st, mt(nt, "SUBTRACT", smooth_node(nt, dz, 0.03, 0.35), 0.0))
    starc = mixc(nt, (0.85, 0.9, 1.0), (1.0, 0.92, 0.82), 0.3)
    sc = nd(nt, "ShaderNodeVectorMath", operation="SCALE")
    lk(nt, out_sock(starc), sc.inputs[0]); lk(nt, out_sock(st), sc.inputs["Scale"])
    skyfinal = nd(nt, "ShaderNodeMix", data_type="RGBA", blend_type="ADD")
    skyfinal.inputs["Factor"].default_value = 1.0
    lk(nt, out_sock(skyc), skyfinal.inputs["A"]); lk(nt, sc.outputs[0], skyfinal.inputs["B"])
    bg = nd(nt, "ShaderNodeBackground")
    lk(nt, skyfinal.outputs["Result"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    bg2 = nd(nt, "ShaderNodeBackground")
    lk(nt, skyfinal.outputs["Result"], bg2.inputs["Color"])
    bg2.inputs["Strength"].default_value = 0.38     # ambient light is dimmer than what the camera sees
    lp = nd(nt, "ShaderNodeLightPath")
    mxw = nd(nt, "ShaderNodeMixShader")
    lk(nt, lp.outputs["Is Camera Ray"], mxw.inputs["Fac"])
    lk(nt, bg2.outputs[0], mxw.inputs[1]); lk(nt, bg.outputs[0], mxw.inputs[2])
    o = nd(nt, "ShaderNodeOutputWorld")
    lk(nt, mxw.outputs[0], o.inputs["Surface"])
    return w


# ----------------------------------------------------------------------------
# mesh builder with materials, auto UV and sharp-edge marking
# ----------------------------------------------------------------------------
class MB:
    def __init__(self, nuv=True):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UV")
        self.wi = self.bm.verts.layers.float.new("wi")
        self.wv = self.bm.verts.layers.float.new("wv")
        self.vuv = {}
        self.manual = set()

    def v(self, p):
        return self.bm.verts.new(p)

    def face(self, verts, mat=0, uvs=None):
        try:
            f = self.bm.faces.new(verts)
        except ValueError:
            return None
        f.material_index = mat
        f.smooth = True
        if uvs is not None:
            for lp, uv in zip(f.loops, uvs):
                lp[self.uv].uv = uv
            self.manual.add(f)
        return f

    def finish(self, name, mats, sharp_angle=40.0, auto_uv=True, scale_uv=1.0):
        bm = self.bm
        bm.faces.ensure_lookup_table()
        for f in bm.faces:
            if f in self.manual or not auto_uv:
                continue
            n = f.normal
            up = Vector((0, 0, 1))
            if abs(n.z) > 0.97:
                t = Vector((1, 0, 0))
            else:
                t = up.cross(n).normalized()
            b = n.cross(t).normalized()
            for lp in f.loops:
                p = lp.vert.co
                lp[self.uv].uv = (p.dot(t) * scale_uv, p.dot(b) * scale_uv)
        for e in bm.edges:
            if len(e.link_faces) == 2:
                if e.calc_face_angle(0.0) > math.radians(sharp_angle):
                    e.smooth = False
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me)
        bm.free()
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        for m in mats:
            me.materials.append(m)
        return obj


def lathe(mb, cx, cy, profile, sides, phase=0.0, mat=0):
    """profile: list of (r, z) bottom->top. r==0 gives an apex vertex."""
    rings = []
    for r, z in profile:
        if r < 1e-4:
            rings.append([mb.v((cx, cy, z))])
        else:
            rings.append([mb.v((cx + r * math.cos(phase + 2 * math.pi * k / sides),
                                cy + r * math.sin(phase + 2 * math.pi * k / sides), z)) for k in range(sides)])
    for a, b in zip(rings[:-1], rings[1:]):
        for k in range(sides):
            k2 = (k + 1) % sides
            if len(a) == 1:
                mb.face([b[k], a[0], b[k2]], mat)
            elif len(b) == 1:
                mb.face([a[k], a[k2], b[0]], mat)
            else:
                mb.face([a[k], a[k2], b[k2], b[k]], mat)


def box(mb, cx, cy, z0, sx, sy, h, mat=0, rot=0.0, taper=1.0):
    c, s = math.cos(rot), math.sin(rot)
    pts = []
    for zz, k in ((z0, 1.0), (z0 + h, taper)):
        for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            lx, ly = dx * sx / 2 * k, dy * sy / 2 * k
            pts.append(mb.v((cx + lx * c - ly * s, cy + lx * s + ly * c, zz)))
    q = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    for f in q:
        mb.face([pts[i] for i in f], mat)


def spire(mb, cx, cy, z0, R, H, sides, phase=0.0, mat=1, flare=0.28, finial=True, fin_mat=1):
    ts = np.concatenate([[0, 0.012, 0.03, 0.055, 0.09], np.linspace(0.14, 0.97, 9)])
    prof = [(R * (1 - t) ** 1.18 * (1 + flare * math.exp(-t / 0.045)), z0 + H * t) for t in ts]
    prof.append((0.0, z0 + H))
    lathe(mb, cx, cy, prof, sides, phase, mat)
    if finial:
        top = z0 + H
        fp = [(0.32, top - 0.4), (0.22, top + 2.2), (0.6, top + 2.8), (0.66, top + 3.3), (0.38, top + 3.9), (0.12, top + 4.8), (0.0, top + 6.5)]
        lathe(mb, cx, cy, fp, 8, 0.0, fin_mat)


def merlons(mb, cx, cy, r, z, n, w=1.5, h=1.5, d=1.0, mat=0, skip=2):
    for k in range(n):
        if k % skip:
            continue
        a = 2 * math.pi * k / n
        box(mb, cx + r * math.cos(a), cy + r * math.sin(a), z, d, w, h, mat, rot=a)


def merlons_line(mb, p0, p1, z, w=1.6, h=1.6, d=1.1, mat=0, step=3.2):
    p0 = Vector(p0); p1 = Vector(p1)
    L = (p1 - p0).length
    n = max(2, int(L / step))
    ang = math.atan2(p1.y - p0.y, p1.x - p0.x)
    for k in range(n):
        if k % 2 == 0:
            p = p0 + (p1 - p0) * ((k + 0.5) / n)
            box(mb, p.x, p.y, z, w, d, h, mat, rot=ang)


def arch_poly(w, hs, m=7):
    """pointed arch outline (s, h) from bottom-left, ccw."""
    pts = [(-w / 2, 0.0), (w / 2, 0.0), (w / 2, hs)]
    for k in range(1, m + 1):
        a = math.radians(60.0 * k / m)
        pts.append((-w / 2 + w * math.cos(a), hs + w * math.sin(a)))
    for k in range(m - 1, 0, -1):
        a = math.radians(60.0 * k / m)
        pts.append((w / 2 - w * math.cos(a), hs + w * math.sin(a)))
    pts.append((-w / 2, hs))
    return pts


def window(mb, base, n, z, w, hs, lit, rnd, mat_glass_i, mat_dark_i, mat_stone_i):
    """base: xy point on wall surface, n: outward unit normal (xy), z: bottom height."""
    n = Vector((n[0], n[1], 0)); t = Vector((-n.y, n.x, 0)); up = Vector((0, 0, 1))
    bse = Vector((base[0], base[1], z))
    htot = hs + 0.866 * w

    def poly(w_, hs_, off, dz, mat, glass=False):
        pts = arch_poly(w_, hs_)
        vs = []
        for s, h in pts:
            p = bse + t * s + up * (h + dz) + n * off
            v = mb.v(p)
            if glass:
                v[mb.wi] = lit
                v[mb.wv] = min(1.0, h / htot)
            vs.append(v)
        f = mb.face(vs, mat)
        if f is None:
            return
        if f.normal.dot(n) < 0:
            f.normal_flip()
    # stone frame (slightly bigger, protruding), dark recess, glass, mullion
    poly(w + 1.0, hs + 0.25, 0.10, -0.25, mat_stone_i)
    poly(w + 0.3, hs + 0.1, 0.16, -0.1, mat_dark_i)
    poly(w, hs, 0.22, 0.0, mat_glass_i, glass=True)
    # mullion + transom (tiny boxes)
    ang = math.atan2(n.y, n.x)
    box(mb, bse.x + n.x * 0.3, bse.y + n.y * 0.3, z, 0.12, 0.16, hs + 0.3, mat_dark_i, rot=ang)
    box(mb, bse.x + n.x * 0.3, bse.y + n.y * 0.3, z + hs * 0.55, 0.14, w, 0.12, mat_dark_i, rot=ang)


# ----------------------------------------------------------------------------
# castle
# ----------------------------------------------------------------------------
CASTLE_LIGHTS = []   # (world xyz) positions for tiny warm lights


def build_castle(mats):
    r = np.random.default_rng(777)
    mb = MB()
    ST, SL, GL, DK, MT = 0, 1, 2, 3, 4   # material slots
    cam_xy = Vector((0, -CY))             # direction toward camera in castle space (approx)

    def w_on_cyl(cx, cy, rad, sides, z, w, hs, ang_c, lit_p=0.55):
        """window at a facet centre closest to ang_c"""
        step = 2 * math.pi / sides
        k = round(ang_c / step - 0.5)
        a = (k + 0.5) * step
        wall = rad * math.cos(math.pi / sides)
        n = (math.cos(a), math.sin(a))
        lit = (r.uniform(0.5, 1.25) if r.random() < lit_p else 0.0)
        window(mb, (cx + n[0] * wall, cy + n[1] * wall), n, z, w, hs, lit, r, GL, DK, ST)
        if lit > 0 and len(CASTLE_LIGHTS) < 60 and r.random() < 0.35:
            CASTLE_LIGHTS.append((cx + n[0] * (wall + 2.0), cy + n[1] * (wall + 2.0), z + hs * 0.6))

    def tower(cx, cy, rad, h, sides, sp_h, style="spire", turrets=0, win_w=None, phase=0.0, lit_p=0.55):
        prof = [(rad * 1.38, -10), (rad * 1.38, 1.0), (rad * 1.14, 2.6), (rad * 1.0, 4.2), (rad, h - 3.4),
                (rad * 1.08, h - 2.6), (rad * 1.08, h - 2.2), (rad * 1.17, h - 1.6), (rad * 1.17, h)]
        lathe(mb, cx, cy, prof, sides, phase, ST)
        # string courses
        for zc in np.arange(11.0, h - 8.0, 13.0):
            lathe(mb, cx, cy, [(rad * 1.0, zc), (rad * 1.07, zc + 0.0), (rad * 1.07, zc + 0.55), (rad * 1.0, zc + 0.55)], sides, phase, ST)
        top = h
        if style == "battle":
            lathe(mb, cx, cy, [(rad * 1.17, top), (rad * 1.0, top + 0.3), (rad * 1.0, top + 1.0)], sides, phase, ST)
            merlons(mb, cx, cy, rad * 1.1, top, max(8, int(2 * math.pi * rad * 1.1 / 2.4)), 1.3, 1.6, 0.9, ST)
            ir = rad * 0.66
            lathe(mb, cx, cy, [(ir, top), (ir, top + 7.0), (ir * 1.12, top + 7.8), (ir * 1.16, top + 9.2)], sides, phase, ST)
            for k in range(2):
                w_on_cyl(cx, cy, ir, sides, top + 2.2, 1.0, 2.0, -math.pi / 2, 0.8)
            spire(mb, cx, cy, top + 9.2, ir * 1.06, sp_h, sides, phase, SL, fin_mat=MT)
        else:
            spire(mb, cx, cy, top, rad * 1.04, sp_h, sides, phase, SL, fin_mat=MT)
        # windows (camera facing half only)
        ww = win_w or min(1.5, rad * 0.26)
        z = 9.0 + r.uniform(0, 3)
        while z < h - 8.0:
            nwin = max(1, int(rad / 3.4))
            base_ang = -math.pi / 2 + r.uniform(-0.2, 0.2)
            for k in range(nwin):
                off = (k - (nwin - 1) / 2) * (2.0 * ww * 2.4 / rad)
                w_on_cyl(cx, cy, rad, sides, z, ww, ww * 2.2, base_ang + off, lit_p)
            z += r.uniform(7.0, 10.5)
        # arrow slits high up
        for k in range(3):
            w_on_cyl(cx, cy, rad, sides, h - 6.5, ww * 0.55, ww * 1.4, -math.pi / 2 + (k - 1) * 0.55, lit_p * 0.8)
        # corbelled turrets
        for k in range(turrets):
            side = -1 if k % 2 == 0 else 1
            a = -math.pi / 2 + side * r.uniform(0.7, 1.0)
            tr = rad * 0.42
            tx, ty = cx + math.cos(a) * rad * 0.98, cy + math.sin(a) * rad * 0.98
            zb = h * r.uniform(0.55, 0.7)
            zt = zb + r.uniform(8, 11)
            tp = [(0.0, zb - 7.0), (tr * 0.5, zb - 4.5), (tr * 0.9, zb - 2.0), (tr * 1.2, zb - 0.6), (tr, zb), (tr, zt),
                  (tr * 1.15, zt + 0.6), (tr * 1.15, zt + 1.6)]
            lathe(mb, tx, ty, tp, 10, 0.0, ST)
            spire(mb, tx, ty, zt + 1.6, tr * 1.0, tr * r.uniform(5.5, 7.5), 10, 0.0, SL, fin_mat=MT)
            w_on_cyl(tx, ty, tr, 10, zb + 2.5, 0.6, 1.4, -math.pi / 2 + side * 0.4, 0.9)

    # --- central keep (octagonal) ---
    tower(0, 0, 11.5, 62, 8, 46, "spire", turrets=0, win_w=1.7, phase=math.pi / 8, lit_p=0.7)
    for a in (-math.pi / 4, math.pi / 4 + math.pi / 2 * 0, 3 * math.pi / 4, -3 * math.pi / 4):
        tx, ty = 11.5 * 0.92 * math.cos(a), 11.5 * 0.92 * math.sin(a)
        tower(tx, ty, 3.3, 52, 10, 20, "spire", win_w=0.8, lit_p=0.6)
    # --- hall blocks ---
    def hall(x0, x1, y0, y1, h, ridge, gx=5.0):
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        box(mb, cx, cy, -9, x1 - x0 + 1.5, y1 - y0 + 1.5, 9 + 0.5, ST)
        box(mb, cx, cy, -9, x1 - x0, y1 - y0, h + 9, ST)
        # parapet course + roof prism
        ov = 1.4
        a = [mb.v((x0 - ov, y0 - ov, h)), mb.v((x1 + ov, y0 - ov, h)), mb.v((x1 + ov, y1 + ov, h)), mb.v((x0 - ov, y1 + ov, h))]
        rg0 = mb.v((x0 - ov, cy, h + ridge)); rg1 = mb.v((x1 + ov, cy, h + ridge))
        mb.face([a[0], a[1], rg1, rg0], SL); mb.face([a[2], a[3], rg0, rg1], SL)
        mb.face([a[1], a[2], rg1], ST); mb.face([a[3], a[0], rg0], ST)
        mb.face([a[3], a[2], a[1], a[0]], SL)
        # windows on the front (-y) face
        nx = int((x1 - x0) / gx)
        for row, zz in enumerate(np.arange(6.0, h - 6.0, 9.5)):
            for k in range(nx):
                px = x0 + (k + 0.5) * (x1 - x0) / nx
                lit = r.uniform(0.5, 1.25) if r.random() < 0.62 else 0.0
                window(mb, (px, y0), (0, -1), zz, 1.6, 3.6 if row else 4.6, lit, r, GL, DK, ST)
                if lit and len(CASTLE_LIGHTS) < 60 and r.random() < 0.15:
                    CASTLE_LIGHTS.append((px, y0 - 2.0, zz + 2.0))
        # dormers on roof
        for k in range(1, nx):
            px = x0 + k * (x1 - x0) / nx
            zb = h + ridge * 0.38
            box(mb, px, y0 + (cy - y0) * 0.34 - 1.5, zb - 0.5, 3.2, 3.0, 3.6, ST)
            ra = [mb.v((px - 1.9, y0 + (cy - y0) * 0.34 - 3.3, zb + 3.1)), mb.v((px + 1.9, y0 + (cy - y0) * 0.34 - 3.3, zb + 3.1)),
                  mb.v((px, y0 + (cy - y0) * 0.34 - 3.3, zb + 5.8)),
                  mb.v((px - 1.9, y0 + (cy - y0) * 0.34 + 1.0, zb + 3.1)), mb.v((px + 1.9, y0 + (cy - y0) * 0.34 + 1.0, zb + 3.1)),
                  mb.v((px, y0 + (cy - y0) * 0.34 + 1.0, zb + 5.8))]
            mb.face([ra[0], ra[1], ra[2]], ST); mb.face([ra[1], ra[4], ra[5], ra[2]], SL)
            mb.face([ra[3], ra[0], ra[2], ra[5]], SL); mb.face([ra[4], ra[3], ra[5]], ST)
            window(mb, (px, y0 + (cy - y0) * 0.34 - 3.3 + 0.0), (0, -1), zb + 0.2, 1.1, 1.2, r.uniform(0.6, 1.2), r, GL, DK, ST)
        # buttresses
        for k in range(nx + 1):
            px = x0 + k * (x1 - x0) / nx
            box(mb, px, y0 - 0.9, -9, 1.5, 2.0, 9 + h * 0.6, ST, taper=0.5)
        # gable-end pinnacles
        for px in (x0, x1):
            lathe(mb, px, y0, [(1.0, h - 2), (1.0, h + 2), (1.3, h + 2.4), (0.0, h + 8)], 4, math.pi / 4, SL)
    hall(-33, -6, -8, 8, 26, 16)
    hall(6, 36, -9, 9, 32, 19, gx=5.5)
    hall(-6, 6, -22, -7, 20, 11, gx=4.0)   # gatehouse block
    # --- tall slender towers ---
    TW = [  # x, y, r, h, sides, spire, style, turrets
        (-62, 6, 7.0, 44, 16, 32, "spire", 1),
        (-47, -10, 6.2, 58, 16, 38, "battle", 2),
        (-27, 11, 5.0, 68, 12, 40, "spire", 1),
        (-13, -22, 4.2, 38, 12, 24, "spire", 0),
        (13, -22, 4.2, 38, 12, 24, "spire", 0),
        (23, 15, 5.4, 74, 12, 44, "spire", 2),
        (43, -10, 7.2, 52, 16, 34, "battle", 2),
        (62, 4, 6.0, 46, 16, 30, "spire", 1),
        (-76, -14, 4.8, 30, 12, 20, "spire", 0),
        (76, -12, 5.0, 32, 12, 22, "spire", 0),
        (-3, 20, 4.4, 62, 12, 36, "spire", 1),
        (50, 22, 4.0, 40, 10, 28, "spire", 0),
    ]
    for (x, y, rad, h, sd, sh, st, tu) in TW:
        tower(x, y, rad, h, sd, sh, st, tu, lit_p=0.5)
    # --- curtain wall + gate ---
    def wall(p0, p1, h=15.0, th=3.4):
        p0 = Vector(p0); p1 = Vector(p1)
        c = (p0 + p1) / 2; L = (p1 - p0).length
        ang = math.atan2(p1.y - p0.y, p1.x - p0.x)
        box(mb, c.x, c.y, -10, L, th, 10 + h, ST, rot=ang)
        box(mb, c.x, c.y, h - 1.5, L, th + 1.0, 1.5, ST, rot=ang)
        merlons_line(mb, p0 + Vector((0, 0)), p1, h, 1.6, 1.7, th * 0.5, ST)
        for k in range(int(L // 14)):
            q = p0 + (p1 - p0) * ((k + 0.5) / max(1, int(L // 14)))
            box(mb, q.x, q.y - 1.2, -10, 2.0, 2.6, 10 + h * 0.8, ST, rot=ang, taper=0.6)
    wall((-86, -20), (-13, -26), 11)
    wall((13, -26), (86, -20), 12)
    wall((-13, -22), (13, -22), 16, 4)
    wall((-86, -20), (-76, 4), 14); wall((86, -18), (76, 4), 14)
    # gate arch (dark recess)
    window(mb, (0, -22 - 2.0), (0, -1), -1.0, 4.2, 5.0, 0.0, r, GL, DK, ST)
    # --- final object ---
    obj = mb.finish("Castle", mats, sharp_angle=38.0)
    obj.location = (CX, CY, Z0)
    return obj


# ----------------------------------------------------------------------------
# flowers / grass / petals assets (modelled with bmesh)
# ----------------------------------------------------------------------------
P_PET, P_STEM, P_LEAF, P_STAM, P_THR = 0, 1, 2, 3, 4


def basis_from(a):
    a = Vector(a).normalized()
    ref = Vector((0, 1, 0)) if abs(a.z) > 0.9 else Vector((0, 0, 1))
    u = ref.cross(a).normalized()
    v = a.cross(u).normalized()
    return u, v, a


def add_petal(mb, origin, bas, ang, L=0.030, W=0.0135, lift=0.30, cup=0.22, x0=0.0035, mat=P_PET, nu=11, nv=9,
              rnd=None, curl=0.0):
    u_, v_, a_ = bas
    c, s = math.cos(ang), math.sin(ang)
    ex = u_ * c + v_ * s
    ey = -u_ * s + v_ * c
    rows = []
    for i in range(nu):
        uu = i / (nu - 1) * 0.985
        if uu < 0.62:
            w = W * math.sin(math.pi / 2 * uu / 0.62) ** 0.9
        else:
            w = W * math.sqrt(max(0.0, 1 - ((uu - 0.62) / 0.38) ** 2))
        row = []
        for j in range(nv):
            vv = (j / (nv - 1)) * 2 - 1
            y = vv * w
            x = x0 + uu * L
            z = lift * L * uu * uu + cup * W * (vv * vv) * uu * 1.8 + curl * L * uu ** 3
            if rnd is not None:
                z += rnd.normal(0, 0.00012) * uu
            p = origin + ex * x + ey * y + a_ * z
            vert = mb.v(p)
            row.append((vert, (uu, (vv + 1) / 2)))
        rows.append(row)
    for i in range(nu - 1):
        for j in range(nv - 1):
            q = [rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]]
            mb.face([x[0] for x in q], mat, [x[1] for x in q])


def add_leaf(mb, p0, dirv, L, Wd, rnd, droop=0.3, mat=P_LEAF):
    dirv = Vector(dirv).normalized()
    side = dirv.cross(Vector((0, 0, 1)))
    if side.length < 1e-3:
        side = Vector((1, 0, 0))
    side.normalize()
    nu, nv = 9, 5
    rows = []
    for i in range(nu):
        t = i / (nu - 1)
        w = Wd * (math.sin(math.pi * t ** 0.8) ** 0.85)
        row = []
        for j in range(nv):
            vv = j / (nv - 1) * 2 - 1
            p = p0 + dirv * (L * t) + side * (vv * w) + Vector((0, 0, -droop * L * t * t + abs(vv) * w * 0.25))
            row.append((mb.v(p), (t, (vv + 1) / 2)))
        rows.append(row)
    for i in range(nu - 1):
        for j in range(nv - 1):
            q = [rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]]
            mb.face([x[0] for x in q], mat, [x[1] for x in q])


def add_tube(mb, pts, radii, sides=6, mat=P_STEM):
    rings = []
    for k, p in enumerate(pts):
        if k == 0:
            t = pts[1] - p
        else:
            t = p - pts[k - 1]
        u, v, a = basis_from(t)
        rings.append([mb.v(p + (u * math.cos(2 * math.pi * s / sides) + v * math.sin(2 * math.pi * s / sides)) * radii[k]) for s in range(sides)])
    for a, b in zip(rings[:-1], rings[1:]):
        for s in range(sides):
            s2 = (s + 1) % sides
            mb.face([a[s], a[s2], b[s2], b[s]], mat)


def add_flower_head(mb, pos, axis, rnd, size=1.0, bud=0.0, n_pet=5):
    bas = basis_from(axis)
    u_, v_, a_ = bas
    off = rnd.uniform(0, 2 * math.pi)
    open_ = 1.0 - bud
    for k in range(n_pet):
        ang = off + 2 * math.pi * k / n_pet + rnd.normal(0, 0.05)
        add_petal(mb, pos, bas, ang, L=0.031 * size * rnd.uniform(0.92, 1.08), W=0.0145 * size * rnd.uniform(0.92, 1.05),
                  lift=0.28 + 0.9 * bud + rnd.uniform(-0.05, 0.08), cup=0.2 + 0.6 * bud, x0=0.003 * size,
                  curl=rnd.uniform(0.0, 0.18) * open_, rnd=rnd)
    # throat tube
    th = [pos - a_ * 0.016 * size, pos - a_ * 0.008 * size, pos + a_ * 0.001 * size]
    add_tube(mb, th, [0.0012 * size, 0.0020 * size, 0.0032 * size], 8, P_THR)
    # stamens: 5 short filaments with tiny anthers
    for k in range(n_pet):
        ang = off + 2 * math.pi * (k + 0.5) / n_pet
        ex = u_ * math.cos(ang) + v_ * math.sin(ang)
        base = pos + ex * 0.0014 * size
        tip = pos + ex * 0.0036 * size + a_ * 0.0075 * size
        add_tube(mb, [base, (base + tip) / 2, tip], [0.00025, 0.00025, 0.00028], 4, P_STAM)
        # anther
        bm_ = mb.bm
        sph = bmesh.ops.create_uvsphere(bm_, u_segments=6, v_segments=4, radius=0.00055 * size)
        for vv in sph["verts"]:
            vv.co += tip
        for f in set(f for vv in sph["verts"] for f in vv.link_faces):
            f.material_index = P_STAM
            f.smooth = True


def build_flower_asset(name, variant, mats):
    rnd = np.random.default_rng(100 + variant)
    mb = MB()
    H = {0: 0.34, 1: 0.28, 2: 0.42}[variant]
    pts = []
    bend = {0: (0.02, 0.01), 1: (0.07, -0.02), 2: (-0.05, 0.03)}[variant]
    for i in range(7):
        t = i / 6
        pts.append(Vector((bend[0] * t * t + 0.004 * math.sin(t * 5), bend[1] * t * t, H * t)))
    add_tube(mb, pts, [0.0017 - 0.0006 * (i / 6) for i in range(7)], 6, P_STEM)
    tip = pts[-1]
    tdir = (pts[-1] - pts[-2]).normalized()
    if variant == 0:
        axis = tdir + Vector((0.35, 0.1, 0.0)); add_flower_head(mb, tip + Vector((0, 0, 0.012)), axis, rnd, 1.0)
        add_leaf(mb, pts[2], Vector((-1, 0.2, 0.55)), 0.075, 0.021, rnd)
        add_leaf(mb, pts[3], Vector((0.9, -0.3, 0.5)), 0.062, 0.018, rnd)
        add_leaf(mb, pts[1], Vector((0.2, 1, 0.5)), 0.07, 0.02, rnd)
    elif variant == 1:
        axis = tdir + Vector((0.8, -0.2, -0.1)); add_flower_head(mb, tip + Vector((0.004, 0, 0.004)), axis, rnd, 0.95)
        # side branch with bud
        bp = [pts[3], pts[3] + Vector((-0.02, 0.01, 0.04)), pts[3] + Vector((-0.045, 0.015, 0.075))]
        add_tube(mb, bp, [0.0011, 0.001, 0.0009], 5, P_STEM)
        add_flower_head(mb, bp[-1] + Vector((-0.004, 0.0, 0.006)), Vector((-0.6, 0.1, 0.8)), rnd, 0.65, bud=0.85)
        add_leaf(mb, pts[2], Vector((-1, -0.3, 0.45)), 0.08, 0.022, rnd)
        add_leaf(mb, pts[4], Vector((1, 0.4, 0.4)), 0.07, 0.02, rnd)
    else:
        axis = tdir + Vector((-0.25, 0.1, -0.15)); add_flower_head(mb, tip + Vector((0, 0, 0.01)), axis, rnd, 1.05)
        bp = [pts[4], pts[4] + Vector((0.03, 0.0, 0.03)), pts[4] + Vector((0.06, 0.01, 0.045))]
        add_tube(mb, bp, [0.0012, 0.0011, 0.001], 5, P_STEM)
        add_flower_head(mb, bp[-1] + Vector((0.005, 0.0, 0.004)), Vector((0.9, 0.0, 0.5)), rnd, 0.9)
        add_leaf(mb, pts[1], Vector((-1, 0.4, 0.5)), 0.09, 0.024, rnd)
        add_leaf(mb, pts[2], Vector((1, -0.5, 0.45)), 0.075, 0.02, rnd)
        add_leaf(mb, pts[3], Vector((-0.3, -1, 0.5)), 0.07, 0.02, rnd)
    obj = mb.finish(name, mats, auto_uv=False)
    # thickness for petals/leaves: solidify then apply (only on sheets)
    bpy.context.view_layer.objects.active = obj
    return obj


def solidify(obj, thickness):
    mod = obj.modifiers.new("solid", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = 0.0
    mod.use_even_offset = False
    dg = bpy.context.evaluated_depsgraph_get()
    me_new = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    obj.modifiers.remove(mod)
    old = obj.data
    obj.data = me_new
    bpy.data.meshes.remove(old)


def build_grass_asset(name, seed, mat):
    rnd = np.random.default_rng(seed)
    mb = MB()
    nb = 7
    for b in range(nb):
        ang = rnd.uniform(0, 2 * math.pi)
        px, py = rnd.normal(0, 0.03, 2)
        h = rnd.uniform(0.22, 0.42)
        bend = rnd.uniform(0.05, 0.22) * h * 3
        wd = rnd.uniform(0.0045, 0.0075)
        d = Vector((math.cos(ang), math.sin(ang), 0))
        side = Vector((-d.y, d.x, 0))
        lean = rnd.uniform(0, 0.12)
        seg = 5
        rows = []
        for i in range(seg + 1):
            t = i / seg
            w = wd * (1 - t ** 1.6) if i < seg else 0.0
            c = Vector((px, py, 0)) + d * (bend * t * t + lean * h * t) + Vector((0, 0, h * (t - 0.12 * t * t)))
            if w > 0:
                rows.append([(mb.v(c - side * w), (0, t)), (mb.v(c + side * w), (1, t))])
            else:
                rows.append([(mb.v(c), (0.5, 1.0))])
        for i in range(seg):
            a, b = rows[i], rows[i + 1]
            if len(b) == 1:
                mb.face([a[0][0], a[1][0], b[0][0]], 0, [a[0][1], a[1][1], b[0][1]])
            else:
                mb.face([a[0][0], a[1][0], b[1][0], b[0][0]], 0, [a[0][1], a[1][1], b[1][1], b[0][1]])
    return mb.finish(name, [mat], auto_uv=False)


def build_petal_asset(name, mat, seed):
    rnd = np.random.default_rng(seed)
    mb = MB()
    bas = basis_from((0, 0, 1))
    add_petal(mb, Vector((-0.02, 0, 0)), bas, 0.0, L=0.045, W=0.021, lift=0.25, cup=0.5, x0=0.0, nu=10, nv=7, curl=0.25, rnd=rnd)
    return mb.finish(name, [mat], auto_uv=False)



def build_branch(name, mats, seed, p0, p1, bow, nl=26):
    """dark leafy branch framing the corner (very close to the lens, out of focus)."""
    rnd = np.random.default_rng(seed)
    mb = MB()
    p0 = Vector(p0); p1 = Vector(p1)
    pts = []
    for i in range(9):
        t = i / 8
        pts.append(p0 + (p1 - p0) * t + Vector((0, 0, 1)) * bow * math.sin(math.pi * t))
    add_tube(mb, pts, [0.006 * (1 - 0.6 * i / 8) for i in range(9)], 6, 0)
    for k in range(nl):
        t = rnd.uniform(0.08, 1.0)
        i = min(7, int(t * 8)); f = t * 8 - i
        base = pts[i] * (1 - f) + pts[i + 1] * f
        ang = rnd.uniform(0, 2 * math.pi)
        d = Vector((math.cos(ang) * 0.9, rnd.uniform(-0.4, 0.5), rnd.uniform(-0.3, 0.7)))
        L = rnd.uniform(0.16, 0.30)
        add_leaf(mb, base, d, L, L * 0.30, rnd, droop=rnd.uniform(0.1, 0.5), mat=1)
    ob = mb.finish(name, mats, auto_uv=False)
    solidify(ob, 0.0007)
    return ob


def mat_foliage():
    m, nt = new_mat("Foliage")
    obj = texcoord(nt, "Object")
    n = noise_tex(nt, obj, 3.0, 5)
    vor = nd(nt, "ShaderNodeTexVoronoi", voronoi_dimensions="3D"); vor.inputs["Scale"].default_value = 5.0
    lk(nt, out_sock(obj), vor.inputs["Vector"])
    col = mixc(nt, (0.010, 0.030, 0.045), (0.035, 0.085, 0.11), mt(nt, "MULTIPLY", vor.outputs["Distance"], n))
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.8; bump.inputs["Distance"].default_value = 0.25
    lk(nt, out_sock(vor.outputs["Distance"]), bump.inputs["Height"])
    b = principled(nt, Base_Color=col, Roughness=0.5)
    lk(nt, bump.outputs["Normal"], b.inputs["Normal"])
    tr = nd(nt, "ShaderNodeBsdfTranslucent"); lk(nt, out_sock(col), tr.inputs["Color"])
    mx = nd(nt, "ShaderNodeMixShader"); mx.inputs["Fac"].default_value = 0.25
    lk(nt, b.outputs[0], mx.inputs[1]); lk(nt, tr.outputs[0], mx.inputs[2])
    mat_output(nt, mx)
    return m


def build_tree_asset(name, kind, seed, mats):
    rnd = np.random.default_rng(seed)
    mb = MB()
    if kind == 0:   # broad-leaf: trunk + displaced blobs
        lathe(mb, 0, 0, [(0.5, -0.5), (0.35, 3.0), (0.25, 6.0), (0.0, 7.0)], 6, 0.0, 0)
        for k in range(7):
            c = Vector((rnd.normal(0, 2.2), rnd.normal(0, 2.2), 7.0 + rnd.uniform(0, 4.5)))
            rad = rnd.uniform(2.6, 4.2)
            res = bmesh.ops.create_icosphere(mb.bm, subdivisions=3, radius=1.0)
            vs = res["verts"]
            for v in vs:
                d = v.co.normalized()
                f = 1.0 + 0.28 * math.sin(d.x * 5.1 + k) * math.cos(d.y * 4.3 - k) + rnd.normal(0, 0.06)
                v.co = c + d * rad * f * Vector((1, 1, 0.8))
            for f in set(f for v in vs for f in v.link_faces):
                f.material_index = 1; f.smooth = True
    else:           # conifer: stacked jagged cones
        lathe(mb, 0, 0, [(0.4, -0.5), (0.25, 8.0), (0.0, 9.0)], 6, 0.0, 0)
        z = 2.0
        for k in range(7):
            rr = 3.6 * (1 - k / 8.5); hh = 3.6
            prof = [(rr, z), (rr * 0.55, z + hh * 0.25), (rr * 0.8, z + hh * 0.3), (rr * 0.3, z + hh * 0.65), (0.0, z + hh * 1.25)]
            lathe(mb, 0, 0, prof, 11, rnd.uniform(0, 1), 1)
            z += 1.9
    return mb.finish(name, mats, auto_uv=False, sharp_angle=60.0)

# ----------------------------------------------------------------------------
# scatter via geometry nodes (points generated with numpy)
# ----------------------------------------------------------------------------
def make_scatter(name, coll, pts, variants, rots, scls, tints, extra_float=None):
    me = bpy.data.meshes.new(name + "_pts")
    n = len(pts)
    me.vertices.add(n)
    me.vertices.foreach_set("co", np.asarray(pts, np.float32).ravel())
    for an, typ, arr in (("variant", "INT", variants), ("rot", "FLOAT_VECTOR", rots), ("scl", "FLOAT_VECTOR", scls), ("tint", "FLOAT", tints)):
        at = me.attributes.new(an, typ, "POINT")
        arr = np.asarray(arr)
        at.data.foreach_set("value" if typ != "FLOAT_VECTOR" else "vector", arr.astype(np.float32 if typ != "INT" else np.int32).ravel())
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    ng = bpy.data.node_groups.new(name + "_GN", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gi = ng.nodes.new("NodeGroupInput"); go = ng.nodes.new("NodeGroupOutput")
    m2p = ng.nodes.new("GeometryNodeMeshToPoints"); m2p.mode = "VERTICES"
    ci = ng.nodes.new("GeometryNodeCollectionInfo")
    ci.transform_space = "RELATIVE"
    ci.inputs["Collection"].default_value = coll
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True
    iop = ng.nodes.new("GeometryNodeInstanceOnPoints")
    iop.inputs["Pick Instance"].default_value = True

    def named(an, dt):
        nn = ng.nodes.new("GeometryNodeInputNamedAttribute"); nn.data_type = dt
        nn.inputs["Name"].default_value = an
        return nn
    nv_ = named("variant", "INT"); nr_ = named("rot", "FLOAT_VECTOR"); ns_ = named("scl", "FLOAT_VECTOR")
    e2r = ng.nodes.new("FunctionNodeEulerToRotation")
    L = ng.links.new
    L(gi.outputs[0], m2p.inputs["Mesh"])
    L(m2p.outputs["Points"], iop.inputs["Points"])
    L(ci.outputs["Instances"], iop.inputs["Instance"])
    L(nv_.outputs["Attribute"], iop.inputs["Instance Index"])
    L(nr_.outputs["Attribute"], e2r.inputs["Euler"])
    L(e2r.outputs["Rotation"], iop.inputs["Rotation"])
    L(ns_.outputs["Attribute"], iop.inputs["Scale"])
    L(iop.outputs["Instances"], go.inputs[0])
    mod = obj.modifiers.new("Scatter", "NODES")
    mod.node_group = ng
    return obj


def sample_cells(weight_fn, xr, yr, cell, n, rnd):
    xs = np.arange(xr[0], xr[1], cell) + cell / 2
    ys = np.arange(yr[0], yr[1], cell) + cell / 2
    X, Y = np.meshgrid(xs, ys)
    w = weight_fn(X, Y) * cell * cell
    p = (w / w.sum()).ravel()
    idx = rnd.choice(len(p), size=n, p=p)
    px = X.ravel()[idx] + rnd.uniform(-cell / 2, cell / 2, n)
    py = Y.ravel()[idx] + rnd.uniform(-cell / 2, cell / 2, n)
    return px, py


def make_collection(name, objs, hide=True):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    for o in objs:
        for cc in list(o.users_collection):
            cc.objects.unlink(o)
        c.objects.link(o)
    return c


# ----------------------------------------------------------------------------
# main build
# ----------------------------------------------------------------------------
def main():
    clear_scene()
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.unit_settings.system = "METRIC"
    world = build_world()

    MATS["ground"] = mat_ground(); MATS["grass"] = mat_grass(); MATS["leaf"] = mat_leaf()
    MATS["petal"] = mat_petal(); MATS["stone"] = mat_stone(); MATS["slate"] = mat_slate()
    MATS["glass"] = mat_glass(); MATS["moon"] = mat_moon()
    MATS["dark"] = mat_simple("DarkRecess", (0.012, 0.014, 0.028), 0.6)
    MATS["metal"] = mat_simple("RoofMetal", (0.12, 0.13, 0.2), 0.3)
    MATS["stem"] = mat_leaf("Stem", (0.03, 0.10, 0.10))
    MATS["stamen"] = mat_simple("Stamen", (0.95, 0.88, 0.45), 0.5, (1.0, 0.85, 0.3), 0.4)
    MATS["throat"] = mat_simple("Throat", (0.80, 0.86, 0.60), 0.5)

    # ---------------- terrain ----------------
    nx, ny = len(GX), len(GY)
    me = bpy.data.meshes.new("Terrain")
    verts = np.stack([GXX.ravel(), GYY.ravel(), GZ.ravel()], 1).astype(np.float32)
    ii, jj = np.meshgrid(np.arange(nx - 1), np.arange(ny - 1))
    a = (jj * nx + ii).ravel()
    faces = np.stack([a, a + 1, a + nx + 1, a + nx], 1)
    me.vertices.add(len(verts)); me.vertices.foreach_set("co", verts.ravel())
    me.loops.add(len(faces) * 4); me.polygons.add(len(faces))
    me.loops.foreach_set("vertex_index", faces.ravel().astype(np.int32))
    me.polygons.foreach_set("loop_start", np.arange(0, len(faces) * 4, 4, dtype=np.int32))
    me.polygons.foreach_set("loop_total", np.full(len(faces), 4, np.int32)) if hasattr(me.polygons[0] if len(me.polygons) else None, "loop_total") else None
    me.update(calc_edges=True)
    me.polygons.foreach_set("use_smooth", np.ones(len(faces), bool))
    me.materials.append(MATS["ground"])
    terrain = bpy.data.objects.new("Terrain", me)
    sc.collection.objects.link(terrain)

    # ---------------- castle ----------------
    castle = build_castle([MATS["stone"], MATS["slate"], MATS["glass"], MATS["dark"], MATS["metal"]])

    # ---------------- assets ----------------
    mats_flower = [MATS["petal"], MATS["stem"], MATS["leaf"], MATS["stamen"], MATS["throat"]]
    flowers = [build_flower_asset(f"FlowerAsset{k}", k, mats_flower) for k in range(3)]
    for f in flowers:
        solidify(f, 0.00022)
    grasses = [build_grass_asset(f"GrassAsset{k}", 40 + k, MATS["grass"]) for k in range(3)]
    petal_assets = [build_petal_asset(f"PetalAsset{k}", MATS["petal"], 60 + k) for k in range(2)]
    for p in petal_assets:
        solidify(p, 0.0002)
    c_flow = make_collection("ASSET_Flowers", flowers)
    c_gr = make_collection("ASSET_Grass", grasses)
    c_pet = make_collection("ASSET_Petals", petal_assets)

    # ---------------- scatter: grass ----------------
    rnd = np.random.default_rng(2024)
    def dens_grass(X, Y):
        d = np.hypot(X, Y - 0.0)
        w = 1.0 / (1 + (d / 10.0) ** 2) + 0.01
        patch = 0.55 + 0.9 * NZ[5].fbm(X / 3.0, Y / 3.0, 2)
        return w * patch * smooth(-2, 4, Y)
    N_GRASS = 170000
    gx, gy = sample_cells(dens_grass, (-70, 70), (-1.0, 240), 0.5, N_GRASS, rnd)
    gz = ground_z(gx, gy) - 0.015
    gsc = rnd.uniform(0.65, 1.5, N_GRASS) * (0.75 + 0.5 * NZ[6].fbm(gx / 5, gy / 5, 2))
    grass_obj = make_scatter("GrassScatter", c_gr, np.stack([gx, gy, gz], 1), rnd.integers(0, 3, N_GRASS),
                             np.stack([rnd.normal(0, 0.06, N_GRASS), rnd.normal(0, 0.06, N_GRASS), rnd.uniform(0, 6.28, N_GRASS)], 1),
                             np.stack([gsc, gsc, gsc * rnd.uniform(0.8, 1.3, N_GRASS)], 1), rnd.random(N_GRASS))
    # ---------------- scatter: flowers ----------------
    def dens_flower(X, Y):
        d = np.hypot(X, Y)
        w = 22.0 / (1 + (d / 9.0) ** 2.0) + 0.5 / (1 + (d / 55.0) ** 2.0)
        patch = smooth(0.36, 0.60, NZ[7].fbm(X / 5.0, Y / 5.0, 3)) * (0.35 + 0.65 * smooth(0.25, 0.6, NZ[5].fbm(X / 22.0 + 5, Y / 22.0, 3)))
        patch = 0.05 + 0.95 * patch
        return w * patch * smooth(0.5, 2.0, Y) * (1 - smooth(130, 210, d))
    N_FLOW = 75000
    fx, fy = sample_cells(dens_flower, (-110, 110), (0.3, 215), 0.45, N_FLOW, rnd)
    fz = ground_z(fx, fy) - 0.02
    fsc = rnd.uniform(0.75, 1.35, N_FLOW) * (1.0 + 0.0 * fx)
    tilt = rnd.normal(0, 0.16, (N_FLOW, 2))
    flow_obj = make_scatter("FlowerScatter", c_flow, np.stack([fx, fy, fz], 1), rnd.integers(0, 3, N_FLOW),
                            np.stack([tilt[:, 0], tilt[:, 1], rnd.uniform(0, 6.28, N_FLOW)], 1),
                            np.stack([fsc, fsc, fsc * rnd.uniform(0.85, 1.2, N_FLOW)], 1), rnd.random(N_FLOW))
    # ---------------- floating petals + motes ----------------
    N_PET = 260
    px = rnd.uniform(-9, 14, N_PET) * (1 + rnd.random(N_PET) * 0.8); py = rnd.uniform(1.2, 55, N_PET)
    pz = ground_z(px, py) + rnd.uniform(0.25, 6.0, N_PET)
    ps = rnd.uniform(1.0, 2.2, N_PET)
    pet_obj = make_scatter("FloatingPetals", c_pet, np.stack([px, py, pz], 1), rnd.integers(0, 2, N_PET),
                           rnd.uniform(0, 6.28, (N_PET, 3)), np.stack([ps, ps, ps], 1), rnd.random(N_PET))
    # hand placed hero flowers close to the lens
    hero = []
    HF = [(0.34, 1.05, 0, 1.7, 0.25), (-0.30, 1.35, 2, 1.5, -0.2), (0.08, 0.78, 1, 1.35, 0.9), (-0.55, 0.9, 0, 1.6, 2.3),
          (0.62, 1.7, 2, 1.8, 1.4), (-0.08, 2.1, 1, 1.5, 4.0), (0.95, 0.85, 1, 1.4, 3.1)]
    for k, (hx, hy, var, sc_, rz) in enumerate(HF):
        o = bpy.data.objects.new(f"HeroFlower{k}", flowers[var].data)
        sc.collection.objects.link(o)
        gz0 = float(ground_z(np.array([hx]), np.array([hy]))[0])
        o.location = (hx, hy, gz0 - 0.01); o.scale = (sc_, sc_, sc_)
        o.rotation_euler = (0.1 * math.sin(k), 0.08 * math.cos(k * 2), rz)
        # per-object tint through instancer attr not available -> object color fallback
        hero.append(o)

    # ---------------- trees (dark silhouettes on the hills / valley sides) ----------------
    MATS["foliage"] = mat_foliage()
    trees = [build_tree_asset(f"TreeAsset{k}", k % 2, 300 + k, [MATS["stem"], MATS["foliage"]]) for k in range(4)]
    c_tree = make_collection("ASSET_Trees", trees)
    def dens_tree(X, Y):
        rc = np.hypot((X - CX) * 0.85, Y - CY)
        forest = smooth(0.50, 0.62, NZ[3].fbm(X / 90.0 + 9, Y / 90.0, 3))
        far = forest * smooth(170, 240, rc) * smooth(110, 200, Y) * (1 - smooth(900, 1500, Y)) * 0.05
        side = smooth(0.45, 0.6, NZ[2].fbm(X / 40.0, Y / 40.0 + 4, 3)) * smooth(55, 95, np.abs(X)) * smooth(25, 60, Y) * (1 - smooth(110, 200, Y)) * 0.02
        return far + side
    N_TREE = 3500
    tx, ty = sample_cells(dens_tree, (-900, 900), (20, 1300), 6.0, N_TREE, rnd)
    tz = ground_z(tx, ty) - 0.3
    tsc = rnd.uniform(0.55, 1.3, N_TREE)
    tree_obj = make_scatter("TreeScatter", c_tree, np.stack([tx, ty, tz], 1), rnd.integers(0, 4, N_TREE),
                            np.stack([np.zeros(N_TREE), np.zeros(N_TREE), rnd.uniform(0, 6.28, N_TREE)], 1),
                            np.stack([tsc, tsc, tsc * rnd.uniform(0.9, 1.3, N_TREE)], 1), rnd.random(N_TREE))

    br1 = build_branch("FG_Branch0", [MATS["stem"], MATS["leaf"]], 5, (-0.8, 0.6, 1.4), (-0.02, 1.5, 1.95), 0.12, 22)
    br2 = build_branch("FG_Branch1", [MATS["stem"], MATS["leaf"]], 6, (-1.3, 1.1, 0.85), (-0.5, 2.4, 1.55), 0.2, 20)

    # ---------------- moon + lights ----------------
    mdir = Vector((math.sin(MOON_AZ) * math.cos(MOON_EL), math.cos(MOON_AZ) * math.cos(MOON_EL), math.sin(MOON_EL)))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=MOON_R, location=mdir * MOON_DIST)
    moon = bpy.context.object; moon.name = "Moon"
    moon.rotation_euler = (math.radians(75), 0, MOON_AZ + math.pi)
    for p in moon.data.polygons:
        p.use_smooth = True
    moon.data.materials.append(MATS["moon"])
    moon.visible_shadow = False
    moon.visible_glossy = False

    def sun(name, direction_to, strength, color, angle_deg, shadow=True):
        ld = bpy.data.lights.new(name, "SUN")
        ld.energy = strength; ld.color = color; ld.angle = math.radians(angle_deg)
        ld.use_shadow = shadow
        ob = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(ob)
        ob.rotation_euler = Vector(direction_to).to_track_quat("Z", "Y").to_euler()
        return ob
    sun("MoonLight", mdir, 4.5, (0.72, 0.80, 1.0), 1.2)
    key_dir = Vector((-0.80, -0.42, 0.48))
    sun("KeyFront", key_dir, 2.4, (0.62, 0.68, 1.0), 4.0)
    for k, (lx, ly, lz) in enumerate(CASTLE_LIGHTS):
        ld = bpy.data.lights.new(f"WinLight{k}", "POINT")
        ld.energy = 9000.0; ld.color = (1.0, 0.62, 0.30); ld.shadow_soft_size = 1.0
        ob = bpy.data.objects.new(f"WinLight{k}", ld)
        ob.location = (CX + lx, CY + ly, Z0 + lz)
        sc.collection.objects.link(ob)

    # ---------------- mist volumes ----------------
    def vol_box(name, loc, scale, builder):
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
        o = bpy.context.object; o.name = name; o.scale = scale
        m, nt = new_mat(name + "_Mat")
        builder(nt)
        o.data.materials.append(m)
        o.visible_shadow = False
        o.hide_select = True
        return o

    def haze(nt):
        v = nd(nt, "ShaderNodeVolumePrincipled")
        v.inputs["Color"].default_value = (0.55, 0.60, 0.95, 1)
        v.inputs["Density"].default_value = 0.00007
        v.inputs["Anisotropy"].default_value = 0.4
        o = nd(nt, "ShaderNodeOutputMaterial")
        lk(nt, v.outputs[0], o.inputs["Volume"])
    hz = vol_box("HazeBox", (0, 1800, 60), (7000, 7000, 280), haze)

    def valley_mist(nt):
        pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
        x, y, z = sepxyz(nt, pos)
        n1 = noise_tex(nt, pos, 0.012, 5, 0.6)
        n2 = noise_tex(nt, pos, 0.05, 3, 0.5)
        # horizontal layer 1: pooled around castle base, layer 2: valley before the rise
        den = math_node_mul(nt, math_node_gauss(nt, z, Z0 - 3.0, 16.0), math_node_gauss(nt, y, CY - 40, 190.0))
        den2 = math_node_mul(nt, math_node_gauss(nt, z, -2.0, 7.0), math_node_gauss(nt, y, 150, 110.0))
        tot = mt(nt, "ADD", den, den2)
        brk = mt(nt, "SUBTRACT", mt(nt, "MULTIPLY", n1, 1.8), 0.35, clamp=True)
        brk = mt(nt, "ADD", brk, mt(nt, "MULTIPLY", n2, 0.35))
        v = nd(nt, "ShaderNodeVolumePrincipled")
        v.inputs["Color"].default_value = (0.62, 0.66, 1.0, 1)
        v.inputs["Anisotropy"].default_value = 0.35
        lk(nt, out_sock(mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", tot, brk), 0.003)), v.inputs["Density"])
        o = nd(nt, "ShaderNodeOutputMaterial")
        lk(nt, v.outputs[0], o.inputs["Volume"])
    vm = vol_box("ValleyMist", (CX * 0.4, 330, Z0 * 0.4 + 0), (1500, 760, 90), valley_mist)
    vm.location = (0, 330, Z0 * 0.45)
    vm.scale = (1500, 760, max(80.0, Z0 * 1.2 + 70))

    # near-ground thin mist (very low density) for the meadow
    def meadow_mist(nt):
        pos = nd(nt, "ShaderNodeNewGeometry").outputs["Position"]
        x, y, z = sepxyz(nt, pos)
        n1 = noise_tex(nt, pos, 0.07, 4, 0.55)
        v = nd(nt, "ShaderNodeVolumePrincipled")
        v.inputs["Color"].default_value = (0.65, 0.70, 1.0, 1)
        v.inputs["Anisotropy"].default_value = 0.3
        base = mt(nt, "MULTIPLY", math_node_gauss(nt, z, 0.5, 1.8), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n1, 0.3, clamp=True), 1.6))
        lk(nt, out_sock(mt(nt, "MULTIPLY", base, 0.045)), v.inputs["Density"])
        o = nd(nt, "ShaderNodeOutputMaterial")
        lk(nt, v.outputs[0], o.inputs["Volume"])
    vol_box("MeadowMist", (0, 80, 3), (200, 200, 7), meadow_mist)

    # ---------------- cameras ----------------
    def make_cam(name, loc, rot_deg, lens, fstop=5.6, focus=9.0, sensor_fit="VERTICAL"):
        cd = bpy.data.cameras.new(name)
        cd.lens = lens; cd.sensor_fit = sensor_fit; cd.sensor_height = 36.0; cd.sensor_width = 36.0
        cd.clip_start = 0.05; cd.clip_end = 30000
        cd.dof.use_dof = True; cd.dof.aperture_fstop = fstop; cd.dof.focus_distance = focus
        ob = bpy.data.objects.new(name, cd)
        sc.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = tuple(math.radians(a) for a in rot_deg)
        return ob
    hero_cam = make_cam("CAM_HERO", (0, 0, CAM_Z), (90 + 6.5, 0, 0), 35, 5.6, 9.5)
    wide_cam = make_cam("CAM_WIDE", (-6, -4, 1.8), (90 + 4.5, 0, -5), 24, 8.0, 14.0, "HORIZONTAL")
    wide_cam.data.sensor_width = 36.0
    fly = make_cam("CAM_FLY", (0.2, -3.0, 0.55), (90 + 3.0, 0, 0), 32, 5.6, 8.0)
    sc.camera = hero_cam
    sc.frame_start, sc.frame_end, sc.render.fps = 1, 144, 24
    for fr, loc, rot, lens, foc in ((1, (0.2, -3.0, 0.55), (93.0, 0, 0.0), 32, 6.5),
                                    (144, (-0.4, 20.0, 1.55), (98.0, 0, -2.0), 35, 14.0)):
        fly.location = loc
        fly.rotation_euler = tuple(math.radians(a) for a in rot)
        fly.data.lens = lens
        fly.data.dof.focus_distance = foc
        fly.keyframe_insert("location", frame=fr); fly.keyframe_insert("rotation_euler", frame=fr)
        fly.data.keyframe_insert("lens", frame=fr); fly.data.dof.keyframe_insert("focus_distance", frame=fr)
    for fc in fly.animation_data.action.layers[0].strips[0].channelbags[0].fcurves if hasattr(fly.animation_data.action, "layers") else fly.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
    # petals drift in the wind (animation only)
    pet_obj.location = (0, 0, 0)
    pet_obj.keyframe_insert("location", frame=1)
    pet_obj.location = (2.0, 1.5, 0.35)
    pet_obj.keyframe_insert("location", frame=144)
    pet_obj.location = (0, 0, 0)

    # ---------------- render + colour management ----------------
    setup_render(sc)
    setup_compositor(sc)
    # hide asset collections from rendering (instances still work through GN)
    for c in (c_flow, c_gr, c_pet, c_tree):
        c.hide_render = True
        c.hide_viewport = True
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    sc.view_settings.exposure = 0.0
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1350

    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    stats(sc)


def math_node_mul(nt, a, b):
    return mt(nt, "MULTIPLY", a, b)


def math_node_gauss(nt, v, c, s):
    d = mt(nt, "DIVIDE", mt(nt, "SUBTRACT", v, c), s)
    return mt(nt, "EXPONENT", mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", d, d), -1.0))


def setup_render(sc):
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = 128
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.adaptive_min_samples = 16
    cy.use_light_tree = True
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    cy.max_bounces = 6; cy.diffuse_bounces = 3; cy.glossy_bounces = 3
    cy.transmission_bounces = 3; cy.volume_bounces = 1; cy.transparent_max_bounces = 4
    cy.caustics_reflective = False; cy.caustics_refractive = False
    cy.sample_clamp_indirect = 8.0
    cy.volume_step_rate = 2.0
    cy.volume_max_steps = 256
    cy.film_exposure = 1.0 if hasattr(cy, "film_exposure") else None
    sc.render.film_transparent = False
    sc.render.use_persistent_data = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_depth = "16"
    sc.render.threads_mode = "AUTO"
    sc.render.use_compositing = True
    sc.render.compositor_device = "CPU"   # no GPU in the container


def setup_compositor(sc):
    ng = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    sc.compositing_node_group = ng
    rl = ng.nodes.new("CompositorNodeRLayers")
    gl = ng.nodes.new("CompositorNodeGlare")
    gl.inputs["Type"].default_value = "Fog Glow"
    gl.inputs["Threshold"].default_value = 1.0
    gl.inputs["Strength"].default_value = 0.55
    gl.inputs["Size"].default_value = 0.65 if "Size" in gl.inputs else None
    go = ng.nodes.new("NodeGroupOutput")
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"])
    ng.links.new(gl.outputs["Image"], go.inputs[0])


def stats(sc):
    nobj = len(bpy.data.objects)
    dg = bpy.context.evaluated_depsgraph_get()
    tris = 0; inst = 0
    for o in bpy.data.objects:
        if o.type == "MESH" and not o.name.endswith("Scatter") and o.name not in ("FloatingPetals",):
            tris += sum(len(p.vertices) - 2 for p in o.data.polygons)
    for i in dg.object_instances:
        if i.is_instance:
            inst += 1
    print(f"STATS objects={nobj} instances={inst} base_tris={tris}")
    for o in bpy.data.objects:
        if o.type == "MESH" and ("Castle" == o.name or "Asset" in o.name or o.name == "Terrain"):
            print("  ", o.name, len(o.data.polygons), "faces")


if __name__ == "__main__":
    main()
