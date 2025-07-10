# Rascunho - Capítulo 7: Resultados

## Introdução

Este capítulo apresenta os resultados concretos obtidos com o desenvolvimento da ferramenta de anotação. A apresentação está dividida em três áreas principais: uma visão geral da plataforma final, uma análise detalhada das funcionalidades chave implementadas, com especial destaque para o cálculo automático de métricas de concordância, e a documentação técnica produzida.

## 7.1 Apresentação da Plataforma

A solução desenvolvida é uma aplicação web completa que serve como um ambiente integrado para a anotação de diálogos de chat, especificamente para a tarefa de \textit{chat disentanglement}. A plataforma foi desenhada para servir dois perfis de utilizador distintos: o \textbf{Anotador}, focado na tarefa de anotação, e o \textbf{Administrador}, responsável pela gestão de projetos, utilizadores e pela análise dos dados.

O fluxo de utilização da aplicação segue um percurso lógico:

1.  **Autenticação:** O utilizador acede através de uma página de Login.
2.  **Dashboard:** Após o login, é apresentado um dashboard adaptado ao seu perfil.
    *   **Anotador:** Vê uma lista dos projetos a que está atribuído (`AnnotatorDashboard`). Ao selecionar um projeto, vê as salas de chat disponíveis (`AnnotatorProjectPage`).
    *   **Administrador:** Vê uma visão geral de todos os projetos e utilizadores no sistema (`AdminDashboard`).
3.  **Anotação:** O anotador seleciona uma sala de chat e entra na interface de anotação (`AnnotatorChatRoomPage`), onde pode visualizar as mensagens e atribuir-lhes \textit{thread IDs}.
4.  **Análise (Admin):** O administrador pode aceder a uma página de projeto (`AdminProjectPage`) para gerir atribuições, importar dados e, crucialmente, visualizar a análise de concordância entre anotadores (`AdminChatRoomView`).

*(Nota para o relatório final: Esta secção deve ser acompanhada por um diagrama de navegação e screenshots das principais páginas, utilizando os recursos disponíveis em `sitemap_screenshots` para ilustrar o percurso do utilizador.)*

## 7.2 Resultados da Implementação

Esta secção detalha as funcionalidades mais relevantes que foram implementadas, demonstrando o cumprimento dos requisitos definidos e respondendo ao feedback recebido pelo júri.

### 7.2.1 Cálculo de Inter-Annotator Agreement (IAA)

Uma das funcionalidades centrais da plataforma é o cálculo automático da métrica de concordância entre anotadores (IAA), um requisito explícito do júri. A plataforma implementa o algoritmo **"1-to-1 agreement"**, que avalia a concordância estrutural entre os \textit{threads} criados por diferentes anotadores, focando-se no conteúdo das conversas e não nos nomes arbitrários dos \textit{threads}.

O processo de cálculo, disponível na visão do administrador para cada sala de chat, é o seguinte:

1.  **Agregação de Anotações:** Para uma dada sala de chat, o sistema primeiro agrupa todas as anotações por cada anotador. O resultado é um conjunto de "documentos de anotação", um para cada utilizador, onde cada documento contém os \textit{threads} que esse utilizador definiu.

2.  **Cálculo Par a Par (Pairwise):** A concordância é então calculada para cada par de anotadores possível. Por exemplo, numa sala com três anotadores (A, B, C), o sistema calcula o IAA para (A, B), (A, C), e (B, C).

3.  **Média Global:** O valor final de IAA apresentado para a sala de chat é a média aritmética de todos os scores de concordância calculados entre os pares.

O núcleo do algoritmo (`_calculate_one_to_one_accuracy` em `crud.py`) resolve um problema de atribuição. Para cada par de anotadores, ele constrói uma matriz de custo onde a dissimilaridade entre um \textit{thread} do Anotador 1 e um \textit{thread} do Anotador 2 é calculada com base no **Índice de Jaccard**. O índice mede a sobreposição de mensagens entre os dois \textit{threads}:
\[ J(A, B) = \frac{|A \cap B|}{|A \cup B|} \]
A dissimilaridade na matriz é, portanto, \(1 - J(A, B)\). Com esta matriz, o **Algoritmo Húngaro** (via `scipy.optimize.linear_sum_assignment`) encontra a correspondência ótima "um-para-um" entre os \textit{threads} que maximiza a semelhança total.

O resultado é uma matriz de similaridade, apresentada na UI do administrador, e um score de concordância final, que representa a média da similaridade dos pares ótimos.

*(Nota para o relatório final: Incluir uma figura do ecrã de Análise de IAA que mostra a matriz e o score final, explicando como um administrador a interpretaria.)*

### 7.2.2 Gestão de Projetos e Utilizadores

A plataforma fornece uma interface de administração robusta que permite a gestão completa do ciclo de vida de um projeto de anotação. As funcionalidades implementadas, acessíveis apenas ao administrador, incluem:
*   **Gestão de Projetos:** Criação, listagem e remoção de projetos.
*   **Gestão de Utilizadores:** Criação, listagem e remoção de utilizadores (anotadores ou outros administradores).
*   **Atribuição a Projetos:** Atribuição granular de utilizadores a projetos específicos, o que garante o isolamento dos dados e a correta distribuição de tarefas. A interface permite adicionar ou remover facilmente um utilizador de um projeto.

### 7.2.3 Importação e Exportação de Dados

Para facilitar a integração com outros fluxos de trabalho e responder a um ponto levantado pelo júri, foram desenvolvidas funcionalidades de importação e exportação de dados:
*   **Importação de Mensagens:** Os administradores podem iniciar um projeto importando um diálogo completo a partir de um ficheiro CSV. O sistema cria uma nova sala de chat e popula-a com as mensagens do ficheiro.
*   **Importação de Anotações:** O sistema suporta a importação em lote de anotações a partir de um ficheiro JSON. Este ficheiro pode conter anotações de múltiplos utilizadores, e o sistema atribui-as corretamente com base no email do anotador especificado no ficheiro.
*   **Exportação de Projetos:** Todos os dados de uma sala de chat (mensagens e a totalidade das anotações de todos os utilizadores) podem ser exportados para um único ficheiro JSON, ideal para análise externa ou para arquivo.

## 7.3 Documentação Técnica da API

Como parte dos entregáveis técnicos do projeto, foi produzida uma documentação completa da API RESTful da aplicação. A API, que serve como ponte de comunicação entre o frontend React e o backend FastAPI, foi desenhada seguindo os princípios REST.

A documentação foi gerada utilizando o standard **OpenAPI 3.0**, a partir do qual foi criado um ficheiro `openapi.json`. Este ficheiro descreve de forma rigorosa todos os endpoints disponíveis, os seus parâmetros, os corpos das requisições, os esquemas de dados (via Pydantic) e os possíveis códigos de resposta. Esta abordagem não só garante uma documentação clara e inequívoca, como permite a geração automática de clientes da API e a importação para ferramentas de desenvolvimento como o Postman.

*(Nota para o relatório final: Inserir uma pequena tabela ou imagem que resuma os principais grupos de endpoints da API: Auth, Projects, Annotations e Admin, para dar uma visão geral da sua estrutura.)* 