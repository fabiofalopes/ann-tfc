# Estado do Projeto e Próximos Passos

**Data:** 5 de Julho de 2025

---

## 1. Visão Geral

A aplicação é uma ferramenta funcional e robusta para anotação de conversas e análise de concordância entre anotadores (IAA). O backend é a componente mais madura, oferecendo uma API completa e segura para todas as operações de negócio previstas. O frontend é um cliente puro e reativo, que implementa com sucesso o fluxo de trabalho principal para administradores e anotadores.

A análise aprofundada da codebase revela que o foco do desenvolvimento deve ser a **expansão da interface do utilizador (UI)** para expor funcionalidades de backend já existentes, mas que ainda não são acessíveis. O objetivo é enriquecer a experiência do utilizador e fechar o ciclo de vida da gestão de projetos.

- **Conclusão do Backend:** 95% (Considerado completo para o MVP; os 5% restantes seriam novas funcionalidades fora do escopo atual).
- **Conclusão do Frontend:** 75% (O núcleo funciona, mas faltam UIs importantes para funcionalidades de backend já existentes).

---

## 2. Ponto de Situação do Backend

O backend (FastAPI) é estável, seguro e completo para os requisitos definidos.

### ✅ Funcionalidades Implementadas e Validadas

-   **Autenticação & Autorização:**
    -   `POST /auth/token`: Login com credenciais de utilizador.
    -   `GET /users/me`: Obtenção dos dados do utilizador autenticado.
    -   **Proteção de Rotas:** Distinção clara entre utilizadores normais (`Annotator`) e `Admin`, aplicada em todos os endpoints relevantes.

-   **Gestão de Utilizadores (Admin):**
    -   `GET /admin/users`: Listar todos os utilizadores.
    -   `POST /admin/users`: Criar um novo utilizador (email, password, status de admin).
    -   `DELETE /admin/users/{user_id}`: Apagar um utilizador.

-   **Gestão de Projetos (Admin):**
    -   `GET /projects`: Listar todos os projetos.
    -   `POST /projects`: Criar um novo projeto.
    -   `GET /projects/{project_id}`: Obter detalhes de um projeto.
    -   `DELETE /projects/{project_id}`: Apagar um projeto.
    -   `POST /projects/{project_id}/users`: Associar um utilizador a um projeto.
    -   `DELETE /projects/{project_id}/users/{user_id}`: Desassociar um utilizador de um projeto.
    -   `GET /projects/{project_id}/users`: Listar os utilizadores de um projeto.

-   **Gestão de Chat Rooms & Mensagens:**
    -   `GET /projects/{project_id}/chat-rooms`: Listar chat rooms de um projeto.
    -   `POST /admin/projects/{project_id}/chat-rooms/upload`: **Funcionalidade-chave de importação.** Criar um chat room e as suas mensagens a partir de um ficheiro CSV.
    -   `GET /chat-rooms/{chat_room_id}`: Obter detalhes de um chat room.
    -   `GET /chat-rooms/{chat_room_id}/messages`: Listar mensagens de um chat room (com paginação).

-   **Gestão de Anotações:**
    -   `POST /projects/{project_id}/messages/{message_id}/annotations`: Criar/atualizar uma anotação para o utilizador atual.
    -   `DELETE /annotations/{annotation_id}`: Apagar uma anotação (apenas o próprio dono ou admin).
    -   `GET /projects/{project_id}/chat-rooms/{chat_room_id}/annotations`: Listar todas as anotações de um chat room (respeitando a privacidade entre anotadores não-admin).
    -   `GET /projects/{project_id}/annotations/my`: **Funcionalidade-chave por explorar.** Listar todas as anotações feitas pelo utilizador atual num determinado projeto.

-   **Análise de Inter-Annotator Agreement (IAA) (Admin):**
    -   `GET /admin/chat-rooms/{chat_room_id}/iaa`: **Funcionalidade-chave de análise.** Endpoint robusto que calcula o "one-to-one accuracy", suporta análise parcial (quando alguns anotadores não terminaram) e retorna o status detalhado (`Complete`, `Partial`, `NotEnoughData`).

---

## 3. Ponto de Situação do Frontend

O frontend (React) está alinhado com a arquitetura de "cliente puro". O estado de autenticação é gerido centralmente (`AuthContext`) e os componentes de página são responsáveis por buscar os seus próprios dados.

### ✅ Funcionalidades Implementadas e Validadas

-   **Fluxo de Autenticação:** Login funcional com redirecionamento baseado na função do utilizador (Admin/Annotator) e proteção de rotas.
-   **Dashboard de Administrador (`AdminDashboard`):**
    -   Duas vistas principais: Projetos e Utilizadores.
    -   **Gestão de Projetos:** Lista, cria e navega para os projetos.
    -   **Gestão de Utilizadores:** Apresenta um formulário funcional para **criar novos utilizadores** e uma lista para **apagar utilizadores existentes**.
-   **Página de Projeto de Administrador (`AdminProjectPage`):**
    -   Gestão de utilizadores do projeto (associar/desassociar).
    -   Interface para upload de CSV para criar/importar um novo Chat Room.
    -   Tabela de Chat Rooms que mostra o estado da anotação e link para a análise de IAA.
-   **Página de Análise de IAA (`AnnotationAnalysisPage`):**
    -   Visualização detalhada da análise de IAA, incluindo a matriz de concordância (heatmap), o estado da análise (parcial/completo) e listas de anotadores.
-   **Dashboard do Anotador (`AnnotatorDashboard`):**
    -   Lista os projetos aos quais o anotador está associado.
-   **Página de Projeto do Anotador (`AnnotatorProjectPage`):**
    -   Lista os chat rooms disponíveis para anotação dentro de um projeto.
-   **Página de Anotação (`AnnotatorChatRoomPage`):**
    -   **Interface principal de trabalho.** Exibe a lista de mensagens e a interface de "smart cards" para criar e gerir anotações de threads. A UI é funcional e permite ao anotador completar a sua tarefa.

---

## 4. Análise de Gaps: Funcionalidades de Backend Sem Frontend

Esta é a secção mais importante. Identifica o trabalho de desenvolvimento de frontend necessário para expor o valor já implementado no backend.

1.  **Visualização "As Minhas Anotações" para o Anotador:**
    -   **Backend:** O endpoint `GET /projects/{project_id}/annotations/my` existe e está pronto a ser usado.
    -   **Frontend Gap:** O anotador não tem forma de ver um resumo do seu próprio trabalho. Ele pode anotar, mas não consegue rever facilmente o que já fez num projeto de forma agregada.
    -   **Valor para o Utilizador:** Permite ao anotador ter uma visão geral do seu progresso, rever o seu trabalho e sentir-se mais envolvido no processo.

2.  **Registo Público de Utilizadores (Self-Registration):**
    -   **Backend:** O endpoint `POST /auth/register` foi implementado em fases iniciais mas não está a ser usado ativamente nem protegido. O fluxo atual de criação de utilizadores é `POST /admin/users` (um admin cria outros utilizadores).
    -   **Frontend Gap:** Não existe uma página de registo.
    -   **Decisão Estratégica:** É necessário decidir se a plataforma deve permitir que qualquer pessoa se registe ou se a gestão de utilizadores deve permanecer centralizada nos administradores. **A recomendação é manter a gestão centralizada (o modelo atual),** o que significa que este "gap" não é uma prioridade.

3.  **Limpeza de Endpoints Não Utilizados:**
    -   **Backend:** Endpoints mais antigos como `/admin/chat-rooms/{id}/aggregated-annotations` podem existir mas foram substituídos pela lógica de IAA mais avançada.
    -   **Frontend Gap:** O `api.js` pode conter referências a estas funções que nunca são chamadas.
    -   **Ação:** Realizar uma passagem de limpeza tanto no backend (remover rotas) como no frontend (remover funções API não utilizadas) para reduzir a complexidade.

---

## 5. Plano de Ação Estratégico e Prioritizado

Com base na análise, o caminho a seguir é claro e focado no frontend.

### **Prioridade 1: Implementar a Página "As Minhas Anotações" (Experiência do Anotador)**

Esta é a funcionalidade em falta mais valiosa e com o maior retorno de investimento.

-   **Ação 1.1: Criar a API no Frontend.**
    -   **Ficheiro:** `annotation_ui/src/utils/api.js`.
    -   **Tarefa:** Adicionar uma função `getMyAnnotations(projectId)` que chame o endpoint `GET /projects/{projectId}/annotations/my`.

-   **Ação 1.2: Criar o Componente da Página.**
    -   **Ficheiro:** Criar `annotation_ui/src/components/MyAnnotationsPage.js` e o seu CSS.
    -   **Tarefa:** A página deve aceitar um `projectId`. Ao carregar, deve chamar `api.getMyAnnotations(projectId)` e exibir os resultados de forma clara, talvez agrupados por Chat Room.

-   **Ação 1.3: Adicionar Navegação.**
    -   **Ficheiro:** `annotation_ui/src/components/AnnotatorDashboard.js` ou `AnnotatorProjectPage.js`.
    -   **Tarefa:** Adicionar um botão/link "Ver as Minhas Anotações" que navegue para a nova página.

-   **Ação 1.4: Adicionar a Rota.**
    -   **Ficheiro:** `annotation_ui/src/App.js`.
    -   **Tarefa:** Adicionar a nova rota, por exemplo `/projects/:projectId/my-annotations`.

### **Prioridade 2: Refinamento da UI/UX e Qualidade de Vida (QoL)**

Melhorias que tornam a aplicação mais profissional e agradável de usar.

-   **Ação 2.1: Refinar a UI de Gestão de Utilizadores no `AdminDashboard`.**
    -   **Justificação:** A funcionalidade existe, mas a sua apresentação pode ser melhorada (ex: usar um modal para a criação em vez de um formulário sempre visível, adicionar confirmações antes de apagar).
    -   **Tarefa:** Refatorizar o componente `AdminDashboard.js` para uma melhor experiência do utilizador.

-   **Ação 2.2: Componentes de Feedback (Loading/Error) Consistentes.**
    -   **Justificação:** Diferentes páginas usam diferentes estilos para `Loading...` e mensagens de erro.
    -   **Tarefa:** Criar componentes reutilizáveis, como `<LoadingSpinner />` e `<ErrorMessage message={error} />`, e usá-los de forma consistente em toda a aplicação.

### **Prioridade 3: Limpeza de Código (Code Cleanup)**

-   **Ação 3.1: Remover Código Morto.**
    -   **Justificação:** Manter a codebase limpa e fácil de manter.
    -   **Tarefa:** Remover as funções não utilizadas do `api.js` e, se aplicável, as rotas correspondentes no backend. 