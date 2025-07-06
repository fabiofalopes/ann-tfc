import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects as projectsApi, users as usersApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import Modal from './Modal';
import ConfirmationModal from './ConfirmationModal';
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
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, user: null });
  const [isDeleting, setIsDeleting] = useState(false);

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
      setShowCreateUserModal(false);
      fetchData(); // Refresh all data
    } catch (error) {
      console.error("Failed to create user:", error);
      setError(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (user) => {
    setDeleteConfirmation({ show: true, user });
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirmation.user) return;
    
    setIsDeleting(true);
    try {
      await usersApi.deleteUser(deleteConfirmation.user.id);
      setDeleteConfirmation({ show: false, user: null });
      fetchData(); // Refresh all data
    } catch (error) {
      console.error("Error deleting user:", error);
      setError(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." size="large" />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error} 
        title="Dashboard Error"
        onRetry={fetchData}
      />
    );
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
          <div className="view-header">
            <h2>Users ({users.length})</h2>
            <button 
              className="primary-button"
              onClick={() => setShowCreateUserModal(true)}
            >
              ＋ Create User
            </button>
          </div>

          <div className="users-table-container">
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
                    <td>
                      <span className={`role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleDeleteUser(user)} 
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Create User Modal */}
          <Modal
            isOpen={showCreateUserModal}
            onClose={() => setShowCreateUserModal(false)}
            title="Create New User"
            size="medium"
          >
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
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="secondary-button"
                  onClick={() => setShowCreateUserModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">Create User</button>
              </div>
            </form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <ConfirmationModal
            isOpen={deleteConfirmation.show}
            onClose={() => setDeleteConfirmation({ show: false, user: null })}
            onConfirm={confirmDeleteUser}
            title="Delete User"
            message={`Are you sure you want to delete the user "${deleteConfirmation.user?.email}"? This action cannot be undone.`}
            confirmText="Delete"
            type="danger"
            isLoading={isDeleting}
          />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 