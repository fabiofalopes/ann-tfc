import React, { useState, useEffect } from 'react';
import { projects, users } from '../utils/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  // State
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [projectUsers, setProjectUsers] = useState({});
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newUser, setNewUser] = useState({ email: '', password: '' });
  const [assign, setAssign] = useState({ projectId: '', userId: '' });
  const [importing, setImporting] = useState({});
  const [importProgress, setImportProgress] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' or 'users'
  const [selectedProject, setSelectedProject] = useState(null);

  // Fetch projects and users
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [p, u] = await Promise.all([
        projects.getProjects(),
        users.getUsers()
      ]);
      setProjectsList(Array.isArray(p) ? p : p.projects || []);
      setUsersList(Array.isArray(u) ? u : u.users || []);

      // Fetch users for each project
      const projectUsersData = {};
      for (const project of Array.isArray(p) ? p : p.projects || []) {
        try {
          const users = await projects.getProjectUsers(project.id);
          projectUsersData[project.id] = users;
        } catch (err) {
          console.error(`Failed to fetch users for project ${project.id}:`, err);
          projectUsersData[project.id] = [];
        }
      }
      setProjectUsers(projectUsersData);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Create Project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await projects.createProject(newProject);
      setMessage('Project created!');
      setNewProject({ name: '', description: '' });
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create project');
    }
  };

  // Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      await users.createUser(newUser);
      setMessage('User created!');
      setNewUser({ email: '', password: '' });
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    }
  };

  // Assign User to Project
  const handleAssign = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (!assign.projectId || !assign.userId) {
      setError('Please select both project and user');
      return;
    }
    try {
      await projects.assignUser(assign.projectId, assign.userId);
      setMessage('User successfully assigned to project!');
      setAssign({ projectId: '', userId: '' });
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to assign user to project');
    }
  };

  // Import Data
  const handleImport = async (projectId, file) => {
    setError('');
    setMessage('');
    
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    setImporting((prev) => ({ ...prev, [projectId]: true }));
    setImportProgress((prev) => ({ ...prev, [projectId]: 0 }));
    
    try {
      const response = await projects.importCsv(projectId, file, (progress) => {
        setImportProgress((prev) => ({ ...prev, [projectId]: progress }));
      });
      
      const { chat_room, import_details } = response;
      
      // Show success message with import details
      setMessage(`Import completed for project ${projectsList.find(p => p.id === projectId)?.name}: 
        ${import_details.imported_count} messages imported, 
        ${import_details.skipped_count} skipped`);
      
      // Show warnings if any
      if (import_details.warnings.length > 0) {
        setMessage(prev => prev + `\nWarnings: ${import_details.warnings.join(', ')}`);
      }
      
      // Show errors if any
      if (import_details.errors.length > 0) {
        setError(`Import completed with errors: ${import_details.errors.join(', ')}`);
      }
      
      // Update projects list with new chat room
      setProjectsList(prevProjects => 
        prevProjects.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              chat_rooms: [...(project.chat_rooms || []), chat_room]
            };
          }
          return project;
        })
      );
    } catch (err) {
      setError(err.message || 'Failed to import data');
    } finally {
      setImporting((prev) => ({ ...prev, [projectId]: false }));
      setImportProgress((prev) => ({ ...prev, [projectId]: 0 }));
    }
  };

  const ProjectCard = ({ project }) => (
    <div className="project-card">
      <div className="project-header">
        <h3>{project.name}</h3>
        <p className="project-description">{project.description}</p>
      </div>
      
      <div className="project-actions">
        <div className="import-section">
          <h4>Import Data</h4>
          <div className="import-info">
            <p>CSV file should contain:</p>
            <ul>
              <li><strong>user_id</strong>: ID of the user who sent the message</li>
              <li><strong>turn_id</strong>: Unique identifier for the message</li>
              <li><strong>turn_text</strong>: The message content</li>
              <li><strong>reply_to_turn</strong> (optional): ID of the message this is replying to</li>
            </ul>
          </div>
          <input
            type="file"
            accept=".csv"
            disabled={importing[project.id]}
            onChange={e => {
              const file = e.target.files[0];
              if (file) {
                handleImport(project.id, file);
              }
            }}
          />
          {importing[project.id] && (
            <div className="progress-bar">
              <div 
                className="progress" 
                style={{ width: `${importProgress[project.id]}%` }}
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="chat-rooms-section">
        <h4>Chat Rooms</h4>
        {project.chat_rooms && project.chat_rooms.length > 0 ? (
          <div className="chat-rooms-list">
            {project.chat_rooms.map(room => (
              <div key={room.id} className="chat-room-item">
                <div className="room-info">
                  <span className="room-name">{room.name}</span>
                  <span className="room-stats">
                    Messages: {room.message_count || 0}
                  </span>
                </div>
                <div className="room-actions">
                  <button className="view-room-btn">View Room</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            No chat rooms yet. Import a CSV file to create one.
          </div>
        )}
      </div>
      
      <div className="project-users">
        <h4>Assigned Users</h4>
        {projectUsers[project.id] && projectUsers[project.id].length > 0 ? (
          <ul>
            {projectUsers[project.id].map(user => (
              <li key={user.id}>{user.email}</li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No users assigned to this project.</div>
        )}
      </div>
    </div>
  );

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

      {loading && <div className="loading">Loading...</div>}
      <div className="mt-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            <strong className="font-bold">Success: </strong>
            <span className="block sm:inline whitespace-pre-line">{message}</span>
          </div>
        )}
      </div>

      {activeTab === 'projects' ? (
        <div className="dashboard-content">
          <div className="projects-section">
            <div className="projects-header">
              <h3>Projects</h3>
              <button 
                className="create-project-btn"
                onClick={() => setSelectedProject(null)}
              >
                Create New Project
              </button>
            </div>
            
            {projectsList.length === 0 ? (
              <div className="empty-state">No projects found.</div>
            ) : (
              <div className="projects-grid">
                {projectsList.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="dashboard-content">
          <div className="users-section">
            <h3>Users</h3>
            {/* Users list content */}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 