# Esquema da Base de Dados

Este documento descreve o esquema da base de dados da aplicação, baseado nos modelos definidos em `annotation-backend/app/models.py`. O diagrama Entidade-Relação (ERD) correspondente deve ser gerado ou atualizado para refletir esta estrutura final.

## Modelos de Dados (Tabelas)

### 1. `User`
Representa um utilizador do sistema. Pode ser um administrador ou um anotador.

-   **Tabela:** `users`
-   **Campos:**
    -   `id` (PK): Identificador único do utilizador.
    -   `email` (UNIQUE): Email do utilizador, usado para login.
    -   `hashed_password`: Password do utilizador (armazenada de forma segura).
    -   `is_admin`: Booleano que indica se o utilizador tem privilégios de administrador.
    -   `created_at`: Timestamp de criação.
-   **Relações:**
    -   Um `User` pode ter várias `ProjectAssignments`.
    -   Um `User` pode fazer várias `Annotations`.

### 2. `Project`
Representa um projeto de anotação. Cada projeto contém um ou mais diálogos (chat rooms) para serem anotados.

-   **Tabela:** `projects`
-   **Campos:**
    -   `id` (PK): Identificador único do projeto.
    -   `name`: Nome do projeto.
    -   `description`: Descrição detalhada do projeto.
    -   `created_at`, `updated_at`: Timestamps.
-   **Relações:**
    -   Um `Project` pode ter várias `ChatRooms`.
    -   Um `Project` pode ter vários `ProjectAssignments`.
    -   Um `Project` está associado a várias `Annotations`.

### 3. `ProjectAssignment`
Tabela de junção que associa um `User` a um `Project`, definindo quem tem permissão para trabalhar em quê.

-   **Tabela:** `project_assignments`
-   **Campos:**
    -   `id` (PK): Identificador único da atribuição.
    -   `user_id` (FK para `users.id`): O utilizador atribuído.
    -   `project_id` (FK para `projects.id`): O projeto ao qual o utilizador foi atribuído.
-   **Relações:**
    -   Mapeia um `User` para um `Project`.
-   **Constraints:**
    -   `uix_user_project`: Garante que um utilizador só pode ser atribuído a um projeto uma única vez.

### 4. `ChatRoom`
Representa um único diálogo ou conversação que precisa de ser anotada.

-   **Tabela:** `chat_rooms`
-   **Campos:**
    -   `id` (PK): Identificador único da sala de chat.
    -   `name`: Nome da sala de chat.
    -   `description`: Descrição da sala de chat.
    -   `project_id` (FK para `projects.id`): O projeto ao qual esta sala pertence.
    -   `created_at`, `updated_at`: Timestamps.
-   **Relações:**
    -   Pertence a um único `Project`.
    -   Contém várias `ChatMessages`.

### 5. `ChatMessage`
Representa uma única mensagem dentro de uma `ChatRoom`.

-   **Tabela:** `chat_messages`
-   **Campos:**
    -   `id` (PK): Identificador único da mensagem.
    -   `turn_id`: Identificador original da mensagem no dataset (e.g., "T1", "T2").
    -   `user_id`: Identificador do "falante" original no dataset.
    -   `turn_text`: O conteúdo textual da mensagem.
    -   `reply_to_turn`: O `turn_id` da mensagem à qual esta responde (se aplicável).
    -   `chat_room_id` (FK para `chat_rooms.id`): A sala de chat à qual esta mensagem pertence.
    -   `created_at`, `updated_at`: Timestamps.
-   **Relações:**
    -   Pertence a uma única `ChatRoom`.
    -   Pode ter várias `Annotations`.
-   **Constraints:**
    -   `uix_chatroom_turn`: Garante que cada `turn_id` é único dentro de uma `chat_room`.

### 6. `Annotation`
O coração do sistema. Representa a anotação feita por um `User` a uma `ChatMessage` num determinado `Project`, atribuindo-lhe um `thread_id`.

-   **Tabela:** `annotations`
-   **Campos:**
    -   `id` (PK): Identificador único da anotação.
    -   `message_id` (FK para `chat_messages.id`): A mensagem que foi anotada.
    -   `annotator_id` (FK para `users.id`): O utilizador que fez a anotação.
    -   `project_id` (FK para `projects.id`): O projeto no contexto do qual a anotação foi feita.
    -   `thread_id`: O identificador do "fio de conversa" atribuído pelo anotador a esta mensagem.
    -   `created_at`, `updated_at`: Timestamps.
-   **Relações:**
    -   Refere-se a uma única `ChatMessage`.
    -   É criada por um único `User` (anotador).
    -   Pertence a um `Project`.
-   **Constraints:**
    -   `uix_message_annotator`: Garante que um anotador só pode criar uma anotação por mensagem. Se o anotador mudar de ideias, a anotação existente é atualizada, não criada uma nova. 