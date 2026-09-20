/** @author João Coluci **/
# Padrão visual do documento

Duas fontes, ambas obrigatórias:

- **Cores e tipografia** — Brandbook Sankhya 2023 (`02. BRANDBOOK SANKHYA 2023 SIMPLIFICADO.pdf`,
  Guia visual de comunicação v3.0, e `CORES SANKHYA.txt`), em
  `G:\Drives compartilhados\Sankhya Marketing\01. GUIDES\`.
- **Cabeçalho, rodapé, margens** — `DSTECH - Modelo de Evidências de Entrega de Customização v.3.docx`,
  em `G:\Drives compartilhados\Delivery Service - Tech\6. GESTAO\DSTECH 2.0\Novos Modelos de Documento\`.

## Cores

Paleta do brandbook. Nada fora dela.

| Cor de marca | Hex | Uso no DOCX | Const no gerador |
|---|---|---|---|
| Verde | `#66CC66` | **só filete e barra lateral** — nunca texto | `GREEN` |
| Petróleo | `#2E3C50` | título, subtítulo, H1, H2, horas, totais, fundo do cabeçalho de tabela | `NAVY` |
| Cinza claro | `#EDEDED` | zebra das tabelas, caixa de observação, caixa de total geral | `ZEBRA` |
| Cinza escuro | `#808285` | bordas de célula | `GREY` |
| — | `#666666` | rótulos do cabeçalho e paginação (valor herdado do modelo DSTECH) | `LABEL` |
| — | `#000000` | corpo de texto (igual ao modelo DSTECH) | `TEXT` |

### Por que o verde não vira texto

`#66CC66` sobre branco dá contraste ~2,2:1. Reprova WCAG AA (mínimo 4,5:1) e some quando o
cliente imprime em preto e branco. Ele entra só como filete sob o subtítulo e barra lateral
das caixas de destaque. Onde antes havia azul (`#0EA5E9`, cor do site, fora do brandbook),
agora é petróleo — a hierarquia vem do tamanho, não de uma segunda cor. É o que o modelo
DSTECH faz: Heading1 e Heading2 usam o mesmo `#2E3C50`.

## Tipografia

O brandbook pede **Work Sans** (títulos) e **Roboto** (corpo). O DOCX usa **Arial**.

Motivo: nenhuma das duas é fonte padrão do Windows/Office. O orçamento vai para o cliente, e
em máquina sem a fonte o Word substitui por métrica diferente sem avisar — as quebras de linha
deslocam. O próprio modelo DSTECH v.3 resolve assim: embute Roboto para os textos legados, mas
o `docDefaults` do arquivo é Arial. O padrão Sankhya entra pela paleta.

Escala em uso (half-points do docx-js):

| Elemento | size | Peso | Cor |
|---|---|---|---|
| Título | 40 (20pt) | bold | `NAVY` |
| Subtítulo | 26 (13pt) | bold | `NAVY` + filete verde |
| H1 | 28 (14pt) | bold | `NAVY` |
| H2 | 24 (12pt) | bold | `NAVY` |
| Corpo | 22 (11pt) | regular | `TEXT` |
| Horas do item | 22 (11pt) | bold | `NAVY` |
| Total do escopo | 26 (13pt) | bold | `NAVY` |
| Total geral | 28 (14pt) | bold | `NAVY` |
| Cabeçalho — área | 20 (10pt) | bold | `NAVY` |
| Cabeçalho — rótulos e valores | 16 (8pt) | regular | `LABEL` |
| Paginação | 16 (8pt) | regular | `LABEL` |

## Página (modelo DSTECH v.3)

A4 (11906 × 16838 twips). Margens: topo e base 1417, laterais 1700, `header` 0, `footer` 720.
Largura útil **8506 twips** — era 9026 no layout anterior; toda largura de coluna foi refeita.

`titlePage: true` — a primeira página tem cabeçalho e rodapé próprios.

## Cabeçalho e rodapé

As quatro faixas gráficas são as imagens do modelo, copiadas para `assets/`. Todas são
flutuantes, atrás do texto, ancoradas na coluna, e sangram para fora da margem esquerda
(offsets em EMU iguais aos do arquivo original — não recalcular "para arredondar").

| Posição | Arquivo | Origem no modelo | Extensão (EMU) | Offset x, y (EMU) |
|---|---|---|---|---|
| Cabeçalho da 1ª página | `cabecalho-capa.png` | `image4.png` | 7581900 × 1185863 | −1079998, 1 |
| Cabeçalho das demais | `cabecalho-padrao.png` | `image5.png` | 7479882 × 414338 | −1076322, 1 |
| Rodapé da 1ª página | `rodape-capa.png` | `image2.png` | 7581900 × 855931 | −1076322, −126760 |
| Rodapé das demais | `rodape-padrao.png` | `image1.png` | 7572375 × 658544 | −1076322, 1 |

`logo-sankhya.png` (`image3.png`, 59 × 34 px) vai na primeira célula da tabela de cabeçalho.

**Cabeçalho das páginas 2+**: faixa fina, três parágrafos vazios de 10pt para empurrar o
conteúdo abaixo dela, e a tabela de 4 colunas (1530 / 3810 / 1335 / 1815 dxa, bordas pontilhadas
pretas, margens de célula 100):

```
[logo Sankhya] | Delivery Service Tech (bold, NAVY, 10pt, centralizado, 3 colunas)
Elaborador     | <valor>  | Versão        | <valor>
Aprovador      | <valor>  | Data Revisão  | <valor>
```

Os valores vêm do bloco `cabecalho` do JSON. Essa tabela descreve o **documento**; a tabela de
identificação do corpo descreve a **demanda** (ID DSTech, cliente, consultor). São coisas
diferentes — não fundir.

**Rodapé da 1ª página**: só a faixa, sem paginação. **Demais páginas**: número da página
alinhado à direita, 8pt `#666666`, sobre a faixa.

## Armadilha do gerador

`ImageRun` exige `type: "png"`. Sem isso o docx-js grava a mídia como `.undefined`, o
`[Content_Types].xml` fica sem a extensão e o **Word abre com "arquivo corrompido"** — mesmo
com o `validate.py` passando. O validador não pega esse caso.
