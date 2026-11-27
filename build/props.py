# -*- coding: utf-8 -*-
"""Қағаз-коллаж стиліндегі SVG объектілер.
Әр объектінің ішіндегі қозғалатын бөлшектерде CSS класы бар (a-*),
HTML-де олар анимацияланады, PPTX үшін статикалық PNG-ге айналады.
Барлық объектілер мағыналы: сюжетті түсіндіретін қозғалыс қана бар.
"""

PAPER = "#fbf5e8"
INK = "#2a2118"
TERRA = "#b4532f"
GREEN = "#3f7d3a"
LEAF = "#6fae4f"
GOLD = "#c99a3c"
BOARD = "#1f4436"

DEFS = """
<defs>
  <filter id="pshadow" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#2a1608" flood-opacity=".35"/>
  </filter>
  <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="3"/></filter>
  <linearGradient id="potG" x1="0" x2="1"><stop offset="0" stop-color="#a8492a"/><stop offset=".5" stop-color="#cf6b43"/><stop offset="1" stop-color="#8e3a20"/></linearGradient>
  <linearGradient id="beanG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b8653d"/><stop offset="1" stop-color="#6a2f18"/></linearGradient>
  <linearGradient id="leafG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#93c46d"/><stop offset="1" stop-color="#3f7d3a"/></linearGradient>
  <linearGradient id="brassG" x1="0" x2="1"><stop offset="0" stop-color="#7a5a1c"/><stop offset=".45" stop-color="#f1d58a"/><stop offset="1" stop-color="#6b4c14"/></linearGradient>
  <linearGradient id="woodG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98450"/><stop offset="1" stop-color="#8a5a2e"/></linearGradient>
  <linearGradient id="glassG" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".4"/></linearGradient>
</defs>"""

def tape(x, y, r=-8, w=90):
    return f'<rect x="{x-w/2}" y="{y-14}" width="{w}" height="28" fill="#efe3bf" opacity=".85" transform="rotate({r} {x} {y})"/>'

# ---- бұршақ кезеңдері (ортақ белгілер) ----
def seed(cx, cy, s=1):
    return f'''<g transform="translate({cx} {cy}) scale({s})"><path d="M-34 4c0-20 16-32 34-28 18 3 26 18 22 34-4 14-18 22-34 20-14-2-22-11-22-26z" fill="url(#beanG)"/>
<path d="M-4-10c6 4 8 12 4 18" stroke="#3d1a0c" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="-14" cy="-6" rx="8" ry="4" fill="#fff" opacity=".35" transform="rotate(-30 -14 -6)"/></g>'''

def sprout(cx, cy, s=1, cls="a-sway"):
    return f'''<g transform="translate({cx} {cy}) scale({s})"><g class="{cls}">
<path d="M0 0c0-16 0-28 2-42" stroke="{GREEN}" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M2-40c-14-2-24-12-24-24 14 0 24 10 24 24z" fill="url(#leafG)"/><path d="M2-42c10-4 20-12 22-24-12 0-22 10-22 24z" fill="url(#leafG)"/></g>
<ellipse cx="-4" cy="2" rx="12" ry="6" fill="url(#beanG)"/></g>'''

def young(cx, cy, s=1, cls="a-sway"):
    return f'''<g transform="translate({cx} {cy}) scale({s})"><g class="{cls}">
<path d="M0 0C0-24-2-48 2-82" stroke="{GREEN}" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M0-24c-16 0-28-8-30-20 14-2 28 6 30 20z" fill="url(#leafG)"/><path d="M0-34c14-2 26-12 26-24-14 0-26 10-26 24z" fill="url(#leafG)"/>
<path d="M1-56c-12-2-20-10-20-20 12 0 20 8 20 20z" fill="url(#leafG)"/><path d="M2-68c10-2 16-10 16-18-10 0-16 8-16 18z" fill="url(#leafG)"/></g></g>'''

def flower(cx, cy, s=1, cls="a-sway"):
    return f'''<g transform="translate({cx} {cy}) scale({s})"><g class="{cls}">
<path d="M0 0C0-20-2-46 0-70" stroke="{GREEN}" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M0-20c-16 0-26-8-28-18 14-2 26 6 28 18z" fill="url(#leafG)"/><path d="M0-32c14-2 24-10 24-22-14 0-24 10-24 22z" fill="url(#leafG)"/>
<g transform="translate(0 -80)"><g class="a-bloom"><circle r="11" cy="-12" fill="#d8513d"/><circle r="11" cx="12" fill="#d8513d"/><circle r="11" cy="12" fill="#d8513d"/><circle r="11" cx="-12" fill="#d8513d"/><circle r="8" fill="#f2c14e"/></g></g></g></g>'''

STAGES = [("seed", "Тұқым"), ("sprout", "Өскін"), ("young", "Жас өсімдік"), ("flower", "Гүл")]

def stage_icon(kind, cx, cy, s=1):
    return {"seed": lambda: seed(cx, cy - 10, s), "sprout": lambda: sprout(cx, cy + 20 * s, s),
            "young": lambda: young(cx, cy + 40 * s, s), "flower": lambda: flower(cx, cy + 45 * s, s)}[kind]()

def card(kind, label, x, y, r=0, w=170, cls="", hl=False):
    """Полароид тәрізді өсу кезеңі карточкасы (жоғарғы сол бұрыш x,y)."""
    h = w * 1.25
    ring = f'<rect x="-8" y="-8" width="{w+16}" height="{h+16}" rx="12" fill="none" stroke="{TERRA}" stroke-width="6" class="a-ring"/>' if hl else ""
    return f'''<g class="{cls}"><g transform="translate({x} {y}) rotate({r} {w/2} {h/2})"><g filter="url(#pshadow)">
<rect width="{w}" height="{h}" rx="6" fill="#fff"/><rect x="12" y="12" width="{w-24}" height="{w-24}" fill="#f4ecdb"/></g>
{stage_icon(kind, w/2, (w-24)/2+12, w/150)}
<text x="{w/2}" y="{h-20}" text-anchor="middle" font-family="Golos Text, Calibri, sans-serif" font-weight="600" font-size="{w*0.11:.0f}" fill="{INK}">{label}</text>{ring}</g></g>'''

def svg(w, h, body, cls=""):
    return f'<svg class="prop {cls}" viewBox="0 0 {w} {h}" width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">{DEFS}{body}</svg>'

# ================= Слайдтарға арналған объектілер =================

def pots():  # 04 — төрт кезең төрт құмырада
    body = '<rect x="0" y="330" width="1500" height="40" rx="6" fill="url(#woodG)" filter="url(#pshadow)"/>'
    for i, (k, lab) in enumerate(STAGES):
        x = 190 + i * 370
        body += f'''<g class="a-pop" style="--d:{0.2+i*0.25}s">
<path d="M{x-95} 200 h190 l-22 135 h-146z" fill="url(#potG)" filter="url(#pshadow)"/><rect x="{x-105}" y="185" width="210" height="34" rx="6" fill="#c25e38"/>
<ellipse cx="{x}" cy="196" rx="92" ry="12" fill="#4a2c1a"/>
{stage_icon(k, x, 150 if k!='seed' else 186, 1.5)}
</g>'''
    return svg(1500, 380, body)

def voice():  # 05 — түйінделген дыбыс толқыны → қағаз құстар
    wave = "M60 300 C 140 220, 200 380, 280 300 S 420 220, 470 300 C 500 350, 560 250, 520 300 C 480 350, 600 360, 560 290 C 540 250, 640 260, 640 300 S 760 380, 840 300 S 980 220, 1060 300"
    body = f'''<path d="M1250 120c-40 0-80 30-90 80-4 22 6 40-6 58l-30 40c-6 8 0 16 10 16h24l-4 32c-2 16 10 24 26 22l30-4v50c0 30 30 56 70 56h60V120z" fill="#3b2a1e" opacity=".92"/>
<path class="a-flow" d="{wave}" fill="none" stroke="{PAPER}" stroke-width="16" stroke-linecap="round" stroke-dasharray="40 18" filter="url(#pshadow)" transform="translate(140 0)"/>
<circle cx="785" cy="305" r="46" fill="none" stroke="{TERRA}" stroke-width="5" stroke-dasharray="8 10" class="a-spin"/>'''
    for i in range(4):
        body += f'<g class="a-bird" style="--d:{i*0.9}s"><path d="M200 {260-i*40} l40 -14 -12 14 12 14z" fill="{PAPER}" filter="url(#pshadow)"/></g>'
    return svg(1440, 600, body)

def mirror_tiles():  # 07 — логопед айнасы және Р/Л әріптері
    body = f'''<g filter="url(#pshadow)"><circle cx="260" cy="250" r="190" fill="#7a5a2c"/><circle cx="260" cy="250" r="165" fill="#dfe8ea"/>
<circle cx="260" cy="250" r="165" fill="url(#glassG)"/><path d="M200 300 q60 50 120 0 q-60 20 -120 0z" fill="#b5524a"/><rect x="246" y="430" width="28" height="120" rx="10" fill="#7a5a2c"/></g>'''
    for i, (ch, col) in enumerate((("Р", TERRA), ("Л", BOARD))):
        x = 520 + i * 190
        body += f'''<g class="a-wobble" style="--d:{i*0.4}s"><rect x="{x}" y="240" width="150" height="150" rx="14" fill="#f1dfb5" filter="url(#pshadow)"/>
<text x="{x+75}" y="355" text-anchor="middle" font-family="Lora, Cambria, serif" font-weight="700" font-size="120" fill="{col}">{ch}</text></g>'''
    return svg(900, 560, body)

def gold_frame(w, h, inner):  # 09 — Роуз портреті
    return svg(w, h, f'''<g filter="url(#pshadow)"><rect width="{w}" height="{h}" rx="6" fill="#b48a33"/>
<rect x="10" y="10" width="{w-20}" height="{h-20}" fill="none" stroke="#f3d98b" stroke-width="10"/><rect x="26" y="26" width="{w-52}" height="{h-52}" fill="none" stroke="#6b4a12" stroke-width="4"/></g>{inner}''')

def ramp():  # 10 — баспалдақ + пандус, оны бәрі пайдаланады
    steps = "".join(f'<rect x="{620+i*70}" y="{430-i*60}" width="{560-i*70}" height="60" fill="#d8c3a0" stroke="#a98b5f" stroke-width="3"/>' for i in range(4))
    body = f'''<rect x="900" y="40" width="420" height="160" fill="#efe1c4" filter="url(#pshadow)"/><rect x="1060" y="80" width="100" height="120" fill="#8a5a2e"/>
{steps}<path d="M40 490 L620 250 L620 490z" fill="#cdb48a" stroke="#a98b5f" stroke-width="3" filter="url(#pshadow)"/>
<path d="M40 470 L620 230" stroke="url(#brassG)" stroke-width="8" stroke-linecap="round"/>
<g class="a-ramp" style="--d:0s"><g transform="rotate(-22.5)"><circle cx="0" cy="-26" r="24" fill="none" stroke="{INK}" stroke-width="6"/><rect x="-16" y="-80" width="30" height="40" rx="6" fill="{TERRA}"/><circle cx="0" cy="-92" r="13" fill="#6b3a22"/></g></g>
<g class="a-ramp" style="--d:2.2s"><g transform="rotate(-22.5)"><circle cx="-24" cy="-18" r="16" fill="none" stroke="{GREEN}" stroke-width="5"/><circle cx="24" cy="-18" r="16" fill="none" stroke="{GREEN}" stroke-width="5"/><path d="M-24-18 L0-44 L24-18 M0-44 l-6-14" stroke="{GREEN}" stroke-width="5" fill="none"/></g></g>
<g class="a-ramp" style="--d:4.4s"><g transform="rotate(-22.5)"><rect x="-26" y="-50" width="52" height="34" rx="4" fill="#c99a3c"/><circle cx="-16" cy="-10" r="8" fill="{INK}"/><circle cx="16" cy="-10" r="8" fill="{INK}"/></g></g>'''
    return svg(1300, 520, body)

def doors(labels):  # 11 — үш есік, бір бақ
    body = ""
    for i, (q, t, d) in enumerate(labels):
        x = 40 + i * 600
        body += f'''<g><path d="M{x} 640 V200 a250 250 0 0 1 500 0 V640z" fill="#8fc06a"/>
<path d="M{x+40} 640 V420 h420 V640z" fill="#6fae4f" opacity=".6"/><path d="M{x+250} 640 V330" stroke="{GREEN}" stroke-width="8"/>
<circle cx="{x+250}" cy="300" r="34" fill="#d8513d" class="a-bloom"/>
<path d="M{x} 640 V200 a250 250 0 0 1 500 0 V640" fill="none" stroke="#6b4423" stroke-width="22"/>
<g class="a-door" style="--d:{0.4+i*0.35}s"><path d="M{x} 640 V200 a250 250 0 0 1 250 -250 V640z" fill="url(#woodG)" stroke="#6b4423" stroke-width="6"/></g>
<g class="a-door2" style="--d:{0.4+i*0.35}s"><path d="M{x+500} 640 V200 a250 250 0 0 0 -250 -250 V640z" fill="url(#woodG)" stroke="#6b4423" stroke-width="6"/></g></g>'''
    return svg(1840, 660, body)

def stake():  # 13 — таяққа байланған өскін (Выготский)
    body = f'''<path d="M300 760 h220 l-26 150 h-168z" fill="url(#potG)" filter="url(#pshadow)" transform="translate(0 -160)"/>
<rect x="404" y="80" width="14" height="560" rx="5" fill="#a77a45"/>
<path class="a-grow" pathLength="1" d="M410 600 C 380 520, 440 470, 405 400 S 380 280, 412 210 S 430 120, 410 90" fill="none" stroke="{GREEN}" stroke-width="9" stroke-linecap="round"/>'''
    for i, (y, sx) in enumerate(((520, -1), (440, 1), (360, -1), (280, 1), (200, -1), (130, 1))):
        body += f'<g class="a-leaf {'lo-r' if sx>0 else 'lo-l'}" style="--d:{0.6+i*0.35}s"><path d="M410 {y} c{sx*30} -6 {sx*70} -30 {sx*78} -64 c{-sx*40} 0 {-sx*72} 26 {-sx*78} 64z" fill="url(#leafG)"/></g>'
        if i % 2 == 0:
            body += f'<path d="M398 {y+20} q12 10 26 0" stroke="#d9bf8a" stroke-width="5" fill="none" class="a-pop" style="--d:{0.8+i*0.35}s"/>'
    return svg(820, 760, body)

def garden7():  # 14 — жеті таяқ = жеті тәсіл
    body = '<path d="M0 520 q920 -60 1840 0 v120 H0z" fill="#6b4423"/>'
    for i in range(7):
        x = 150 + i * 255
        body += f'''<g class="a-pop" style="--d:{0.15*i}s"><rect x="{x-6}" y="180" width="12" height="360" fill="#c8a06a"/>
{young(x+4, 530, 2.2, "a-sway")}<g filter="url(#pshadow)"><circle cx="{x}" cy="170" r="40" fill="{PAPER}"/></g>
<text x="{x}" y="186" text-anchor="middle" font-family="Lora, Cambria, serif" font-weight="700" font-size="44" fill="{TERRA}">{i+1}</text></g>'''
    return svg(1840, 640, body)

def two_step():  # 15 — екі қадам: көру → қою
    body = ""
    for i, (k, l) in enumerate([("young", "Жас өсімдік"), ("seed", "Тұқым"), ("flower", "Гүл"), ("sprout", "Өскін")]):
        body += card(k, l, 40 + i * 190, 40 + (i % 2) * 20, (-4, 3, -2, 5)[i], 160, "a-pop")
    body += f'''<g class="a-pop" style="--d:.8s"><circle cx="120" cy="330" r="34" fill="{TERRA}"/><text x="120" y="344" text-anchor="middle" font-family="Lora, Cambria, serif" font-weight="700" font-size="40" fill="#fff">1</text></g>
<path d="M60 430 h680" stroke="{INK}" stroke-width="4" stroke-dasharray="14 12"/>'''
    for i in range(4):
        body += f'<rect x="{60+i*175}" y="460" width="150" height="190" rx="8" fill="none" stroke="#a98b5f" stroke-width="4" stroke-dasharray="10 8"/>'
    body += card("seed", "Тұқым", 60, 460, 0, 150, "a-place", True)
    body += f'''<g class="a-pop" style="--d:1.4s"><circle cx="120" cy="700" r="34" fill="{TERRA}"/><text x="120" y="714" text-anchor="middle" font-family="Lora, Cambria, serif" font-weight="700" font-size="40" fill="#fff">2</text></g>'''
    return svg(820, 760, body)

def schedule():  # 16 — көрнекі кесте + алдымен/кейін
    icons = [
        ('<ellipse cx="0" cy="0" rx="48" ry="28" fill="#fff" stroke="#2a2118" stroke-width="6"/><circle r="16" fill="#3a6a8a"/><circle r="6" fill="#111"/>', "Қара"),
        ('<path d="M-30 30 v-40 a8 8 0 0 1 16 0 v-20 a8 8 0 0 1 16 0 v14 a8 8 0 0 1 16 0 v10 a8 8 0 0 1 16 0 v40 q0 20 -20 24 h-24 q-20 0 -20 -28z" fill="#f0c9a0" stroke="#2a2118" stroke-width="5"/>', "Таңда"),
        ('<path d="M-40 -10 h80 l-10 50 h-60z" fill="url(#potG)"/><rect x="-46" y="-22" width="92" height="16" rx="4" fill="#c25e38"/><path d="M0 -22 v-24" stroke="#3f7d3a" stroke-width="6"/><path d="M0-40 c-14 0-22-8-22-18 12 0 22 8 22 18z" fill="#6fae4f"/>', "Қой")]
    body = '<rect x="0" y="0" width="980" height="300" rx="10" fill="#c79a63" filter="url(#pshadow)"/><rect x="14" y="14" width="952" height="272" rx="6" fill="#b98b52"/>'
    for i, (ic, lab) in enumerate(icons):
        x = 170 + i * 320
        body += f'''<g class="a-pin" style="--d:{0.3+i*0.35}s"><g transform="rotate({(-3,2,-2)[i]} {x} 150)"><rect x="{x-110}" y="40" width="220" height="220" rx="8" fill="{PAPER}" filter="url(#pshadow)"/>
<g transform="translate({x} 130)">{ic}</g><text x="{x}" y="235" text-anchor="middle" font-family="Golos Text, Calibri, sans-serif" font-weight="700" font-size="34" fill="#2a2118">{lab}</text>
<circle cx="{x}" cy="54" r="12" fill="{TERRA}"/></g></g>'''
        if i < 2:
            body += f'<path d="M{x+120} 150 h70" stroke="#fff6e6" stroke-width="8" marker-end="" class="a-pop" style="--d:{0.5+i*0.35}s"/><path d="M{x+180} 136 l16 14 -16 14" fill="none" stroke="#fff6e6" stroke-width="8" class="a-pop" style="--d:{0.5+i*0.35}s"/>'
    body += f'''<g class="a-pop" style="--d:1.4s"><g transform="translate(140 360)"><rect width="700" height="260" rx="10" fill="{PAPER}" filter="url(#pshadow)"/>
<path d="M350 20 v220" stroke="#d8c3a0" stroke-width="4"/>
<text x="175" y="60" text-anchor="middle" font-family="Golos Text, Calibri, sans-serif" font-weight="700" font-size="32" fill="{TERRA}">АЛДЫМЕН</text>
<text x="525" y="60" text-anchor="middle" font-family="Golos Text, Calibri, sans-serif" font-weight="700" font-size="32" fill="{GREEN}">КЕЙІН</text>
{seed(175, 160, 1.6)}{sprout(525, 215, 1.8)}</g></g>'''
    return svg(980, 640, body)

def aac():  # 17 — планшет + коммуникация тақтасы
    syms = [("seed", None), ("sprout", None), ("sun", "#f2c14e"), ("water", "#4a8fc4"), ("yes", "#3f7d3a"), ("no", "#b4532f")]
    body = f'<g filter="url(#pshadow)"><rect x="0" y="0" width="700" height="500" rx="40" fill="#2b2b2e"/></g><rect x="30" y="30" width="640" height="440" rx="14" fill="#f8f3e8"/>'
    for i, (k, col) in enumerate(syms):
        cx, cy = 140 + (i % 3) * 210, 140 + (i // 3) * 210
        g = f'<rect x="{cx-90}" y="{cy-90}" width="180" height="180" rx="16" fill="#fff" stroke="#e4d6b8" stroke-width="4"/>'
        if k == "seed": g += seed(cx, cy, 1.6)
        elif k == "sprout": g += sprout(cx, cy + 50, 1.6, "")
        elif k == "sun": g += f'<circle cx="{cx}" cy="{cy}" r="40" fill="{col}"/>' + "".join(f'<path d="M{cx} {cy-58} v-18" stroke="{col}" stroke-width="8" stroke-linecap="round" transform="rotate({a} {cx} {cy})"/>' for a in range(0, 360, 45))
        elif k == "water": g += f'<path d="M{cx} {cy-55} C {cx+40} {cy}, {cx+40} {cy+45}, {cx} {cy+45} S {cx-40} {cy}, {cx} {cy-55}z" fill="{col}"/>'
        elif k == "yes": g += f'<path d="M{cx-45} {cy} l30 32 60 -70" stroke="{col}" stroke-width="18" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        else: g += f'<path d="M{cx-38} {cy-38} l76 76 M{cx+38} {cy-38} l-76 76" stroke="{col}" stroke-width="18" stroke-linecap="round"/>'
        body += f'<g class="{"a-tap" if k=="seed" else ""}">{g}</g>'
    body += f'''<g class="a-sound"><path d="M260 60 q20 20 0 40 M285 45 q35 35 0 70 M310 30 q50 50 0 100" stroke="{TERRA}" stroke-width="7" fill="none" stroke-linecap="round" transform="translate(-30 40)"/></g>
<g transform="translate(560 330) rotate(8)"><rect width="300" height="230" rx="8" fill="#fff6dc" filter="url(#pshadow)"/>
{"".join(f'<rect x="{20+(j%3)*92}" y="{20+(j//3)*100}" width="80" height="88" rx="6" fill="#efe3c3"/>' for j in range(6))}
{seed(60, 62, .7)}{sprout(152, 92, .7, "")}{young(244, 100, .55, "")}<circle cx="60" cy="162" r="20" fill="#f2c14e"/><path d="M140 160 l14 14 28-30" stroke="#3f7d3a" stroke-width="9" fill="none"/>
<path d="M228 148 l30 30 M258 148 l-30 30" stroke="#b4532f" stroke-width="9"/></g>'''
    return svg(880, 600, body)

def hourglass():  # 18 — 5 секунд
    body = f'''<g filter="url(#pshadow)"><rect x="40" y="20" width="300" height="34" rx="10" fill="url(#woodG)"/><rect x="40" y="566" width="300" height="34" rx="10" fill="url(#woodG)"/>
<rect x="58" y="54" width="16" height="512" fill="#8a5a2e"/><rect x="306" y="54" width="16" height="512" fill="#8a5a2e"/></g>
<path d="M90 60 h200 c0 120 -80 170 -92 250 c12 80 92 130 92 250 h-200 c0 -120 80 -170 92 -250 c-12 -80 -92 -130 -92 -250z" fill="url(#glassG)" stroke="#e8dcc0" stroke-width="5"/>
<clipPath id="topC"><path d="M90 60 h200 c0 120 -80 170 -92 250 h-16 c-12 -80 -92 -130 -92 -250z"/></clipPath>
<clipPath id="botC"><path d="M182 310 h16 c12 80 92 130 92 250 h-200 c0 -120 80 -170 92 -250z"/></clipPath>
<g clip-path="url(#topC)"><rect class="a-sandtop" x="80" y="150" width="220" height="170" fill="#e0b45c"/></g>
<g clip-path="url(#botC)"><path class="a-sandbot" d="M80 562 q110 -150 220 0z" fill="#e0b45c"/></g>
<rect class="a-stream" x="188" y="300" width="4" height="250" fill="#e0b45c"/>'''
    return svg(380, 620, body)

def bubbles():  # 19 — диалог: қатені бетке баспай түзету
    body = f'''<g class="a-pop" style="--d:.3s"><g filter="url(#pshadow)"><path d="M20 20 h560 a24 24 0 0 1 24 24 v120 a24 24 0 0 1 -24 24 h-420 l-60 50 10 -50 h-90 a24 24 0 0 1 -24 -24 v-120 a24 24 0 0 1 24 -24z" fill="{PAPER}"/></g>
<text x="60" y="80" font-family="Golos Text, Calibri, sans-serif" font-weight="700" font-size="30" fill="{TERRA}">БАЛА</text>
<text x="60" y="145" font-family="Lora, Cambria, serif" font-weight="700" font-size="54" fill="{INK}">«Айман келді!»</text></g>
<g class="a-pop" style="--d:1.3s"><g filter="url(#pshadow)"><path d="M180 290 h640 a24 24 0 0 1 24 24 v150 a24 24 0 0 1 -24 24 h-90 l10 50 -60 -50 h-476 a24 24 0 0 1 -24 -24 v-150 a24 24 0 0 1 24 -24z" fill="#e9f1e4"/></g>
<text x="220" y="350" font-family="Golos Text, Calibri, sans-serif" font-weight="700" font-size="30" fill="{GREEN}">МҰҒАЛІМ</text>
<text x="220" y="420" font-family="Lora, Cambria, serif" font-weight="700" font-size="50" fill="{INK}">«Иә, Арман келді.</text>
<text x="220" y="472" font-family="Lora, Cambria, serif" font-weight="600" font-style="italic" font-size="40" fill="{INK}">Арман қайда отырды?»</text>
<path class="a-under" pathLength="1" d="M300 432 q60 14 128 0" stroke="{TERRA}" stroke-width="7" fill="none" stroke-linecap="round"/></g>'''
    return svg(860, 560, body)

def circle_turns():  # 20 — кезек айналады
    body = '<circle cx="330" cy="330" r="250" fill="#c79a63" opacity=".35"/><circle cx="330" cy="330" r="150" fill="url(#woodG)" filter="url(#pshadow)"/>'
    for i in range(8):
        import math
        a = i / 8 * 2 * math.pi
        x, y = 330 + 240 * math.cos(a), 330 + 240 * math.sin(a)
        body += f'<g filter="url(#pshadow)"><circle cx="{x:.0f}" cy="{y:.0f}" r="44" fill="{["#d8a35c","#6fae4f","#b4532f","#4a8fc4"][i%4]}"/><circle cx="{x:.0f}" cy="{y:.0f}" r="22" fill="#f6e3c6"/></g>'
    body += f'<g><animateTransform attributeName="transform" type="rotate" from="0 330 330" to="360 330 330" dur="9s" repeatCount="indefinite"/><g transform="translate(570 330)"><circle r="24" fill="{PAPER}" stroke="{TERRA}" stroke-width="8" filter="url(#pshadow)"/><path d="M-8-10 l18 10 -18 10z" fill="{TERRA}"/></g></g>'
    return svg(660, 660, body)

def row_cards():  # 21 — ортақ қатар: Айару → тұқым, жұбы → өскін
    body = ""
    for i in range(4):
        body += f'<rect x="{20+i*200}" y="40" width="176" height="220" rx="10" fill="none" stroke="#fff6e6" stroke-width="5" stroke-dasharray="12 10"/>'
    body += card("seed", "Тұқым", 23, 42, 0, 170, "a-place", True)
    body += card("sprout", "Өскін", 223, 42, 0, 170, "a-place2")
    body += f'''<g class="a-pop" style="--d:1.1s"><rect x="40" y="290" width="140" height="44" rx="22" fill="{TERRA}"/><text x="110" y="321" text-anchor="middle" font-family="Golos Text, Calibri, sans-serif" font-weight="700" font-size="24" fill="#fff">Айару</text></g>
<g class="a-pop" style="--d:2.2s"><rect x="240" y="290" width="140" height="44" rx="22" fill="{GREEN}"/><text x="310" y="321" text-anchor="middle" font-family="Golos Text, Calibri, sans-serif" font-weight="700" font-size="24" fill="#fff">Жұбы</text></g>'''
    return svg(830, 350, body)

def two_paths():  # 22 — екі жол бір арбаға
    body = f'''<path d="M0 640 C 300 560, 600 520, 920 300" stroke="#d8c3a0" stroke-width="70" fill="none" stroke-linecap="round"/>
<path d="M1840 640 C 1540 560, 1240 520, 920 300" stroke="#b98450" stroke-width="70" fill="none" stroke-dasharray="40 14"/>
<path id="pA" d="M0 640 C 300 560, 600 520, 920 300" fill="none"/><path id="pB" d="M1840 640 C 1540 560, 1240 520, 920 300" fill="none"/>
<g filter="url(#pshadow)"><path d="M800 300 v-200 a120 120 0 0 1 240 0 v200" fill="none" stroke="#8a5a2e" stroke-width="22"/></g>
{flower(800, 300, 1.6)}{flower(1040, 300, 1.6)}{young(860, 200, 1.2)}{young(980, 200, 1.2)}
<circle r="26" fill="{TERRA}" filter="url(#pshadow)"><animateMotion dur="4s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.8;1" calcMode="linear"><mpath href="#pA"/></animateMotion></circle>
<circle r="26" fill="{GREEN}" filter="url(#pshadow)"><animateMotion dur="4s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.8;1" calcMode="linear"><mpath href="#pB"/></animateMotion></circle>'''
    return svg(1840, 660, body)

def team():  # 23 — дөңгелек үстел: бір жоспар
    import math
    roles = [("Мұғалім", "#b4532f"), ("Логопед", "#1f4436"), ("Ассистент", "#c99a3c"), ("Ата-ана", "#4a8fc4")]
    body = '<circle cx="360" cy="330" r="190" fill="url(#woodG)" filter="url(#pshadow)"/>'
    for i, (r, c) in enumerate(roles):
        a = -math.pi / 2 + i * math.pi / 2
        x, y = 360 + 285 * math.cos(a), 330 + 285 * math.sin(a)
        body += f'<path class="a-draw" pathLength="1" style="--d:{0.6+i*0.3}s" d="M{x:.0f} {y:.0f} L360 330" stroke="{c}" stroke-width="6" stroke-dasharray="1" fill="none"/>'
        body += f'''<g class="a-pop" style="--d:{0.2+i*0.3}s"><g filter="url(#pshadow)"><circle cx="{x:.0f}" cy="{y:.0f}" r="64" fill="{c}"/></g>
<text x="{x:.0f}" y="{y+8:.0f}" text-anchor="middle" font-family="Golos Text, Calibri, sans-serif" font-weight="700" font-size="21" fill="#fff">{r}</text></g>'''
    body += f'''<g class="a-pop" style="--d:1.8s"><rect x="270" y="270" width="180" height="120" rx="8" fill="{PAPER}" transform="rotate(-4 360 330)"/>
{seed(330, 330, .8)}<path d="M370 330 h40" stroke="{INK}" stroke-width="4"/>{flower(420, 375, .55, "")}</g>'''
    return svg(720, 660, body)

def notebook():  # 24 — бақылау дәптері
    body = f'''<g filter="url(#pshadow)"><rect x="0" y="0" width="760" height="560" rx="10" fill="{PAPER}"/></g>
{"".join(f'<path d="M60 {140+i*62} h660" stroke="#cfdce6" stroke-width="3"/>' for i in range(7))}
{"".join(f'<circle cx="24" cy="{40+i*48}" r="9" fill="#6d6d6d"/>' for i in range(11))}
<text x="60" y="90" font-family="Lora, Cambria, serif" font-weight="700" font-size="50" fill="{INK}">Дәлел</text>
<path d="M60 106 h150" stroke="{TERRA}" stroke-width="5"/>
<text x="60" y="190" font-family="Golos Text, Calibri, sans-serif" font-size="32" fill="{INK}">Топта</text>
<text x="60" y="252" font-family="Golos Text, Calibri, sans-serif" font-size="32" fill="{INK}">Жеке</text>
<text x="700" y="190" text-anchor="end" font-family="Lora, Cambria, serif" font-style="italic" font-weight="700" font-size="36" fill="{TERRA}" class="a-write" style="--d:.8s">1 таңдау</text>
<text x="700" y="252" text-anchor="end" font-family="Lora, Cambria, serif" font-style="italic" font-weight="700" font-size="36" fill="{TERRA}" class="a-write" style="--d:1.3s">4 / 4</text>
{"".join(card(k, l, 60 + i * 165, 300, (-3, 2, -2, 3)[i], 140, "a-pop") for i, (k, l) in enumerate(STAGES))}
<g class="a-stamp" style="--d:2s"><circle cx="640" cy="440" r="80" fill="none" stroke="{TERRA}" stroke-width="8" opacity=".85"/><path d="M600 440 l28 30 56 -66" stroke="{TERRA}" stroke-width="14" fill="none" stroke-linecap="round"/></g>'''
    return svg(760, 560, body)

def value_stamp(word):  # 25-27 құндылық мөрі
    return svg(520, 200, f'''<g class="a-stamp" style="--d:.6s"><rect x="10" y="10" width="500" height="180" rx="16" fill="#fbf5e8" fill-opacity=".93" stroke="{TERRA}" stroke-width="8" filter="url(#pshadow)"/>
<rect x="26" y="26" width="468" height="148" rx="10" fill="none" stroke="{TERRA}" stroke-width="3"/>
<text x="260" y="122" text-anchor="middle" font-family="Lora, Cambria, serif" font-weight="700" font-size="{58 if len(word)<12 else 34}" fill="{TERRA}">{word}</text></g>''')

def unity_pot():  # 26 — әр бала бір жапырақ қосады
    cols = ["#6fae4f", "#93c46d", "#4f9a48", "#a6cf7c", "#5b8f3e", "#7fbf5a", "#8ccf6a", "#3f7d3a"]
    body = f'''<path d="M220 560 h300 l-30 170 h-240z" fill="url(#potG)" filter="url(#pshadow)" transform="translate(0 -100)"/><rect x="205" y="445" width="330" height="30" rx="6" fill="#c25e38"/>
<path d="M370 450 C 350 380, 400 320, 370 250 S 350 140, 372 70" stroke="{GREEN}" stroke-width="9" fill="none" class="a-grow" pathLength="1" stroke-linecap="round"/>'''
    for i, c in enumerate(cols):
        y = 420 - i * 46
        sx = -1 if i % 2 else 1
        body += f'<g class="a-leaf {'lo-r' if sx>0 else 'lo-l'}" style="--d:{0.5+i*0.35}s"><path d="M370 {y} c{sx*34} -6 {sx*80} -30 {sx*88} -70 c{-sx*46} 0 {-sx*82} 30 {-sx*88} 70z" fill="{c}" stroke="#fff" stroke-width="2"/></g>'
    return svg(740, 640, body)

def scale_balance():  # 27 — бір өлшем, әр түрлі жол
    body = f'''<g filter="url(#pshadow)"><rect x="300" y="560" width="200" height="30" rx="8" fill="url(#brassG)"/><rect x="390" y="120" width="20" height="450" fill="url(#brassG)"/><circle cx="400" cy="112" r="20" fill="url(#brassG)"/></g>
<g><animateTransform attributeName="transform" type="rotate" values="-9 400 120;5 400 120;-2 400 120;0 400 120;0 400 120" keyTimes="0;.3;.55;.75;1" dur="6s" repeatCount="indefinite"/>
<rect x="90" y="112" width="620" height="16" rx="8" fill="url(#brassG)"/>
<g><animateTransform attributeName="transform" type="rotate" values="9 120 120;-5 120 120;2 120 120;0 120 120;0 120 120" keyTimes="0;.3;.55;.75;1" dur="6s" repeatCount="indefinite"/><path d="M120 120 L60 320 M120 120 L180 320" stroke="#a8842c" stroke-width="3"/><path d="M30 320 h180 q-20 50 -90 50 q-70 0 -90 -50z" fill="url(#brassG)"/>
{card("seed","Тұқым",50,220,-6,70)}{card("sprout","Өскін",110,224,5,70)}</g>
<g><animateTransform attributeName="transform" type="rotate" values="9 680 120;-5 680 120;2 680 120;0 680 120;0 680 120" keyTimes="0;.3;.55;.75;1" dur="6s" repeatCount="indefinite"/><path d="M680 120 L620 320 M680 120 L740 320" stroke="#a8842c" stroke-width="3"/><path d="M590 320 h180 q-20 50 -90 50 q-70 0 -90 -50z" fill="url(#brassG)"/>
<rect x="630" y="250" width="110" height="72" rx="4" fill="{PAPER}" transform="rotate(-4 685 286)"/><path d="M645 272 h80 M645 290 h70 M645 308 h76" stroke="#8a7a66" stroke-width="4"/></g></g>'''
    return svg(800, 600, body)

def book():  # 28 — ашық кітап
    return svg(700, 420, f'''<g filter="url(#pshadow)"><path d="M350 60 C 260 20, 120 20, 30 50 V 380 C 120 350, 260 350, 350 390z" fill="{PAPER}"/>
<path d="M350 60 C 440 20, 580 20, 670 50 V 380 C 580 350, 440 350, 350 390z" fill="#f4ead3"/></g>
{"".join(f'<path d="M70 {110+i*36} C 150 {96+i*36}, 250 {96+i*36}, 320 {112+i*36}" stroke="#bfae8e" stroke-width="5" fill="none"/>' for i in range(7))}
<path class="a-under" pathLength="1" d="M70 218 C 150 204, 250 204, 320 220" stroke="{TERRA}" stroke-width="8" fill="none"/>
<rect x="400" y="100" width="230" height="200" rx="6" fill="#e5d3ad"/><path d="M420 280 l60 -80 40 50 30 -30 60 60z" fill="#8aa35b"/><circle cx="590" cy="150" r="22" fill="#f2c14e"/>''')

def bloom_vine():  # 29 — тұқымнан гүлге (1-слайдқа айналып келу)
    body = f'''<path class="a-grow" pathLength="1" d="M300 760 C 330 640, 250 560, 320 470 S 420 330, 360 230 S 300 90, 380 20" stroke="{GREEN}" stroke-width="12" fill="none" stroke-linecap="round" style="--d:.3s"/>'''
    pts = [(318, 610, -1), (300, 520, 1), (352, 420, -1), (392, 330, 1), (346, 230, -1), (330, 140, 1)]
    for i, (x, y, sx) in enumerate(pts):
        body += f'<g class="a-leaf {'lo-r' if sx>0 else 'lo-l'}" style="--d:{0.9+i*0.3}s"><path d="M{x} {y} c{sx*34} -6 {sx*84} -30 {sx*92} -72 c{-sx*48} 0 {-sx*86} 30 {-sx*92} 72z" fill="url(#leafG)"/></g>'
    for i, (x, y) in enumerate(((410, 290), (300, 180), (390, 40))):
        body += f'<g class="a-flower" style="--d:{2.6+i*0.35}s"><g transform="translate({x} {y}) scale(1.8)"><circle r="11" cy="-12" fill="#d8513d"/><circle r="11" cx="12" fill="#d8513d"/><circle r="11" cy="12" fill="#d8513d"/><circle r="11" cx="-12" fill="#d8513d"/><circle r="8" fill="#f2c14e"/></g></g>'
    return svg(700, 780, body)

def roadmap_bar():
    return ""
