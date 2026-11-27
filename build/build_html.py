# -*- coding: utf-8 -*-
"""index.html құрастырушы. Іске қосу: python3 build/build_html.py (репозиторий түбірінен)."""
import base64, io, json, os, random, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageFilter, ImageEnhance
import content as C, scene as SC, props as P

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
random.seed(7)

def b64img(path, w=1920, q=80):
    im = Image.open(os.path.join(ROOT, path)).convert("RGB")
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANDSCAPE if False else Image.LANCZOS)
    elif im.width < w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

# ---------- фон ----------
def bg_html(spec):
    if spec[0] == "paper":
        return '<div class="bgimg paper"></div>'
    if spec[0] == "sky":
        return '<div class="bgimg sky"></div>'
    src, fx, fy, z, blur, br = spec
    # кадрлау: суретті z есе үлкейтіп, (fx,fy) нүктесін ортаға жақындатамыз
    tx = (50 - fx) * (z - 1) / z * 1.0
    ty = (50 - fy) * (z - 1) / z * 1.0
    flt = f"filter:blur({blur}px) brightness({br});" if (blur or br != 1) else ""
    return (f'<div class="bgimg" style="background-image:var(--img-{src});'
            f'transform:scale({z * (1.04 if blur else 1):.3f}) translate({tx:.2f}%,{ty:.2f}%);{flt}"></div>')

# ---------- мәтін панелі ----------
def esc(s): return s

def panel_html(s):
    lay = s["lay"]; i = 0
    def rv(tag, cls, inner, extra=""):
        nonlocal i; i += 1
        return f'<{tag} class="{cls} rv" style="--i:{i}" {extra}>{inner}</{tag}>'
    h = ""
    if s.get("kicker"): h += rv("div", "kicker", s["kicker"])
    tcls = "title big" if s.get("big") else ("title long" if len(s["title"]) > 44 and s["lay"] in ("left","right") else "title")
    h += rv("h2", tcls, s["title"])
    if s.get("sub"): h += rv("p", "sub", s["sub"])
    if s.get("answer"):
        h += rv("p", "answer", "Жоқ.")
    if s.get("body"): h += rv("p", "body", s["body"].replace("Жоқ. ", "") if s.get("answer") else s["body"])
    if s.get("facts"):
        h += '<div class="facts">' + "".join(rv("div", "fact", f"<b>{a}</b><span>{b}</span>") for a, b in s["facts"]) + "</div>"
    if s.get("stats"):
        h += '<div class="stats">' + "".join(rv("div", "stat", f"<b>{a}</b><span>{b}</span>") for a, b in s["stats"]) + "</div>"
    if s.get("pairs"):
        h += '<div class="pairs">' + "".join(rv("div", "pair", f"<b>{a}</b><span>{b}</span>") for a, b in s["pairs"]) + "</div>"
    if s.get("steps2"):
        h += '<div class="steps2">' + "".join(rv("div", "st2", f"<i>{k+1}</i><b>{a}</b><span>{b}</span>") for k, (a, b) in enumerate(s["steps2"])) + "</div>"
    if s.get("wait"):
        h += rv("div", "wait", '<span class="dots">' + "".join(f'<s style="--k:{k}"></s>' for k in range(5)) + "</span>5 секунд күту")
    if s.get("quote"): h += rv("p", "quote", s["quote"])
    if s.get("ask"): h += rv("p", "ask", s["ask"])
    if s.get("note"): h += rv("p", "small", s["note"])
    return f'<div class="panel lay-{lay}">{h}<span class="tape t1"></span><span class="tape t2"></span></div>'

def extras_html(s):
    """Панельден тыс мағыналы блоктар."""
    h = ""
    if s.get("steps"):  # 04 — құмыралардың астындағы жазулар
        for k, (a, b) in enumerate(s["steps"]):
            x = 960 - 860 + (190 + k * 370) * 1720 / 1500
            h += f'<div class="cap rv" style="--i:{k+3};left:{x-160}px;top:880px"><b>{a}</b>{b}</div>'
    if s.get("grid"):  # 06 — алты карточка
        for k, (a, b) in enumerate(s["grid"]):
            x = 150 + (k % 3) * 560; y = 360 + (k // 3) * 330
            r = (-2, 1.5, -1, 1.2, -1.6, 2)[k]
            h += f'<div class="note rv" style="--i:{k+3};left:{x}px;top:{y}px;transform:rotate({r}deg)"><b>{a}</b><span>{b}</span><i class="pin"></i></div>'
    if s.get("grid3"):  # 11 — үш есіктің үстіндегі жазулар
        for k, (q, a, b) in enumerate(s["grid3"]):
            x = 960 - 860 + 40 + k * 600 * (1720 / 1840)
            h += f'<div class="door-cap rv" style="--i:{k+3};left:{x:.0f}px;top:735px;width:{500*1720/1840:.0f}px"><em>{q}</em><b>{a}</b><span>{b}</span></div>'
    if s.get("split"):  # 22 — екі жол
        (a1, b1), (a2, b2) = s["split"]
        h += f'<div class="path-cap rv" style="--i:4;left:80px;top:860px"><b>{a1}</b>{b1}</div>'
        h += f'<div class="path-cap rv" style="--i:5;right:80px;top:860px;text-align:right"><b>{a2}</b>{b2}</div>'
    if s.get("credits"):
        h += '<div class="credits">' + "".join(
            f'<div class="cr rv" style="--i:{k+4}"><i>{a}</i><b>{b}</b><span>{c}</span></div>' for k, (a, b, c) in enumerate(s["credits"])) + "</div>"
        h += f'<div class="sources rv" style="--i:8">Дереккөздер: {s["sources"]}</div>'
    return h

def props_html(n):
    out = ""
    for spec in SC.SCENE[n].get("props", []):
        name, cx, cy, w, *args = spec
        fn = getattr(P, name)
        if name == "doors":
            svg = fn([g for g in C.SLIDES[n-1]["grid3"]])
        else:
            svg = fn(*args)
        import re
        m = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg); vw, vh = int(m.group(1)), int(m.group(2))
        h = w * vh / vw
        out += f'<div class="propbox" style="left:{cx-w/2:.0f}px;top:{cy-h/2:.0f}px;width:{w}px;height:{h:.0f}px">{svg}</div>'
    if SC.SCENE[n].get("rose"):
        out += '<div class="rose-frame"><div class="rose-in"><img src="" data-src="rose" alt="Дэвид Х. Роуз"></div><div class="rose-plate">David H. Rose</div></div><div class="picture-light"></div>'
    return out

def fx_html(kind, n):
    """Фондағы ұсақ қозғалатын детальдар (мағыналы)."""
    out = ""
    if kind == "dust":
        for k in range(26):
            out += f'<i class="mote" style="left:{random.randint(0,1900)}px;top:{random.randint(0,1060)}px;--s:{random.uniform(3,7):.1f}px;--t:{random.uniform(9,18):.1f}s;--dl:-{random.uniform(0,18):.1f}s;--dx:{random.randint(-80,80)}px"></i>'
    elif kind in ("leaves", "petals"):
        col = "#d8513d" if kind == "petals" else "#7fb35a"
        for k in range(10):
            out += f'<i class="leaf" style="left:{random.randint(0,1900)}px;--c:{col};--t:{random.uniform(11,19):.1f}s;--dl:-{random.uniform(0,19):.1f}s;--r:{random.randint(-200,200)}deg;--dx:{random.randint(-260,260)}px"></i>'
    elif kind == "wave":
        out += '<svg class="fxwave" viewBox="0 0 1920 160" preserveAspectRatio="none"><path d="M0 80 C 160 20 320 140 480 80 S 800 20 960 80 S 1280 140 1440 80 S 1760 20 1920 80 S 2240 140 2400 80 S 2720 20 2880 80"/></svg>'
    elif kind == "cards":
        for k in range(6):
            out += f'<i class="mini" style="left:{random.randint(0,1880)}px;--t:{random.uniform(14,22):.1f}s;--dl:-{random.uniform(0,22):.1f}s;--r:{random.randint(-30,30)}deg"></i>'
    return f'<div class="fx">{out}</div>'

def slide_html(s):
    n = s["id"]; sc = SC.SCENE[n]
    shade = {"left": "shade-l", "right": "shade-r", "top": "shade-t", "center": "shade-c", "hero": "shade-t", "credits": "shade-c"}[s["lay"]]
    zx, zy = s.get("zx", 50), s.get("zy", 50)
    body = (f'<div class="layer bg">{bg_html(sc["bg"])}<div class="shade {shade}"></div></div>'
            f'{fx_html(s.get("fx",""), n)}<div class="layer props">{props_html(n)}</div>'
            f'{panel_html(s) if s["lay"]!="credits" else credits_panel(s)}{extras_html(s)}')
    return (f'<section class="slide" data-n="{n}" data-tr="{s["tr"]}" data-zx="{zx}" data-zy="{zy}" data-act="{s["act"]}">'
            f'<!-- {n:02d}: {s["title"].replace("<br>"," ")} -->{body}</section>')

def credits_panel(s):
    return (f'<div class="end-title"><div class="kicker rv" style="--i:1">{s["kicker"]}</div>'
            f'<h2 class="title big rv" style="--i:2">{s["title"]}</h2><p class="body rv" style="--i:3">{s["body"]}</p></div>')

CSS = open(os.path.join(os.path.dirname(__file__), "deck.css"), encoding="utf-8").read()
JS = open(os.path.join(os.path.dirname(__file__), "deck.js"), encoding="utf-8").read()
VIEWPORT = open(os.path.join(os.path.dirname(__file__), "viewport-base.css"), encoding="utf-8").read()

def build():
    imgs = {k: b64img(v, 1920 if k not in ("rose",) else 1200, 78) for k, v in SC.SRC.items()}
    rootvars = ":root{" + "".join(f"--img-{k}:url({v});" for k, v in imgs.items() if k != "rose") + "}"
    slides = "\n".join(slide_html(s) for s in C.SLIDES)
    notes = json.dumps([s["notes"] for s in C.SLIDES], ensure_ascii=False).replace("</", "<\\/")
    acts = json.dumps(C.ACTS, ensure_ascii=False)
    html = f'''<!DOCTYPE html>
<html lang="kk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Әр тұқымның көктеу уақыты</title>
<!-- {C.TITLE} — 30 слайд. Бұл файлды build/build_html.py құрастырады; мазмұнды build/content.py ішінде өзгертіңіз.
     Басқару: → / Space — келесі, ← — алдыңғы, N — баяндамашы жазбалары, F — толық экран, E — мәтінді өңдеу, Ctrl+S — сақтау. -->
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Golos+Text:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
/* === VIEWPORT BASE (frontend-slides) === */
{VIEWPORT}
/* === SOURCE IMAGES (embedded so the file works on its own) === */
{rootvars}
{CSS}
</style>
</head>
<body>
<div class="deck-viewport">
<main class="deck-stage" id="deckStage">
{slides}
<div class="fxlayer" id="fxlayer"></div>
<div class="growbar" id="growbar"><svg viewBox="0 0 1920 60" preserveAspectRatio="none"><path class="track" d="M60 34 H1860"/><path class="vine" id="vine" pathLength="1" d="M60 34 C 200 20, 300 48, 440 34 S 700 20, 840 34 S 1100 48, 1240 34 S 1500 20, 1640 34 S 1800 46, 1860 34"/></svg><div class="tip" id="tip"></div><div class="actlbl" id="actlbl"></div></div>
</main>
</div>
<div class="hint">← → · N жазбалар · F толық экран · E өңдеу</div>
<div class="notes" id="notes"></div>
<div class="counter" id="counter"></div>
<script>
const NOTES = {notes};
const ACTS = {acts};
const ROSE = "{imgs["rose"]}";
{JS}
</script>
</body>
</html>'''
    out = os.path.join(ROOT, "index.html")
    open(out, "w", encoding="utf-8").write(html)
    print("index.html", round(len(html) / 1e6, 2), "MB")

if __name__ == "__main__":
    build()
