/** @author João Coluci **/
/*
 * Gerador de Orçamento de Horas em DOCX — layout padrão Sankhya (OS 3007).
 * Uso:
 *   NODE_PATH="$(npm root -g)" node gerar-orcamento-docx.js --content dados.json --output "Orcamento.docx"
 *
 * Requer o pacote "docx" instalado globalmente (npm install -g docx).
 * Estrutura do JSON de entrada: ver references/schema-orcamento.md e examples/orcamento-exemplo.json.
 */
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber
} = require("docx");

// ---------- args ----------
function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const contentPath = arg("--content");
const outputPath = arg("--output");
if (!contentPath || !outputPath) {
  console.error("Uso: node gerar-orcamento-docx.js --content dados.json --output saida.docx");
  process.exit(1);
}
// tolera header de comentário injetado por hook/formatter no topo do JSON
const raw = fs.readFileSync(contentPath, "utf8").replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");
const d = JSON.parse(raw);

// ---------- paleta / medidas ----------
const CW = 9026; // largura útil A4, margens de 1"
const NAVY = "1F3864";
const BLUE = "2E75B6";
const HEAD = "D5E8F0";
const ZEBRA = "F2F6FA";
const GREY = "CCCCCC";

const border = { style: BorderStyle.SINGLE, size: 1, color: GREY };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const R = AlignmentType.RIGHT;
const C = AlignmentType.CENTER;

function t(text, opts = {}) { return new TextRun({ text: String(text), ...opts }); }
function p(children, opts = {}) {
  return new Paragraph({ children: Array.isArray(children) ? children : [t(children)], ...opts });
}
function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(text)] }); }
function h1pb(text) { return new Paragraph({ pageBreakBefore: true, heading: HeadingLevel.HEADING_1, children: [t(text)] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(text)] }); }
function bullet(runsOrText) {
  const runs = typeof runsOrText === "string" ? [t(runsOrText)] : runsOrText;
  return new Paragraph({ numbering: { reference: "b", level: 0 }, children: runs });
}
function numItem(text) { return new Paragraph({ numbering: { reference: "n", level: 0 }, children: [t(text)] }); }

function cell(content, { w, fill, bold, align, header } = {}) {
  const runs = Array.isArray(content) ? content : [t(content, { bold: bold || header, color: header ? NAVY : undefined })];
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: align, children: runs })],
  });
}
function table(colWidths, headerCells, rows, opts = {}) {
  const trHeader = new TableRow({
    tableHeader: true,
    children: headerCells.map((c, i) => cell(c, { w: colWidths[i], fill: HEAD, header: true, align: opts.aligns?.[i] })),
  });
  const trRows = rows.map((r, ri) => new TableRow({
    children: r.map((c, i) => {
      const isTotal = opts.totalRows?.includes(ri);
      return cell(c, {
        w: colWidths[i],
        fill: isTotal ? HEAD : (ri % 2 === 1 ? ZEBRA : undefined),
        bold: isTotal || (opts.boldCols?.includes(i)),
        align: opts.aligns?.[i],
      });
    }),
  }));
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: colWidths, rows: [trHeader, ...trRows] });
}

// ---------- montagem ----------
const children = [];

// Título
children.push(new Paragraph({ alignment: C, spacing: { after: 60 },
  children: [t(d.titulo || "Orçamento de Horas", { bold: true, size: 40, color: NAVY })] }));
if (d.subtitulo) {
  children.push(new Paragraph({ alignment: C, spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
    children: [t(d.subtitulo, { bold: true, size: 26, color: BLUE })] }));
}

// Identificação
if (d.identificacao?.length) {
  children.push(table([2600, 6426], ["Campo", "Valor"],
    d.identificacao.map(r => [r[0], r[1]]), { boldCols: [0] }));
  children.push(p("", { spacing: { after: 120 } }));
}

// 1. Resumo
if (d.resumo) {
  children.push(h1(d.resumo.titulo || "1. Resumo do que será desenvolvido"));
  if (d.resumo.intro) children.push(p(d.resumo.intro));
  if (d.resumo.rotinas?.length) {
    children.push(table([2400, 6626], ["Rotina", "Descrição"],
      d.resumo.rotinas.map(r => [r[0], r[1]]), { boldCols: [0] }));
  }
}

// Escopos
for (const e of (d.escopos || [])) {
  children.push(h1pb(e.nome));
  if (e.intro) children.push(p(e.intro));

  children.push(h2(e.tituloDesenv || "Desenvolvimento"));
  for (const it of (e.desenvolvimento || [])) {
    children.push(new Paragraph({ spacing: { before: 120, after: 40 },
      children: [t(it.item + "  —  ", { bold: true }), t(it.horas, { bold: true, color: BLUE })] }));
    (it.subs || []).forEach(s => children.push(bullet(s)));
  }
  children.push(p("", { spacing: { after: 60 } }));
  children.push(table([6626, 2400], [e.subtotalDevLabel || "Subtotal Desenvolvimento", e.subtotalDev], [], { aligns: [null, R] }));

  if (e.fases?.length) {
    children.push(h2(e.tituloFases || "Demais fases"));
    children.push(table([6626, 2400], ["Fase", "Horas"], e.fases.map(f => [f[0], f[1]]), { aligns: [null, R] }));
  }
  if (e.total) {
    children.push(new Paragraph({ spacing: { before: 160 },
      children: [t((e.totalLabel || "Total:") + " ", { bold: true }), t(e.total, { bold: true, size: 26, color: NAVY })] }));
  }
}

// Consolidado
if (d.consolidado) {
  const cons = d.consolidado;
  children.push(h1pb(cons.titulo || "Resumo consolidado"));
  const ncols = cons.colunas.length;
  const first = 3626;
  const rest = Math.floor((CW - first) / (ncols - 1));
  const widths = [first, ...Array(ncols - 1).fill(rest)];
  // ajuste de arredondamento na última coluna
  widths[ncols - 1] += CW - widths.reduce((a, b) => a + b, 0);
  const aligns = [null, ...Array(ncols - 1).fill(R)];
  const totalRow = cons.totalRowIndex != null ? [cons.totalRowIndex] : [];
  children.push(table(widths, cons.colunas, cons.linhas, { aligns, totalRows: totalRow, boldCols: [0] }));
  if (cons.totalGeral) {
    children.push(new Paragraph({ alignment: C, spacing: { before: 220, after: 220 },
      shading: { fill: HEAD, type: ShadingType.CLEAR },
      children: [t(cons.totalGeral, { bold: true, size: 28, color: NAVY })] }));
  }
}

// Pontos a definir
if (d.pontosDefinir) {
  children.push(h1(d.pontosDefinir.titulo || "Pontos a definir com o cliente antes do início"));
  for (const g of (d.pontosDefinir.grupos || [])) {
    children.push(p([t(g.nome, { bold: true })], { spacing: { before: 120 } }));
    (g.itens || []).forEach(x => children.push(numItem(x)));
  }
}

// Escopo negativo
if (d.escopoNegativo) {
  children.push(h1(d.escopoNegativo.titulo || "Escopo negativo (não contemplado)"));
  for (const it of (d.escopoNegativo.itens || [])) {
    if (typeof it === "string") children.push(bullet(it));
    else children.push(bullet([t(it.bold || "", { bold: true }), t(it.texto || "")]));
  }
}

// Premissas
if (d.premissas) {
  children.push(h1(d.premissas.titulo || "Premissas"));
  (d.premissas.itens || []).forEach(x => children.push(bullet(x)));
}

// ---------- documento ----------
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: BLUE, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 620, hanging: 320 } } } }] },
      { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 620, hanging: 320 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: C,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: GREY, space: 6 } },
        children: [t((d.rodape || "Orçamento de Horas") + "          Página ", { size: 16, color: "888888" }),
                   new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" })],
      })] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log("OK " + outputPath);
});
