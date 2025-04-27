# Configuração do XeLaTeX no VS Code (Linux)

Este guia documenta o processo de configuração do XeLaTeX para compilação local usando VS Code.

## Pré-requisitos

1. **Dependências do Sistema**
```bash
sudo apt-get update
sudo apt-get install texlive-xetex texlive-fonts-recommended \
    texlive-fonts-extra texlive-bibtex-extra biber \
    ttf-mscorefonts-installer
sudo fc-cache -f -v
```

2. **VS Code**
   - Instalar a extensão "LaTeX Workshop"

## Configuração do VS Code

1. Abrir as configurações do VS Code:
   - Pressionar `Ctrl + Shift + P`
   - Digitar e selecionar "Open User Settings (JSON)"

2. Adicionar as seguintes configurações:
```json
{
    "latex-workshop.latex.tools": [
        {
            "name": "xelatex",
            "command": "xelatex",
            "args": [
                "-synctex=1",
                "-interaction=nonstopmode",
                "-file-line-error",
                "%DOC%"
            ]
        },
        {
            "name": "biber",
            "command": "biber",
            "args": [
                "%DOCFILE%"
            ]
        }
    ],
    "latex-workshop.latex.recipes": [
        {
            "name": "xelatex -> biber -> xelatex*2",
            "tools": [
                "xelatex",
                "biber",
                "xelatex",
                "xelatex"
            ]
        }
    ],
    "latex-workshop.latex.recipe.default": "xelatex -> biber -> xelatex*2"
}
```

## Explicação da Configuração

- **Tools**: Define as ferramentas básicas de compilação
  - `xelatex`: Compilador principal para o documento
  - `biber`: Processador de bibliografia

- **Recipes**: Define a sequência de compilação
  - Executa XeLaTeX → Biber → XeLaTeX (2x)
  - Múltiplas execuções do XeLaTeX são necessárias para resolver referências

## Uso

1. **Compilar o Documento**
   - Usar `Ctrl + Alt + B`
   - Ou clicar no ícone "Build LaTeX Project"

2. **Limpar Arquivos Temporários**
   - Usar `Ctrl + Alt + C`
   - Ou clicar em "Clean up auxiliary files"

## Solução de Problemas

Se houver problemas com fontes:
1. Verificar se as fontes Microsoft estão instaladas
2. Usar fontes alternativas no documento:
```latex
\setmainfont{Liberation Sans}  % Alternativa à Arial
```

## Notas Importantes

- Esta configuração é específica para Linux
- O XeLaTeX é necessário para suporte adequado a fontes do sistema
- A sequência de compilação (recipe) garante que referências e bibliografia sejam processadas corretamente
