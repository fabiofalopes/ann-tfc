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
                    {Object.values(groupedAnnotations).map(chatRoomGroup => (
                        <div key={chatRoomGroup.chatRoomId} className="chat-room-group">
                            <div className="chat-room-header">
                                <div className="chat-room-title">
                                    <h3>{chatRoomGroup.chatRoomName}</h3>
                                    <span className="annotation-count">
                                        {chatRoomGroup.annotations.length} annotations
                                    </span>
                                </div>
                                <div className="chat-room-actions">
                                    <Link 
                                        to={`/projects/${projectId}/chat-rooms/${chatRoomGroup.chatRoomId}`}
                                        className="continue-button"
                                    >
                                        📝 Continue Annotating
                                    </Link>
                                </div>
                            </div>
                            
                            <div className="annotations-summary">
                                <div className="summary-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Messages Annotated:</span>
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
                                    <div className="thread-list">
                                        {Object.entries(
                                            chatRoomGroup.annotations.reduce((acc, annotation) => {
                                                acc[annotation.thread_id] = (acc[annotation.thread_id] || 0) + 1;
                                                return acc;
                                            }, {})
                                        ).map(([threadId, count]) => (
                                            <div key={threadId} className="thread-item">
                                                <span className="thread-name">Thread {threadId}</span>
                                                <span className="thread-count">{count} messages</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="recent-activity">
                                    <h4>Recent Activity</h4>
                                    <div className="activity-list">
                                        {chatRoomGroup.annotations
                                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                            .slice(0, 3)
                                            .map(annotation => (
                                                <div key={annotation.id} className="activity-item">
                                                    <div className="activity-info">
                                                        <span className="activity-thread">Thread {annotation.thread_id}</span>
                                                        <span className="activity-message">
                                                            {annotation.message_text}
                                                        </span>
                                                    </div>
                                                    <span className="activity-date">
                                                        {new Date(annotation.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyAnnotationsPage; 