# Rascunho - Capítulo 6: Método e Planeamento

## 6.1 Metodologia de Desenvolvimento

O desenvolvimento deste projeto seguiu uma abordagem iterativa e incremental, alinhada com princípios de metodologias ágeis, adaptada ao contexto de um Trabalho Final de Curso. Esta escolha fundamentou-se na necessidade de validação contínua e na natureza evolutiva dos requisitos de uma plataforma de anotação. Os princípios fundamentais foram:

*   **Iterações Curtas:** Ciclos de desenvolvimento que permitiram feedback regular e ajustes ao plano.
*   **Desenvolvimento Incremental:** Construção progressiva da plataforma, começando com um protótipo, evoluindo para um MVP (Minimum Viable Product) focado no \textit{chat disentanglement}, e finalmente adicionando as funcionalidades de análise e gestão.

## 6.2 Planeamento e Cronograma

O planeamento do projeto foi organizado em fases que refletem a maturação da solução, desde a conceção inicial até à entrega da ferramenta funcional.

*(Nota para o relatório final: A Figura do Gantt Chart (`gantt-chart`) deve ser atualizada para refletir o cronograma real da execução do projeto, incluindo os desvios e extensões de prazo, se aplicável.)*

## 6.3 Análise Crítica ao Planeamento

Uma análise honesta do percurso do projeto revela um contraste entre o planeamento inicial e a execução real. Esta reflexão é essencial para compreender as decisões tomadas, os desafios superados e as lições aprendidas.

### 6.3.1 Progresso e Marcos Atingidos

O projeto atingiu com sucesso os seus objetivos centrais, entregando uma solução funcional e robusta para a anotação de \textit{chat disentanglement}. Os principais marcos alcançados foram:

*   **Desenvolvimento Completo da Arquitetura:** Foi implementada com sucesso a arquitetura de dois componentes (React frontend, FastAPI backend) com uma base de dados PostgreSQL.
*   **Funcionalidades de Anotação Essenciais:** A interface de anotação permite a utilizadores visualizar conversas e atribuir mensagens a \textit{threads} de forma intuitiva.
*   **Sistema de Gestão de Projetos e Utilizadores:** Foram implementadas todas as funcionalidades administrativas para criar projetos, gerir utilizadores e controlar o acesso através de um sistema de atribuições.
*   **Implementação do Cálculo de IAA:** Um marco crítico do projeto foi a implementação bem-sucedida do cálculo automático de Inter-Annotator Agreement, uma funcionalidade complexa que adiciona um valor analítico imenso à plataforma.
*   **Fluxos de Importação e Exportação:** A ferramenta suporta a importação de mensagens (CSV) e anotações (JSON), bem como a exportação completa dos dados de um projeto (JSON), garantindo a sua interoperabilidade.

### 6.3.2 Desafios e Adaptações ao Plano

O principal desvio do plano inicial foi uma **mudança estratégica de âmbito**.

A visão original era a de uma plataforma de anotação genérica e altamente modular. No entanto, a complexidade técnica de criar uma abstração que servisse múltiplos tipos de anotação, aliada aos prazos do TFC, revelou-se impraticável. Foi tomada a decisão consciente e estratégica de **focar todos os esforços em resolver um problema de forma excelente (o \textit{chat disentanglement}) em vez de vários problemas de forma medíocre**. Esta decisão teve as seguintes implicações:
*   **Priorização do MVP:** O desenvolvimento concentrou-se em entregar o melhor módulo de \textit{disentanglement} possível, com todas as funcionalidades de suporte necessárias (gestão, IAA, etc.).
*   **Adiamento da Generalização:** As abstrações de código para suportar outros tipos de anotação foram adiadas e são agora consideradas "Trabalho Futuro".

Outro desvio significativo foi a **não realização de testes formais com utilizadores**. O plano original previa uma fase de validação com participantes para avaliar a usabilidade. A complexidade e o tempo consumido pelo desenvolvimento técnico, especialmente na implementação da lógica de negócio no backend e no cálculo de IAA, não permitiram alocar tempo para organizar e conduzir esta fase de testes de forma metodologicamente correta. A validação foi, por isso, focada na verificação técnica (Capítulo 5).

### 6.3.3 Lições Aprendidas

O desenvolvimento deste projeto proporcionou várias lições valiosas:

*   **O Poder de um Âmbito Bem Definido:** A decisão de limitar o âmbito e focar no MVP foi crucial para o sucesso do projeto. Tentar construir uma solução genérica desde o início teria provavelmente resultado numa ferramenta disfuncional e incompleta.
*   **Complexidade Oculta:** A implementação de funcionalidades que parecem simples na superfície, como um cálculo de métrica de concordância, pode esconder uma complexidade técnica significativa. É fundamental alocar tempo suficiente para a investigação e implementação de requisitos complexos.
*   **A Importância da Verificação Técnica:** Na ausência de validação com utilizadores, uma estratégia de verificação técnica robusta (testes de API, validação de dados) é indispensável para garantir a qualidade e a fiabilidade do software entregue.
*   **Equilíbrio entre Frontend e Backend:** O esforço de desenvolvimento necessita de ser equilibrado. Um backend robusto e uma API bem definida são a espinha dorsal que permite ao frontend entregar uma experiência de utilizador fluida e fiável. 