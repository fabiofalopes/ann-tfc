import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects, users } from '../utils/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [projectUsers, setProjectUsers] = useState({});
  const [projectChatRooms, setProjectChatRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [newUser, setNewUser] = useState({ email: '', password: '', is_admin: false });
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Fetch projects and users
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, u] = await Promise.all([
        projects.getProjects(),
        users.getUsers()
      ]);
      setProjectsList(Array.isArray(p) ? p : p.projects || []);
      setUsersList(Array.isArray(u) ? u : u.users || []);

      // Fetch users and chat rooms for each project
      const projectUsersData = {};
      const projectChatRoomsData = {};
      
      for (const project of Array.isArray(p) ? p : p.projects || []) {
        try {
          const [users, chatRooms] = await Promise.all([
            projects.getProjectUsers(project.id),
            projects.getChatRooms(project.id)
          ]);
          projectUsersData[project.id] = users;
          projectChatRoomsData[project.id] = chatRooms;
        } catch (err) {
          console.error(`Failed to fetch data for project ${project.id}:`, err);
          projectUsersData[project.id] = [];
          projectChatRoomsData[project.id] = [];
        }
      }
      
      setProjectUsers(projectUsersData);
      setProjectChatRooms(projectChatRoomsData);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleProjectClick = (projectId) => {
    navigate(`/admin/projects/${projectId}`);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setError(null);

    try {
      await users.createUser(newUser);
      setNewUser({ email: '', password: '', is_admin: false });
      await fetchData(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await users.deleteUser(userId);
      await fetchData(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to delete user');
    }
  };

  if (loading) return <div className="loading">Loading dashboard data...</div>;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <div className="tabs">
          <button 
            className={activeTab === 'projects' ? 'active' : ''}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'projects' ? (
        <div className="projects-grid">
          {projectsList.map(project => (
            <div 
              key={project.id} 
              className="project-card"
              onClick={() => handleProjectClick(project.id)}
            >
              <div className="project-header">
                <h3>{project.name}</h3>
                <p className="project-description">{project.description}</p>
              </div>
              
              <div className="project-stats">
                <div className="stat-item">
                  <span className="stat-label">Chat Rooms</span>
                  <span className="stat-value">
                    {projectChatRooms[project.id]?.length || 0}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Assigned Users</span>
                  <span className="stat-value">
                    {projectUsers[project.id]?.length || 0}
                  </span>
                </div>
              </div>
              
              <div className="project-meta">
                <span className="created-date">
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="users-section">
          <div className="create-user-form">
            <h3>Create New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={newUser.is_admin}
                    onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                  />
                  Admin User
                </label>
              </div>
              <button 
                type="submit" 
                className="create-button"
                disabled={isCreatingUser}
              >
                {isCreatingUser ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>

          <div className="users-list">
            <h3>Existing Users</h3>
            {usersList.length === 0 ? (
              <p>No users found</p>
            ) : (
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
                  {usersList.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.email}</td>
                      <td>{user.is_admin ? 'Admin' : 'User'}</td>
                      <td>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 