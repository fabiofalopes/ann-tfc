
# Plano de Ação: Finalização do Relatório de TFC

## 1. Visão Geral e Estratégia

O objetivo é finalizar o relatório do Trabalho Final de Curso, focando na escrita dos capítulos em falta (**Resultados** e **Conclusão**) e na revisão aprofundada dos capítulos existentes (1 a 6). A estratégia assenta em três pilares:

1.  **Responder ao Feedback:** Abordar sistematicamente cada ponto levantado pelo júri na 2ª avaliação.
2.  **Documentar o Trabalho Feito:** Apresentar de forma clara e profissional a solução implementada, os seus componentes e os dados gerados.
3.  **Argumentação Científica e Técnica:** Fundamentar as nossas conclusões com base nos resultados obtidos e em comparação com o estado da arte (papers de referência).

---

## 2. Estrutura do Relatório e Tarefas Principais

Esta secção detalha as ações necessárias para cada capítulo do relatório, com base no template oficial e no feedback recebido.

### Tarefas de Revisão (Capítulos 1-6)

O objetivo aqui é refinar e atualizar o conteúdo existente, garantindo que reflete o estado final do projeto e que responde ao feedback do júri.

| Capítulo | Ficheiro `.tex` | Ações de Revisão Obrigatórias |
| :--- | :--- | :--- |
| **1. Introdução** | `introducao.tex` | - **Refinar Motivação:** Clarificar a ligação entre a necessidade de ferramentas de anotação (problema) e a nossa solução. <br> - **Atualizar Estrutura:** Garantir que a secção "Estrutura do Documento" reflete o conteúdo final, incluindo os capítulos de Resultados e Conclusão. |
| **2. Pert. e Viabilidade**| `pertinencia-e-viabilidade.tex`| - **Integrar Análise Comparativa:** Rever a análise de benchmarking (`benchmarking.tex`) e garantir que está bem integrada e que a nossa proposta de inovação é clara face às soluções existentes. |
| **3. Espec. e Modelação** | `especificacao-e-modelacao.tex` | - **Atualizar Requisitos:** Criar uma tabela final de requisitos (funcionais e não-funcionais) indicando o estado de implementação (`Cumprido`, `Parcialmente Cumprido`, `Não Cumprido`). Justificar as decisões. <br> - **API e Modelos de Dados:** Adicionar uma secção que descreva a API RESTful e os modelos de dados (Pydantic/SQLAlchemy) como parte da modelação da solução. |
| **4. Solução Proposta** | `solucao-proposta.tex` | - **Detalhar Arquitetura Final:** Atualizar o diagrama de arquitetura (se necessário) e descrever o fluxo de dados final. <br> - **Descrever Tecnologias:** Mencionar a mudança para `asyncpg` (se aplicável) e outras decisões tecnológicas finais. <br> - **Documentar API:** Referenciar a documentação da API (gerada via Postman/OpenAPI) como um entregável técnico. |
| **5. Testes e Validação** | `testes-e-validacao.tex` | - **Ligar aos Requisitos:** Mapear os testes realizados aos critérios de aceitação dos requisitos definidos no Capítulo 3. <br> - **Incluir Testes à API:** Adicionar uma subsecção sobre os testes realizados à API (`api_tests.py`) para validar a lógica de negócio no backend. |
| **6. Método e Planeamento** | `metodo-e-planeamento.tex` | - **Análise Crítica Final:** Fazer uma análise crítica *honesta* do planeamento inicial vs. o que foi realmente executado. Justificar os desvios e as lições aprendidas (responde diretamente ao Jurado 1). |

---

### Tarefas de Escrita (Capítulos 7-8)

Estes capítulos são para serem escritos de raiz e constituem o núcleo da 3ª entrega.

#### **Capítulo 7: Resultados**
*(Ficheiro: `resultados.tex`)*

Este é o capítulo mais importante. Deve "apresentar a ferramenta" e os "dados de forma prática" (feedback do Jurado 2).

**Plano de Conteúdo:**

1.  **Apresentação da Plataforma (Visão Geral):**
    *   **Objetivo:** Descrever sucintamente a aplicação como uma solução completa para o problema de anotação de *chat disentanglement*.
    *   **Recolha de Informação:** Utilizar os screenshots da pasta `sitemap_screenshots` para criar um percurso visual guiado pela aplicação.

2.  **Resultados da Implementação:**
    *   **Métricas de Anotação (IAA):**
        *   **O quê:** Detalhar a implementação do cálculo automático do **1-to-1 agreement**. Explicar a fórmula matemática de forma clara.
        *   **Como:** Apresentar um exemplo prático. Mostrar um screenshot da matriz de similaridade no `AdminProjectPage` e explicar como o valor de IAA é calculado e o que significa.
        *   **Recolha de Informação:** Investigar o ficheiro `annotation-backend/app/crud.py` (procurar por `calculate_inter_annotator_agreement` ou similar) para obter a lógica exata da implementação.
    *   **Gestão de Projetos e Utilizadores:**
        *   **O quê:** Demonstrar as funcionalidades de administração (criação de projetos, atribuição de utilizadores, upload de dados).
        *   **Recolha de Informação:** Basear-se nas vistas `AdminDashboard.js` e `AdminProjectPage.js`.
    *   **Importação e Exportação de Dados:**
        *   **O quê:** Descrever os formatos suportados (CSV, **JSON** - como pedido pelo Jurado 3). Apresentar exemplos dos ficheiros de entrada e saída.
        *   **Recolha de Informação:** Analisar o código em `annotation-backend/app/utils/csv_utils.py` e verificar se a funcionalidade de JSON foi adicionada. Se não, esta é uma pendência técnica.

3.  **Documentação da API (Entregável Técnico):**
    *   **O quê:** Declarar que a API foi documentada seguindo o standard OpenAPI. Incluir uma ou duas imagens do `annotation_api_openapi.json` ou da visualização no Postman.
    *   **Recolha de Informação:** Utilizar os ficheiros `generate_postman_collection.py` e `annotation_api_openapi.json`.

---

#### **Capítulo 8: Conclusão**
*(Ficheiro: `conclusao.tex`)*

**Plano de Conteúdo:**

1.  **Síntese do Trabalho Desenvolvido:**
    *   Resumir o problema, os objetivos e a solução implementada. Reforçar que o objetivo principal de criar uma ferramenta de anotação dedicada com cálculo de métricas foi atingido.

2.  **Discussão dos Resultados:**
    *   **Impacto da Ferramenta:** Discutir como a ferramenta pode melhorar o processo de anotação. Embora não tenhamos feito um estudo formal com utilizadores, podemos argumentar com base no paper "Tools Impact on the Quality of Annotations..." que uma ferramenta especializada reduz a carga cognitiva e a probabilidade de erro humano em comparação com, por exemplo, folhas de cálculo.
    *   **Limitações:** Ser transparente sobre o que não foi feito. A principal limitação é a ausência de um estudo de validação com anotadores reais, que comparasse a qualidade das anotações feitas com a nossa ferramenta vs. outros métodos.

3.  **Trabalhos Futuros:**
    *   **Validação com Utilizadores:** Propor um plano para um estudo formal, como o descrito no paper de referência.
    *   **Expansão de Métricas:** Sugerir a inclusão de outras métricas de IAA.
    *   **Melhorias de Performance:** Migração para base de dados assíncrona (`asyncpg`).
    *   **Generalização da Ferramenta:** Torná-la configurável para outros tipos de tarefas de anotação.

## 3. Plano de Ação Técnico (Levantamento de Informação)

Antes de escrever, precisamos de recolher e consolidar informação. Vamos criar uma "knowledge base" local na pasta `analysis/report_writing_kb/`.

| Tarefa de Levantamento | Onde Procurar | Ficheiro de Output (na KB) | Prioridade |
| :--- | :--- | :--- | :--- |
| **1. Lógica do Cálculo de IAA** | `annotation-backend/app/crud.py` (função `calculate_inter_annotator_agreement` e `calculate_similarity_matrix`) | `iaa_calculation_logic.md` | **Máxima** |
| **2. Estrutura Final da BD** | `annotation-backend/app/models.py` | `database_schema.md` | Alta |
| **3. Endpoints da API** | `annotation-backend/app/api/` (todos os ficheiros) | `api_endpoints.md` | Alta |
| **4. Funcionalidades de Import/Export** | `annotation-backend/app/utils/csv_utils.py` e `api/admin.py` | `import_export_flow.md` | Média |
| **5. Fluxo de Anotação do Utilizador** | `annotation_ui/src/components/AnnotatorChatRoomPage.js` | `annotator_workflow.md` | Média |

---

## 4. Próximos Passos Imediatos

1.  **Criar a pasta `analysis/report_writing_kb/`.**
2.  **Executar a "Tarefa de Levantamento 1":** Analisar o `crud.py` para documentar o cálculo de IAA em `iaa_calculation_logic.md`.
3.  **Começar a esboçar o Capítulo 7 (`resultados.tex`)** com base na estrutura definida acima, começando pela apresentação da métrica de IAA. 