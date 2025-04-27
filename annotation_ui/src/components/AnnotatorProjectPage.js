import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects } from '../utils/api';
import './AnnotatorProjectPage.css';

const AnnotatorProjectPage = ({ currentUser }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details
      const projectData = await projects.getProject(projectId);
      setProject(projectData);

      // Fetch chat rooms
      const chatRoomsData = await projects.getChatRooms(projectId);
      setChatRooms(chatRoomsData);

    } catch (err) {
      console.error('Error fetching project data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch project data');
    } finally {
      setLoading(false);
    }
  };

  const handleChatRoomClick = (chatRoomId) => {
    navigate(`/annotator/projects/${projectId}/chat-rooms/${chatRoomId}`);
  };

  if (loading) return <div className="loading">Loading project data...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="annotator-project-page">
      <div className="project-header">
        <button onClick={() => navigate('/annotator')} className="back-button">
          ← Back to Projects
        </button>
        <h2>{project?.name}</h2>
        <p className="project-description">{project?.description}</p>
      </div>

      <div className="chat-rooms-section">
        <h3>Chat Rooms</h3>
        <div className="chat-rooms-grid">
          {chatRooms.length === 0 ? (
            <div className="empty-state">
              <p>No chat rooms found in this project.</p>
            </div>
          ) : (
            chatRooms.map(room => (
              <div 
                key={room.id} 
                className="chat-room-card"
                onClick={() => navigate(`/annotator/projects/${projectId}/chat-rooms/${room.id}`)}
              >
                <h4>{room.name}</h4>
                <p className="room-description">{room.description}</p>
                <div className="room-meta">
                  <span>Created: {new Date(room.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnotatorProjectPage; 