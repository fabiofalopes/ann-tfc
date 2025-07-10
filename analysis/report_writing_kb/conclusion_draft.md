# Rascunho - Capítulo 8: Conclusão

## 8.1 Conclusão

O presente Trabalho Final de Curso teve como objetivo central o desenvolvimento de uma ferramenta de software especializada para a tarefa de anotação de \textit{chat disentanglement}. O problema de base identificado foi a ausência de plataformas dedicadas que não só facilitassem o processo de anotação manual, mas que também integrassem mecanismos de análise de qualidade e concordância, forçando frequentemente os investigadores a recorrer a ferramentas genéricas e a processos de cálculo de métricas desligados da tarefa principal.

Em resposta a este desafio, foi concebida, desenvolvida e implementada uma aplicação web completa. A solução, construída sobre uma arquitetura moderna cliente-servidor (React e FastAPI), materializa-se numa plataforma funcional que permite a gestão de projetos de anotação, a atribuição de tarefas a múltiplos anotadores e, mais importante, oferece uma interface otimizada para a tarefa de desentrelaçamento de conversas.

O principal resultado deste trabalho é uma ferramenta que cumpre com sucesso os seus requisitos fundamentais. Destaca-se a implementação do cálculo automático do Inter-Annotator Agreement (IAA) através do algoritmo "1-to-1 agreement", que utiliza o Índice de Jaccard e o Algoritmo Húngaro para fornecer uma medida robusta da concordância estrutural entre anotadores. Esta funcionalidade, que foi uma recomendação explícita do júri, transforma a plataforma de uma simples ferramenta de anotação num ambiente de análise, permitindo aos gestores de projeto aferir a qualidade e a consistência das anotações diretamente no sistema.

No entanto, é com rigor académico que se reconhecem as limitações do trabalho realizado. A principal limitação reside na ausência de uma fase de validação formal com utilizadores finais. Embora a ferramenta seja funcional e tecnicamente robusta, não foi conduzido um estudo empírico para avaliar o seu impacto real na qualidade das anotações ou na experiência do anotador, em comparação com métodos alternativos. Tal estudo, semelhante ao apresentado por `[REFERENCIAR PAPER "Tools Impact on the Quality of Annotations..."]`, seria um passo essencial para validar quantitativamente as mais-valias da solução proposta. Adicionalmente, alguns requisitos não-funcionais, como a implementação de backups automáticos e testes de carga formais, foram considerados fora do âmbito da fase de desenvolvimento atual.

## 8.2 Trabalhos Futuros

As limitações identificadas abrem um caminho claro para trabalhos futuros, que poderiam elevar significativamente o impacto e a maturidade do projeto:

\begin{itemize}
    \item \textbf{Estudo de Validação com Utilizadores:} O passo mais crítico seria a realização de um estudo formal. Este estudo envolveria um grupo de anotadores que realizaria a mesma tarefa de anotação utilizando a nossa ferramenta e um método de base (e.g., folha de cálculo). Seriam analisadas tanto métricas objetivas (tempo de conclusão da tarefa, scores de IAA) como métricas subjetivas (inquéritos de satisfação e usabilidade, como o System Usability Scale - SUS).

    \item \textbf{Expansão de Métricas de Análise:} A plataforma poderia ser enriquecida com o cálculo de outras métricas de concordância, como o Krippendorff's Alpha, que é mais flexível em cenários com múltiplos anotadores e dados em falta.

    \item \textbf{Generalização da Ferramenta:} A arquitetura foi pensada de forma modular. Um próximo passo seria abstrair o processo de anotação para que a plataforma pudesse ser configurada para outros tipos de tarefas (e.g., anotação de entidades, análise de sentimento), tornando-a uma ferramenta de anotação mais genérica e, consequentemente, com um espetro de aplicação mais vasto.

    \item \textbf{Melhorias de Infraestrutura e Performance:} Implementar as funcionalidades de backup e realizar testes de carga para otimizar o desempenho da API e da base de dados para um número elevado de utilizadores concorrentes, incluindo a migração para um driver de base de dados assíncrono como o `asyncpg`.
\end{itemize}

Em suma, este projeto entregou com sucesso uma solução aplicacional concreta para um problema real no domínio do processamento de linguagem natural, estabelecendo uma base sólida sobre a qual futuras investigações e desenvolvimentos podem ser construídos. 