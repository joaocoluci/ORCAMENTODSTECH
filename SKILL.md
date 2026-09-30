---
name: orcamento-horas-docx
description: >
  Gera o DOCX "Detalhamento do Orçamento de Horas" no padrão Sankhya (modelo DSTECH
  v.4 sobre o Modelo de Documento Padrão Sankhya 2026: capa, cabeçalho, rodapé e contracapa; bloco único com itens agrupados por assunto e horas cravadas,
  fases, consolidado, pontos a definir, escopo negativo e premissas). Acionar para "orçamento de horas",
  "estimativa de horas em Word", "orçamento Sankhya", "proposta de horas", ou logo após a
  sankhya-estimativa-planejador calcular as horas. Só renderiza — o cálculo é da skill de
  estimativa; o escopo redigido é de outra skill.
---

# Detalhamento do Orçamento de Horas em DOCX

Renderiza o orçamento no layout acordado: **modelo DSTECH v.4** (capa, cabeçalho, rodapé e contracapa) com cores e tipografia do **Modelo de Documento Padrão Sankhya 2026**. Não recriar estilos ad hoc — usar o gerador.

O cálculo das horas é responsabilidade da `sankhya-estimativa-planejador`; esta skill só renderiza o resultado.

## Ordem fixa das seções

1. Título **"Detalhamento do Orçamento de Horas"** (fixo) + subtítulo com o nome da demanda (filete verde) + tabela de identificação
2. `1. Resumo` — parágrafo + tabela Assunto/Descrição
3. **Um único bloco H1** (novo `escopos[0]`, em nova página): `Desenvolvimento` com os itens agrupados em H3 por assunto, subtotal geral, `Demais fases` (Alinhamento/Homologação/Documentação), Total do orçamento
4. `Resumo consolidado` — tabela `Fase | Horas` + caixa **Total geral**
5. `Pontos a definir com o cliente`
6. `Escopo negativo (não contemplado)`
7. `Premissas`

## Bloco único — obrigatório

O documento tem **sempre um só bloco**: `escopos` é uma lista de **um** objeto. Não gerar "Escopo 1 / Escopo 2", nem repetir fases por bloco.

Motivo: alinhamento, homologação e documentação são esforço do **todo**, não de cada assunto. Fatiar em vários escopos duplica essas fases e infla o total sem nada entregar a mais.

Consequências no JSON:
- `escopos[0].fases` aparece **uma vez**, no fim do bloco, cobrindo o documento inteiro.
- `consolidado.colunas` = `["Fase", "Horas"]` — não existe matriz fase × escopo.
- `escopos[].naoEscopo` **não se usa**; tudo vai na seção global `escopoNegativo`.
- Rótulos sem número de escopo: `Subtotal Desenvolvimento`, `Total do orçamento:`.

**Exceção — entregas contratáveis em separado.** Dois blocos só quando o usuário pedir a segregação e as partes puderem ser contratadas isoladamente (obrigações regulatórias distintas, prazos distintos, uma podendo cair sem derrubar a outra). Nesse caso cada bloco leva alinhamento, homologação e documentação **próprios, repartidos** — nunca as mesmas horas repetidas nos dois — e o `consolidado` vira matriz `Fase | Bloco A | Bloco B | Total`. Segregar sem repartir as fases é o erro que a regra do bloco único existe para evitar.

## Estrutura por assunto

Ler o documento de escopo antes de montar o JSON. **Tem classificação de assunto** (seções, capítulos ou numeração por tema) → o orçamento repete **os mesmos títulos, na mesma ordem**, como H3 dentro do bloco, via entradas `{ grupo, subtotal }` do `desenvolvimento`. Assim o leitor acha no orçamento a tela, botão, dashboard, relatório ou rotina que leu no escopo, sem caçar.

**Sem classificação no documento fonte** → agrupar por tipo de artefato, nesta ordem: Telas · Botões e ações · Rotinas e processos · Dashboards · Relatórios · Integrações.

Os mesmos nomes de grupo se repetem em `resumo.rotinas`, nos H3 do `desenvolvimento` e nos `pontosDefinir.grupos[].nome`. Nome divergente entre as seções quebra a localização e é o erro mais comum aqui. Letra dos itens (`a)`, `b)`, ...) reinicia a cada grupo.

## Regras de conteúdo

- **Horas cravadas, sem faixas.** Estimativa em faixa (60–90h) → cravar pela média.
- **Linguagem funcional**, público misto. Remover nome interno de tabela e jargão ("TGFCAB", "de-para", "staging", "idempotência", "rollback").
- **Nunca citar banco de dados no documento.** Nada de "Oracle", "SQL Server", "dual-dialeto", "compatível com os dois bancos" ou variação. A entrega é a mesma para qualquer banco, e expor a diferença sugere ao cliente que existem duas versões do produto. O esforço de compatibilidade continua dentro da hora do item, só não aparece como subitem.
- **Não incluir** confiança da estimativa, abordagem técnica nem stack de frontend — são notas internas.
- **Nunca expor a base de cálculo das horas.** Complexidade adotada (baixa/média/alta), fator, multiplicador, produtividade, LOC e âncora de calibração são de uso **interno**: entram na conta, não no documento. Vale para todas as seções, inclusive `Premissas` e `Observação` — premissa do tipo "as horas consideram complexidade baixa em todos os itens" põe o cliente a discutir o método em vez do escopo, e vira munição de renegociação quando um item se mostra mais trabalhoso.
- Fases do documento: **Alinhamento / Homologação / Documentação** (+ Desenvolvimento), uma vez só, no bloco único.
- **Documentação:** metade do que a estimativa alocava antes, **mínimo 1h**. Documento de entrega é gerado com apoio de skill, não custa o que custava.
- **Treinamento e Produção/acompanhamento só entram quando solicitados** pelo usuário ou pelo escopo. Não pedidos → nem linha com 0h; a fase simplesmente não existe no documento.
- **Onde vai o não escopo:** sempre na seção global `escopoNegativo`, no fim. Com bloco único não há `naoEscopo` por escopo.
- Item de não escopo por **inviabilidade técnica** sempre declara o **motivo** — o que o produto padrão não faz e por quê. Sem motivo, o cliente lê como falta de vontade.
- **Cláusula de coletor WMS e aplicativo móvel — condicional, não fixa.** Só entra quando o escopo lido encosta na camada de coletor ou de aplicativo móvel: pedido de tela de coletor, alteração de função nativa do coletor, app de celular, ou processo operacional que hoje roda por coletor (conferência, separação, inventário, movimentação, endereçamento). Nesses casos o item declara a consequência operacional (qual etapa passa a usar o comportamento padrão e o que o cliente perde), nunca só a frase de recusa. Texto base: "Telas novas de coletor e alteração das funções nativas do coletor WMS. Não há personalização de aplicativo móvel nesta entrega. As rotinas de coletor permanecem no comportamento padrão do WMS." Regras, validações e rotinas de retaguarda do Sankhya continuam no escopo — o corte é a camada do coletor. **Escopo que não toca coletor nem aplicativo móvel não recebe a cláusula.** Negar o que ninguém pediu enche o escopo negativo de ruído e sugere ao cliente que o assunto estava em discussão.
- **Tabela de identificação:** usar `ID DSTech` (nunca "Chamado/OS"). `Consultor Funcional` = autor do escopo lido (extrair de `Autor`, `Consultor`, `Responsável`, `Elaborado por` ou dos metadados do arquivo); **sem autor identificável, omitir a linha inteira** — não deixar em branco nem chutar nome. `Orçamento Realizado por` é sempre `João Coluci`, linha obrigatória, salvo se o usuário informar outro nome. O rótulo `Responsável` foi aposentado.

## Humanizer — obrigatório

**Todo texto redigido passa pela skill `humanizer` antes de virar JSON** (antes, não depois: revisar JSON montado arrisca reescrever rótulo e número). Orçamento com cara de texto de IA queima a credibilidade da estimativa na primeira leitura do cliente.

Lista exata de campos que passam e que não passam: `references/schema-orcamento.md`.

## Padrão visual

Paleta e tipografia já fixadas nas constantes do gerador — **não sobrescrever por documento**. Navy `#212F41` em texto/títulos/horas/totais; verde `#00D666` só como filete, barra e texto sobre fundo escuro (contraste 1,9:1 no branco); verde apoio `#00CD5E` em rótulos e marcadores; zebra `#F3F3F3`; **Work Sans embutida** no DOCX (`assets/fontes`), ênfase em Work Sans SemiBold em vez de negrito.

A4, três seções (capa, corpo, contracapa), margens, tabela de cabeçalho e escala tipográfica: `references/design-sankhya.md`.

Duas tabelas distintas, não fundir: o bloco `cabecalho` do JSON descreve o **documento** (Elaborador/Aprovador, defaults `João Coluci` e `Plinio Silva`). No cabeçalho, **Versão 4.0** e **Publicação 30/09/2026** são do layout DSTECH v.4, fixas no gerador — nunca a versão ou a data do orçamento; `cabecalho.versao` (default `1.0`) vai para a capa. A tabela de identificação do corpo descreve a **demanda** (ID DSTech, cliente, consultor). Capa e contracapa sem cabeçalho e rodapé.

## Fluxo

0. Ler o documento de escopo da pasta indicada e extrair a **classificação de assunto** — ela define os grupos H3 do bloco único (§Estrutura por assunto).
1. Redigir os textos.
2. Passar cada texto pelo **`humanizer`**.
3. Montar o JSON conforme `references/schema-orcamento.md` (modelo em `examples/orcamento-exemplo.json`) e salvar em local temporário.
4. Garantir o pacote e gerar:

```bash
npm ls -g docx || npm install -g docx
export NODE_PATH="$(npm root -g)"
node "$HOME/.claude/skills/orcamento-horas-docx/scripts/gerar-orcamento-docx.js" \
  --content /caminho/dados.json \
  --output-dir "/caminho/da/pasta/da/DS"
```

**Nome do arquivo padronizado:** `ORCAMENTO - ID DSTECH <id> - <CLIENTE>.docx` (ex.: `ORCAMENTO - ID DSTECH 3457 - NEXXERA.docx`). O gerador monta o nome a partir da `identificacao`: `ID DSTech` entra **exatamente como está** (sem zero à esquerda, sem formatação — `3457` vira `3457`); `Cliente` entra em maiúsculas, sem acento e sem caractere inválido no Windows (`< > : " / \ | ? *`). Falta de qualquer um dos dois faz o gerador parar com erro. Usar sempre `--output-dir`. `--output` com nome livre existe só para teste. Documento antigo com outro nome na pasta da DS: substituir pelo novo, não deixar os dois.

**Capa:** mostra `ID DSTech`, Cliente, Versão, Data e Responsável. O ID vem da `identificacao`; sem ele, o campo some da capa.

5. Validar (forçar UTF-8; o validador quebra com cp1252 no Windows):

```bash
export PYTHONUTF8=1
python "$HOME/.claude/skills/docx/scripts/office/validate.py" "/caminho/Orcamento.docx"
```

Esperado: `All validations PASSED!`.

## Cuidados

- DOCX **aberto no Word** → gravação falha com `EBUSY`; pedir para fechar e regerar.
- Ao mexer nas imagens do cabeçalho/rodapé, todo `ImageRun` precisa de `type: "png"`. Sem isso o Word abre com **"arquivo corrompido"** e o `validate.py` **passa mesmo assim** — não confiar nele para esse caso.
- O pacote `docx` grava o `fontKey` das fontes embutidas em minúsculas e o `validate.py` reprova. O gerador corrige isso sozinho antes de gravar (`corrigirFontKeys`, via o `jszip` que vem com o `docx`) — não remover.
- Não guardar dado real de cliente na skill; `examples/` é genérico.

## Recursos

`scripts/gerar-orcamento-docx.js` gerador · `references/schema-orcamento.md` schema do JSON + campos do humanizer · `references/design-sankhya.md` paleta, tipografia, cabeçalho/rodapé · `assets/` fundos de capa/contracapa, logos e fontes Work Sans do modelo DSTECH v.4 · `examples/orcamento-exemplo.json` modelo genérico.

Fontes do padrão: `Modelo de Documento Padrão Sankhya 2026.docx` e modelos DSTECH v.4 em `G:\Drives compartilhados\Delivery Service - Tech\A. ESTRUTURA SITE\1. MODELO DE DOCUMENTOS\`.
