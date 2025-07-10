# Lógica de Cálculo do Inter-Annotator Agreement (IAA)

Este documento detalha a implementação do cálculo de concordância entre anotadores (IAA) na plataforma, especificamente a métrica "1-to-1 agreement", que foi uma recomendação central do júri.

## 1. Visão Geral do Processo

O cálculo do IAA para uma sala de chat (`ChatRoom`) é um processo de duas etapas:

1.  **Agregação de Anotações:** O sistema primeiro agrupa todas as anotações por cada anotador que trabalhou naquela sala. O resultado é um dicionário onde cada chave é o ID de um anotador e o valor é uma lista de `thread_id`'s que esse anotador atribuiu às mensagens.

2.  **Cálculo Par a Par (Pairwise):** O sistema então calcula a concordância entre cada par de anotadores possível. Por exemplo, numa sala com três anotadores (A, B, C), ele calcula o IAA para os pares (A, B), (A, C), e (B, C).

3.  **Média Global:** O valor final de IAA para a sala de chat é a média aritmética de todos os scores de concordância calculados entre os pares.

## 2. O Algoritmo de "1-to-1 Agreement"

A função principal que implementa esta lógica é `_calculate_one_to_one_accuracy`. Ela resolve um problema de atribuição: "Qual é a melhor forma de mapear os `threads` do Anotador 1 para os `threads` do Anotador 2 para maximizar a semelhança?"

### Passos do Algoritmo:

1.  **Construção da Matriz de Custo/Similaridade:**
    *   O algoritmo cria uma matriz onde as linhas representam os `threads` únicos do Anotador 1 e as colunas representam os `threads` únicos do Anotador 2.
    *   Cada célula `(i, j)` da matriz contém um valor que representa a **dissimilaridade** (ou custo) entre o `thread_i` do Anotador 1 e o `thread_j` do Anotador 2.
    *   A dissimilaridade é calculada como `1 - Jaccard Index`. O **Índice de Jaccard** mede a semelhança entre dois conjuntos (neste caso, o conjunto de mensagens em cada thread) e é calculado como:
        \[ J(A, B) = |A \cap B| / |A \cup B| \]
        Onde:
        *   `|A \cap B|` é o número de mensagens que aparecem em **ambos** os threads.
        *   `|A \cup B|` é o número total de mensagens únicas nos dois threads combinados.

2.  **Resolução com o Algoritmo Húngaro:**
    *   Uma vez que a matriz de custo está construída, a biblioteca `scipy.optimize.linear_sum_assignment` é utilizada. Este método implementa o **Algoritmo Húngaro**, que encontra a atribuição de custo mínimo entre as linhas e as colunas.
    *   Por outras palavras, ele encontra a melhor correspondência "um-para-um" entre os threads dos dois anotadores, minimizando a dissimilaridade total (e, por consequência, maximizando a semelhança).

3.  **Cálculo da Concordância Final:**
    *   O resultado do Algoritmo Húngaro é um conjunto de pares `(linha, coluna)` que formam a melhor atribuição.
    *   A concordância final entre os dois anotadores é a soma das similaridades (Índice de Jaccard) para estes pares ótimos, dividida pelo número de mensagens na sala de chat. Isto normaliza o score.

## 3. Implementação no Código (`crud.py`)

A lógica pode ser encontrada principalmente em duas funções no ficheiro `annotation-backend/app/crud.py`:

-   `_calculate_one_to_one_accuracy(annot1: List[str], annot2: List[str]) -> float`:
    *   Recebe duas listas de anotações (thread IDs).
    *   Implementa os 3 passos descritos acima: constrói a matriz de custo, usa `linear_sum_assignment` para resolver, e calcula o score de concordância final.

-   `get_chat_room_iaa_analysis(db: Session, chat_room_id: int) -> Optional[schemas.ChatRoomIAA]`:
    *   Orquestra todo o processo.
    *   Obtém as anotações da base de dados.
    *   Agrupa-as por anotador.
    *   Usa `itertools.combinations` para criar todos os pares de anotadores.
    *   Chama `_calculate_one_to_one_accuracy` para cada par.
    *   Calcula a média dos resultados para obter o IAA global da sala.
    *   Constrói a matriz de similaridade final para ser exibida no frontend.

Este método é robusto porque não depende dos nomes dos `threads` (e.g., "thread-1" vs "conversa-A"), mas sim do conteúdo real deles (as mensagens que os compõem), tornando-o uma medida eficaz da concordância estrutural das anotações. 