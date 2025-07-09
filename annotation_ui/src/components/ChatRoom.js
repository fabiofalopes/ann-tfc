import React, { useRef, useEffect, useState } from 'react';
import MessageBubble from './MessageBubble';
import './ChatRoom.css';

const ChatRoom = ({ messages, onAnnotation, tags, isLoading, error, projectId }) => {
    const chatBoxRef = useRef(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [annotationInProgress, setAnnotationInProgress] = useState({});

    useEffect(() => {
        if (chatBoxRef.current) {
            if (isInitialLoad) {
                chatBoxRef.current.scrollTop = 0;
                setIsInitialLoad(false);
            }
        }
    }, [messages, isInitialLoad]);

    const handleAnnotation = async (messageId, tagName) => {
        if (!projectId) {
            console.error('No project ID provided for annotation');
            return;
        }
        const currentScrollPosition = chatBoxRef.current.scrollTop;
        setAnnotationInProgress(prev => ({ ...prev, [messageId]: true }));
        try {
            await onAnnotation(projectId, messageId, tagName);
        } catch (err) {
            console.error('Error in annotation:', err);
        } finally {
            setAnnotationInProgress(prev => ({ ...prev, [messageId]: false }));
            setTimeout(() => {
                chatBoxRef.current.scrollTop = currentScrollPosition;
            }, 0);
        }
    };

    const handleUserClick = (userId) => {
        setSelectedUserId(prevUserId => prevUserId === userId ? null : userId);
    };

    if (isLoading) {
        return (
            <div className="chat-room loading">
                <div className="loading-spinner"></div>
                <p>Loading messages...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chat-room error">
                <div className="error-message">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-room">
            <div className="chat-stats">
                <span>Total Turns: {messages.length}</span>
                <span>Threads: {Object.keys(tags).length}</span>
                {selectedUserId && (
                    <span>Selected User: {selectedUserId}</span>
                )}
            </div>
            <div className="chat-box" ref={chatBoxRef}>
                {messages.map((message) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        tag={tags[message.thread]}
                        onTagUpdate={(tagName) => handleAnnotation(message.id, tagName)}
                        isUserSelected={selectedUserId === message.user_id}
                        onUserClick={handleUserClick}
                        isAnnotating={annotationInProgress[message.id]}
                    />
                ))}
            </div>
        </div>
    );
};

export default ChatRoom;