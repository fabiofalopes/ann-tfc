import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects as projectsApi, annotations as annotationsApi, auth } from '../utils/api';
import MessageBubble from './MessageBubble';
import SmartThreadCard from './SmartThreadCard';
import './AnnotatorChatRoomPage.css';

const parseApiError = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  return error.message || 'An unexpected error occurred';
};

// Thread background colors - simple palette, text colors handled by CSS
const THREAD_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple  
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#92400E', // Brown
  '#6B7280', // Gray
  '#7C3AED', // Violet
  '#DC2626', // Rose
];

const AnnotatorChatRoomPage = () => {
  const { projectId, roomId } = useParams();
  const navigate = useNavigate();
  const messagesContentRef = useRef(null);
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
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [useConstrainedLayout, setUseConstrainedLayout] = useState(false);
  const [statistics, setStatistics] = useState({
    totalMessages: 0,
    annotatedMessages: 0,
    unannotatedMessages: 0,
    annotationPercentage: 0,
    totalThreads: 0,
    messagesPerThread: {},
    annotatorsPerThread: {}
  });

  // Scroll position tracking
  useEffect(() => {
    const messagesContainer = messagesContentRef.current;
    if (!messagesContainer) return;

    const handleScroll = () => {
      const scrollTop = messagesContainer.scrollTop;
      const scrollThreshold = 300; // Show button after scrolling 300px
      setShowScrollToTop(scrollTop > scrollThreshold);
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    if (messagesContentRef.current) {
      messagesContentRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

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
        <h2>Chat Disentanglement Annotation</h2>
        <div className="header-controls">
          <button 
            className="layout-toggle-btn"
            onClick={() => setUseConstrainedLayout(!useConstrainedLayout)}
            title={useConstrainedLayout ? "Switch to unlimited scroll" : "Switch to constrained layout"}
          >
            {useConstrainedLayout ? "📜" : "📋"}
          </button>
          <div className="stats">
            <span className="stat-item">{statistics.totalMessages} turns</span>
            <span className="stat-item">{statistics.totalThreads} threads</span>
            <span className="stat-item progress-stat">
              {statistics.annotationPercentage}% annotated
            </span>
          </div>
        </div>
      </div>

      <div className="chat-room-content">
        <div className={`messages-container ${useConstrainedLayout ? 'constrained' : ''}`}>
          <div className="messages-header">
            <div className="messages-header-top">
              <h3>Turns</h3>
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
                <div className="manual-content">
                  <div className="manual-section">
                    <h4>📋 Chat Disentanglement Task</h4>
                    <p>
                      Your task is to read chat interactions <strong>turn by turn</strong> and identify which <strong>thread</strong> each turn belongs to.
                      This process helps separate entangled conversations in group chats.
                    </p>
                  </div>

                  <div className="manual-section">
                    <h4>🔤 Key Definitions</h4>
                    <ul>
                      <li><strong>Turn:</strong> A set of sentences sent by the same participant (what you see as message bubbles)</li>
                      <li><strong>Thread:</strong> A group of interconnected turns that share reply relations or the same topic</li>
                      <li><strong>Chat Room:</strong> The entire conversation with all participants</li>
                    </ul>
                  </div>

                  <div className="manual-section">
                    <h4>🎯 How to Annotate</h4>
                    <ol>
                      <li><strong>Click "Add Thread"</strong> on any turn to assign it to a thread</li>
                      <li><strong>Thread naming:</strong> You can use any labels (0, 1, 2, A, B, "topic1", etc.) - what matters is <strong>grouping turns consistently</strong></li>
                      <li><strong>Group related turns</strong> - turns about the same topic should have the same thread identifier</li>
                      <li><strong>Create new threads</strong> when topics change or new discussions emerge</li>
                      <li><strong>Focus on logical grouping</strong> - the system measures agreement based on which turns you group together, not the specific names you use</li>
                    </ol>
                  </div>

                  <div className="manual-section">
                    <h4>📝 Annotation Guidelines</h4>
                    <div className="guideline-grid">
                      <div className="guideline-item">
                        <strong>1. Check Reply Relationships</strong>
                        <p>If a turn replies to another, they usually belong to the same thread (unless topic changes)</p>
                      </div>
                      <div className="guideline-item">
                        <strong>2. Track User Sequences</strong>
                        <p>Click <span className="highlight-example user-highlight">User IDs</span> to see all turns from the same user</p>
                      </div>
                      <div className="guideline-item">
                        <strong>3. Read Turn Content</strong>
                        <p>Check if the message relates to previous threads by topic</p>
                      </div>
                      <div className="guideline-item">
                        <strong>4. Moderator Messages</strong>
                        <p>Group administrative/encouragement messages into a single meta-thread</p>
                      </div>
                      <div className="guideline-item">
                        <strong>5. Short Responses</strong>
                        <p>"Yes", "I agree", "Exactly" → link to the thread they're responding to</p>
                      </div>
                      <div className="guideline-item">
                        <strong>6. Unclear Messages</strong>
                        <p>If you can't understand due to errors or can't connect to previous turns → create new thread</p>
                      </div>
                    </div>
                  </div>

                  <div className="manual-section">
                    <h4>🎨 Visual Helpers</h4>
                    <ul>
                      <li><strong>Thread Colors:</strong> Each thread has a unique color for easy identification</li>
                      <li><strong>User Highlighting:</strong> Click user IDs to highlight all their turns</li>
                      <li><strong>Thread Cards:</strong> Click thread cards on the right to highlight thread turns</li>
                      <li><strong>Progress Tracking:</strong> See your annotation progress below</li>
                    </ul>
                  </div>

                  <div className="manual-section">
                    <h4>🔬 How Agreement is Measured</h4>
                    <div className="agreement-explanation">
                      <p>
                        <strong>Important:</strong> The system uses the <strong>Hungarian algorithm</strong> to calculate inter-annotator agreement. 
                        This means it measures how well annotators group the same turns together, regardless of what labels they use.
                      </p>
                      <div className="example-box">
                        <strong>Example:</strong><br/>
                        • Annotator A: turns 1-5 → "Thread 0", turns 6-10 → "Thread 1"<br/>
                        • Annotator B: turns 1-5 → "Topic A", turns 6-10 → "Topic B"<br/>
                        • Annotator C: turns 1-5 → "5", turns 6-10 → "7"<br/>
                        <span className="result">→ <strong>100% agreement!</strong> All grouped the same turns together</span>
                      </div>
                    </div>
                  </div>

                  <div className="progress-details">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${statistics.annotationPercentage}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">
                      {statistics.annotatedMessages} of {statistics.totalMessages} turns annotated 
                      ({statistics.unannotatedMessages} remaining)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className={`messages-content ${useConstrainedLayout ? 'constrained' : ''}`} ref={messagesContentRef}>
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

        <div className={`threads-sidebar ${useConstrainedLayout ? 'constrained' : ''}`}>
          <h3>Chat Threads</h3>
          {allThreads.length === 0 ? (
            <p className="no-threads">
              No threads created yet. Start by adding threads to messages on the left.
            </p>
          ) : (
            <div className={`threads-overview ${useConstrainedLayout ? 'constrained' : ''}`}>
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
      {showScrollToTop && (
        <button className="scroll-to-top-btn" onClick={scrollToTop} title="Scroll to top">
          ↑
        </button>
      )}
    </div>
  );
};

export default AnnotatorChatRoomPage; 