# Schema do JSON de Orçamento de Horas

Entrada do gerador `scripts/gerar-orcamento-docx.js`. Todos os campos são opcionais — o que faltar é omitido do documento. Ordem das seções é fixa (identificação → resumo → escopos → consolidado → pontos a definir → escopo negativo → premissas).

## Campos de topo

| Campo | Tipo | Uso |
|---|---|---|
| `titulo` | string | Título grande (navy). Default "Orçamento de Horas". |
| `subtitulo` | string | Subtítulo (azul) com linha inferior. Nome da demanda. |
| `rodape` | string | Texto do rodapé (antes de "Página N"). |
| `identificacao` | `[[campo, valor], ...]` | Tabela de identificação (2 colunas). Rótulos padrão: `Cliente`, `ID DSTech`, `Data`, `Responsável`. O responsável é `João Coluci` por padrão. |

## `resumo`
- `titulo` (string), `intro` (string parágrafo), `rotinas`: `[[rotina, descrição], ...]` → tabela de 2 colunas.

## `escopos` — lista, um objeto por escopo
- `nome`: título H1 (sempre inicia em nova página). Ex.: "2. Escopo 1 — ...".
- `intro`: parágrafo de contexto.
- `tituloDesenv`: H2 (ex.: "2.1 Desenvolvimento").
- `desenvolvimento`: lista de `{ item, horas, subs[] }`. `item` em negrito + `horas` em azul na mesma linha; cada `sub` vira bullet.
- `subtotalDevLabel` + `subtotalDev`: linha de subtotal (tabela 2 colunas, valor à direita).
- `tituloFases` + `fases`: H2 + tabela `[[fase, horas], ...]`.
- `totalLabel` + `total`: linha "Total Escopo N: XXh" (navy, destaque).

## `consolidado`
- `titulo`: H1 (nova página).
- `colunas`: cabeçalho, ex.: `["Fase", "Escopo 1", "Escopo 2"]`. Largura calculada automaticamente (1ª coluna 3626 dxa, demais dividem o resto). Suporta 2+ escopos.
- `linhas`: matriz de strings (mesmo nº de colunas).
- `totalRowIndex`: índice (0-based) da linha "Total por escopo" — recebe destaque.
- `totalGeral`: caixa centralizada de destaque (ex.: "Total geral: 267 horas").

## `pontosDefinir`
- `titulo` (H1) + `grupos`: `[{ nome, itens[] }, ...]`. `nome` em negrito, `itens` numerados (reinicia por grupo? não — numeração contínua; para reiniciar, gere títulos separados).

## `escopoNegativo`
- `titulo` (H1) + `itens`: cada item pode ser string simples ou `{ bold, texto }` (prefixo em negrito + complemento).

## `premissas`
- `titulo` (H1) + `itens`: lista de bullets.

## Convenções de conteúdo (orçamento, não escopo técnico)
- Horas **cravadas** (sem faixas). Se a estimativa vier em faixa, cravar pela média.
- Linguagem **funcional**, sem nomes de tabela/coluna internos (TGFCAB, TGFFIN, "de-para", "staging"). Público misto.
- Não incluir "confiança", "abordagem técnica" nem "stack de frontend" no orçamento — são notas internas.
- Fases fixas por escopo: Alinhamento / Homologação / Documentação (além do Desenvolvimento).
