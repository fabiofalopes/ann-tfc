import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = "Loading...", size = "medium" }) => {
    return (
        <div className={`loading-spinner-container ${size}`}>
            <div className="loading-spinner"></div>
            <p className="loading-message">{message}</p>
        </div>
    );
};

export default LoadingSpinner; 