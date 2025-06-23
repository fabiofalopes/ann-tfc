import React, { useState, useEffect, useCallback } from 'react';
import { projects } from '../utils/api';

const ProjectLoader = ({ onProjectSelect, currentProject, currentUser }) => {
    const [projectList, setProjectList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [showCreateForm, setShowCreateForm] = useState(false);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const fetchedProjects = await projects.getProjects();
            // For non-admin users, filter to show only assigned projects
            const filteredProjects = currentUser.is_admin 
                ? fetchedProjects 
                : fetchedProjects.filter(project => 
                    project.assigned_users?.some(user => user.id === currentUser.id)
                );
            setProjectList(filteredProjects);
            setError(null);
        } catch (err) {
            setError('Failed to load projects. Please try again.');
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser.id, currentUser.is_admin]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await projects.createProject(newProject);
            setNewProject({ name: '', description: '' });
            setShowCreateForm(false);
            fetchProjects();
        } catch (err) {
            setError('Failed to create project. Please try again.');
            console.error('Error creating project:', err);
        }
    };

    if (loading) {
        return (
            <div className="project-loader loading">
                <div className="loading-spinner"></div>
                <p>Loading projects...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="project-loader error">
                <p>{error}</p>
                <button onClick={fetchProjects}>Retry</button>
            </div>
        );
    }

    return (
        <div className="project-loader">
            <div className="project-header">
                <h2>Projects</h2>
                {currentUser.is_admin && (
                    <button 
                        className="create-project-button"
                        onClick={() => setShowCreateForm(!showCreateForm)}
                    >
                        {showCreateForm ? 'Cancel' : 'Create New Project'}
                    </button>
                )}
            </div>

            {currentUser.is_admin && showCreateForm && (
                <div className="create-project-form">
                    <form onSubmit={handleCreateProject}>
                        <input
                            type="text"
                            placeholder="Project Name"
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            required
                        />
                        <textarea
                            placeholder="Description"
                            value={newProject.description}
                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        />
                        <button type="submit">Create Project</button>
                    </form>
                </div>
            )}

            <div className="project-list">
                {projectList.map((project) => (
                    <div key={project.id} className="project-item">
                        <h3>{project.name}</h3>
                        <p>{project.description}</p>
                        <div className="project-actions">
                            <button 
                                onClick={() => onProjectSelect(project)}
                                className={currentProject?.id === project.id ? 'selected' : ''}
                            >
                                {currentProject?.id === project.id ? 'Selected' : 'Select'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectLoader; 