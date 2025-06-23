# Análise do Estado Atual e Plano de Ação

Este documento detalha o estado de desenvolvimento do projeto de TFC, comparando o trabalho realizado com os requisitos definidos no documento `solucao-proposta.tex`. O objetivo é identificar as tarefas pendentes e definir prioridades para a fase final de desenvolvimento.

## 1. Backend (FastAPI)

O backend está numa fase muito avançada e pode ser considerado **praticamente completo (95%)**. A arquitetura está robusta, segura e alinhada com os requisitos.

### 1.1. Completo

- **Arquitetura em Camadas**: Separação clara entre API (endpoints), Lógica de Negócio (`crud.py`) e Acesso a Dados (`models.py`, `database.py`).
- **Modelos de Dados (SQLAlchemy)**: Os modelos em `models.py` cobrem todas as entidades necessárias: `User`, `Project`, `ProjectAssignment`, `ChatRoom`, `ChatMessage` e `Annotation`. A estrutura corresponde perfeitamente aos requisitos.
- **Autenticação e Autorização**: Sistema de login com JWT (`access_token` + `refresh_token`) implementado e funcional. Os endpoints estão devidamente protegidos, com distinção entre administradores e utilizadores regulares.
- **Endpoints de Administração**:
    - Gestão completa de utilizadores (CRUD).
    - Gestão completa de projetos (CRUD).
    - Atribuição de utilizadores a projetos.
- **Importação de Dados**: Endpoint `import-chat-room-csv` funcional, com validação de formato de ficheiro e feedback detalhado de sucesso/erro, cumprindo os requisitos de "Importação" do fluxo de dados.
- **Endpoints para Anotadores**:
    - Listagem de projetos/chat rooms/mensagens com validação de permissões.
    - Criação, leitura e remoção de anotações (`thread_id`).

### 1.2. Parcialmente Implementado / A Melhorar

- **Performance da API de Anotações**: Atualmente, o frontend precisa de fazer uma chamada à API por cada mensagem para obter as suas anotações. Isto causa um problema de performance (N+1 queries).
    - **Ação**: Criar um novo endpoint no backend (`/projects/{project_id}/chat-rooms/{room_id}/annotations`) que retorne todas as anotações de uma `ChatRoom` de uma só vez.

### 1.3. Por Fazer

- **Testes Unitários e de Integração**: A base de código não possui uma suite de testes automatizados.
    - **Ação**: Implementar testes (usando `pytest`) para os endpoints da API e para a lógica de `crud` para garantir a estabilidade e fiabilidade do backend.
- **Monitorização e Logging**: Não há um sistema de logging estruturado ou monitorização.
    - **Ação**: Integrar um sistema de logging (ex: `loguru`) para registar eventos importantes e erros.

---

## 2. Frontend (React)

O frontend está numa fase intermédia de desenvolvimento (**aproximadamente 50% completo**). Embora muitos componentes e vistas existam, a arquitetura geral e a experiência do utilizador para o anotador necessitam de trabalho significativo.

### 2.1. Completo

- **Estrutura de Roteamento**: As rotas para administradores e anotadores estão bem definidas e protegidas (`react-router-dom`).
- **Camada de API (`api.js`)**: A comunicação com o backend está bem implementada com `axios`, incluindo intercetores para autenticação e `refresh token`.
- **Vistas de Administração**:
    - Dashboard de administrador (`AdminDashboard`) para gestão de utilizadores e projetos.
    - Funcionalidade de upload de CSVs com feedback.
    - Vista de detalhe de projeto (`ProjectPage`) com gestão de utilizadores associados.
- **Componentes Base**: Existem vários componentes reutilizáveis (`MessageBubble`, etc.).

### 2.2. Parcialmente Implementado / A Melhorar

- **Arquitetura de Estado e Fluxo de Dados**:
    - **Problema**: O componente `App.js` funciona como um "god component", centralizando estado e lógica que deveriam pertencer a vistas específicas. O fluxo de dados para iniciar uma sessão de anotação é confuso e dependente de lógica legada (`/chat`).
    - **Ação**: Refatorar. Remover a gestão de estado de anotação (`messages`, `tags`) do `App.js`. Cada página (ex: `AnnotatorChatRoomPage`) deve ser responsável por carregar e gerir os seus próprios dados, seguindo o padrão já usado em `ChatRoomPage.js`.
- **Interface de Anotação para Anotadores**:
    - **Problema**: A interface principal para o anotador (`AnnotatorChatRoomPage`) está incompleta. A lógica atual em `App.js` não suporta de forma clara o fluxo de trabalho de um anotador (selecionar projeto -> selecionar chat room -> anotar).
    - **Ação**: Desenvolver a `AnnotatorDashboard` e `AnnotatorProjectPage` para permitir que o utilizador navegue até à `AnnotatorChatRoomPage`. Esta última deve ser a interface principal de anotação.
- **Performance no Carregamento de Anotações**:
    - **Problema**: A `ChatRoomPage` sofre do problema de N+1 queries.
    - **Ação**: Modificar a `ChatRoomPage` e a futura `AnnotatorChatRoomPage` para usarem o novo endpoint de backend que carrega todas as anotações de uma vez.

### 2.3. Por Fazer

- **Interface de Anotação - Funcionalidades Essenciais**: A tese descreve funcionalidades que não estão implementadas ou não são claras no UI atual:
    - **Visualização em Split-View**: Embora a `ChatRoomPage` tenha um layout semelhante, a interface do anotador precisa de uma clara "split-view" com as mensagens de um lado e as *threads* que estão a ser criadas do outro.
    - **Sistema de Drag-and-Drop**: O requisito de usar "drag-and-drop" para classificar mensagens não está implementado.
    - **Preview em Tempo Real**: O feedback visual ao agrupar mensagens numa *thread* precisa de ser melhorado.
    - **Atalhos de Teclado**: Não existem atalhos para otimizar o trabalho de anotação.
- **Gestão de Estado com `useContext`**: O requisito de usar `useContext` para partilhar estado de forma eficiente não foi cumprido.
    - **Ação**: Após a refatoração do `App.js`, avaliar onde o `useContext` pode ser usado para partilhar estado global (como `currentUser` e `theme`) de forma mais limpa, criando um `AuthContext` ou `UserContext`.
- **Métricas de Progresso e Qualidade**: O requisito de calcular e exibir métricas de progresso da anotação não está implementado.
- **Testes de Componentes**: Não existem testes para os componentes React.

---

## 3. Prioridades para a Entrega Final

Com base na data de entrega final (**27.06.2025**), o foco deve ser maximizar o que é visível e funcional, garantindo que os requisitos do TFC são cumpridos.

### Prioridade Máxima (Blocante)

1.  **Refatorar Arquitetura do Frontend**: Mover a lógica de carregamento de dados do `App.js` para as páginas específicas (`AnnotatorChatRoomPage`). Isto desbloqueará o desenvolvimento da interface de anotação.
2.  **Implementar o Fluxo de Anotação do Utilizador**: Garantir que um anotador consegue fazer login, ver os seus projetos, selecionar uma `ChatRoom` e ver a interface de anotação.
3.  **Desenvolver a Interface de Anotação Principal (`AnnotatorChatRoomPage`)**: Implementar a funcionalidade central de criar `thread_id` para cada mensagem, com uma UI clara (pelo menos a split-view).

### Prioridade Alta (Essencial para a Avaliação)

4.  **Otimizar Performance (Backend + Frontend)**: Implementar o endpoint de backend para carregar anotações em batch e atualizar o frontend para o usar.
5.  **Testar Manualmente o Fluxo Completo**: Realizar testes exaustivos ao fluxo: Admin cria projeto -> Admin faz upload de CSV -> Admin atribui anotador -> Anotador faz login -> Anotador anota -> Admin revê as anotações.
6.  **Implementar "Drag-and-Drop" ou Alternativa**: Se o drag-and-drop for complexo, implementar uma alternativa de UI intuitiva para agrupar mensagens em *threads*.

### Prioridade Média (Requisitos Adicionais)

7.  **Testes Automatizados (Backend)**: Adicionar uma cobertura de testes mínima para os endpoints mais críticos do backend.
8.  **Melhorar a UI/UX da Anotação**: Adicionar `preview` em tempo real e atalhos de teclado.
9.  **Página de Métricas/Resultados**: Criar uma vista simples que mostre os resultados da anotação e algumas estatísticas, como o número de *threads* e a concordância entre anotadores (se aplicável).

### Prioridade Baixa (Se Houver Tempo)

10. **Testes de Componentes (Frontend)**.
11. **Logging e Monitorização (Backend)**.
12. **Refatoração do `useContext`**. 