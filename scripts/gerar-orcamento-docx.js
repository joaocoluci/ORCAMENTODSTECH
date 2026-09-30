/** @author João Coluci **/
/*
 * Gerador de Detalhamento do Orçamento de Horas em DOCX.
 * Layout: modelo DSTECH v.4 (capa, cabeçalho, rodapé e contracapa) sobre o
 * Modelo de Documento Padrão Sankhya 2026.
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
  WidthType, ShadingType, VerticalAlign, PageNumber, TabStopType,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType
} = require("docx");

// ---------- args ----------
function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const contentPath = arg("--content");
const outputDir = arg("--output-dir");
if (!contentPath || (!outputDir && !arg("--output"))) {
  console.error("Uso: node gerar-orcamento-docx.js --content dados.json --output-dir pasta\n" +
    "   ou: node gerar-orcamento-docx.js --content dados.json --output saida.docx");
  process.exit(1);
}
// tolera header de comentário injetado por hook/formatter no topo do JSON
const raw = fs.readFileSync(contentPath, "utf8").replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");
const d = JSON.parse(raw);
const outputPath = outputDir ? path.join(outputDir, nomeArquivoPadrao()) : arg("--output");

/** Nome padrão: "ORCAMENTO - ID DSTECH <id> - <CLIENTE>.docx", sem acento e sem caractere inválido no Windows. */
function nomeArquivoPadrao() {
  const valor = (rotulo) => {
    const linha = (d.identificacao || []).find(r => String(r[0]).toLowerCase() === rotulo.toLowerCase());
    return linha ? String(linha[1]).trim() : "";
  };
  const id = valor("ID DSTech");
  const cliente = valor("Cliente");
  if (!id || !cliente) {
    console.error("--output-dir exige 'ID DSTech' e 'Cliente' preenchidos em identificacao.");
    process.exit(1);
  }
  const limpar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
  return `ORCAMENTO - ID DSTECH ${limpar(id)} - ${limpar(cliente)}.docx`;
}

// ---------- paleta / medidas ----------
// Modelo de Documento Padrão Sankhya 2026 (references/design-sankhya.md).
// O verde #00D666 só aparece como filete, barra e texto sobre fundo escuro: no branco
// tem contraste 1,9:1 e some na impressão.
const NAVY = "212F41";        // navy 700 — texto, títulos, totais, cabeçalho de tabela
const SLATE = "343C50";       // slate — H3 e texto de caixa de destaque
const GREEN = "00D666";       // verde Sankhya — filetes, barras, destaques na capa
const GREEN_APOIO = "00CD5E"; // verde apoio — rótulos e marcadores sobre fundo claro
const ZEBRA = "F3F3F3";       // cinza claro — linhas alternadas, caixas de destaque
const BORDA = "BFBFBF";       // filete horizontal entre linhas de tabela
const LABEL = "888888";       // cinza — legendas, cabeçalho e rodapé
const TEXT = NAVY;
const FONTE = "Work Sans";
const FONTE_FORTE = "Work Sans SemiBold"; // o padrão 2026 não usa negrito sintético
const FONTE_FINA = "Work Sans Light";

// Página: medidas do modelo DSTECH v.4 (laterais 1304; capa com o texto no terço inferior).
const PAGE = { width: 11906, height: 16838 };
const MARGIN = { top: 2350, bottom: 1300, left: 1304, right: 1304, header: 500, footer: 560 };
const MARGIN_CAPA = { ...MARGIN, top: 6200, header: 600 };
const MARGIN_CONTRACAPA = { ...MARGIN, top: 6600, header: 600 };
const CW = PAGE.width - MARGIN.left - MARGIN.right; // 9298 — largura útil
// Larguras de tabela foram desenhadas para a largura útil da v.3 (8506) e escalam para a v.4.
const CW_V3 = 8506;
const escala = (w) => Math.round(w * CW / CW_V3);

// Versão e publicação do LAYOUT (modelo DSTECH v.4), não do orçamento.
// Fixas: não acompanham a versão nem a data da proposta.
const VERSAO_LAYOUT = "4.0";
const DATA_PUBLICACAO_LAYOUT = "30/09/2026";

const filete = { style: BorderStyle.SINGLE, size: 4, color: BORDA };
const semBorda = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const borders = { top: semBorda, bottom: filete, left: semBorda, right: semBorda };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };
const R = AlignmentType.RIGHT;
const C = AlignmentType.CENTER;

// `bold` vira Work Sans SemiBold: a fonte embutida não tem peso negrito.
function t(text, opts = {}) {
  const { bold, ...resto } = opts;
  return new TextRun({ text: String(text), ...(bold ? { font: FONTE_FORTE } : {}), ...resto });
}
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
    : [t(header ? String(content).toUpperCase() : content,
        { bold: bold || header, color: header ? "FFFFFF" : undefined, size: 18 })];
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: span,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: align, spacing: { before: 0, after: 0, line: 276 }, children: runs })],
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

// ---------- capa / cabeçalho / rodapé / contracapa (modelo DSTECH v.4) ----------
// Mesma identidade do Modelo de Documento Padrão Sankhya 2026: capa e contracapa com
// fundo institucional sangrando a página, cabeçalho DSTECH e rodapé com filete verde.
const ASSETS = path.join(__dirname, "..", "assets");
const EMU_PX = 9525;
const PAGINA_EMU = { width: 7562850, height: 10696575 };
const lerAsset = (nome) => fs.readFileSync(path.join(ASSETS, nome));

function fundo(arquivo) {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new ImageRun({
      type: "jpg",
      data: lerAsset(arquivo),
      transformation: { width: Math.round(PAGINA_EMU.width / EMU_PX), height: Math.round(PAGINA_EMU.height / EMU_PX) },
      floating: {
        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
        behindDocument: true,
        wrap: { type: TextWrappingType.NONE },
      },
    })],
  });
}

function linhaCapa(texto, { fina } = {}) {
  return new Paragraph({
    spacing: { before: 0, after: fina ? 0 : 280, line: 240 },
    children: [t(texto.toUpperCase(), {
      font: fina ? FONTE_FINA : FONTE_FORTE, size: 48, characterSpacing: fina ? 30 : 20,
      color: fina ? GREEN : "FFFFFF",
    })],
  });
}

/** Busca na identificação o valor do primeiro rótulo presente (sem diferenciar caixa). */
function valorIdentificacao(rotulos) {
  const alvo = rotulos.map(r => r.toLowerCase());
  const linha = (d.identificacao || []).find(r => alvo.includes(String(r[0]).toLowerCase()));
  return linha ? String(linha[1]) : "";
}

function camposCapa() {
  const cab = d.cabecalho || {};
  const idDsTech = valorIdentificacao(["ID DSTech"]);
  const campos = [
    ...(idDsTech ? [["ID DSTech", idDsTech]] : []),
    ["Cliente", valorIdentificacao(["Cliente"])],
    ["Versão", cab.versao || "1.0"],
    ["Data", valorIdentificacao(["Data", "Data da análise"])],
    ["Responsável", valorIdentificacao(["Orçamento Realizado por", "Analista"]) || cab.elaborador || "João Coluci"],
  ];
  const w = Math.floor(CW / campos.length);
  const topo = { style: BorderStyle.SINGLE, size: 8, color: GREEN };
  return new Table({
    width: { size: w * campos.length, type: WidthType.DXA }, columnWidths: campos.map(() => w),
    rows: [new TableRow({
      children: campos.map(([rot, val]) => new TableCell({
        width: { size: w, type: WidthType.DXA },
        borders: { top: topo, left: semBorda, bottom: semBorda, right: semBorda },
        margins: { top: 120, bottom: 60, left: 0, right: 200 },
        children: [
          new Paragraph({ spacing: { after: 40 },
            children: [t(rot.toUpperCase(), { font: FONTE_FORTE, color: GREEN, characterSpacing: 40, size: 14 })] }),
          new Paragraph({ spacing: { after: 0 }, children: [t(val, { color: "FFFFFF", size: 18 })] }),
        ],
      })),
    })],
  });
}

/** Título da capa em duas linhas finas (verde) e o nome da demanda em destaque (branco). */
function capa() {
  const titulo = d.titulo || "Detalhamento do Orçamento de Horas";
  const palavras = titulo.split(" ");
  const meio = Math.ceil(palavras.length / 2);
  const out = [fundo("capa-2026.jpg"),
    linhaCapa(palavras.slice(0, meio).join(" "), { fina: true }),
    linhaCapa(palavras.slice(meio).join(" "), { fina: true })];
  if (d.subtitulo) out.push(linhaCapa(d.subtitulo));
  out.push(new Paragraph({ spacing: { before: 3400, after: 0 }, children: [] }));
  out.push(camposCapa());
  return out;
}

function contracapa() {
  const cab = d.cabecalho || {};
  return [
    fundo("contracapa-2026.jpg"),
    linhaCapa("Obrigado.", { fina: true }),
    linhaCapa("Dúvidas? Fale com a gente."),
    new Paragraph({ spacing: { before: 600, after: 20 },
      children: [t((cab.area || "Delivery Service Tech").toUpperCase(), { font: FONTE_FORTE, color: GREEN, characterSpacing: 40, size: 16 })] }),
    new Paragraph({ spacing: { before: 4200 },
      children: [new ImageRun({ type: "png", data: lerAsset("logo-sankhya-branco.png"), transformation: { width: 170, height: 37 } })] }),
  ];
}

function celulaCabecalho(runs, { w, span, align, fill } = {}) {
  return new TableCell({
    borders: { top: semBorda, left: semBorda, right: semBorda, bottom: { style: BorderStyle.SINGLE, size: 4, color: "E4E4E4" } },
    width: { size: w, type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 110, right: 110 },
    columnSpan: span, verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ alignment: align, spacing: { before: 0, after: 0, line: 240 }, children: runs })],
  });
}
const rotulo = (txt) => t(txt.toUpperCase(), { font: FONTE_FORTE, size: 13, color: GREEN_APOIO, characterSpacing: 30 });
const valor = (txt) => t(txt, { size: 15, color: NAVY });

/** Tabela DSTECH: elaborador e aprovador do documento; versão e publicação do layout v.4. */
function tabelaCabecalho() {
  const cab = d.cabecalho || {};
  const cols = [1900, 3200, 1700, CW - 6800];
  const logo = new ImageRun({ type: "png", data: lerAsset("logo-sankhya-2026.png"), transformation: { width: 80, height: 17 } });
  const linha = (a, b, c, e) => new TableRow({
    children: [
      celulaCabecalho([rotulo(a)], { w: cols[0], fill: ZEBRA }),
      celulaCabecalho([valor(b)], { w: cols[1] }),
      celulaCabecalho([rotulo(c)], { w: cols[2], fill: ZEBRA }),
      celulaCabecalho([valor(e)], { w: cols[3] }),
    ],
  });
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: cols,
    rows: [
      new TableRow({
        children: [
          celulaCabecalho([logo], { w: cols[0] }),
          celulaCabecalho([t((cab.area || "Delivery Service Tech").toUpperCase(),
            { font: FONTE_FORTE, size: 16, color: NAVY, characterSpacing: 30 })],
            { w: cols[1] + cols[2] + cols[3], span: 3, align: R }),
        ],
      }),
      linha("Elaborador", cab.elaborador || "João Coluci", "Versão", VERSAO_LAYOUT),
      linha("Aprovador", cab.aprovador || "Plinio Silva", "Publicação", DATA_PUBLICACAO_LAYOUT),
    ],
  });
}

const cabecalhoPadrao = new Header({
  children: [tabelaCabecalho(), new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
});
const vazioCabecalho = () => new Header({ children: [new Paragraph({ children: [] })] });
const vazioRodape = () => new Footer({ children: [new Paragraph({ children: [] })] });
const rodapePadrao = new Footer({
  children: [new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 8 } },
    tabStops: [{ type: TabStopType.RIGHT, position: CW }],
    children: [
      t("SANKHYA  ", { font: FONTE_FORTE, size: 14, color: NAVY, characterSpacing: 30 }),
      t("|  Documento de uso interno e do cliente", { size: 14, color: LABEL }),
      new TextRun({ children: ["\tPÁGINA ", PageNumber.CURRENT, " DE ", PageNumber.TOTAL_PAGES], size: 14, color: LABEL, characterSpacing: 20 }),
    ],
  })],
});

// Fontes embutidas: sem elas o Word troca Work Sans por Calibri em máquina sem a fonte.
const FONTES_EMBUTIDAS = [
  { name: FONTE, data: lerAsset("fontes/WorkSans.ttf") },
  { name: FONTE_FORTE, data: lerAsset("fontes/WorkSansSemiBold.ttf") },
  { name: FONTE_FINA, data: lerAsset("fontes/WorkSansLight.ttf") },
];

// ---------- montagem ----------
const children = [];

// Identificação
if (d.identificacao?.length) {
  children.push(table([escala(2600), CW - escala(2600)], ["Campo", "Valor"],
    d.identificacao.map(r => [r[0], r[1]]), { boldCols: [0] }));
  children.push(p("", { spacing: { after: 120 } }));
}

// 1. Resumo
if (d.resumo) {
  children.push(h1(d.resumo.titulo || "1. Resumo do que será desenvolvido"));
  if (d.resumo.intro) children.push(p(d.resumo.intro));
  if (d.resumo.rotinas?.length) {
    children.push(linhaVazia());
    children.push(table([escala(2400), CW - escala(2400)], ["Rotina", "Descrição"],
      d.resumo.rotinas.map(r => [r[0], r[1]]), { boldCols: [0] }));
    children.push(linhaVazia());
  }
}

// Observações — aceita objeto único ou lista; uma linha em branco separa cada bloco
const observacoes = [].concat(d.observacoes || d.observacao || []);
observacoes.forEach((obs, i) => {
  if (i > 0) children.push(linhaVazia());
  // Caixa de nota do padrão 2026: rótulo em caixa alta verde, texto em slate, barra verde.
  children.push(new Paragraph({ spacing: { before: 160, after: 160, line: 320 },
    shading: { fill: ZEBRA, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 36, color: GREEN, space: 12 } },
    children: [t((obs.titulo || "Observação").toUpperCase() + "  ", { bold: true, color: GREEN_APOIO, characterSpacing: 30 }),
      t(obs.texto || obs, { color: SLATE })] }));
});

// Quadro — tabela descritiva sem horas. Serve para expor a composição de um anexo
// estruturado do cliente antes ou depois da lista de itens (ver `posicao`).
function quadro(q) {
  const out = [h2(q.titulo)];
  if (q.intro) out.push(p(q.intro));
  out.push(linhaVazia());
  const ncols = q.colunas.length;
  const larguras = q.larguras ? q.larguras.map(escala) : Array(ncols).fill(Math.floor(CW / ncols));
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
    children.push(table([CW - escala(2400), escala(2400)], [e.subtotalDevLabel || "Subtotal Desenvolvimento", e.subtotalDev], [], { aligns: [null, R] }));
  }

  quadros.filter(q => q.posicao !== "antes").forEach(q => children.push(...quadro(q)));

  if (e.fases?.length) {
    children.push(h2(e.tituloFases || "Demais fases"));
    children.push(table([CW - escala(2400), escala(2400)], ["Fase", "Horas"], e.fases.map(f => [f[0], f[1]]), { aligns: [null, R] }));
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
  const first = escala(3406);
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
      border: { left: { style: BorderStyle.SINGLE, size: 36, color: GREEN, space: 12 } },
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
// Estilos do Modelo de Documento Padrão Sankhya 2026: Work Sans 10,5pt navy; H1 SemiBold em
// caixa alta 17pt; H2 12,5pt; H3 10,5pt slate.
const doc = new Document({
  fonts: FONTES_EMBUTIDAS,
  styles: {
    default: { document: {
      run: { font: FONTE, size: 21, color: TEXT },
      paragraph: { spacing: { after: 140, line: 312 } },
    } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 34, font: FONTE_FORTE, allCaps: true, color: NAVY, characterSpacing: 20 },
        paragraph: { keepNext: true, spacing: { before: 520, after: 220 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, font: FONTE_FORTE, color: NAVY },
        paragraph: { keepNext: true, spacing: { before: 320, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 21, font: FONTE_FORTE, color: SLATE },
        paragraph: { keepNext: true, spacing: { before: 240, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "■", alignment: AlignmentType.LEFT,
        style: { run: { color: GREEN_APOIO, size: 14 }, paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { run: { font: FONTE_FORTE, color: GREEN_APOIO }, paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ],
  },
  sections: [
    { properties: { page: { size: PAGE, margin: MARGIN_CAPA } },
      headers: { default: vazioCabecalho() }, footers: { default: vazioRodape() }, children: capa() },
    { properties: { page: { size: PAGE, margin: MARGIN } },
      headers: { default: cabecalhoPadrao }, footers: { default: rodapePadrao }, children },
    { properties: { page: { size: PAGE, margin: MARGIN_CONTRACAPA } },
      headers: { default: vazioCabecalho() }, footers: { default: vazioRodape() }, children: contracapa() },
  ],
});

// O pacote docx grava o fontKey das fontes embutidas em minúsculas, mas o schema OOXML
// exige GUID em hexadecimal maiúsculo. A desofuscação da fonte não depende da caixa.
async function corrigirFontKeys(buf) {
  const JSZip = require(require.resolve("jszip", { paths: [path.dirname(require.resolve("docx"))] }));
  const zip = await JSZip.loadAsync(buf);
  const arquivoFontes = zip.file("word/fontTable.xml");
  if (!arquivoFontes) return buf;
  const xml = await arquivoFontes.async("string");
  zip.file("word/fontTable.xml", xml.replace(/fontKey="(\{[0-9a-fA-F-]+\})"/g,
    (_, guid) => `fontKey="${guid.toUpperCase()}"`));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

Packer.toBuffer(doc).then(corrigirFontKeys).then(buf => {
  fs.writeFileSync(outputPath, buf);
  console.log("OK " + outputPath);
});
