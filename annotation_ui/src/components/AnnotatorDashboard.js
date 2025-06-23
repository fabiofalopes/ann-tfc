import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projects } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const AnnotatorDashboard = () => {
    const [projectsList, setProjectsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // The backend automatically returns only projects assigned to the current user.
                const response = await projects.listProjects();
                setProjectsList(response.projects);
            } catch (err) {
                setError(err.response?.data?.detail || err.message || 'Failed to fetch projects');
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, []);

    if (loading) return <div className="loading">Loading your projects...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="annotator-dashboard">
            <div className="dashboard-header">
                <h2>Annotator Dashboard</h2>
                <p>Welcome, {currentUser?.email}! Here are your assigned projects.</p>
            </div>

            <div className="projects-grid">
                {projectsList.length === 0 ? (
                    <div className="empty-state">
                        <p>You haven't been assigned to any projects yet.</p>
                    </div>
                ) : (
                    projectsList.map(project => (
                        <Link 
                            key={project.id} 
                            to={`/projects/${project.id}`} 
                            className="project-card-link"
                        >
                            <div className="project-card">
                                <div className="project-header">
                                    <h3>{project.name}</h3>
                                    <p className="project-description">{project.description || 'No description'}</p>
                                </div>
                                <div className="project-footer">
                                    <span>View Project</span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default AnnotatorDashboard; 