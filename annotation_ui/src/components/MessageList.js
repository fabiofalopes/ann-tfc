import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projects } from '../utils/api';
import './MessageList.css';

const MessageList = () => {
  const { projectId, chatRoomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // Check if we have an access token
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Not authenticated. Please login.');
          setLoading(false);
          return;
        }

        const response = await projects.getMessages(projectId, chatRoomId);
        setMessages(response);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err.response?.data?.detail || err.message || 'Failed to fetch messages');
        setLoading(false);
      }
    };

    fetchMessages();
  }, [projectId, chatRoomId]);

  if (loading) return <div className="loading">Loading messages...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="message-list">
      <h2>Messages</h2>
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className="message-card">
            <div className="message-header">
              <span className="message-id">ID: {message.id}</span>
              <span className="message-timestamp">
                {new Date(message.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="message-content">
              {message.content}
            </div>
            {message.annotations && message.annotations.length > 0 && (
              <div className="message-annotations">
                <h4>Annotations:</h4>
                <ul>
                  {message.annotations.map((annotation) => (
                    <li key={annotation.id}>
                      {annotation.label} - {annotation.comment}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageList; 