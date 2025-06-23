import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ProjectCard.css';

function ProjectCard({ project }) {
    const createdDate = new Date(project.created_at).toLocaleDateString();
    const { currentUser } = useAuth();

    const projectUrl = currentUser?.is_admin 
        ? `/admin/projects/${project.id}`
        : `/projects/${project.id}`;

    return (
        <Link to={projectUrl} className="project-card-link">
            <div className="project-card">
                <div className="header">
                    <h3>{project.name}</h3>
                </div>
                <p className="description">{project.description}</p>
                <div className="stats">
                    <div className="stat-item">
                        <div className="stat-label">CHAT ROOMS</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">ASSIGNED USERS</div>
                    </div>
                </div>
                <div className="footer">
                    Created: {createdDate}
                </div>
            </div>
        </Link>
    );
}

export default ProjectCard; 