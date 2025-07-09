import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { annotations } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import './MyAnnotationsPage.css';

const MyAnnotationsPage = () => {
    const { projectId } = useParams();
    const [myAnnotations, setMyAnnotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupedAnnotations, setGroupedAnnotations] = useState({});
    const [expandedCards, setExpandedCards] = useState({});
    const [stats, setStats] = useState({
        totalAnnotations: 0,
        chatRoomsAnnotated: 0,
        threadsCreated: 0
    });

    useEffect(() => {
        const fetchMyAnnotations = async () => {
            try {
                const annotationsData = await annotations.getMyAnnotations(projectId);
                setMyAnnotations(annotationsData);
                
                // Group annotations by chat room for better organization
                const grouped = annotationsData.reduce((acc, annotation) => {
                    const chatRoomId = annotation.chat_room_id;
                    if (!acc[chatRoomId]) {
                        acc[chatRoomId] = {
                            chatRoomId,
                            chatRoomName: annotation.chat_room_name || `Chat Room ${chatRoomId}`,
                            annotations: []
                        };
                    }
                    acc[chatRoomId].annotations.push(annotation);
                    return acc;
                }, {});
                
                setGroupedAnnotations(grouped);
                
                // Initialize all cards as expanded by default
                const initialExpandedState = {};
                Object.keys(grouped).forEach(chatRoomId => {
                    initialExpandedState[chatRoomId] = true;
                });
                setExpandedCards(initialExpandedState);
                
                // Calculate statistics
                const uniqueThreads = new Set(annotationsData.map(a => a.thread_id)).size;
                setStats({
                    totalAnnotations: annotationsData.length,
                    chatRoomsAnnotated: Object.keys(grouped).length,
                    threadsCreated: uniqueThreads
                });
                
            } catch (err) {
                setError(err.response?.data?.detail || err.message || 'Failed to fetch your annotations');
            } finally {
                setLoading(false);
            }
        };

        fetchMyAnnotations();
    }, [projectId]);

    const toggleCardExpansion = (chatRoomId) => {
        setExpandedCards(prev => ({
            ...prev,
            [chatRoomId]: !prev[chatRoomId]
        }));
    };

    if (loading) return <LoadingSpinner message="Loading your annotations..." />;
    if (error) return (
        <ErrorMessage 
            message={error} 
            title="Failed to Load Annotations"
            onRetry={() => window.location.reload()}
        />
    );

    return (
        <div className="my-annotations-page">
            <header className="page-header">
                <Link to={`/projects/${projectId}`} className="back-button">
                    ← Back to Project
                </Link>
                <div className="header-content">
                    <h2>My Annotations</h2>
                    <p>Review your annotation progress for this project</p>
                </div>
            </header>

            <div className="annotations-stats">
                <div className="stat-card">
                    <div className="stat-number">{stats.totalAnnotations}</div>
                    <div className="stat-label">Total Annotations</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{stats.chatRoomsAnnotated}</div>
                    <div className="stat-label">Chat Rooms</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number">{stats.threadsCreated}</div>
                    <div className="stat-label">Threads Created</div>
                </div>
            </div>

            {myAnnotations.length === 0 ? (
                <div className="empty-state">
                    <h3>No annotations yet</h3>
                    <p>You haven't created any annotations for this project yet. Start by selecting a chat room to annotate.</p>
                    <Link to={`/projects/${projectId}`} className="action-button">
                        🚀 Start Annotating
                    </Link>
                </div>
            ) : (
                <div className="annotations-content">
                    {Object.values(groupedAnnotations).map(chatRoomGroup => {
                        const isExpanded = expandedCards[chatRoomGroup.chatRoomId];
                        return (
                            <div key={chatRoomGroup.chatRoomId} className={`chat-room-group ${isExpanded ? 'expanded' : 'collapsed'}`}>
                                <div className="chat-room-header" onClick={() => toggleCardExpansion(chatRoomGroup.chatRoomId)}>
                                    <div className="chat-room-title">
                                        <button className="expand-toggle">
                                            {isExpanded ? '▼' : '▶'}
                                        </button>
                                        <h3>{chatRoomGroup.chatRoomName}</h3>
                                        <span className="annotation-count">
                                            {chatRoomGroup.annotations.length} annotations
                                        </span>
                                    </div>
                                    <div className="chat-room-actions" onClick={(e) => e.stopPropagation()}>
                                        <Link 
                                            to={`/projects/${projectId}/chat-rooms/${chatRoomGroup.chatRoomId}`}
                                            className="continue-button"
                                        >
                                            📝 Continue Annotating
                                        </Link>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="annotations-summary">
                                <div className="summary-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Turns Annotated:</span>
                                        <span className="stat-value">{chatRoomGroup.annotations.length}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Unique Threads:</span>
                                        <span className="stat-value">
                                            {new Set(chatRoomGroup.annotations.map(a => a.thread_id)).size}
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Last Updated:</span>
                                        <span className="stat-value">
                                            {new Date(Math.max(...chatRoomGroup.annotations.map(a => new Date(a.created_at)))).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="thread-distribution">
                                    <h4>Thread Distribution</h4>
                                    <div className="thread-chart">
                                        {Object.entries(
                                            chatRoomGroup.annotations.reduce((acc, annotation) => {
                                                acc[annotation.thread_id] = (acc[annotation.thread_id] || 0) + 1;
                                                return acc;
                                            }, {})
                                        )
                                        .sort(([,a], [,b]) => b - a) // Sort by count descending
                                        .map(([threadId, count]) => {
                                            const maxCount = Math.max(...Object.values(
                                                chatRoomGroup.annotations.reduce((acc, annotation) => {
                                                    acc[annotation.thread_id] = (acc[annotation.thread_id] || 0) + 1;
                                                    return acc;
                                                }, {})
                                            ));
                                            const percentage = (count / maxCount) * 100;
                                            
                                            return (
                                                <div key={threadId} className="thread-bar-item">
                                                    <div className="thread-bar-header">
                                                        <span className="thread-name">{threadId}</span>
                                                        <span className="thread-count">{count} turns</span>
                                                    </div>
                                                    <div className="thread-bar-container">
                                                        <div 
                                                            className="thread-bar-fill"
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                

                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyAnnotationsPage; 