/** @author João Coluci **/
# Padrão visual do documento (modelo DSTECH v.4)

Fonte única de verdade:

- **`Modelo de Documento Padrão Sankhya 2026.docx`** — identidade visual da apresentação padrão
  Sankhya 2026 (capa, tipografia, cores, tabelas, caixas de destaque, contracapa).
- **Modelos DSTECH v.4** — `DSTECH - Modelo de Definição de Escopo de Customização v.4.docx` e
  `DSTECH - Modelo de Evidências de Entrega de Customização v.4.docx`, montados sobre o 2026 com o
  cabeçalho DSTECH (versão 4.0, publicação 30/09/2026).

Todos em `G:\Drives compartilhados\Delivery Service - Tech\A. ESTRUTURA SITE\1. MODELO DE DOCUMENTOS\`.

## Cores

Paleta do modelo 2026. Nada fora dela.

| Cor | Hex | Uso no DOCX | Const no gerador |
|---|---|---|---|
| Navy 700 | `#212F41` | texto, títulos, horas, totais, fundo do cabeçalho de tabela | `NAVY` / `TEXT` |
| Slate | `#343C50` | H3 e texto das caixas de destaque | `SLATE` |
| Verde Sankhya | `#00D666` | filete do rodapé e do cabeçalho, barra das caixas, rótulos da capa | `GREEN` |
| Verde apoio | `#00CD5E` | rótulos em caixa alta (cabeçalho, caixas), marcadores de lista | `GREEN_APOIO` |
| Cinza claro | `#F3F3F3` | zebra, caixas de destaque, célula de rótulo do cabeçalho | `ZEBRA` |
| Borda | `#BFBFBF` | filete horizontal entre linhas de tabela (sem bordas verticais) | `BORDA` |
| Cinza | `#888888` | legendas, rodapé, texto-guia dos modelos | `LABEL` |

### Por que o verde não vira texto corrido

`#00D666` sobre branco dá contraste ~1,9:1. Reprova WCAG AA e some na impressão P&B. Sobre
fundo claro ele aparece só como filete, barra e rótulo curto em caixa alta (verde apoio); como
texto, só na capa e na contracapa, sobre o fundo escuro.

## Tipografia

**Work Sans**, embutida no DOCX (`assets/fontes/*.ttf`, passadas em `fonts` do `Document`). Sem
a incorporação o Word troca a fonte em máquina sem Work Sans e as quebras de linha deslocam.

O padrão 2026 não usa negrito sintético: ênfase é a família **Work Sans SemiBold**. No gerador,
`t(texto, { bold: true })` já troca a fonte — não passar `bold` direto para `TextRun`.

| Elemento | size (half-points) | Fonte | Cor |
|---|---|---|---|
| Capa — título (2 linhas) | 48 | Work Sans Light, caixa alta | `GREEN` |
| Capa — nome da demanda | 48 | SemiBold, caixa alta | branco |
| H1 | 34 | SemiBold, caixa alta | `NAVY` |
| H2 | 25 | SemiBold | `NAVY` |
| H3 | 21 | SemiBold | `SLATE` |
| Corpo | 21 | Work Sans | `NAVY` |
| Tabela | 18 | Work Sans (cabeçalho SemiBold branco em caixa alta) | `NAVY` |
| Cabeçalho — rótulos | 13 | SemiBold, caixa alta | `GREEN_APOIO` |
| Cabeçalho — valores | 15 | Work Sans | `NAVY` |
| Rodapé | 14 | Work Sans | `LABEL` |

## Página

A4 (11906 × 16838 twips). Três seções:

| Seção | Margens (topo / laterais / base) | Cabeçalho / rodapé |
|---|---|---|
| Capa | 6200 / 1304 / 1300 | vazios; fundo `capa-2026.jpg` sangrando a página |
| Corpo | 2350 / 1304 / 1300 (`header` 500, `footer` 560) | tabela DSTECH / filete verde + paginação |
| Contracapa | 6600 / 1304 / 1300 | vazios; fundo `contracapa-2026.jpg` + `logo-sankhya-branco.png` |

Largura útil **9298 twips** (era 8506 na v.3). Larguras de coluna herdadas da v.3 passam por
`escala()`; `quadros[].larguras` do JSON também — o JSON pode continuar somando 8506.

## Capa

Título em duas linhas finas verdes, nome da demanda (`subtitulo`) em branco, e a faixa de campos
com filete verde: **Cliente** (identificação), **Versão** (`cabecalho.versao` — versão do
documento), **Data** (`Data` ou `Data da análise`), **Responsável** (`Orçamento Realizado por`,
`Analista` ou `cabecalho.elaborador`).

## Cabeçalho do corpo (tabela DSTECH v.4)

```
[logo Sankhya]                                 DELIVERY SERVICE TECH
ELABORADOR  | <cabecalho.elaborador> | VERSÃO     | 4.0
APROVADOR   | <cabecalho.aprovador>  | PUBLICAÇÃO | 30/09/2026
```

Colunas 1900 / 3200 / 1700 / resto; rótulo com fundo `ZEBRA`. **Versão e publicação são do
layout** (constantes `VERSAO_LAYOUT` e `DATA_PUBLICACAO_LAYOUT`), iguais em todo documento
gerado — nunca a versão ou a data do orçamento. A versão do documento vai na capa.

## Rodapé do corpo

Filete verde no topo; `SANKHYA | Documento de uso interno e do cliente` à esquerda e
`PÁGINA X DE Y` à direita (tabulação em `CW`).

## Armadilha do gerador

`ImageRun` exige `type` (`"png"` ou `"jpg"`). Sem isso o docx-js grava a mídia como
`.undefined`, o `[Content_Types].xml` fica sem a extensão e o **Word abre com "arquivo
corrompido"** — mesmo com o `validate.py` passando.
