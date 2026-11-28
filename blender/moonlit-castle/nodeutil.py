"""Small shader-node helpers shared by eyes.py / characters.py / shots.py (bpy 5.x)."""
import bpy


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


def lk(nt, a, b):
    nt.links.new(a, b)


def out_sock(x):
    return x.outputs[0] if hasattr(x, "outputs") else x


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
    if isinstance(fac, (int, float)):
        n.inputs["Factor"].default_value = fac
    else:
        lk(nt, out_sock(fac), n.inputs["Factor"])
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
    return nd(nt, "ShaderNodeTexCoord").outputs[which]


def sepxyz(nt, vec):
    s = nd(nt, "ShaderNodeSeparateXYZ")
    lk(nt, out_sock(vec), s.inputs[0])
    return s.outputs


def combxyz(nt, x, y, z):
    c = nd(nt, "ShaderNodeCombineXYZ")
    for nm, v in (("X", x), ("Y", y), ("Z", z)):
        if isinstance(v, (int, float)):
            c.inputs[nm].default_value = v
        else:
            lk(nt, out_sock(v), c.inputs[nm])
    return c.outputs[0]


def attr_node(nt, name, typ="GEOMETRY"):
    return nd(nt, "ShaderNodeAttribute", attribute_type=typ, attribute_name=name)


def sstep(nt, v, a, b):
    den = (b - a) if isinstance(a, (int, float)) and isinstance(b, (int, float)) else mt(nt, "SUBTRACT", b, a)
    t = mt(nt, "DIVIDE", mt(nt, "SUBTRACT", v, a), den, clamp=True)
    return mt(nt, "MULTIPLY", mt(nt, "MULTIPLY", t, t), mt(nt, "SUBTRACT", 3.0, mt(nt, "MULTIPLY", t, 2.0)))


def mesh_obj(name, verts, faces, mats=(), smooth=True, collection=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [list(f) for f in faces])
    me.update()
    if smooth:
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob
