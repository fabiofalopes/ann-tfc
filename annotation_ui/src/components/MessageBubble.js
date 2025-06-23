import React, { useState } from 'react';
import './MessageBubble.css';

const MessageBubble = ({ 
  message, 
  annotations = [], 
  onAnnotationCreate, 
  onAnnotationDelete,
  existingThreads = [],
  currentUserEmail,
  isAnnotating,
  // New props for highlighting functionality
  isUserHighlighted = false,
  isThreadHighlighted = false,
  onUserClick,
  onThreadClick,
  // New props for thread colors
  threadColor = null,
  threadColors = {}
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showThreadInput, setShowThreadInput] = useState(false);
  const [threadInput, setThreadInput] = useState('');
  const [error, setError] = useState(null);
  const maxLength = 300;

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const displayText = message && message.turn_text
    ? (expanded ? message.turn_text : message.turn_text.slice(0, maxLength))
    : 'No message content';

  const shouldShowExpandButton = message?.turn_text && message.turn_text.length > maxLength;

  // Find current user's annotation on this message
  const currentUserAnnotation = annotations.find(ann => ann.annotator_email === currentUserEmail);

  // Extract numeric part from turn_id (e.g., "VAC_R10_001" -> "001")
  const getNumericTurnId = (turnId) => {
    if (turnId === null || typeof turnId === 'undefined') return 'N/A';
    const turnIdStr = String(turnId);
    // Get ALL numbers and take the LAST one (the actual turn number)
    const matches = turnIdStr.match(/\d+/g);
    if (matches && matches.length > 0) {
      // Return the last number found, converted to integer to remove leading zeros
      return parseInt(matches[matches.length - 1], 10).toString();
    }
    return turnIdStr;
  };

  // Handle user ID click to highlight all messages from same user
  const handleUserClick = () => {
    if (onUserClick && message.user_id) {
      onUserClick(message.user_id);
    }
  };

  const handleThreadSubmit = async (threadName) => {
    if (!threadName.trim()) return;
    
    try {
      setError(null);
      
      // If user already has an annotation on this message, delete it first
      if (currentUserAnnotation) {
        await onAnnotationDelete(currentUserAnnotation.id);
      }
      
      // Then create the new annotation
      await onAnnotationCreate(threadName.trim());
      setThreadInput('');
      setShowThreadInput(false);
    } catch (err) {
      console.error('Error creating annotation:', err);
      setError('Failed to add thread. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleThreadSubmit(threadInput);
    } else if (e.key === 'Escape') {
      setShowThreadInput(false);
      setThreadInput('');
      setError(null);
    }
  };

  const handleThreadSelect = (threadName) => {
    handleThreadSubmit(threadName);
  };

  // Get unique threads from existing annotations
  const messageThreads = annotations.map(ann => ann.thread_id);
  
  // Filter existing threads to show only ones not already on this message
  const availableThreads = existingThreads.filter(thread => !messageThreads.includes(thread));

  // Determine bubble classes for highlighting
  const bubbleClasses = [
    'message-bubble',
    expanded ? 'expanded' : '',
    isAnnotating ? 'annotating' : '',
    isUserHighlighted ? 'user-highlighted' : '',
    isThreadHighlighted ? 'thread-highlighted' : '',
    annotations.length > 0 ? 'has-annotations' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={bubbleClasses}
      data-message-id={message.id}
      style={{
        ...threadColor ? { 
          borderLeft: `4px solid ${threadColor}`,
          backgroundColor: `${threadColor}08` // Very subtle background tint
        } : {},
      }}>
      
      <div className="message-header">
        <span className="turn-id">
          <span className="turn-id-label">Turn</span>
          <span className="turn-id-value">{getNumericTurnId(message.turn_id)}</span>
        </span>
        <span 
          className="user-id"
          onClick={handleUserClick}
          title={`Click to highlight all messages from ${message.user_id}`}
        >
          <span className="user-id-label">User</span>
          <span className="user-id-value">{message.user_id}</span>
        </span>
        {message.reply_to_turn && (
          <span className="reply-to">
            <span className="reply-to-label">Reply to</span>
            <span className="reply-to-value">{getNumericTurnId(message.reply_to_turn)}</span>
          </span>
        )}
        {/* Thread indicator for annotated messages */}
        {threadColor && currentUserAnnotation && (
          <span 
            className="thread-indicator"
            style={{ backgroundColor: threadColor }}
            title={`Thread: ${currentUserAnnotation.thread_id}`}
          >
            {currentUserAnnotation.thread_id}
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

      <div className="thread-section">
        <button 
          className="add-thread-button"
          onClick={() => setShowThreadInput(!showThreadInput)}
          disabled={isAnnotating}
        >
          {showThreadInput ? 'Cancel' : currentUserAnnotation ? 'Change Thread' : '+ Add Thread'}
        </button>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {showThreadInput && (
          <div className="thread-input-section">
            <input
              type="text"
              value={threadInput}
              onChange={(e) => setThreadInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={currentUserAnnotation ? 
                `Change from "${currentUserAnnotation.thread_id}" to...` : 
                "Type thread name and press Enter..."
              }
              className="thread-input"
              autoFocus
            />
            <div className="input-hint">
              {currentUserAnnotation ? 
                'Press Enter to change thread, Escape to cancel' :
                'Press Enter to add, Escape to cancel'
              }
            </div>
            
            {availableThreads.length > 0 && (
              <div className="existing-threads">
                <div className="existing-threads-label">Or select existing thread:</div>
                <div className="thread-chips">
                  {availableThreads.map(thread => (
                    <button
                      key={thread}
                      className="thread-chip"
                      style={{ 
                        backgroundColor: threadColors[thread] || '#6B7280',
                        color: 'white'
                      }}
                      onClick={() => handleThreadSelect(thread)}
                    >
                      {thread}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;