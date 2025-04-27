import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects } from '../utils/api';
import './ChatRoomList.css';

const ChatRoomList = () => {
  const { projectId } = useParams();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        // Check if we have an access token
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Not authenticated. Please login.');
          setLoading(false);
          return;
        }

        const response = await projects.getChatRooms(projectId);
        setChatRooms(response);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching chat rooms:', err);
        setError(err.response?.data?.detail || err.message || 'Failed to fetch chat rooms');
        setLoading(false);
      }
    };

    fetchChatRooms();
  }, [projectId]);

  const handleViewMessages = (chatRoomId) => {
    navigate(`/admin/projects/${projectId}/chat-rooms/${chatRoomId}/messages`);
  };

  if (loading) return <div className="loading">Loading chat rooms...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="chat-room-list">
      <h2>Chat Rooms</h2>
      <div className="back-button">
        <button onClick={() => navigate('/admin/projects')}>Back to Projects</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {chatRooms.map((chatRoom) => (
            <tr key={chatRoom.id}>
              <td>{chatRoom.id}</td>
              <td>{chatRoom.name}</td>
              <td>{new Date(chatRoom.created_at).toLocaleString()}</td>
              <td>
                <button 
                  onClick={() => handleViewMessages(chatRoom.id)}
                  className="view-button"
                >
                  View Messages
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ChatRoomList; 