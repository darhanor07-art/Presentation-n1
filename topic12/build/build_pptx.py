# -*- coding: utf-8 -*-
"""topic12 «x ≠ 0» PPTX құрастырушы — екі нұсқа:
  presentation.pptx        — әр слайдтың фоны = 3D-сыныптағы камера ауысуының видеосы (слайд ашылғанда өздігінен ойнайды);
                             мәтін өңделетін, слайдтан слайдқа көшетін детальдар (!!x, !!eq, !!c, !!t, !!s, !!card, !!nl) Morph арқылы қозғалады.
  presentation-morph.pptx  — видеосыз нұсқа: фон — тыныш кадр, ауысу — Morph.
Іске қосу:  python3 topic12/build/build_pptx.py <export_dir>
"""
import json, os, re, sys, shutil, subprocess, zipfile
from lxml import etree
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
sys.path.insert(0, os.path.dirname(__file__))
import content as C

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
EXP = sys.argv[1]
E = 6350                                   # 1 px (1920×1080 сахна) = 6350 EMU
meta = json.load(open(os.path.join(EXP, "meta.json"), encoding="utf-8"))
N = len(meta)
CHALK = RGBColor(0xF5, 0xF0, 0xE6)
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"

# ---------- видеолар ----------
def encode_videos():
    vd = os.path.join(EXP, "video"); os.makedirs(vd, exist_ok=True)
    for i in range(1, N + 1):
        src = os.path.join(EXP, "frames", f"{i:02d}"); mp4 = os.path.join(vd, f"{i:02d}.mp4")
        if not os.path.exists(mp4):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "30", "-i", os.path.join(src, "%03d.jpg"),
                            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21", "-preset", "medium", "-movflags", "+faststart", "-an", mp4], check=True)
    return vd

def rgb(s):
    v = [int(float(x)) for x in re.findall(r"[\d.]+", s)[:3]]; return RGBColor(*v)
def alpha(s):
    v = re.findall(r"[\d.]+", s); return float(v[3]) if len(v) > 3 else 1.0
def font_of(family): return "Caveat" if "Caveat" in (family or "") else "Rubik"

def set_alpha(run, a):
    """Жүгірткінің түсіне мөлдірлік қосу (0..1)."""
    rPr = run._r.get_or_add_rPr(); sf = rPr.find(qn("a:solidFill"))
    if sf is None: return
    clr = sf[0]; al = etree.SubElement(clr, qn("a:alpha")); al.set("val", str(int(max(0, min(1, a)) * 100000)))

def add_text(shapes, t):
    one_line = t["h"] < t["lh"] * 1.5
    x0, w0 = (t["tx"], t["tw"]) if one_line and t.get("tw") else (t["x"], t["w"])   # бір жолдық мәтін — нақты ені бойынша
    w = w0 * 1.06 + 10
    tb = shapes.add_textbox(Emu(int((x0 - 2) * E)), Emu(int((t["y"] - 2) * E)), Emu(int(w * E)), Emu(int((t["h"] + 8) * E)))
    tf = tb.text_frame; tf.word_wrap = not (one_line or t.get("ws") == "nowrap")
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"): setattr(tf, side, 0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE if t.get("vmid") else MSO_ANCHOR.TOP
    if t.get("vmid"): tb.top = Emu(int(t["y"] * E)); tb.height = Emu(int(t["h"] * E))
    paras = [[]]
    for r in t["runs"]:
        for k, part in enumerate(r["t"].split("\n")):
            if k: paras.append([])
            if part: paras[-1].append((part, r["s"]))
    paras = [p for p in paras if any(x[0].strip() for x in p)] or [[(" ", None)]]
    upper = t["tt"] == "uppercase"
    for i, pr in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = PP_ALIGN.CENTER if t.get("hcen") else {"center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT, "end": PP_ALIGN.RIGHT}.get(t["align"], PP_ALIGN.LEFT)
        para.line_spacing = max(.8, min(1.7, t["lh"] / t["size"]))
        for k, (txt, s) in enumerate(pr):
            txt = re.sub(r"\s+", " ", txt)
            if k == 0: txt = txt.lstrip()
            if k == len(pr) - 1: txt = txt.rstrip()
            if not txt: continue
            run = para.add_run(); run.text = txt.upper() if upper else txt
            s = s or {}
            col = s.get("c") or t["color"]; size = s.get("z") or t["size"]; wt = s.get("w") or t["weight"]; it = s.get("i") or t["style"]
            f = run.font; f.name = font_of(s.get("f") or t["family"]); f.size = Pt(size * .5); f.bold = int(float(wt)) >= 600; f.italic = it == "italic"
            f.color.rgb = rgb(col) if alpha(col) > .05 else CHALK
            if s.get("hide"): set_alpha(run, 0)                     # детальдың астындағы жасырын белгі (x, =)
            elif alpha(col) < .98: set_alpha(run, alpha(col))
            if "line-through" in (s.get("deco") or t.get("deco") or ""): run._r.get_or_add_rPr().set("strike", "sngStrike")
            if t["ls"]: run._r.get_or_add_rPr().set("spc", str(int(t["ls"] * .5 * 100)))
    tb.name = "Мәтін · " + re.sub(r"\s+", " ", "".join(r["t"] for r in t["runs"]))[:28]
    return tb

def add_props(shapes, m):
    for p in m["props"]:
        k, st, (bw, bh) = p["k"], p["st"], p["base"]
        img = os.path.join(EXP, "props", f"{k}{'_' + st['v'] if st.get('v') else ''}.png")
        w, h = bw * st["s"], bh * st["s"]
        pic = shapes.add_picture(img, Emu(int((st["cx"] - w / 2) * E)), Emu(int((st["cy"] - h / 2) * E)), Emu(int(w * E)), Emu(int(h * E)))
        pic.rotation = st.get("r", 0) or 0
        pic.name = f"!!{k}"                                          # Morph осы атау бойынша қозғалтады

def media_par(spid, ms, cid):
    return (f'<p:par><p:cTn id="{cid}" presetID="1" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="afterEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
            f'<p:cmd type="call" cmd="playFrom(0.0)"><p:cBhvr><p:cTn id="{cid + 1}" dur="{ms}" fill="hold"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl></p:cBhvr></p:cmd>'
            f'</p:childTnLst></p:cTn></p:par>')
def motion_par(spid, cid, node="afterEffect"):
    return (f'<p:par><p:cTn id="{cid}" presetID="0" presetClass="path" presetSubtype="0" accel="0" decel="20000" fill="hold" nodeType="{node}"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
            f'<p:animMotion origin="layout" path="M 0 0.92 L 0 0 E" pathEditMode="relative" rAng="0" ptsTypes="">'
            f'<p:cBhvr><p:cTn id="{cid + 1}" dur="11000" fill="hold"/><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl><p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:rCtr x="0" y="-46000"/></p:animMotion></p:childTnLst></p:cTn></p:par>')
def timing(pars, video_spid=None):
    vid = (f'<p:video><p:cMediaNode vol="0"><p:cTn id="90" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn>'
           f'<p:tgtEl><p:spTgt spid="{video_spid}"/></p:tgtEl></p:cMediaNode></p:video>') if video_spid else ""
    return ('<p:timing xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            '<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
            f'<p:par><p:cTn id="4" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{"".join(pars)}</p:childTnLst></p:cTn></p:par>'
            '</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            f'<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>{vid}</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>')

def put_timing(slide, xml):
    sld = slide._element; old = sld.find(qn("p:timing"))
    if old is not None: sld.remove(old)
    new = etree.fromstring(xml); ext = sld.find(qn("p:extLst"))
    (ext.addprevious(new) if ext is not None else sld.append(new))

def notes_text(n):
    s = C.S[n - 1]; return f'{C.AUTHORS[s["who"]]["name"]} · {C.ACTS[s["act"]]}\n\n{s["say"]}'

def build(video: bool, out_name: str):
    prs = Presentation(); prs.slide_width, prs.slide_height = Emu(1920 * E), Emu(1080 * E)
    blank = prs.slide_layouts[6]; vd = encode_videos() if video else None
    for m in meta:
        n = m["n"]; s = prs.slides.add_slide(blank); pars = []; vspid = None
        if video:
            mp4 = os.path.join(vd, f"{n:02d}.mp4"); poster = os.path.join(EXP, "frames", f"{n:02d}", "000.jpg")
            mv = s.shapes.add_movie(mp4, 0, 0, Emu(1920 * E), Emu(1080 * E), poster_frame_image=poster, mime_type="video/mp4")
            mv.name = f"3D-сынып · камера {n:02d}"; vspid = mv.shape_id
            frames = len([f for f in os.listdir(os.path.join(EXP, "frames", f"{n:02d}")) if f.endswith(".jpg")])
            pars.append(media_par(mv.shape_id, int(frames / 30 * 1000), 5))
        else:
            pic = s.shapes.add_picture(os.path.join(EXP, "bg", f"{n:02d}.jpg"), 0, 0, Emu(1920 * E), Emu(1080 * E)); pic.name = "!!BG"
        g = s.shapes.add_picture(os.path.join(EXP, "gfx", f"{n:02d}.png"), 0, 0, Emu(1920 * E), Emu(1080 * E)); g.name = f"Графика {n:02d}"
        texts = [t for t in m["texts"] if not (n in (1, N) and not t.get("credits") and t["y"] < 120)]
        if n == N:   # титрлар: топ болып төменнен жоғары көтеріледі
            grp = s.shapes.add_group_shape(); grp.name = "Титрлар"
            for t in texts:
                if t.get("credits"): add_text(grp.shapes, t)
            add_props(grp.shapes, m)
            pars.append(motion_par(grp.shape_id, 20, "withEffect" if video else "afterEffect"))
            for t in texts:
                if not t.get("credits"): add_text(s.shapes, t)
        else:
            for t in texts: add_text(s.shapes, t)
            add_props(s.shapes, m)
        if pars: put_timing(s, timing(pars, vspid))
        s.notes_slide.notes_text_frame.text = notes_text(n)
    path = os.path.join(ROOT, out_name); prs.save(path)
    # Morph ауысуы (әр слайдқа), namespace-терді қосу
    tmp = path + ".tmp"
    with zipfile.ZipFile(path) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            mm = re.match(r"ppt/slides/slide(\d+)\.xml$", item.filename)
            if mm:
                k = int(mm.group(1)); x = data.decode("utf-8")
                root = x[:x.index(">", x.index("<p:sld "))]
                for pre, uri in (("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006"),
                                 ("p14", "http://schemas.microsoft.com/office/powerpoint/2010/main"),
                                 ("p159", "http://schemas.microsoft.com/office/powerpoint/2015/09/main")):
                    if f"xmlns:{pre}=" not in root:
                        x = x.replace("<p:sld ", f'<p:sld xmlns:{pre}="{uri}" ', 1); root = x[:x.index(">", x.index("<p:sld "))]
                if k == 1: trn = '<p:transition spd="slow"><p:fade/></p:transition>'
                else:
                    d = 700 if video else 1400
                    trn = (f'<mc:AlternateContent><mc:Choice Requires="p159"><p:transition spd="slow" p14:dur="{d}"><p159:morph option="byObject"/></p:transition></mc:Choice>'
                           f'<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>')
                x = re.sub(r"(</p:clrMapOvr>)", lambda mo: mo.group(1) + trn, x, count=1)
                data = x.encode("utf-8")
            zout.writestr(item, data)
    shutil.move(tmp, path)
    print(out_name, round(os.path.getsize(path) / 1e6, 1), "MB")

if __name__ == "__main__":
    which = sys.argv[2] if len(sys.argv) > 2 else "both"
    if which in ("both", "video"): build(True, "presentation.pptx")
    if which in ("both", "morph"): build(False, "presentation-morph.pptx")
