# -*- coding: utf-8 -*-
"""content.py → geo/build/speakers.json (DOCX үшін) және geo/SCENARIO.md (сценарий: кім, қай жерде, не айтады).
Уақыт: 100 сөз/мин (қорғаудағы сабырлы қарқын) + ремаркадағы «N секунд» кідірістер + ауысу уақыты.
Іске қосу: python3 geo/build/gen_docs.py
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
import content as C

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
TRD = {"dawn": 4.2, "orbit": 3.4, "rack": 2.2, "wedge": 3.6, "dive": 2.6, "whip": 1.15, "vertigo": 2.8, "plunge": 2.8, "craneup": 3.0, "lift": 2.6,
       "pullback": 3.6, "cloudpunch": 2.6, "ripple": 1.7, "fault": 2.2, "liquid": 2.1, "steam": 2.3, "flare": 2.2, "bloom": 2.6, "drycrack": 2.6}
WPM = 100
SHOT = {
    "cover": "Ғарыштағы Жер: қараңғыдан Күн шығады, түнгі қалалар жарқырайды",
    "hook": "Жер шары, Қазақстан алтын шекарамен жанады; төрт қабық белгісі оны айналады",
    "shells": "Жер шары баяу айналады; оң жақта төрт карта аударылады",
    "cut": "Жердің сегізден бір бөлігі суырылып ұшып кетеді — қыртыс, мантия, сыртқы және ішкі ядро көрінеді",
    "cutedge": "Кесіктің жиегі жақыннан: литосфера жолағы жарқырайды",
    "plates": "Жер шарында тақта шекаралары жанады (қызыл — субдукция)",
    "volcano": "Диорама: мұхит тақтасы материк астына сүңгиді, магма ошағы, жанартау қимасы",
    "quake": "Диорама қимасы: ошақтан сейсмикалық толқындар тарайды, жер бетінде шеңберлер",
    "cliff": "Қыртыс қимасы жақыннан: шөгінді қабаттар, гранит, базальт; шыны ыдыста бөлшектер шөгеді",
    "coast": "Мұхит жағалауы; тамшы суға түсіп, толқын тарайды",
    "aqua": "Су бағанының қимасы; 100 литрлік ыдыс төрт ыдысқа бөлінеді",
    "ocean": "Су асты: балықтар, түп, жарық сәулелері",
    "cycle": "Бүкіл диорама: бу көтеріледі, бұлт жылжиды, тауда жаңбыр, жер астында су ағады; тамшы айналымды кезіп шығады",
    "mountain": "Тау, мұздық, өзен басы, жаңбыр",
    "sky": "Даладан аспанға қарау: бұлттар, құстар",
    "tropo": "Камера тік көтеріледі: бұлттар төменде қалады, ұшақ өтеді; биіктік пен температура есептегіші",
    "upper": "Камера стратосферадан жоғары: озон, метеорлар, поляр шұғыласы, ХҒС",
    "ozone": "Ғарыштан: Жердің жиегіндегі жіңішке көгілдір сызық, озон қабаты ультракүлгін сәулені ұстайды",
    "bio": "Жер шарында тіршілік толқыны Қазақстаннан тарайды",
    "life": "Дала: киік табыны, орман, көл, құстар",
    "zones": "Тау беткейі: биіктік белдеулері кезекпен жанады",
    "soil": "Топырақ қимасы жақыннан: тамырлар, тастар, тіршілік",
    "whole": "Бүкіл диорама; төрт қабық белгісі Венн диаграммасына жиналады",
    "aral": "Көл біртіндеп тартылып, түбі тұзға айналады, шаң көтеріледі",
    "answer": "Төбеде тұрған екі бала («сіз»), камера оларды айналады",
    "final": "Камера аспанға көтеріліп, бүкіл әлем кішкентай аралдай көрінеді; титрлар",
}


def words(t): return len(re.sub(r"\[[^\]]*\]", " ", t).split())


def pauses(t): return sum(int(m) for m in re.findall(r"(\d+)\s*секунд", " ".join(re.findall(r"\[[^\]]*\]", t))))


def seg_secs(t): return round(words(t) / WPM * 60 + pauses(t))


def main():
    names = {k: a["name"] for k, a in C.AUTHORS.items()}; names["all"] = "Бәрі бірге"
    out = {"title": C.TITLE, "subtitle": C.SUBTITLE, "hook": C.HOOK, "answer": C.ANSWER, "role": C.ROLE_ALL, "wpm": WPM,
           "authors": {k: {**a, "color": C.SPHERES[a["sphere"]]["color"]} for k, a in C.AUTHORS.items()},
           "acts": C.ACTS, "transitions": {k: {"name": v[0], "what": v[1], "how": v[2]} for k, v in C.TRANSITIONS.items()}, "slides": []}
    total = 0
    for s in C.S:
        segs = [{"who": w, "text": t, "secs": seg_secs(t)} for w, t in s["say"]]
        sec = sum(x["secs"] for x in segs) + round(TRD[s["tr"]] * .5)
        total += sec
        out["slides"].append({"id": s["id"], "act": C.ACTS[s["act"]], "title": s["title"], "kicker": s.get("kicker", ""), "shot": SHOT[s["shot"]],
                              "tr": C.TRANSITIONS[s["tr"]][0], "tr_key": s["tr"], "segs": segs, "secs": sec,
                              "words": sum(words(x["text"]) for x in segs)})
    out["total_secs"] = total
    json.dump(out, open(os.path.join(HERE, "speakers.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # --- SCENARIO.md ---
    mmss = lambda t: f"{t // 60}:{t % 60:02d}"
    L = [f"# {C.TITLE} — сценарий", "", f"{C.SUBTITLE}. 26 слайд, ≈ {mmss(total)} (сөйлеу қарқыны {WPM} сөз/мин, ауысулар мен кідірістерді қоса).", "",
         f"**Басты сұрақ:** «{C.HOOK}» — 2-слайдта қойылады, 25-слайдта жауап беріледі: «{C.ANSWER}»", "",
         "**Бір идея:** төрт қабық бір-бірінсіз өмір сүрмейді. Оны бір тамшының саяхаты, бір 3D әлем және төрт қабық белгісі (слайдтан слайдқа көшетін деталь) көрсетеді.", "",
         "## Баяндамашылар", "", "| Кім | Қабығы | Слайдтар | Уақыты |", "|---|---|---|---|"]
    for k, a in C.AUTHORS.items():
        sl = [x["id"] for x in out["slides"] if any(g["who"] == k for g in x["segs"])]
        t = sum(g["secs"] for x in out["slides"] for g in x["segs"] if g["who"] == k)
        L.append(f"| {a['name']} | {a['role']} | {', '.join(map(str, sl))} | ≈ {mmss(t)} |")
    L += ["", "Аты-жөндерді `geo/build/content.py` ішінде немесе презентацияда **E** (өңдеу) режимінде ауыстырыңыз.", "", "## Слайдтар", ""]
    for x in out["slides"]:
        L.append(f"### {x['id']}. {x['title']}  ·  {x['act']}  ·  ≈ {mmss(x['secs'])}")
        L.append(f"- **Экранда (3D):** {x['shot']}")
        L.append(f"- **Ауысу:** {x['tr']} — {C.TRANSITIONS[x['tr_key']][1]}")
        for g in x["segs"]:
            L.append(f"- **{names[g['who']]}:** {g['text']}")
        L.append("")
    L += ["## Ауысулар (әр түрі ең көбі екі рет)", "", "| Ауысу | Не болады | Қалай жасалған | Слайдтар |", "|---|---|---|---|"]
    for k, (nm, what, how) in C.TRANSITIONS.items():
        ids = [str(s["id"]) for s in C.S if s["tr"] == k]
        L.append(f"| {nm} | {what} | {how} | {', '.join(ids)} |")
    open(os.path.join(ROOT, "SCENARIO.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("speakers.json, SCENARIO.md:", mmss(total), "жалпы;", sum(x["words"] for x in out["slides"]), "сөз")


if __name__ == "__main__":
    main()
