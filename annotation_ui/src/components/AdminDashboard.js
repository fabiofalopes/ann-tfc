import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects as projectsApi, users as usersApi } from '../utils/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('projects'); // 'projects' or 'users'
  const [newUser, setNewUser] = useState({ email: '', password: '', is_admin: false });
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both sets of data in parallel for efficiency
      const [projectsResponse, usersResponse] = await Promise.all([
        projectsApi.getProjects(),
        usersApi.getUsers()
      ]);
      setProjects(projectsResponse);
      setUsers(usersResponse);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.response?.data?.detail || 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProjectClick = (projectId) => {
    navigate(`/admin/projects/${projectId}`);
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await projectsApi.createProject(newProject);
      setNewProject({ name: '', description: '' });
      setIsCreatingProject(false);
      fetchData(); // Refresh data to show the new project
    } catch (error) {
      console.error("Failed to create project:", error);
      setError(error.response?.data?.detail || 'Failed to create project');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await usersApi.createUser(newUser);
      setNewUser({ email: '', password: '', is_admin: false });
      fetchData(); // Refresh all data
    } catch (error) {
      console.error("Failed to create user:", error);
      setError(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await usersApi.deleteUser(userId);
      fetchData(); // Refresh all data
    } catch (error) {
      console.error("Error deleting user:", error);
      setError(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
      </header>

      <div className="tab-navigation">
        <button
          className={`tab-button ${view === 'projects' ? 'active' : ''}`}
          onClick={() => setView('projects')}
        >
          Projects
        </button>
        <button
          className={`tab-button ${view === 'users' ? 'active' : ''}`}
          onClick={() => setView('users')}
        >
          Users
        </button>
      </div>

      {view === 'projects' ? (
        <div>
          <div className="view-header">
            <h2>Projects ({projects.length})</h2>
            <button 
              className="secondary"
              onClick={() => setIsCreatingProject(!isCreatingProject)}
            >
              {isCreatingProject ? 'Cancel' : '＋ Create Project'}
            </button>
          </div>

          {isCreatingProject && (
            <div className="form-container">
              <h3>New Project</h3>
              <form onSubmit={handleCreateProject}>
                <input
                  type="text"
                  placeholder="Project Name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                />
                <textarea
                  placeholder="A brief description of the project"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  required
                />
                <button type="submit">Create Project</button>
              </form>
            </div>
          )}

          {projects.length > 0 ? (
            <div className="projects-table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Created At</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id} onClick={() => handleProjectClick(project.id)} className="project-row">
                      <td>{project.name}</td>
                      <td>{new Date(project.created_at).toLocaleDateString()}</td>
                      <td>{project.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No projects found. Create one to get started!</p>
          )}
        </div>
      ) : (
        <div className="users-view">
          <div className="form-container user-creation-form">
            <h2>Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-field checkbox-field">
                <input
                  id="is_admin"
                  type="checkbox"
                  checked={newUser.is_admin}
                  onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                />
                <label htmlFor="is_admin">Admin User</label>
              </div>
              <button type="submit" className="primary-button">Create User</button>
            </form>
          </div>

          <div className="existing-users-list">
            <h2>Existing Users ({users.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.email}</td>
                    <td>{user.is_admin ? 'Admin' : 'User'}</td>
                    <td>
                      <button onClick={() => handleDeleteUser(user.id)} className="delete-button">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 