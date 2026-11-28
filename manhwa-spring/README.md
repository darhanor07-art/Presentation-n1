# Көктемнің соңғы гүлі — интерактив веб-манхва (scroll)

## Идея
Тік scroll манхва: оқырман төмен айналдырған сайын 8 сахна ауысады ([`SCENARIO.md`](SCENARIO.md)). Механика Nootturno сайтынан алынған ([`../manhwa/ANIMATION_ANALYSIS.md`](../manhwa/ANIMATION_ANALYSIS.md)): scroll-ға байланған қабаттар, параллакс, фоннан 1.6–2 есе жылдам өтетін «көз терезелері», капшондар мен көпіршіктердің өз параллаксы, жұмсақ scroll. Стилі гравюра емес, живопись: индиго/лаванда/периванкль градингі, bloom, виньетка, түйір, ай нұры, жапырақшалар мен тұман.
Әр өту сценарийге сай: ай жарқылы, жапырақша сыпыруы, тұман, тігінен жылжу, көз терезесінің толық экранға үлкеюі, сплит, ақ жарқыл.

## Файлдар
| Файл | Не істейді |
|---|---|
| `index.html` | дайын, бір файлды нұсқа (шрифт, JS, WebP base64) |
| `src/engine.js` | Canvas2D компоновщик, ассет іздеу, терезелер, жапырақшалар, тұман, өтулер, post, DOM көпіршіктер |
| `src/scenes.js` | 8 сахна: камера, қабаттар, терезелер, мәтіндер |
| `src/placeholders.js` | ассет жоқ болса, көз бен кейіпкердің салынған орынбасарлары |
| `build/build_html.py` | `assets/manifest.json` + `blender/moonlit-castle/renders` -> `index.html` |
| `build/record.js` | Playwright: `--stills` (`stills/`), `--video` (`preview.mp4`, 720×1280, 30 fps) |
| `stills/`, `preview.mp4` | тексеру кадрлары мен превью |

## Басқару
Scroll / touch / тышқан дөңгелегі. Құрастырылған бетті ашу жеткілікті (`file://` жұмыс істейді). Детерминді режим: `index.html?capture=1`, содан кейін `window.__ms.render(sVH, tSec)`; қате болса `document.body.dataset.err`, жүктеу біткенде `#loader.done`.

## Қайта құрастыру
```
python3 build/build_html.py                 # ассеттерді қайта оқып, index.html жазады
PW_PATH=/path/to/playwright node build/record.js --stills   # немесе --video
```
Ассеттер аты бойынша манифесттен ізделеді (`plate` атында `moon|macro|hero|gate|tower|garden|wide`; `layer` атында сахна id + `sky|moon|towers|mist|bg|mid|wall|tower|flowers|castle`; `char` атында `aiaru`/`tair`; `eye`: `aiaru_open`, `aiaru_wide`, `aiaru_half`, `aiaru_closed`, `aiaru_glance_up`, `aiaru_pupil_0..5`, `tair_open`, `tair_narrow`, `tair_glance`). Табылмағаны автоматты түрде орынбасарға түседі, сондықтан рендер келгеннен кейін кодты өзгертпей `build_html.py` жіберу жеткілікті.
