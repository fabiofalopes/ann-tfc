# Rascunho - Capítulo 4: Solução Proposta

## Introdução

Este capítulo detalha a solução técnica implementada para responder aos requisitos de especificados. A apresentação abrange a arquitetura global do sistema, as tecnologias e ferramentas selecionadas para o seu desenvolvimento, e uma descrição dos principais componentes do frontend e do backend.

## 4.1 Arquitetura da Solução

A plataforma foi desenhada seguindo uma **arquitetura cliente-servidor desacoplada**, uma abordagem moderna que promove a separação de responsabilidades, a escalabilidade e a manutenibilidade. A solução é composta por dois sistemas independentes que comunicam através de uma API bem definida.

*   **Frontend (Cliente):** Uma **Single-Page Application (SPA)** desenvolvida com a biblioteca **React**. A sua única responsabilidade é renderizar a interface do utilizador (UI) e gerir o estado da interação do utilizador. Toda a lógica de negócio, processamento de dados e autenticação são delegados ao backend através de chamadas a uma API RESTful. Esta abordagem de "cliente puro" garante que o frontend permanece focado na experiência do utilizador.

*   **Backend (Servidor):** Um servidor de API RESTful desenvolvido com a framework **FastAPI** em Python. Este componente é o cérebro da aplicação, responsável por:
    *   Implementar toda a lógica de negócio.
    *   Gerir a autenticação e autorização de utilizadores.
    *   Executar todas as operações de base de dados (CRUD - Create, Read, Update, Delete).
    *   Realizar os cálculos computacionalmente intensivos, como o Inter-Annotator Agreement (IAA).

A comunicação entre os dois componentes é feita exclusivamente através de requisições HTTP, com os dados a serem trocados no formato JSON.

*(Nota para o relatório final: Incluir um diagrama de arquitetura de alto nível que mostre os dois componentes (React App, FastAPI App), a base de dados, e o fluxo de comunicação via API REST.)*

## 4.2 Tecnologias e Ferramentas Utilizadas

A seleção de tecnologias foi guiada por critérios de performance, maturidade, ecossistema e adequação aos requisitos do projeto.

| Componente | Tecnologia/Ferramenta | Justificação                                                                                                  |
| :--- | :--- |:--------------------------------------------------------------------------------------------------------------|
| **Frontend** | React 18              | Framework líder para SPAs, com um vasto ecossistema e gestão de estado eficiente através de Hooks e Context API.   |
| | JavaScript (ES6+)     | Linguagem padrão para desenvolvimento web.                                                                    |
| | Axios                 | Cliente HTTP para realizar as chamadas à API RESTful de forma fiável e com gestão de intercetores (tokens).   |
| | CSS3                  | Estilização dos componentes para uma interface limpa e funcional.                                             |
| **Backend**  | Python 3.11           | Linguagem robusta com um forte ecossistema para ciência de dados e desenvolvimento web.                         |
| | FastAPI               | Framework web de alta performance para Python, com validação de dados automática (Pydantic) e geração de documentação OpenAPI. |
| | SQLAlchemy            | O principal ORM para Python, permitindo uma interação segura e abstrata com a base de dados SQL.            |
| | Alembic               | Ferramenta para a gestão de migrações de esquema da base de dados, integrada com o SQLAlchemy.                 |
| | Pydantic              | Biblioteca para validação de dados, utilizada pelo FastAPI para garantir a integridade dos dados da API.      |
| | SciPy                 | Biblioteca fundamental para computação científica em Python, utilizada para o cálculo do IAA (Algoritmo Húngaro).|
| | python-jose, passlib  | Bibliotecas para a gestão de JWTs (JSON Web Tokens) e hashing de passwords, garantindo a segurança.             |
| **Base de Dados** | PostgreSQL (Produção) | Um sistema de gestão de base de dados relacional robusto, open-source e pronto para produção.                |
| | SQLite (Desenvolvimento) | Base de dados leve e baseada em ficheiro, ideal para desenvolvimento e testes locais.                       |
| **DevOps**   | Docker                | Plataforma de contentorização utilizada para criar ambientes de desenvolvimento e produção consistentes.          |

## 4.3 Componentes da Solução

### 4.3.1 Frontend

O frontend foi estruturado para ser modular e de fácil manutenção.

*   **Componentes de Página (`/src/components`):** Componentes de alto nível que representam uma vista completa da aplicação (e.g., `AdminDashboard.js`, `AnnotatorChatRoomPage.js`). São estes componentes que tipicamente contêm a lógica de data-fetching, chamando a API para obter os dados necessários para a sua renderização.
*   **Componentes de UI (`/src/components`):** Componentes mais pequenos e reutilizáveis (e.g., `MessageBubble.js`, `ProjectCard.js`) que são puramente presentacionais. Recebem dados e callbacks via `props` e não têm conhecimento da origem dos dados.
*   **Gestão de API (`/src/utils/api.js`):** Um módulo centralizador que exporta todas as funções de comunicação com o backend. Utiliza o `axios` e implementa intercetores para gerir automaticamente a injeção e o refrescamento de tokens de autenticação (JWT), simplificando as chamadas à API em todo o resto da aplicação.
*   **Gestão de Estado (`/src/contexts`):** Para o estado global, como a informação do utilizador autenticado, foi utilizado o Context API do React. O `AuthContext` disponibiliza o estado de autenticação e os dados do utilizador a qualquer componente que necessite. Para o estado local, foi utilizado o hook `useState`.

### 4.3.2 Backend

O backend está organizado por funcionalidades, seguindo as melhores práticas do FastAPI.

*   **Routers da API (`/app/api`):** Os endpoints da API estão divididos em ficheiros modulares (`admin.py`, `projects.py`, etc.), cada um contendo um `APIRouter` do FastAPI. Isto mantém o código organizado por domínio de negócio.
*   **Lógica de Negócio e Acesso a Dados (`/app/crud.py`):** Este ficheiro contém toda a lógica que interage com a base de dados. As funções em `crud.py` são responsáveis por executar as queries (via SQLAlchemy), realizar cálculos (como o IAA) e implementar a lógica de negócio principal da aplicação.
*   **Modelos da Base de Dados (`/app/models.py`):** Define o esquema da base de dados através de classes Python que herdam do `Base` do SQLAlchemy.
*   **Esquemas da API (`/app/schemas.py`):** Contém os modelos Pydantic que definem a "forma" dos dados que entram e saem da API. O FastAPI utiliza estes esquemas para validar automaticamente as requisições e serializar as respostas, garantindo a consistência dos dados.
*   **Autenticação e Dependências (`/app/auth.py`, `/app/dependencies.py`):** Código de suporte para a segurança da API. Implementa a lógica de criação e validação de tokens JWT e cria dependências (`Depends`) reutilizáveis para obter o utilizador atual ou verificar permissões de acesso. 