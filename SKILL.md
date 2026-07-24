---
name: orcamento-horas-docx
description: >
  Gera o documento de ORÇAMENTO DE HORAS em DOCX no layout padrão Sankhya (OS 3007):
  título navy + subtítulo azul, tabela de identificação, resumo em tabela, um bloco por
  escopo com itens de desenvolvimento (horas cravadas em azul + subitens em bullet),
  subtotal, tabela de fases (Alinhamento/Homologação/Documentação), total por escopo,
  resumo consolidado, caixa de "Total geral", pontos a definir, escopo negativo e premissas.
  Use SEMPRE que o usuário pedir para gerar/exportar em DOCX um "orçamento de horas",
  "estimativa de horas em Word", "orçamento Sankhya", "proposta de horas", ou logo após a
  skill sankhya-estimativa-planejador calcular as horas, ou quando a skill sankhya-gera-escopo
  precisar do modelo enxuto de "orçamento de horas" (em vez do escopo técnico de 19 seções).
  Linguagem funcional, horas cravadas (sem faixas), sem tópicos de confiança/abordagem/stack.
---

# Orçamento de Horas em DOCX (layout padrão Sankhya)

## Quando usar

- Usuário pede o **orçamento/estimativa de horas em DOCX/Word**.
- **Depois** da `sankhya-estimativa-planejador` produzir as horas por rotina/fase → renderizar o entregável neste layout.
- Quando a `sankhya-gera-escopo` for acionada mas o usuário quiser o **modelo enxuto de orçamento de horas**, não o escopo técnico completo.

Este é o layout aprovado na OS 3007. Não recriar estilos ad hoc — usar o gerador abaixo.

## O que o layout contém (ordem fixa)

1. Título (navy) + subtítulo (azul com régua) + tabela de identificação
2. `1. Resumo` — parágrafo + tabela Rotina/Descrição
3. Um bloco H1 por escopo (nova página): `Desenvolvimento` (itens com horas cravadas em azul + subitens), subtotal, `Demais fases` (Alinhamento/Homologação/Documentação), Total do escopo
4. `Resumo consolidado` — tabela por fase × escopo + caixa **Total geral**
5. `Pontos a definir com o cliente`
6. `Escopo negativo (não contemplado)`
7. `Premissas`

Rodapé com paginação em todas as páginas. Página A4, fonte Arial, tabelas com zebra e cabeçalho azul-claro.

## Regras de conteúdo

- **Horas cravadas, sem faixas.** Se a estimativa vier em faixa (ex.: 60–90h), cravar pela **média**.
- **Linguagem funcional**, público misto. Remover nomes internos (TGFCAB, TGFFIN, "de-para", "staging", "idempotência", "rollback").
- **Não incluir** confiança da estimativa, abordagem técnica nem stack de frontend — são notas internas, não vão no orçamento.
- Fases padrão por escopo: **Alinhamento / Homologação / Documentação** (+ Desenvolvimento).
- **Cabeçalho (tabela de identificação)** — rótulos e valores fixos:
  - Usar **`ID DSTech`** (nunca "Chamado / OS" nem "OS").
  - **`Responsável`** é sempre **`João Coluci`**, salvo se o usuário informar outro nome.

## Fluxo

1. Montar o JSON de conteúdo conforme `references/schema-orcamento.md` (modelo em `examples/orcamento-exemplo.json`). Salvar em local temporário.
2. Garantir o pacote `docx` global: `npm ls -g docx || npm install -g docx`.
3. Gerar:

```bash
export NODE_PATH="$(npm root -g)"
node "$HOME/.claude/skills/orcamento-horas-docx/scripts/gerar-orcamento-docx.js" \
  --content /caminho/dados.json \
  --output "/caminho/Orcamento Nome da Demanda.docx"
```

No Windows/Git Bash o `$HOME` resolve para `C:\Users\<user>`. Caminho absoluto do script:
`C:\Users\joao.filho_sankhya\.claude\skills\orcamento-horas-docx\scripts\gerar-orcamento-docx.js`

4. Validar (o validador quebra com cp1252 no Windows — forçar UTF-8):

```bash
export PYTHONUTF8=1
python "$HOME/.claude/skills/docx/scripts/office/validate.py" "/caminho/Orcamento.docx"
```

Esperado: `All validations PASSED!`.

## Cuidados

- Se o DOCX estiver **aberto no Word**, a gravação falha com `EBUSY` — pedir para fechar e regerar.
- Não guardar dados reais de cliente na skill; `examples/` é genérico.
- Cálculo de horas é responsabilidade da `sankhya-estimativa-planejador`; esta skill só **renderiza** o resultado no layout.

## Recursos

- `scripts/gerar-orcamento-docx.js` — gerador (docx-js), lê JSON, emite DOCX.
- `references/schema-orcamento.md` — schema do JSON de entrada.
- `examples/orcamento-exemplo.json` — modelo genérico.
