import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects, annotations } from '../utils/api';
import MessageBubble from './MessageBubble';
import ThreadMenu from './ThreadMenu';
import './AnnotatorChatRoomPage.css';

const AnnotatorChatRoomPage = ({ currentUser }) => {
  const { projectId, chatRoomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [messageAnnotations, setMessageAnnotations] = useState({});
  const [threadTags, setThreadTags] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [annotationInProgress, setAnnotationInProgress] = useState({});

  useEffect(() => {
    fetchChatRoomData();
  }, [projectId, chatRoomId]);

  const fetchChatRoomData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch messages for the chat room
      const messagesData = await projects.getChatMessages(projectId, chatRoomId);
      setMessages(messagesData);

      // Fetch all annotations for the project
      const annotationsData = await annotations.getMyAnnotations(projectId);
      
      // Process annotations and create thread tags
      const newMessageAnnotations = {};
      const newThreadTags = {};

      // Filter annotations for messages in this chat room
      const relevantAnnotations = annotationsData.filter(annotation => 
        messagesData.some(msg => msg.id === annotation.message_id)
      );

      // Process annotations
      relevantAnnotations.forEach(annotation => {
        const messageId = annotation.message_id;
        
        // Add to message annotations
        if (!newMessageAnnotations[messageId]) {
          newMessageAnnotations[messageId] = [];
        }
        newMessageAnnotations[messageId].push(annotation);

        // Process thread tags
        if (!newThreadTags[annotation.thread_id]) {
          newThreadTags[annotation.thread_id] = {
            id: annotation.thread_id,
            message_count: 1,
            annotator_count: 1,
            tags: [],
            created_at: annotation.created_at
          };
        } else {
          newThreadTags[annotation.thread_id].message_count++;
        }
      });

      setMessageAnnotations(newMessageAnnotations);
      setThreadTags(newThreadTags);

    } catch (err) {
      console.error('Error fetching chat room data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch chat room data');
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotation = async (messageId, threadId) => {
    try {
      setAnnotationInProgress(prev => ({ ...prev, [messageId]: true }));
      
      // Save the annotation
      const newAnnotation = await annotations.createAnnotation(projectId, messageId, {
        message_id: messageId,
        thread_id: threadId
      });

      // Update message annotations
      setMessageAnnotations(prev => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), newAnnotation]
      }));

      // Update thread tags
      setThreadTags(prev => {
        const newTags = { ...prev };
        if (!newTags[threadId]) {
          newTags[threadId] = {
            id: threadId,
            message_count: 1,
            annotator_count: 1,
            tags: [],
            created_at: new Date().toISOString()
          };
        } else {
          newTags[threadId].message_count++;
        }
        return newTags;
      });

    } catch (err) {
      console.error('Error saving annotation:', err);
      
      // Handle FastAPI validation errors (422)
      if (err.response?.status === 422 && Array.isArray(err.response.data.detail)) {
        const validationErrors = err.response.data.detail
          .map(error => error.msg)
          .join(', ');
        setError(validationErrors);
      } else {
        // Handle other types of errors
        const errorMessage = err.response?.data?.detail || 
                          (typeof err.response?.data === 'string' ? err.response.data : null) ||
                          err.message || 
                          'Failed to save annotation';
        setError(errorMessage);
      }
    } finally {
      setAnnotationInProgress(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleThreadEdit = async (threadId, newTags) => {
    try {
      // Update thread tags
      setThreadTags(prev => {
        const newThreadTags = { ...prev };
        if (newThreadTags[threadId]) {
          newThreadTags[threadId].tags = newTags;
        }
        return newThreadTags;
      });
    } catch (err) {
      console.error('Error updating thread:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to update thread');
    }
  };

  if (loading) return <div className="loading">Loading chat room...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="annotator-chat-room">
      <div className="chat-room-header">
        <button onClick={() => navigate(`/annotator/projects/${projectId}`)} className="back-button">
          ← Back to Project
        </button>
        <h2>Chat Room</h2>
      </div>

      <div className="chat-room-content">
        <div className="messages-container">
          {messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              annotations={messageAnnotations[message.id] || []}
              onAnnotationCreate={(tag) => handleAnnotation(message.id, tag)}
              isAnnotating={annotationInProgress[message.id]}
            />
          ))}
        </div>

        <div className="threads-sidebar">
          {Object.entries(threadTags).map(([threadId, thread]) => (
            <ThreadMenu
              key={threadId}
              thread={thread}
              onTagEdit={handleThreadEdit}
              isLoading={loading}
              error={error}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnnotatorChatRoomPage; 