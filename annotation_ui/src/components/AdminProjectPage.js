import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects as projectsApi, users as usersApi, annotations as annotationsApi } from '../utils/api';
import './AdminProjectPage.css';

const AdminProjectPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    
    const [project, setProject] = useState(null);
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [userToAssign, setUserToAssign] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // PHASE 2: Annotation Import State
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedChatRoom, setSelectedChatRoom] = useState(null);
    const [selectedUser, setSelectedUser] = useState('');
    const [importFile, setImportFile] = useState(null);
    const [importProgress, setImportProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [projectData, assignedUsersData, allUsersData, chatRoomsData] = await Promise.all([
                projectsApi.getProject(projectId),
                projectsApi.getProjectUsers(projectId),
                usersApi.getUsers(),
                projectsApi.getChatRooms(projectId)
            ]);
            setProject(projectData);
            setAssignedUsers(assignedUsersData);
            setAllUsers(allUsersData);
            setChatRooms(chatRoomsData);
        } catch (err) {
            console.error("Failed to fetch project admin data:", err);
            setError(err.response?.data?.detail || 'Failed to load project data.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRemoveUser = async (userId) => {
        if (window.confirm('Are you sure you want to remove this user from the project?')) {
            try {
                await projectsApi.removeUser(projectId, userId);
                fetchData(); // Refresh data after removal
            } catch (err) {
                console.error("Failed to remove user:", err);
                setError(err.response?.data?.detail || 'Failed to remove user.');
            }
        }
    };

    const handleAssignUser = async (e) => {
        e.preventDefault();
        if (!userToAssign) {
            setError('Please select a user to assign.');
            return;
        }
        try {
            await projectsApi.assignUser(projectId, userToAssign);
            setUserToAssign('');
            setIsAssigning(false);
            fetchData(); // Refresh data
        } catch (err) {
            console.error("Failed to assign user:", err);
            setError(err.response?.data?.detail || 'Failed to assign user.');
        }
    };

    const handleFileSelect = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUploadCsv = async () => {
        if (!selectedFile) {
            setError("Please select a file to upload.");
            return;
        }
        setIsUploading(true);
        setError(null);
        try {
            const response = await projectsApi.importCsv(projectId, selectedFile, (progress) => {
                console.log(`Upload Progress: ${progress}%`);
            });
            alert(`Import successful: ${response.import_details.imported_count} messages imported.`);
            setSelectedFile(null);
            document.getElementById('csv-file-input').value = ''; // Clear file input
            fetchData(); // Refresh chat room list
        } catch (err) {
            console.error("Failed to import CSV:", err);
            setError(err.message || 'Failed to import CSV.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteProject = async () => {
        if (window.confirm(`Are you sure you want to permanently delete the project "${project.name}"? This action cannot be undone.`)) {
            try {
                await projectsApi.deleteProject(projectId);
                alert('Project deleted successfully.');
                navigate('/admin');
            } catch (err) {
                console.error("Failed to delete project:", err);
                setError(err.response?.data?.detail || 'Failed to delete project.');
            }
        }
    };

    // PHASE 2: Handle annotation import
    const handleImportAnnotations = async () => {
        if (!selectedChatRoom || !selectedUser || !importFile) {
            alert('Please select a chat room, user, and file');
            return;
        }

        setIsImporting(true);
        setImportProgress(0);
        setImportResult(null);

        try {
            const result = await annotationsApi.importAnnotations(
                selectedChatRoom.id,
                selectedUser,
                importFile,
                setImportProgress
            );
            
            setImportResult(result);
            setImportFile(null);
            setSelectedUser('');
            
        } catch (err) {
            console.error('Import error:', err);
            setError(err.message || 'Failed to import annotations');
        } finally {
            setIsImporting(false);
        }
    };

    const openImportModal = (chatRoom) => {
        setSelectedChatRoom(chatRoom);
        setShowImportModal(true);
        setImportResult(null);
        setError(null);
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setSelectedChatRoom(null);
        setSelectedUser('');
        setImportFile(null);
        setImportProgress(0);
        setImportResult(null);
    };

    if (loading) {
        return <div className="loading-container">Loading project details...</div>;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    if (!project) {
        return <div>Project not found.</div>;
    }

    const availableUsersToAssign = allUsers.filter(
        (user) => !assignedUsers.some((assignedUser) => assignedUser.id === user.id)
    );

    return (
        <div className="admin-project-page">
            <header className="page-header">
                <button onClick={() => navigate('/admin')} className="back-button">← Back to Dashboard</button>
                <h1>Manage Project<br /><span className="project-name">{project.name}</span></h1>
            </header>
            <p className="project-description">{project.description}</p>
            
            <div className="management-section">
                <div className="section-header">
                    <h2>Assigned Users ({assignedUsers.length})</h2>
                    <button onClick={() => setIsAssigning(!isAssigning)} className="action-button">
                        {isAssigning ? 'Cancel' : '＋ Assign User'}
                    </button>
                </div>

                {isAssigning && (
                    <form onSubmit={handleAssignUser} className="assign-user-form">
                        <select
                            value={userToAssign}
                            onChange={(e) => setUserToAssign(e.target.value)}
                            required
                        >
                            <option value="">-- Select a user to assign --</option>
                            {availableUsersToAssign.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.email} ({user.is_admin ? 'Admin' : 'User'})
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="action-button">Confirm Assignment</button>
                    </form>
                )}

                <div className="user-list">
                    <table>
                        <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Email</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignedUsers.map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <button 
                                            onClick={() => handleRemoveUser(user.id)}
                                            className="action-button delete"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="management-section">
                <div className="section-header">
                    <h2>Chat Rooms ({chatRooms.length})</h2>
                </div>

                <div className="import-csv-section">
                    <h3>Import New Chat Room</h3>
                    <input type="file" id="csv-file-input" accept=".csv" onChange={handleFileSelect} />
                    <button onClick={handleUploadCsv} disabled={!selectedFile || isUploading} className="action-button">
                        {isUploading ? 'Uploading...' : 'Upload CSV'}
                    </button>
                </div>

                {chatRooms.length === 0 ? (
                    <p className="no-data">No chat rooms in this project yet.</p>
                ) : (
                    <div className="chat-rooms-grid">
                        {chatRooms.map(room => (
                            <div key={room.id} className="chat-room-card">
                                <h3>{room.name}</h3>
                                <p>Created: {new Date(room.created_at).toLocaleString()}</p>
                                
                                <div className="chat-room-actions">
                                    <button 
                                        onClick={() => navigate(`/admin/projects/${projectId}/chat-rooms/${room.id}/analysis`)}
                                        className="btn-secondary"
                                    >
                                        📊 View Analysis
                                    </button>
                                    <button 
                                        onClick={() => openImportModal(room)}
                                        className="btn-primary"
                                    >
                                        📥 Import Annotations
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="management-section danger-zone">
                <h2>Danger Zone</h2>
                <div className="danger-zone-content">
                    <p>
                        Deleting a project is a permanent action. It will remove the project, all its chat rooms, messages, and annotations.
                    </p>
                    <button onClick={handleDeleteProject} className="action-button delete">
                        Delete This Project
                    </button>
                </div>
            </div>

            {/* PHASE 2: Import Annotations Modal */}
            {showImportModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Import Annotations</h3>
                            <button onClick={closeImportModal} className="close-button">×</button>
                        </div>
                        
                        <div className="modal-body">
                            <p><strong>Chat Room:</strong> {selectedChatRoom?.name}</p>
                            
                            <div className="form-group">
                                <label htmlFor="user-select">Assign to User:</label>
                                <select 
                                    id="user-select"
                                    value={selectedUser} 
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    disabled={isImporting}
                                >
                                    <option value="">Select a user...</option>
                                    {allUsers.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.email} {user.is_admin ? '(Admin)' : '(Annotator)'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="file-input">CSV File:</label>
                                <input
                                    id="file-input"
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setImportFile(e.target.files[0])}
                                    disabled={isImporting}
                                />
                                <small>CSV must contain 'turn_id' and 'thread_id' (or 'thread_column') columns</small>
                            </div>

                            {isImporting && (
                                <div className="progress-section">
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${importProgress}%` }}
                                        ></div>
                                    </div>
                                    <p>Importing... {importProgress}%</p>
                                </div>
                            )}

                            {importResult && (
                                <div className="import-result">
                                    <h4>Import Complete!</h4>
                                    <p><strong>Annotator:</strong> {importResult.annotator_email}</p>
                                    <p><strong>Total annotations:</strong> {importResult.total_annotations}</p>
                                    <p><strong>Successfully imported:</strong> {importResult.imported_count}</p>
                                    <p><strong>Skipped:</strong> {importResult.skipped_count}</p>
                                    
                                    {importResult.errors.length > 0 && (
                                        <div className="errors">
                                            <h5>Errors:</h5>
                                            <ul>
                                                {importResult.errors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button onClick={closeImportModal} className="btn-secondary">
                                Close
                            </button>
                            <button 
                                onClick={handleImportAnnotations}
                                disabled={!selectedUser || !importFile || isImporting}
                                className="btn-primary"
                            >
                                {isImporting ? 'Importing...' : 'Import Annotations'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProjectPage; 