# -*- coding: utf-8 -*-
"""ideas/combo-lab.html — комбо зертханасы (бір файл: CSS, қаріптер, anime.js, комболар, суреттер ішінде).
Іске қосу: python3 ideas/build_lab.py [сурет_папкасы]
Суреттер — x ≠ 0 презентациясының 3D рендерлері (ideas/lab/img/*.jpg).
"""
import base64, html, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HERE)
IMG_DIR = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "lab", "img")
rd = lambda p: open(p, encoding="utf-8").read()
b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()

# GitHub жұлдыздары: ideas/data/libs_stars.tsv (GitHub API, 22.11.2026)
NOTES = {
    "mrdoob/three.js": "3D сахна — x ≠ 0 сыныбы осымен салынған",
    "3b1b/manim": "математикалық түсіндірме видеолар (Python)",
    "animate-css/animate.css": "дайын CSS анимациялар",
    "juliangarnier/anime": "біздің негізгі қозғалтқыш (MIT)",
    "remotion-dev/remotion": "React кодымен видео жасау",
    "hakimel/reveal.js": "HTML презентация жүйесі",
    "slidevjs/slidev": "Markdown-тан слайдтар",
    "pixijs/pixijs": "жылдам 2D WebGL графика",
    "motiondivision/motion": "React/JS анимация (бұрынғы Framer Motion)",
    "airbnb/lottie-web": "After Effects анимацияларын ойнату",
    "greensock/GSAP": "2025 жылдан бастап тегін (Webflow лицензиясы)",
    "motion-canvas/motion-canvas": "кодпен түсіндірме анимация",
}
def libs():
    rows = {}
    for line in open(os.path.join(HERE, "data", "libs_stars.tsv"), encoding="utf-8"):
        p = line.rstrip("\n").split("\t")
        if len(p) >= 2 and p[1].isdigit(): rows[p[0]] = int(p[1])
    out = [{"name": k.split("/")[1] if k != "juliangarnier/anime" else "anime.js", "repo": k, "stars": rows[k], "note": n} for k, n in NOTES.items() if k in rows]
    return sorted(out, key=lambda x: -x["stars"])

def build():
    data = json.load(open(os.path.join(HERE, "data", "combos.json"), encoding="utf-8"))
    data["libs"] = libs(); data["libsDate"] = "22.11.2026"
    imgs = {os.path.splitext(f)[0]: "data:image/jpeg;base64," + b64(os.path.join(IMG_DIR, f)) for f in sorted(os.listdir(IMG_DIR)) if f.endswith(".jpg")}
    fonts = os.path.join(REPO, "topic12", "fonts")
    base = rd(os.path.join(REPO, "build", "viewport-base.css"))
    out = f'''<!DOCTYPE html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Комбо зертханасы — анимация комболары</title>
<style>
/* === ҚАРІПТЕР: Rubik + Caveat (SIL OFL), файлдың ішінде === */
@font-face{{font-family:'Rubik';src:url(data:font/ttf;base64,{b64(os.path.join(fonts, "Rubik-Variable.ttf"))}) format('truetype');font-weight:300 900;font-display:block}}
@font-face{{font-family:'Caveat';src:url(data:font/ttf;base64,{b64(os.path.join(fonts, "Caveat-Variable.ttf"))}) format('truetype');font-weight:400 700;font-display:block}}
/* === VIEWPORT BASE (frontend-slides, толық) === */
{base}
/* === ЗЕРТХАНА === */
{rd(os.path.join(HERE, "lab", "lab.css"))}
</style>
</head>
<body>
<div class="deck-viewport"><div class="deck-stage" id="deckStage"><div id="ov"></div><div id="hud"></div></div></div>
<script>/* === anime.js 4.5 (MIT) === */
{rd(os.path.join(REPO, "topic12", "build", "vendor", "anime.umd.min.js"))}</script>
<script>/* === СУРЕТТЕР (x ≠ 0 3D рендерлері) === */
window.COMBO_IMG = {json.dumps(imgs)};
window.LAB_DATA = {json.dumps(data, ensure_ascii=False)};</script>
<script>/* === КОМБОЛАР === */
{rd(os.path.join(HERE, "lab", "combos.js"))}</script>
<script>/* === БАСҚАРУ === */
{rd(os.path.join(HERE, "lab", "lab.js"))}</script>
</body>
</html>'''
    p = os.path.join(HERE, "combo-lab.html"); open(p, "w", encoding="utf-8").write(out)
    print(p, round(len(out.encode()) / 1e6, 2), "MB", len(data["combos"]), "combos")

if __name__ == "__main__":
    build()
