# Комбо каталогы

**28 комбо** және **12 ауысу**. Әр комбо — бір слайдта бірнеше қозғалыстың бір мезетте жүруі. Барлығы anime.js 4.5-пен жазылған, [lab/combos.js](lab/combos.js) файлында. Тірі көрсетілімі — [combo-lab.html](combo-lab.html).

## Қалай қолдану

```html
<script src="anime.umd.min.js"></script>
<script src="ideas/lab/combos.js"></script>
<div id="slide" style="position:relative;width:1920px;height:1080px"></div>
<script>
  window.COMBO_IMG = {cls: 'img/cls.jpg', ext: 'img/ext.jpg'};   // суреттер (міндетті емес)
  const c = Combos.knockoutZoom(document.getElementById('slide'), {word: 'x≠0'});
  // слайдтан кеткенде: c.destroy();
</script>
```

Әр комбо контейнердің ішін өзі құрады және `{tl, destroy}` қайтарады. Опциялар (мәтін, сурет, түстер) комбоның басында көрсетілген.

## Мазмұны

| # | Комбо | Санат | Шабыт |
|---|---|---|---|
| 1 | [Мәтін-терезе → әріптің ішіне зум](#knockoutzoom) | Мәтін | Jacobppt · CHINA |
| 2 | [Тереңдік қабаттары](#parallaxdepth) | Фон | fastppt_ · Blueberry Morph |
| 3 | [Бетбелгі-аккордеон](#accordiontabs) | Навигация | PowerPoint School · бетбелгілер |
| 4 | [Ұяшықты маска](#mosaicmask) | Сурет | The PowerPoint Guy · Tigers |
| 5 | [Санауыш-барабан](#odometer) | Сан | Tony PowerPoint · Numbers animation |
| 6 | [Хаб: шеңберден ішке кіру](#hubzoom) | Навигация | One Skill PPT · Slide Zoom |
| 7 | [Айналмалы дөңгелек](#wheelmenu) | Навигация | Luis Urrutia · Pumpkins wheel |
| 8 | [Ұшақ ұшып өтеді](#flyby) | Физика | Mix Slides · First World War |
| 9 | [Кесте-витраж](#gridreveal) | Сурет | Luis Urrutia · Table trick |
| 10 | [Қиғаш жолақтар](#diagonalstripes) | Сурет | Luis Urrutia · Viral PPTs |
| 11 | [Кино атмосферасы](#cinematicclouds) | Фон | Luis Urrutia · Roman Empire (before/after) |
| 12 | [Уақыт сызығы](#timelinedot) | Сызба | Leila Gharani · 3 Morph effects |
| 13 | [Жыртылған қағаз](#tornpaper) | Физика | Mix Slides · First World War |
| 14 | [Сурет рамасының ішіне](#framezoom) | Навигация | Yerassyl · Van Gogh |
| 15 | [Пішіннің өзгеруі](#shapemorph) | Сызба | Біздің комбо |
| 16 | [Орбита](#orbitsystem) | Фон | Біздің комбо |
| 17 | [Жарылыс → жиналу](#explodeassemble) | Мәтін | Біздің комбо |
| 18 | [Әріптер сарқырамасы](#textcascade) | Мәтін | Біздің комбо |
| 19 | [Секіріп түсу](#squashdrop) | Физика | Біздің комбо |
| 20 | [Аударылатын карталар](#flipcardsshine) | Сурет | Біздің комбо |
| 21 | [Глитч](#glitchtitle) | Мәтін | Біздің комбо |
| 22 | [Толқын](#rippleshockwave) | Фон | Біздің комбо |
| 23 | [Сан түзуіндегі секірістер](#numberlinehops) | Сызба | Біздің комбо |
| 24 | [Диаграмма + қайта тізу](#barschart) | Сан | Біздің комбо |
| 25 | [Сұйық фон](#liquidblobs) | Фон | Біздің комбо |
| 26 | [Конвейер + санауыш](#conveyorcounter) | Сан | Canva · Match & Move |
| 27 | [Прожектор](#spotlightcrop) | Сурет | Leila Gharani · Morph & Crop |
| 28 | [Контур → суретпен толу](#textmaskfill) | Мәтін | Luis Urrutia · VAN GOGH |

<a id="knockoutzoom"></a>
## 1. Мәтін-терезе → әріптің ішіне зум

`Combos.knockoutZoom(host, opts)` · санаты: **Мәтін**

**Бір мезетте қозғалады:**

- әріптер төменнен көтеріледі
- фон баяу кішірейеді (Ken Burns)
- панель әріптің сызығына 70× үлкейеді
- тақырып бұлыңғырдан шығады

**anime.js:** splitText, SVG mask, createTimeline, stagger

**Шабыт:** [Jacobppt · CHINA](https://www.youtube.com/watch?v=6XCrMQea2Y0) — 18 млн қаралым; [Slides by Sander · ROME](https://www.youtube.com/watch?v=fBp2iSx4RlY) — 9,5 млн қаралым; [The PowerPoint Guy · DUBAI](https://www.instagram.com/reel/Cwk3mvkBhgo/) — 57,6 мың ♥

**Қайда қолдану:** Мұқабадан бірінші слайдқа «кіру», басты сөзден сабаққа өту

**PowerPoint-те:** Тіктөртбұрыш + мәтін → Merge Shapes · Subtract. Слайдты көшіріп, тіктөртбұрышты 30–50 есе үлкейтіңіз. Ауысу — Morph.

<a id="parallaxdepth"></a>
## 2. Тереңдік қабаттары

`Combos.parallaxDepth(host, opts)` · санаты: **Фон**

**Бір мезетте қозғалады:**

- үш қабат әр жылдамдықпен қалқиды
- жақын нысан үлкен әрі бұлыңғыр (DOF)
- камера тербеліп параллакс береді
- кіріспеде камера алыстайды

**anime.js:** createTimer, animate · alternate loop, stagger · from random

**Шабыт:** [fastppt_ · Blueberry Morph](https://www.youtube.com/watch?v=mO7yyvJDDEU) — 34,7 млн қаралым · 2 млн ♥

**Қайда қолдану:** Бөлімнің басы, ой салатын слайдтар, мұқаба фоны

**PowerPoint-те:** PNG нысандардың көшірмелері. Үлкендеріне Picture Format · Artistic Effects · Blur. Топтарды келесі слайдта әртүрлі қашықтыққа жылжытыңыз. Ауысу — Morph.

<a id="accordiontabs"></a>
## 3. Бетбелгі-аккордеон

`Combos.accordionTabs(host, opts)` · санаты: **Навигация**

**Бір мезетте қозғалады:**

- белсенді панель кеңейеді, қалғаны тарылады
- бетбелгі жазуы −90°-тан түзеледі
- мазмұн кезекпен фокусқа түседі
- сурет clip-path арқылы ашылады

**anime.js:** createTimeline, createTimer · onLoop, clipPath, stagger

**Шабыт:** [PowerPoint School · бетбелгілер](https://www.youtube.com/watch?v=Vn_bR1AlV-s) — 12,6 млн қаралым; [Slides by Sander · A-B-C-D](https://www.youtube.com/watch?v=BJ4ePOMaL6o) — 9,9 млн қаралым; [Luis Urrutia · Brazil](https://www.instagram.com/reel/CowxXpSvIoE/) — 371,9 мың ♥

**Қайда қолдану:** Жоспар, бөлімдердің мазмұны, төрт қадам

**PowerPoint-те:** Түрлі түсті тіктөртбұрыштар тобы. Әр слайдта бір панель кең болады. Ауысу — Morph.

<a id="mosaicmask"></a>
## 4. Ұяшықты маска

`Combos.mosaicMask(host, opts)` · санаты: **Сурет**

**Бір мезетте қозғалады:**

- ұяшықтар ортадан серіппемен шығады
- сурет ұяшықтардың артында жылжиды
- жарық толқыны солдан оңға өтеді

**anime.js:** CSS айнымалысын анимациялау, spring, stagger · қашықтық бойынша

**Шабыт:** [The PowerPoint Guy · Tigers](https://www.instagram.com/reel/CuUv7EiLeWN/) — 216 мың ♥; [Luis Urrutia · Pop culture](https://www.instagram.com/reel/DBV0qVwPmrJ/) — 10 мың ♥

**Қайда қолдану:** Бөлім мұқабасы, видео немесе сурет фрагменттері

**PowerPoint-те:** Алтыбұрыштар торы + тіктөртбұрыш → Subtract. Артына видео қойыңыз. Ауысу — Morph.

<a id="odometer"></a>
## 5. Санауыш-барабан

`Combos.odometer(host, opts)` · санаты: **Сан**

**Бір мезетте қозғалады:**

- әр цифр бағаны өз жылдамдығымен айналады
- айналғанда бұлыңғырланады
- жазу шифрдан ашылады
- фон ауысып, уақыт сызығы толады

**anime.js:** keyframes, scrambleText, createTimer

**Шабыт:** [Tony PowerPoint · Numbers animation](https://www.youtube.com/watch?v=uHGtf4NFSWA) — 6 млн қаралым; [Canva · санауыш](https://www.instagram.com/reel/CyLO-OYPqiD/) — 1,3 мың ♥

**Қайда қолдану:** Жылдар, статистика («237 мыңнан астам бала»)

**PowerPoint-те:** 0–9 цифр бағаналары + маска-тіктөртбұрыштар. Келесі слайдта бағаналарды жылжытыңыз. Ауысу — Morph.

<a id="hubzoom"></a>
## 6. Хаб: шеңберден ішке кіру

`Combos.hubZoom(host, opts)` · санаты: **Навигация**

**Бір мезетте қозғалады:**

- шеңбер экранды толтырады (clip-path)
- ішіндегі сурет кішірейіп «кіргізеді»
- басқа түйіндер бұлыңғырланады
- қайтқанда түйін белгіленеді

**anime.js:** createTimeline · onUpdate, spring, strokeDashoffset

**Шабыт:** [One Skill PPT · Slide Zoom](https://www.youtube.com/watch?v=eog6CwB5wUs) — 6,8 млн қаралым

**Қайда қолдану:** Интерактивті мазмұн, бөлімге кіріп-шығу

**PowerPoint-те:** Insert · Zoom · Summary Zoom немесе Section Zoom. Балама: Morph + шеңбер маскасы.

<a id="wheelmenu"></a>
## 7. Айналмалы дөңгелек

`Combos.wheelMenu(host, opts)` · санаты: **Навигация**

**Бір мезетте қозғалады:**

- сақина outBack-пен айналады
- белгішелер кері айналып тік тұрады
- белсенді сегмент шығып, боялады
- ортадағы сурет пен тақырып ауысады

**anime.js:** SVG transform-origin, createTimeline, splitText

**Шабыт:** [Luis Urrutia · Pumpkins wheel](https://www.instagram.com/reel/DA8J1K1vFK_/) — 48 мың ♥

**Қайда қолдану:** Бөлімдер мәзірі, төрт амал, циклдік процесс

**PowerPoint-те:** Block Arc сегменттерінің тобы. Әр слайдта топты 60°-қа бұрыңыз. Ауысу — Morph.

<a id="flyby"></a>
## 8. Ұшақ ұшып өтеді

`Combos.flyby(host, opts)` · санаты: **Физика**

**Бір мезетте қозғалады:**

- қисық жолмен ұшып, бағытқа бұрылады
- жақындағанда үлкейеді
- бұрылыста қанаты қысылады
- артынан із сызылады, бұлттар жылжиды

**anime.js:** svg.createMotionPath, svg.createDrawable, createTimer

**Шабыт:** [Mix Slides · First World War](https://www.instagram.com/reel/Dd8SU_DArOK/) — 1,95 млн ♥; [The PowerPoint Guy · 3D airplane](https://www.instagram.com/reel/C_LGiAIAnE-/) — 33,3 мың ♥

**Қайда қолдану:** Тарих, саяхат, «идея келді» сәті

**PowerPoint-те:** 3D модель немесе PNG. Motion Paths · Custom Path, ұшып кіріп-шығу үшін Morph.

<a id="gridreveal"></a>
## 9. Кесте-витраж

`Combos.gridReveal(host, opts)` · санаты: **Сурет**

**Бір мезетте қозғалады:**

- тақтайшалар диагональ толқынмен аударылады
- сурет кішірейіп ашылады
- қалған ұяшықтар мәтін қорабына айналады
- кейбір тақтайшалар «тыныс алады»

**anime.js:** rotateX + translateZ, stagger · өз кідірісі, scrambleText, utils.shuffle

**Шабыт:** [Luis Urrutia · Table trick](https://www.youtube.com/watch?v=eldhDbYBDoE) — 15,6 млн қаралым; [Luis Urrutia · Table (reel)](https://www.instagram.com/reel/CxpzS5dBQG7/) — 134,5 мың ♥

**Қайда қолдану:** Фото + қысқа тұжырым

**PowerPoint-те:** Ақ шекаралы кесте, артында сурет. Кейбір ұяшықтарды ақ түспен толтырыңыз.

<a id="diagonalstripes"></a>
## 10. Қиғаш жолақтар

`Combos.diagonalStripes(host, opts)` · санаты: **Сурет**

**Бір мезетте қозғалады:**

- жолақтар жоғарыдан/төменнен сырғиды
- ішіндегі сурет қарсы бағытта жылжиды
- бір жолақ кезекпен кеңейеді
- тақырып қиғаштан түзеледі

**anime.js:** skewX, createTimeline, splitText

**Шабыт:** [Luis Urrutia · Viral PPTs](https://www.youtube.com/watch?v=T3gf6MlkcbE) — 4,8 млн қаралым

**Қайда қолдану:** Галерея, 3–4 мысалды салыстыру

**PowerPoint-те:** Параллелограмдар + Picture fill. Ауысу — Morph.

<a id="cinematicclouds"></a>
## 11. Кино атмосферасы

`Combos.cinematicClouds(host, opts)` · санаты: **Фон**

**Бір мезетте қозғалады:**

- фон баяу жақындайды (Ken Burns)
- үш бұлт қабаты әр жылдамдықпен өтеді
- күн сәулелері айналады
- тақырып әріп аралығы қысылып фокусталады
- виньетка тыныс алады

**anime.js:** createTimer, alternate loop, splitText · stagger from center

**Шабыт:** [Luis Urrutia · Roman Empire (before/after)](https://www.youtube.com/watch?v=XiNlmV01ow4) — 14 млн қаралым; [Luis Urrutia · Cinematic presentations](https://www.youtube.com/watch?v=aQlTPUvVH5E) — 3,2 млн қаралым

**Қайда қолдану:** Мұқаба, тарихи кіріспе, қорытынды

**PowerPoint-те:** Бұлт PNG-лерін екі жаққа жылжытыңыз (Morph). Мәтінге Fade + Zoom қосыңыз.

<a id="timelinedot"></a>
## 12. Уақыт сызығы

`Combos.timelineDot(host, opts)` · санаты: **Сызба**

**Бір мезетте қозғалады:**

- нүкте келесі жылға жылжиды, сызық толады
- камера нүктенің артынан жүреді
- жыл санап өседі (фонда да)
- карточка шығады, алдыңғысы күңгірттенеді

**anime.js:** createTimeline, spring, onUpdate · санау

**Шабыт:** [Leila Gharani · 3 Morph effects](https://www.youtube.com/watch?v=nzH4KPz_cIs) — 6,8 млн қаралым

**Қайда қолдану:** Тарих, ғалымдар, UDL нұсқалары

**PowerPoint-те:** Сызық + нүкте. Әр слайдта нүкте келесі жылда тұрады. Ауысу — Morph.

<a id="tornpaper"></a>
## 13. Жыртылған қағаз

`Combos.tornPaper(host, opts)` · санаты: **Физика**

**Бір мезетте қозғалады:**

- қағаз дірілдеп, екіге жыртылады
- карточкалар түсіп секіреді
- мөр «соғылады»
- экран сілкініп, шаң шашырайды

**anime.js:** keyframes, outBounce, utils.random

**Шабыт:** [Mix Slides · First World War](https://www.instagram.com/reel/Dd8SU_DArOK/) — 1,95 млн ♥

**Қайда қолдану:** «Ескі түсінікті жыртамыз»: мәселеден шешімге өту

**PowerPoint-те:** Жыртық жиегі үшін Freeform пішіндер. Fly Out + Bounce, мөрге Grow/Shrink.

<a id="framezoom"></a>
## 14. Сурет рамасының ішіне

`Combos.frameZoom(host, opts)` · санаты: **Навигация**

**Бір мезетте қозғалады:**

- камера галерея бойымен жылжиды (3D)
- прожектор жыпылықтап жанады
- камера рамаға кіреді, сурет толық экранға шығады
- тақырып шығып, кері шегінеді

**anime.js:** onUpdate · камера матрицасы, perspective + rotateY, createTimer

**Шабыт:** [Yerassyl · Van Gogh](https://www.instagram.com/reel/Dfw2CYuoX3f/) — 32,7 мың ♥

**Қайда қолдану:** Портреттер, мысалдар галереясы

**PowerPoint-те:** Рамалы суреттер. Келесі слайдта бір рамаға дейін масштабтаңыз. Ауысу — Morph.

<a id="shapemorph"></a>
## 15. Пішіннің өзгеруі

`Combos.shapeMorph(host, opts)` · санаты: **Сызба**

**Бір мезетте қозғалады:**

- шеңбер → үшбұрыш → шаршы → жұлдыз
- бірге айналып, түсі өзгереді
- «тыныс» масштабы мен көлеңке
- атауы шифрдан ашылады

**anime.js:** svg.morphTo, scrambleText, keyframes

**Шабыт:** Біздің комбо — x ≠ 0: үш автордың фигурасы

**Қайда қолдану:** Ұғымның бір күйден екіншісіне өтуі

**PowerPoint-те:** Morph · Objects. Пішіндерді Edit Points арқылы бірдей нүкте санымен салыңыз.

<a id="orbitsystem"></a>
## 16. Орбита

`Combos.orbitSystem(host, opts)` · санаты: **Фон**

**Бір мезетте қозғалады:**

- үш сақина әр бағытта айналады
- планеталар кері айналып, камераға қарайды
- еңкею бұрышы тербеледі
- орталық жарқырап тыныс алады

**anime.js:** perspective + preserve-3d, createTimer, spring

**Шабыт:** Біздің комбо — үш автор — үш орбита

**Қайда қолдану:** Команда, жүйе, бір мақсат айналасындағы бөліктер

**PowerPoint-те:** Сопақ орбиталар + Spin анимациясы (бірнеше нысан бірге).

<a id="explodeassemble"></a>
## 17. Жарылыс → жиналу

`Combos.explodeAssemble(host, opts)` · санаты: **Мәтін**

**Бір мезетте қозғалады:**

- ~400 бөлшек мәтінге жиналады
- толқын бойымен тыныс алады
- жарылып, құлайды
- қайта жиналады

**anime.js:** Canvas · getImageData, stagger · from random, keyframes

**Шабыт:** Біздің комбо

**Қайда қолдану:** Негізгі сөзді ашу, қорытынды

**PowerPoint-те:** Ұсақ пішіндер + Morph: шашыраңқы күйден жиналған күйге.

<a id="textcascade"></a>
## 18. Әріптер сарқырамасы

`Combos.textCascade(host, opts)` · санаты: **Мәтін**

**Бір мезетте қозғалады:**

- әр әріп: 3D бұрылу + көтерілу + фокус + түс + өлшем
- маркер сөздің артынан жүгіреді
- асты қолмен сызылады
- сөз толқынмен секіреді

**anime.js:** splitText · chars, svg.createDrawable, stagger

**Шабыт:** Біздің комбо

**Қайда қолдану:** Тақырып, басты ой, дәйексөз

**PowerPoint-те:** Effect Options · By Letter + Rise Up немесе Float In. Маркер үшін Wipe.

<a id="squashdrop"></a>
## 19. Секіріп түсу

`Combos.squashDrop(host, opts)` · санаты: **Физика**

**Бір мезетте қозғалады:**

- карточкалар еркін түседі
- соқтығысқанда қысылып-созылады
- секіріп тынады, көлеңке бірге өзгереді
- «12» айналып ортаға секіреді

**anime.js:** әр қасиетке keyframes, outElastic, createTimeline · loop

**Шабыт:** Біздің комбо — 7 + 5 = 12

**Қайда қолдану:** Есептің жауабын «түсіру», ойын элементі

**PowerPoint-те:** Fly In + Bounce End. Қысылу үшін Grow/Shrink.

<a id="flipcardsshine"></a>
## 20. Аударылатын карталар

`Combos.flipCardsShine(host, opts)` · санаты: **Сурет**

**Бір мезетте қозғалады:**

- карталар толқынмен 3D аударылады
- аударылғанда көтеріледі
- артқы бетінен жылтыр өтеді
- қалқып, кері толқынмен жабылады

**anime.js:** rotateY + backface-visibility, stagger · grid, keyframes

**Шабыт:** Біздің комбо

**Қайда қолдану:** Сұрақ-жауап, викторина, ашылатын мысалдар

**PowerPoint-те:** Екі пішін + Morph (Width → 0) немесе Flip ауысуы.

<a id="glitchtitle"></a>
## 21. Глитч

`Combos.glitchTitle(host, opts)` · санаты: **Мәтін**

**Бір мезетте қозғалады:**

- қызыл/жасыл көшірмелер ажырайды
- мәтін жолақтарға бөлініп секіреді
- қиғашталу, жыпылықтау
- код «x ≠ 0 · OK»-қа айналады

**anime.js:** steps() easing, keyframes, scrambleText

**Шабыт:** Біздің комбо

**Қайда қолдану:** «Қате түсінік» → дұрыс жауап

**PowerPoint-те:** Мәтін көшірмелері + Flicker, Teeter анимациялары.

<a id="rippleshockwave"></a>
## 22. Толқын

`Combos.rippleShockwave(host, opts)` · санаты: **Фон**

**Бір мезетте қозғалады:**

- сақиналар нүктеден таралады
- нүктелер қашықтыққа қарай ығысады
- серпімді қайтып, жарқ етеді
- тақырып соққыдан шайқалады

**anime.js:** stagger · қашықтық бойынша, outElastic, keyframes

**Шабыт:** Біздің комбо — x ≠ 0: «Он екі!» дыбыс толқыны

**Қайда қолдану:** Дыбыс, әсер, «хабар тарады»

**PowerPoint-те:** Шеңберлерге Grow & Turn, Pulse. Нүктелерге Wave.

<a id="numberlinehops"></a>
## 23. Сан түзуіндегі секірістер

`Combos.numberLineHops(host, opts)` · санаты: **Сызба**

**Бір мезетте қозғалады:**

- сан түзуі мен бөліктері сызылады
- доп доғамен секіреді, доға бірге сызылады
- қонғанда доп қысылады, сан жарқырайды
- теңдеу серіппемен шығады

**anime.js:** svg.createDrawable, svg.createMotionPath, spring

**Шабыт:** Біздің комбо — x ≠ 0: 7-ден 12-ге

**Қайда қолдану:** Математика: қосу, азайту, сан түзуі

**PowerPoint-те:** Доғаларға Wipe, допқа Motion Path · Arcs.

<a id="barschart"></a>
## 24. Диаграмма + қайта тізу

`Combos.barsChart(host, opts)` · санаты: **Сан**

**Бір мезетте қозғалады:**

- бағандар серіппемен өседі, сандар санайды
- тренд сызығы сызылып, нүкте жүреді
- бағандар FLIP арқылы орын ауыстырады
- сызық жаңа ретпен қайта сызылады

**anime.js:** createLayout (FLIP = HTML-дегі Morph), spring, createMotionPath

**Шабыт:** Біздің комбо

**Қайда қолдану:** Салыстыру, рейтинг

**PowerPoint-те:** Morph: бағандардың биіктігі мен ретін өзгертіңіз.

<a id="liquidblobs"></a>
## 25. Сұйық фон

`Combos.liquidBlobs(host, opts)` · санаты: **Фон**

**Бір мезетте қозғалады:**

- төрт дақ Лиссажу траекториясымен жүреді
- дақтардың пішіні ағады
- реңі баяу ауысады
- шыны карточкадағы градиент жылжиды

**anime.js:** createTimer, borderRadius keyframes, hue-rotate

**Шабыт:** Біздің комбо

**Қайда қолдану:** Мұқаба, бөлім аралық слайд

**PowerPoint-те:** Бұлыңғыр шеңберлер + Morph. Шыны әсері үшін мөлдір пішін.

<a id="conveyorcounter"></a>
## 26. Конвейер + санауыш

`Combos.conveyorCounter(host, opts)` · санаты: **Сан**

**Бір мезетте қозғалады:**

- сурет таспасы келесі карточкаға жылжиды
- карточкалар қашықтыққа қарай кішірейеді (fisheye)
- санауыш таспамен бірге айналады
- жазу шифрдан ашылады

**anime.js:** onUpdate · әр кадр, odometer + scrambleText

**Шабыт:** [Canva · Match & Move](https://www.instagram.com/reel/CyLO-OYPqiD/) — 1,3 мың ♥

**Қайда қолдану:** Статистика + мысал суреттер

**PowerPoint-те:** Таспа тобы + маска. Ауысу — Morph.

<a id="spotlightcrop"></a>
## 27. Прожектор

`Combos.spotlightCrop(host, opts)` · санаты: **Сурет**

**Бір мезетте қозғалады:**

- түсті шеңбер сұр фотода адамнан адамға көшеді
- жолда кішірейіп, қайта үлкейеді
- сақина кешігіп, серпіледі
- аты-жөні карточкасы шығады

**anime.js:** clip-path circle · onUpdate, outElastic, scrambleText

**Шабыт:** [Leila Gharani · Morph & Crop](https://www.youtube.com/watch?v=nzH4KPz_cIs) — 6,8 млн қаралым

**Қайда қолдану:** Кейіпкерлер, команда, сурет детальдары

**PowerPoint-те:** Сұр фото + шеңберге кесілген түсті көшірме. Ауысу — Morph.

<a id="textmaskfill"></a>
## 28. Контур → суретпен толу

`Combos.textMaskFill(host, opts)` · санаты: **Мәтін**

**Бір мезетте қозғалады:**

- мәтін контуры сызылады
- әріп аралығы қысылады
- сурет төменнен толтырады
- сурет әріп ішінде жылжиды

**anime.js:** strokeDashoffset, SVG pattern + clipPath, атрибут анимациясы

**Шабыт:** [Luis Urrutia · VAN GOGH](https://www.youtube.com/watch?v=MkMtfLZ7IFE) — 16,2 млн қаралым; [The PowerPoint Guy · NATURE](https://www.instagram.com/reel/CneqAPDBN38/) — 81,6 мың ♥

**Қайда қолдану:** Тақырыптық сөз, тарау атауы

**PowerPoint-те:** Мәтін + сурет (немесе видео) → Merge Shapes · Intersect.

## Слайд ауысулары

Зертханада әр слайд келесісіне осы 12 ауысудың бірімен өтеді (кезекпен, әрқайсысы 2–3 рет).

| Ауысу | Не болады |
|---|---|
| Жолақтар (`stripes`) | 6 түрлі түсті жолақ кезекпен жабады да, екінші жақтан ашады |
| Ирис (`iris`) | жаңа слайд шеңбер ішінен ашылады, ескісі кішірейеді |
| Итеру + параллакс (`push`) | ескі слайд солға кетеді, жаңасы оңнан келеді, ішкі қабаты жылдамырақ |
| Зум арқылы (`zoomThrough`) | ескі слайд үлкейіп еріп кетеді, жаңасы алыстан жақындайды |
| Текше (`cube`) | екі слайд 3D текшенің екі беті сияқты бұрылады |
| Шымылдық (`curtain`) | жоғарғы және төменгі жартылар жабылып, ашылады |
| Қиғаш перде (`diagonal`) | қиғаш панель экранды кесіп өтеді |
| Тамшы (`blob`) | жаңа слайд органикалық дақ ішінен өседі |
| Плиткалар (`tiles`) | 32 плитка кездейсоқ ретпен жабылып, ашылады |
| Глитч-кесу (`glitch`) | ескі слайд түске бөлініп, жолақтанып, жаңасына кеседі |
| Аудару (`flip`) | ескі слайд артқа құлайды, жаңасы алдыға көтеріледі |
| Нүкте-морф (`dot`) | бір нүкте экранды толтырып, жаңа слайдқа айналады |
