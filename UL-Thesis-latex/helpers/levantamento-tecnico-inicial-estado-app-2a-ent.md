## Levantamento Técnico do Estado Atual

**Arquitetura Geral:**

A aplicação evoluiu de um protótipo monolítico baseado em leitura/escrita direta no filesystem para uma arquitetura cliente-servidor mais robusta e escalável. Consiste agora em dois componentes principais: um backend API (`annotation-backend`) e um frontend web (`annotation_ui`).

**Backend (`annotation-backend`):**

*   **Tecnologia:** API RESTful desenvolvida em Python com a framework `FastAPI`.
*   **Servidor:** Executada com `uvicorn`.
*   **Base de Dados:** Utiliza uma base de dados relacional (provavelmente SQLite, como mencionado, mas com capacidade para outras via `SQLAlchemy`) para persistência de dados. A interação é feita através do ORM `SQLAlchemy` e as migrações de esquema são geridas com `Alembic`.
*   **Funcionalidades Principais:**
    *   Define e expõe endpoints API para gerir os dados da aplicação (projetos, anotações, utilizadores, etc.).
    *   Implementa lógica de negócio (CRUD - Create, Read, Update, Delete) através do ficheiro `crud.py`.
    *   Utiliza `Pydantic` para validação rigorosa dos dados de entrada e saída da API.
    *   Inclui um sistema de autenticação/autorização (possivelmente baseado em tokens JWT) para proteger os endpoints (`auth.py`, `dependencies.py`).
    *   Capacidade para lidar com uploads de ficheiros (`python-multipart`).
    *   Pode incluir lógica de processamento de dados (`pandas`).
*   **Estrutura:** Código organizado modularmente dentro do diretório `app/` (models, schemas, crud, api routers, database, auth, config).

**Frontend (`annotation_ui`):**

*   **Tecnologia:** Single-Page Application (SPA) desenvolvida com `React`.
*   **Funcionalidades Principais:**
    *   Fornece a interface de utilizador para interagir com a aplicação (visualizar dados, realizar anotações, gerir projetos, etc.).
    *   Comunica com o `annotation-backend` através de chamadas à API REST (usando `axios`, encapsulado em `src/utils/api.js`) para obter e enviar dados.
    *   Utiliza `react-router-dom` para navegação entre diferentes vistas/páginas da aplicação.
*   **Estrutura:** Código organizado em componentes (`src/components/`), utilitários (`src/utils/`), e o ponto de entrada principal (`App.js`, `index.js`).

**Interação Frontend-Backend:**

*   O Frontend (`annotation_ui`) deixou de aceder diretamente ao sistema de ficheiros.
*   Todas as operações de dados (criar, ler, atualizar, apagar) são agora mediadas pelo Backend (`annotation-backend`) através de chamadas API.
*   O Frontend envia pedidos HTTP (GET, POST, PUT, DELETE) para os endpoints definidos no Backend.
*   O Backend processa esses pedidos, interage com a base de dados, e retorna respostas (geralmente em formato JSON) ao Frontend, que depois atualiza a UI em conformidade.

**Evolução desde a 1ª Entrega:**

A mudança fundamental foi a introdução do backend e a refatoração do frontend para comunicar com ele. Isto transforma a aplicação de um protótipo local e limitado para uma aplicação web completa com persistência de dados centralizada, capacidade de autenticação e uma separação clara entre a lógica de apresentação (frontend) e a lógica de negócio/dados (backend). Esta arquitetura é significativamente mais complexa, mas também mais escalável, segura e preparada para funcionalidades futuras como múltiplos utilizadores.
