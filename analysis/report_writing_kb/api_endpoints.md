# Documentação dos Endpoints da API

Este documento descreve os principais endpoints da API RESTful, agrupados por funcionalidade. Esta documentação serve como um anexo técnico para o relatório e responde ao pedido do júri para documentar a API.

## 1. Autenticação (`auth.py`)

Endpoints públicos para registo, login e gestão de tokens.

-   **`POST /token`**
    -   **Descrição:** Autentica um utilizador com email e password, retornando um `access_token` e um `refresh_token`.
    -   **Acesso:** Público.
-   **`POST /refresh`**
    -   **Descrição:** Gera um novo par de `access_token` e `refresh_token` a partir de um `refresh_token` válido.
    -   **Acesso:** Requer `refresh_token` válido.
-   **`POST /register`**
    -   **Descrição:** Cria um novo utilizador no sistema. (Nota: Embora público, a criação de utilizadores é tipicamente uma tarefa administrativa no fluxo da UI).
    -   **Acesso:** Público.
-   **`GET /me`**
    -   **Descrição:** Retorna os detalhes do utilizador atualmente autenticado.
    -   **Acesso:** Requer `access_token` válido.

## 2. Projetos e Salas de Chat (`projects.py`)

Endpoints para utilizadores (anotadores) interagirem com os seus projetos e salas de chat.

-   **`GET /projects/`**
    -   **Descrição:** Lista os projetos. Para um administrador, lista todos os projetos. Para um anotador, lista apenas os projetos aos quais está atribuído.
    -   **Acesso:** Anotador, Administrador.
-   **`GET /projects/{project_id}`**
    -   **Descrição:** Obtém os detalhes de um projeto específico. O acesso é verificado para garantir que o utilizador tem permissão.
    -   **Acesso:** Anotador (se atribuído), Administrador.
-   **`GET /projects/{project_id}/chat-rooms`**
    -   **Descrição:** Lista todas as salas de chat dentro de um projeto.
    -   **Acesso:** Anotador (se atribuído ao projeto), Administrador.
-   **`GET /projects/{project_id}/chat-rooms/{room_id}`**
    -   **Descrição:** Obtém os detalhes de uma sala de chat específica.
    -   **Acesso:** Anotador (se atribuído ao projeto), Administrador.
-   **`GET /projects/{project_id}/chat-rooms/{room_id}/messages`**
    -   **Descrição:** Lista todas as mensagens numa sala de chat.
    -   **Acesso:** Anotador (se atribuído ao projeto), Administrador.

## 3. Anotações (`annotations.py`)

Endpoints para o processo de anotação.

-   **`POST /projects/{project_id}/messages/{message_id}/annotations`**
    -   **Descrição:** Cria uma nova anotação (um `thread_id`) para uma mensagem específica.
    -   **Acesso:** Anotador (se atribuído ao projeto), Administrador.
-   **`GET /projects/{project_id}/annotations/my`**
    -   **Descrição:** Retorna uma lista de todas as anotações feitas pelo utilizador atual num determinado projeto, com contexto enriquecido (nome da sala, texto da mensagem, etc.).
    -   **Acesso:** Anotador (se atribuído ao projeto), Administrador.
-   **`DELETE /projects/{project_id}/messages/{message_id}/annotations/{annotation_id}`**
    -   **Descrição:** Apaga uma anotação. Um anotador só pode apagar as suas próprias anotações; um administrador pode apagar qualquer uma.
    -   **Acesso:** Anotador (dono da anotação), Administrador.

## 4. Administração (`admin.py`)

Endpoints restritos a utilizadores com privilégios de administrador para gestão da plataforma.

### Gestão de Utilizadores e Projetos
-   **`GET /admin/users`**: Lista todos os utilizadores.
-   **`POST /admin/users`**: Cria um novo utilizador.
-   **`DELETE /admin/users/{user_id}`**: Apaga um utilizador.
-   **`GET /admin/projects`**: Lista todos os projetos.
-   **`POST /admin/projects`**: Cria um novo projeto.
-   **`DELETE /admin/projects/{project_id}`**: Apaga um projeto.
-   **`POST /projects/{project_id}/assign/{user_id}`**: Atribui um utilizador a um projeto (movido para `projects.py` mas com lógica de acesso de admin).

### Importação e Exportação de Dados
-   **`POST /admin/projects/{project_id}/import-chat-room-csv`**
    -   **Descrição:** Cria uma nova sala de chat a partir do nome de um ficheiro CSV e importa todas as mensagens contidas nesse ficheiro para a base de dados.
-   **`POST /admin/chat-rooms/{chat_room_id}/import-batch-annotations`**
    -   **Descrição:** Importa um ficheiro JSON de anotações em lote para uma sala de chat, atribuindo cada anotação ao seu respetivo anotador (com base num `annotator_email` no ficheiro).
-   **`GET /admin/chat-rooms/{chat_room_id}/export`**
    -   **Descrição:** Exporta todos os dados de uma sala de chat (mensagens e todas as anotações de todos os utilizadores) para um ficheiro JSON.

### Análise e Métricas
-   **`GET /admin/chat-rooms/{chat_room_id}/aggregated-annotations`**
    -   **Descrição:** Obtém uma visão agregada das anotações para uma sala de chat, mostrando, para cada mensagem, que `thread_id` cada anotador atribuiu.
-   **`GET /admin/chat-rooms/{chat_room_id}/iaa`**
    -   **Descrição:** Ponto fulcral do sistema. Calcula e retorna a análise de Inter-Annotator Agreement (IAA) para a sala de chat, incluindo a matriz de similaridade entre cada par de anotadores e o score médio de IAA. 