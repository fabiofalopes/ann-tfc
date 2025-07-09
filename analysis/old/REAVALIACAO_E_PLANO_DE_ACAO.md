# Reavaliação e Plano de Ação Estratégico

**Data:** 24 de junho de 2025
**Versão:** 2.0

## 1. Filosofia e Novo Norte

Este documento representa uma reavaliação estratégica do projeto, consolidando uma visão única e focada. O feedback da reunião de 22 de junho de 2025 foi claro: a aplicação precisa de ter um foco absoluto em funcionalidades que entreguem valor tangível e mensurável para o processo de anotação de *chat disentanglement*.

A nossa missão é construir a **infraestrutura de dados e lógica de negócio** que permita, no futuro, a qualquer investigador ou administrador, calcular métricas de **Inter-Annotator Agreement (IAA)** de forma automática e fiável. A implementação das fórmulas específicas de IAA (e.g., Cohen's Kappa) será a **última fase**, mas todo o trabalho que se segue é construir a base sólida que torna esse cálculo não só possível, mas trivial.

Se a ferramenta não conseguir medir a qualidade e a concordância das anotações que produz, ela falha no seu propósito fundamental. Este plano de ação é o nosso caminho para garantir que isso não aconteça.

---

## 2. Os Três Pilares Fundamentais

Esta análise reflete o estado do projeto, com base na documentação mais recente (`PROPOSTA_PLANO_FINAL.md`), e serve como ponto de partida para o plano de ação que se segue.

### Backend (FastAPI) - ~98% Completo

A fundação do backend está extremamente sólida e praticamente pronta para as novas funcionalidades.

-   **O que está feito e funcional:**
    -   Arquitetura em camadas, modelos de dados e autenticação com JWT e roles (`admin`/`annotator`).
    -   Endpoints de administração para gestão de utilizadores e projetos.
    -   Importação de `ChatRooms` a partir de CSV.
    -   **Otimização Crítica Concluída:** Já existe um endpoint que retorna todas as anotações de uma sala de chat de uma só vez, eliminando o problema de performance "N+1 queries".

-   **Principais Pendências:**
    -   **API de Gestão:** Faltam os endpoints específicos para um administrador importar anotações e atribuí-las a um utilizador, bem como para agregar anotações para análise.
    -   **Testes e Logging:** Ausência de testes automatizados e logging.

### Frontend (React) - ~75% Completo

O frontend passou por uma refatoração significativa, alinhando-se melhor com a arquitetura desejada, mas a interface de anotação e as funcionalidades de administração precisam de ser o foco.

-   **O que está feito e funcional:**
    -   Roteamento, comunicação com a API (`axios`) e `AuthContext` para gestão de estado global.
    -   **Arquitetura Refatorada:** O estado foi descentralizado do `App.js` para as páginas específicas, como `AnnotatorDashboard` e `AnnotatorProjectPage`.
    -   **Fluxo do Anotador Funcional:** O fluxo de navegação (Login -> Dashboard -> Projeto -> Anotação) está implementado.
    -   **UI de Anotação Base:** A `AnnotatorChatRoomPage` já consome os dados do backend de forma eficiente e tem uma UI baseada em cliques.

-   **Principais Pendências:**
    -   **Funcionalidades do Pilar 2 e 3:** Não existe UI para um administrador importar dados anotados ou para visualizar as anotações de forma agregada.
    -   **UX de Anotação Avançada:** A interface, embora funcional, pode ser muito melhorada com uma experiência de utilizador mais fluída (e.g., drag-and-drop).
    -   **UI de Admin Completa:** Faltam as interfaces para um admin gerir projetos e atribuições de forma completa.

---

## 3. Os Três Pilares Fundamentais

Toda a implementação a seguir deve ser construída sobre estes três pilares, por esta ordem de prioridade.

### Pilar 1: Isolamento Total das Anotações e Controlo de Acesso por Papel (Role)

Esta é a fundação de todo o sistema de recolha de dados. A validade do IAA depende de um processo de anotação "cego".

-   **Anotadores (`annotator`)**: Um anotador só pode ver e manipular **as suas próprias anotações**. Em nenhuma circunstância pode ver as anotações de outro utilizador. A API deve garantir este isolamento a um nível fundamental.
-   **Administradores (`admin`)**: Um administrador tem uma visão privilegiada. Pode ver as anotações de **todos os utilizadores** para um determinado projeto ou sala de chat. Esta capacidade é um pré-requisito técnico para supervisionar o processo e, mais tarde, calcular as métricas de concordância.

### Pilar 2: Importação Robusta e Atribuída de Dados Anotados

A ferramenta deve ser capaz de ingerir dados pré-existentes, como os ficheiros CSV que já contêm anotações. Isto é crucial para trabalhar com *datasets* históricos e para flexibilidade futura.

-   **Formato de Origem**: O sistema deve suportar a importação de ficheiros CSV que contêm uma `thread_column`, representando anotações já feitas.
-   **Atribuição Explícita**: A importação de dados anotados não é anónima. O sistema tem de permitir que um **administrador** importe um ficheiro de anotações e o associe a um **utilizador específico** (pelo seu `user_id`) já existente na plataforma. Isto resolve o problema de "quem fez esta anotação?" nos dados importados.
-   **Bulk Import**: O processo deve ser desenhado para suportar a importação em massa, onde um administrador pode carregar múltiplos ficheiros, cada um correspondendo às anotações de um utilizador diferente para a mesma `ChatRoom`.

### Pilar 3: A Base para a Análise de Concordância (IAA)

Com os pilares 1 e 2 implementados, criamos a base para o objetivo final: a análise de concordância.

-   **Agregação de Dados**: O sistema deve fornecer uma forma (via API) para um administrador obter todos os dados de anotação de uma `ChatRoom`, agregados por mensagem. Para cada mensagem, devemos poder ver as anotações de todos os utilizadores que trabalharam nela.
-   **Visualização para Análise**: O frontend deve ter uma vista de administrador que consuma estes dados agregados, permitindo uma análise visual da concordância e discordância entre anotadores para cada turno da conversa, antes mesmo de qualquer cálculo numérico.

---

## 3. Plano de Implementação Faseado

As seguintes fases representam a ordem de trabalhos para materializar a visão acima. Cada fase constrói sobre a anterior.

### Fase 1: Blindar a Fundação (Lógica de Anotação Individual)

**Objetivo:** Garantir que o Pilar 1 está 100% implementado e à prova de falhas.

#### Ações no Backend (`annotation-backend`):

1.  **Confirmar o Modelo `Annotation`**: Verificado. Em `app/models.py`, a tabela `Annotation` já tem uma relação `ForeignKey` obrigatória (`annotator_id`) para o `user_id`, garantindo que cada anotação tem um dono.
2.  **Reforçar o `crud.py`**:
    -   As funções que obtêm anotações para um anotador normal, como `get_annotations_for_chat_room`, **devem** ser refatoradas ou criadas novas variantes para aceitar um `annotator_id` e usá-lo como filtro obrigatório. A função `get_annotations_by_annotator` já existe e serve como uma boa base.
    -   Manter ou criar funções específicas para administradores, como `get_all_annotations_for_chat_room_admin(chat_room_id)`, que retornam todas as anotações sem o filtro de utilizador.
3.  **Blindar a API (`app/api/annotations.py`)**:
    -   Os endpoints usados por anotadores (e.g., `GET /projects/{project_id}/chat-rooms/{chat_room_id}/annotations`) devem injetar o utilizador atual (`get_current_active_user`) e passar o seu `user.id` para as funções do `crud` que filtram por `annotator_id`.
    -   Qualquer tentativa de um anotador aceder a dados de outro deve resultar num `HTTPException` com status `403 Forbidden` ou, preferencialmente, `404 Not Found` para não revelar a existência do recurso.

#### Ações no Frontend (`annotation-ui`):

1.  **Verificar Chamadas à API**: Garantir que a `AnnotatorChatRoomPage` e todos os componentes relacionados apenas pedem e exibem as anotações do utilizador autenticado, confiando que o backend fará a filtragem correta.

**Resultado Esperado:** Um anotador pode fazer login, trabalhar num projeto, e os seus dados de anotação estão completamente isolados e seguros a nível da API e da base de dados.

### Fase 2: Implementar a Importação Atribuída

**Objetivo:** Construir a funcionalidade do Pilar 2.

#### Ações no Backend:

1.  **Novo Endpoint de Importação**: Criar um endpoint de administrador: `POST /api/admin/chat-rooms/{chat_room_id}/import-annotations`.
2.  **Schema do Pedido**: O corpo deste pedido deve aceitar um `UploadFile` (o CSV) e um `user_id` (o ID do utilizador a quem as anotações pertencem).
3.  **Lógica de `crud` para Importação**:
    -   Desenvolver uma nova função em `crud.py` (e `utils/csv_utils.py`), chamada por este endpoint, que:
        a. Recebe `db: Session`, `file`, e `annotator_id`.
        b. Faz o parse do CSV, identificando a `turn_id` e a `thread_column`.
        c. Para cada linha, encontra a `ChatMessage` correspondente no sistema (pelo `turn_id` e `chat_room_id`).
        d. Cria (ou atualiza) uma nova entrada na tabela `Annotation`, associando a mensagem, o valor da `thread_column` e o `annotator_id` fornecido.

#### Ações no Frontend:

1.  **Nova Interface de Admin**: No `AdminProjectPage` ou numa vista dedicada, criar uma secção para "Importar Anotações".
2.  **Formulário de Importação**: Este formulário deve permitir ao administrador:
    a. Selecionar uma `ChatRoom` dentro do projeto.
    b. Selecionar um **Utilizador** de uma lista de todos os utilizadores do sistema (obtida via `GET /api/users`).
    c. Fazer o upload do ficheiro CSV.
    d. Submeter o pedido para o novo endpoint, associando o ficheiro ao utilizador selecionado.

**Resultado Esperado:** Um administrador pode popular o sistema com dados de anotações pré-existentes de múltiplos utilizadores, mantendo a autoria correta de cada anotação.

### Fase 3: Criar a Visão de Administrador para Análise

**Objetivo:** Construir as ferramentas para o Pilar 3, preparando o terreno para o cálculo de métricas.

#### Ações no Backend:

1.  **Endpoint de Agregação**: Criar um novo endpoint de administrador: `GET /api/admin/chat-rooms/{chat_room_id}/aggregated-annotations`.
2.  **Lógica de Agregação**:
    -   A função no `crud.py` para este endpoint deve retornar uma estrutura de dados otimizada para análise. Por exemplo, uma lista de mensagens, onde cada objeto de mensagem contém uma lista das anotações feitas para ela, incluindo o ID e o email do utilizador que a fez.
    -   **Nota sobre Dissonância**: A dissonância entre anotadores não ocorre simplesmente porque usam símbolos diferentes para identificar threads (ex: "T0" vs "A"), mas sim quando há discordância sobre **quais mensagens pertencem ao mesmo grupo/thread**. Por exemplo, se dois anotadores concordam que uma mensagem inicial inicia uma nova thread, mas discordam sobre se uma mensagem subsequente pertence a essa mesma thread ou inicia uma nova thread, independentemente dos símbolos usados.
    ```json
    // Exemplo de resposta da API
    [
      {
        "message_id": 1,
        "message_text": "Olá a todos!",
        "annotations": [
          { "annotator_id": 10, "annotator_email": "fabio@example.com", "thread_id": "T0" },
          { "annotator_id": 12, "annotator_email": "ana@example.com", "thread_id": "A" } // Mesmo thread, símbolos diferentes
        ]
      },
      {
        "message_id": 2,
        "message_text": "Como está o tempo?",
        "annotations": [
          { "annotator_id": 10, "annotator_email": "fabio@example.com", "thread_id": "T0" }, // Mesma thread que msg 1
          { "annotator_id": 12, "annotator_email": "ana@example.com", "thread_id": "B" } // Nova thread - DISSONÂNCIA
        ]
      },
      {
        "message_id": 3,
        "message_text": "Estás a falar do quê?",
        "annotations": [
          { "annotator_id": 10, "annotator_email": "fabio@example.com", "thread_id": "T1" },
          { "annotator_id": 12, "annotator_email": "ana@example.com", "thread_id": "A" } // Volta ao thread da msg 1 - DISSONÂNCIA
        ]
      }
    ]
    ```

#### Ações no Frontend:

1.  **Nova Vista de Análise de Anotações**: Criar uma nova página/vista acessível apenas a administradores, talvez como uma sub-rota de `AdminProjectPage`.
2.  **Tabela de Concordância**: Nesta vista, para uma `ChatRoom` selecionada, apresentar os dados do novo endpoint de agregação. Isto pode ser uma tabela onde cada linha é uma mensagem e as colunas representam os anotadores, mostrando a `thread_id` que cada um atribuiu. Isto tornará a concordância e a discordância imediatamente visíveis.

**Resultado Esperado:** Um administrador pode selecionar qualquer `ChatRoom` e ver, de forma clara e consolidada, quem anotou o quê, identificando facilmente pontos de concordância e discordância.

### Fase 4: O "Grand Finale" - Cálculo das Métricas de IAA

**Objetivo:** Implementar o cálculo e a exibição das métricas de concordância. **Esta fase só começa após a validação das Fases 1-3 e da escolha das fórmulas com os orientadores.**

#### Ações no Backend:

1.  **Adicionar Dependências**: Instalar as bibliotecas necessárias (e.g., `scikit-learn`, `simpledorff`, `statsmodels`) e adicioná-las ao `requirements.txt`.
2.  **Endpoint de Métricas**: Criar o endpoint final: `GET /api/admin/chat-rooms/{chat_room_id}/iaa-metrics`. Opcionalmente, pode aceitar `user_ids` como query parameters para comparar pares específicos de anotadores.
3.  **Lógica de Cálculo**:
    -   Reutilizar a função de agregação da Fase 3.
    -   Formatar os dados agregados para o formato exigido pela biblioteca (e.g., duas listas de anotações, uma para cada um dos dois anotadores a comparar).
    -   Calcular a(s) métrica(s) (e.g., Cohen's Kappa, Krippendorff's Alpha).
    -   Retornar o resultado num formato JSON claro e interpretável.

#### Ações no Frontend:

1.  **Integrar na Vista de Análise**: Na vista de administrador da Fase 3, adicionar um botão "Calcular IAA".
2.  **Exibir Resultados**: Ao clicar no botão, chamar o novo endpoint e apresentar os resultados das métricas de forma proeminente.

**Resultado Esperado:** Com um clique, um administrador pode obter uma pontuação quantitativa da concordância entre anotadores para uma determinada tarefa de anotação, validando a qualidade dos dados recolhidos e, em última instância, o sucesso do projeto.

---

## 4. Conclusão

Este plano é ambicioso, mas focado e pragmático. Cada fase constrói sobre a anterior, resultando numa ferramenta que não só cumpre os requisitos, mas o faz de uma forma lógica, robusta e que resolve os problemas centrais da tarefa de anotação e análise. Esta é a nossa direção. Mãos à obra. 