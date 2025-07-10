# Rascunho - Capítulo 1: Introdução

## 1.1 Enquadramento

A anotação de dados é um processo fundamental no treino de modelos de Machine Learning, particularmente em aplicações de Processamento de Linguagem Natural (NLP). No contexto do AISIC LAB (Artificial Intelligence, Social Interaction and Complexity), a análise de interações em ambientes de chat representa uma área de investigação ativa, que depende criticamente da existência de dados de alta qualidade. Uma das tarefas mais desafiadoras neste domínio é o **\textit{chat disentanglement}**, o processo de separar um diálogo, que pode conter múltiplas conversas entrelaçadas, nos seus \textit{threads} constituintes.

## 1.2 Motivação e Identificação do Problema

A motivação principal deste projeto emerge da ausência de ferramentas que sejam, simultaneamente, especializadas na tarefa de \textit{chat disentanglement} e que integrem mecanismos de controlo de qualidade e análise da concordância entre anotadores (Inter-Annotator Agreement - IAA).

As ferramentas de anotação existentes tendem a ser ou demasiado genéricas, não oferecendo uma interface otimizada para a complexidade do \textit{disentanglement}, ou são plataformas fechadas e difíceis de adaptar. Esta lacuna obriga frequentemente os investigadores a recorrer a processos manuais (e.g., folhas de cálculo) e a calcular métricas de qualidade de forma desintegrada, um fluxo de trabalho ineficiente e propenso a erros.

O problema central que este trabalho se propõe a resolver é, portanto, o seguinte: **Como podemos criar um ambiente de software integrado que não só facilite a tarefa de anotação de \textit{chat disentanglement}, mas que também forneça aos gestores de projeto as ferramentas para gerir o processo e avaliar a qualidade das anotações produzidas?**

## 1.3 Objetivos e Contribuições

Para responder ao problema identificado, foram definidos os seguintes objetivos específicos para o projeto, todos eles alcançados:

1.  **Desenvolver uma Ferramenta Dedicada:** Construir uma aplicação web completa, com um frontend reativo e um backend robusto, especificamente desenhada para a tarefa de \textit{chat disentanglement}.
2.  **Implementar Funcionalidades de Gestão:** Dotar a plataforma de um painel de administração para a gestão de múltiplos projetos e utilizadores (anotadores e administradores), com controlo de acesso granular.
3.  **Automatizar o Cálculo de Métricas de Qualidade:** Implementar o cálculo automático do Inter-Annotator Agreement (IAA) como uma funcionalidade central, permitindo a análise da consistência entre anotadores diretamente na plataforma.
4.  **Garantir a Interoperabilidade:** Assegurar que os dados (mensagens e anotações) possam ser facilmente importados e exportados em formatos padrão (CSV, JSON), facilitando a integração da ferramenta em fluxos de trabalho de investigação mais vastos.

A **principal contribuição** deste trabalho é a entrega de uma **ferramenta de anotação open-source, funcional e especializada**, que preenche a lacuna identificada. A plataforma não só otimiza o processo de anotação de \textit{disentanglement}, como também enriquece o ecossistema de ferramentas de NLP ao integrar a análise de qualidade como uma parte intrínseca do fluxo de trabalho.

## 1.4 Estrutura do Documento

Este documento está organizado da seguinte forma:

*   **Capítulo 2 - Pertinência e Viabilidade:** Apresenta uma análise do estado da arte e compara a solução proposta com ferramentas existentes, justificando a sua relevância.
*   **Capítulo 3 - Especificação e Modelação:** Detalha os requisitos funcionais e não-funcionais e a modelação da arquitetura e da base de dados.
*   **Capítulo 4 - Solução Proposta:** Descreve em detalhe a arquitetura final da aplicação, as tecnologias utilizadas e os seus principais componentes.
*   **Capítulo 5 - Testes e Validação:** Apresenta a estratégia de verificação técnica utilizada para garantir a robustez e o correto funcionamento do sistema.
*   **Capítulo 6 - Método e Planeamento:** Detalha a metodologia de desenvolvimento e realiza uma análise crítica do planeamento face à execução real do projeto.
*   **Capítulo 7 - Resultados:** Apresenta os resultados concretos da implementação, incluindo as funcionalidades da plataforma e a documentação técnica gerada.
*   **Capítulo 8 - Conclusão:** Sintetiza as contribuições do trabalho, discute as suas limitações e aponta direções para trabalhos futuros. 