import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects as projectsApi, annotations as annotationsApi } from '../utils/api';
import './AdminChatRoomView.css';

const AdminChatRoomView = () => {
    const { projectId, roomId } = useParams();
    const navigate = useNavigate();
    const [chatRoom, setChatRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageAnnotations, setMessageAnnotations] = useState({});
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch all required data
            const [chatRoomData, messagesData, usersData] = await Promise.all([
                projectsApi.getChatRoom(projectId, roomId),
                projectsApi.getChatMessages(projectId, roomId),
                projectsApi.getProjectUsers(projectId)
            ]);
            
            setChatRoom(chatRoomData);
            setMessages(messagesData);
            setAssignedUsers(usersData);

            // Fetch annotations for each message
            const annotationsData = {};
            for (const message of messagesData) {
                try {
                    const annotations = await annotationsApi.getMessageAnnotations(projectId, message.id);
                    annotationsData[message.id] = annotations;
                } catch (err) {
                    console.error(`Failed to fetch annotations for message ${message.id}:`, err);
                    annotationsData[message.id] = [];
                }
            }
            setMessageAnnotations(annotationsData);

            // Calculate simple stats
            const totalMessages = messagesData.length;
            const totalUsers = usersData.length;
            let annotatedMessages = 0;
            let totalAnnotations = 0;

            Object.values(annotationsData).forEach(annotations => {
                if (annotations.length > 0) {
                    annotatedMessages++;
                    totalAnnotations += annotations.length;
                }
            });

            setStats({
                totalMessages,
                totalUsers,
                annotatedMessages,
                totalAnnotations,
                completionRate: totalMessages > 0 ? ((annotatedMessages / totalMessages) * 100).toFixed(1) : 0
            });

        } catch (err) {
            console.error("Failed to fetch admin chat room data:", err);
            setError(err.response?.data?.detail || err.message || 'Failed to load chat room data.');
        } finally {
            setLoading(false);
        }
    }, [projectId, roomId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getUsersWhoAnnotated = (messageId) => {
        const annotations = messageAnnotations[messageId] || [];
        return [...new Set(annotations.map(ann => ann.annotator_email))];
    };

    const getUsersWhoDidntAnnotate = (messageId) => {
        const annotatedUsers = getUsersWhoAnnotated(messageId);
        return assignedUsers.filter(user => !annotatedUsers.includes(user.email));
    };

    if (loading) return <div className="loading-container">Loading chat room...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;
    if (!chatRoom) return <div>Chat room not found.</div>;

    return (
        <div className="admin-chat-room-view">
            <header className="page-header">
                <button onClick={() => navigate(`/admin/projects/${projectId}`)} className="back-button">
                    ← Back to Project
                </button>
                <div className="header-info">
                    <h1>{chatRoom.name}</h1>
                    <p className="chat-room-description">{chatRoom.description}</p>
                </div>
            </header>

            <div className="stats-panel">
                <div className="stat-item">
                    <span className="stat-value">{stats.totalMessages}</span>
                    <span className="stat-label">Total Messages</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{stats.totalUsers}</span>
                    <span className="stat-label">Assigned Users</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{stats.annotatedMessages}</span>
                    <span className="stat-label">Annotated Messages</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{stats.completionRate}%</span>
                    <span className="stat-label">Completion Rate</span>
                </div>
            </div>

            <div className="annotators-reference">
                <h3>Annotators Reference</h3>
                <div className="annotators-grid">
                    {assignedUsers.map(user => (
                        <div key={user.id} className="annotator-profile">
                            <span className="profile-name">{user.email.split('@')[0]}</span>
                            <span className="profile-email">{user.email}</span>
                            <span className="profile-id">ID: {user.id}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="messages-container">
                {messages.map((message, index) => {
                    const annotations = messageAnnotations[message.id] || [];
                    const annotatedUsers = getUsersWhoAnnotated(message.id);
                    const missingUsers = getUsersWhoDidntAnnotate(message.id);
                    
                    return (
                        <div key={message.id} className="message-card">
                            <div className="message-header">
                                <span className="turn-number">#{message.turn_id || index + 1}</span>
                                <span className="user-badge">{message.user_id}</span>
                                {message.reply_to_turn && (
                                    <span className="reply-indicator">↳ #{message.reply_to_turn}</span>
                                )}
                                <div className="annotation-status">
                                    <span className={annotations.length > 0 ? "status-done" : "status-pending"}>
                                        {annotations.length > 0 ? `${annotatedUsers.length}/${assignedUsers.length}` : '0'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="message-body">
                                <div className="message-text">
                                    {message.turn_text}
                                </div>
                                
                                <div className="annotators-section">
                                    {annotatedUsers.length > 0 ? (
                                        <div className="annotated-by">
                                            {annotatedUsers.map(userEmail => {
                                                const userAnnotations = annotations.filter(ann => ann.annotator_email === userEmail);
                                                const threadIds = userAnnotations.map(ann => ann.thread_id).join(', ');
                                                const userName = userEmail.split('@')[0];
                                                
                                                return (
                                                    <div key={userEmail} className="annotator-item">
                                                        <span className="annotator-name" title={userEmail}>
                                                            {userName}
                                                        </span>
                                                        <span className="thread-info">
                                                            {threadIds}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="no-annotations">
                                            <span className="pending-label">No annotations yet</span>
                                        </div>
                                    )}
                                    
                                    {missingUsers.length > 0 && (
                                        <div className="missing-users-section">
                                            <span className="missing-label">Pending:</span>
                                            <div className="missing-users-compact">
                                                {missingUsers.map(user => (
                                                    <span key={user.id} className="missing-tag" title={user.email}>
                                                        {user.email.split('@')[0]}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminChatRoomView; 