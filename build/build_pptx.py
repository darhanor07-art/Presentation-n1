# -*- coding: utf-8 -*-
"""Morph ауысуы бар, өңделетін presentation.pptx құрастырушы.
Алдымен: node build/export_assets.js <index.html url> <export_dir>
Содан кейін: python3 build/build_pptx.py <export_dir>

Morph логикасы (әр ауысу n-1 → n):
  объект екі слайдта да бірдей «!!АТАУ»-мен тұрады, ал PowerPoint оның орнын/өлшемін/бұрышын
  аралық күйлермен жылжытады.
  crack — n-1 фоны екі жартыдан (!!BGkL / !!BGkR) тұрады; n-де олар екі жаққа бұрылып шығады,
          ал n фоны 1.35× үлкен күйден 1×-ге «камерамен ішке кіреді».
  zoom  — n фоны n-1-де 6% өлшемде зум нүктесінде тұрады да, толық экранға өседі; n-1 фоны 2.8× үлкейеді.
  pan/wave — фондар қатар тұрады да, бір бағытта жылжиды.
  rise  — n фоны төменнен бұрылып көтеріледі.
  !!PANEL — мәтін қағазы слайдтан слайдқа ауысады, !!GROW — төменгі өсу сабағы.
"""
import json, os, re, sys, zipfile, shutil, random, math
from PIL import Image, ImageDraw, ImageFilter
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
sys.path.insert(0, os.path.dirname(__file__))
import content as C

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXP = sys.argv[1]
OUT = os.path.join(ROOT, "presentation.pptx")
E = 6350  # 1 сахна пикселі = 6350 EMU (1920 px = 13.333 дюйм)
DUR = {"crack": 1700, "zoom": 1450, "pan": 1250, "wave": 1350, "rise": 1200, "intro": 1000}

meta = json.load(open(os.path.join(EXP, "meta.json")))
N = len(meta)
TR = [m["tr"] for m in meta]           # TR[k] = (k+1)-слайдқа кіру ауысуы
def tr_in(n): return TR[n - 1]         # n — 1-ден басталады
def halves(n): return n < N and tr_in(n + 1) == "crack"

# ---------- жарылу жартылары ----------
random.seed(11)
SEAM = [(960 + 110 * math.sin(y / 1080 * math.pi * 1.7 + .5) + random.uniform(-13, 13), y) for y in range(-20, 1101, 36)]
def make_halves(n):
    src = Image.open(os.path.join(EXP, "bg", f"{n:02d}.jpg")).convert("RGBA")
    out = []
    for side in ("L", "R"):
        m = Image.new("L", src.size, 0); d = ImageDraw.Draw(m)
        edge = -400 if side == "L" else 2320
        d.polygon([(edge, -20)] + SEAM + [(edge, 1100)], fill=255)
        im = src.copy(); im.putalpha(m); im = im.convert("RGBA")
        p = os.path.join(EXP, "bg", f"{n:02d}{side}.png"); im.save(p, optimize=True); out.append(p)
    return out

# ---------- геометрия ----------
def st(cx, cy, s=1.0, r=0.0): return (cx, cy, s, r)
REST = st(960, 540)
def post_exit(kind, zx, zy):
    if kind in ("pan", "wave"): return st(960 - 1920, 540)
    if kind == "zoom": return st(zx + (960 - zx) * 2.8, zy + (540 - zy) * 2.8, 2.8)
    if kind == "rise": return st(960, 540, .9)
    return REST
def pre_entry(kind, zx, zy):
    if kind in ("pan", "wave"): return st(960 + 1920, 540)
    if kind == "zoom": return st(zx + (960 - zx) * .001, zy + (540 - zy) * .001, .001)
    if kind == "rise": return st(960, 540 + 1320, 1, 5)
    if kind == "crack": return st(960, 540, 1.35)
    return REST

def add_pic(slide, path, state, name, w0=1920, h0=1080):
    cx, cy, s, r = state
    w, h = w0 * s, h0 * s
    pic = slide.shapes.add_picture(path, Emu(int((cx - w / 2) * E)), Emu(int((cy - h / 2) * E)), Emu(int(w * E)), Emu(int(h * E)))
    pic.name = name
    if r: pic.rotation = r
    return pic

def bg_rep(slide, n, state, extra_half=None):
    """n-слайдтың фонын берілген күйде қосады (жарты не толық)."""
    if halves(n):
        l, r = HALF[n]
        sl, sr = (state, state) if extra_half is None else extra_half
        add_pic(slide, l, sl, f"!!BG{n}L"); add_pic(slide, r, sr, f"!!BG{n}R")
    else:
        add_pic(slide, os.path.join(EXP, "bg", f"{n:02d}.jpg"), state, f"!!BG{n}")

HALF = {n: make_halves(n) for n in range(1, N + 1) if halves(n)}

# ---------- мәтін ----------
def rgb(s):
    v = [int(float(x)) for x in re.findall(r"[\d.]+", s)[:3]]
    return RGBColor(*v)
def alpha(s):
    v = re.findall(r"[\d.]+", s); return float(v[3]) if len(v) > 3 else 1.0
def fam(f): return "Cambria" if "Lora" in f else "Calibri"

def add_text(slide, t):
    pad = 6
    w = t["w"] * 1.1 + pad
    tb = slide.shapes.add_textbox(Emu(int((t["x"] - 1) * E)), Emu(int((t["y"] - 2) * E)), Emu(int(w * E)), Emu(int((t["h"] + 6) * E)))
    tf = tb.text_frame; tf.word_wrap = True
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"): setattr(tf, side, 0)
    tf.vertical_anchor = MSO_ANCHOR.TOP
    bodyPr = tf._txBody.find(qn("a:bodyPr")); bodyPr.set("wrap", "square")
    runs = t["runs"] or [{"t": "", "b": None}]
    paras = [[]]
    for r in runs:
        parts = r["t"].split("\n")
        for k, part in enumerate(parts):
            if k: paras.append([])
            if part: paras[-1].append((part, r["b"]))
    paras = [p for p in paras if any(x[0].strip() for x in p)] or [[(" ", None)]]
    upper = t["tt"] == "uppercase"
    for i, pr in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = {"center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT, "end": PP_ALIGN.RIGHT}.get(t["align"], PP_ALIGN.LEFT)
        para.line_spacing = max(.85, min(1.6, t["lh"] / t["size"]))
        for k, (txt, b) in enumerate(pr):
            txt = txt.strip() if len(pr) == 1 else (txt.lstrip() if k == 0 else txt)
            run = para.add_run(); run.text = txt.upper() if upper else txt
            sty = b or {"w": t["weight"], "c": t["color"], "s": t["size"], "f": t["family"], "i": t["style"]}
            f = run.font; f.name = fam(sty["f"]); f.size = Pt(sty["s"] * 0.5 * (0.88 if fam(sty["f"]) == "Cambria" else 1.0))
            f.bold = int(sty["w"]) >= 600; f.italic = sty["i"] == "italic"
            f.color.rgb = rgb(sty["c"])
            rPr = run._r.get_or_add_rPr()
            for tag in ("a:latin", "a:cs", "a:ea"):
                el = rPr.find(qn(tag))
                if el is None: el = rPr.makeelement(qn(tag), {}); rPr.append(el)
                el.set("typeface", fam(sty["f"]))
    tb.name = "T " + (t["runs"][0]["t"][:24] if t["runs"] else "")
    return tb

def shadow(shape, blur=40, dist=22, a=38):
    spPr = shape._element.spPr
    eff = spPr.makeelement(qn("a:effectLst"), {})
    sh = eff.makeelement(qn("a:outerShdw"), {"blurRad": str(blur * 12700), "dist": str(dist * 12700), "dir": "5400000", "algn": "t", "rotWithShape": "0"})
    clr = sh.makeelement(qn("a:srgbClr"), {"val": "1E0F05"}); a_ = clr.makeelement(qn("a:alpha"), {"val": str(a * 1000)}); clr.append(a_); sh.append(clr); eff.append(sh)
    spPr.append(eff)

def add_box(slide, b, name=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(int(b["x"] * E)), Emu(int(b["y"] * E)), Emu(int(b["w"] * E)), Emu(int(b["h"] * E)))
    shp.adjustments[0] = 0.012
    shp.fill.solid(); shp.fill.fore_color.rgb = rgb(b["bg"]) if alpha(b["bg"]) > 0 else RGBColor(0xFB, 0xF5, 0xE8)
    if alpha(b["bg"]) < 1: shp.fill.fore_color._xFill  # keep solid
    shp.line.fill.background(); shadow(shp)
    if name: shp.name = name
    shp.text_frame.text = ""
    return shp

def dedupe(texts):
    keep = []
    for t in texts:
        inside = any(o is not t and o["runs"] and any(r["b"] for r in o["runs"]) and
                     o["x"] - 2 <= t["x"] and o["y"] - 2 <= t["y"] and o["x"] + o["w"] + 2 >= t["x"] + t["w"] and o["y"] + o["h"] + 2 >= t["y"] + t["h"]
                     for o in texts)
        if not (inside and t["tag"] in ("B", "EM", "I", "SPAN")): keep.append(t)
    return keep

# ---------- құрастыру ----------
prs = Presentation()
prs.slide_width, prs.slide_height = Emu(1920 * E), Emu(1080 * E)
blank = prs.slide_layouts[6]
ACT_COL = {1: "8A4A26", 2: "6FAE4F", 3: "3F7D3A", 4: "D8513D"}

for m in meta:
    n = m["n"]; s = prs.slides.add_slide(blank)
    zx, zy = m["zx"] / 100 * 1920, m["zy"] / 100 * 1080
    kin = tr_in(n)
    nxt = tr_in(n + 1) if n < N else None
    nzx, nzy = (meta[n]["zx"] / 100 * 1920, meta[n]["zy"] / 100 * 1080) if n < N else (960, 540)
    # 0) келесі слайд фоны «жарылу» үшін — өз фонымыздың астында
    if nxt == "crack": bg_rep(s, n + 1, pre_entry("crack", 0, 0))
    # 1) алдыңғы фон — шығу күйінде (астында)
    if n > 1 and kin in ("pan", "wave", "zoom", "rise"): bg_rep(s, n - 1, post_exit(kin, zx, zy))
    # 2) өз фоны
    bg_rep(s, n, REST)
    # 3) алдыңғы жартылар — екі жаққа ашылған күйде (үстінде)
    if n > 1 and kin == "crack":
        L = st(960 - 1190, 540 + 43, 1.06, -8); R = st(960 + 1190, 540 - 43, 1.06, 8)
        bg_rep(s, n - 1, None, extra_half=(L, R))
    # 4) келесі фон — кіру алдындағы күйде
    if nxt in ("pan", "wave", "zoom", "rise"): bg_rep(s, n + 1, pre_entry(nxt, nzx, nzy))
    # 5) объектілер
    for k, p in enumerate(m["props"]):
        pic = s.shapes.add_picture(os.path.join(EXP, "props", p["file"]), Emu(int(p["x"] * E)), Emu(int(p["y"] * E)), Emu(int(p["w"] * E)), Emu(int(p["h"] * E)))
        pic.name = f"Prop {n}-{k}"
    # 6) қағаз панельдер мен карточкалар
    for b in m["boxes"]:
        nm = "!!PANEL" if b["cls"] == "panel" and b["lay"] in ("left", "right", "top", "hero") else None
        add_box(s, b, nm)
    # 7) мәтін (өңделетін)
    for t in dedupe(m["texts"]): add_text(s, t)
    # 8) өсу сабағы
    tr_ = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(60 * E), Emu(1047 * E), Emu(1800 * E), Emu(2 * E))
    tr_.fill.solid(); tr_.fill.fore_color.rgb = RGBColor(0xC9, 0xB8, 0x98); tr_.line.fill.background(); tr_.name = "Track"
    g = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Emu(60 * E), Emu(1044 * E), Emu(int(1800 * n / N * E)), Emu(8 * E))
    g.fill.solid(); g.fill.fore_color.rgb = RGBColor(0x8C, 0xC4, 0x6A); g.line.fill.background(); g.name = "!!GROW"
    tip = s.shapes.add_shape(MSO_SHAPE.OVAL, Emu(int((60 + 1800 * n / N - 13) * E)), Emu(1035 * E), Emu(26 * E), Emu(26 * E))
    tip.fill.solid(); tip.fill.fore_color.rgb = RGBColor.from_string(ACT_COL[m["act"]]); tip.line.color.rgb = RGBColor(0xFF, 0xF6, 0xE6); tip.name = "!!TIP"
    lab = s.shapes.add_textbox(Emu(64 * E), Emu(1005 * E), Emu(700 * E), Emu(30 * E))
    lab.text_frame.text = ["", "I", "II", "III", "IV"][m["act"]] + " · " + C.ACTS[m["act"]].upper()
    f = lab.text_frame.paragraphs[0].runs[0].font; f.size = Pt(8); f.bold = True; f.name = "Calibri"; f.color.rgb = RGBColor(0xFF, 0xF0, 0xD2)
    lab.name = "!!ACT"
    s.notes_slide.notes_text_frame.text = C.SLIDES[n - 1]["notes"]

prs.save(OUT)

# ---------- Morph ауысуын XML-ге енгізу ----------
tmp = OUT + ".tmp"
with zipfile.ZipFile(OUT) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        mm = re.match(r"ppt/slides/slide(\d+)\.xml$", item.filename)
        if mm:
            k = int(mm.group(1)); x = data.decode("utf-8")
            if 'xmlns:p14=' not in x:
                x = x.replace("<p:sld ", '<p:sld xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
                              'xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" '
                              'xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" ', 1)
            if k == 1:
                trn = '<p:transition spd="slow"><p:fade/></p:transition>'
            else:
                d = DUR.get(TR[k - 1], 1300)
                trn = (f'<mc:AlternateContent><mc:Choice Requires="p159"><p:transition spd="slow" p14:dur="{d}">'
                       f'<p159:morph option="byObject"/></p:transition></mc:Choice>'
                       f'<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>')
            if "<p:clrMapOvr>" in x:
                x = re.sub(r"(</p:clrMapOvr>)", r"\1" + trn, x, count=1)
            else:
                x = x.replace("</p:cSld>", "</p:cSld>" + trn, 1)
            data = x.encode("utf-8")
        zout.writestr(item, data)
shutil.move(tmp, OUT)
print("presentation.pptx", round(os.path.getsize(OUT) / 1e6, 1), "MB,", N, "slides")
