import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects } from '../utils/api';
import './ProjectList.css';

const ProjectList = () => {
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      // Check if we have an access token
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Not authenticated. Please login.');
        setLoading(false);
        return;
      }

      const response = await projects.getProjects();
      setProjectsList(response);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch projects');
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const createdProject = await projects.createProject(newProject);
      setNewProject({ name: '', description: '' });
      await fetchProjects(); // Refresh the list
      // Navigate to the new project's page
      navigate(`/admin/projects/${createdProject.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleProjectClick = (projectId) => {
    navigate(`/admin/projects/${projectId}`);
  };

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div className="project-list">
      <h2>Projects</h2>
      
      {/* Create Project Form */}
      <div className="create-project-form">
        <h3>Create New Project</h3>
        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label htmlFor="projectName">Project Name</label>
            <input
              type="text"
              id="projectName"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              required
              placeholder="Enter project name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="projectDescription">Description</label>
            <textarea
              id="projectDescription"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="Enter project description"
            />
          </div>
          <button type="submit" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Projects Table */}
      <div className="projects-table">
        <h3>Existing Projects</h3>
        {projectsList.length === 0 ? (
          <p>No projects found. Create a new project to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {projectsList.map((project) => (
                <tr 
                  key={project.id}
                  onClick={() => handleProjectClick(project.id)}
                  className="project-row"
                >
                  <td>{project.id}</td>
                  <td>{project.name}</td>
                  <td>{project.description}</td>
                  <td>{new Date(project.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProjectList; 