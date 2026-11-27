# -*- coding: utf-8 -*-
"""content.py → geo/index.html (бір файл: CSS, JS, three.js, anime.js, matter.js, rough-notation, суреттер, қаріптер — бәрі ішінде).
Іске қосу: python3 geo/build/build_html.py
"""
import base64, html, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import content as C

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); REPO = os.path.dirname(ROOT)
rd = lambda p: open(p, encoding="utf-8").read()
b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
E = lambda s: html.escape(s, quote=False)
PH = json.load(open(os.path.join(HERE, "data", "photos.json"), encoding="utf-8"))
SPC = {k: v["color"] for k, v in C.SPHERES.items()}

# --- сфера белгілері (төрт қабықтың иконкасы) ---
ICON = {
    "litho": '<path d="M26 80 L50 46 L60 58 L72 44 L96 80 Z" fill="#0A0F1C" opacity=".82"/><path d="M27 89 H95 M33 97 H89" stroke="#0A0F1C" stroke-width="4.5" stroke-linecap="round" opacity=".6"/>',
    "hydro": '<path d="M60 24 C60 24 37 54 37 70 A23 23 0 0 0 83 70 C83 54 60 24 60 24 Z" fill="#0A0F1C" opacity=".82"/><path d="M48 72 Q54 80 62 74" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>',
    "atmo": '<path d="M36 74 a13 13 0 0 1 3-25 a19 19 0 0 1 36-5 a14 14 0 0 1 6 30 Z" fill="#0A0F1C" opacity=".82"/><path d="M30 86 H74 M44 95 H90" stroke="#0A0F1C" stroke-width="4.5" stroke-linecap="round" opacity=".55"/>',
    "bio": '<path d="M32 86 C32 52 56 32 90 30 C90 64 70 88 36 88 Z" fill="#0A0F1C" opacity=".82"/><path d="M38 82 C52 66 66 54 82 40" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".6"/>',
}
def token_svg(k):
    c = SPC[k]
    return (f'<svg viewBox="0 0 120 120"><defs><radialGradient id="tg-{k}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/>'
            f'<stop offset=".45" stop-color="{c}"/><stop offset="1" stop-color="{c}" stop-opacity=".85"/></radialGradient></defs>'
            f'<circle class="glow" cx="60" cy="60" r="58" fill="{c}" opacity=".0"/><circle cx="60" cy="60" r="52" fill="url(#tg-{k})"/>'
            f'<circle cx="60" cy="60" r="52" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>{ICON[k]}</svg>')
def dot(k): return f'<i style="background:{SPC[k]}"></i>'

def kick(s): return f'<div class="kick" data-a="kick" data-edit>{E(s)}</div>' if s else ""
def title(s, cls="ttl"): return f'<h2 class="{cls}" data-a="title" data-edit>{E(s)}</h2>'
def body(s): return f'<p class="bd" data-a="words" data-edit>{E(s)}</p>' if s else ""
def note(s): return f'<p class="note" data-a="fade" data-edit>{E(s)}</p>' if s else ""
def img(k, cls="", cap=None, style=""):
    cap = cap if cap is not None else ""
    return f'<figure class="{cls}" style="{style}"><img src="{{{{IMG:{k}}}}}" alt=""><figcaption data-edit>{E(cap)}</figcaption></figure>'

def slide_html(s):
    sid, side, act = s["id"], s["side"], s["act"]
    P, extra, panel_cls, scrim = [], "", "panel", f'<div class="scrim {side if side in "LRBTC" else "L"}"></div>'
    if sid == 1:
        panel_cls = "panel bare cover"; scrim = '<div class="scrim L"></div>'
        au = "".join(f'<div class="au" data-a="row"><i class="slot" data-anchor="tok-{a["sphere"]}"></i><div><b data-edit>{E(a["name"])}</b>'
                     f'<span data-edit>{E(a["role"])}</span></div></div>' for a in C.AUTHORS.values())
        P = [kick(s["kicker"]), title(s["title"]), body(s["body"]), f'<div class="authors">{au}</div>']

    elif sid == 2:
        panel_cls = "panel bare hook"; scrim = '<div class="scrim B"></div>'
        P = [kick(s["kicker"]), title(s["title"]), f'<p class="bd" data-a="fade" data-edit>{E(s["body"])}</p>']
    elif sid == 3:
        cards = "".join(f'<div class="card" style="--c:{SPC[k]}" data-a="card"><div class="in"><div class="fa"><i class="slot" data-anchor="tok-{k}"></i><b>{E(r)}</b><span data-edit>«{E(m)}»</span></div>'
                        f'<div class="fb"><b data-edit>{E(t.split(" — ")[0])}</b><span data-edit>{E(t.split(" — ")[1])}</span><div class="shine"></div></div></div></div>'
                        for k, r, m, t in s["cards"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="cards">{cards}</div>', note(s["note"])]
    elif sid == 4:
        st = "".join(f'<div class="stat" data-a="row"><b data-count="{E(a)}">{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["stats"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="stats">{st}</div>']
    elif sid == 5:
        cols = []
        for nm, sub, lays in s["crust"]:
            tot = sum(h for _, _, h in lays) if nm.startswith("Материк") else 5
            stack = "".join(f'<div class="lay" style="background:{c};flex:{h}" data-edit>{E(n)}</div>' for n, c, h in lays)
            if not nm.startswith("Материк"): stack += f'<div class="lay" style="flex:{5 - sum(h for _, _, h in lays)};background:rgba(20,60,110,.35)"></div>'
            cols.append(f'<div class="ccol" data-a="row"><h4 data-edit>{E(nm)}<small>{E(sub)}</small></h4><div class="stack">{stack}</div></div>')
        P = [kick(s["kicker"]), title(s["title"]), body(s["body"]), f'<div class="crust">{"".join(cols)}</div>', note(s["note"])]
    elif sid == 6:
        fa = "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["facts"])
        lg = "".join(f'<span style="--lc:{c}"><i></i>{E(t)}</span>' for c, t in s["legend"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="facts">{fa}</div>', f'<div class="legend" data-a="fade">{lg}</div>']
        extra = '<svg id="ruler" viewBox="0 0 600 120" style="position:absolute;left:96px;bottom:86px;width:600px;height:120px;z-index:4;max-width:none;max-height:none"></svg>'
    elif sid == 7:
        P = [kick(s["kicker"]), title(s["title"]), body(s["body"]), img(s["photo"][0], "photo", s["photo"][1], "height:210px")]; panel_cls = "panel narrow"
    elif sid == 8:
        pr = "".join(f'<div class="pair" data-a="row"><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["pairs"])
        fa = "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["facts"])
        sf = "".join(f'<li data-edit>{E(x)}</li>' for x in s["safety"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="pairs">{pr}</div>', f'<div class="facts">{fa}</div>',
             f'<div class="safety" data-a="pop"><h4>Қауіпсіздік ережесі</h4><ul>{sf}</ul></div>']
    elif sid == 9:
        sw = {"Магмалық": "linear-gradient(135deg,#B98476,#7C5A52)", "Шөгінді": "repeating-linear-gradient(0deg,#C49A62 0 12px,#8C7A66 12px 20px,#D8CFB8 20px 30px)",
              "Метаморфтық": "repeating-linear-gradient(28deg,#6F6A70 0 6px,#BDB6B0 6px 10px)"}
        rk = "".join(f'<div class="rock" data-a="row"><i style="background:{sw[a]}"></i><div><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div></div>' for a, b in s["rocks"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="rocks">{rk}</div>']
        extra = (img("charyn", "ph-float", s["photo"][1], "left:96px;top:170px;width:620px;height:360px") +
                 img("steppe", "ph-float", "Едірей тауы, Қарағанды облысы — гранит (магмалық жыныс)", "left:96px;top:560px;width:380px;height:250px") +
                 '<canvas id="jar" width="300" height="380" style="left:500px;top:560px;width:220px;height:280px"></canvas>')
    elif sid == 10:
        st = "".join(f'<div class="stat" data-a="row"><b data-count="{E(a)}">{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["stats"])
        P = [kick(s["kicker"]), title(s["title"]), body(s["body"]), f'<div class="stats">{st}</div>']
    elif sid == 11:
        vs = []
        for k, a, b, v in s["vessels"]:
            w, h = {"ocean": (230, 330), "ice": (110, 150), "ground": (110, 150), "fresh": (70, 70)}[k]
            wc = {"ocean": "#2563A8", "ice": "#CFE8F7", "ground": "#5E8FB0", "fresh": "#5FD0F0"}[k]
            lvl = .92 if k != "fresh" else .55
            vs.append(f'<div class="vessel" data-a="row" data-v="{k}"><div class="tank" style="width:{w}px;height:{h}px"><div class="water" style="--wc:{wc};height:{lvl * 100:.0f}%"></div></div>'
                      f'<b data-edit>{E(a)}</b><span data-edit>{E(b)}</span>{"<i class=slot data-anchor=drop style=position:absolute;left:50%;top:18px;width:1px;height:1px></i>" if k == "fresh" else ""}</div>')
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="vessels">{"".join(vs)}</div>', note(s["note"])]
        panel_cls = "panel mid"
    elif sid == 12:
        mx = max(v for _, v in s["bars"])
        br = "".join(f'<div class="bar" data-a="row"><span data-edit>{E(n)}</span><div class="tr"><div class="fl" data-w="{v / mx:.3f}"></div></div><b>{str(v).replace(".", ",")}</b></div>' for n, v in s["bars"])
        fa = "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["facts"])
        P = [kick(s["kicker"]), title(s["title"]), f'<p class="cap" data-a="fade">Ауданы, {E(s["unit"])}</p><div class="bars">{br}</div>', f'<div class="facts">{fa}</div>']
        extra = ('<svg id="everest" viewBox="0 0 360 520" style="right:110px;top:190px;width:360px;height:520px;max-width:none;max-height:none">'
                 '<rect x="0" y="0" width="360" height="520" rx="22" fill="rgba(10,15,28,.6)"/>'
                 '<rect x="20" y="70" width="320" height="430" rx="10" fill="url(#ocg)"/><defs><linearGradient id="ocg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E8BD0"/><stop offset="1" stop-color="#06142B"/></linearGradient></defs>'
                 '<path class="trench" d="M20 70 L120 70 L150 500 L210 500 L240 70 L340 70" fill="none" stroke="#C2B089" stroke-width="5" stroke-linejoin="round"/>'
                 '<path class="ev" d="M110 500 L180 158 L250 500 Z" fill="#9A8F86" stroke="#fff" stroke-width="3"/><path class="ev" d="M160 255 L180 158 L200 255 L188 238 L180 250 L171 236 Z" fill="#F4F7FA"/>'
                 '<line x1="20" y1="70" x2="340" y2="70" stroke="#9FDBFF" stroke-width="3" stroke-dasharray="6 6"/>'
                 '<text x="180" y="40" text-anchor="middle" font-family="Rubik" font-weight="700" font-size="24" fill="#F4F1EA">Эверест шұңғымада</text>'
                 '<text x="300" y="160" text-anchor="end" font-family="Rubik" font-size="20" fill="#9FDBFF" class="gap">≈2,2 км су</text>'
                 '<text x="180" y="490" text-anchor="middle" font-family="Rubik" font-weight="700" font-size="20" fill="#C2B089">11 022 м</text></svg>')
    elif sid == 13:
        stp = "".join(f'<div class="step" data-a="row"><b><em>{i + 1}</em><span style="display:inline" data-edit>{E(a)}</span></b><span data-edit>{E(b)}</span></div>' for i, (k, a, b) in enumerate(s["steps"]))
        P = [title(s["title"]), kick(s["kicker"]), f'<div class="steps">{stp}</div>']
        extra = '<svg id="cyclepath" viewBox="0 0 1920 1080"><path id="cp"/></svg>'
    elif sid == 14:
        gl = "".join(f'<figure data-a="row"><img src="{{{{IMG:{k}}}}}" alt=""><b data-edit>{E(a)}</b><figcaption data-edit>{E(b)}</figcaption></figure>' for k, a, b in s["gallery"])
        fa = "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["facts"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="gallery">{gl}</div>', f'<div class="facts">{fa}</div>']
        panel_cls = "panel mid"
    elif sid == 15:
        gs = "".join(f'<div class="gas" data-a="row"><i style="background:{c}"></i><b>{v}</b>{E(n)}</div>' for n, v, c in s["gas"])
        rl = "".join(f'<div class="arole" data-a="row" data-edit>{E(x)}</div>' for x in s["roles"])
        P = [kick(s["kicker"]), title(s["title"]), f'<p class="cap" data-a="fade">Ауаның 100 молекуласы:</p><div class="gasrow">{gs}</div>', f'<div class="roles">{rl}</div>']
        extra = '<canvas id="airjar" width="560" height="560" style="left:1000px;top:250px;width:520px;height:520px"></canvas>'
    elif sid == 16:
        fa = "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["facts"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="facts">{fa}</div>', body(s["body"])]
    elif sid == 17:
        cols = ["#B79BFF", "#FF9FD0", "#FFD27F", "#9AA6C0"]
        ls = "".join(f'<div class="l2" data-a="row" data-lo="{lo}" data-hi="{hi}" style="--lc:{cols[i]}"><i></i><div><b data-edit>{E(a)}<small>{E(b)}</small></b><span data-edit>{E(c)}</span></div></div>'
                     for i, (a, b, c, lo, hi) in enumerate(s["layers2"]))
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="layers2">{ls}</div>']
        extra = img("aurora", "ph-float", s["photo"][1], "right:330px;top:600px;width:460px;height:300px")
    elif sid == 18:
        fa = "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["facts"])
        lg = "".join(f'<span style="--lc:{c}"><i></i>{E(t)}</span>' for c, t in s["legend"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="facts">{fa}</div>', f'<div class="legend" data-a="fade">{lg}</div>']
        extra = img("ozonehole", "ph-float", s["photo"][1], "right:96px;bottom:96px;width:300px;height:340px") + \
                img("meteor", "ph-float", "Атмосфера ғарыштан — «жіңішке көгілдір сызық» (NASA, ХҒС)", "right:420px;bottom:96px;width:420px;height:280px")
    elif sid == 19:
        tl = "".join(f'<div class="tl" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["timeline"])
        fa = "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["bounds"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="timeline">{tl}</div>', f'<div class="facts">{fa}</div>']
        extra = img("vernadsky", "ph-float", s["photo"][1], "left:900px;top:600px;width:240px;height:320px")
    elif sid == 20:
        pt = "".join(f'<div class="part" data-a="row"><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["parts"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="parts">{pt}</div>', note(s["note"])]
        extra = img("saiga", "ph-float", s["photo"][1], "right:96px;bottom:96px;width:460px;height:290px")
    elif sid == 21:
        zimg = {"Орманды дала": None, "Дала": "saiga", "Шөлейт пен шөл": "dune", "Таулы өлке": "bigalmaty"}
        zs = "".join(f'<div class="zone" data-a="row" style="background:{"linear-gradient(160deg,#7FA65A,#3E6B35)" if not zimg[a] else "#222"}">'
                     + (f'<img src="{{{{IMG:{zimg[a]}}}}}" alt="">' if zimg[a] else "") + f'<b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div>' for _, a, b in s["zones"])
        bl = "".join(f'<div class="belt" data-a="row" data-belt="{i}"><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div>' for i, (a, b) in enumerate(s["belts"]))
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="zones">{zs}</div>', f'<p class="cap" data-a="fade">Іле Алатауының биіктік белдеулері:</p><div class="belts">{bl}</div>', note(s["note"])]
        panel_cls = "panel" ; extra = ""
    elif sid == 22:
        fa = "".join(f'<div class="fact" data-a="row"><b>{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["facts"])
        so = "".join(f'<div class="soil" data-a="row"><i style="background:{c}"></i><div><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div></div>' for a, b, c in s["soils"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="facts">{fa}</div>', f'<p class="cap" data-a="fade">Қазақстанның негізгі топырақтары:</p><div class="soils">{so}</div>']
    elif sid == 23:
        nm = {k: v["name"] for k, v in C.SPHERES.items()}
        lk = "".join(f'<div class="link" data-a="row"><i style="background:{SPC[a]}"></i><i style="background:{SPC[b]};margin-left:-18px"></i><span data-edit>{E(nm[a])} → {E(nm[b])}: <em>{E(t)}</em></span></div>' for a, b, t in s["links"])
        fa = "".join(f'<div class="fact" data-a="row"><b style="font-size:34px">{E(a)}</b><span data-edit>{E(b)}</span></div>' for a, b in s["bounds"])
        lw = "".join(f'<span data-a="pop" data-edit>{E(x)}</span>' for x in s["laws"])
        P = [kick(s["kicker"]), title(s["title"]), f'<div class="links">{lk}</div>', f'<div class="facts">{fa}</div>', f'<div class="laws">{lw}</div>']
        extra = '<div id="vennhost"></div>'
    elif sid == 24:
        chn = "".join(f'<div class="ch" data-a="row" style="--c:{SPC[k]}"><i class="slot" data-anchor="tok-{k}"></i><div><b data-edit>{E(a)}</b><span data-edit>{E(b)}</span></div></div>' for k, a, b in s["chain"])
        P = [kick(s["kicker"]), title(s["title"]), f'<p class="cause" data-a="fade" data-edit>{E(s["cause"])}</p>', f'<div class="chain">{chn}</div>', f'<div class="hope" data-a="pop" data-edit>{E(s["hope"])}</div>']
        extra = img("aral", "ph-float", s["photo"][1], "left:96px;bottom:80px;width:430px;height:366px")
    elif sid == 25:
        panel_cls = "panel bare answer"; scrim = '<div class="scrim L"></div>'
        ln = "".join(f'<div class="ln" data-a="row"><i style="background:{SPC[k]}"></i><span data-edit>{E(t)}</span></div>' for k, t in s["lines"])
        P = [kick(s["kicker"]), f'<p class="q" data-a="fade" data-edit>{E(s["title"])}</p>', f'<p class="ans" data-a="pop" data-edit>{E(s["answer"])}</p>', f'<div class="lines">{ln}</div>']
        extra = '<div id="you">СІЗ</div>'
    elif sid == 26:
        names = "".join(f'<div class="role" data-edit>{E(a["role"])}</div><div class="name"><i class="slot" data-anchor="tok-{a["sphere"]}"></i><span data-edit>{E(a["name"])}</span></div>' for a in C.AUTHORS.values())
        srcs = "<br>".join(E(x) for x in C.SOURCES)
        phc = "<br>".join(E(f'{v["file"][5:]} — {v["author"]} ({v["license"]})') for v in PH.values())
        cr = (f'<div class="credits-win"><div class="credits" id="credits"><div class="ct">{E(C.TITLE)}</div><div class="thx" data-edit>{E(s["kicker"])}</div>'
              f'{names}<div class="all" data-edit>Төртеуміз де — {E(C.ROLE_ALL)}</div>'
              f'<div class="role">Дереккөздер</div><div class="srcs" data-edit>{srcs}</div>'
              f'<div class="role">Фотосуреттер (Wikimedia Commons)</div><div class="srcs">{phc}</div>'
              f'<div class="role">3D әлем және анимация</div><div class="srcs">{E(C.LIBS)}<br>Диорама, Жер шары, ауысулар — осы жоба үшін кодпен жасалды</div>'
              f'<div class="end">Сұрақтарыңыз болса — қуана жауап береміз<small>Жерді қорғау — өзімізді қорғау</small></div></div></div>')
        return f'<section class="slide s-26 side-C act-5" data-id="26"><div class="layer"><div class="scrim C"></div></div>{cr}</section>'
    inner = "".join(p for p in P if p)
    return (f'<section class="slide s-{sid} side-{side} act-{act}{" cycle" if sid == 13 else ""}" data-id="{sid}"><div class="layer">{scrim}'
            f'<div class="{panel_cls}" data-a="panel">{inner}</div></div>{extra}<div class="pins"></div></section>')

def props_html():
    toks = "".join(f'<div class="tok" id="tok-{k}" style="--c:{SPC[k]}">{token_svg(k)}<div class="lbl">{E(C.SPHERES[k]["name"])}</div></div>' for k in SPC)
    drop = ('<div id="drop"><svg viewBox="0 0 70 96"><defs><radialGradient id="dg" cx="35%" cy="55%" r="70%"><stop offset="0" stop-color="#E8F7FF"/><stop offset=".35" stop-color="#7CCBFF"/>'
            '<stop offset="1" stop-color="#1F6FB8"/></radialGradient></defs><path id="dshape" d="M35 4 C35 4 8 42 8 62 A27 27 0 0 0 62 62 C62 42 35 4 35 4 Z" fill="url(#dg)" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>'
            '<ellipse cx="24" cy="58" rx="6" ry="10" fill="#fff" opacity=".55"/></svg></div>')
    gauge = '<div id="gauge"><div class="rd"></div><div class="rd2"></div><svg viewBox="0 0 220 760"></svg></div>'
    knock = ('<div id="knock"><svg viewBox="0 0 1920 1080" width="1920" height="1080"><defs><mask id="km"><rect width="1920" height="1080" fill="#fff"/>'
             '<text id="ktext" x="960" y="700" text-anchor="middle" font-family="Rubik" font-weight="900" font-size="560" letter-spacing="-20" fill="#000">ЖЕР</text></mask></defs>'
             '<rect width="1920" height="1080" fill="#05070D" mask="url(#km)"/></svg></div>')
    return f'<div id="props">{toks}{drop}</div>{gauge}<div id="venn"><svg viewBox="0 0 1920 1080"></svg></div>{knock}'

def build():
    base = rd(os.path.join(REPO, "build", "viewport-base.css"))
    css = rd(os.path.join(HERE, "deck.css"))
    fonts = os.path.join(REPO, "topic12", "fonts")
    meta = [{"id": s["id"], "act": s["act"], "side": s["side"], "tr": s["tr"], "shot": s["shot"], "who": sorted({w for w, _ in s["say"]})} for s in C.S]
    who_col = {k: SPC[a["sphere"]] for k, a in C.AUTHORS.items()}; who_col["all"] = "#F7C548"
    who_nm = {k: a["name"] for k, a in C.AUTHORS.items()}; who_nm["all"] = "Бәрі"
    def note_html(s):
        out = [f'<div class="hd">{s["id"]}. {E(C.ACTS[s["act"]])} · {E(C.TRANSITIONS[s["tr"]][0])}</div>']
        for w, t in s["say"]:
            t2 = E(t).replace("[", '<span class="rm">[').replace("]", "]</span>")
            out.append(f'<p><span class="who" style="background:{who_col[w]}">{E(who_nm[w])}</span>{t2}</p>')
        return "".join(out)
    notes = [note_html(s) for s in C.S]
    imgs = {"day": "earth_day.jpg", "night": "earth_night.jpg", "clouds": "earth_clouds.jpg", "mask": "earth_mask.png"}
    IMG3 = {k: f"data:image/{'png' if f.endswith('png') else 'jpeg'};base64,{b64(os.path.join(HERE, 'img', f))}" for k, f in imgs.items()}
    data = (f"const META = {json.dumps(meta, ensure_ascii=False)};\nconst NOTES = {json.dumps(notes, ensure_ascii=False)};\n"
            f"const ACTS = {json.dumps(C.ACTS, ensure_ascii=False)};\nconst ACT_Q = {json.dumps(C.ACT_Q, ensure_ascii=False)};\n"
            f"const ACT_SPHERE = {json.dumps(C.ACT_SPHERE)};\nconst SPC = {json.dumps(SPC)};\n"
            f"const IMG = {json.dumps(IMG3)};\n")
    slides = "\n".join(slide_html(s) for s in C.S)
    # фотолар бір рет: data URI → CSS айнымалысы емес, <img src> ішіне тікелей
    for k in PH:
        slides = slides.replace("{{IMG:%s}}" % k, "data:image/jpeg;base64," + b64(os.path.join(HERE, "img", "photos", k + ".jpg")))
    js = lambda n: rd(os.path.join(HERE, n))
    out = f'''<!DOCTYPE html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(C.TITLE)} — {E(C.SUBTITLE)}</title>
<style>
/* === ҚАРІПТЕР: Rubik + Caveat (Google Fonts, SIL OFL) — интернетсіз ашылуы үшін файлдың ішінде === */
@font-face{{font-family:'Rubik';src:url(data:font/ttf;base64,{b64(os.path.join(fonts, "Rubik-Variable.ttf"))}) format('truetype');font-weight:300 900;font-style:normal;font-display:block}}
@font-face{{font-family:'Caveat';src:url(data:font/ttf;base64,{b64(os.path.join(fonts, "Caveat-Variable.ttf"))}) format('truetype');font-weight:400 700;font-style:normal;font-display:block}}
/* === VIEWPORT BASE (frontend-slides, толық) === */
{base}
/* === ЖЕРДІҢ ТӨРТ ҚАБЫҒЫ · ДИЗАЙН === */
{css}
</style>
</head>
<body>
<div class="deck-viewport"><div class="deck-stage" id="deckStage">
<canvas id="gl" width="1600" height="900"></canvas>
{slides}
{props_html()}
<div id="hud" class="off"><svg class="slots" viewBox="0 0 300 64"></svg><div class="sep"></div><span class="act"></span><span class="q"></span></div>
</div></div>
<div id="loader"><b>{E(C.TITLE)}</b><span>3D әлем дайындалып жатыр…</span><i></i></div>
<div id="notes"></div>
<div class="edit-hotzone"></div><button class="edit-toggle" id="editToggle" title="Өңдеу (E)">✎</button><div class="toast" id="toast"></div>
<script>/* === three.js r149 (MIT) === */
{js("vendor/three.min.js")}</script>
<script>/* === anime.js 4.5 (MIT) === */
{js("vendor/anime.umd.min.js")}</script>
<script>/* === matter.js 0.20 (MIT) — физика: шөгінді мен ауа молекулалары === */
{js("vendor/matter.min.js")}</script>
<script>/* === rough-notation 0.5 (MIT) — қолмен сызылған белгілер === */
{js("vendor/rough-notation.iife.js")}</script>
<script>/* === ДЕРЕКТЕР: Қазақстан шекарасы (Natural Earth), тақталар (PB2002) === */
window.GEO_KZ={rd(os.path.join(HERE, "data", "kz.json"))};window.GEO_PLATES={rd(os.path.join(HERE, "data", "plates.json"))};</script>
<script>/* === 3D ӘЛЕМ: ғарыш === */
{js("world.js")}
/* === 3D ӘЛЕМ: диорама === */
{js("world_ground.js")}
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
