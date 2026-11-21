// Спикерлер мәтіні: кім, қай слайдта, не айтады → topic12/x-ne-0-speakers.docx
const fs = require('fs'), path = require('path');
const {Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
       HeadingLevel, BorderStyle, Footer, PageNumber, PageBreak} = require('docx');

const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'speakers.json'), 'utf8'));
const COL = {A: 'B07D10', K: 'C0563B', Q: '2E8B6E'}, BG = {A: 'FFF4D6', K: 'FDE6DE', Q: 'DDF4EA'};
const FONT = 'Arial';
const secs = s => { const pauses = [...s.say.matchAll(/(\d+)\s*секунд/g)].reduce((a, m) => a + +m[1], 0);
  return Math.round(s.words / 110 * 60 + pauses); };
const mmss = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

const W = 9026;  // A4, 1" өрістер: 11906 − 2×1440
const cell = (text, w, opt = {}) => new TableCell({
  width: {size: w, type: WidthType.DXA}, margins: {top: 80, bottom: 80, left: 110, right: 110},
  shading: opt.fill ? {type: ShadingType.CLEAR, color: 'auto', fill: opt.fill} : undefined,
  children: [new Paragraph({children: [new TextRun({text, bold: !!opt.bold, color: opt.color, size: opt.size || 20, font: FONT})]})]});
const table = (cols, rows) => new Table({width: {size: W, type: WidthType.DXA}, columnWidths: cols, rows});

// speech → runs: [ ... ] кідірістер мен ремаркалар курсивпен
const speechRuns = txt => txt.split(/(\[[^\]]+\])/).filter(Boolean).map(part => part.startsWith('[')
  ? new TextRun({text: part, italics: true, color: '7A7A7A', size: 22, font: FONT})
  : new TextRun({text: part, size: 24, font: FONT}));

const children = [];
children.push(new Paragraph({heading: HeadingLevel.TITLE, children: [new TextRun({text: 'x ≠ 0 — кім, қай жерде, не айтады', font: FONT})]}));
children.push(new Paragraph({spacing: {after: 120}, children: [new TextRun({text: D.subtitle, size: 24, color: '444444', font: FONT})]}));
children.push(new Paragraph({spacing: {after: 240}, children: [new TextRun({text: `Басты сұрақ: «${D.hook}» — 7-слайдта қойылады, 29-слайдта жауап беріледі.`, italics: true, size: 22, font: FONT})]}));

// Баяндамашылар
children.push(new Paragraph({heading: HeadingLevel.HEADING_1, children: [new TextRun({text: 'Баяндамашылар', font: FONT})]}));
const byWho = k => D.slides.filter(s => s.who === k);
const tot = k => byWho(k).reduce((a, s) => a + secs(s), 0);
children.push(table([2700, 2600, 2226, 1500], [
  new TableRow({tableHeader: true, children: ['Автор', 'Рөлі', 'Слайдтар', 'Уақыты'].map((h, i) => cell(h, [2700, 2600, 2226, 1500][i], {bold: true, fill: 'E9E4DA'}))}),
  ...['A', 'K', 'Q'].map(k => new TableRow({children: [
    cell(D.authors[k].name, 2700, {bold: true, color: COL[k], fill: BG[k]}),
    cell(`${D.authors[k].role} · ${D.role}`, 2600, {fill: BG[k]}),
    cell(byWho(k).map(s => s.id).join(', '), 2226, {fill: BG[k]}),
    cell('≈ ' + mmss(tot(k)), 1500, {fill: BG[k]})]}))]));
const all = D.slides.reduce((a, s) => a + secs(s), 0);
children.push(new Paragraph({spacing: {before: 120, after: 240}, children: [new TextRun({text: `Жалпы уақыт ≈ ${mmss(all)} (кідірістерді қоса). Сөз кезегі ауысқанда соңғы сөйлем келесі баяндамашыны атайды.`, size: 22, font: FONT})]}));

// Жалпы кесте
children.push(new Paragraph({heading: HeadingLevel.HEADING_1, children: [new TextRun({text: 'Слайдтар бойынша кесте', font: FONT})]}));
const cw = [1000, 1450, 2250, 3326, 1000];
children.push(table(cw, [
  new TableRow({tableHeader: true, children: ['Слайд', 'Бөлім', 'Кім айтады', 'Экранда', 'Уақыт'].map((h, i) => cell(h, cw[i], {bold: true, fill: 'E9E4DA'}))}),
  ...D.slides.map(s => new TableRow({children: [
    cell(String(s.id), cw[0], {fill: BG[s.who]}), cell(s.act, cw[1], {fill: BG[s.who]}),
    cell(D.authors[s.who].name, cw[2], {bold: true, color: COL[s.who], fill: BG[s.who]}),
    cell(s.title, cw[3], {fill: BG[s.who]}), cell(mmss(secs(s)), cw[4], {fill: BG[s.who]})]}))]));

// Әр слайдтың мәтіні
children.push(new Paragraph({children: [new PageBreak()]}));
children.push(new Paragraph({heading: HeadingLevel.HEADING_1, children: [new TextRun({text: 'Толық мәтін', font: FONT})]}));
let prev = null;
for (const s of D.slides) {
  children.push(new Paragraph({heading: HeadingLevel.HEADING_2, children: [new TextRun({text: `${s.id}. ${s.title}`, font: FONT}),
    new TextRun({text: `   · ${s.act}`, color: '888888', font: FONT})]}));
  children.push(new Paragraph({spacing: {after: 60}, children: [
    new TextRun({text: 'Сөйлейді: ', size: 22, font: FONT}),
    new TextRun({text: D.authors[s.who].name, bold: true, color: COL[s.who], size: 22, font: FONT}),
    ...(prev && prev !== s.who ? [new TextRun({text: '   (сөз кезегі ауысады)', italics: true, color: '888888', size: 20, font: FONT})] : []),
    new TextRun({text: `   ≈ ${mmss(secs(s))}`, color: '888888', size: 20, font: FONT})]}));
  children.push(new Paragraph({spacing: {after: 120}, border: {bottom: {style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4}}, children: [
    new TextRun({text: `Экранда: ${s.shot} Ауысу: ${s.tr}.`, size: 18, color: '777777', font: FONT})]}));
  children.push(new Paragraph({spacing: {after: 260, line: 320}, children: speechRuns(s.say)}));
  prev = s.who;
}

const doc = new Document({
  creator: 'x ≠ 0', title: 'x ≠ 0 — спикерлер мәтіні',
  styles: {default: {document: {run: {font: FONT, size: 22}}},
    paragraphStyles: [
      {id: 'Title', name: 'Title', basedOn: 'Normal', run: {font: FONT, size: 44, bold: true, color: '12161F'}, paragraph: {spacing: {before: 0, after: 120}, keepNext: true}},
      {id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: {font: FONT, size: 30, bold: true, color: '12161F'}, paragraph: {spacing: {before: 300, after: 140}, keepNext: true, outlineLevel: 0}},
      {id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: {font: FONT, size: 26, bold: true, color: '26443A'}, paragraph: {spacing: {before: 240, after: 60}, keepNext: true, outlineLevel: 1}}]},
  sections: [{properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1440, bottom: 1440, left: 1440, right: 1440}}},
    footers: {default: new Footer({children: [new Paragraph({alignment: AlignmentType.CENTER, children: [
      new TextRun({text: 'x ≠ 0 · спикерлер мәтіні · ', size: 16, color: '999999', font: FONT}),
      new TextRun({children: [PageNumber.CURRENT], size: 16, color: '999999', font: FONT})]})]})},
    children}]
});
Packer.toBuffer(doc).then(b => { const out = path.join(__dirname, '..', 'x-ne-0-speakers.docx'); fs.writeFileSync(out, b); console.log(out, b.length); });
