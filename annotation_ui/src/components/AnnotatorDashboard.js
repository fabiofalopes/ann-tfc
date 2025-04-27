import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects } from '../utils/api';
import './AnnotatorDashboard.css';

const AnnotatorDashboard = ({ currentUser }) => {
  const navigate = useNavigate();
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projects.listProjects();
      console.log('Projects response:', response); // Debug log
      
      // Fetch chat rooms for each project
      const projectsWithChatRooms = await Promise.all(
        response.projects.map(async (project) => {
          try {
            const chatRooms = await projects.getChatRooms(project.id);
            console.log(`Chat rooms for project ${project.id}:`, chatRooms); // Debug log
            return {
              ...project,
              chat_rooms: chatRooms
            };
          } catch (err) {
            console.error(`Error fetching chat rooms for project ${project.id}:`, err);
            return {
              ...project,
              chat_rooms: []
            };
          }
        })
      );
      
      setProjectsList(projectsWithChatRooms);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch projects');
      setLoading(false);
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/annotator/projects/${projectId}`);
  };

  if (loading) return <div className="loading">Loading your projects...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="annotator-dashboard">
      <div className="dashboard-header">
        <h2>Annotator Dashboard</h2>
        <p>Welcome! Here are your assigned projects.</p>
      </div>

      <div className="projects-grid">
        {projectsList.length === 0 ? (
          <div className="empty-state">
            <p>You haven't been assigned to any projects yet.</p>
          </div>
        ) : (
          projectsList.map(project => (
            <div 
              key={project.id} 
              className="project-card"
              onClick={() => navigate(`/annotator/projects/${project.id}`)}
            >
              <div className="project-header">
                <h3>{project.name}</h3>
                <p className="project-description">{project.description}</p>
              </div>
              
              <div className="project-stats">
                <div className="stat-item">
                  <span className="stat-label">Chat Rooms</span>
                  <span className="stat-value">
                    {project.chat_rooms?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnotatorDashboard; 