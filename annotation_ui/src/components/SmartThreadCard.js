import React, { useState } from 'react';
import './SmartThreadCard.css';

const SmartThreadCard = ({
  threadId,
  threadDetails,
  messages,
  isHighlighted,
  onThreadClick,
  onMessageSelect,
  threadColor = '#6B7280' // Default gray color
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  if (!threadDetails) return null;

  const { messages: messageIds, annotators, annotations } = threadDetails;
  const messageCount = messageIds.length;
  const annotatorsList = Array.from(annotators);
  
  // Get actual message objects for this thread
  const threadMessages = messages.filter(msg => 
    messageIds.includes(msg.id)
  ).sort((a, b) => {
    // Sort by turn_id if available, otherwise by id
    const aTurnStr = String(a.turn_id || a.id);
    const bTurnStr = String(b.turn_id || b.id);
    // Get the last number from each turn_id for proper sorting
    const aMatches = aTurnStr.match(/\d+/g);
    const bMatches = bTurnStr.match(/\d+/g);
    const aTurn = aMatches ? parseInt(aMatches[aMatches.length - 1], 10) : a.id;
    const bTurn = bMatches ? parseInt(bMatches[bMatches.length - 1], 10) : b.id;
    return aTurn - bTurn;
  });

  const handleCardClick = () => {
    onThreadClick(threadId);
  };

  const handleMessageClick = (messageId, event) => {
    event.stopPropagation();
    if (onMessageSelect) {
      onMessageSelect(messageId);
    }
  };

  const getNumericTurnId = (turnId) => {
    if (!turnId) return 'N/A';
    // Handle both string and number inputs
    const turnIdStr = String(turnId);
    // Get ALL numbers and take the LAST one (the actual turn number)
    const matches = turnIdStr.match(/\d+/g);
    if (matches && matches.length > 0) {
      // Return the last number found, converted to integer to remove leading zeros
      return parseInt(matches[matches.length - 1], 10).toString();
    }
    return turnIdStr;
  };

  const cardClasses = [
    'smart-thread-card',
    isHighlighted ? 'highlighted' : '',
    isHovered ? 'hovered' : ''
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={cardClasses}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderColor: threadColor,
        '--thread-color': threadColor
      }}
    >
      <div 
        className="thread-card-header"
        style={{ backgroundColor: threadColor }}
      >
        <h4 className="thread-title">{threadId}</h4>
        <div className="thread-stats">
          <span className="message-count">{messageCount} msg</span>
          <span className="annotator-count">{annotatorsList.length} ann</span>
        </div>
      </div>
      
      {isHovered && (
        <div className="thread-preview">
          <div className="preview-messages">
            {threadMessages.slice(0, 3).map((message, index) => (
              <div 
                key={message.id}
                className="preview-message"
                onClick={(e) => handleMessageClick(message.id, e)}
                title="Click to scroll to this message"
              >
                <div className="preview-header">
                  <span className="preview-turn">Turn {getNumericTurnId(message.turn_id)}</span>
                  <span className="preview-user">User {message.user_id}</span>
                </div>
                <div className="preview-content">
                  {message.turn_text ? 
                    (message.turn_text.length > 100 ? 
                      message.turn_text.substring(0, 100) + '...' : 
                      message.turn_text
                    ) : 
                    'No content'
                  }
                </div>
              </div>
            ))}
            {threadMessages.length > 3 && (
              <div className="preview-more">
                +{threadMessages.length - 3} more messages
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartThreadCard; 