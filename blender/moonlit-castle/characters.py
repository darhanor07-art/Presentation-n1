"""Procedural stylised characters for the spring manhwa (bpy 5.x, Cycles CPU).

  python characters.py [name ...] [--quick] [--force]

AIARU: slim young woman, very long dark hair (real hair curves + Principled Hair BSDF), blue satin
ribbon bow, light white dress with folds.   TAIR: tall man, short dark hair, black high-collar coat with
silver embroidery trim.   Characters face +Y (the castle); the camera sits at -Y and sees their backs.
Output: 900x1260 RGBA PNG, transparent background, lit like the castle scene
(cool moon rim from the front/above, soft key from the camera-left, indigo sky ambient).
Existing PNGs are skipped (--force to redo).  --quick = 450x630, 24 spp, into renders/spring/_preview/.
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
OUTDIR = os.path.join(HERE, "renders", "spring", "_preview" if QUICK else "chars")
os.makedirs(OUTDIR, exist_ok=True)
EXPOSURE = 0.0

# name -> (character, dict(params))
JOBS = {
    "aiaru_back_0": ("aiaru", dict(wind=0.25, lift=0.0, ph=0.0, view=0.0)),
    "aiaru_back_1": ("aiaru", dict(wind=0.95, lift=0.35, ph=1.7, view=0.0)),
    "aiaru_back_2": ("aiaru", dict(wind=-0.85, lift=0.20, ph=3.4, view=0.0)),
    "aiaru_walk_0": ("aiaru", dict(wind=0.55, lift=0.15, ph=0.9, view=25.0, walk=1, small=True)),
    "aiaru_walk_1": ("aiaru", dict(wind=0.6, lift=0.2, ph=2.1, view=25.0, walk=-1, small=True)),
    "tair_34_0": ("tair", dict(wind=0.30, lift=0.0, ph=0.4, view=143.0)),
    "tair_34_1": ("tair", dict(wind=0.85, lift=0.3, ph=2.4, view=150.0)),
}


# ----------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------
def hash_noise(x, seed=0.0):
    """smooth 1D value noise in [-1,1] (numpy-friendly)."""
    x = np.asarray(x, float) + seed * 17.13
    i = np.floor(x); f = x - i
    r = lambda k: np.sin(k * 127.1 + 311.7) * 43758.5453 % 1.0 * 2 - 1
    u = f * f * (3 - 2 * f)
    return r(i) * (1 - u) + r(i + 1) * u


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 6; cy.diffuse_bounces = 3; cy.glossy_bounces = 3
    cy.transmission_bounces = 3; cy.transparent_max_bounces = 6
    cy.sample_clamp_indirect = 6.0
    sc.render.compositor_device = "CPU"
    sc.cycles_curves.shape = "THICK"
    sc.view_settings.view_transform = "AgX"
    try:
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    sc.render.film_transparent = True
    return sc


def world_and_lights(sc, strength=1.0):
    w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.16, 0.15, 0.50, 1)
    bg.inputs["Strength"].default_value = 0.42 * strength
    def sun(name, d, power, col, ang):
        ld = bpy.data.lights.new(name, "SUN"); ld.energy = power; ld.color = col; ld.angle = math.radians(ang)
        ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob)
        ob.rotation_euler = Vector(d).to_track_quat("Z", "Y").to_euler()
    ma, me = math.radians(8.5), math.radians(22.5)
    sun("MoonLight", (math.sin(ma) * math.cos(me), math.cos(ma) * math.cos(me), math.sin(me)), 14.0 * strength, (0.72, 0.80, 1.0), 1.5)
    sun("KeyFront", (-0.80, -0.42, 0.48), 2.0 * strength, (0.62, 0.68, 1.0), 6.0)
    sun("FaceFill", (0.45, -0.85, 0.25), 0.8 * strength, (0.70, 0.74, 1.0), 25.0)
    sun("RimBack", (0.9, 0.3, 0.55), 1.8 * strength, (0.55, 0.62, 1.0), 4.0)
    # dark green-blue ground bounce (invisible to the camera)
    gm, nt = new_mat("GroundBounce"); mat_output(nt, principled(nt, Base_Color=(0.025, 0.06, 0.09), Roughness=0.9))
    ob = mesh_obj("Ground", [(-6, -6, 0), (6, -6, 0), (6, 6, 0), (-6, 6, 0)], [(0, 1, 2, 3)], [gm], smooth=False)
    ob.visible_camera = False


def loft(name, rings, mat, cap_first=False, cap_last=False, collection=None, subsurf=0):
    """rings: list of (n,3) arrays (same n), ordered bottom -> top with CCW points -> outward normals."""
    n = len(rings[0])
    verts = np.concatenate(rings)
    faces = []
    for r in range(len(rings) - 1):
        for i in range(n):
            j = (i + 1) % n
            faces.append((r * n + i, r * n + j, (r + 1) * n + j, (r + 1) * n + i))
    if cap_first:
        verts = np.vstack([verts, rings[0].mean(0)]); c = len(verts) - 1
        for i in range(n):
            faces.append((c, (i + 1) % n, i))
    if cap_last:
        verts = np.vstack([verts, rings[-1].mean(0)]); c = len(verts) - 1
        for i in range(n):
            faces.append(((len(rings) - 1) * n + i, (len(rings) - 1) * n + (i + 1) % n, c))
    ob = mesh_obj(name, verts, faces, [mat], smooth=True, collection=collection)
    if subsurf:
        m = ob.modifiers.new("s", "SUBSURF"); m.levels = subsurf; m.render_levels = subsurf
    return ob


def tube(name, pts, radii, mat, sides=14, flat=1.0):
    """tube along a polyline with parallel-transport frames; closed with caps -> outward normals."""
    pts = [np.array(p, float) for p in pts]
    rings = []
    T0 = pts[1] - pts[0]; T0 /= np.linalg.norm(T0)
    ref = np.array([0, 1.0, 0]) if abs(T0[1]) < 0.9 else np.array([1.0, 0, 0])
    n1 = np.cross(T0, ref); n1 /= np.linalg.norm(n1)
    for k, p in enumerate(pts):
        T = pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]; T /= np.linalg.norm(T)
        n1 = n1 - T * n1.dot(T); n1 /= np.linalg.norm(n1)
        n2 = np.cross(T, n1)
        r = radii[k]
        rings.append(np.array([p + r * (n1 * math.cos(2 * math.pi * a / sides) * flat + n2 * math.sin(2 * math.pi * a / sides))
                               for a in range(sides)]))
    ob = loft(name, rings, mat, True, True)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()
    return ob


def blob(name, c, r, mat, rot=(0, 0, 0), seg=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1.0, location=c)
    o = bpy.context.object; o.name = name; o.scale = r; o.rotation_euler = rot
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def ribbon(name, pts, widths, twist, mat):
    """flat ribbon strip along a path; width direction rotated by `twist` (rad) around the tangent."""
    pts = [np.array(p, float) for p in pts]
    verts, faces = [], []
    for k, p in enumerate(pts):
        T = pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]; T /= np.linalg.norm(T)
        b = np.array([0, 1.0, 0]); b = b - T * b.dot(T)
        if np.linalg.norm(b) < 1e-3:
            b = np.array([1.0, 0, 0]); b = b - T * b.dot(T)
        b /= np.linalg.norm(b)
        c = np.cross(T, b)
        w = b * math.cos(twist[k]) + c * math.sin(twist[k])
        verts += [p - w * widths[k] / 2, p + w * widths[k] / 2]
    for k in range(len(pts) - 1):
        faces.append((2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2))
    ob = mesh_obj(name, verts, faces, [mat], smooth=True)
    return ob


def add_hair(name, strands, radii, mat, ob_parent=None):
    """strands: (N, M, 3) array of points."""
    N, M, _ = strands.shape
    hc = bpy.data.hair_curves.new(name)
    hc.add_curves([M] * N)
    hc.points.foreach_set("position", strands.reshape(-1, 3).astype(np.float32).ravel())
    at = hc.attributes.new("radius", "FLOAT", "POINT")
    at.data.foreach_set("value", np.tile(radii, N).astype(np.float32))
    hc.materials.append(mat)
    ob = bpy.data.objects.new(name, hc)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ----------------------------------------------------------------------------
# materials
# ----------------------------------------------------------------------------
def mat_skin(tone=(0.78, 0.60, 0.55)):
    m, nt = new_mat("Skin")
    obj = texcoord(nt, "Object")
    b = principled(nt, Base_Color=tone, Roughness=0.5)
    b.inputs["Subsurface Weight"].default_value = 0.4
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.01
    b.inputs["Sheen Weight"].default_value = 0.3
    mat_output(nt, b)
    return m


def mat_cloth(base=(0.93, 0.94, 1.0), sheen=1.0, rough=0.7, trans=0.22):
    m, nt = new_mat("Cloth")
    obj = texcoord(nt, "Object")
    weave = noise_tex(nt, obj, 900.0, 1, 0.5)
    fold = noise_tex(nt, obj, 14.0, 3, 0.5)
    col = mixc(nt, base, (base[0] * 0.8, base[1] * 0.8, base[2] * 0.95), mt(nt, "MULTIPLY", fold, 0.7))
    bump = nd(nt, "ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.0005
    lk(nt, weave, bump.inputs["Height"])
    b = principled(nt, Base_Color=col, Roughness=rough)
    b.inputs["Sheen Weight"].default_value = sheen
    b.inputs["Sheen Roughness"].default_value = 0.4
    b.inputs["Sheen Tint"].default_value = (0.78, 0.84, 1.0, 1)
    lk(nt, bump.outputs["Normal"], b.inputs["Normal"])
    tr = nd(nt, "ShaderNodeBsdfTranslucent"); lk(nt, out_sock(col), tr.inputs["Color"])
    mx = nd(nt, "ShaderNodeMixShader"); mx.inputs["Fac"].default_value = trans
    lk(nt, b.outputs[0], mx.inputs[1]); lk(nt, tr.outputs[0], mx.inputs[2])
    mat_output(nt, mx)
    return m


def mat_satin(col=(0.12, 0.30, 1.0)):
    m, nt = new_mat("Satin")
    b = principled(nt, Base_Color=col, Roughness=0.28)
    b.inputs["Sheen Weight"].default_value = 0.6
    b.inputs["Anisotropic"].default_value = 0.6
    b.inputs["Specular IOR Level"].default_value = 0.8
    mat_output(nt, b)
    return m


def mat_hair(col=(0.018, 0.014, 0.030), rough=0.28, coat=0.3):
    m, nt = new_mat("Hair")
    h = nd(nt, "ShaderNodeBsdfHairPrincipled", parametrization="COLOR")
    h.inputs["Color"].default_value = (*col, 1)
    h.inputs["Roughness"].default_value = rough
    h.inputs["Radial Roughness"].default_value = 0.35
    h.inputs["Coat"].default_value = coat
    h.inputs["IOR"].default_value = 1.55
    h.inputs["Random Roughness"].default_value = 0.15
    mat_output(nt, h)
    return m


def mat_coat():
    """black wool coat + silver embroidery (procedural mask on object coords)."""
    m, nt = new_mat("Coat")
    obj = texcoord(nt, "Object")
    x, y, z = sepxyz(nt, obj)
    th = mt(nt, "ARCTAN2", x, mt(nt, "MULTIPLY", y, -1.0))       # 0 = front (-y after yaw is applied by parent -> local +y is front)
    # silver mask: front closure, hem band (filigree), cuffs/collar bands
    front = mt(nt, "SUBTRACT", 1.0, mt(nt, "DIVIDE", mt(nt, "ABSOLUTE", mt(nt, "ABSOLUTE", x)), 0.016), clamp=True)
    front = mt(nt, "MULTIPLY", front, sstep(nt, y, 0.0, 0.03))
    fil = mt(nt, "ABSOLUTE", mt(nt, "SINE", mt(nt, "ADD", mt(nt, "MULTIPLY", z, 95.0), mt(nt, "MULTIPLY", mt(nt, "SINE", mt(nt, "MULTIPLY", th, 17.0)), 2.2))))
    fil = mt(nt, "SUBTRACT", 1.0, mt(nt, "DIVIDE", fil, 0.22), clamp=True)
    hem = mt(nt, "MULTIPLY", sstep(nt, z, 0.84, 0.70), mt(nt, "ADD", 0.25, fil))
    hem_line = mt(nt, "MULTIPLY", sstep(nt, z, 0.67, 0.66), 1.0)
    edge = mt(nt, "SUBTRACT", 1.0, mt(nt, "DIVIDE", mt(nt, "ABSOLUTE", mt(nt, "SUBTRACT", z, 0.835)), 0.006), clamp=True)
    shoulder = mt(nt, "MULTIPLY", sstep(nt, z, 1.50, 1.54), mt(nt, "ADD", 0.2, fil))
    mask = mt(nt, "MAXIMUM", mt(nt, "MAXIMUM", front, mt(nt, "MULTIPLY", hem, 0.9)), mt(nt, "MAXIMUM", edge, shoulder))
    mask = mt(nt, "MAXIMUM", mask, hem_line)
    coat = principled(nt, Base_Color=(0.012, 0.012, 0.022), Roughness=0.62)
    coat.inputs["Sheen Weight"].default_value = 0.5
    coat.inputs["Sheen Tint"].default_value = (0.45, 0.5, 0.9, 1)
    ag = principled(nt, Base_Color=(0.80, 0.82, 0.92), Roughness=0.22)
    ag.inputs["Metallic"].default_value = 1.0
    mx = nd(nt, "ShaderNodeMixShader")
    lk(nt, out_sock(mask), mx.inputs["Fac"]); lk(nt, coat.outputs[0], mx.inputs[1]); lk(nt, ag.outputs[0], mx.inputs[2])
    mat_output(nt, mx)
    return m


def mat_silver(rough=0.22):
    m, nt = new_mat("Silver")
    b = principled(nt, Base_Color=(0.80, 0.82, 0.92), Roughness=rough)
    b.inputs["Metallic"].default_value = 1.0
    mat_output(nt, b)
    return m


def mat_dark(col=(0.015, 0.015, 0.025), rough=0.5):
    m, nt = new_mat("Dark")
    mat_output(nt, principled(nt, Base_Color=col, Roughness=rough))
    return m


def mat_face(center, tone=(0.72, 0.52, 0.46)):
    """skin with painted brows / lash lines / lips (face stays in soft shadow)."""
    m, nt = new_mat("Face")
    obj = texcoord(nt, "Object")
    x, y, z = sepxyz(nt, obj)
    zz = mt(nt, "SUBTRACT", z, center[2]); ax = mt(nt, "ABSOLUTE", x)
    front = sstep(nt, y, center[1] + 0.03, center[1] + 0.055)
    def blob2(zc, xc, rz, rx, curve=0.0):
        dz = mt(nt, "SUBTRACT", zz, mt(nt, "ADD", zc, mt(nt, "MULTIPLY", mt(nt, "ABSOLUTE", mt(nt, "SUBTRACT", ax, xc)), curve)))
        d = mt(nt, "ADD", mt(nt, "POWER", mt(nt, "DIVIDE", dz, rz), 2.0), mt(nt, "POWER", mt(nt, "DIVIDE", mt(nt, "SUBTRACT", ax, xc), rx), 2.0))
        return mt(nt, "SUBTRACT", 1.0, d, clamp=True)
    brow = blob2(0.040, 0.038, 0.0065, 0.026, 0.12)
    lash = blob2(0.020, 0.033, 0.0045, 0.020)
    socket = blob2(0.019, 0.033, 0.020, 0.030)
    lips = blob2(-0.057, 0.0, 0.0055, 0.019)
    shade = mt(nt, "ADD", mt(nt, "MULTIPLY", socket, 0.35), 0.0)
    col = mixc(nt, tone, (0.30, 0.17, 0.20), mt(nt, "MULTIPLY", shade, front, clamp=True))
    col = mixc(nt, col, (0.03, 0.022, 0.03), mt(nt, "MULTIPLY", mt(nt, "MAXIMUM", brow, lash), mt(nt, "MULTIPLY", front, 0.95)))
    col = mixc(nt, col, (0.36, 0.14, 0.17), mt(nt, "MULTIPLY", lips, front))
    b = principled(nt, Base_Color=col, Roughness=0.5)
    b.inputs["Subsurface Weight"].default_value = 0.4
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.01
    mat_output(nt, b)
    return m


# ----------------------------------------------------------------------------
# AIARU
# ----------------------------------------------------------------------------
def ring_pts(cx, cy, z, rx, ry, n, fn=None, rot=0.0):
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    mod = 1.0 if fn is None else fn(th)
    c, s = math.cos(rot), math.sin(rot)
    ex, ey = rx * mod * np.cos(th), ry * mod * np.sin(th)
    return np.stack([cx + ex * c - ey * s, cy + ex * s + ey * c, np.full_like(th, z)], 1)


def build_aiaru(P):
    wind, lift, ph = P["wind"], P["lift"], P["ph"]
    walk = P.get("walk", 0)
    skin, cloth, satin, dark = mat_skin(), mat_cloth(), mat_satin(), mat_dark((0.04, 0.035, 0.07), 0.45)
    sash = mat_cloth((0.45, 0.55, 0.95), 0.8, 0.5, 0.1)
    n = 96
    # ---- dress (bodice + flared skirt with folds) ----
    zs = np.linspace(0.58, 1.345, 34)
    kz = [0.58, 0.68, 0.80, 0.92, 1.02, 1.08, 1.16, 1.24, 1.30, 1.345]
    krx = [0.405, 0.335, 0.245, 0.185, 0.135, 0.118, 0.130, 0.145, 0.153, 0.150]
    kry = [0.310, 0.255, 0.185, 0.135, 0.098, 0.085, 0.092, 0.096, 0.093, 0.085]
    amp = lambda z: np.interp(z, [0.58, 0.80, 1.02, 1.12], [0.075, 0.05, 0.012, 0.0])
    rings = []
    for z in zs:
        rx, ry = np.interp(z, kz, krx), np.interp(z, kz, kry)
        a = amp(z)
        k1 = 9 + int(z < 0.8)
        twist = 2.2 * z + ph + wind * 0.8 * (1 - z)
        def fn(th, a=a, z=z, twist=twist):
            f = 1 + a * (0.62 * np.sin(k1 * th + twist) + 0.38 * np.sin(17 * th - 1.7 * twist + 1.3))
            f += 0.20 * wind * np.maximum(0, np.cos(th)) * np.clip((0.95 - z) / 0.4, 0, 1) ** 1.3
            f += 0.06 * np.sin(3 * th + ph) * np.clip((0.95 - z) / 0.4, 0, 1)
            return f
        cx = 0.30 * wind * np.clip(0.95 - z, 0, None) ** 1.6 * 1.4 + 0.02 * math.sin(ph)
        cy = -0.04 * np.clip(0.95 - z, 0, None) + (0.05 * walk * np.clip(0.95 - z, 0, None))
        r = ring_pts(cx, cy, z, rx, ry, n, fn)
        # scalloped hem
        w = np.clip((0.70 - z) / 0.12, 0, 1)
        r[:, 2] += w * (0.035 * np.sin(7 * np.linspace(0, 2 * np.pi, n, endpoint=False) + ph) + 0.02 * np.sin(4 * np.linspace(0, 2 * np.pi, n, endpoint=False) - ph))
        rings.append(r)
    dress = loft("Dress", rings, cloth)
    # waist sash
    srings = [ring_pts(0, 0, z, 0.119 + 0.012, 0.087 + 0.012, 48) for z in (1.04, 1.075, 1.11)]
    loft("Sash", srings, sash)
    # sash bow at the back
    for sgn in (-1, 1):
        ribbon("SashTail", [(0.0, -0.095, 1.07), (sgn * 0.03 + 0.04 * wind, -0.115, 1.0), (sgn * 0.05 + 0.1 * wind, -0.13 - 0.05 * lift, 0.9), (sgn * 0.06 + 0.2 * wind, -0.14, 0.80)],
               [0.045, 0.045, 0.04, 0.035], [0.2, 0.5, 0.9, 1.3], sash)
    # ---- legs (visible below the hem) ----
    for sgn in (-1, 1):
        sw = 0.0
        if walk:
            sw = math.radians(20) * walk * sgn
        hip = np.array([sgn * 0.062, 0.0, 0.64])
        t1 = sw
        knee = hip + 0.28 * np.array([0, math.sin(t1), -math.cos(t1)])
        t2 = sw - math.radians(14 if (walk and sw < 0) else 3)
        ank = knee + 0.50 * np.array([0, math.sin(t2), -math.cos(t2)])
        ank[2] = max(ank[2], 0.07)
        pts = [hip, knee * 0.5 + hip * 0.5 + np.array([0, 0.0, 0.0]), knee, (knee + ank) / 2, ank]
        tube("Leg", pts, [0.052, 0.049, 0.043, 0.034, 0.025], skin, 14)
        blob("Shoe", ank + np.array([0, 0.055, -0.035]), (0.042, 0.10, 0.038), dark, (math.radians(-8), 0, 0))
    # ---- arms ----
    for sgn in (-1, 1):
        sw = -math.radians(16) * walk * sgn
        sh = np.array([sgn * 0.170, 0.0, 1.30])
        el = sh + np.array([sgn * 0.035, 0.07 * math.sin(sw) * 2 + 0.01, -0.28])
        wr = el + np.array([sgn * 0.01, 0.07 + 0.25 * math.sin(sw) * 1.3, -0.24])
        wr[0] += sgn * 0.01
        tube("Arm", [sh, (sh + el) / 2, el, (el + wr) / 2, wr], [0.046, 0.043, 0.037, 0.032, 0.024], skin, 14)
        blob("Hand", wr + np.array([0, 0.03, -0.065]), (0.021, 0.036, 0.07), skin, (math.radians(10), 0, 0))
        # cap sleeve
        tube("Sleeve", [sh + np.array([sgn * 0.01, 0, 0.02]), sh * 0.5 + el * 0.5 + np.array([sgn * 0.005, 0, 0.1])], [0.062, 0.058], cloth, 16)
    # ---- neck + head ----
    tube("Neck", [(0, 0.005, 1.31), (0, 0.012, 1.40), (0, 0.020, 1.50)], [0.036, 0.031, 0.030], skin, 16)
    head = blob("Head", (0, 0.020, 1.575), (0.083, 0.100, 0.116), skin, seg=40)
    blob("Jaw", (0, 0.045, 1.50), (0.06, 0.07, 0.07), skin, seg=24)
    # ---- hair (real hair curves) ----
    rng = np.random.default_rng(11)
    NS, M = 6500, 30
    az0 = rng.uniform(-np.pi * 0.93, np.pi * 0.93, NS)      # around the head, 0 = back
    # hairline: skip front 14% unless near the top
    el0 = np.arccos(rng.uniform(0.15, 1.0, NS) ** 0.8)       # polar angle from crown (0..~80 deg)
    hx, hy, hz = 0.083 * 1.06, 0.100 * 1.06, 0.116 * 1.06
    hc = np.array([0, 0.020, 1.575])
    clump = rng.integers(0, 70, NS)
    cph = rng.uniform(0, 6.28, 70)[clump]
    camp = rng.uniform(0.012, 0.06, 70)[clump]
    layer = rng.uniform(0.0, 1.0, NS)
    coff = rng.normal(0, 0.022, 70)[clump]
    clen = rng.uniform(0.62, 1.04, 70)[clump]
    strands = np.zeros((NS, M, 3))
    zback = lambda z: np.interp(z, kz, kry)
    length = rng.uniform(0.86, 1.0, NS) * (0.9 + 0.1 * np.cos(az0)) * clen        # very long
    for i in range(NS):
        a, e = az0[i], el0[i]
        # scalp point (az measured from the back: back = -y)
        sx, sy, sz = hx * math.sin(e) * math.sin(a), -hy * math.cos(a) * math.sin(e), hz * math.cos(e)
        # front-facing roots only on the upper part of the head (hairline)
        pts = []
        # stage A: run down the scalp to the nape
        nA = 9
        for k in range(nA):
            t = k / (nA - 1)
            e2 = e + (math.radians(112) - e) * t if e < math.radians(112) else e
            px = hx * math.sin(e2) * math.sin(a) * (1 + 0.0)
            py = -hy * math.cos(a) * math.sin(e2) if math.cos(a) > -0.2 else hy * -math.cos(a) * math.sin(e2)
            pz = hz * math.cos(e2)
            pts.append((px, py + 0.020, pz + 1.575))
        # push front roots behind the face: they fall behind the ears
        x0, y0, z0 = pts[-1]
        if y0 > 0.02:
            y0 = 0.01 - 0.03 * layer[i]
        # stage B: hang down the back
        nB = M - nA
        zend = z0 - length[i] * 0.95
        xw = x0 * (1.0 + 0.45 * layer[i])
        for k in range(1, nB + 1):
            u = k / nB
            z = z0 + (zend - z0) * u
            yb = -(zback(min(max(z, 0.58), 1.3)) + 0.004 + 0.032 * layer[i] + 0.018 * (1 - u) * 0) - 0.003
            if z < 0.95:
                yb = -(np.interp(z, kz, kry) * 0.96 + 0.05 + 0.03 * layer[i]) - 0.0
            bl = min(1.0, u * 7.0); bl = bl * bl * (3 - 2 * bl)
            x = x0 + (xw * (1 + 0.55 * u - 0.35 * u ** 3) - x0) * bl + coff[i] * bl + camp[i] * math.sin(2 * math.pi * (u * 1.25) + cph[i] + ph) * u ** 1.1
            x += wind * 0.34 * u ** 2.0 + 0.02 * math.sin(ph + u * 4) * u
            yb = y0 + (yb - y0) * min(1.0, u * 6.0) ** 1.5 if u < 1 / 6 else yb
            y = yb - abs(wind) * 0.10 * u ** 2.2 - 0.045 * lift * u ** 1.6
            z += lift * 0.12 * math.sin(math.pi * u * 0.9) * (u ** 1.2) * 1.0
            pts.append((x, y, z))
        strands[i] = np.array(pts)
    rad = np.concatenate([np.full(nA, 0.0021), np.linspace(0.0021, 0.0004, M - nA)])
    hair_m = mat_hair()
    add_hair("Hair", strands, rad, hair_m)
    # flyaway strands (thin, more wind)
    NF = 110
    fl = np.zeros((NF, 16, 3))
    for i in range(NF):
        s0 = strands[rng.integers(0, NS)]
        k0 = rng.integers(14, 24)
        p0 = s0[k0]
        d = np.array([wind * 0.5 + rng.normal(0, 0.05), -0.05 - 0.06 * abs(wind) + rng.normal(0, 0.03), 0.02 + 0.1 * lift])
        for k in range(16):
            u = k / 15
            fl[i, k] = p0 + np.array([0, 0, -0.35 * u]) + d * u ** 1.5 * 1.3 + np.array([0.03 * math.sin(6 * u + i) + 0.05 * math.sin(11 * u + 2 * i) * u, 0.02 * math.sin(7 * u + i), 0.03 * math.sin(9 * u + i) * u])
    add_hair("Flyaway", fl, np.linspace(0.0011, 0.0004, 16), hair_m)
    # ---- ribbon bow (blue satin) at the back of the head ----
    bc = np.array([0.012, -0.098, 1.585])
    for sgn in (-1, 1):
        pts, wid, tw = [], [], []
        for t in np.linspace(0, 2 * math.pi, 28):
            lx = sgn * (0.045 * math.sin(t / 2) ** 0.9 * 1.9) * math.sin(t / 2) * 0.55 if False else sgn * 0.075 * math.sin(t / 2) * (1 + 0.3 * math.cos(t / 2))
            lz = 0.05 * math.sin(t) + 0.004
            pts.append(bc + np.array([lx + 0.012 * sgn * wind, -0.006 * math.sin(t / 2) - 0.01 * lift * math.sin(t / 2), lz]))
            wid.append(0.034); tw.append(0.0)
        pts = np.array(pts)
        ribbon("BowLoop", pts, wid, tw, satin)
    blob("BowKnot", bc + np.array([0.01 * 0.0, 0.0, 0.0]), (0.014, 0.012, 0.016), satin)
    for sgn, ln in ((-1, 0.36), (1, 0.30)):
        pts, wid, tw = [], [], []
        for k in range(14):
            u = k / 13
            pts.append(bc + np.array([sgn * 0.01 + sgn * 0.02 * u + wind * 0.30 * u ** 1.7 + 0.03 * math.sin(7 * u + ph + sgn),
                                      -0.01 - 0.06 * u - 0.06 * abs(wind) * u ** 2 - 0.05 * lift * u,
                                      -ln * u + 0.12 * lift * math.sin(math.pi * u)]))
            wid.append(0.036 - 0.008 * u); tw.append(1.0 * u * 3 + sgn * ph)
        ribbon("BowTail", pts, wid, tw, satin)
    return dict(zc=0.90, height=1.85)


# ----------------------------------------------------------------------------
# TAIR
# ----------------------------------------------------------------------------
def sculpt_head(name, center, mat):
    """face-ish ellipsoid: brow, nose, cheekbones, chin (soft shadow only)."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=40, radius=1.0, location=(0, 0, 0))
    o = bpy.context.object; o.name = name
    me = o.data
    for v in me.vertices:
        x, y, z = v.co
        X, Y, Z = x * 0.082, y * 0.098, z * 0.118
        if Y > 0:  # face side (+y)
            fy = Y / 0.098
            Y += 0.020 * math.exp(-((Z + 0.012) / 0.045) ** 2) * math.exp(-(X / 0.013) ** 2) * (fy > 0.4) * 2.2   # nose
            Y += 0.008 * math.exp(-((Z - 0.034) / 0.012) ** 2) * math.exp(-(X / 0.06) ** 2) * (fy > 0.4)         # brow ridge
            Y -= 0.007 * math.exp(-((Z - 0.020) / 0.014) ** 2) * math.exp(-((abs(X) - 0.032) / 0.014) ** 2) * (fy > 0.4)  # eye sockets
            Y += 0.004 * math.exp(-((Z + 0.020) / 0.02) ** 2) * math.exp(-((abs(X) - 0.050) / 0.015) ** 2)  # cheekbone
            Z -= 0.012 * math.exp(-(X / 0.05) ** 2) * max(0.0, -Z / 0.118) ** 3 * (fy > 0.3)               # chin drop
            Y -= 0.006 * math.exp(-((Z + 0.060) / 0.012) ** 2) * math.exp(-(X / 0.02) ** 2) * (fy > 0.4)      # under lip dent
            Y += 0.003 * math.exp(-((Z + 0.048) / 0.008) ** 2) * math.exp(-(X / 0.02) ** 2)                  # lips
        if Z < -0.04:
            X *= 1 - 0.18 * (-Z - 0.04) / 0.08
        v.co = (X + center[0], Y + center[1], Z + center[2])
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    return o


def build_tair(P):
    wind, lift, ph = P["wind"], P["lift"], P["ph"]
    skin = mat_skin((0.72, 0.52, 0.46)); coat = mat_coat(); silver = mat_silver(); dark = mat_dark((0.012, 0.012, 0.02), 0.4)
    cloth = mat_dark((0.015, 0.015, 0.025), 0.7)
    n = 96
    kz = [0.60, 0.72, 0.85, 0.98, 1.10, 1.22, 1.36, 1.46, 1.52, 1.57]
    krx = [0.262, 0.238, 0.212, 0.195, 0.172, 0.178, 0.200, 0.205, 0.165, 0.105]
    kry = [0.185, 0.165, 0.145, 0.135, 0.118, 0.120, 0.128, 0.120, 0.100, 0.085]
    zs = np.linspace(0.60, 1.57, 40)
    rings = []
    for z in zs:
        rx, ry = np.interp(z, kz, krx), np.interp(z, kz, kry)
        a = np.interp(z, [0.6, 0.85, 1.05], [0.045, 0.028, 0.0])
        sk = np.clip((0.95 - z) / 0.35, 0, 1)
        def fn(th, a=a, z=z, sk=sk):
            f = 1 + a * (0.6 * np.sin(7 * th + 2.0 * z + ph) + 0.4 * np.sin(13 * th + ph * 1.7))
            f += 0.15 * wind * np.maximum(0, np.cos(th)) * sk ** 1.3 + 0.05 * np.sin(2 * th + ph) * sk
            return f
        cx = 0.22 * wind * sk ** 1.5
        cy = -0.05 * sk - 0.04 * wind * sk * 0.0
        rings.append(ring_pts(cx, cy, z, rx, ry, n, fn))
    coat_ob = loft("Coat", rings, coat)
    for sgn in (-1, 1):
        blob("Shoulder", (sgn * 0.205, 0.0, 1.465), (0.085, 0.085, 0.075), coat)
    # high stand collar with silver rim
    zc = np.linspace(1.50, 1.685, 10)
    crings = []
    for z in zc:
        u = (z - 1.50) / 0.185
        r = 0.108 - 0.012 * u + 0.014 * u ** 4
        crings.append(ring_pts(0, 0.012, z, r * 0.86, r, 56, lambda th: 1 + 0.03 * np.sin(2 * th)))
    loft("Collar", crings, coat)
    loft("CollarRim", [ring_pts(0, 0.012, 1.675, 0.1, 0.116, 56), ring_pts(0, 0.012, 1.69, 0.098, 0.113, 56)], silver)
    loft("CollarBand", [ring_pts(0, 0.012, 1.60, 0.095, 0.110, 56), ring_pts(0, 0.012, 1.612, 0.095, 0.110, 56)], silver)
    # trousers / boots
    for sgn in (-1, 1):
        hip = np.array([sgn * 0.085, 0.0, 0.75]); ank = np.array([sgn * 0.09, 0.01, 0.10])
        tube("Leg", [hip, (hip + ank) / 2, ank], [0.088, 0.072, 0.056], cloth, 16)
        blob("Boot", ank + np.array([0, 0.055, -0.045]), (0.047, 0.115, 0.055), dark, (math.radians(-6), 0, 0))
        tube("BootShaft", [ank + np.array([0, 0, 0.22]), ank], [0.060, 0.058], dark, 16)
    # arms (coat sleeves) + silver cuffs
    for sgn in (-1, 1):
        sh = np.array([sgn * 0.215, 0.0, 1.48])
        el = sh + np.array([sgn * 0.045, 0.01, -0.29])
        wr = el + np.array([sgn * 0.01, 0.06, -0.26])
        tube("Sleeve", [sh, (sh + el) / 2, el, (el + wr) / 2, wr], [0.074, 0.068, 0.058, 0.052, 0.046], coat, 16)
        tube("Cuff", [wr + (el - wr) * 0.14, wr - (el - wr) * 0.02], [0.054, 0.052], silver, 16)
        blob("Hand", wr + np.array([0, 0.03, -0.075]), (0.026, 0.042, 0.082), skin, (math.radians(10), 0, 0))
    # buttons along the front (local +y is the front)
    for k in range(7):
        z = 1.40 - k * 0.11
        ry = np.interp(z, kz, kry)
        blob("Button", (0, ry + 0.003, z), (0.009, 0.005, 0.009), silver)
    # head + hair
    hc = (0, 0.018, 1.782)
    tube("Neck", [(0, 0.01, 1.55), (0, 0.016, 1.64), (0, 0.020, 1.74)], [0.052, 0.046, 0.044], skin, 16)
    sculpt_head("Head", hc, mat_face(hc))
    rng = np.random.default_rng(23)
    NS, M = 5200, 6
    strands = np.zeros((NS, M, 3))
    for i in range(NS):
        e = math.acos(rng.uniform(0.05, 1.0) ** 0.9)   # polar from crown
        a = rng.uniform(-math.pi, math.pi)               # 0 = back
        front = math.cos(a) < -0.2 and e > math.radians(62)   # skip the face
        if front:
            a = a + math.pi if rng.random() < 0.5 else a
            if math.cos(a) < -0.2 and e > math.radians(62):
                e = math.radians(rng.uniform(15, 55))
        hx, hy, hz = 0.082 * 1.04, 0.098 * 1.04, 0.118 * 1.04
        p0 = np.array([hx * math.sin(e) * math.sin(a), -hy * math.sin(e) * math.cos(a), hz * math.cos(e)]) + np.array(hc)
        nrm = np.array([math.sin(e) * math.sin(a) / 0.082, -math.sin(e) * math.cos(a) / 0.098, math.cos(e) / 0.118]); nrm /= np.linalg.norm(nrm)
        L = rng.uniform(0.04, 0.08)
        isfront = math.cos(a) < -0.3
        pts = []
        sweep = 0.5   # side sweep (towards +x) in azimuth
        for k in range(M):
            u = k / (M - 1)
            if isfront and e < math.radians(75):
                e2 = e + u * L / 0.11 * 0.36                        # bangs fall onto the forehead
                a2 = a + (sweep * u * 0.9) * (1 if math.sin(a) > -9 else 1)
            else:
                e2 = e + u * L / 0.11 * (1.0 + 0.4 * math.sin(e))   # run down the scalp
                a2 = a + sweep * u * 0.35
            e2 = min(e2, math.radians(118))
            off = 1.03 + 0.07 * math.sin(u * 2.4) + 0.002 * wind * u * 6
            pts.append(np.array([hx * math.sin(e2) * math.sin(a2) * off, -hy * math.sin(e2) * math.cos(a2) * off, hz * math.cos(e2) * off]) + np.array(hc)
                       + np.array([0.01 * wind * u * u, 0, -0.01 * u * u]) + rng.normal(0, 0.0015, 3) * u)
        strands[i] = np.array(pts)
    add_hair("Hair", strands, np.linspace(0.0016, 0.0006, M), mat_hair((0.012, 0.011, 0.02), 0.32, 0.25))
    return dict(zc=0.98, height=1.95)


# ----------------------------------------------------------------------------
def render_job(name, who, P):
    path = os.path.join(OUTDIR, name + ".png")
    if os.path.exists(path) and not FORCE and not QUICK:
        print("SKIP", name, flush=True)
        return
    sc = reset()
    world_and_lights(sc)
    root_objs_before = set(bpy.data.objects)
    info = build_aiaru(P) if who == "aiaru" else build_tair(P)
    # rotate the whole character (faces +Y by default)
    new = [o for o in bpy.data.objects if o not in root_objs_before]
    root = bpy.data.objects.new("Root", None); sc.collection.objects.link(root)
    root.rotation_euler = (0, 0, math.radians(P.get("view", 0.0)))
    for o in new:
        o.parent = root
    # camera
    W, H = (450, 630) if QUICK else (900, 1260)
    small = P.get("small", False)
    cd = bpy.data.cameras.new("Cam"); cd.lens = 85; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 36
    fh = info["height"] * (1.35 if small else 1.15)
    D = fh * cd.lens / cd.sensor_height
    cd.dof.use_dof = False
    cam = bpy.data.objects.new("Cam", cd); sc.collection.objects.link(cam)
    cam.location = (0, -D, info["zc"] + (0.0 if not small else -0.05)); cam.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.cycles.samples = 24 if QUICK else 80
    sc.view_settings.exposure = EXPOSURE
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "8"
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"DONE {name} {time.time() - t:.0f}s", flush=True)


if __name__ == "__main__":
    names = [a for a in sys.argv[1:] if not a.startswith("--") and a in JOBS] or list(JOBS)
    for n in names:
        render_job(n, JOBS[n][0], JOBS[n][1])
