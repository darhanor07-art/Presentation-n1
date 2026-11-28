"""Render the moonlit castle scene.

  python render.py hero|wide|clay|flyby|all [--quick]

Outputs go to renders/ (hero.png, wide.png, clay.png, flyby.mp4).
Frames of the fly-through are kept in renders/_frames/ (git-ignored); frames that
already exist are skipped, so an interrupted render can simply be restarted.
"""
import sys, os, time, subprocess, math
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "renders")
os.makedirs(R, exist_ok=True)
what = [a for a in sys.argv[1:] if not a.startswith("--")] or ["all"]
QUICK = "--quick" in sys.argv

# opening a .blend straight away aborts in a GPU-less container -> reset first
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "moonlit_castle.blend"), load_ui=False, use_scripts=False)
sc = bpy.context.scene
cy = sc.cycles
sc.render.compositor_device = "CPU"
cy.device = "CPU"
cy.use_adaptive_sampling = True
cy.use_light_tree = True
cy.use_denoising = True
cy.denoiser = "OPENIMAGEDENOISE"
cy.volume_step_rate = 2.0
cy.volume_max_steps = 256
sc.render.use_persistent_data = True


def setup(cam, w, h, spp, thr=0.02, fmt="PNG"):
    sc.camera = bpy.data.objects[cam]
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    cy.samples = spp
    cy.adaptive_threshold = thr
    sc.render.image_settings.file_format = fmt
    sc.render.image_settings.color_depth = "8"


def still(name):
    sc.render.filepath = os.path.join(R, name)
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"DONE {name} {time.time() - t:.0f}s", flush=True)


if "hero" in what or "all" in what:
    setup("CAM_HERO", 1080, 1350, 24 if QUICK else 160, 0.012)
    still("hero.png")

if "wide" in what or "all" in what:
    setup("CAM_WIDE", 1600, 900, 16 if QUICK else 80, 0.015)
    still("wide.png")

if "clay" in what or "all" in what:
    clay = bpy.data.materials.new("Clay")
    clay.use_nodes = True
    clay.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.78, 0.78, 0.80, 1)
    clay.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    sc.view_layers[0].material_override = clay
    for n in ("HazeBox", "ValleyMist", "MeadowMist"):
        bpy.data.objects[n].hide_render = True
    setup("CAM_HERO", 1080, 1350, 16 if QUICK else 64, 0.02)
    still("clay.png")
    sc.view_layers[0].material_override = None
    for n in ("HazeBox", "ValleyMist", "MeadowMist"):
        bpy.data.objects[n].hide_render = False

if "flyby" in what or "all" in what:
    fd = os.path.join(R, "_frames")
    os.makedirs(fd, exist_ok=True)
    bpy.data.objects["MeadowMist"].hide_render = True     # volume cost; haze + valley mist stay
    setup("CAM_FLY", 400, 500, 8, 0.03)
    cy.use_denoising = True
    total = sc.frame_end
    for f in range(sc.frame_start, total + 1):
        p = os.path.join(fd, f"f{f:04d}.png")
        if os.path.exists(p):
            continue
        sc.frame_set(f)
        sc.render.filepath = p
        t = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"FRAME {f}/{total} {time.time() - t:.1f}s", flush=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "24", "-i", os.path.join(fd, "f%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", os.path.join(R, "flyby.mp4")], check=True)
    print("DONE flyby.mp4", flush=True)
