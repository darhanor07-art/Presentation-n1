# -*- coding: utf-8 -*-
"""content.py → topic12/index.html (бір файл: CSS, JS, three.js, anime.js, кескін — бәрі ішінде).
Іске қосу: python3 topic12/build/build_html.py
"""
import base64, html, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import content as C

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); REPO = os.path.dirname(ROOT)
rd = lambda p: open(p, encoding="utf-8").read()
E = lambda s: html.escape(s, quote=False)

KICK_LINE = '<svg viewBox="0 0 100 14" preserveAspectRatio="none" data-a="line"><path d="M1 9 C 22 4, 48 12, 70 6 S 96 7, 99 5"/></svg>'
SHAPE = {
    "circle": '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="#F4C95D"/></svg>',
    "triangle": '<svg viewBox="0 0 100 100"><path d="M50 10 L92 86 L8 86 Z" fill="#F28B6C" stroke-linejoin="round"/></svg>',
    "square": '<svg viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72" rx="8" fill="#8FD3B6"/></svg>',
}
SHAPE_OF = {"A": "circle", "K": "triangle", "Q": "square"}
ANCH = {"circle": "c", "triangle": "t", "square": "s", "x": "x"}

def kick(s): return f'<div class="kick" data-a="kick" data-edit>{E(s)}{KICK_LINE}</div>' if s else ""
def body(s): return f'<p class="bd" data-a="words" data-edit>{E(s)}</p>' if s else ""
def ask(s): return f'<p class="ask" data-a="fade" data-edit>{E(s)}</p>' if s else ""
def note(s): return f'<p class="note" data-a="fade" data-edit>{E(s)}</p>' if s else ""
def src(s): return f'<p class="src" data-a="fade" data-edit>{E(s)}</p>' if s else ""
gx = lambda ch, a, extra="": f'<span class="gx" data-anchor="{a}"{extra}>{ch}</span>'

def title(s, sid):
    t = E(s)
    if sid == 3: t = "7 + 5 " + gx("=", "eq") + " ?"
    if sid == 7: t = gx("x", "x") + " " + gx("=", "eq") + " 0 ?"
    if sid == 15: t = "Бір есеп " + gx("=", "eq") + " үш кіріс"
    if sid == 26: t = "Айарудың " + gx("x", "x") + "-і табылды"
    if sid == 28: t = gx("=", "eq") + " Теңдіктің төрт шарты"
    if sid in (1, 29): t = gx("x", "x") + " " + gx("≠", "eq") + " 0"
    return f'<h2 class="ttl" data-a="title" data-edit>{t}</h2>'

def slide_html(s):
    sid, side = s["id"], s["side"]
    k, parts, panel_cls, scrim = s.get("kicker", ""), [], "panel", ""
    if sid == 1:
        panel_cls = "panel bare cover"; scrim = '<div class="scrim L"></div>'
        auth = "".join(f'<span><i data-anchor="{ANCH[SHAPE_OF[a]]}"></i>{E(C.AUTHORS[a]["name"])}</span>' for a in "AKQ")
        parts = [kick(k), title(C.TITLE, 1), body(s["body"]), f'<div class="authors" data-a="fade">{auth}</div>']
    elif sid == 7:
        panel_cls = "panel bare hook"; scrim = '<div class="scrim R"></div>'
        parts = [kick(k), title(s["title"], 7), f'<p class="q" data-a="words" data-edit>{E(s["body"])}</p>', note(s.get("note"))]
    elif sid == 29:
        panel_cls = "panel bare answer"; scrim = '<div class="scrim R"></div>'
        f = E(s["formula"]).replace("сөз", "<b>сөз</b>").replace("сурет", "<b>сурет</b>").replace("карточка", "<b>карточка</b>").replace("уақыт", "<b>уақыт</b>").replace("жұп", "<b>жұп</b>")
        parts = [kick(k), title(s["title"], 29), f'<p class="q" data-a="fade" data-edit>{E(s["body"])}</p>',
                 f'<p class="ans" data-a="pop" data-edit>{E(s["answer"])}</p>', f'<p class="formula" data-a="fade" data-edit>{f}</p>']
    elif sid == 30:
        names = "".join(f'<div class="role" data-edit>{E(C.AUTHORS[a]["role"])}</div><div class="name"><i class="slot" data-anchor="{ANCH[SHAPE_OF[a]]}"></i><span data-edit>{E(C.AUTHORS[a]["name"])}</span></div>' for a in "AKQ")
        srcs = "<br>".join(E(x) for x in C.SOURCES)
        cr = (f'<div class="credits-win"><div class="credits" id="credits">'
              f'<div class="ct">{gx("x", "x")} {gx("≠", "eq")} 0</div><div class="thx" data-edit>{E(s["kicker"])}</div>'
              f'{names}<div class="all" data-edit>Үшеуміз де — {E(C.ROLE_ALL)}</div>'
              f'<div class="fic" data-edit>Айару мен Ерасыл — ойдан құрастырылған кейіпкерлер.<br>3D сынып, ауысулар және анимация — three.js · anime.js</div>'
              f'<div class="role">Дереккөздер</div><div class="srcs" data-edit>{srcs}</div>'
              f'<div class="end">x ≠ 0</div></div></div>')
        return f'<section class="slide s-30 side-C kind-credits" data-id="30"><div class="layer"><div class="scrim C"></div></div>{cr}<!-- {E(s["say"])} --></section>'
    else:
        parts = [kick(k), title(s["title"], sid)]
        if s.get("sub"): parts.append(f'<p class="sub" data-a="fade" data-edit>{E(s["sub"])}</p>')
        if s.get("chalk"): parts.append(f'<p class="chalkq" data-a="words" data-edit>{E(s["chalk"])}</p>')
        if s.get("wait"):
            parts.append('<div class="wait" data-a="fade"><div class="ring"><svg viewBox="0 0 190 190"><circle class="bg" cx="95" cy="95" r="82"/>'
                         '<circle class="fg" cx="95" cy="95" r="82"/></svg><b>5</b></div><p class="q" data-edit>«Жеті қосу бес қанша?»</p></div>')
        parts.append(body(s.get("body", "")))
        if s.get("steps"):
            who = {0: "A", 1: "Q", 2: "K", 3: "K", 4: "Q", 5: "A"}
            items = []
            for i, (a, b) in enumerate(s["steps"]):
                shp = SHAPE_OF[who[i]]
                ic = f'<span class="who" data-anchor="{ANCH[shp]}"></span>' if i < 3 else f'<span class="who">{SHAPE[shp]}</span>'
                items.append(f'<div class="step" data-a="row">{ic}<div><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div></div>')
            parts.append(f'<div class="steps">{"".join(items)}</div>')
        if s.get("grid"):
            parts.append('<div class="grid6">' + "".join(f'<div class="cell" data-a="row"><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["grid"]) + '</div>')
        if s.get("pairs"):
            rows = []
            for i, (a, b) in enumerate(s["pairs"]):
                ic = f'<i class="ic" data-anchor="{["c", "t", "s"][i]}"></i>' if sid == 16 else ""
                rows.append(f'<div class="pair" data-a="row">{ic or ""}<span class="k" data-edit>{E(a)}</span><span class="v" data-edit>{E(b)}</span></div>' if not ic else
                            f'<div class="pair" data-a="row" style="grid-template-columns:auto auto 1fr">{ic}<span class="k" data-edit>{E(a)}</span><span class="v" data-edit>{E(b)}</span></div>')
            parts.append(f'<div class="pairs">{"".join(rows)}</div>')
        if s.get("stats"):
            parts.append('<div class="stats">' + "".join(f'<div class="stat" data-a="row"><b data-count="{E(a)}">{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["stats"]) + '</div>')
        if s.get("facts"):
            parts.append('<div class="facts">' + "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["facts"]) + '</div>')
        if s.get("udl"):
            parts.append('<div class="udl">' + "".join(f'<div class="ucol" data-a="row"><div class="ico" data-anchor="{ANCH[sh]}"></div><div class="q">{E(q)}</div><div class="bx"><b data-edit>{E(n)}</b><span data-edit>{E(d)}</span></div></div>' for sh, q, n, d in s["udl"]) + '</div>')
        if s.get("steps2"):
            parts.append('<div class="steps2">' + "".join(f'<div class="st2" data-a="row"><i>{i + 1}</i><div><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div></div>' for i, (a, b) in enumerate(s["steps2"])) + '</div>')
        if s.get("items"):
            li = []
            for it in s["items"]:
                slot = '<span class="nlslot" data-anchor="nl"></span>' if sid == 19 and it.startswith("Сан түзуі") else ""
                li.append(f'<li><span data-edit>{E(it)}</span>{slot}</li>')
            parts.append(f'<ul class="list" data-a="stagger">{"".join(li)}</ul>')
        if s.get("dialog"):
            parts.append('<div class="dialog">' + "".join(f'<div class="bub {"kid" if w == "Оқушы" else "tch"}" data-a="pop"><small>{E(w)}</small><span data-edit>{E(t)}</span></div>' for w, t in s["dialog"]) + '</div>')
        if s.get("ways"):
            slots = {1: '<i class="slot" data-anchor="card"></i>', 2: '<i class="slot" data-anchor="nl"></i>'}
            parts.append('<div class="ways">' + "".join(f'<div class="way" data-a="row"><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span>{slots.get(i, "")}</div>' for i, (a, b) in enumerate(s["ways"])) + '</div>')
        if s.get("values"):
            parts.append('<div class="values">' + "".join(f'<div class="val" data-a="row"><i class="slot" data-anchor="{ANCH[sh]}"></i><div><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div></div>' for sh, a, b in s["values"]) + '</div>')
        parts.append(ask(s.get("ask")))
        parts.append(note(s.get("note")) if sid != 7 else "")
        parts.append(src(s.get("source")))
        wide = {11: " wide", 25: " wide", 17: ""}.get(sid, "")
        panel_cls = "panel" + wide
    side_cls = {17: "T", 15: "R", 25: "B"}.get(sid, side)
    inner = "".join(p for p in parts if p)
    return (f'<section class="slide s-{sid} side-{side_cls}" data-id="{sid}"><div class="layer">{scrim}'
            f'<div class="{panel_cls}" data-a="panel">{inner}</div></div><!-- {E(s["say"])} --></section>')

def props_html():
    eq = ('<svg viewBox="0 0 200 200"><g class="bars"><rect x="34" y="66" width="132" height="22" rx="11" fill="#F5F0E6"/>'
          '<rect x="34" y="112" width="132" height="22" rx="11" fill="#F5F0E6"/></g>'
          '<rect class="slash" x="89" y="30" width="22" height="140" rx="11" fill="#F28B6C" transform="rotate(28 100 100)"/></svg>')
    card = ('<svg viewBox="0 0 150 200"><defs><filter id="cs" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity=".35"/></filter></defs>'
            '<g filter="url(#cs)"><rect x="4" y="4" width="142" height="192" rx="14" fill="#FFFDF7"/></g>'
            '<rect x="4" y="4" width="142" height="192" rx="14" fill="none" stroke="#F4C95D" stroke-width="12"/>'
            '<text x="75" y="134" text-anchor="middle" font-family="Rubik" font-weight="800" font-size="92" fill="#12161F">12</text></svg>')
    ticks = []
    for i in range(21):
        x = 60 + i * 64
        ticks.append(f'<line x1="{x}" y1="{62 if i % 5 else 52}" x2="{x}" y2="{98 if i % 5 else 108}" stroke="#F5F0E6" stroke-width="{5 if i % 5 else 7}" stroke-linecap="round"/>'
                     f'<text x="{x}" y="150" text-anchor="middle" font-family="Rubik" font-weight="700" font-size="34" fill="#F5F0E6">{i}</text>')
    hops = "".join(f'<path class="hop" d="M{60 + (7 + k) * 64} 80 A32 32 0 0 1 {60 + (8 + k) * 64} 80" fill="none" stroke="#F28B6C" stroke-width="6" stroke-linecap="round"/>' for k in range(5))
    nl = (f'<svg viewBox="0 0 1400 170"><rect x="0" y="0" width="1400" height="170" rx="26" fill="rgba(18,22,31,.82)"/>'
          f'<line x1="36" y1="80" x2="1364" y2="80" stroke="#F5F0E6" stroke-width="6" stroke-linecap="round"/>{"".join(ticks)}{hops}'
          f'<circle class="m12" cx="{60 + 12 * 64}" cy="138" r="30" fill="none" stroke="#F4C95D" stroke-width="6"/></svg>')
    return (f'<div id="props"><div class="prop" id="p-x"><b>x</b></div><div class="prop" id="p-eq">{eq}</div>'
            f'<div class="prop" id="p-c">{SHAPE["circle"]}</div><div class="prop" id="p-t">{SHAPE["triangle"]}</div><div class="prop" id="p-s">{SHAPE["square"]}</div>'
            f'<div class="prop" id="p-nl">{nl}</div><div class="prop" id="p-card">{card}</div></div>'
            '<svg id="leaders" viewBox="0 0 1920 1080"></svg>')

def build():
    base = rd(os.path.join(REPO, "build", "viewport-base.css"))
    css = rd(os.path.join(HERE, "deck.css"))
    rose = base64.b64encode(open(os.path.join(REPO, "assets", "rose.jpg"), "rb").read()).decode()
    FONT_RUBIK = base64.b64encode(open(os.path.join(ROOT, "fonts", "Rubik-Variable.ttf"), "rb").read()).decode()
    FONT_CAVEAT = base64.b64encode(open(os.path.join(ROOT, "fonts", "Caveat-Variable.ttf"), "rb").read()).decode()
    meta = [{"id": s["id"], "act": s["act"], "side": s["side"], "tr": s["tr"], "who": s["who"], "shot": s["shot"]} for s in C.S]
    notes = [f'<b>{E(C.AUTHORS[s["who"]]["name"])}</b> · {E(C.ACTS[s["act"]])}<br>{E(s["say"])}' for s in C.S]
    data = (f"const META = {json.dumps(meta, ensure_ascii=False)};\nconst NOTES = {json.dumps(notes, ensure_ascii=False)};\n"
            f"const ACTS = {json.dumps(C.ACTS, ensure_ascii=False)};\nconst ACT_Q = {json.dumps(C.ACT_Q, ensure_ascii=False)};\n"
            f"const IMG = {{rose: 'data:image/jpeg;base64,{rose}'}};\n")
    js = lambda n: rd(os.path.join(HERE, n))
    slides = "\n".join(slide_html(s) for s in C.S)
    out = f'''<!DOCTYPE html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(C.TITLE)} — {E(C.SUBTITLE)}</title>
<!-- Утепберген Айсамал · Еділ Ақерке · Тұрлан Қарақат — математика пәнінің мұғалімдері -->
<style>
/* === ҚАРІПТЕР: Rubik + Caveat (Google Fonts, SIL OFL) — интернетсіз де ашылуы үшін файлдың ішінде === */
@font-face{{font-family:'Rubik';src:url(data:font/ttf;base64,{FONT_RUBIK}) format('truetype');font-weight:300 900;font-style:normal;font-display:block}}
@font-face{{font-family:'Caveat';src:url(data:font/ttf;base64,{FONT_CAVEAT}) format('truetype');font-weight:400 700;font-style:normal;font-display:block}}
/* === VIEWPORT BASE (frontend-slides, толық) === */
{base}
/* === x ≠ 0 · ДИЗАЙН === */
{css}
</style>
</head>
<body>
<div class="deck-viewport"><div class="deck-stage" id="deckStage">
<canvas id="gl" width="1600" height="900"></canvas>
{slides}
{props_html()}
<div id="hud" class="off"><div class="segs">{"".join("<i></i>" for _ in range(6))}</div><span class="act"></span><span class="q"></span></div>
</div></div>
<div id="notes"></div>
<div class="edit-hotzone"></div><button class="edit-toggle" id="editToggle" title="Өңдеу (E)">✎</button><div class="toast" id="toast"></div>
<script>/* === three.js r149 (MIT) === */
{js("vendor/three.min.js")}</script>
<script>/* === anime.js 4 (MIT) === */
{js("vendor/anime.umd.min.js")}</script>
<script>/* === 3D ӘЛЕМ === */
{js("world.js")}
/* === СЛАЙДТАРДЫҢ 3D КҮЙІ === */
{js("acts.js")}
/* === АУЫСУЛАР === */
{js("fx.js")}</script>
<script>/* === ДЕРЕКТЕР === */
{data}
/* === БАСҚАРУ (DECK) === */
{js("deck.js")}</script>
</body>
</html>'''
    p = os.path.join(ROOT, "index.html"); open(p, "w", encoding="utf-8").write(out)
    print(p, round(len(out.encode()) / 1e6, 2), "MB")

if __name__ == "__main__":
    build()
