import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects as projectsApi, annotations as annotationsApi, auth } from '../utils/api';
import MessageBubble from './MessageBubble';
import SmartThreadCard from './SmartThreadCard';
import './AnnotatorChatRoomPage.css';

const parseApiError = (err) => {
  if (err.response?.data?.detail) {
    if (Array.isArray(err.response.data.detail)) {
      return err.response.data.detail.map(d => d.msg).join(', ');
    }
    return err.response.data.detail;
  }
  return err.message || 'An unknown error occurred.';
};

// Thread color palette - beautiful, distinguishable colors
const THREAD_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#8B5A2B', // Brown
  '#6B7280', // Gray
];

const AnnotatorChatRoomPage = () => {
  const { projectId, roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [annotationsMap, setAnnotationsMap] = useState({});
  const [allThreads, setAllThreads] = useState([]);
  const [threadDetails, setThreadDetails] = useState({});
  const [threadColors, setThreadColors] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New state for enhanced functionality
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [highlightedThreadId, setHighlightedThreadId] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [statistics, setStatistics] = useState({
    totalMessages: 0,
    annotatedMessages: 0,
    unannotatedMessages: 0,
    annotationPercentage: 0,
    totalThreads: 0,
    messagesPerThread: {},
    annotatorsPerThread: {}
  });

  // Assign colors to threads
  const assignThreadColors = useCallback((threads) => {
    const colors = {};
    threads.forEach((threadId, index) => {
      colors[threadId] = THREAD_COLORS[index % THREAD_COLORS.length];
    });
    setThreadColors(colors);
  }, []);

  const processAnnotations = (annotationsData) => {
    const newAnnotationsMap = {};
    const threadsSet = new Set();
    const newThreadDetails = {};

    annotationsData.forEach(annotation => {
      // Group annotations by message ID
      if (!newAnnotationsMap[annotation.message_id]) {
        newAnnotationsMap[annotation.message_id] = [];
      }
      newAnnotationsMap[annotation.message_id].push(annotation);

      // Collect all unique threads
      threadsSet.add(annotation.thread_id);

      // Build thread details
      if (!newThreadDetails[annotation.thread_id]) {
        newThreadDetails[annotation.thread_id] = {
          id: annotation.thread_id,
          messages: [],
          annotators: new Set(),
          annotations: []
        };
      }
      newThreadDetails[annotation.thread_id].messages.push(annotation.message_id);
      newThreadDetails[annotation.thread_id].annotators.add(annotation.annotator_email);
      newThreadDetails[annotation.thread_id].annotations.push(annotation);
    });

    const threads = Array.from(threadsSet);
    setAnnotationsMap(newAnnotationsMap);
    setAllThreads(threads);
    setThreadDetails(newThreadDetails);
    assignThreadColors(threads);
  };

  // Calculate enhanced statistics
  const calculateStatistics = useCallback((messagesData, annotationsData) => {
    const totalMessages = messagesData.length;
    const annotatedMessageIds = new Set(annotationsData.map(ann => ann.message_id));
    const annotatedMessages = annotatedMessageIds.size;
    const unannotatedMessages = totalMessages - annotatedMessages;
    const annotationPercentage = totalMessages > 0 ? Math.round((annotatedMessages / totalMessages) * 100) : 0;

    // Thread-specific statistics
    const threadsSet = new Set(annotationsData.map(ann => ann.thread_id));
    const totalThreads = threadsSet.size;
    
    const messagesPerThread = {};
    const annotatorsPerThread = {};
    
    annotationsData.forEach(annotation => {
      const threadId = annotation.thread_id;
      
      if (!messagesPerThread[threadId]) {
        messagesPerThread[threadId] = new Set();
      }
      messagesPerThread[threadId].add(annotation.message_id);
      
      if (!annotatorsPerThread[threadId]) {
        annotatorsPerThread[threadId] = new Set();
      }
      annotatorsPerThread[threadId].add(annotation.annotator_email);
    });

    // Convert sets to counts
    Object.keys(messagesPerThread).forEach(threadId => {
      messagesPerThread[threadId] = messagesPerThread[threadId].size;
      annotatorsPerThread[threadId] = annotatorsPerThread[threadId].size;
    });

    setStatistics({
      totalMessages,
      annotatedMessages,
      unannotatedMessages,
      annotationPercentage,
      totalThreads,
      messagesPerThread,
      annotatorsPerThread
    });
  }, []);

  const fetchChatRoomData = useCallback(async () => {
    // Guard clause to prevent fetching with invalid IDs
    if (isNaN(parseInt(projectId, 10)) || isNaN(parseInt(roomId, 10))) {
      setError("Invalid Project or Chat Room ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [messagesData, annotationsData, userData] = await Promise.all([
        projectsApi.getChatMessages(projectId, roomId, 0, 1000),
        annotationsApi.getChatRoomAnnotations(projectId, roomId),
        auth.getCurrentUser()
      ]);
      
      setMessages(messagesData);
      setCurrentUser(userData);
      processAnnotations(annotationsData);
      calculateStatistics(messagesData, annotationsData);

    } catch (err) {
      console.error('Error fetching chat room data:', err);
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [projectId, roomId, calculateStatistics]);

  useEffect(() => {
    fetchChatRoomData();
  }, [fetchChatRoomData]);

  const handleCreateAnnotation = async (messageId, threadName) => {
    setIsSubmitting(true);
    try {
      await annotationsApi.createAnnotation(projectId, messageId, { 
        message_id: messageId, 
        thread_id: threadName 
      });

      // Refresh annotations to get the updated data
      const annotationsData = await annotationsApi.getChatRoomAnnotations(projectId, roomId);
      processAnnotations(annotationsData);
      calculateStatistics(messages, annotationsData);

    } catch (err) {
      console.error('Error creating annotation:', err);
      throw new Error(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAnnotation = async (messageId, annotationId) => {
    setIsSubmitting(true);
    try {
      await annotationsApi.deleteAnnotation(projectId, messageId, annotationId);

      // Refresh annotations to get the updated data
      const annotationsData = await annotationsApi.getChatRoomAnnotations(projectId, roomId);
      processAnnotations(annotationsData);
      calculateStatistics(messages, annotationsData);

    } catch (err) {
      console.error('Error deleting annotation:', err);
      throw new Error(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle user click highlighting
  const handleUserClick = (userId) => {
    setHighlightedUserId(highlightedUserId === userId ? null : userId);
    setHighlightedThreadId(null); // Clear thread highlighting
  };

  // Handle thread click highlighting
  const handleThreadClick = (threadId) => {
    setHighlightedThreadId(highlightedThreadId === threadId ? null : threadId);
    setHighlightedUserId(null); // Clear user highlighting
  };

  // Handle message selection from hover card
  const handleMessageSelect = (messageId) => {
    // Scroll to the message bubble
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Add a temporary highlight effect
      messageElement.classList.add('message-selected');
      setTimeout(() => {
        messageElement.classList.remove('message-selected');
      }, 2000);
    }
  };

  if (loading) return <div className="loading">Loading chat room...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="annotator-chat-room">
      <div className="chat-room-header">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="back-button">
          ← Back to Project
        </button>
        <h2>Chat Thread Annotation</h2>
        <div className="stats">
          <span className="stat-item">{statistics.totalMessages} messages</span>
          <span className="stat-item">{statistics.totalThreads} threads</span>
          <span className="stat-item progress-stat">
            {statistics.annotationPercentage}% annotated
          </span>
        </div>
      </div>

      <div className="chat-room-content">
        <div className="messages-container">
          <div className="messages-header">
            <div className="messages-header-top">
              <h3>Messages</h3>
              <button 
                className="dismiss-instructions-btn"
                onClick={() => setShowInstructions(!showInstructions)}
                title={showInstructions ? "Hide instructions" : "Show instructions"}
              >
                {showInstructions ? "Hide Help" : "Show Help"}
              </button>
            </div>
            
            {showInstructions && (
              <div className="instruction-panel">
                <p className="instruction-text">
                  <strong>💡 Quick Guide:</strong> Click "Add Thread" to annotate messages. 
                  Click <span className="highlight-example user-highlight">User IDs</span> to highlight all messages from that user.
                  Click thread cards on the right to highlight thread messages. Each thread has a unique color!
                </p>
                <div className="progress-details">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${statistics.annotationPercentage}%` }}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {statistics.annotatedMessages} of {statistics.totalMessages} messages annotated 
                    ({statistics.unannotatedMessages} remaining)
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="messages-content">
            {messages.map(message => {
              const messageAnnotations = annotationsMap[message.id] || [];
              const isUserHighlighted = highlightedUserId === message.user_id;
              const isThreadHighlighted = highlightedThreadId && 
                messageAnnotations.some(ann => ann.thread_id === highlightedThreadId);

              // Get thread color for this message
              const messageThreadId = messageAnnotations.length > 0 ? messageAnnotations[0].thread_id : null;
              const threadColor = messageThreadId ? threadColors[messageThreadId] : null;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  annotations={messageAnnotations}
                  existingThreads={allThreads}
                  currentUserEmail={currentUser?.email}
                  onAnnotationCreate={(threadName) => handleCreateAnnotation(message.id, threadName)}
                  onAnnotationDelete={(annotationId) => handleDeleteAnnotation(message.id, annotationId)}
                  isAnnotating={isSubmitting}
                  isUserHighlighted={isUserHighlighted}
                  isThreadHighlighted={isThreadHighlighted}
                  onUserClick={handleUserClick}
                  onThreadClick={handleThreadClick}
                  data-message-id={message.id}
                  threadColor={threadColor}
                  threadColors={threadColors}
                />
              );
            })}
          </div>
        </div>

        <div className="threads-sidebar">
          <h3>Chat Threads</h3>
          {allThreads.length === 0 ? (
            <p className="no-threads">
              No threads created yet. Start by adding threads to messages on the left.
            </p>
          ) : (
            <div className="threads-overview">
              <p className="threads-count">{allThreads.length} threads found:</p>
              <div className="threads-list">
                {allThreads.map(threadId => {
                  const thread = threadDetails[threadId];
                  const isHighlighted = highlightedThreadId === threadId;
                  const threadColor = threadColors[threadId];
                  
                  return (
                    <SmartThreadCard
                      key={threadId}
                      threadId={threadId}
                      threadDetails={thread}
                      messages={messages}
                      isHighlighted={isHighlighted}
                      onThreadClick={handleThreadClick}
                      onMessageSelect={handleMessageSelect}
                      threadColor={threadColor}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnotatorChatRoomPage; 