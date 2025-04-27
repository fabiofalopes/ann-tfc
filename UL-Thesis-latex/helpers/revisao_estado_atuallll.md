# Nota de Revisão: Estado Atual do Projeto (Pré-2ª Entrega)

Este documento serve como guia interno para a revisão do relatório LaTeX, refletindo sobre o estado atual do desenvolvimento e as decisões tomadas.

## 1. Visão Inicial vs. Realidade Atual

*   **Visão Inicial:** O projeto foi concebido com uma forte ambição de **modularidade**, visando criar uma plataforma extensível capaz de suportar **diversos tipos de tarefas de anotação** e formatos de dados no futuro.
*   **Realidade/Priorização:** Constatou-se que implementar a visão completa de modularidade e generalidade excedia o âmbito prático e temporal do TFC. A **prioridade foi focada na entrega funcional do módulo principal: *chat disentanglement***.

## 2. Implicações no Desenvolvimento

*   **Backend (FastAPI):**
    *   Para acelerar o desenvolvimento do core funcional, o backend foi implementado de forma **mais específica para as necessidades do *chat disentanglement***.
    *   As abstrações de base de dados e API que permitiriam a fácil integração genérica de *outros* tipos de anotação **não foram implementadas nesta fase**.
    *   A arquitetura *permite* futuras extensões, mas a generalização não é uma característica *atualmente* concretizada e testada.
*   **Frontend (React):** Naturalmente, acompanhou o foco no módulo de *disentanglement*.
*   **Manipulação de Dados:**
    *   O suporte à importação está **limitado a ficheiros CSV** no momento atual, alinhado com o caso de uso priorizado.
    *   A ambição de suportar múltiplos formatos (JSON, TXT, etc.) permanece como um objetivo futuro.

## 3. Estado Atual da Aplicação (Resumo)

*   Temos uma **aplicação funcional** com frontend React e backend FastAPI.
*   O foco é a tarefa de **anotação para *chat disentanglement***.
*   Suporta **importação de CSV**.
*   Utiliza base de dados **SQLite** via ORM para persistência.
*   Deployment via **contentores Docker** (frontend + backend).

## 4. Recomendações para Revisão do Relatório

*   **Consistência:** Garantir que a descrição da solução nos capítulos (especialmente 3 e 4) reflete o **estado atual** descrito acima.
*   **Modularidade/Generalidade:**
    *   Apresentar a modularidade como um **princípio de design** ou **objetivo futuro**, não como uma funcionalidade totalmente implementada para diversos tipos de anotação.
    *   Evitar linguagem que sugira que a ferramenta *já é* facilmente extensível para qualquer tipo de anotação sem trabalho adicional significativo no backend.
    *   Ser claro sobre o suporte **atual** a formatos de dados (CSV), mencionando outros como planos futuros.
*   **Tom:** Manter um tom profissional. Explicar as decisões de priorização como escolhas conscientes para garantir a entrega do *core* do TFC, sem apresentar as limitações atuais como falhas, mas sim como estado intermédio de um projeto com potencial de evolução.

## 5. Perspetivas Futuras

*   Mantém-se a intenção de, **após garantir a robustez do módulo principal**, revisitar o backend para introduzir maior generalidade.
*   Explorar o suporte a outros formatos de dados continua a ser um ponto relevante para trabalho futuro.
*   A implementação de métricas automáticas de qualidade/IAA no backend é também um objetivo para a versão final ou iterações subsequentes. 