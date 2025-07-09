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
    const [chatRoomAnalytics, setChatRoomAnalytics] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [userToAssign, setUserToAssign] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

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
            
            // Fetch analytics for each chat room
            await fetchChatRoomAnalytics(chatRoomsData);
        } catch (err) {
            console.error("Failed to fetch project admin data:", err);
            setError(err.response?.data?.detail || 'Failed to load project data.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const fetchChatRoomAnalytics = async (rooms) => {
        const analytics = {};
        
        // Fetch IAA analysis for each chat room
        for (const room of rooms) {
            try {
                const iaaData = await annotationsApi.getChatRoomIAA(room.id);
                analytics[room.id] = {
                    status: iaaData.analysis_status,
                    completedAnnotators: iaaData.completed_annotators.length,
                    totalAnnotators: iaaData.total_annotators_assigned,
                    averageAgreement: calculateAverageAgreement(iaaData.pairwise_accuracies),
                    canAnalyze: iaaData.pairwise_accuracies.length > 0
                };
            } catch (err) {
                console.error(`Failed to fetch IAA for room ${room.id}:`, err);
                analytics[room.id] = {
                    status: 'Error',
                    completedAnnotators: 0,
                    totalAnnotators: 0,
                    averageAgreement: null,
                    canAnalyze: false
                };
            }
        }
        
        setChatRoomAnalytics(analytics);
    };

    const calculateAverageAgreement = (pairwiseAccuracies) => {
        if (!pairwiseAccuracies || pairwiseAccuracies.length === 0) {
            return null;
        }
        
        const sum = pairwiseAccuracies.reduce((acc, pair) => acc + pair.accuracy, 0);
        return (sum / pairwiseAccuracies.length).toFixed(1);
    };

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
            alert(`Import successful: ${response.import_details.imported_count} turns imported.`);
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

    const handleExportChatRoom = async (chatRoomId, chatRoomName, analytics) => {
        try {
            setError(null);
            
            // Show confirmation for partial exports
            if (analytics.status === 'Partial') {
                const confirmed = window.confirm(
                    `This chat room is only partially annotated (${analytics.completedAnnotators}/${analytics.totalAnnotators} annotators completed).\n\n` +
                    `The exported data will be marked as PARTIAL and may not be suitable for final analysis.\n\n` +
                    `Do you want to proceed with the export?`
                );
                if (!confirmed) {
                    return;
                }
            } else if (analytics.status === 'NotEnoughData') {
                const confirmed = window.confirm(
                    `This chat room has insufficient annotation data (less than 2 completed annotators).\n\n` +
                    `The exported data will be marked as INSUFFICIENT and is not suitable for analysis.\n\n` +
                    `Do you want to proceed with the export?`
                );
                if (!confirmed) {
                    return;
                }
            }
            
            await annotationsApi.exportChatRoom(chatRoomId);
            
            // Show success message based on completion status
            if (analytics.status === 'Complete') {
                alert('✅ Complete annotation data exported successfully!');
            } else if (analytics.status === 'Partial') {
                alert('⚠️ Partial annotation data exported. Check filename for completion percentage.');
            } else {
                alert('⚠️ Insufficient annotation data exported. This data is not suitable for analysis.');
            }
            
        } catch (err) {
            console.error("Failed to export chat room:", err);
            setError(err.message || 'Failed to export chat room data.');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            'Complete': { class: 'status-complete', text: 'Annotated' },
            'Partial': { class: 'status-partial', text: 'In Progress' },
            'NotEnoughData': { class: 'status-insufficient', text: 'Insufficient Data' },
            'Error': { class: 'status-error', text: 'Error' }
        };
        
        const badge = badges[status] || { class: 'status-unknown', text: 'Unknown' };
        return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
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
                    <div className="chat-rooms-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Chat Room Name</th>
                                    <th>Status</th>
                                    <th># Annotators</th>
                                    <th>Avg. Agreement</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chatRooms.map(room => {
                                    const analytics = chatRoomAnalytics[room.id] || {};
                                    return (
                                        <tr key={room.id}>
                                            <td>
                                                <strong>{room.name}</strong>
                                                <br />
                                                <small>Created: {new Date(room.created_at).toLocaleDateString()}</small>
                                            </td>
                                            <td>
                                                {getStatusBadge(analytics.status)}
                                            </td>
                                            <td>
                                                {analytics.completedAnnotators || 0} / {analytics.totalAnnotators || 0}
                                            </td>
                                            <td>
                                                {analytics.averageAgreement ? `${analytics.averageAgreement}%` : 'N/A'}
                                            </td>
                                            <td className="actions-column">
                                                <div className="action-button-group">
                                                    <button 
                                                        onClick={() => navigate(`/admin/projects/${projectId}/analysis/${room.id}`)}
                                                        className="action-button primary"
                                                        disabled={!analytics.canAnalyze}
                                                        title={!analytics.canAnalyze ? 'Analysis unavailable - need at least 2 completed annotators' : 'View detailed analysis'}
                                                    >
                                                        📊 Analysis
                                                    </button>
                                                    <button 
                                                        onClick={() => handleExportChatRoom(room.id, room.name, analytics)}
                                                        className="action-button secondary"
                                                        title="Export chat room data as JSON"
                                                    >
                                                        📥 Export
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <div className="management-section danger-zone">
                <h2>Danger Zone</h2>
                <div className="danger-zone-content">
                    <p>
                        Deleting a project is a permanent action. It will remove the project, all its chat rooms, turns, and annotations.
                    </p>
                    <button onClick={handleDeleteProject} className="action-button delete">
                        Delete This Project
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminProjectPage; 