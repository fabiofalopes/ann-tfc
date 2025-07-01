import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { annotations as annotationsApi, projects as projectsApi } from '../utils/api';
import './AnnotationAnalysisPage.css';

const AnnotationAnalysisPage = () => {
    const { projectId, roomId } = useParams();
    const navigate = useNavigate();
    const [chatRoom, setChatRoom] = useState(null);
    const [aggregatedData, setAggregatedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterAnnotator, setFilterAnnotator] = useState('');
    const [showOnlyDiscordant, setShowOnlyDiscordant] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [chatRoomData, aggregatedAnnotations] = await Promise.all([
                    projectsApi.getChatRoom(projectId, roomId),
                    annotationsApi.getAggregatedAnnotations(roomId)
                ]);
                
                setChatRoom(chatRoomData);
                setAggregatedData(aggregatedAnnotations);
            } catch (err) {
                console.error('Error fetching analysis data:', err);
                setError('Failed to load annotation analysis data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId, roomId]);

    const getThreadColor = (threadId) => {
        // Simple hash function to assign consistent colors to threads
        let hash = 0;
        for (let i = 0; i < threadId.length; i++) {
            hash = threadId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 85%)`;
    };

    /**
     * ALGORITMO DE DETECÇÃO DE THREADS EQUIVALENTES
     * 
     * Este algoritmo resolve o problema onde diferentes anotadores usam nomes/símbolos 
     * diferentes para referenciar a mesma thread conversacional.
     * 
     * PROBLEMA EXEMPLO:
     * - Anotador A usa "T0", "T1", "T2" para threads
     * - Anotador B usa "A", "B", "C" para as mesmas threads
     * - Sem este algoritmo: todas as mensagens seriam marcadas como discordantes
     * - Com este algoritmo: detecta que "T0"≡"A", "T1"≡"B", etc.
     * 
     * FUNCIONAMENTO:
     * 1. Analisa padrões de co-ocorrência entre pares de anotadores
     * 2. Identifica threads que sempre aparecem juntas nas mesmas mensagens
     * 3. Cria mapa de equivalências baseado em evidência estatística
     * 4. Normaliza todos os thread_ids antes de verificar discordância
     */
    const buildThreadEquivalenceMap = (messages) => {
        const equivalenceMap = new Map();
        const annotatorPairs = new Map();
        
        // PASSO 1: Coletar todas as combinações de threads entre pares de anotadores
        // Para cada mensagem com múltiplas anotações, registamos que threads 
        // diferentes anotadores usaram para a mesma mensagem
        messages.forEach(message => {
            if (message.annotations.length >= 2) {
                // Criar todas as combinações possíveis de pares de anotadores
                for (let i = 0; i < message.annotations.length; i++) {
                    for (let j = i + 1; j < message.annotations.length; j++) {
                        const ann1 = message.annotations[i];
                        const ann2 = message.annotations[j];
                        
                        // Só processar se forem anotadores diferentes
                        if (ann1.annotator_email !== ann2.annotator_email) {
                            // Criar chave única para este par de anotadores (ordenada alfabeticamente)
                            const annotatorKey = [ann1.annotator_email, ann2.annotator_email].sort().join('|');
                            // Criar chave para este par de threads (ordenada alfabeticamente)
                            const threadPair = [ann1.thread_id, ann2.thread_id].sort().join('|');
                            
                            // Inicializar estrutura de dados se necessário
                            if (!annotatorPairs.has(annotatorKey)) {
                                annotatorPairs.set(annotatorKey, new Map());
                            }
                            
                            // Contar quantas vezes este par de threads aparece junto
                            const pairs = annotatorPairs.get(annotatorKey);
                            pairs.set(threadPair, (pairs.get(threadPair) || 0) + 1);
                        }
                    }
                }
            }
        });
        
        // PASSO 2: Identificar mapeamentos consistentes de threads
        // Analisa a frequência de co-ocorrência para determinar equivalências
        annotatorPairs.forEach((threadPairs, annotatorKey) => {
            const [annotator1, annotator2] = annotatorKey.split('|');
            
            // Calcular total de interações entre estes dois anotadores
            const totalPairs = Array.from(threadPairs.values()).reduce((sum, count) => sum + count, 0);
            
            // Procurar por pares de threads que aparecem consistentemente juntos
            threadPairs.forEach((count, threadPair) => {
                // CRITÉRIOS DE EQUIVALÊNCIA:
                // 1. Pelo menos 2 ocorrências (evita coincidências isoladas)
                // 2. Mais de 50% das interações entre estes anotadores (evidência forte)
                if (count >= 2 && count / totalPairs > 0.5) {
                    const [thread1, thread2] = threadPair.split('|');
                    
                    // Só criar equivalência se os thread_ids forem realmente diferentes
                    // (evita mapear "T0" para "T0")
                    if (thread1 !== thread2) {
                        // Normalizar para o thread alfabeticamente primeiro
                        // Isto garante consistência: tanto "T0"→"A" como "A"→"A"
                        const normalizedThread = [thread1, thread2].sort()[0];
                        equivalenceMap.set(thread1, normalizedThread);
                        equivalenceMap.set(thread2, normalizedThread);
                    }
                }
            });
        });
        
        return equivalenceMap;
    };

    /**
     * Normaliza um thread_id usando o mapa de equivalências
     * 
     * @param {string} threadId - ID original do thread
     * @param {Map} equivalenceMap - Mapa de equivalências detectadas
     * @returns {string} - Thread ID normalizado ou original se não houver equivalência
     */
    const normalizeThreadId = (threadId, equivalenceMap) => {
        return equivalenceMap.get(threadId) || threadId;
    };

    /**
     * Determina se uma mensagem tem anotações discordantes (inconsistentes)
     * 
     * Uma mensagem é considerada discordante quando diferentes anotadores 
     * atribuem-na a threads semanticamente diferentes.
     * 
     * IMPORTANTE: Esta função usa normalização de thread_ids para considerar
     * threads equivalentes como concordantes.
     * 
     * EXEMPLOS:
     * - Concordante: [fabio:"T0", ana:"A"] onde T0≡A (detectado pelo algoritmo)
     * - Discordante: [fabio:"T0", ana:"B"] onde T0≢B (threads diferentes)
     * - Não aplicável: mensagem com 0 ou 1 anotação (não há comparação possível)
     * 
     * @param {Object} message - Objeto da mensagem com array de annotations
     * @param {Map} equivalenceMap - Mapa de equivalências de threads
     * @returns {boolean} - true se discordante, false se concordante ou não aplicável
     */
    const isDiscordantMessage = (message, equivalenceMap) => {
        // Mensagens com 0 ou 1 anotação não podem ser discordantes
        // (precisa de pelo menos 2 anotações para comparar)
        if (message.annotations.length <= 1) return false;
        
        // Normalizar todos os thread_ids usando o mapa de equivalências
        // Isto converte threads equivalentes (ex: "T0" e "A") para o mesmo ID normalizado
        const normalizedThreads = message.annotations.map(ann => 
            normalizeThreadId(ann.thread_id, equivalenceMap)
        );
        
        // Usar o primeiro thread normalizado como referência
        const firstNormalizedThread = normalizedThreads[0];
        
        // Se algum thread normalizado for diferente do primeiro, há discordância
        return normalizedThreads.some(thread => thread !== firstNormalizedThread);
    };

    /**
     * Aplica filtros às mensagens e retorna dados processados
     * 
     * Esta função é o ponto central onde o algoritmo de equivalência de threads
     * é aplicado para toda a análise de concordância/discordância.
     * 
     * FLUXO:
     * 1. Constrói mapa de equivalências analisando todas as mensagens
     * 2. Aplica filtros do utilizador (anotador específico, só discordantes)
     * 3. Retorna mensagens filtradas + mapa de equivalências para uso posterior
     * 
     * @returns {Object} - { messages: Array, equivalenceMap: Map }
     */
    const getFilteredMessages = () => {
        if (!aggregatedData) return [];
        
        // PASSO CRÍTICO: Construir mapa de equivalências antes de qualquer análise
        // Este mapa será usado em todos os cálculos de concordância/discordância
        const equivalenceMap = buildThreadEquivalenceMap(aggregatedData.messages);
        
        let filtered = aggregatedData.messages;
        
        // Filtro opcional: mostrar apenas mensagens de um anotador específico
        if (filterAnnotator) {
            filtered = filtered.filter(message => 
                message.annotations.some(ann => ann.annotator_email === filterAnnotator)
            );
        }
        
        // Filtro opcional: mostrar apenas mensagens discordantes
        // NOTA: A função isDiscordantMessage usa o equivalenceMap para detecção precisa
        if (showOnlyDiscordant) {
            filtered = filtered.filter(message => isDiscordantMessage(message, equivalenceMap));
        }
        
        // Retornar tanto as mensagens filtradas como o mapa de equivalências
        // O mapa é necessário para cálculos de estatísticas e renderização
        return { messages: filtered, equivalenceMap };
    };

    if (loading) return <div className="loading">Loading analysis...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!aggregatedData) return <div className="error">No data available</div>;

    // APLICAÇÃO DO ALGORITMO DE EQUIVALÊNCIA DE THREADS
    // Obter dados processados com mapa de equivalências aplicado
    const filteredData = getFilteredMessages();
    const filteredMessages = filteredData.messages;
    const equivalenceMap = filteredData.equivalenceMap;
    
    // CÁLCULO DE ESTATÍSTICAS CORRIGIDAS
    // Contar mensagens discordantes usando o mapa de equivalências
    // Isto garante que threads semanticamente equivalentes não sejam contadas como discordantes
    const discordantCount = aggregatedData.messages.filter(message => 
        isDiscordantMessage(message, equivalenceMap)
    ).length;
    
    // Calcular taxa de concordância: (mensagens concordantes / total anotadas) * 100
    // Mensagens concordantes = Total anotadas - Discordantes
    const concordanceRate = aggregatedData.annotated_messages > 0 
        ? ((aggregatedData.annotated_messages - discordantCount) / aggregatedData.annotated_messages * 100).toFixed(1)
        : 0;

    return (
        <div className="annotation-analysis-page">
            <div className="analysis-header">
                <button 
                    onClick={() => navigate(`/admin/projects/${projectId}`)} 
                    className="back-button"
                >
                    ← Back to Project
                </button>
                <h1>Annotation Analysis: {chatRoom?.name}</h1>
            </div>

            {/* Statistics Summary */}
            <div className="statistics-summary">
                <div className="stat-card">
                    <h3>Total Messages</h3>
                    <div className="stat-value">{aggregatedData.total_messages}</div>
                </div>
                <div className="stat-card">
                    <h3>Annotated Messages</h3>
                    <div className="stat-value">{aggregatedData.annotated_messages}</div>
                </div>
                <div className="stat-card">
                    <h3>Total Annotators</h3>
                    <div className="stat-value">{aggregatedData.total_annotators}</div>
                </div>
                <div className="stat-card">
                    <h3>Concordance Rate</h3>
                    <div className="stat-value">{concordanceRate}%</div>
                </div>
                <div className="stat-card">
                    <h3>Discordant Messages</h3>
                    <div className="stat-value discordant">{discordantCount}</div>
                </div>
            </div>

            {/* Annotators List */}
            <div className="annotators-section">
                <h3>Annotators in this Chat Room:</h3>
                <div className="annotators-list">
                    {aggregatedData.annotators.map(email => (
                        <span key={email} className="annotator-badge">{email}</span>
                    ))}
                </div>
            </div>

            {/* Thread Equivalences Section */}
            {equivalenceMap.size > 0 && (
                <div className="equivalences-section">
                    <h3>Detected Thread Equivalences:</h3>
                    <div className="equivalences-info">
                        <p>The following threads were detected as equivalent (representing the same conversation thread):</p>
                        <div className="equivalences-list">
                            {Array.from(new Set(equivalenceMap.values())).map(normalizedThread => {
                                const equivalentThreads = Array.from(equivalenceMap.entries())
                                    .filter(([_, normalized]) => normalized === normalizedThread)
                                    .map(([original, _]) => original);
                                
                                if (equivalentThreads.length > 1) {
                                    return (
                                        <div key={normalizedThread} className="equivalence-group">
                                            {equivalentThreads.map((thread, index) => (
                                                <span key={thread}>
                                                    <span 
                                                        className="thread-badge"
                                                        style={{ backgroundColor: getThreadColor(thread) }}
                                                    >
                                                        {thread}
                                                    </span>
                                                    {index < equivalentThreads.length - 1 && <span className="equivalence-symbol"> ≡ </span>}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-section">
                <div className="filter-group">
                    <label htmlFor="annotator-filter">Filter by Annotator:</label>
                    <select 
                        id="annotator-filter"
                        value={filterAnnotator} 
                        onChange={(e) => setFilterAnnotator(e.target.value)}
                    >
                        <option value="">All Annotators</option>
                        {aggregatedData.annotators.map(email => (
                            <option key={email} value={email}>{email}</option>
                        ))}
                    </select>
                </div>
                
                <div className="filter-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={showOnlyDiscordant}
                            onChange={(e) => setShowOnlyDiscordant(e.target.checked)}
                        />
                        Show only discordant messages
                    </label>
                </div>
            </div>

            {/* Messages Analysis Table */}
            <div className="messages-analysis">
                <h3>Messages and Annotations ({filteredMessages.length} shown)</h3>
                
                {filteredMessages.length === 0 ? (
                    <p className="no-data">No messages match the current filters.</p>
                ) : (
                    <div className="analysis-table">
                        <div className="table-header">
                            <div className="col-turn">Turn ID</div>
                            <div className="col-message">Message</div>
                            <div className="col-annotations">Annotations</div>
                            <div className="col-status">Status</div>
                        </div>
                        
                        {filteredMessages.map(message => (
                            <div 
                                key={message.message_id} 
                                className={`table-row ${isDiscordantMessage(message, equivalenceMap) ? 'discordant' : 'concordant'}`}
                            >
                                <div className="col-turn">
                                    <strong>{message.turn_id}</strong>
                                    <small>by {message.user_id}</small>
                                </div>
                                
                                <div className="col-message">
                                    <p>{message.message_text}</p>
                                </div>
                                
                                <div className="col-annotations">
                                    {message.annotations.length === 0 ? (
                                        <span className="no-annotations">No annotations</span>
                                    ) : (
                                        <div className="annotations-list">
                                            {message.annotations.map((annotation, index) => (
                                                <div 
                                                    key={index} 
                                                    className="annotation-item"
                                                    style={{ backgroundColor: getThreadColor(annotation.thread_id) }}
                                                >
                                                    <strong>{annotation.thread_id}</strong>
                                                    <small>by {annotation.annotator_email}</small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="col-status">
                                    {message.annotations.length === 0 ? (
                                        <span className="status-badge unannotated">Unannotated</span>
                                    ) : message.annotations.length === 1 ? (
                                        <span className="status-badge single">Single</span>
                                    ) : isDiscordantMessage(message, equivalenceMap) ? (
                                        <span className="status-badge discordant">Discordant</span>
                                    ) : (
                                        <span className="status-badge concordant">Concordant</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Future: IAA Calculation Section */}
            <div className="iaa-section">
                <h3>Inter-Annotator Agreement (Coming Soon)</h3>
                <p>Phase 4 will add automatic calculation of IAA metrics like Cohen's Kappa and Krippendorff's Alpha.</p>
                <button className="btn-primary" disabled>
                    Calculate IAA Metrics
                </button>
            </div>
        </div>
    );
};

export default AnnotationAnalysisPage; 