import React, { useState } from 'react';
import TagInput from './TagInput';
import './MessageBubble.css';

const MessageBubble = ({ message, tag, onTagUpdate, isUserSelected, onUserClick, isAnnotating }) => {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 300; // Tamanho maximo do texto mostrado, sem ter que clicar "see more"

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const displayText = message && message.turn_text
    ? (expanded ? message.turn_text : message.turn_text.slice(0, maxLength))
    : 'No message content';

  const shouldShowExpandButton = message?.turn_text && message.turn_text.length > maxLength;

  const handleTagUpdate = async (tagName) => {
    try {
      await onTagUpdate(tagName);
    } catch (err) {
      console.error('Error updating tag:', err);
    }
  };

  return (
    <div 
      className={`message-bubble ${expanded ? 'expanded' : ''} ${isUserSelected ? 'user-selected' : ''} ${isAnnotating ? 'annotating' : ''}`} 
      style={{
        ...tag ? { borderLeft: `4px solid ${tag.color}` } : {},
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
        {message.annotator && (
          <span className="annotator-container">
            <span className="annotator-label">Annotated by</span>
            <span className="annotator-value">{message.annotator}</span>
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
      <div className="tag-container">
        <TagInput
          tag={tag}
          onTagUpdate={handleTagUpdate}
          disabled={isAnnotating}
        />
        {isAnnotating && (
          <div className="annotation-loading">
            <div className="loading-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;