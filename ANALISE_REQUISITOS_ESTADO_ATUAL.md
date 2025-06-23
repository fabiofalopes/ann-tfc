# Análise de Requisitos vs. Estado Atual do Projeto

Este documento cruza os requisitos funcionais (RF) e não-funcionais (RNF) definidos em `especificacao-e-modelacao.tex` com o estado de implementação atual do projeto, com base nos planos de ação e análises recentes.

---

## Requisitos Funcionais (RF)

### **RF1: Suporte à importação de dados em formato CSV**
- **Descrição:** Suporte à importação de dados em formato CSV (com extensibilidade futura planeada para outros formatos, e.g. JSON).
- **Implementado:**
    - O backend possui um endpoint (`POST /admin/projects/{project_id}/chat-rooms/upload-csv`) que permite a um administrador carregar um ficheiro CSV para um projeto específico.
    - A lógica de parsing do CSV (`csv_utils.py`) e a criação das `ChatRoom` e `Message` na base de dados estão funcionais.
    - O frontend do `AdminDashboard` tem uma interface de utilizador para selecionar o projeto e fazer o upload do ficheiro.
- **Falta Implementar:**
    - Não há pendências críticas. A extensibilidade para outros formatos (JSON) é um trabalho futuro, fora do escopo do MVP.

### **RF2: Sistema de organização de dados por projetos**
- **Descrição:** Sistema de organização de dados por projetos.
- **Implementado:**
    - O modelo de dados (`models.py`) define claramente as entidades `Project`, `ChatRoom`, `Message`, e as suas relações.
    - O backend tem endpoints para a gestão CRUD de projetos por parte do administrador.
    - A interface do anotador está organizada por projetos: o `AnnotatorDashboard` lista os projetos aos quais o utilizador está atribuído, e a `AnnotatorProjectPage` lista as salas de chat desse projeto.
- **Falta Implementar:**
    - A interface de administração no frontend para criar e editar projetos de forma visual (`AdminDashboard`) ainda não está completa.

### **RF3: Exportação dos dados anotados num formato estruturado**
- **Descrição:** Exportação dos dados anotados num formato estruturado (e.g., JSON, CSV).
- **Implementado:**
    - Nada.
- **Falta Implementar:**
    - **Backend:** Criar um endpoint na API (e.g., `GET /admin/projects/{project_id}/export`) que gere e devolva um ficheiro (JSON ou CSV) com todas as mensagens e as suas anotações (threads) associadas.
    - **Frontend:** Adicionar um botão na interface de administração para acionar a exportação.

### **RF4: Interface de utilizador clara e funcional, otimizada para tarefas de anotação**
- **Descrição:** Interface de utilizador clara e funcional, otimizada para tarefas de anotação.
- **Implementado:**
    - A `AnnotatorChatRoomPage` foi significativamente refatorada para uma "split-view": lista de mensagens à esquerda e menu de threads à direita.
    - O sistema de anotação foi simplificado para um modelo de clique (selecionar mensagens, depois clicar no botão da thread), que é funcional.
    - As threads são codificadas por cores para fácil identificação.
    - A sidebar (`SmartThreadCard`) oferece uma visão geral das threads e das suas mensagens.
- **Falta Implementar:**
    - Melhorias de UX avançadas: sistema de drag-and-drop para uma anotação mais fluída, atalhos de teclado e feedback visual mais dinâmico durante as ações.

### **RF5: Suporte a múltiplos anotadores por projeto**
- **Descrição:** Suporte a múltiplos anotadores por projeto.
- **Implementado:**
    - O modelo de dados suporta a relação muitos-para-muitos entre `User` e `Project` através da tabela de associação `user_project_association`.
    - A API do backend possui a lógica para atribuir e remover utilizadores de projetos.
- **Falta Implementar:**
    - A interface de administração (`AdminDashboard`) para gerir estas atribuições de forma visual e intuitiva ainda não foi desenvolvida.

### **RF6: Gestão de atribuição de tarefas a anotadores**
- **Descrição:** Gestão de atribuição de tarefas a anotadores.
- **Implementado:**
    - O backend possui a API necessária para que um administrador possa atribuir um utilizador a um projeto.
    - O sistema de permissões garante que um anotador só pode ver e anotar os projetos aos quais está atribuído.
- **Falta Implementar:**
    - A interface gráfica no frontend para o admin realizar esta gestão de forma simples (e.g., uma vista de um projeto com uma lista de utilizadores para adicionar/remover).
    - O requisito original mencionava "distribuição automática", que não está implementada e foi despriorizada em favor da atribuição manual pelo admin.

### **RF7: Interface especializada para chat disentanglement**
- **Descrição:** Interface especializada para *chat disentanglement*.
- **Implementado:**
    - A `AnnotatorChatRoomPage` é a concretização desta interface. Apresenta as mensagens sequencialmente e permite agrupá-las em threads, que é o core da tarefa.
- **Falta Implementar:**
    - Não há pendências críticas. As melhorias estão ligadas ao RF4 (melhorar a UX da interface existente).

### **RF8: Sistema de tagging para classificação de mensagens em threads**
- **Descrição:** Sistema de *tagging* para classificação de mensagens em *threads*.
- **Implementado:**
    - O sistema de anotação atual permite "taggar" uma ou mais mensagens a uma `Thread` existente ou a uma nova.
    - A API (`POST /annotations`, `DELETE /annotations/{annotation_id}`) e a lógica de `crud` suportam estas operações.
    - O frontend permite realizar estas ações através de cliques.
- **Falta Implementar:**
    - Melhorar a experiência de "tagging" com drag-and-drop, que seria mais intuitivo do que o sistema de cliques atual.

### **RF9: Visualização sequencial dos turnos (mensagens)**
- **Descrição:** Visualização sequencial dos turnos (mensagens).
- **Implementado:**
    - Totalmente. A `AnnotatorChatRoomPage` apresenta a lista de mensagens (`MessageBubble`) por ordem cronológica.
- **Falta Implementar:**
    - Nenhuma pendência.

### **RF10: Armazenamento das anotações para cálculo futuro de métricas**
- **Descrição:** Armazenamento das anotações de forma a possibilitar o cálculo futuro de métricas de qualidade e concordância.
- **Implementado:**
    - O modelo de dados armazena as anotações de forma estruturada: a tabela `Annotation` relaciona um `Message`, um `Thread` e o `User` que a criou.
- **Falta Implementar:**
    - O cálculo e a visualização de quaisquer métricas. Falta um endpoint no backend para calcular estatísticas (`GET /admin/projects/{project_id}/stats`) e uma página no frontend para as exibir.

### **RF11: Autenticação de utilizadores**
- **Descrição:** Autenticação de utilizadores.
- **Implementado:**
    - Totalmente. O backend (`api/auth.py`) tem um sistema de autenticação completo com JWT (access e refresh tokens).
    - O frontend (`LoginPage.js`, `api.js`, `AuthContext.js`) gere o fluxo de login, armazenamento de tokens e renovação automática.
- **Falta Implementar:**
    - Nenhuma pendência.

### **RF12: Definição de roles (administrador/anotador)**
- **Descrição:** Definição de roles (administrador/anotador).
- **Implementado:**
    - Totalmente. O modelo `User` tem um campo `role` (enum 'admin' ou 'annotator').
    - O sistema de dependências do FastAPI (`dependencies.py`) usa estes roles para proteger endpoints.
    - O `AuthContext` no frontend expõe o role do utilizador à aplicação.
- **Falta Implementar:**
    - Nenhuma pendência.

### **RF13: Controlo de acesso baseado em permissões**
- **Descrição:** Controlo de acesso baseado em permissões.
- **Implementado:**
    - O backend protege os endpoints de administração para que apenas utilizadores com role 'admin' lhes possam aceder.
    - Os endpoints de anotação verificam se o utilizador está atribuído ao projeto em questão.
    - O frontend mostra/esconde rotas e elementos de UI (e.g., menu de navegação) com base no role do utilizador.
- **Falta Implementar:**
    - Não há pendências críticas. A lógica está implementada, apenas falta a UI de admin para gerir as permissões (RF5, RF6) de forma mais granular.

---

## Requisitos Não Funcionais (RNF)

### **RNF1: Tempo de resposta adequado para operações interativas**
- **Implementado:**
    - O principal gargalo de performance (problema N+1) foi resolvido no backend com a criação do endpoint `GET /chat-rooms/{id}/annotations`, que carrega todos os dados de uma vez.
    - O frontend foi refatorado para usar este endpoint, resultando num carregamento rápido da página de anotação.
- **Falta Implementar:**
    - Testes de carga para verificar o comportamento com um volume muito grande de dados, mas para o escopo atual, está otimizado.

### **RNF2: Processamento eficiente para múltiplos utilizadores simultâneos**
- **Implementado:**
    - A arquitetura da API é stateless (baseada em JWT), o que é fundamental para a escalabilidade.
    - A utilização de uma base de dados relacional e queries otimizadas (RNF1) ajuda na concorrência.
- **Falta Implementar:**
    - O projeto ainda não foi testado em ambiente de produção com múltiplos utilizadores. O `psycopg2` é síncrono, o que pode ser um limite (a migração para `asyncpg` foi identificada como trabalho futuro).

### **RNF3: Interface responsiva e adaptável**
- **Implementado:**
    - Os componentes principais foram estilizados com CSS que inclui algumas media queries básicas para se adaptarem a ecrãs menores.
- **Falta Implementar:**
    - Uma revisão completa da responsividade em todos os componentes e páginas para garantir uma boa experiência em mobile/tablets. Atualmente, o foco tem sido o desktop.

### **RNF4: Ferramenta interativa dando feedback visual claro**
- **Implementado:**
    - O estado de seleção de mensagens é claro.
    - As threads codificadas por cores dão feedback sobre o agrupamento.
    - O `SmartThreadCard` mostra um resumo das mensagens ao passar o rato (hover).
- **Falta Implementar:**
    - Feedback em tempo real durante operações como drag-and-drop (e.g., destacar a thread alvo).
    - Notificações de sucesso/erro mais explícitas após as operações (e.g., "Anotação guardada com sucesso").

### **RNF5: Interface simples, minimalista e intuitiva**
- **Implementado:**
    - O design geral segue uma abordagem minimalista.
    - O fluxo do anotador (Login -> Dashboard -> Projeto -> Anotação) foi simplificado e é relativamente linear.
- **Falta Implementar:**
    - A intuitividade pode ser muito melhorada com as funcionalidades de UX propostas (drag-and-drop, atalhos), que tornariam a operação principal menos mecânica.
    - A interface de administração precisa de ser desenhada para ser igualmente intuitiva.

### **RNF6: Backup automático de anotações**
- **Implementado:**
    - Nada.
- **Falta Implementar:**
    - Uma estratégia de backup a nível da infraestrutura da base de dados. Isto está fora do âmbito do código da aplicação em si, mas é um requisito operacional importante. Testes automatizados (`pytest`) no backend aumentariam a fiabilidade dos dados.

### **RNF7: Logging de atividades críticas**
- **Implementado:**
    - Nada.
- **Falta Implementar:**
    - Integrar uma biblioteca de logging estruturado (e.g., `loguru`) no backend para registar eventos importantes (logins, erros, operações de admin). 