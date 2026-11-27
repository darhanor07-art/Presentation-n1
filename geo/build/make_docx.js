// Қорғауға арналған мәтін: кім, қай слайдта, не айтады → geo/zher-tort-kabygy-speakers.docx
// Деректер: geo/build/speakers.json (gen_docs.py жасайды). Іске қосу: node geo/build/make_docx.js
const fs = require('fs'), path = require('path');
const {Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
       HeadingLevel, BorderStyle, Footer, PageNumber, PageBreak, LevelFormat} = require('docx');

const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'speakers.json'), 'utf8'));
const FONT = 'Arial';
const COL = {}, BG = {}, NAME = {all: 'Бәрі бірге'};
const tint = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = v => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'); return (m(r) + m(g) + m(b)).toUpperCase(); };
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, m = v => Math.round(v * k).toString(16).padStart(2, '0'); return (m(r) + m(g) + m(b)).toUpperCase(); };
for (const [k, a] of Object.entries(D.authors)) { COL[k] = shade(a.color, .62); BG[k] = tint(a.color, .82); NAME[k] = a.name; }
COL.all = '8A6A00'; BG.all = 'FFF3C4';
const mmss = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
const W = 9026;   // A4, 1" өрістер
const cell = (text, w, o = {}) => new TableCell({width: {size: w, type: WidthType.DXA}, margins: {top: 80, bottom: 80, left: 110, right: 110},
  shading: o.fill ? {type: ShadingType.CLEAR, color: 'auto', fill: o.fill} : undefined,
  children: [new Paragraph({children: [new TextRun({text, bold: !!o.bold, color: o.color, size: o.size || 20, font: FONT})]})]});
const table = (cols, rows) => new Table({width: {size: W, type: WidthType.DXA}, columnWidths: cols, rows});
// [..] ремаркалар курсивпен, сұр түспен
const speechRuns = txt => txt.split(/(\[[^\]]+\])/).filter(Boolean).map(part => part.startsWith('[')
  ? new TextRun({text: part, italics: true, color: '7A7A7A', size: 22, font: FONT})
  : new TextRun({text: part, size: 24, font: FONT}));
const P = (runs, o = {}) => new Paragraph({spacing: {after: o.after ?? 120, before: o.before ?? 0, line: o.line}, children: runs, ...(o.extra || {})});
const T = (text, o = {}) => new TextRun({text, font: FONT, size: o.size || 22, bold: o.bold, italics: o.it, color: o.color});

const children = [];
children.push(new Paragraph({heading: HeadingLevel.TITLE, children: [T(`${D.title} — кім, қай жерде, не айтады`, {size: 44, bold: true})]}));
children.push(P([T(D.subtitle, {size: 24, color: '444444'})]));
children.push(P([T(`Басты сұрақ: «${D.hook}» — 2-слайдта қойылады, 25-слайдта жауап беріледі: «${D.answer}»`, {it: true, size: 22})], {after: 240}));

// Баяндамашылар
children.push(new Paragraph({heading: HeadingLevel.HEADING_1, children: [T('Баяндамашылар', {size: 30, bold: true})]}));
const segsOf = k => D.slides.flatMap(s => s.segs.filter(g => g.who === k).map(g => ({...g, id: s.id})));
const cw1 = [2500, 2300, 2726, 1500];
children.push(table(cw1, [
  new TableRow({tableHeader: true, children: ['Баяндамашы', 'Қабығы', 'Слайдтар', 'Уақыты'].map((h, i) => cell(h, cw1[i], {bold: true, fill: 'E9E4DA'}))}),
  ...Object.keys(D.authors).map(k => new TableRow({children: [
    cell(D.authors[k].name, cw1[0], {bold: true, color: COL[k], fill: BG[k]}), cell(`${D.authors[k].role} · ${D.authors[k].note}`, cw1[1], {fill: BG[k]}),
    cell([...new Set(segsOf(k).map(g => g.id))].join(', '), cw1[2], {fill: BG[k]}), cell('≈ ' + mmss(segsOf(k).reduce((a, g) => a + g.secs, 0)), cw1[3], {fill: BG[k]})]}))]));
children.push(P([T(`Жалпы уақыт ≈ ${mmss(D.total_secs)}: сабырлы қарқын (${D.wpm} сөз/мин), кідірістер мен ауысулар қоса есептелген. `
  + 'Аты-жөндерді презентацияда E (өңдеу) режимінде немесе geo/build/content.py ішінде ауыстырыңыз.', {size: 20, color: '555555'})], {before: 120, after: 240}));

// Қалай басқарады
children.push(new Paragraph({heading: HeadingLevel.HEADING_1, children: [T('Презентацияны басқару', {size: 30, bold: true})]}));
for (const [k, v] of [['→ · Space · тінтуір', 'келесі слайд (камера келесі ракурсқа ұшады)'], ['←', 'алдыңғы слайд'], ['N', 'спикер жазбалары (осы мәтін) экранның төменгі жағында'],
  ['F', 'толық экран'], ['E · Ctrl+S', 'мәтінді түзету және сақтау (аты-жөндер, сандар)']])
  children.push(new Paragraph({numbering: {reference: 'dots', level: 0}, spacing: {after: 60}, children: [T(k + ' — ', {bold: true}), T(v)]}));
children.push(P([T('Кеңес: ауысу кезінде (1–4 секунд) сөйлемеңіз — камера ұшып жатқанда залдың назары экранда. Мәтін панелі шыққанда сөйлей бастаңыз.', {it: true, size: 20, color: '555555'})], {before: 100, after: 240}));

// Слайдтар кестесі
children.push(new Paragraph({heading: HeadingLevel.HEADING_1, children: [T('Слайдтар бойынша кесте', {size: 30, bold: true})]}));
const cw2 = [700, 1500, 2300, 3626, 900];
children.push(table(cw2, [
  new TableRow({tableHeader: true, children: ['№', 'Бөлім', 'Кім айтады', 'Экранда', 'Уақыт'].map((h, i) => cell(h, cw2[i], {bold: true, fill: 'E9E4DA'}))}),
  ...D.slides.map(s => { const who = [...new Set(s.segs.map(g => g.who))], k = who.length === 1 ? who[0] : 'all';
    return new TableRow({children: [cell(String(s.id), cw2[0], {fill: BG[k]}), cell(s.act, cw2[1], {fill: BG[k]}),
      cell(who.length === 1 ? NAME[k] : 'кезекпен: ' + who.map(w => NAME[w].replace('-баяндамашы', '')).join(' → '), cw2[2], {bold: true, color: COL[k], fill: BG[k]}),
      cell(s.title, cw2[3], {fill: BG[k]}), cell(mmss(s.secs), cw2[4], {fill: BG[k]})]}); })]));

// Толық мәтін
children.push(new Paragraph({children: [new PageBreak()]}));
children.push(new Paragraph({heading: HeadingLevel.HEADING_1, children: [T('Толық мәтін: қай жерде не айтылады', {size: 30, bold: true})]}));
let prev = null;
for (const s of D.slides) {
  children.push(new Paragraph({heading: HeadingLevel.HEADING_2, children: [T(`${s.id}. ${s.title}`, {size: 26, bold: true}), T(`   · ${s.act} · ≈ ${mmss(s.secs)}`, {size: 22, color: '888888'})]}));
  children.push(P([T('Экранда: ', {bold: true, size: 18, color: '777777'}), T(s.shot + '. ', {size: 18, color: '777777'}),
    T('Ауысу: ', {bold: true, size: 18, color: '777777'}), T(s.tr + '.', {size: 18, color: '777777'})],
    {after: 100, extra: {border: {bottom: {style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4}}}}));
  for (const g of s.segs) {
    const head = [T(NAME[g.who], {bold: true, color: COL[g.who], size: 22}), T(`   ≈ ${mmss(g.secs)}`, {size: 18, color: '999999'})];
    if (prev && prev !== g.who) head.push(T('   (сөз кезегі ауысады)', {it: true, size: 18, color: '999999'}));
    children.push(P(head, {after: 40}));
    children.push(P(speechRuns(g.text), {after: 180, line: 320}));
    prev = g.who;
  }
}
// Сұрақтарға дайындық
children.push(new Paragraph({heading: HeadingLevel.HEADING_1, children: [T('Ықтимал сұрақтар мен қысқа жауаптар', {size: 30, bold: true})]}));
for (const [q, a] of [
  ['Литосфера мен жер қыртысының айырмашылығы неде?', 'Литосфера = жер қыртысы + мантияның жоғарғы қатты бөлігі. Қыртыс — литосфераның тек жоғарғы бөлігі.'],
  ['Неліктен тақталар қозғалады?', 'Мантиядағы ыстық заттың баяу айналып ағуы (конвекция) тақталарды жылына 2–5 см жылжытады.'],
  ['Тұщы су неге аз?', 'Судың 96,5%-ы — мұхиттың тұзды суы, 1,7%-ы мұздықтарда; өзен мен көл суы — шамамен 0,01%.'],
  ['Озон қабаты не үшін керек?', 'Күннің ультракүлгін сәулесінің көбін ұстап қалады; онсыз құрлықтағы тіршілікке қауіп төнер еді.'],
  ['Биосфераның шекарасы қайда?', 'Жоғарғысы — озон қабаты (≈20 км); төменгісі — құрлықта 3–3,5 км (+100 °C), мұхитта ең терең шұңғыма түбі (11 км).'],
  ['Географиялық қабық дегеніміз не?', 'Төрт қабық тоғысқан аймақ. Жоғарғы шекарасы — тропопауза (9–17 км), төменгісі — мұхитта 10–11 км, құрлықта 5–7 км.'],
  ['Біртұтастық заңына мысал?', 'Арал: су азайды (гидросфера) → түбі шөлге айналды (литосфера) → тұзды шаң дауылдары (атмосфера) → балық азайды (биосфера).'],
]) { children.push(P([T('— ' + q, {bold: true})], {after: 40})); children.push(P([T(a)], {after: 140})); }
children.push(P([T('Деректер: Егорина А., Нұркенова С., Шимина Е. География 7-сынып (Атамұра, 2017); Әбілмәжінова С., Каймулдинова К. География 8-сынып (Мектеп, 2018).', {size: 18, color: '777777', it: true})], {before: 200}));

const doc = new Document({
  creator: D.title, title: `${D.title} — спикерлер мәтіні`,
  numbering: {config: [{reference: 'dots', levels: [{level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: {paragraph: {indent: {left: 500, hanging: 260}}}}]}]},
  styles: {default: {document: {run: {font: FONT, size: 22}}},
    paragraphStyles: [
      {id: 'Title', name: 'Title', basedOn: 'Normal', run: {font: FONT, size: 44, bold: true, color: '0A0F1C'}, paragraph: {spacing: {before: 0, after: 120}, keepNext: true}},
      {id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: {font: FONT, size: 30, bold: true, color: '0A0F1C'}, paragraph: {spacing: {before: 300, after: 140}, keepNext: true, outlineLevel: 0}},
      {id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: {font: FONT, size: 26, bold: true, color: '1F4E79'}, paragraph: {spacing: {before: 260, after: 60}, keepNext: true, outlineLevel: 1}}]},
  sections: [{properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1440, bottom: 1440, left: 1440, right: 1440}}},
    footers: {default: new Footer({children: [new Paragraph({alignment: AlignmentType.CENTER, children: [
      T(`${D.title} · спикерлер мәтіні · `, {size: 16, color: '999999'}), new TextRun({children: [PageNumber.CURRENT], size: 16, color: '999999', font: FONT})]})]})},
    children}],
});
Packer.toBuffer(doc).then(b => { const out = path.join(__dirname, '..', 'zher-tort-kabygy-speakers.docx'); fs.writeFileSync(out, b); console.log(out, b.length); });
