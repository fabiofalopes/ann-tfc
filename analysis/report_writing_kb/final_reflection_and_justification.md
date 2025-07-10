# Documento de Reflexão e Justificação Final

Este documento serve como a base de argumentação para a redação do relatório final. O seu objetivo é consolidar as justificações para o estado final do projeto, os desvios do plano original e as lições aprendidas.

---

## 1. Análise Crítica dos Requisitos

| ID | Descrição | Estado Final | Justificação e Argumento para o Relatório |
| :--- | :--- | :--- | :--- |
| **RF1** | Importação de dados (CSV, JSON) | **Parcialmente Cumprido** | "A funcionalidade de importação foi implementada com sucesso para o formato CSV, que era o requisito primário do caso de uso. O suporte para JSON na importação de *anotações* também foi implementado. O suporte a outros formatos para importação de *mensagens* foi estrategicamente adiado para focar na robustez do fluxo principal." |
| **RF2** | Criação e gestão de projetos | **Cumprido** | "A plataforma inclui uma interface de administração completa para a criação, listagem e remoção de projetos, cumprindo integralmente este requisito." |
| **RF3** | Exportação de dados do projeto | **Cumprido** | "Qualquer projeto, incluindo as suas mensagens e todas as anotações associadas, pode ser exportado para um ficheiro JSON único, garantindo a portabilidade e a análise externa dos dados." |
| **RF4** | Interface de anotação dedicada | **Cumprido** | "Foi desenvolvida uma interface especializada para a tarefa de \textit{chat disentanglement}, com visualização de mensagens e um sistema interativo para a atribuição de \textit{thread IDs}, conforme detalhado no Capítulo 7." |
| **RF5** | Gestão de múltiplos anotadores | **Cumprido** | "O sistema suporta a atribuição de múltiplos anotadores a um projeto, e a interface de anotação isola as anotações de cada utilizador, permitindo o trabalho em paralelo." |
| **RF6** | Atribuição de utilizadores a projetos | **Cumprido** | "A interface de administração permite atribuir e remover utilizadores de projetos de forma granular, garantindo o controlo de acesso." |
| **RF7, RF8, RF9**| Criação, edição e visualização de anotações | **Cumprido** | "O fluxo completo de anotação está implementado: um anotador pode criar \textit{threads}, atribuir mensagens, e visualizar as suas anotações na interface principal e numa página de resumo." |
| **RF10**| Cálculo e visualização de métricas (IAA) | **Cumprido** | "Este requisito, que representa uma das principais inovações do projeto, foi integralmente cumprido. A plataforma calcula e exibe o IAA, incluindo uma matriz de similaridade, como descrito nos Resultados." |
| **RF11, RF12, RF13**| Autenticação e controlo de acesso por perfil | **Cumprido** | "O sistema implementa autenticação via JWT e um controlo de acesso baseado em perfis (Administrador, Anotador), onde os endpoints da API validam as permissões do utilizador para cada operação." |
| **RNF1**| Tempo de resposta da interface | **Cumprido** | "A interface React, sendo uma SPA, oferece tempos de resposta rápidos para as interações do utilizador. As operações que dependem do backend foram otimizadas, e o sistema apresenta uma performance adequada para o seu caso de uso." |
| **RNF2**| Extensibilidade (sistema de plugins) | **Não Cumprido** | "Este requisito foi conscientemente abandonado em favor da profundidade sobre a largura. A análise inicial revelou que a criação de um sistema de plugins genérico era um projeto de grande escala por si só. A decisão estratégica foi focar na entrega de uma solução de alta qualidade para um problema específico, como argumentado na Análise Crítica ao Planeamento." |
| **RNF3**| Validação com utilizadores | **Não Cumprido** | "Conforme discutido na Análise Crítica e na Conclusão, a validação formal com utilizadores não foi realizada devido à necessidade de priorizar o desenvolvimento de funcionalidades técnicas complexas, como o cálculo de IAA. Esta é a principal limitação reconhecida do trabalho e a base para trabalhos futuros." |

---

## 2. Justificação dos Grandes Desvios Estratégicos

### 2.1 O Abandono da "Plataforma Genérica" (RNF2)

*   **Argumento Central para o Relatório:** A transição de uma visão de "plataforma genérica" para uma "ferramenta especializada" não representa um fracasso, mas sim uma **decisão de gestão de projeto estratégica e madura**.
*   **Justificação Detalhada:**
    1.  **Avaliação de Complexidade:** A análise técnica inicial, informada pelo desenvolvimento do protótipo, demonstrou que a criação de uma arquitetura verdadeiramente modular e agnóstica à tarefa (com esquemas de anotação dinâmicos, UIs configuráveis, etc.) era um desafio de uma ordem de magnitude superior ao previsto, mais adequado a um projeto de investigação de longo prazo do que a um TFC com prazos definidos.
    2.  **Mitigação de Risco:** Continuar com o plano original teria introduzido um risco significativo de não entregar um produto funcional. O resultado mais provável seria uma plataforma com muitas funcionalidades iniciadas, mas nenhuma completa ou robusta.
    3.  **Entrega de Valor:** A decisão de focar no \textit{chat disentanglement} permitiu à equipa concentrar os seus esforços em resolver um problema real do AISIC LAB de forma completa. O resultado é uma ferramenta que, embora especializada, é **útil, completa e inovadora** no seu nicho, o que representa um sucesso muito maior do que uma plataforma genérica e inacabada.

### 2.2 A Ausência da Validação com Utilizadores (RNF3)

*   **Argumento Central para o Relatório:** A ausência de um estudo formal com utilizadores foi o resultado de uma **priorização deliberada do esforço de desenvolvimento para a inovação técnica**.
*   **Justificação Detalhada:**
    1.  **Complexidade Técnica do Core:** A implementação do cálculo de Inter-Annotator Agreement (IAA) foi um requisito central e uma das principais contribuições do projeto. Esta funcionalidade exigiu uma pesquisa teórica (métricas de concordância, algoritmos de atribuição) e um desenvolvimento de backend complexo (lógica em `crud.py`, otimização de queries, integração com `scipy`).
    2.  **Trade-off Estratégico:** Perante um tempo limitado, foi feita uma escolha: ou (A) desenvolver uma ferramenta mais simples e validá-la com utilizadores, ou (B) desenvolver uma ferramenta tecnicamente mais avançada e inovadora, e deixar a sua validação formal como um passo futuro. A opção (B) foi escolhida por se considerar que a contribuição técnica (a integração do cálculo de IAA) era mais significativa no contexto de um trabalho de final de curso em engenharia.
    3.  **Honestidade Académica:** O relatório deve enquadrar esta ausência não como uma falha escondida, mas como a **principal limitação reconhecida do trabalho**. Esta honestidade demonstra rigor académico e serve para justificar de forma natural e forte a secção de **Trabalhos Futuros**, onde um estudo de validação formal é a primeira e mais óbvia recomendação.

---

## 3. Lições Aprendidas (A Narrativa Profissional)

*   **Realismo na Definição de Âmbito:** A lição mais importante foi a necessidade de traduzir uma visão ambiciosa num MVP (Minimum Viable Product) realista e alcançável. A prototipagem inicial foi útil, mas a complexidade real só se manifestou durante a implementação da arquitetura final.
*   **O Valor da Especialização:** Focar em resolver um problema específico de forma profunda permitiu criar uma solução com mais impacto e utilidade do que uma solução genérica e superficial.
*   **Verificação Técnica como Rede de Segurança:** Na impossibilidade de realizar testes com utilizadores, ter uma estratégia de verificação técnica (testes de API, validação automática de dados) foi crucial para garantir a qualidade e a fiabilidade do software entregue.
*   **Documentar Decisões:** Manter um registo (mesmo que informal) das decisões de arquitetura e de priorização ao longo do projeto é fundamental para conseguir depois justificar o percurso de forma coerente. 