# Анимация кітапханалары: GitHub шолуы

Деректер GitHub API-ден 22.11.2026 алынды (45 репозиторий). Жұлдыз — танымалдық белгісі, сапа кепілі емес.

## Біздің таңдау

| Міндет | Не қолданамыз | Неге |
|---|---|---|
| Слайдтағы барлық қозғалыс | **anime.js 4.5** | MIT, бір файл (118 КБ), timeline, stagger, spring, SVG морф пен сызу, splitText, scrambleText, `createLayout` (FLIP) — бәрі ішінде |
| 3D сахна, камера | **three.js** | x ≠ 0 сыныбы осымен салынды; MIT |
| Слайд ауысуы (видео сияқты) | Өз GLSL шейдерлеріміз | gl-transitions жинағы — идея банкі |
| HTML-дегі «Morph» | anime.js `createLayout` немесе View Transitions API | Chrome 111, Edge 111, Firefox 144, Safari 18 қолдайды |
| Математикалық түсіндірме видео | Manim немесе Motion Canvas | кодпен формула, график, сан түзуі |

## Ескертпелер

- **GSAP** 2025 жылғы 30 сәуірден бастап толық тегін, SplitText пен MorphSVG плагиндері де. Бірақ лицензиясы — Webflow-дың өз келісімі (MIT емес): Webflow-ға ұқсас визуалды анимация құрастырғыштарда қолдануға шектеу бар. Дереккөз: [Webflow блогы](https://webflow.com/blog/gsap-becomes-free), [GSAP лицензиясы](https://gsap.com/community/standard-license/).
- **View Transitions API** (бір бет ішінде) — браузердің өзіндегі «Morph»: `view-transition-name` бірдей элементтер күйден күйге өздігінен ауысады. Қолдау: Chrome/Edge 111, Firefox 144, Safari 18. Дереккөз: [Chrome for Developers](https://developer.chrome.com/docs/web-platform/view-transitions).
- **gl-transitions** — ондаған дайын GLSL ауысу; әр ауысудың лицензиясы өз файлында көрсетіледі (GitHub жалпы лицензияны анықтамайды), көшірмес бұрын тексеріңіз.
- **Manim** — 3Blue1Brown-ның математикалық видео қозғалтқышы (96,8 мың ★). Математика мұғалімдеріне тікелей пайдалы.

## Негізгі анимация қозғалтқыштары

| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |
|---|---|---|---|---|
| [animate-css/animate.css](https://github.com/animate-css/animate.css) | 83 056 | өз лицензиясы | 2024-07-29 | 🍿 A cross-browser library of CSS animations. As easy to use as an easy thing. |
| [juliangarnier/anime](https://github.com/juliangarnier/anime) | 74 979 | MIT | 2026-11-02 | JavaScript animation engine |
| [motiondivision/motion](https://github.com/motiondivision/motion) | 35 452 | MIT | 2026-11-22 | A modern animation library for React and JavaScript |
| [greensock/GSAP](https://github.com/greensock/GSAP) | 31 068 | өз лицензиясы | 2026-11-04 | GSAP (GreenSock Animation Platform), a JavaScript animation library for the modern web |
| [pmndrs/react-spring](https://github.com/pmndrs/react-spring) | 29 325 | MIT | 2026-11-22 | ✌️ A spring physics based React animation library |
| [michalsnik/aos](https://github.com/michalsnik/aos) | 28 054 | MIT | 2024-03-26 | Animate on scroll library |
| [mojs/mojs](https://github.com/mojs/mojs) | 18 944 | MIT | 2026-07-30 | The motion graphics toolbelt for the web |
| [julianshapiro/velocity](https://github.com/julianshapiro/velocity) | 17 186 | MIT | 2020-10-24 | Accelerated JavaScript animation. |
| [formkit/auto-animate](https://github.com/formkit/auto-animate) | 13 977 | MIT | 2026-11-22 | A zero-config, drop-in animation utility that adds smooth transitions to your web app. You |
| [thednp/kute.js](https://github.com/thednp/kute.js) | 2 657 | MIT | 2026-03-26 | KUTE.js is a JavaScript animation engine for modern browsers.  |

## Мәтін, сан, қолжазба

| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |
|---|---|---|---|---|
| [rough-stuff/rough](https://github.com/rough-stuff/rough) | 21 431 | MIT | 2024-07-28 | Create graphics with a hand-drawn, sketchy, appearance |
| [mattboldt/typed.js](https://github.com/mattboldt/typed.js) | 16 279 | өз лицензиясы | 2026-01-25 | A JavaScript Typing Animation Library |
| [rough-stuff/rough-notation](https://github.com/rough-stuff/rough-notation) | 9 762 | MIT | 2024-03-18 | Create and animate hand-drawn annotations on a web page |
| [inorganik/countUp.js](https://github.com/inorganik/countUp.js) | 8 149 | MIT | 2026-10-17 | Animates a numerical value by counting to it |
| [barvian/number-flow](https://github.com/barvian/number-flow) | 7 830 | MIT | 2026-09-20 | An animated number component for React, Vue, Svelte, and TS/JS. |
| [shshaw/Splitting](https://github.com/shshaw/Splitting) | 1 757 | MIT | 2024-06-19 | JavaScript microlibrary to split an element by words, characters, children and more, popul |
| [camwiegert/baffle](https://github.com/camwiegert/baffle) | 1 747 | MIT | 2017-08-28 | A tiny javascript library for obfuscating and revealing text in DOM elements. :astonished: |

## SVG және пішін морфы

| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |
|---|---|---|---|---|
| [maxwellito/vivus](https://github.com/maxwellito/vivus) | 15 486 | MIT | 2022-07-06 | JavaScript library to make drawing animation on SVG |
| [veltman/flubber](https://github.com/veltman/flubber) | 7 010 | MIT | 2022-11-08 | Tools for smoother shape animations. |

## 3D, WebGL, шейдерлер

| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |
|---|---|---|---|---|
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | 119 153 | MIT | 2026-11-22 | JavaScript 3D Library. |
| [pixijs/pixijs](https://github.com/pixijs/pixijs) | 48 882 | MIT | 2026-11-20 | The HTML5 Creation Engine: Create beautiful digital content with the fastest, most flexibl |
| [metafizzy/zdog](https://github.com/metafizzy/zdog) | 10 726 | өз лицензиясы | 2023-07-18 | Flat, round, designer-friendly pseudo-3D engine for canvas & SVG |
| [tengbao/vanta](https://github.com/tengbao/vanta) | 7 414 | MIT | 2024-03-03 | Animated 3D backgrounds for your website |
| [sarcadass/granim.js](https://github.com/sarcadass/granim.js) | 5 293 | MIT | 2022-12-06 | Create fluid and interactive gradient animations with this small javascript library. |
| [oframe/ogl](https://github.com/oframe/ogl) | 4 761 | өз лицензиясы | 2025-04-13 | Minimal WebGL Library |
| [paper-design/shaders](https://github.com/paper-design/shaders) | 4 007 | Apache-2.0 | 2026-11-21 | Zero-dependency canvas shaders that can be installed from npm or designed in Paper |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | 2 989 | Zlib | 2026-11-22 | A post processing library for three.js. |
| [gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions) | 2 267 | өз лицензиясы | 2026-11-22 | The open collection of GL Transitions |
| [robin-dela/hover-effect](https://github.com/robin-dela/hover-effect) | 1 881 | MIT | 2023-06-27 | Javascript library to draw and animate images on hover |
| [martinlaxenaire/curtainsjs](https://github.com/martinlaxenaire/curtainsjs) | 1 832 | MIT | 2025-04-03 | curtains.js is a lightweight vanilla WebGL javascript library that turns HTML DOM elements |

## Физика және бөлшектер

| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |
|---|---|---|---|---|
| [liabru/matter-js](https://github.com/liabru/matter-js) | 18 668 | MIT | 2026-09-30 | a 2D rigid body physics engine for the web ▲● ■ |
| [tsparticles/tsparticles](https://github.com/tsparticles/tsparticles) | 9 125 | MIT | 2026-11-22 | tsParticles - Easily create highly customizable JavaScript particles effects, confetti exp |

## Дизайнер құралдары (After Effects, Rive)

| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |
|---|---|---|---|---|
| [airbnb/lottie-web](https://github.com/airbnb/lottie-web) | 32 544 | MIT | 2025-09-01 | Render After Effects animations natively on Web, Android and iOS, and React Native. http:/ |
| [theatre-js/theatre](https://github.com/theatre-js/theatre) | 13 092 | Apache-2.0 | 2024-08-14 | Motion design editor for the web |
| [rive-app/rive-wasm](https://github.com/rive-app/rive-wasm) | 1 032 | MIT | 2026-11-22 | Web runtime (JS/WASM) for Rive, the agent-native 2D and 3D engine for games, apps, and int |
| [LottieFiles/dotlottie-web](https://github.com/LottieFiles/dotlottie-web) | 953 | MIT | 2026-11-21 | High-performance Lottie & dotLottie web player powered by Rust + WASM, with React, Vue, Sv |

## Презентация және бет ауысулары

| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |
|---|---|---|---|---|
| [hakimel/reveal.js](https://github.com/hakimel/reveal.js) | 72 614 | MIT | 2026-09-30 | The HTML Presentation Framework |
| [slidevjs/slidev](https://github.com/slidevjs/slidev) | 49 598 | MIT | 2026-11-05 | Presentation Slides for Developers |
| [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | 17 423 | MIT | 2026-11-19 | Smooth scroll as it should be |
| [barbajs/barba](https://github.com/barbajs/barba) | 13 003 | MIT | 2024-12-02 | Create badass, fluid and smooth transitions between your website’s pages |
| [swup/swup](https://github.com/swup/swup) | 5 254 | MIT | 2026-11-03 | Versatile and extensible page transition library for server-rendered websites 🎉 |

## Кодпен видео (математика үшін де)

| Кітапхана | ★ | Лицензия | Соңғы жаңарту | Сипаттама |
|---|---|---|---|---|
| [3b1b/manim](https://github.com/3b1b/manim) | 96 816 | MIT | 2026-09-09 | Animation engine for explanatory math videos |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 74 940 | өз лицензиясы | 2026-11-22 | 🎥      Make videos programmatically with React |
| [ManimCommunity/manim](https://github.com/ManimCommunity/manim) | 42 806 | MIT | 2026-11-22 | A community-maintained Python framework for creating mathematical animations.  |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | 20 143 | MIT | 2026-07-02 | Visualize Your Ideas With Code |
