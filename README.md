/** @author João Coluci **/
# orcamento-horas-docx

Skill do Claude Code que gera o documento de **Orçamento de Horas** em DOCX no layout padrão Sankhya.

## Conteúdo

| Arquivo | Função |
|---|---|
| `SKILL.md` | Instruções da skill (quando usar, regras de conteúdo, fluxo). |
| `scripts/gerar-orcamento-docx.js` | Gerador DOCX (docx-js): lê o JSON de conteúdo e emite o arquivo. |
| `references/schema-orcamento.md` | Schema do JSON de entrada. |
| `examples/orcamento-exemplo.json` | Modelo genérico de preenchimento. |

## Instalação em outra máquina

Clonar direto na pasta de skills do Claude Code:

```bash
git clone https://github.com/joaocoluci/ORCAMENTODSTECH.git ~/.claude/skills/orcamento-horas-docx
```

No Windows (PowerShell):

```powershell
git clone https://github.com/joaocoluci/ORCAMENTODSTECH.git "$env:USERPROFILE\.claude\skills\orcamento-horas-docx"
```

Reiniciar o Claude Code para a skill ser carregada.

## Dependências

- **Node.js** com o pacote `docx` global:

```bash
npm ls -g docx || npm install -g docx
```

- Opcional, para validar o DOCX gerado: **Python** + a skill `docx` (`scripts/office/validate.py`).

## Uso

```bash
export NODE_PATH="$(npm root -g)"
node "$HOME/.claude/skills/orcamento-horas-docx/scripts/gerar-orcamento-docx.js" \
  --content /caminho/dados.json \
  --output "/caminho/Orcamento Nome da Demanda.docx"
```

## Atualizar

```bash
cd ~/.claude/skills/orcamento-horas-docx && git pull
```
