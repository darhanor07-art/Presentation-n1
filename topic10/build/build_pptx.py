# -*- coding: utf-8 -*-
"""topic10 PPTX құрастырушы — екі нұсқа:
  presentation.pptx        — әр слайдтың фоны = ауысу видеосы (WebGL шейдерден рендерленген MP4),
                             слайд ашылғанда өздігінен ойнайды; мәтін мен HUD Morph арқылы ауысады.
  presentation-morph.pptx  — видеосыз, тек Morph (бейне автоматты ойнамайтын құрылғыларға).
Іске қосу:  python3 topic10/build/build_pptx.py <export_dir>
"""
import json, os, re, sys, shutil, subprocess, zipfile
from lxml import etree
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
sys.path.insert(0, os.path.dirname(__file__))
import content as C

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
EXP = sys.argv[1]
E = 6350
meta = json.load(open(os.path.join(EXP, "meta.json"), encoding="utf-8"))
N = len(meta)
INK, LAMP, IVORY, DIMC = RGBColor(0x0B, 0x0F, 0x1A), RGBColor(0xF4, 0xB7, 0x40), RGBColor(0xF5, 0xEF, 0xE4), RGBColor(0xC9, 0xC4, 0xBA)
ACTN = ["", "I", "II", "III", "IV", "V", "VI"]
BRD = {'1':[1],'2':[1,2],'3':[1,4],'4':[1,4,5],'5':[1,5],'6':[1,2,4],'7':[1,2,4,5],'8':[1,2,5],'9':[2,4],'0':[2,4,5]}
uni = lambda d: chr(0x2800 + sum(1 << (x - 1) for x in d))
brnum = lambda n: uni([3,4,5,6]) + "".join(uni(BRD[c]) for c in str(n))

# ---------- видеолар ----------
def encode_videos():
    vd = os.path.join(EXP, "video"); os.makedirs(vd, exist_ok=True)
    for i in range(1, N + 1):
        src = os.path.join(EXP, "frames", f"{i:02d}"); mp4 = os.path.join(vd, f"{i:02d}.mp4")
        if not os.path.exists(mp4):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", os.path.join(src, "%03d.jpg"),
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22", "-preset", "medium", "-movflags", "+faststart", "-an", mp4], check=True)
    return vd

def rgb(s):
    v = [int(float(x)) for x in re.findall(r"[\d.]+", s)[:3]]; return RGBColor(*v)
def alpha(s):
    v = re.findall(r"[\d.]+", s); return float(v[3]) if len(v) > 3 else 1.0

def add_text(slide, t):
    w = t["w"] * 1.08 + 8
    tb = slide.shapes.add_textbox(Emu(int((t["x"] - 2) * E)), Emu(int((t["y"] - 2) * E)), Emu(int(w * E)), Emu(int((t["h"] + 8) * E)))
    tf = tb.text_frame; tf.word_wrap = True
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"): setattr(tf, side, 0)
    tf.vertical_anchor = MSO_ANCHOR.TOP
    paras = [[]]
    for r in t["runs"]:
        for k, part in enumerate(r["t"].split("\n")):
            if k: paras.append([])
            if part: paras[-1].append((part, r["s"]))
    paras = [p for p in paras if any(x[0].strip() for x in p)] or [[(" ", None)]]
    upper = t["tt"] == "uppercase"
    for i, pr in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = {"center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT, "end": PP_ALIGN.RIGHT}.get(t["align"], PP_ALIGN.LEFT)
        para.line_spacing = max(.85, min(1.7, t["lh"] / t["size"]))
        for k, (txt, s) in enumerate(pr):
            txt = re.sub(r"\s+", " ", txt)
            if k == 0: txt = txt.lstrip()
            if k == len(pr) - 1: txt = txt.rstrip()
            if not txt: continue
            run = para.add_run(); run.text = txt.upper() if upper else txt
            col = (s or {}).get("c") or t["color"]; size = (s or {}).get("z") or t["size"]; wt = (s or {}).get("w") or t["weight"]; it = (s or {}).get("i") or t["style"]
            f = run.font; f.name = "Calibri"; f.size = Pt(size * .5); f.bold = int(float(wt)) >= 600; f.italic = it == "italic"
            if alpha(col) > .05: f.color.rgb = rgb(col)
            else: f.color.rgb = IVORY
            if t["ls"]: run._r.get_or_add_rPr().set("spc", str(int(t["ls"] * .5 * 100)))
    tb.name = "T " + re.sub(r"\s+", " ", "".join(r["t"] for r in t["runs"]))[:30]
    return tb

def hud(slide, n, act):
    for d in range(1, 7):
        cx = 1804 + 44 * (.28 if d <= 3 else .72); cy = 56 + 66 * (.18, .5, .82)[(d - 1) % 3]
        c = slide.shapes.add_shape(MSO_SHAPE.OVAL, Emu(int((cx - 8.5) * E)), Emu(int((cy - 8.5) * E)), Emu(int(17 * E)), Emu(int(17 * E)))
        c.fill.solid(); c.fill.fore_color.rgb = LAMP if d <= act else RGBColor(0x2A, 0x30, 0x40)
        c.line.color.rgb = RGBColor(0xFF, 0xD2, 0x7A) if d <= act else RGBColor(0x5A, 0x60, 0x70); c.line.width = Emu(2 * E)
        c.name = f"!!H{d}"
    tb = slide.shapes.add_textbox(Emu(1560 * E), Emu(58 * E), Emu(224 * E), Emu(66 * E)); tf = tb.text_frame
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"): setattr(tf, side, 0)
    p1 = tf.paragraphs[0]; p1.alignment = PP_ALIGN.RIGHT; r = p1.add_run(); r.text = brnum(n)
    r.font.name = "Segoe UI Symbol"; r.font.size = Pt(15); r.font.color.rgb = LAMP
    p2 = tf.add_paragraph(); p2.alignment = PP_ALIGN.RIGHT; r = p2.add_run(); r.text = f"{n:02d} / {N}"
    r.font.name = "Calibri"; r.font.size = Pt(10); r.font.bold = True; r.font.color.rgb = DIMC
    tb.name = "!!NUM"
    tb = slide.shapes.add_textbox(Emu(110 * E), Emu(1036 * E), Emu(900 * E), Emu(28 * E)); tf = tb.text_frame
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"): setattr(tf, side, 0)
    r = tf.paragraphs[0].add_run(); r.text = f"{ACTN[act]} · {C.ACTS[act]}".upper()
    r.font.name = "Calibri"; r.font.size = Pt(9); r.font.bold = True; r.font.color.rgb = DIMC; r._r.get_or_add_rPr().set("spc", "250")
    tb.name = "!!ACT"
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Emu(0), Emu(1076 * E), Emu(int(1920 * n / N * E)), Emu(4 * E))
    bar.fill.solid(); bar.fill.fore_color.rgb = LAMP; bar.line.fill.background(); bar.name = "!!BAR"

AUTOPLAY = '''<p:timing xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>
<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>
<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>
<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>
<p:par><p:cTn id="5" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="afterEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>
<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="6" dur="{ms}" fill="hold"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:cmd>
</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>
</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>
<p:video><p:cMediaNode vol="0"><p:cTn id="7" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cMediaNode></p:video>
</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>'''

def build(video: bool, out_name: str):
    prs = Presentation(); prs.slide_width, prs.slide_height = Emu(1920 * E), Emu(1080 * E)
    blank = prs.slide_layouts[6]
    vd = encode_videos() if video else None
    durs = {}
    for m in meta:
        n = m["n"]; s = prs.slides.add_slide(blank)
        if video:
            mp4 = os.path.join(vd, f"{n:02d}.mp4"); poster = os.path.join(EXP, "frames", f"{n:02d}", "000.jpg")
            mv = s.shapes.add_movie(mp4, 0, 0, Emu(1920 * E), Emu(1080 * E), poster_frame_image=poster, mime_type="video/mp4")
            mv.name = f"Ауысу видеосы {n:02d}"
            frames = len([f for f in os.listdir(os.path.join(EXP, "frames", f"{n:02d}")) if f.endswith(".jpg")])
            durs[n] = int(frames / 30 * 1000)
            # python-pptx қосқан «басқанда ойнау» уақыт шкаласын автоматты ойнатуға ауыстырамыз
            sld = s._element; old = sld.find(qn("p:timing"))
            if old is not None: sld.remove(old)
            new = etree.fromstring(AUTOPLAY.replace("{ms}", str(durs[n])).replace("{spid}", str(mv.shape_id)))
            ext = sld.find(qn("p:extLst"))
            (ext.addprevious(new) if ext is not None else sld.append(new))
        else:
            pic = s.shapes.add_picture(os.path.join(EXP, "bg", f"{n:02d}.jpg"), 0, 0, Emu(1920 * E), Emu(1080 * E)); pic.name = "!!BG"
        g = s.shapes.add_picture(os.path.join(EXP, "gfx", f"{n:02d}.png"), 0, 0, Emu(1920 * E), Emu(1080 * E)); g.name = f"Графика {n:02d}"
        for t in m["texts"]: add_text(s, t)
        hud(s, n, m["act"])
        s.notes_slide.notes_text_frame.text = C.S[n - 1]["notes"]
    path = os.path.join(ROOT, out_name); prs.save(path)
    # Morph ауысуы
    tmp = path + ".tmp"
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            mm = re.match(r"ppt/slides/slide(\d+)\.xml$", item.filename)
            if mm:
                k = int(mm.group(1)); x = data.decode("utf-8")
                root_end = x.index(">", x.index("<p:sld "))
                root = x[:root_end]
                for pre, uri in (("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006"),
                                 ("p14", "http://schemas.microsoft.com/office/powerpoint/2010/main"),
                                 ("p159", "http://schemas.microsoft.com/office/powerpoint/2015/09/main")):
                    if f"xmlns:{pre}=" not in root:
                        x = x.replace("<p:sld ", f'<p:sld xmlns:{pre}="{uri}" ', 1); root = x[:x.index(">", x.index("<p:sld "))]
                if k == 1:
                    trn = '<p:transition spd="slow"><p:fade/></p:transition>' if not video else ""
                else:
                    d = 800 if video else 1300
                    trn = (f'<mc:AlternateContent><mc:Choice Requires="p159"><p:transition spd="slow" p14:dur="{d}"><p159:morph option="byObject"/></p:transition></mc:Choice>'
                           f'<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>')
                x = re.sub(r"(</p:clrMapOvr>)", lambda mo: mo.group(1) + trn, x, count=1)
                data = x.encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp, path)
    print(out_name, round(os.path.getsize(path) / 1e6, 1), "MB")

build(True, "presentation.pptx")
build(False, "presentation-morph.pptx")
