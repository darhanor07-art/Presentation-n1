"""Photoreal procedural 3D eye close-ups (bpy 5.x, Cycles CPU).

  python eyes.py [name ...] [--quick] [--force] [--out DIR]

Units: eyeball radius R = 1.0 BU (~12 mm).  The camera looks along +Y, eye gazes toward -Y.
Outputs 1200x420 PNG masters in renders/spring/eyes/ (skipped if they exist, use --force).
--quick renders 600x210 / 24 spp into the scratchpad-style preview folder renders/spring/_preview/.
"""
import sys, os, math, time
import numpy as np
import bpy, bmesh
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from nodeutil import *

HERE = os.path.dirname(os.path.abspath(__file__))
MID = "--mid" in sys.argv
QUICK = "--quick" in sys.argv or MID
FORCE = "--force" in sys.argv
OUTDIR = os.path.join(HERE, "renders", "spring", "_preview" if QUICK else "eyes")
if "--out" in sys.argv:
    OUTDIR = sys.argv[sys.argv.index("--out") + 1]
os.makedirs(OUTDIR, exist_ok=True)
SMOOTH = lambda a, b, x: (lambda t: t * t * (3 - 2 * t))(min(1.0, max(0.0, (x - a) / (b - a))))

EXPOSURE = -2.5
RI = 0.53            # iris radius
RC, YC = 0.741, -0.379   # cornea sphere radius / centre (apex at y=-1.12)

# ----------------------------------------------------------------------------
# characters
# ----------------------------------------------------------------------------
WHO = {
    "aiaru": dict(  # grey-violet iris, soft female eye
        iris_outer=(0.13, 0.11, 0.26), iris_fibre_lo=(0.035, 0.03, 0.10), iris_fibre_hi=(0.36, 0.32, 0.60),
        iris_inner=(0.34, 0.24, 0.27), limbal=(0.035, 0.03, 0.085),
        skin=(0.86, 0.54, 0.45), lash_len=0.50, lash_n=110, lash_low=0.26, tilt=0.075, W=1.25, lid_t=0.20),
    "tair": dict(   # deep blue iris, narrower male eye
        iris_outer=(0.025, 0.10, 0.52), iris_fibre_lo=(0.008, 0.03, 0.20), iris_fibre_hi=(0.12, 0.34, 0.85),
        iris_inner=(0.20, 0.26, 0.42), limbal=(0.006, 0.014, 0.07),
        skin=(0.74, 0.47, 0.38), lash_len=0.34, lash_n=84, lash_low=0.13, tilt=0.045, W=1.22, lid_t=0.24),
}

# name -> (who, upper, lower, yaw_deg, pitch_deg(+up), pupil)
JOBS = {
    "aiaru_open":        ("aiaru", 0.38, 0.46, 0, 0, 0.31),
    "aiaru_wide":        ("aiaru", 0.86, 0.58, 0, 0, 0.30),
    "aiaru_half":        ("aiaru", 0.14, 0.38, 0, -4, 0.42),
    "aiaru_closed":      ("aiaru", -0.30, 0.30, 0, 0, 0.40),
    "aiaru_glance_up":   ("aiaru", 0.60, 0.40, 14, 20, 0.34),
    "tair_open":         ("tair", 0.48, 0.38, 0, 0, 0.34),
    "tair_narrow":       ("tair", 0.24, 0.20, 0, 0, 0.27),
    "tair_glance":       ("tair", 0.42, 0.36, -22, 2, 0.33),
}
for i, p in enumerate([0.60, 0.50, 0.41, 0.33, 0.26, 0.19]):
    JOBS[f"aiaru_pupil_{i}"] = ("aiaru", 0.52, 0.46, 0, 0, p)


# ----------------------------------------------------------------------------
# scene
# ----------------------------------------------------------------------------
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.01
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 8; cy.diffuse_bounces = 3; cy.glossy_bounces = 4
    cy.transmission_bounces = 8; cy.transparent_max_bounces = 12
    cy.caustics_reflective = False; cy.caustics_refractive = False
    cy.sample_clamp_indirect = 6.0
    cy.use_light_tree = True
    sc.render.compositor_device = "CPU"
    sc.render.use_persistent_data = False
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    w = bpy.data.worlds.new("W")
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.03, 0.03, 0.10, 1)
    bg.inputs["Strength"].default_value = 1.0
    return sc


def make_skin_mat():
    m, nt = new_mat("Skin")
    reg = attr_node(nt, "reg").outputs["Fac"]
    obj = texcoord(nt, "Object")
    base_c = nd(nt, "ShaderNodeRGB"); base_c.name = "SKINCOL"
    base_c.outputs[0].default_value = (0.8, 0.58, 0.52, 1)
    blotch = noise_tex(nt, obj, 1.6, 4, 0.6)
    col = mixc(nt, base_c.outputs[0], (0.70, 0.45, 0.46), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", blotch, 0.4, clamp=True), 0.8))
    # warm flush and eyelid pinkness near margin
    col = mixc(nt, col, (0.62, 0.22, 0.24), mt(nt, "MULTIPLY", reg, 0.85, clamp=True))
    pores = noise_tex(nt, obj, 65.0, 2, 0.5)
    fine = noise_tex(nt, obj, 220.0, 1, 0.5)
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.012
    lk(nt, out_sock(mt(nt, "ADD", pores, mt(nt, "MULTIPLY", fine, 0.5))), bump.inputs["Height"])
    b = principled(nt, Base_Color=col, Roughness=0.42)
    b.inputs["Subsurface Weight"].default_value = 0.35
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.34, 0.22)
    b.inputs["Subsurface Scale"].default_value = 0.04
    b.inputs["Specular IOR Level"].default_value = 0.55
    b.inputs["Sheen Weight"].default_value = 0.35
    lk(nt, bump.outputs["Normal"], b.inputs["Normal"])
    mat_output(nt, b)
    return m


def make_lash_mat():
    m, nt = new_mat("Lash")
    b = principled(nt, Base_Color=(0.010, 0.007, 0.010), Roughness=0.32)
    b.inputs["Specular IOR Level"].default_value = 0.7
    mat_output(nt, b)
    return m


def make_sclera_mat():
    m, nt = new_mat("Sclera")
    obj = texcoord(nt, "Object")
    x, y, z = sepxyz(nt, obj)
    rho = mt(nt, "SQRT", mt(nt, "ADD", mt(nt, "MULTIPLY", x, x), mt(nt, "MULTIPLY", z, z)))
    # redness/yellowing towards the corners
    side = sstep(nt, mt(nt, "ABSOLUTE", x), 0.45, 0.97)
    n1 = noise_tex(nt, obj, 3.0, 3, 0.5)
    base = mixc(nt, (0.70, 0.69, 0.73), (0.74, 0.60, 0.58), mt(nt, "MULTIPLY", side, 0.9, clamp=True))
    # soft grey-blue shading around the limbus
    limb = sstep(nt, rho, RI * 1.55, RI * 1.0)
    base = mixc(nt, base, (0.45, 0.45, 0.55), mt(nt, "MULTIPLY", limb, 0.55))
    # veins: thin ridged noise lines, denser near the corners
    def veins(scale, w, dist):
        n = noise_tex(nt, obj, scale, 3, 0.55, dist)
        d = mt(nt, "ABSOLUTE", mt(nt, "SUBTRACT", n, 0.5))
        return mt(nt, "SUBTRACT", 1.0, mt(nt, "DIVIDE", d, w), clamp=True)
    v1 = veins(5.0, 0.045, 2.2)
    v2 = veins(11.0, 0.035, 1.4)
    amount = mt(nt, "ADD", mt(nt, "MULTIPLY", side, 1.3), 0.3)
    amount = mt(nt, "MULTIPLY", amount, sstep(nt, rho, RI * 1.25, RI * 2.0))
    vein = mt(nt, "MULTIPLY", mt(nt, "ADD", mt(nt, "MULTIPLY", v1, 0.8), mt(nt, "MULTIPLY", v2, 0.45)), amount)
    base = mixc(nt, base, (0.55, 0.10, 0.14), mt(nt, "MULTIPLY", vein, 0.75, clamp=True))
    base = mixc(nt, base, (0.72, 0.68, 0.60), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", n1, 0.5, clamp=True), 0.35))
    b = principled(nt, Base_Color=base, Roughness=0.22)
    b.inputs["Subsurface Weight"].default_value = 0.25
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.4, 0.3)
    b.inputs["Subsurface Scale"].default_value = 0.05
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.015
    b.inputs["Coat IOR"].default_value = 1.38
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.1; bump.inputs["Distance"].default_value = 0.01
    lk(nt, noise_tex(nt, obj, 25.0, 3), bump.inputs["Height"])
    lk(nt, bump.outputs["Normal"], b.inputs["Normal"])
    mat_output(nt, b)
    return m


def make_iris_mat(who):
    P = WHO[who]
    m, nt = new_mat("Iris")
    obj = texcoord(nt, "Object")
    x, y, z = sepxyz(nt, obj)
    r = mt(nt, "DIVIDE", mt(nt, "SQRT", mt(nt, "ADD", mt(nt, "MULTIPLY", x, x), mt(nt, "MULTIPLY", z, z))), RI)
    ang = mt(nt, "ARCTAN2", z, x)
    pupil = nd(nt, "ShaderNodeValue"); pupil.name = "PUPIL"; pupil.outputs[0].default_value = 0.35
    p = pupil.outputs[0]
    # radial coordinate stretched between pupil edge and limbus (iris fibres stretch as the pupil dilates)
    rn = mt(nt, "DIVIDE", mt(nt, "SUBTRACT", r, p), mt(nt, "SUBTRACT", 1.0, p), clamp=True)
    ca, sa = mt(nt, "COSINE", ang), mt(nt, "SINE", ang)
    def fibre(S, kr, seed, rough=0.62, det=6.0):
        v = combxyz(nt, mt(nt, "ADD", mt(nt, "MULTIPLY", ca, S), seed), mt(nt, "MULTIPLY", sa, S), mt(nt, "MULTIPLY", rn, kr))
        return noise_tex(nt, v, 1.0, det, rough)
    f1 = fibre(7.0, 1.6, 0.0)
    f2 = fibre(17.0, 2.6, 31.0, 0.7, 4.0)
    f3 = fibre(40.0, 3.5, 77.0, 0.5, 2.0)
    fib = mt(nt, "ADD", mt(nt, "ADD", mt(nt, "MULTIPLY", f1, 0.5), mt(nt, "MULTIPLY", f2, 0.32)), mt(nt, "MULTIPLY", f3, 0.18))
    fibc = mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", fib, 0.30), 3.4, clamp=True)
    # collarette: wavy ring about a third of the way out
    wob = mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", fibre(3.0, 0.0, 13.0, 0.5, 2.0), 0.5), 0.12)
    cdist = mt(nt, "ABSOLUTE", mt(nt, "SUBTRACT", mt(nt, "ADD", rn, wob), 0.30))
    collar = mt(nt, "SUBTRACT", 1.0, mt(nt, "MULTIPLY", cdist, 7.0), clamp=True)
    inner_zone = sstep(nt, mt(nt, "ADD", rn, wob), 0.42, 0.20)
    # crypts: dark pits just outside the collarette
    vor = nd(nt, "ShaderNodeTexVoronoi", voronoi_dimensions="3D")
    lk(nt, combxyz(nt, mt(nt, "MULTIPLY", ca, 5.0), mt(nt, "MULTIPLY", sa, 5.0), mt(nt, "MULTIPLY", rn, 4.0)), vor.inputs["Vector"])
    vor.inputs["Scale"].default_value = 1.4
    crypt = mt(nt, "SUBTRACT", 1.0, mt(nt, "DIVIDE", vor.outputs["Distance"], 0.28), clamp=True)
    crypt = mt(nt, "MULTIPLY", crypt, mt(nt, "MULTIPLY", sstep(nt, rn, 0.28, 0.40), sstep(nt, rn, 0.85, 0.55)))
    # colour
    col = mixc(nt, P["iris_fibre_lo"], P["iris_outer"], mt(nt, "MULTIPLY", fibc, 1.0, clamp=True))
    col = mixc(nt, col, P["iris_fibre_hi"], mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", fibc, 0.75, clamp=True), 2.6, clamp=True))
    col = mixc(nt, col, P["iris_inner"], mt(nt, "MULTIPLY", inner_zone, mt(nt, "ADD", 0.45, mt(nt, "MULTIPLY", fibc, 0.5))))
    col = mixc(nt, col, P["iris_fibre_hi"], mt(nt, "MULTIPLY", collar, 0.5))
    col = mixc(nt, col, P["iris_fibre_lo"], mt(nt, "MULTIPLY", crypt, 0.8))
    # limbal ring + pupillary ruff
    limb = sstep(nt, rn, 0.66, 0.97)
    col = mixc(nt, col, P["limbal"], mt(nt, "MULTIPLY", limb, 0.98))
    ruff = sstep(nt, rn, 0.10, 0.0)
    col = mixc(nt, col, (0.01, 0.008, 0.012), mt(nt, "MULTIPLY", ruff, 0.7))
    # pupil hole (soft)
    pmask = sstep(nt, r, mt(nt, "ADD", p, 0.012), mt(nt, "SUBTRACT", p, 0.012))   # 1 inside pupil
    col = mixc(nt, col, (0.002, 0.002, 0.004), pmask)
    # fake corneal caustic: light focused on the side opposite the key light
    opp = mt(nt, "DIVIDE", mt(nt, "SUBTRACT", mt(nt, "MULTIPLY", x, 0.55), mt(nt, "MULTIPLY", z, 0.8)), RI)
    caus = mt(nt, "MULTIPLY", sstep(nt, opp, -0.05, 0.85), mt(nt, "MULTIPLY", sstep(nt, rn, 0.12, 0.45), sstep(nt, rn, 1.0, 0.8)))
    caus = mt(nt, "MULTIPLY", caus, mt(nt, "SUBTRACT", 1.0, pmask))
    b = principled(nt, Base_Color=col, Roughness=0.38)
    b.inputs["Specular IOR Level"].default_value = 0.45
    b.inputs["Subsurface Weight"].default_value = 0.35
    b.inputs["Subsurface Radius"].default_value = (0.6, 0.6, 0.9)
    b.inputs["Subsurface Scale"].default_value = 0.05
    lk(nt, out_sock(col), b.inputs["Emission Color"])
    lk(nt, out_sock(mt(nt, "ADD", mt(nt, "MULTIPLY", caus, 0.6), mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", 1.0, pmask), 0.05))), b.inputs["Emission Strength"])
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.5; bump.inputs["Distance"].default_value = 0.02
    lk(nt, out_sock(mt(nt, "MULTIPLY", mt(nt, "SUBTRACT", mt(nt, "ADD", fib, mt(nt, "MULTIPLY", collar, 0.25)), mt(nt, "MULTIPLY", crypt, 0.5)), mt(nt, "SUBTRACT", 1.0, pmask, clamp=True))), bump.inputs["Height"])
    lk(nt, bump.outputs["Normal"], b.inputs["Normal"])
    mat_output(nt, b)
    return m


def make_glass_mat(name, ior, rough):
    """Glass for camera rays (refraction/reflection), invisible to light/shadow rays so the
    inside is lit normally (cheap, noise free 'wet cornea')."""
    m, nt = new_mat(name)
    lp = nd(nt, "ShaderNodeLightPath")
    g = nd(nt, "ShaderNodeBsdfGlass")
    g.inputs["IOR"].default_value = ior
    g.inputs["Roughness"].default_value = rough
    g.inputs["Color"].default_value = (1, 1, 1, 1)
    t = nd(nt, "ShaderNodeBsdfTransparent")
    mx = nd(nt, "ShaderNodeMixShader")
    lk(nt, lp.outputs["Is Camera Ray"], mx.inputs["Fac"])
    lk(nt, t.outputs[0], mx.inputs[1]); lk(nt, g.outputs[0], mx.inputs[2])
    mat_output(nt, mx)
    return m


def make_flesh_mat():
    m, nt = new_mat("Caruncle")
    b = principled(nt, Base_Color=(0.62, 0.22, 0.24), Roughness=0.18)
    b.inputs["Subsurface Weight"].default_value = 0.5
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.3, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.05
    b.inputs["Coat Weight"].default_value = 0.8
    b.inputs["Coat Roughness"].default_value = 0.03
    mat_output(nt, b)
    return m


def emit_mat(name, color, strength):
    m, nt = new_mat(name)
    e = nd(nt, "ShaderNodeEmission")
    e.inputs["Color"].default_value = (*color, 1)
    e.inputs["Strength"].default_value = strength
    mat_output(nt, e)
    return m


def add_panel(name, loc, size, color, strength, target=(0, 0, 0), circle=False):
    """emissive soft-box / moon disc that shows up in the cornea reflection but not to the camera"""
    if circle:
        n = 48
        verts = [(0, 0, 0)] + [(size * math.cos(2 * math.pi * k / n), size * math.sin(2 * math.pi * k / n), 0) for k in range(n)]
        faces = [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)]
    else:
        verts = [(-size, -size, 0), (size, -size, 0), (size, size, 0), (-size, size, 0)]
        faces = [(0, 1, 2, 3)]
    ob = mesh_obj(name, verts, faces, [emit_mat(name, color, strength)], smooth=False)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("Z", "Y").to_euler()
    ob.visible_camera = False
    ob.visible_shadow = False
    return ob


# ----------------------------------------------------------------------------
# geometry: eyelid / skin surface
# ----------------------------------------------------------------------------
def base_curve(t, p=2.1):
    return max(0.0, 1 - abs(t) ** p) ** 0.85


def aperture_z(t, up, low, tilt):
    """upper / lower margin height at normalised horizontal position t (inner corner = -1)."""
    sk = -0.20
    tu = (t - sk) / (1 - sk) if t >= sk else (t - sk) / (1 + sk)
    sl = 0.22
    tl = (t - sl) / (1 - sl) if t >= sl else (t - sl) / (1 + sl)
    zl = -low * base_curve(tl) + tilt * t
    zu = up * base_curve(tu) + tilt * t
    return max(zu, zl + 0.012), zl


def skin_y(x, z, lid_t):
    """front surface of the skin: hugs the globe near the aperture, flattens into the face further out."""
    rho = math.hypot(x, z)
    yh = -(math.sqrt(max(1.0 - min(rho, 0.985) ** 2, 0.0)) + lid_t)
    yb = -(0.36 + 0.16 * math.exp(-((z - 2.2) / 0.9) ** 2) + 0.05 * math.exp(-((x + 3.4) / 1.0) ** 2) * 0
           - 0.02 * math.exp(-((z + 1.9) / 0.9) ** 2)) + 0.012 * (x * x)
    w = SMOOTH(0.55, 1.5, rho)
    return yh * (1 - w) + yb * w


def build_lids(who, up, low, pitch):
    P = WHO[who]
    W, tilt, lt = P["W"], P["tilt"], P["lid_t"]
    # lids follow the gaze a little (upper lid rides the eyeball)
    pu = 0.0 if up < 0.2 else 0.012 * pitch
    pl = 0.003 * pitch
    up_e, low_e = up + pu, low - pl
    N = 56
    ts = [-1 + 2 * (k / (N - 1)) for k in range(N)]
    # closed loop: upper inner->outer, lower outer->inner (corners shared)
    loop = [(t, True) for t in ts] + [(t, False) for t in reversed(ts[1:-1])]
    L = len(loop)

    def margin(t, upper, ref=False):
        u0, l0 = (0.52, 0.46) if ref else (up_e, low_e)
        zu, zl = aperture_z(t, u0, l0, tilt)
        return (t * W, zu if upper else zl)

    def outdir(x, z):
        v = np.array([x / (W * W), (z - 0.0) / 0.30])
        return v / (np.linalg.norm(v) + 1e-9)

    rr = 0.062
    S = [0, 0.02, 0.05, 0.09, 0.14, 0.2, 0.27, 0.35, 0.43, 0.5, 0.57, 0.64, 0.72, 0.82, 0.95, 1.1, 1.3, 1.55, 1.9, 2.4, 3.0, 3.8, 5.0]
    inner_s = [0.7, 0.4, 0.2, 0.08]
    rim_psi = [math.pi * k / 6 for k in range(1, 6)][::-1]   # near inner -> near outer skin
    verts, faces, reg = [], [], []
    rings = []   # list of lists of vertex indices

    def add_ring(fn, rv):
        idx = []
        for (t, upper) in loop:
            p = fn(t, upper)
            verts.append(p)
            reg.append(rv(t, upper) if callable(rv) else rv)
            idx.append(len(verts) - 1)
        rings.append(idx)

    def skin_pos(s):
        def fn(t, upper):
            ax, az = margin(t, upper)
            rx, rz = margin(t, upper, True)
            w = SMOOTH(0.0, 0.8, s)
            px = ax * (1 - w) + rx * w
            pz = az * (1 - w) + rz * w
            dx, dz = outdir(ax, az if upper else az)
            if not upper:
                pass
            px += dx * s; pz += dz * s
            y = skin_y(px, pz, lt)
            # eyelid crease (upper lid) + subtle fold under the lower lid
            if upper:
                y += 0.07 * math.exp(-((s - 0.5) / 0.09) ** 2) * (1.0 if up_e > -0.1 else 0.5)
                y -= 0.05 * math.exp(-((s - 0.2) / 0.3) ** 2) * SMOOTH(0.0, 0.3, up_e)
            else:
                y += 0.03 * math.exp(-((s - 0.55) / 0.12) ** 2)
            return (px, y, pz)
        return fn

    def rim_pos(psi):
        def fn(t, upper):
            ax, az = margin(t, upper)
            dx, dz = outdir(ax, az)
            yo = skin_y(ax, az, lt)
            off = -rr * math.sin(psi)
            return (ax + dx * off, yo + rr - rr * math.cos(psi), az + dz * off)
        return fn

    def inner_pos(s):
        def fn(t, upper):
            ax, az = margin(t, upper)
            dx, dz = outdir(ax, az)
            yo = skin_y(ax, az, lt)
            px, pz = ax + dx * s * 0.8, az + dz * s * 0.8
            return (px, max(yo + 2 * rr, skin_y(px, pz, lt) + 2 * rr) + s * 0.25, pz)
        return fn

    for s in inner_s:
        add_ring(inner_pos(s), 1.0)
    for psi in rim_psi:
        add_ring(rim_pos(psi), 1.0)
    for s in S:
        add_ring(skin_pos(s), max(0.0, 1 - s / 0.12) * 0.55)
    for a, b in zip(rings[:-1], rings[1:]):
        for i in range(L):
            j = (i + 1) % L
            faces.append((a[i], a[j], b[j], b[i]))
    ob = mesh_obj("Skin", verts, faces, [SKIN_MAT], smooth=True)
    at = ob.data.attributes.new("reg", "FLOAT", "POINT")
    at.data.foreach_set("value", reg)
    # orientation: make normals point at the camera (-Y)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    f0 = min(bm.faces, key=lambda f: abs(f.calc_center_median().x) + abs(f.calc_center_median().z - 1.6))
    if f0.normal.y > 0:
        for f in bm.faces:
            f.normal_flip()
    bm.to_mesh(ob.data); bm.free()
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = 2; sub.render_levels = 2
    ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons))

    # ---- lashes ----
    rng = np.random.default_rng(5)
    lv, lf = [], []

    def tube(pts, r0, r1):
        pts = [np.array(p, float) for p in pts]
        ring_idx = []
        for k, p in enumerate(pts):
            T = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)])
            T = T / (np.linalg.norm(T) + 1e-9)
            ref = np.array([1.0, 0, 0]) if abs(T[0]) < 0.8 else np.array([0, 0, 1.0])
            n1 = np.cross(T, ref); n1 /= np.linalg.norm(n1)
            n2 = np.cross(T, n1)
            r = r0 + (r1 - r0) * (k / (len(pts) - 1)) ** 0.8
            idx = []
            for a in range(4):
                th = a * math.pi / 2
                lv.append(tuple(p + r * (n1 * math.cos(th) + n2 * math.sin(th))))
                idx.append(len(lv) - 1)
            ring_idx.append(idx)
        for a, b in zip(ring_idx[:-1], ring_idx[1:]):
            for i in range(4):
                j = (i + 1) % 4
                lf.append((a[i], a[j], b[j], b[i]))

    def lash(t, upper, length, w0, curl, jitter, lat_j=0.0):
        ax, az = margin(t, upper)
        dx, dz = outdir(ax, az)
        e1 = np.array([dx, 0, dz])             # outward in the lid plane
        e2 = np.array([0, -1.0, 0])             # forward
        e3 = np.array([-dz, 0, dx])             # along the margin
        e3 = e3 * (1 if upper else -1)
        base = np.array([ax, skin_y(ax, az, lt) + rr * 0.55, az])
        spread = (0.55 if upper else 0.35) * t + lat_j
        drift = rng.normal(0, 0.22)
        pts = [base]; p = base.copy(); n = 8
        for k in range(n):
            u = k / (n - 1)
            om = math.radians(w0 - curl * u + jitter * 8)
            d = e1 * math.cos(om) + e2 * math.sin(om) + np.array([1, 0, 0]) * (spread * (0.4 + u) * 0.6 + drift * u * u)
            d = d / np.linalg.norm(d)
            p = p + d * (length / (n - 1)); pts.append(p.copy())
        tube(pts, 0.0062, 0.0011)

    nu = P["lash_n"]
    for k in range(nu):
        t = -0.78 + 1.74 * (k + rng.uniform(-0.3, 0.3)) / (nu - 1)
        t = max(-0.95, min(0.97, t))
        lenf = 0.55 + 0.45 * math.sin(math.pi * (t + 1.0) / 2.0) ** 0.8 + 0.25 * SMOOTH(0.3, 1.0, t)
        if t < -0.75:
            lenf *= 0.55
        length = P["lash_len"] * lenf * rng.uniform(0.82, 1.15)
        if k % 4 == 0:
            length *= 1.22
        lash(t, True, length, 62 + rng.uniform(-12, 12), 58 + rng.uniform(-14, 14), rng.normal(0, 0.9), rng.normal(0, 0.18))
    nl = int(nu * 0.55)
    for k in range(nl):
        t = -0.7 + 1.55 * (k + rng.uniform(-0.3, 0.3)) / (nl - 1)
        length = P["lash_low"] * (0.5 + 0.5 * math.sin(math.pi * (t + 0.9) / 2.0)) * rng.uniform(0.7, 1.1) * 0.8
        lash(t, False, length, 50 + rng.uniform(-10, 10), 40 + rng.uniform(-10, 10), rng.normal(0, 0.9), rng.normal(0, 0.15))
    lo = mesh_obj("Lashes", lv, lf, [LASH_MAT], smooth=True)

    # ---- tear meniscus: thin glossy line on the lower lid margin ----
    mv, mf = [], []
    pts = []
    for t in np.linspace(-0.72, 0.72, 40):
        ax, az = margin(t, False)
        dx, dz = outdir(ax, az)
        yo = skin_y(ax, az, lt)
        pts.append((ax - dx * (rr + 0.012), yo + rr + 0.02, az - dz * (rr + 0.012)))
    rings_ = []
    for k, p in enumerate(pts):
        idx = []
        for a in range(6):
            th = a * math.pi / 3
            mv.append((p[0], p[1] + 0.017 * math.sin(th), p[2] + 0.017 * math.cos(th) + 0.0))
            idx.append(len(mv) - 1)
        rings_.append(idx)
    for a, b in zip(rings_[:-1], rings_[1:]):
        for i in range(6):
            j = (i + 1) % 6
            mf.append((a[i], a[j], b[j], b[i]))
    me_ = mesh_obj("Meniscus", mv, mf, [MENISCUS_MAT], smooth=True)

    # caruncle (pink inner corner)
    cx = -W * 0.88
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1.0,
                                         location=(cx, skin_y(cx, 0, lt) + 0.14, -0.04 + tilt * -0.9))
    car = bpy.context.object; car.name = "Caruncle"
    car.scale = (0.17, 0.12, 0.15)
    car.data.materials.append(FLESH_MAT)
    for p_ in car.data.polygons:
        p_.use_smooth = True
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1.0, location=(0, 0.1, 0))
    bk = bpy.context.object; bk.name = "Backdrop"; bk.scale = (1.6, 0.3, 0.8)
    bk.data.materials.append(BACK_MAT)
    return [ob, lo, me_, car, bk]


def build_eye(who, pupil, yaw, pitch):
    """eyeball group (sclera + iris + cornea), rotated by the gaze empty."""
    gaze = bpy.data.objects.new("Gaze", None)
    bpy.context.scene.collection.objects.link(gaze)
    gaze.rotation_euler = (math.radians(-pitch), 0, math.radians(yaw))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=1.0, location=(0, 0, 0))
    scl = bpy.context.object; scl.name = "Sclera"
    scl.data.materials.append(make_sclera_mat())
    for p_ in scl.data.polygons:
        p_.use_smooth = True
    # the anterior pole is replaced by the (separate) cornea: flatten it behind the iris plane
    for v in scl.data.vertices:
        if v.co.y < -0.86:
            v.co.y = -0.86
    scl.parent = gaze

    # iris disc (full disc, pupil is a shader hole), slightly conical
    nr, na = 14, 96
    verts = [(0, -0.92, 0)]
    faces = []
    for i in range(1, nr + 1):
        rr_ = RI * i / nr
        yy = -0.925 + 0.032 * (i / nr)
        for k in range(na):
            a = 2 * math.pi * k / na
            verts.append((rr_ * math.cos(a), yy, rr_ * math.sin(a)))
    for k in range(na):
        faces.append((0, 1 + (k + 1) % na, 1 + k))
    for i in range(1, nr):
        for k in range(na):
            a, b = 1 + (i - 1) * na + k, 1 + (i - 1) * na + (k + 1) % na
            faces.append((a, b, b + na, a + na))
    iris = mesh_obj("Iris", verts, faces, [make_iris_mat(who)], smooth=True)
    iris.parent = gaze
    for n in iris.data.materials[0].node_tree.nodes:
        if n.name == "PUPIL":
            n.outputs[0].default_value = pupil
    # fix normals toward -Y
    bm = bmesh.new(); bm.from_mesh(iris.data); bm.faces.ensure_lookup_table()
    if bm.faces[0].normal.y > 0:
        for f in bm.faces:
            f.normal_flip()
    bm.to_mesh(iris.data); bm.free()

    # cornea cap
    amax = math.asin(0.625 / RC)
    na2, nr2 = 96, 28
    verts = [(0, YC - RC, 0)]
    faces = []
    for i in range(1, nr2 + 1):
        al = amax * i / nr2
        for k in range(na2):
            a = 2 * math.pi * k / na2
            verts.append((RC * math.sin(al) * math.cos(a), YC - RC * math.cos(al), RC * math.sin(al) * math.sin(a)))
    for k in range(na2):
        faces.append((0, 1 + (k + 1) % na2, 1 + k))
    for i in range(1, nr2):
        for k in range(na2):
            a, b = 1 + (i - 1) * na2 + k, 1 + (i - 1) * na2 + (k + 1) % na2
            faces.append((a, b, b + na2, a + na2))
    cor = mesh_obj("Cornea", verts, faces, [CORNEA_MAT], smooth=True)
    cor.parent = gaze
    bm = bmesh.new(); bm.from_mesh(cor.data); bm.faces.ensure_lookup_table()
    if bm.faces[0].normal.y > 0:
        for f in bm.faces:
            f.normal_flip()
    bm.to_mesh(cor.data); bm.free()
    return gaze


def setup_camera(W, H):
    cd = bpy.data.cameras.new("Cam")
    cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36.0
    cd.lens = 100.0
    frame_w = 5.5
    dist = frame_w * cd.lens / cd.sensor_width
    cd.dof.use_dof = True
    cd.dof.focus_distance = dist - 0.95
    cd.dof.aperture_fstop = 9.0
    ob = bpy.data.objects.new("Cam", cd)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = (0.0, -dist, 0.0)
    ob.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.scene.camera = ob
    return ob


def add_lights(who):
    # moon-disc catch-light (visible in the cornea) + invisible-to-reflection soft area lights
    add_panel("KeyMoon", (-6.5, -8.5, 6.0), 1.9, (0.80, 0.85, 1.0), 70.0, circle=True)
    add_panel("Sparkle", (7.5, -9.0, -3.5), 0.9, (0.85, 0.9, 1.0), 25.0, circle=True)
    for nm, loc, size, col, pw in (("KeyArea", (-8.0, -8.0, 8.0), 7.0, (0.74, 0.82, 1.0), 2200.0),
                                   ("RimR", (9.0, -2.0, 3.0), 4.0, (0.55, 0.62, 1.0), 900.0),
                                   ("WarmFill", (4.0, -9.0, -5.0), 5.0, (1.0, 0.78, 0.62), 60.0),
                                   ("FillLow", (-3.0, -9.0, -6.5), 6.0, (0.78, 0.65, 1.0), 60.0)):
        ld = bpy.data.lights.new(nm, "AREA"); ld.shape = "SQUARE"; ld.size = size; ld.energy = pw; ld.color = col
        ob = bpy.data.objects.new(nm, ld); bpy.context.scene.collection.objects.link(ob); ob.location = loc
        ob.visible_glossy = False
        ob.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


def render_job(name, who, up, low, yaw, pitch, pupil):
    path = os.path.join(OUTDIR, name + ".png")
    if os.path.exists(path) and not FORCE and not QUICK:
        print("SKIP", name, flush=True)
        return
    global SKIN_MAT, LASH_MAT, MENISCUS_MAT, CORNEA_MAT, FLESH_MAT, BACK_MAT
    sc = reset()
    SKIN_MAT = make_skin_mat(); LASH_MAT = make_lash_mat(); FLESH_MAT = make_flesh_mat()
    BACK_MAT, _nt = new_mat('Back'); mat_output(_nt, principled(_nt, Base_Color=(0.25, 0.07, 0.09), Roughness=0.6))
    CORNEA_MAT = make_glass_mat("Cornea", 1.376, 0.0)
    MENISCUS_MAT = make_glass_mat("Meniscus", 1.33, 0.02)
    for n in SKIN_MAT.node_tree.nodes:
        if n.name == "SKINCOL":
            n.outputs[0].default_value = (*WHO[who]["skin"], 1)
    build_eye(who, pupil, yaw, pitch)
    build_lids(who, up, low, pitch)
    add_lights(who)
    W, H = (600, 210) if (QUICK and not MID) else (1200, 420)
    setup_camera(W, H)
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.cycles.samples = (64 if MID else 28) if QUICK else 160
    sc.render.film_transparent = False
    sc.view_settings.exposure = EXPOSURE
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"DONE {name} {time.time() - t:.0f}s", flush=True)


if __name__ == "__main__":
    names = [a for a in sys.argv[1:] if not a.startswith("--") and a in JOBS] or list(JOBS)
    for n in names:
        render_job(n, *JOBS[n])
