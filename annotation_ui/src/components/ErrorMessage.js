import React from 'react';
import './ErrorMessage.css';

const ErrorMessage = ({ 
    message, 
    title = "Error", 
    type = "error", 
    onRetry = null,
    retryText = "Try Again"
}) => {
    return (
        <div className={`error-message-container ${type}`}>
            <div className="error-icon">
                {type === 'error' && '⚠️'}
                {type === 'warning' && '⚠️'}
                {type === 'info' && 'ℹ️'}
            </div>
            <div className="error-content">
                <h3 className="error-title">{title}</h3>
                <p className="error-text">{message}</p>
                {onRetry && (
                    <button 
                        className="error-retry-button"
                        onClick={onRetry}
                    >
                        {retryText}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorMessage; 