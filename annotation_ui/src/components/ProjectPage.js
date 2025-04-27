import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects, users, annotations } from '../utils/api';
import './ProjectPage.css';

const ProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [projectUsers, setProjectUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [annotations, setAnnotations] = useState({});
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projectData, usersData, chatRoomsData] = await Promise.all([
        projects.getProject(projectId),
        projects.getProjectUsers(projectId),
        projects.getChatRooms(projectId)
      ]);
      setProject(projectData);
      setProjectUsers(usersData);
      
      // Fetch message counts for each chat room
      const chatRoomsWithCounts = await Promise.all(
        chatRoomsData.map(async (room) => {
          try {
            const messages = await projects.getChatMessages(projectId, room.id);
            return {
              ...room,
              message_count: messages.length
            };
          } catch (err) {
            console.error(`Error fetching messages for chat room ${room.id}:`, err);
            return {
              ...room,
              message_count: 0
            };
          }
        })
      );
      
      setChatRooms(chatRoomsWithCounts);
      
      // Fetch all users for assignment
      const allUsersData = await users.getUsers();
      setAllUsers(allUsersData);
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch project data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import');
      return;
    }

    try {
      setError(null);
      await projects.importCsv(projectId, selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      setSelectedFile(null);
      setUploadProgress(0);
      // Refresh project data after import
      await fetchProjectData();
    } catch (err) {
      console.error('Error importing file:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to import file');
    }
  };

  const handleUserSelect = async (userId) => {
    try {
      const isAssigned = projectUsers.some(user => user.id === userId);
      if (isAssigned) {
        await projects.removeUser(projectId, userId);
      } else {
        await projects.assignUser(projectId, userId);
      }
      await fetchProjectData(); // Refresh the list
    } catch (err) {
      console.error('Error updating user assignment:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to update user assignment');
    }
  };

  const handleChatRoomSelect = (chatRoom) => {
    navigate(`/admin/projects/${projectId}/chat-rooms/${chatRoom.id}`);
  };

  const handleBackToRooms = () => {
    setSelectedChatRoom(null);
    setMessages([]);
    setAnnotations({});
  };

  if (loading) return <div className="loading">Loading project data...</div>;
  if (!project) return <div className="error">Project not found</div>;

  return (
    <div className="project-page">
      <button 
        className="theme-toggle"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <svg viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
          </svg>
        )}
      </button>
      <div className="project-header">
        <button onClick={() => navigate('/admin')} className="back-button">
          ← Back to Dashboard
        </button>
        <h2>{project.name}</h2>
        <p className="project-description">{project.description}</p>
        <p className="project-meta">
          Created: {new Date(project.created_at).toLocaleDateString()}
        </p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="project-sections">
        {/* Import Section */}
        <section className="project-section">
          <h3>Import Data</h3>
          <div className="import-form">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="file-input"
            />
            <button
              onClick={handleImport}
              disabled={!selectedFile}
              className="import-button"
            >
              Import
            </button>
          </div>
          {uploadProgress > 0 && (
            <div className="progress-bar">
              <div 
                className="progress" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </section>

        {/* Users Section */}
        <section className="project-section">
          <h3>Project Users</h3>
          <div className="users-selection">
            <h4>Available Users</h4>
            <div className="users-grid">
              {allUsers.map(user => (
                <div 
                  key={user.id} 
                  className={`user-card ${projectUsers.some(pu => pu.id === user.id) ? 'selected' : ''}`}
                  onClick={() => handleUserSelect(user.id)}
                >
                  <span className="user-email">{user.email}</span>
                  <span className="user-status">
                    {projectUsers.some(pu => pu.id === user.id) ? 'Assigned' : 'Available'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chat Rooms Section */}
        <section className="project-section">
          <h3>Chat Rooms</h3>
          {selectedChatRoom ? (
            <div className="chat-room-view">
              <div className="chat-room-header">
                <button onClick={handleBackToRooms} className="back-button">
                  ← Back to Rooms
                </button>
                <h4>{selectedChatRoom.name}</h4>
              </div>
              <div className="messages-container">
                {messages.map(message => (
                  <div key={message.id} className="message-card">
                    <div className="message-header">
                      <span className="message-sender">User {message.user_id}</span>
                      <span className="message-time">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="message-content">
                      {message.content}
                    </div>
                    {annotations[message.id] && (
                      <div className="message-annotations">
                        {annotations[message.id].map(annotation => (
                          <div key={annotation.id} className="annotation-tag">
                            {annotation.tag}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-rooms-grid">
              {chatRooms.length === 0 ? (
                <p>No chat rooms found</p>
              ) : (
                chatRooms.map(room => (
                  <div 
                    key={room.id} 
                    className="chat-room-card"
                    onClick={() => handleChatRoomSelect(room)}
                  >
                    <h4>{room.name}</h4>
                    <p className="room-description">{room.description}</p>
                    <div className="room-meta">
                      <span>Created: {new Date(room.created_at).toLocaleDateString()}</span>
                      <span className="room-message-count">
                        {room.message_count || 0} messages
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProjectPage; 