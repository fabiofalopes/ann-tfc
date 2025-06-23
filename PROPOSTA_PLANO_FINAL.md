# Proposta de Planeamento para a Fase Final do TFC

**Data:** 22 de junho de 2025

**Assunto:** Apresentação do estado atual do projeto, plano de entregas e proposta de extensão de prazo para a época de recurso.

## 1. Introdução

Este documento apresenta uma análise do estado atual do projeto da ferramenta de anotação e delineia dois planos de ação para a sua conclusão. O objetivo é fornecer uma visão clara do que pode ser realisticamente entregue no prazo da época normal (27 de junho de 2025) e o que pode ser alcançado com uma extensão para a época de recurso (11 de julho de 2025).

A nossa prioridade é entregar uma solução de alta qualidade que cumpra os objetivos definidos. Acreditamos que a extensão do prazo nos permitirá entregar um produto significativamente mais completo, robusto e alinhado com os requisitos funcionais e não-funcionais estabelecidos.

---

## 2. Ponto de Situação Atual (22 de junho de 2025)

Com base na análise detalhada em `ANALISE_ESTADO_ATUAL.md`, o projeto encontra-se num estado avançado, mas com assimetrias entre o backend e o frontend.

### Backend (FastAPI) - ~95% Completo

*   **O que está feito:**
    *   Arquitetura em camadas (API, Lógica, Dados) bem definida.
    *   Modelos de dados (`SQLAlchemy`) e schemas (`Pydantic`) completos.
    *   Sistema de autenticação e autorização robusto com JWT (roles de Admin/Anotador).
    *   Endpoints de administração para gestão de utilizadores e projetos (CRUD).
    *   Funcionalidade de importação de `ChatRooms` a partir de CSV.
    *   Endpoints para o anotador listar projetos e criar/remover anotações.

*   **Principais Pendências:**
    *   **Performance:** A API de anotações sofre de um problema de N+1 queries, impactando severamente o frontend.
    *   **Testes e Logging:** Ausência de uma suite de testes automatizados e de um sistema de logging estruturado.

### Frontend (React) - ~50% Completo

*   **O que está feito:**
    *   Estrutura de roteamento com `react-router-dom` e rotas protegidas.
    *   Módulo `api.js` para comunicação com o backend (com `axios` e intercetores).
    *   Dashboards de administração funcionais para gestão de projetos, utilizadores e upload de CSVs.

*   **Principais Pendências:**
    *   **Arquitetura de Estado:** O componente `App.js` atua como um "god component", centralizando estado que deveria pertencer a páginas específicas. Esta é a **maior dívida técnica** e um bloqueio ao desenvolvimento.
    *   **Fluxo do Anotador:** A experiência do anotador (Login -> Dashboard -> Projeto -> Anotação) não está completa nem é intuitiva.
    *   **Interface de Anotação (`AnnotatorChatRoomPage`):** A página central para a tarefa de anotação está incompleta e é diretamente afetada pelo problema de performance do backend.

---

## 3. Cenário 1: Plano para Entrega em Época Normal (Prazo: 27 de junho)

Este plano foca-se em entregar o fluxo de trabalho mais crítico: a experiência do anotador, do login à anotação. O objetivo é ter um MVP funcional e testável.

**Objetivo Principal:** Garantir que um **Anotador** consiga fazer login, selecionar um projeto, abrir uma sala de chat e anotar mensagens de forma eficiente.

| Área       | Tarefas a Executar                                                                                                                                                                 | Requisitos Chave Abordados |
| :--------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------- |
| **Backend**  | **Task 1.1:** Criar um endpoint `GET /chat-rooms/{id}/annotations` que retorna todas as anotações de uma vez, eliminando o problema de N+1 queries. **(Prioridade Máxima)**        | `RNF1` (Performance)       |
| **Frontend** | **Task 1.2:** Refatorar `App.js` para descentralizar o estado, movendo a lógica de dados para as páginas específicas (`AnnotatorDashboard`, `AnnotatorProjectPage`).                | Melhoria Arquitetural      |
|            | **Task 1.3:** Implementar o fluxo de navegação completo do anotador: `AnnotatorDashboard` (lista projetos) -> `AnnotatorProjectPage` (lista chat rooms) -> `AnnotatorChatRoomPage`. | `RF2`, `RF5`, `RF9`        |
|            | **Task 3.1 & 3.2:** Fazer com que a `AnnotatorChatRoomPage` consuma o novo endpoint do backend, carregando todos os dados de forma eficiente. Implementar uma UI de anotação "split-view" funcional (sem drag-and-drop). | `RF7`, `RF8`, `RNF4`       |
|            | **Task 3.3 (Path B):** Implementar um mecanismo de anotação baseado em cliques (checkboxes + botão "Adicionar à thread"), como alternativa ao drag-and-drop.                             | `RF8`                      |

**O que ficará por fazer neste cenário:**

*   **Funcionalidades de Admin:** Apenas as funcionalidades de gestão já existentes. Sem novas UIs para criar/editar projetos ou gerir utilizadores de forma integrada no `AdminDashboard`.
*   **UX de Anotação:** A interface de anotação será funcional, mas não terá elementos de usabilidade avançados como drag-and-drop, atalhos de teclado ou feedback em tempo real.
*   **Validação e Testes:** Sem testes automatizados no backend (`Task 4.1`).
*   **Métricas e Resultados:** Sem interface para visualização do progresso ou resultados da anotação (`Task 4.3`).

---

## 4. Cenário 2: Proposta para Entrega em Época de Recurso (Prazo: 11 de julho)

Este plano constrói sobre o Cenário 1, utilizando as duas semanas adicionais para entregar uma aplicação completa, polida e robusta, que sirva eficazmente tanto **Anotadores** como **Administradores**.

**Objetivo Principal:** Entregar um produto final de alta qualidade, com todas as funcionalidades críticas implementadas, uma experiência de utilizador refinada e uma base de código testada.

| Área       | Tarefas Adicionais (sobre o Cenário 1)                                                                                                                               | Requisitos Chave Abordados    |
| :--------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- |
| **Backend**  | **Task 2.1 & 2.2:** Implementar a API completa para Admins gerirem projetos e atribuírem/removerem utilizadores a projetos.                                          | `RF6`, `RF13`                 |
|            | **Task 4.1:** Implementar uma suite de testes automatizados (`pytest`) para os endpoints críticos da API e a lógica de `crud`, garantindo a estabilidade do sistema. | `RNF6`, Fiabilidade           |
| **Frontend** | **Task 2.3:** Desenvolver a UI completa do `AdminDashboard`, com formulários para criar/editar projetos e uma interface para gerir as atribuições de utilizadores. | `RF13`, `RNF3`, `RNF5`        |
|            | **Task 3.3 (Path A):** Implementar o sistema de anotação com **Drag-and-Drop**, proporcionando uma experiência muito mais intuitiva e eficiente.                     | `RF8`, `RNF3`, `RNF4`, `RNF5` |
|            | **Task 4.2:** Melhorar a UX de anotação com feedback visual em tempo real durante o drag, e implementar atalhos de teclado para ações comuns.                       | `RNF4`, `RNF5`                |
|            | **Task 4.3:** Criar uma página de visualização de resultados/estatísticas para Admins, permitindo-lhes monitorizar o progresso da anotação.                         | `RF10`                        |
|            | **Task 5.3:** Refatorar a gestão de estado global com `AuthContext` para uma arquitetura mais limpa e manutenível.                                                    | Melhoria Arquitetural         |

**Benefícios da Extensão:**

1.  **Produto Completo:** Entrega de todas as funcionalidades essenciais para ambos os perfis de utilizador.
2.  **Qualidade e UX Superior:** A interface de anotação, o coração da ferramenta, será significativamente mais usável e eficiente.
3.  **Robustez e Fiabilidade:** A adição de testes no backend garante um sistema mais estável e menos propenso a erros.
4.  **Alinhamento com Requisitos:** Cumprimento de um leque muito mais vasto dos requisitos funcionais e não-funcionais definidos na tese.

---

## 5. Mapeamento de Requisitos para o Cenário 2

A tabela abaixo resume como o plano proposto para a época de recurso garante a cobertura dos requisitos definidos no capítulo `especificacao-e-modelacao.tex`.

| ID       | Requisito                                     | Cobertura no Cenário 2                                                                       |
| :------- | :-------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **RF1-6**  | Gerais (Importação, Projetos, Exportação)   | **Completa.** Funcionalidades de admin permitem a gestão completa do ciclo de vida.          |
| **RF7-10** | Módulo Disentanglement                      | **Completa e Refinada.** UI com drag-and-drop e base para futuras métricas.                  |
| **RF11-13**| Gestão de Utilizadores                      | **Completa.** Autenticação, roles e controlo de acesso com UI de gestão para o admin.        |
| **RNF1-2** | Performance                                 | **Resolvido.** Otimização do backend resolve o principal gargalo de performance.             |
| **RNF3-5** | Usabilidade                                 | **Foco Principal.** O tempo extra é dedicado a refinar a UI/UX, tornando-a intuitiva.        |
| **RNF6-7** | Segurança (Backup, Logging)                 | **Parcialmente Abordado.** Testes aumentam a segurança. Logging fica como trabalho futuro.   |

## 6. Conclusão

Recomendamos fortemente a adoção do **Cenário 2**. A extensão do prazo para 11 de julho permitirá transformar um MVP funcional numa solução completa, polida e verdadeiramente útil, que cumpre com a visão e os objetivos do projeto. Estamos confiantes de que o tempo adicional será bem empregue para garantir uma entrega final da qual nos podemos orgulhar e que representa uma mais-valia para o AISIC LAB.

Estamos à vossa disposição para discutir este plano em detalhe. 