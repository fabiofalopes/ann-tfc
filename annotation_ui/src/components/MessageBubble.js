import React, { useState } from 'react';
import TagInput from './TagInput';
import './MessageBubble.css';

const MessageBubble = ({ 
  message, 
  annotations = [], 
  onAnnotationCreate, 
  onAnnotationDelete,
  isUserSelected, 
  onUserClick, 
  isAnnotating 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [error, setError] = useState(null);
  const maxLength = 300;

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const displayText = message && message.turn_text
    ? (expanded ? message.turn_text : message.turn_text.slice(0, maxLength))
    : 'No message content';

  const shouldShowExpandButton = message?.turn_text && message.turn_text.length > maxLength;

  const handleAnnotationSubmit = async (e) => {
    e.preventDefault();
    const threadId = newAnnotation.trim();
    if (!threadId) return;
    
    try {
      setError(null);
      await onAnnotationCreate(threadId);
      setNewAnnotation('');
      setShowAnnotationForm(false);
    } catch (err) {
      console.error('Error creating annotation:', err);
      
      // Handle FastAPI validation errors (422)
      if (err.response?.status === 422 && Array.isArray(err.response.data.detail)) {
        const validationErrors = err.response.data.detail
          .map(error => error.msg)
          .join(', ');
        setError(validationErrors);
      } else {
        // Handle other types of errors
        let errorMessage;
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (typeof err.response?.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Failed to create annotation';
        }
        setError(errorMessage);
      }
    }
  };

  const handleAnnotationDelete = async (annotationId) => {
    try {
      setError(null);
      await onAnnotationDelete(annotationId);
    } catch (err) {
      console.error('Error deleting annotation:', err);
      
      // Handle FastAPI validation errors (422)
      if (err.response?.status === 422 && Array.isArray(err.response.data.detail)) {
        const validationErrors = err.response.data.detail
          .map(error => error.msg)
          .join(', ');
        setError(validationErrors);
      } else {
        // Handle other types of errors
        let errorMessage;
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err.response?.data?.detail) {
          errorMessage = err.response.data.detail;
        } else if (typeof err.response?.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.message) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Failed to delete annotation';
        }
        setError(errorMessage);
      }
    }
  };

  return (
    <div 
      className={`message-bubble ${expanded ? 'expanded' : ''} ${isUserSelected ? 'user-selected' : ''} ${isAnnotating ? 'annotating' : ''}`}
      style={{
        ...annotations.length > 0 ? { borderLeft: '4px solid #4CAF50' } : {},
      }}>
      <div className="message-header">
        <span className="message-id">
          <span className="message-id-label">ID</span>
          <span className="message-id-value">{message.id}</span>
        </span>
        <span className="turn-id">
          <span className="turn-id-label">Turn</span>
          <span className="turn-id-value">{message.turn_id}</span>
        </span>
        <span className="user-id" onClick={() => onUserClick(message.user_id)}>
          <span className="user-id-label">User</span>
          <span className="user-id-value">{message.user_id}</span>
        </span>
        {message.reply_to_turn && (
          <span className="reply-to">
            <span className="reply-to-label">Reply to</span>
            <span className="reply-to-value">{message.reply_to_turn}</span>
          </span>
        )}
      </div>
      <div className="message-content">
        {displayText}
        {!expanded && shouldShowExpandButton && '...'}
      </div>
      {shouldShowExpandButton && (
        <div className="see-more-container">
          <button className="see-all-button" onClick={toggleExpand}>
            {expanded ? 'See less' : 'See more'}
          </button>
        </div>
      )}
      <div className="annotations-section">
        <div className="annotations-header">
          <h4>Annotations</h4>
          <button 
            className="add-annotation-button"
            onClick={() => setShowAnnotationForm(!showAnnotationForm)}
          >
            {showAnnotationForm ? 'Cancel' : '+ Add Annotation'}
          </button>
        </div>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        {showAnnotationForm && (
          <form onSubmit={handleAnnotationSubmit} className="annotation-form">
            <input
              type="text"
              value={newAnnotation}
              onChange={(e) => setNewAnnotation(e.target.value)}
              placeholder="Enter annotation..."
              className="annotation-input"
            />
            <button type="submit" className="submit-annotation-button">
              Submit
            </button>
          </form>
        )}
        <div className="annotations-list">
          {annotations.map(annotation => (
            <div key={annotation.id} className="annotation-item">
              <div className="annotation-content">
                <div className="annotation-header">
                  <span className="annotation-text">{annotation.thread_id}</span>
                  <span className="annotation-annotator">
                    by <span className="annotator-name">{annotation.annotator_email}</span>
                  </span>
                </div>
                <span className="annotation-meta">
                  {new Date(annotation.created_at).toLocaleString()}
                </span>
              </div>
              <button 
                className="delete-annotation-button"
                onClick={() => handleAnnotationDelete(annotation.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;