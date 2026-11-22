# -*- coding: utf-8 -*-
"""ideas/data/*.json → RESEARCH.md, COMBOS.md, LIBRARIES.md (жалғыз дерек көзі — data/ папкасы).
Іске қосу: python3 ideas/gen_docs.py
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda n: json.load(open(os.path.join(HERE, "data", n), encoding="utf-8"))
V, C = J("videos.json"), J("combos.json")
CN = {c["key"]: c["title"] for c in C["combos"]}
def num(n):
    if n is None: return "—"
    return f"{n / 1e6:.1f} млн".replace(".", ",") if n >= 1e6 else f"{n / 1e3:.1f} мың".replace(".", ",") if n >= 1e3 else str(n)
def mmss(s): return f"{int(s) // 60}:{int(s) % 60:02d}" if s else "—"
def date(d): return f"{d[6:8]}.{d[4:6]}.{d[:4]}" if d else "—"
combo_links = lambda keys: ", ".join(f"[{CN[k]}](COMBOS.md#{k.lower()})" for k in keys) or "—"

def research():
    L = ["# Презентация анимациясы: не вирусқа айналды және неге", "",
         f"Жиналған күні: {date(V['collected'].replace('-', ''))}. Барлығы **{len(V['youtube'])} YouTube видео** және **{len(V['instagram'])} Instagram reel** қаралды.", "",
         "## Қалай жиналды", "",
         f"- **YouTube.** {V['method']['youtube']}",
         f"- **Instagram.** {V['method']['instagram']}",
         "- **Сандар.** Қаралым мен лайк — жиналған күнгі мән. Instagram қаралым санын тіркелусіз бермейді, сондықтан reels лайк бойынша реттелген.",
         "- **Авторлық құқық.** Видео кадрлары репозиторийге салынбады: тек сілтеме мен тәсілдің сипаттамасы бар. Комболар — тәсілдің өз іске асыруымыз, суреттері — x ≠ 0 презентациясының 3D рендерлері.", "",
         "## YouTube: ең көп қаралғандар", "",
         "| # | Видео | Автор | Қаралым | ♥ | Ұзақтығы | Тәсіл | Біздің комбо |", "|---|---|---|---|---|---|---|---|"]
    for i, v in enumerate(V["youtube"], 1):
        L.append(f"| {i} | [{v['title'][:60].replace('|', '/')}]({v['url']}) | {v['creator']} | {num(v['views'])} | {num(v['likes'])} | {mmss(v['duration'])} | {v['technique']} | {combo_links(v['combos'])} |")
    L += ["", "## Instagram: ең көп лайк жинағандар", "",
          "| # | Reel | Автор | ♥ | Күні | Тәсіл | Біздің комбо |", "|---|---|---|---|---|---|---|"]
    for i, v in enumerate(V["instagram"], 1):
        t = (v["title"] or "").replace("|", "/").replace("\n", " ")[:50]
        L.append(f"| {i} | [{t or v['id']}]({v['url']}) | {v['creator']} | {num(v['likes'])} | {date(v['date'])} | {v['technique']} | {combo_links(v['combos'])} |")
    L += ["", "## 12 заңдылық", "",
          "1. **Мәтін — терезе.** Алып әріптердің ішінен сурет көрінеді, келесі слайдта камера әріптің ішіне кіреді. CHINA — 18 млн, FRIDA KAHLO — 20,9 млн, VAN GOGH — 16,2 млн, ROME — 9,5 млн қаралым; DUBAI — 57,6 мың ♥, NATURE — 81,6 мың ♥. Комбо: «Мәтін-терезе», «Контур → суретпен толу».",
          "2. **Тереңдік қабаттары.** Бір нысанның көп көшірмесі: жақыны үлкен әрі бұлыңғыр, қабаттар әр жылдамдықпен жылжиды. Ең көп қаралған видео (34,7 млн) дәл осы тәсілге арналған. Комбо: «Тереңдік қабаттары», «Кино атмосферасы».",
          "3. **Бір объект — көп күй.** Барлық дерлік видеода бір нысан келесі слайдта басқа орында, өлшемде, бұрышта тұрады, ал ауысуды PowerPoint Morph өзі салады. HTML-де бұл — FLIP (anime.js `createLayout`) немесе браузердің View Transitions API-і. Комбо: «Диаграмма + қайта тізу», «Пішіннің өзгеруі».",
          "4. **Панельдер мен бетбелгілер.** Маркерлі тізімнің орнына түрлі түсті тік панельдер; біреуі ашылып, қалғаны тарылады. A-B-C-D — 9,9 млн, PowerPoint School — 12,6 млн, Brazil — 371,9 мың ♥. Комбо: «Бетбелгі-аккордеон», «Қиғаш жолақтар».",
          "5. **Маска-мозаика.** Сурет немесе видео алтыбұрыш, үшбұрыш не кесте ұяшықтары арқылы көрінеді. Tigers — 216 мың ♥, кесте тәсілі — 15,6 млн. Комбо: «Ұяшықты маска», «Кесте-витраж».",
          "6. **Камера кеңістікте жүреді.** Шеңбер-хаб, рамалы сурет, айналмалы мәзір — көрермен слайдтың «ішіне кіріп-шығады». Slide Zoom — 6,8 млн, Van Gogh — 32,7 мың ♥, дөңгелек — 48 мың ♥. Комбо: «Хаб», «Сурет рамасының ішіне», «Айналмалы дөңгелек».",
          "7. **Сандар қозғалады.** Цифр бағаналары барабан сияқты айналады, санауыш сурет таспасымен бірге жүреді (6 млн). Комбо: «Санауыш-барабан», «Конвейер + санауыш».",
          "8. **Кино атмосферасы.** Картина немесе фото фоны, бұлттар, серифті тақырып, баяу камера. «Бұрын/қазір» видеосы — 14 млн. Комбо: «Кино атмосферасы», «Уақыт сызығы».",
          "9. **Физика және оқиға.** Ұшақтар ұшады, қағаз жыртылады, жалаулар түседі. Ең көп лайк жинаған reel (1,95 млн ♥) — нақты сыныпта көрсетілген осындай презентация. Комбо: «Ұшақ ұшып өтеді», «Жыртылған қағаз», «Секіріп түсу».",
          "10. **Прожектор.** Сұр фотода бір адам түсті шеңбермен бөлінеді (6,8 млн). Комбо: «Прожектор».",
          "11. **Ілмек формуласы.** Reels-тің бәрі бір құрылыммен басталады: «Мұндай слайд жасама!» → «орнына...» → нәтиже алғашқы 1–3 секундта көрінеді. Презентацияда да алғашқы секундтарда сұрақ немесе нәтиже керек (x ≠ 0-дегі «x = 0 ?» сияқты).",
          "12. **Шектеулі палитра, жуан қаріп, сапалы фото.** 2–3 түс, жуан sans-serif немесе кинематографиялық serif қаріп, толық экранды фото. Әсер көп анимациядан емес, бір ойға бағынған бірнеше қозғалыстан шығады.", "",
          "## Қорытынды: емтихан презентациясына", "",
          "- **Ең көп қаралғаны — тереңдік, ең көп ұнағаны — сыныптағы оқиға.** Ең тиімді формула: бір оқиға + физикалық қозғалыс + Morph.",
          "- **Бір слайдқа бір «вау».** Вирустық видеолардың әрқайсысы бір ғана тәсілге құрылған. Бір слайдқа 3–5 бір мезеттегі қозғалыс жеткілікті, бірақ олардың бәрі бір мағынаға қызмет етуі керек.",
          "- **Ауысу — мағынаның жалғасы.** Әріптің ішіне кіру, рамаға кіру, шеңберге кіру — бәрі «тереңірек кіреміз» деген ойды көрсетеді.",
          "- **PowerPoint-те де болады.** Әр комбоның PowerPoint рецепті [COMBOS.md](COMBOS.md) ішінде (Merge Shapes, Morph, Zoom, Motion Path).", ""]
    return "\n".join(L)

def combos():
    L = ["# Комбо каталогы", "",
         f"**{len(C['combos'])} комбо** және **{len(C['transitions'])} ауысу**. Әр комбо — бір слайдта бірнеше қозғалыстың бір мезетте жүруі. Барлығы anime.js 4.5-пен жазылған, [lab/combos.js](lab/combos.js) файлында. Тірі көрсетілімі — [combo-lab.html](combo-lab.html).", "",
         "## Қалай қолдану", "", "```html",
         "<script src=\"anime.umd.min.js\"></script>",
         "<script src=\"ideas/lab/combos.js\"></script>",
         "<div id=\"slide\" style=\"position:relative;width:1920px;height:1080px\"></div>",
         "<script>",
         "  window.COMBO_IMG = {cls: 'img/cls.jpg', ext: 'img/ext.jpg'};   // суреттер (міндетті емес)",
         "  const c = Combos.knockoutZoom(document.getElementById('slide'), {word: 'x≠0'});",
         "  // слайдтан кеткенде: c.destroy();",
         "</script>", "```", "",
         "Әр комбо контейнердің ішін өзі құрады және `{tl, destroy}` қайтарады. Опциялар (мәтін, сурет, түстер) комбоның басында көрсетілген.", "",
         "## Мазмұны", "", "| # | Комбо | Санат | Шабыт |", "|---|---|---|---|"]
    for i, c in enumerate(C["combos"], 1):
        L.append(f"| {i} | [{c['title']}](#{c['key'].lower()}) | {c['cat']} | {c['src'][0]['t']} |")
    L.append("")
    for i, c in enumerate(C["combos"], 1):
        L += [f'<a id="{c["key"].lower()}"></a>', f"## {i}. {c['title']}", "",
              f"`Combos.{c['key']}(host, opts)` · санаты: **{c['cat']}**", "",
              "**Бір мезетте қозғалады:**", ""] + [f"- {m}" for m in c["moves"]] + ["",
              f"**anime.js:** {', '.join(c['api'])}", "",
              "**Шабыт:** " + "; ".join((f"[{s['t']}]({s['u']})" if s["u"] else s["t"]) + (f" — {s['m']}" if s["m"] else "") for s in c["src"]), "",
              f"**Қайда қолдану:** {c['use']}", "",
              f"**PowerPoint-те:** {c['ppt']}", ""]
    L += ["## Слайд ауысулары", "", "Зертханада әр слайд келесісіне осы 12 ауысудың бірімен өтеді (кезекпен, әрқайсысы 2–3 рет).", "",
          "| Ауысу | Не болады |", "|---|---|"] + [f"| {t['title']} (`{t['key']}`) | {t['how']} |" for t in C["transitions"]] + [""]
    return "\n".join(L)

GROUPS = [
    ("Негізгі анимация қозғалтқыштары", ["juliangarnier/anime", "greensock/GSAP", "motiondivision/motion", "julianshapiro/velocity", "thednp/kute.js", "mojs/mojs", "pmndrs/react-spring", "formkit/auto-animate", "animate-css/animate.css", "michalsnik/aos"]),
    ("Мәтін, сан, қолжазба", ["shshaw/Splitting", "mattboldt/typed.js", "camwiegert/baffle", "inorganik/countUp.js", "barvian/number-flow", "rough-stuff/rough-notation", "rough-stuff/rough"]),
    ("SVG және пішін морфы", ["maxwellito/vivus", "veltman/flubber"]),
    ("3D, WebGL, шейдерлер", ["mrdoob/three.js", "pixijs/pixijs", "oframe/ogl", "pmndrs/postprocessing", "paper-design/shaders", "gl-transitions/gl-transitions", "martinlaxenaire/curtainsjs", "robin-dela/hover-effect", "tengbao/vanta", "metafizzy/zdog", "sarcadass/granim.js"]),
    ("Физика және бөлшектер", ["liabru/matter-js", "tsparticles/tsparticles"]),
    ("Дизайнер құралдары (After Effects, Rive)", ["airbnb/lottie-web", "LottieFiles/dotlottie-web", "rive-app/rive-wasm", "theatre-js/theatre"]),
    ("Презентация және бет ауысулары", ["hakimel/reveal.js", "slidevjs/slidev", "barbajs/barba", "swup/swup", "darkroomengineering/lenis"]),
    ("Кодпен видео (математика үшін де)", ["3b1b/manim", "ManimCommunity/manim", "motion-canvas/motion-canvas", "remotion-dev/remotion"]),
]
def libraries():
    rows = {}
    for line in open(os.path.join(HERE, "data", "libs_stars.tsv"), encoding="utf-8"):
        p = line.rstrip("\n").split("\t")
        if len(p) >= 5 and p[1].isdigit(): rows[p[0]] = p
    L = ["# Анимация кітапханалары: GitHub шолуы", "",
         f"Деректер GitHub API-ден 22.11.2026 алынды ({len(rows)} репозиторий). Жұлдыз — танымалдық белгісі, сапа кепілі емес.", "",
         "## Біздің таңдау", "",
         "| Міндет | Не қолданамыз | Неге |", "|---|---|---|",
         "| Слайдтағы барлық қозғалыс | **anime.js 4.5** | MIT, бір файл (118 КБ), timeline, stagger, spring, SVG морф пен сызу, splitText, scrambleText, `createLayout` (FLIP) — бәрі ішінде |",
         "| 3D сахна, камера | **three.js** | x ≠ 0 сыныбы осымен салынды; MIT |",
         "| Слайд ауысуы (видео сияқты) | Өз GLSL шейдерлеріміз | gl-transitions жинағы — идея банкі |",
         "| HTML-дегі «Morph» | anime.js `createLayout` немесе View Transitions API | Chrome 111, Edge 111, Firefox 144, Safari 18 қолдайды |",
         "| Математикалық түсіндірме видео | Manim немесе Motion Canvas | кодпен формула, график, сан түзуі |", "",
         "## Ескертпелер", "",
         "- **GSAP** 2025 жылғы 30 сәуірден бастап толық тегін, SplitText пен MorphSVG плагиндері де. Бірақ лицензиясы — Webflow-дың өз келісімі (MIT емес): Webflow-ға ұқсас визуалды анимация құрастырғыштарда қолдануға шектеу бар. Дереккөз: [Webflow блогы](https://webflow.com/blog/gsap-becomes-free), [GSAP лицензиясы](https://gsap.com/community/standard-license/).",
         "- **View Transitions API** (бір бет ішінде) — браузердің өзіндегі «Morph»: `view-transition-name` бірдей элементтер күйден күйге өздігінен ауысады. Қолдау: Chrome/Edge 111, Firefox 144, Safari 18. Дереккөз: [Chrome for Developers](https://developer.chrome.com/docs/web-platform/view-transitions).",
         "- **gl-transitions** — 100-ден астам GLSL ауысу; әр ауысудың лицензиясы өз файлында (GitHub жалпы лицензияны анықтамайды), көшіргенде тексеріңіз.",
         "- **Manim** — 3Blue1Brown-ның математикалық видео қозғалтқышы (96,8 мың ★). Математика мұғалімдеріне тікелей пайдалы.", ""]
    for g, repos in GROUPS:
        L += [f"## {g}", "", "| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |", "|---|---|---|---|---|"]
        for r in sorted([r for r in repos if r in rows], key=lambda r: -int(rows[r][1])):
            p = rows[r]; lic = p[2] if p[2] not in ("-", "NOASSERTION") else "өз лицензиясы"
            L.append(f"| [{r}](https://github.com/{r}) | {int(p[1]):,} | {lic} | {p[3]} | {p[4].replace('|', '/')} |".replace(",", " "))
        L.append("")
    return "\n".join(L)

if __name__ == "__main__":
    for name, fn in (("RESEARCH.md", research), ("COMBOS.md", combos), ("LIBRARIES.md", libraries)):
        open(os.path.join(HERE, name), "w", encoding="utf-8").write(fn()); print(name)
