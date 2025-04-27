import React from 'react';
import './ThreadMenu.css';

const ThreadMenu = ({ 
    thread, 
    isLoading = false,
    error = null 
}) => {
    if (isLoading) {
        return (
            <div className="thread-menu loading">
                <div className="loading-spinner"></div>
                <span>Loading thread...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="thread-menu error">
                <span className="error-message">{error}</span>
            </div>
        );
    }

    return (
        <div className="thread-menu">
            <div className="thread-header">
                <div className="thread-name">{thread.id}</div>
                <div className="thread-stats">
                    <span className="stat-item">
                        <span className="stat-label">Messages:</span>
                        <span className="stat-value">{thread.message_count}</span>
                    </span>
                    <span className="stat-item">
                        <span className="stat-label">Annotators:</span>
                        <span className="stat-value">{thread.annotator_count}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ThreadMenu;