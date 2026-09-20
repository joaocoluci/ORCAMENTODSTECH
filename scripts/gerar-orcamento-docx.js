/** @author João Coluci **/
/*
 * Gerador de Detalhamento do Orçamento de Horas em DOCX.
 * Layout: modelo DSTECH v.3 (cabeçalho/rodapé) + paleta do Brandbook Sankhya 2023.
 * Uso:
 *   NODE_PATH="$(npm root -g)" node gerar-orcamento-docx.js --content dados.json --output "Orcamento.docx"
 *
 * Requer o pacote "docx" instalado globalmente (npm install -g docx).
 * Estrutura do JSON de entrada: ver references/schema-orcamento.md e examples/orcamento-exemplo.json.
 */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType
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
// Cores do Brandbook Sankhya 2023 (references/design-sankhya.md).
// O verde #66CC66 só aparece como preenchimento e filete: como texto tem contraste
// 2,2:1 no branco, reprova WCAG AA e some na impressão.
const NAVY = "2E3C50";   // petróleo — títulos, totais, fundo de cabeçalho de tabela
const GREEN = "66CC66";  // verde — filete e barra lateral, nunca texto
const ZEBRA = "EDEDED";  // cinza claro — linhas alternadas, caixas de destaque
const GREY = "808285";   // cinza escuro — bordas de célula
const LABEL = "666666";  // rótulos do cabeçalho e paginação (igual ao modelo DSTECH)
const TEXT = "000000";   // corpo de texto

// Página: medidas do modelo DSTECH v.3 (margens 1417 topo/base, 1700 laterais).
const PAGE = { width: 11906, height: 16838 };
const MARGIN = { top: 1417, bottom: 1417, left: 1700, right: 1700, header: 0, footer: 720 };
const CW = PAGE.width - MARGIN.left - MARGIN.right; // 8506 — largura útil

// Data da revisão do LAYOUT do documento (modelo DSTECH), não do orçamento.
// Fixa: não acompanha a data da proposta.
const DATA_REVISAO_LAYOUT = "03/07/2026";

const border = { style: BorderStyle.SINGLE, size: 2, color: GREY };
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
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [t(text)] }); }
function bullet(runsOrText) {
  const runs = typeof runsOrText === "string" ? [t(runsOrText)] : runsOrText;
  return new Paragraph({ numbering: { reference: "b", level: 0 }, children: runs });
}
function numItem(text) { return new Paragraph({ numbering: { reference: "n", level: 0 }, children: [t(text)] }); }
// Linha em branco de respiro entre blocos (texto, tabela, caixas de observação).
function linhaVazia() { return new Paragraph({ spacing: { before: 0, after: 0 }, children: [t("", { size: 22 })] }); }

function cell(content, { w, fill, bold, align, header, span } = {}) {
  const runs = Array.isArray(content)
    ? content
    : [t(content, { bold: bold || header, color: header ? "FFFFFF" : undefined })];
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: span,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: align, children: runs })],
  });
}
function table(colWidths, headerCells, rows, opts = {}) {
  const trHeader = new TableRow({
    tableHeader: true,
    children: headerCells.map((c, i) => cell(c, { w: colWidths[i], fill: NAVY, header: true, align: opts.aligns?.[i] })),
  });
  const trRows = rows.map((r, ri) => new TableRow({
    children: r.map((c, i) => {
      const isTotal = opts.totalRows?.includes(ri);
      return cell(c, {
        w: colWidths[i],
        fill: isTotal ? ZEBRA : (ri % 2 === 1 ? ZEBRA : undefined),
        bold: isTotal || (opts.boldCols?.includes(i)),
        align: opts.aligns?.[i],
      });
    }),
  }));
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: colWidths, rows: [trHeader, ...trRows] });
}

// ---------- cabeçalho / rodapé (modelo DSTECH v.3) ----------
// As faixas gráficas são as do modelo: sangram para fora da margem esquerda e ficam
// atrás do texto. Offsets em EMU, iguais aos do arquivo original.
const ASSETS = path.join(__dirname, "..", "assets");
const EMU_PX = 9525;
function faixa(file, wEmu, hEmu, xEmu, yEmu) {
  return new ImageRun({
    type: "png",
    data: fs.readFileSync(path.join(ASSETS, file)),
    transformation: { width: Math.round(wEmu / EMU_PX), height: Math.round(hEmu / EMU_PX) },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: xEmu },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: yEmu },
      behindDocument: true,
      wrap: { type: TextWrappingType.NONE },
    },
  });
}

function celulaCabecalho(runs, { w, span, align } = {}) {
  const dotted = { style: BorderStyle.DOTTED, size: 4, color: "000000" };
  return new TableCell({
    borders: { top: dotted, bottom: dotted, left: dotted, right: dotted },
    width: { size: w, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 100, right: 100 },
    columnSpan: span, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: align, spacing: { before: 0, after: 0 }, children: runs })],
  });
}
function rotulo(txt) { return t(txt, { size: 16, color: LABEL }); }

function tabelaCabecalho() {
  const cab = d.cabecalho || {};
  const cols = [1530, 3810, 1335, 1815];
  const logo = new ImageRun({
    type: "png",
    data: fs.readFileSync(path.join(ASSETS, "logo-sankhya.png")),
    transformation: { width: 59, height: 34 },
  });
  const linha = (a, b, c, e) => new TableRow({
    children: [
      celulaCabecalho([rotulo(a)], { w: cols[0] }),
      celulaCabecalho([rotulo(b)], { w: cols[1] }),
      celulaCabecalho([rotulo(c)], { w: cols[2] }),
      celulaCabecalho([rotulo(e)], { w: cols[3] }),
    ],
  });
  return new Table({
    width: { size: 8490, type: WidthType.DXA }, columnWidths: cols,
    rows: [
      new TableRow({
        children: [
          celulaCabecalho([logo], { w: cols[0], align: C }),
          celulaCabecalho([t(cab.area || "Delivery Service Tech", { bold: true, size: 20, color: NAVY })],
            { w: cols[1] + cols[2] + cols[3], span: 3, align: C }),
        ],
      }),
      linha("Elaborador", cab.elaborador || "João Coluci", "Versão", cab.versao || "1.0"),
      linha("Aprovador", cab.aprovador || "Plinio Silva", "Data Revisão", DATA_REVISAO_LAYOUT),
    ],
  });
}

const vazio = (n) => Array.from({ length: n }, () => new Paragraph({ spacing: { before: 0, after: 0 }, children: [t("", { size: 20 })] }));

const cabecalhoPadrao = new Header({
  children: [
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [faixa("cabecalho-padrao.png", 7479882, 414338, -1076322, 1)] }),
    ...vazio(3),
    tabelaCabecalho(),
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [] }),
  ],
});
const cabecalhoCapa = new Header({
  children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [faixa("cabecalho-capa.png", 7581900, 1185863, -1079998, 1)] })],
});
const rodapePadrao = new Footer({
  children: [new Paragraph({
    alignment: R,
    children: [
      new TextRun({ children: [PageNumber.CURRENT], size: 16, color: LABEL }),
      faixa("rodape-padrao.png", 7572375, 658544, -1076322, 1),
    ],
  })],
});
const rodapeCapa = new Footer({
  children: [new Paragraph({ children: [faixa("rodape-capa.png", 7581900, 855931, -1076322, -126760)] })],
});

// ---------- montagem ----------
const children = [];

// Título
children.push(new Paragraph({ alignment: C, spacing: { after: 60 },
  children: [t(d.titulo || "Detalhamento do Orçamento de Horas", { bold: true, size: 40, color: NAVY })] }));
if (d.subtitulo) {
  children.push(new Paragraph({ alignment: C, spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 4 } },
    children: [t(d.subtitulo, { bold: true, size: 26, color: NAVY })] }));
}

// Identificação
if (d.identificacao?.length) {
  children.push(table([2600, 5906], ["Campo", "Valor"],
    d.identificacao.map(r => [r[0], r[1]]), { boldCols: [0] }));
  children.push(p("", { spacing: { after: 120 } }));
}

// 1. Resumo
if (d.resumo) {
  children.push(h1(d.resumo.titulo || "1. Resumo do que será desenvolvido"));
  if (d.resumo.intro) children.push(p(d.resumo.intro));
  if (d.resumo.rotinas?.length) {
    children.push(linhaVazia());
    children.push(table([2400, 6106], ["Rotina", "Descrição"],
      d.resumo.rotinas.map(r => [r[0], r[1]]), { boldCols: [0] }));
    children.push(linhaVazia());
  }
}

// Observações — aceita objeto único ou lista; uma linha em branco separa cada bloco
const observacoes = [].concat(d.observacoes || d.observacao || []);
observacoes.forEach((obs, i) => {
  if (i > 0) children.push(linhaVazia());
  children.push(new Paragraph({ spacing: { before: 160, after: 160 },
    shading: { fill: ZEBRA, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 8 } },
    children: [t((obs.titulo || "Observação") + ": ", { bold: true, color: NAVY }), t(obs.texto || obs)] }));
});

// Quadro — tabela descritiva sem horas. Serve para expor a composição de um anexo
// estruturado do cliente antes ou depois da lista de itens (ver `posicao`).
function quadro(q) {
  const out = [h2(q.titulo)];
  if (q.intro) out.push(p(q.intro));
  out.push(linhaVazia());
  const ncols = q.colunas.length;
  const larguras = q.larguras || Array(ncols).fill(Math.floor(CW / ncols));
  larguras[ncols - 1] += CW - larguras.reduce((a, b) => a + b, 0);
  out.push(table(larguras, q.colunas, q.linhas, { boldCols: [0] }));
  out.push(linhaVazia());
  return out;
}

// Escopos
for (const e of (d.escopos || [])) {
  children.push(h1pb(e.nome));
  if (e.intro) children.push(p(e.intro));

  const quadros = e.quadros || [];
  quadros.filter(q => q.posicao === "antes").forEach(q => children.push(...quadro(q)));

  children.push(h2(e.tituloDesenv || "Desenvolvimento"));
  for (const it of (e.desenvolvimento || [])) {
    // Entrada de agrupamento: separa os itens por bloco funcional dentro do mesmo escopo.
    if (it.grupo) {
      children.push(h3(it.subtotal ? `${it.grupo}  —  ${it.subtotal}` : it.grupo));
      continue;
    }
    children.push(new Paragraph({ spacing: { before: 120, after: 40 },
      children: [t(it.item + "  —  ", { bold: true, color: NAVY }), t(it.horas, { bold: true, color: NAVY })] }));
    (it.subs || []).forEach(s => children.push(bullet(s)));
  }
  children.push(p("", { spacing: { after: 60 } }));
  if (e.subtotalDev) {
    children.push(table([6106, 2400], [e.subtotalDevLabel || "Subtotal Desenvolvimento", e.subtotalDev], [], { aligns: [null, R] }));
  }

  quadros.filter(q => q.posicao !== "antes").forEach(q => children.push(...quadro(q)));

  if (e.fases?.length) {
    children.push(h2(e.tituloFases || "Demais fases"));
    children.push(table([6106, 2400], ["Fase", "Horas"], e.fases.map(f => [f[0], f[1]]), { aligns: [null, R] }));
  }
  if (e.total) {
    children.push(new Paragraph({ spacing: { before: 160 },
      children: [t((e.totalLabel || "Total:") + " ", { bold: true, color: NAVY }), t(e.total, { bold: true, size: 26, color: NAVY })] }));
  }

  // Não escopo do próprio escopo — usar quando o documento tem escopos de assuntos
  // distintos; com escopo único, preferir a seção global `escopoNegativo`.
  if (e.naoEscopo) {
    children.push(h2(e.naoEscopo.titulo || "Não escopo"));
    for (const it of (e.naoEscopo.itens || [])) {
      if (typeof it === "string") children.push(bullet(it));
      else children.push(bullet([t(it.bold || "", { bold: true }), t(it.texto || "")]));
    }
  }
}

// Consolidado
if (d.consolidado) {
  const cons = d.consolidado;
  children.push(h1pb(cons.titulo || "Resumo consolidado"));
  const ncols = cons.colunas.length;
  const first = 3406;
  const rest = Math.floor((CW - first) / (ncols - 1));
  const widths = [first, ...Array(ncols - 1).fill(rest)];
  // ajuste de arredondamento na última coluna
  widths[ncols - 1] += CW - widths.reduce((a, b) => a + b, 0);
  const aligns = [null, ...Array(ncols - 1).fill(R)];
  const totalRow = cons.totalRowIndex != null ? [cons.totalRowIndex] : [];
  children.push(table(widths, cons.colunas, cons.linhas, { aligns, totalRows: totalRow, boldCols: [0] }));
  if (cons.totalGeral) {
    children.push(new Paragraph({ alignment: C, spacing: { before: 220, after: 220 },
      shading: { fill: ZEBRA, type: ShadingType.CLEAR },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 8 } },
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
    default: { document: { run: { font: "Arial", size: 22, color: TEXT } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, color: NAVY, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 40 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 620, hanging: 320 } } } }] },
      { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 620, hanging: 320 } } } }] },
    ],
  },
  sections: [{
    properties: { titlePage: true, page: { size: PAGE, margin: MARGIN } },
    headers: { default: cabecalhoPadrao, first: cabecalhoCapa },
    footers: { default: rodapePadrao, first: rodapeCapa },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log("OK " + outputPath);
});
