# Schema do JSON de Orçamento de Horas

Entrada do gerador `scripts/gerar-orcamento-docx.js`. Todos os campos são opcionais — o que faltar é omitido do documento. Ordem das seções é fixa (identificação → resumo → bloco único → consolidado → pontos a definir → escopo negativo → premissas).

> **Bloco único:** `escopos` tem sempre **um** objeto. Os assuntos viram grupos H3 dentro dele, e as fases (Alinhamento/Homologação/Documentação) aparecem uma vez só, cobrindo o todo. Ver §Bloco único no `SKILL.md`.

## Campos de topo

| Campo | Tipo | Uso |
|---|---|---|
| `titulo` | string | Título grande (petróleo). Default e valor padronizado: **"Detalhamento do Orçamento de Horas"** — não trocar. |
| `subtitulo` | string | Subtítulo (petróleo) com filete verde. Nome da demanda. |
| `cabecalho` | objeto | Tabela do cabeçalho das páginas 2+ (modelo DSTECH). Ver abaixo. |
| `identificacao` | `[[campo, valor], ...]` | Tabela de identificação no corpo (2 colunas). Rótulos padrão: `Cliente`, `ID DSTech`, `Data`, `Consultor Funcional`, `Orçamento Realizado por`. `Consultor Funcional` = autor extraído do escopo lido; sem autor identificável, **omitir a linha**. `Orçamento Realizado por` é sempre `João Coluci` e obrigatório em todo documento. |

Não existe mais o campo `rodape`: o rodapé segue o modelo DSTECH — faixa gráfica e número da
página, sem texto livre.

## `cabecalho`

Alimenta a tabela repetida no topo das páginas 2 em diante. Descreve o **documento**, não a
demanda — a identificação da demanda continua na tabela do corpo.

| Campo | Default | Uso |
|---|---|---|
| `area` | `Delivery Service Tech` | Faixa superior da tabela, ao lado do logo. |
| `elaborador` | `João Coluci` | Quem redigiu o orçamento. |
| `versao` | `1.0` | Versão do documento. |
| `aprovador` | `Plinio Silva` | Aprovador do documento. |

"Data Revisão" não é campo do JSON: refere-se à revisão do **layout** do modelo DSTECH, fixa em
`03/07/2026` (constante `DATA_REVISAO_LAYOUT` no gerador). Nunca usar a data do orçamento ali —
se o JSON traz `dataRevisao`, o gerador ignora.

## `resumo`
- `titulo` (string), `intro` (string parágrafo), `rotinas`: `[[assunto, descrição], ...]` → tabela de 2 colunas. A 1ª coluna usa os **mesmos nomes dos grupos H3** do desenvolvimento, na mesma ordem.
- O gerador insere uma linha em branco entre o `intro` e a tabela, e outra entre a tabela e as observações.

## `observacao` / `observacoes` (opcional)
- `titulo` (string, default "Observação") + `texto` (string). Renderiza um bloco destacado (fundo cinza claro, barra verde à esquerda) logo após o Resumo e antes dos escopos — usar para premissa de dimensionamento (ex.: "estimativa considera uso das rotinas nativas de X").
- `observacoes` aceita uma lista desses objetos quando houver mais de uma; o gerador separa cada bloco por uma linha em branco.

## `escopos` — lista de **um** objeto

- `nome`: título H1 (inicia em nova página). Ex.: "2. Escopo do desenvolvimento".
- `intro`: parágrafo de contexto.
- `tituloDesenv`: H2 (ex.: "2.1 Desenvolvimento").
- `desenvolvimento`: lista de `{ item, horas, subs[] }`. `item` e `horas` em negrito petróleo na mesma linha; cada `sub` vira bullet.
  - Entrada `{ grupo, subtotal }` (sem `item`/`horas`) vira um H3 que separa os itens por assunto, com o subtotal do grupo ao lado. **Obrigatória sempre que o documento de escopo lido traz classificação de assunto** — os títulos e a ordem são os mesmos do escopo, para o leitor localizar a tela, botão, dashboard, relatório ou rotina. Sem classificação no fonte, agrupar por tipo de artefato (Telas · Botões e ações · Rotinas e processos · Dashboards · Relatórios · Integrações). Reiniciar a letra dos itens (`a)`, `b)`, ...) a cada grupo, e repetir os mesmos títulos no `resumo.rotinas` e nos `pontosDefinir`.
- `subtotalDevLabel` + `subtotalDev`: linha de subtotal (tabela 2 colunas, valor à direita). Rótulo sem número de escopo: `Subtotal Desenvolvimento`.
- `tituloFases` + `fases`: H2 + tabela `[[fase, horas], ...]`. Aparece **uma vez** no documento: `Alinhamento / definições`, `Homologação`, `Documentação`. `Treinamento` e `Produção e acompanhamento` só entram quando solicitados; não pedidos, a linha não existe.
- `totalLabel` + `total`: linha "Total do orçamento: XXh" (navy, destaque).
- `quadros` (opcional): lista de `{ titulo, intro?, colunas[], linhas[][], larguras?, posicao? }`. Cada entrada vira um H2 seguido de tabela descritiva. `posicao: "antes"` renderiza logo após a intro do escopo, antes da lista de itens — use quando o quadro é o **contexto** que o leitor precisa para entender o que vem a seguir (a composição do anexo que está sendo orçado). Omitido, renderiza entre o subtotal de desenvolvimento e as fases, para quadro que **complementa** a lista. **Sem horas** — serve para expor a composição de um anexo estruturado que o cliente entregou (planilha oficial de órgão regulador, layout de arquivo, matriz de integração), dizendo item a item o que entra e o que fica de fora. Use quando o anexo tem partes cujo destino o leitor não adivinha pelo subtotal; um escopo sem anexo desses não recebe quadro. `larguras` em dxa somando 8506; omitido, divide igualmente.
- `naoEscopo`: **não usar.** Campo legado do formato multi-escopo; com bloco único tudo vai na seção global `escopoNegativo`.

## `consolidado`
- `titulo`: H1 (nova página).
- `colunas`: `["Fase", "Horas"]` — bloco único não tem matriz fase × escopo. Largura calculada automaticamente (1ª coluna 3406 dxa, demais dividem o resto de 8506); o gerador ainda suporta mais colunas, mas o padrão do documento é duas.
- `linhas`: matriz de strings (mesmo nº de colunas), uma linha por fase existente.
- `totalRowIndex`: índice (0-based) da linha "Total" — recebe destaque.
- `totalGeral`: caixa centralizada de destaque (ex.: "Total geral: 267 horas").

## `pontosDefinir`
- `titulo` (H1) + `grupos`: `[{ nome, itens[] }, ...]`. `nome` em negrito, `itens` numerados (reinicia por grupo? não — numeração contínua; para reiniciar, gere títulos separados).

## `escopoNegativo`
- `titulo` (H1) + `itens`: cada item pode ser string simples ou `{ bold, texto }` (prefixo em negrito + complemento).
- Seção sempre presente e única. Havendo vários assuntos, prefixar cada item com o nome do grupo correspondente (no `bold`), para o leitor ligar a exclusão ao assunto.

## `premissas`
- `titulo` (H1) + `itens`: lista de bullets.

## O que passa pelo humanizer antes de entrar no JSON

Passa: `resumo.intro` · `escopos[].intro` · `resumo.rotinas[]` (2ª coluna, descrição) · `escopos[].desenvolvimento[].item` e `.subs[]` · `observacao.texto` · `pontosDefinir.grupos[].itens[]` · `escopoNegativo.itens[]` e `escopos[].naoEscopo.itens[]` (inclusive o `texto` dos itens com `bold`) · `premissas.itens[]`.

**Não passa** — reescrever aqui quebra o documento: rótulos fixos da identificação (`ID DSTech`, `Consultor Funcional`, `Orçamento Realizado por`) · nomes de escopo, rotina e fase · qualquer valor numérico (horas, subtotais, totais, `totalGeral`) · títulos de seção padronizados.

As regras de conteúdo do `SKILL.md` prevalecem sobre as preferências do humanizer: linguagem funcional, sem nome interno de tabela, sem faixa de horas. Se o humanizer sugerir cortar o motivo de um item de não escopo por verbosidade, **ignorar** — o motivo é obrigatório.
