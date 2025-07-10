# Rascunho - Capítulo 5: Testes e Validação

## 5.1 Introdução

Este capítulo descreve a estratégia de testes e validação adotada para garantir a qualidade, robustez e o correto funcionamento da ferramenta de anotação. Em vez de uma validação formal com utilizadores finais, que não foi realizada no âmbito deste projeto, o foco foi colocado na **verificação técnica da solução**. O objetivo foi assegurar que todos os requisitos funcionais e não-funcionais estivessem corretamente implementados e que o sistema se comportasse de forma previsível e segura.

## 5.2 Estratégia de Testes

A nossa estratégia de testes foi pragmática e multicamada, focando-se em garantir a fiabilidade do sistema desde o backend até ao frontend. A abordagem assentou em três pilares principais:

1.  **Testes de Integração da API:** Verificação dos endpoints do backend para garantir que a lógica de negócio, o acesso a dados e a segurança funcionam como um todo.
2.  **Validação Contínua de Dados:** Aproveitamento das capacidades da framework para garantir a integridade dos dados que fluem através da API.
3.  **Verificação Manual da Interface:** Testes exploratórios no frontend para assegurar que a experiência do utilizador é coerente e livre de erros.

### 5.2.1 Testes de Integração da API

Para validar o backend, foi desenvolvido um script de teste de integração (`api_tests.py`). Este script, executado a partir da linha de comandos, interage com a API de um servidor em execução, simulando o comportamento de um cliente. O seu objetivo é testar os fluxos de negócio mais críticos, nomeadamente:

*   **Autenticação:** Garante que o processo de login funciona e que um token de acesso é gerado corretamente.
*   **Acesso a Endpoints Protegidos:** Verifica se os endpoints que requerem autenticação ou privilégios de administrador retornam um erro `403 Forbidden` quando acedidos sem as permissões adequadas.
*   **Funcionalidade do Cálculo de IAA:** O teste principal foca-se no endpoint `/admin/chat-rooms/{chat_room_id}/iaa`. Verifica se, para uma sala de chat válida e com anotações, a API retorna uma resposta `200 OK` com a estrutura de dados esperada (contagem de mensagens, de anotadores, score de IAA, etc.).
*   **Gestão de Erros:** Testa cenários de erro, como tentar obter a análise de IAA para uma sala de chat que não existe, confirmando que a API retorna o código de estado correto (`404 Not Found`).

Este script funcionou como uma ferramenta de "smoke testing" durante o desenvolvimento, permitindo verificar rapidamente a saúde geral do backend após a implementação de novas funcionalidades.

### 5.2.2 Validação Contínua de Dados na API

A escolha da framework FastAPI com Pydantic oferece uma camada de validação automática e contínua, que funciona como uma primeira linha de defesa contra dados inválidos.

*   **Validação de Requisições:** Para cada endpoint que recebe dados (e.g., `POST`, `PUT`), os modelos Pydantic definidos em `schemas.py` garantem que os dados recebidos têm a estrutura e os tipos corretos (e.g., que um `project_id` é um inteiro, que um `email` é uma string válida). Qualquer requisição que não cumpra o esquema é automaticamente rejeitada com um erro `422 Unprocessable Entity`, com uma descrição clara do problema.
*   **Serialização de Respostas:** Da mesma forma, os modelos de resposta garantem que os dados enviados pelo servidor para o cliente têm sempre a forma esperada, prevenindo erros no frontend causados por respostas malformadas da API.

Esta validação intrínseca à framework serve como um conjunto de micro-testes permanentemente ativos, garantindo a integridade dos dados em toda a API.

### 5.2.3 Verificação Manual da Interface

O frontend em React foi validado através de testes exploratórios manuais contínuos durante todo o ciclo de desenvolvimento. O processo seguia os principais casos de uso dos dois perfis de utilizador:

*   **Fluxo do Administrador:**
    *   Login/Logout.
    *   Criação de um novo projeto.
    *   Criação de utilizadores e atribuição ao projeto.
    *   Importação de um ficheiro CSV de mensagens.
    *   Navegação para a página de análise e verificação do cálculo de IAA.
    *   Exportação dos dados do projeto.
*   **Fluxo do Anotador:**
    *   Login/Logout.
    *   Visualização do dashboard com os projetos atribuídos.
    *   Navegação para uma sala de chat.
    *   Criação e atribuição de \textit{threads} a mensagens.
    *   Verificação do feedback visual (e.g., cores dos \textit{threads}).
    *   Navegação para a página "As Minhas Anotações" para ver o resumo do seu trabalho.

Esta verificação manual, embora menos formal, foi essencial para garantir que a usabilidade e o fluxo de trabalho na interface eram lógicos e funcionais.

## 5.3 Cobertura de Requisitos pelos Testes

A tabela seguinte mapeia as atividades de teste realizadas aos principais requisitos do sistema.

| ID do Requisito | Descrição Breve | Método de Verificação |
| :--- | :--- | :--- |
| **RF1, RF3** | Importação/Exportação de Dados | Verificação Manual (Fluxo do Admin) |
| **RF2, RF5, RF6** | Gestão de Projetos e Atribuições | Verificação Manual (Fluxo do Admin) |
| **RF4, RF5, RF7-9**| Interface e Fluxo de Anotação | Verificação Manual (Fluxo do Anotador) |
| **RF10** | Armazenamento para Métricas (IAA) | Teste de Integração da API (`api_tests.py`) |
| **RF11, RF12, RF13**| Autenticação e Permissões | Teste de Integração da API, Verificação Manual |
| **RNF1** | Tempo de Resposta | Observação durante a Verificação Manual |
| **RNF4, RNF5** | Feedback Visual e Intuitividade | Observação durante a Verificação Manual |

## 5.4 Discussão

A estratégia de verificação técnica implementada, embora não substitua uma validação formal com utilizadores, permitiu garantir um alto grau de confiança na robustez e correção funcional da plataforma. Os testes de integração da API asseguraram que a lógica de negócio crítica, incluindo o complexo cálculo de IAA, estava a funcionar corretamente. A validação de dados intrínseca ao FastAPI garantiu a integridade dos dados, e a verificação manual contínua do frontend assegurou uma experiência de utilizador coerente e funcional. Conclui-se que a solução cumpre os requisitos técnicos e funcionais a que se propôs. 