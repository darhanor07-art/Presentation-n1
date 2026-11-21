# -*- coding: utf-8 -*-
"""topic10/index.html құрастырушы.  Іске қосу:  python3 topic10/build/build_html.py"""
import base64, io, json, os, re, sys, html as H
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
import content as C

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # topic10/
PH = os.path.join(ROOT, "assets", "photos")
MAT = os.path.join(ROOT, "assets", "material")

# ---------------- Брайль ----------------
BR = {'А':[1],'Б':[1,2],'В':[2,4,5,6],'Г':[1,2,4,5],'Д':[1,4,5],'Е':[1,5],'Ж':[2,4,5],'З':[1,3,5,6],'И':[2,4],'К':[1,3],
      'Л':[1,2,3],'М':[1,3,4],'Н':[1,3,4,5],'О':[1,3,5],'П':[1,2,3,4],'Р':[1,2,3,5],'С':[2,3,4],'Т':[2,3,4,5],'У':[1,3,6],
      'Ф':[1,2,4],'Х':[1,2,5],'Ц':[1,4],'Ч':[1,2,3,4,5],'Ш':[1,5,6],'Ы':[2,3,4,6]}
DIG = {'1':[1],'2':[1,2],'3':[1,4],'4':[1,4,5],'5':[1,5],'6':[1,2,4],'7':[1,2,4,5],'8':[1,2,5],'9':[2,4],'0':[2,4,5]}
POS = {1:(0,0),2:(0,1),3:(0,2),4:(1,0),5:(1,1),6:(1,2)}
def uni(dots): return chr(0x2800 + sum(1 << (d - 1) for d in dots))
def braille_num(n): return uni([3,4,5,6]) + "".join(uni(DIG[c]) for c in str(n))
def cell(dots, w=40, h=60, cls="cell", r=None, extra=""):
    r = r or w * .17
    cs = "".join(f'<circle data-d="{d}" class="{"on" if d in dots else ""}" cx="{w*(.28 if POS[d][0]==0 else .72):.1f}" cy="{h*(.18,.5,.82)[POS[d][1]]:.1f}" r="{r:.1f}"/>' for d in range(1, 7))
    return f'<svg class="{cls}" viewBox="0 0 {w} {h}" {extra}>{cs}</svg>'
def bdot(n):  # тізім белгісі — Брайль цифры
    return cell(DIG[str(n)] if n < 10 else [1], 24, 36, "cell", 4.3)
def blist(items, cls="blist"):
    return f'<ul class="{cls}" data-a="stagger">' + "".join(f'<li>{bdot(i+1)}<span>{t}</span></li>' for i, t in enumerate(items)) + "</ul>"

# ---------------- суреттер ----------------
def prep(path, maxw, maxh, q=80):
    im = Image.open(path).convert("RGB")
    im.thumbnail((maxw, maxh), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode(), im.size

def collect_images():
    need = {s["bg"] for s in C.S}
    need |= {"hauy_portrait", "braille_portrait", "braille_medal"} & set(n[:-4] for n in os.listdir(PH))
    need |= {"nei_normal", "nei_cataract", "nei_glaucoma", "nei_agerelated"}
    imgs, sizes = {}, {}
    for n in sorted(need):
        p = os.path.join(PH, n + ".jpg")
        if not os.path.exists(p) or os.path.getsize(p) < 10000: continue
        big = n.endswith("portrait")
        imgs[n], sizes[n] = prep(p, 1300 if big else 1600, 1600 if big else 1100, 80)
    for n in ("braille_alphabet", "kids_glasses"):
        imgs[n], sizes[n] = prep(os.path.join(MAT, n + ".jpg"), 1000, 800, 82)
    return imgs, sizes

# ---------------- компоненттер ----------------
def K(s): return f'<div class="kicker" data-a="scramble">{cell([s["act"]] if s["act"]<=6 else [], 18, 27, "kc")}<span>{s["kicker"]}</span></div>'
def T(t, size=""): return f'<h2 class="title {size}" data-a="words">{t}</h2>'
def P(t, cls="body"): return f'<p class="{cls}" data-a="fade">{t}</p>'
def ASK(s): return f'<p class="ask" data-a="fade">{s["ask"]}</p>' if s.get("ask") else ""
def SRC(s): return f'<div class="src" data-a="fade">Дереккөз: {s["source"]}</div>' if s.get("source") else ""
def img(name, cls="", style=""): return f'<img data-img="{name}" class="{cls}" style="{style}" alt="">'

def comp(s, sizes):
    k = s["kind"]; h = ""
    if k == "cover":
        h = (f'<div class="cover">{K(s)}<h1 class="title xl" data-a="decode">{s["title"]}</h1>{P(s["body"], "sub")}</div>'
             f'<div class="seed" data-a="seed"></div>')
    elif k == "quote":
        t = s["title"].replace("жарықты", '<span class="hl">жарықты</span>').replace("қолымен", '<span class="hl">қолымен</span>')
        h = (f'<div class="quote"><div class="qm" data-a="fade">“</div><p class="qt" data-a="words">{t}</p>'
             f'<cite data-a="scramble">— {s["kicker"]}</cite>{P(s["body"])}</div>')
    elif k == "board":
        lines = "<br>".join(s["board"])
        h = (f'<div class="board" data-a="board"><div class="btxt blurred">{lines}</div>'
             f'<div class="lens"><div class="btxt">{lines}</div></div></div>'
             f'<div class="col-r">{K(s)}{T(s["title"], "md")}{P(s["body"])}{ASK(s)}</div>')
    elif k == "question":
        h = (f'<div class="center">{K(s).replace("kicker", "kicker", 1)}<p class="q-big" data-a="focuswords">{s["title"]}</p>'
             f'<p class="q-note" data-a="fade">{s["body"]}</p></div>')
    elif k == "cellmap":
        rows = "".join(f'<div class="cm-row" data-a="row"><b>{n}</b><strong>{a}</strong><span>{b}</span></div>' for n, a, b in s["items"])
        big = cell([1, 2, 3, 4, 5, 6], 300, 450, "bigcell", 52, 'data-a="bigcell"')
        lines = ""
        for i, (n, _, _) in enumerate(s["items"]):
            cx = 150 + 300 * (.28 if POS[n][0] == 0 else .72); cy = 300 + 450 * (.18, .5, .82)[POS[n][1]]
            ty = 255 + 37 + i * 88
            lines += f'<path d="M{cx+52:.0f} {cy:.0f} C {cx+160:.0f} {cy:.0f}, 520 {ty}, 612 {ty}"/>'
        h = (f'<div class="top">{K(s)}{T(s["title"], "md")}</div>{big}<svg class="cm-lines" data-a="draw" viewBox="0 0 1920 1080">{lines}</svg>'
             f'<div class="cm-rows">{rows}</div><div class="src" data-a="fade">{s["body"]}</div>')
    elif k == "defs":
        cards = "".join(f'<div class="card" data-a="spring"><h3>{a}</h3><p>{b}</p></div>' for a, b in s["cards"])
        h = (f'<div class="col-l">{K(s)}{T(s["title"])}<div class="glyph" data-a="glyph" data-to="{s["word"][1]}">{s["word"][0]}</div>'
             f'<div class="cards2">{cards}</div></div>')
    elif k == "hauy":
        facts = "".join(f'<div class="fact" data-a="row"><b>{a}</b><span>{b}</span></div>' for a, b in s["facts"])
        h = (f'<figure class="frame" data-a="portrait" style="left:150px;top:150px;width:560px;height:780px">{img("hauy_portrait")}'
             f'<figcaption>Валентин Гаюи (1745–1822)</figcaption></figure>'
             f'<div class="year" data-a="count" data-from="1700" data-to="1784" style="left:560px;top:760px">1784</div>'
             f'<div class="col-r">{K(s)}{T(s["title"])}<div class="facts">{facts}</div></div><div class="caption" data-a="fade">{s["caption"]}</div>')
    elif k == "braille":
        facts = "".join(f'<div class="fact" data-a="row"><b>{a}</b><span>{b}</span></div>' for a, b in s["facts"])
        d12 = ""
        for i in range(12):
            cx, cy = 60 + (i % 2) * 70, 28 + (i // 2) * 44
            d12 += f'<circle data-i="{i}" cx="{cx}" cy="{cy}" r="13"/>'
        h = (f'<figure class="frame" data-a="portrait" style="left:120px;top:150px;width:470px;height:600px">{img("braille_portrait")}'
             f'<figcaption>Луи Брайль · гравюра, А. Тирья</figcaption></figure>'
             f'<svg class="dots12" viewBox="0 0 250 300" data-a="dots12">{d12}</svg><div class="d12lbl">Барбье: 12 нүкте</div>'
             f'<div class="col-r wide">{K(s)}{T(s["title"], "md")}<div class="facts">{facts}</div></div>')
    elif k == "alphabet":
        wc = "".join(f'<div class="wc">{cell(d, 150, 225, "cell wcell", 26)}<div class="lt">{ch}</div></div>' for ch, d in zip(s["word"], s["cells"]))
        h = (f'<div class="col-l wide">{K(s)}{T(s["title"])}{P(s["body"])}</div>'
             f'<div class="word-cells" data-a="poke">{wc}<svg class="stylus" viewBox="0 0 28 170"><rect x="10" y="0" width="8" height="120" rx="4" fill="#c9a24a"/><path d="M14 120 L 9 160 L14 170 L19 160z" fill="#ddd"/></svg></div>'
             f'<figure class="frame mat-card" data-a="spring">{img("braille_alphabet")}<figcaption>Материалдағы Брайль әліппесі</figcaption></figure>')
    elif k == "acuity":
        segs = ""
        for lo, hi, name, desc in s["ranges"]:
            x0, x1 = lo / 1.0 * 900, hi / 1.0 * 900
            col = "var(--ember)" if name == "Соқыр" else "var(--lamp)"
            segs += f'<div class="seg" style="left:{x0:.0f}px;width:{max(14, x1 - x0):.0f}px;background:{col}"></div>'
            lx = 0 if name == "Соқыр" else (x0 + x1) / 2 + 30
            segs += f'<div class="lbl" style="left:{lx:.0f}px;color:{col};{"transform:none" if name == "Соқыр" else ""}">{name}</div>'
        ticks = "".join(f'<div class="tick" style="left:{v * 900:.0f}px">{str(v).replace(".", ",")}</div>' for v in (0, .05, .4, 1.0))
        legend = blist([f'<b class="hl">{n}</b> — {d}' for _, _, n, d in s["ranges"]], "blist sm acu-legend")
        h = (f'<div class="col-l wide">{K(s)}{T(s["title"], "md")}</div>'
             f'<div class="letters" data-a="letters">Ш Б М Н К</div>'
             f'<div class="acu" data-a="acu"><div class="bar"></div>{segs}{ticks}<div class="cur"></div></div>'
             f'<div class="col-l wide" style="top:690px">{legend}<p class="body" data-a="fade" style="font-size:24px;margin-top:18px">{s["body"]}</p></div>')
    elif k == "split":
        cols = "".join(f'<div data-a="spring"><h3>{a}</h3><p>{b}</p></div>' for a, b in s["cols"])
        h = f'<div class="top" style="text-align:center">{K(s).replace("kicker", "kicker", 1)}{T(s["title"], "lg")}</div><div class="split">{cols}<i class="vline" data-a="vline"></i></div>'
    elif k == "sim":
        ps = ""
        for name, a, b in s["panels"]:
            src = name if name in sizes else "nei_normal"
            css = {"nei_cataract": "filter:blur(5px) contrast(0.7) brightness(1.12) sepia(0.35) grayscale(0)",
                   "nei_glaucoma": "", "nei_agerelated": "", "nei_normal": "filter:blur(2.5px) contrast(0.8) brightness(0.85) sepia(0) grayscale(0.75)"}
            fx = "" if name in sizes and name != "nei_normal" else css.get(name, "")
            ov = ""
            if name not in sizes and name == "nei_glaucoma": ov = '<div class="ov" style="background:radial-gradient(circle at 50% 48%,transparent 16%,rgba(5,7,13,.96) 34%)"></div>'
            if name not in sizes and name == "nei_agerelated": ov = '<div class="ov" style="background:radial-gradient(circle at 50% 45%,rgba(25,22,20,.97) 0,rgba(25,22,20,.9) 22%,rgba(25,22,20,.45) 34%,transparent 46%)"></div>'
            ps += f'<figure class="simp" data-a="sim" data-fx="{fx}">{img(src, "", fx)}{ov}<figcaption><b>{a}</b><span>{b}</span></figcaption></figure>'
        h = (f'<div class="top">{K(s)}{T(s["title"], "md")}{blist(s["causes"], "blist sm")}</div><div class="sim">{ps}</div>'
             f'<div class="caption" data-a="fade" style="bottom:40px">{s["caption"]}</div>')
    elif k == "acquired":
        st = "".join(f'<div class="stat" data-a="row"><b data-a="count" data-to="{v}" data-dec="{1 if v < 10 and v != int(v) else 0}">{str(v).replace(".", ",")}</b><span><b class="hl" style="font-size:34px;min-width:0">{u}</b> {d}</span></div>' for v, u, d in s["stats"])
        h = f'<div class="col-l">{K(s)}{T(s["title"], "md")}{blist(s["items"])}</div><div class="col-r" style="top:300px"><div class="stats">{st}</div></div>{SRC(s)}'
    elif k == "kz":
        tiles = "".join(f'<div class="card tile" data-a="spring"><b><i data-a="count" data-to="{v}">{fmt_num(v)}</i>{u}</b><em class="td">{d}</em></div>' for v, u, d in s["stats"])
        h = f'<div class="top">{K(s)}{T(s["title"])}</div><div class="tiles">{tiles}</div>{SRC(s)}'
    elif k == "touch":
        pts = "".join(f'<div class="touch" data-a="touch" style="left:{x}px;top:{y}px"><i></i></div>' for x, y in ((520, 560), (640, 470), (430, 690), (760, 640)))
        h = f'{pts}<div class="col-r">{K(s)}{T(s["title"], "md")}{blist(s["items"])}{P(s["body"])}</div>'
    elif k == "cloud":
        chips = "".join(f'<span class="chip{" em" if t in ("Сенімсіздік","Ашулану","Агрессия","Уайым") else ""}" data-a="chip">{t}</span>' for t in s["items"])
        h = (f'<figure class="frame" data-a="spring" style="right:110px;bottom:120px;width:420px;height:280px">{img("kids_glasses")}<figcaption>Материалдан</figcaption></figure>'
             f'<div class="col-l wide">{K(s)}{T(s["title"])}<div class="chips">{chips}</div>{ASK(s)}</div>')
    elif k == "cycle":
        import math
        n = len(s["items"]); R = 235; cx = cy = 380; nodes = ""; arcs = ""
        for i, t in enumerate(s["items"]):
            a = -math.pi / 2 + i * 2 * math.pi / n
            x, y = cx + R * math.cos(a), cy + R * math.sin(a)
            nodes += f'<g data-a="node"><rect class="node" x="{x-120:.0f}" y="{y-36:.0f}" width="240" height="72" rx="36"/><text x="{x:.0f}" y="{y+10:.0f}" text-anchor="middle">{t}</text></g>'
            a1, a2 = a + .55, a + 2 * math.pi / n - .55
            arcs += f'<path class="arc" d="M{cx+R*math.cos(a1):.0f} {cy+R*math.sin(a1):.0f} A {R} {R} 0 0 1 {cx+R*math.cos(a2):.0f} {cy+R*math.sin(a2):.0f}"/>'
        brk = f'<path class="brk" data-a="brk" d="M{cx-40} {cy-300} L {cx+60} {cy+300}"/><text class="brkt" x="{cx}" y="{cy+14}" text-anchor="middle" style="font-size:44px">{s["breaker"]}</text>'
        h = (f'<svg class="cyc" viewBox="0 0 760 760" data-a="cycle">{arcs}{nodes}{brk}</svg>'
             f'<div class="col-r">{K(s)}{T(s["title"])}{P(s["body"])}</div>')
    elif k == "door":
        cols = "".join(f'<div class="card" data-a="spring" style="margin-top:24px"><h3>{a}</h3><p>{b}</p></div>' for a, b in s["cols"])
        h = f'<div class="col-l">{K(s)}{T(s["title"])}{cols}{ASK(s)}</div>'
    elif k == "home":
        h = f'<div class="col-l wide checks">{K(s)}{T(s["title"])}{blist(s["items"])}{ASK(s)}</div>'
    elif k == "paths":
        cols = "".join(f'<div class="card" data-a="spring" style="margin-top:22px"><h3>{a}</h3><p>{b}</p></div>' for a, b in s["cols"])
        svg = ('<svg class="paths-svg" viewBox="0 0 1920 1080" data-a="draw">'
               '<path d="M1060 980 C 1220 820, 1300 700, 1360 560 S 1500 300, 1660 180" style="stroke:var(--ember)"/>'
               '<path d="M1220 980 C 1320 840, 1460 720, 1520 560 S 1560 300, 1660 180" style="stroke:var(--lamp)"/>'
               '<circle cx="1660" cy="180" r="22" fill="var(--lamp)"/></svg>')
        h = f'{svg}<div class="col-l wide">{K(s)}{T(s["title"], "md")}{cols}</div>'
    elif k == "light":
        plan = ('<svg class="plan" viewBox="0 0 700 560" data-a="plan">'
                '<rect x="20" y="20" width="660" height="520" rx="18" class="room"/>'
                '<rect x="200" y="34" width="300" height="22" rx="6" class="boardp"/><text x="350" y="86" class="pl">Тақта</text>'
                '<rect x="8" y="140" width="24" height="300" rx="6" class="win"/><text x="58" y="130" class="pl" text-anchor="start">Терезе</text>'
                '<g class="rays"><path d="M32 200 L 300 260"/><path d="M32 290 L 300 330"/><path d="M32 380 L 300 400"/></g>'
                '<g class="deskA"><rect x="300" y="250" width="150" height="90" rx="10"/><text x="375" y="305">✗</text></g>'
                '<circle class="glr" cx="330" cy="300" r="40"/>'
                '<g class="deskB"><rect x="150" y="120" width="150" height="90" rx="10"/><text x="225" y="175">✓</text></g>'
                '<text x="375" y="380" class="pl small">Терезеге қарап отыру — шағылыс</text>'
                '<text x="225" y="240" class="pl small ok">Жарық бүйірден, тақта жақын</text></svg>')
        h = (f'<div class="card plancard" data-a="spring"><h3>Сынып жоспары</h3>{plan}</div>'
             f'<div class="col-r" style="top:150px">{K(s)}{T(s["title"], "md")}{blist(s["items"], "blist sm")}</div>{SRC(s)}')
    elif k == "typo":
        h = (f'<div class="col-l wide">{K(s)}{T(s["title"], "md")}<div class="demo"><span data-a="typo">{s["demo"]}</span></div>'
             f'{blist(s["items"], "blist sm")}</div>{SRC(s)}')
    elif k == "sound":
        words = " ".join(f'<span class="w">{w}</span>' for w in s["say"].split())
        h = (f'<div class="col-l wide" style="top:120px">{K(s)}{T(s["title"], "md")}</div>'
             f'<p class="say" data-a="karaoke">«{words}»</p><svg class="wave" viewBox="0 0 900 200" data-a="wave"><path d=""/><path d="" style="opacity:.4"/></svg>'
             f'<div class="col-r" style="top:420px">{blist(s["items"], "blist sm")}</div>')
    elif k == "tactile":
        pts = "".join(f'<div class="touch" data-a="touch" style="left:{x}px;top:{y}px"><i></i></div>' for x, y in ((420, 330), (560, 520), (360, 640), (700, 380)))
        h = (f'{pts}<figure class="frame" data-a="spring" style="left:120px;bottom:110px;width:300px;height:420px">{img("globe_hands")}<figcaption>Тактильді глобус</figcaption></figure>'
             f'<div class="col-r">{K(s)}{T(s["title"])}{blist(s["items"])}</div>')
    elif k == "team":
        sats = "".join(f'<div class="sat" data-a="sat" data-i="{i}">{t.split(" — ")[0]}</div>' for i, t in enumerate(s["items"]))
        h = (f'<div class="orbit" data-a="orbit"><div class="ring"></div><div class="core">Бала</div>{sats}</div>'
             f'<div class="col-l">{K(s)}{T(s["title"], "md")}{blist(s["items"], "blist sm")}</div>')
    elif k == "support":
        st = ""
        for i, t in enumerate(s["items"]):
            x, hgt = i * 180, 80 + i * 70
            st += f'<div class="st" data-a="stair" style="left:{x}px;bottom:0;height:{hgt}px"></div><div class="lb" data-a="fade" style="left:{x}px;bottom:{hgt + 14}px;width:{170 if i < 4 else 260}px">{t}</div>'
        h = (f'<div class="top">{K(s)}{T(s["title"])}</div><div class="stairs">{st}</div>'
             f'<div class="meter"><b data-a="count" data-to="100">100</b><b>%</b><span>Сенім</span></div>')
    elif k == "parents":
        cards = "".join(f'<div class="card" data-a="p6" data-i="{i}"><b>{i+1}</b><p>{t}</p></div>' for i, t in enumerate(s["items"]))
        h = f'<div class="top" style="top:100px">{K(s)}{T(s["title"])}</div><div class="p6">{cards}</div>'
    elif k == "values":
        cards = "".join(f'<div class="card" data-a="spring"><h3 data-a="scramble">{a}</h3><p>{b}</p></div>' for a, b in s["items"])
        h = f'<div class="top">{K(s)}{T(s["title"])}</div><div class="vals">{cards}</div>'
    elif k == "answer":
        dos = "".join(f'<div class="wc">{cell(d, 130, 195, "cell wcell", 22)}<div class="lt">{ch}</div></div>' for ch, d in zip("ДОС", [[1,4,5],[1,3,5],[2,3,4]]))
        big6 = cell([1, 2, 3, 4, 5, 6], 130, 195, "cell all6", 22)
        h = (f'<div class="col-l wide" style="top:130px">{K(s)}<p class="ans-q" data-a="fade">{s["title"]}</p>'
             f'<p class="ans-yes" data-a="yes">{s["answer"]}</p>{P(s["body"])}<p class="ans-quote" data-a="words">{s["quote"]}</p></div>'
             f'<div class="dos" data-a="dos"><div class="wc six">{big6}<div class="lt">⠿</div></div>{dos}</div>')
    elif k == "thanks":
        cells = "".join(cell(d, 96, 144, "cell wcell", 15) for d in s["cells"])
        h = (f'<div class="thx-cells" data-a="poke2">{cells}</div>'
             f'<div class="thanks">{K(s)}<h2 class="title" data-a="decode">{s["title"]}</h2>{P(s["body"])}</div>'
             f'<div class="credits" data-a="fade">{CREDITS_SHORT}</div>')
    return h

CREDITS_SHORT = ""
def clean(t): return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", H.unescape(str(t or "")))).strip()
def fmt_num(v): return f"{v:,}".replace(",", " ") if isinstance(v, int) else str(v).replace(".", ",")

def slide_html(s, sizes):
    return (f'<section class="slide" data-n="{s["id"]}" data-kind="{s["kind"]}">'
            f'<!-- {s["id"]:02d} · {H.escape(s["title"][:70])} --><div class="layer">{comp(s, sizes)}</div></section>')

def credits_list():
    cj = json.load(open(os.path.join(PH, "credits.json"), encoding="utf-8"))
    extra = {
      "braille_portrait": {"title": "Engraving of Louis Braille by Henri Thiriat (cropped)", "creator": "Henri Thiriat", "license": "Public domain", "source": "https://commons.wikimedia.org/wiki/File:Engraving_of_Louis_Braille_by_Henri_Thiriat_(cropped).jpg"},
      "hauy_portrait": {"title": "Valentin Haüy — portrait engraving", "creator": "Wikimedia Commons", "license": "Public domain", "source": "https://commons.wikimedia.org/wiki/Category:Valentin_Ha%C3%BCy"},
      "relief_hands": {"title": "Raised relief of hands reading Braille", "creator": "Wikimedia Commons", "license": "CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Raised_relief_of_hands_reading_Braille.jpg"},
      "loc_reading": {"title": "Reading room for the blind in the Library of Congress", "creator": "Library of Congress", "license": "Public domain", "source": "https://commons.wikimedia.org/wiki/File:Reading_room_for_the_blind_in_the_Library_of_Congress"},
    }
    for n in ("cataract", "glaucoma", "agerelated", "normal"):
        extra["nei_" + n] = {"title": f"Eye disease simulation ({n})", "creator": "National Eye Institute, NIH", "license": "Public domain", "source": "https://commons.wikimedia.org/wiki/Category:Eye_disease_simulations"}
    for k, v in extra.items(): cj.setdefault(k, v)
    return cj

def build():
    global CREDITS_SHORT
    imgs, sizes = collect_images()
    used = set(imgs)
    cj = credits_list()
    parts = []
    for n in sorted(used):
        if n in ("braille_alphabet", "kids_glasses"): continue
        c = cj.get(n)
        if c: parts.append(f'{H.escape(clean(c["title"])[:48])} — {H.escape(clean(c.get("creator"))[:28])}, {H.escape(c["license"])}')
    CREDITS_SHORT = ("Фото: Openverse / Wikimedia Commons, ашық лицензиялар (толық тізім — CREDITS.md): " + "; ".join(parts[:12]) + " және т.б. "
                     "Дереккөздер: материал (23 слайд); ДДҰ; Wikipedia «Louis Braille»; Ермаков, Якунин «Основы тифлопедагогики»; Выготский (1927); Kazinform, Sputnik (2026); Paths to Literacy; IRIS Center.")
    with open(os.path.join(ROOT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("# Фотолар мен иллюстрациялардың лицензиялары\n\n| Файл | Атауы | Авторы | Лицензия | Дереккөз |\n|---|---|---|---|---|\n")
        for n in sorted(used):
            c = cj.get(n)
            if c: f.write(f'| {n} | {clean(c["title"])} | {clean(c.get("creator"))} | {c["license"]} | {c["source"]} |\n')
        f.write("| braille_alphabet, kids_glasses | Берілген материалдағы суреттер | — | материалдан | 08923461-___.pptx |\n")
    slides = "\n".join(slide_html(s, sizes) for s in C.S)
    meta = [{**{k: s[k] for k in ("id", "act", "tr", "bg", "kb", "z", "shade", "grade", "kind")}, "blur": s.get("blur", 0), "shadeK": s.get("shadeK", .78)} for s in C.S]
    notes = [s["notes"] for s in C.S]
    css = open(os.path.join(HERE, "deck.css"), encoding="utf-8").read()
    base = open(os.path.join(os.path.dirname(ROOT), "build", "viewport-base.css"), encoding="utf-8").read()
    js = open(os.path.join(HERE, "gl.js"), encoding="utf-8").read() + "\n" + open(os.path.join(HERE, "deck.js"), encoding="utf-8").read()
    anime = open(os.path.join(HERE, "vendor", "anime.umd.min.js"), encoding="utf-8").read()
    hud = ('<div class="hud" id="hud">' + cell([], 44, 66, "hcell", 8.5) +
           '<div class="hnum"><b id="hbr"></b><span id="hno"></span></div><div class="hact" id="hact"></div><div class="hbar" id="hbar"></div></div>')
    page = f'''<!DOCTYPE html>
<html lang="kk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Саусақ ұшындағы жарық</title>
<!-- 10-тақырып: көзі нашар көретін балаларды жалпы білім беру үрдісіне қосу. 30 слайд.
     Құрастырушы: topic10/build/build_html.py · мазмұн: content.py · сценарий: SCENARIO.md
     Басқару: → / Space — келесі, ← — алдыңғы, N — жазбалар, F — толық экран.
     Кітапхана: anime.js 4.5 (MIT, © Julian Garnier) файлдың ішінде. -->
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{base}
{css}
</style>
</head>
<body>
<div class="deck-viewport">
<main class="deck-stage" id="deckStage">
<canvas id="gl" width="1920" height="1080"></canvas>
{slides}
{hud}
</main>
</div>
<div class="hint">← → · N жазбалар · F толық экран</div>
<div class="notes" id="notes"></div>
<script>/* anime.js v4.5.0 — MIT License — © Julian Garnier */
{anime}
</script>
<script>
const IMG = {json.dumps(imgs)};
const META = {json.dumps(meta, ensure_ascii=False)};
const NOTES = {json.dumps(notes, ensure_ascii=False).replace("</", "<\\/")};
const ACTS = {json.dumps(C.ACTS, ensure_ascii=False)};
{js}
</script>
</body>
</html>'''
    out = os.path.join(ROOT, "index.html")
    open(out, "w", encoding="utf-8").write(page)
    print("topic10/index.html", round(len(page) / 1e6, 2), "MB;", len(imgs), "images")

if __name__ == "__main__":
    build()
