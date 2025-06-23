import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projects } from '../utils/api';
import './AnnotatorProjectPage.css';

const AnnotatorProjectPage = () => {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch project details and chat rooms in parallel
                const [projectData, chatRoomsData] = await Promise.all([
                    projects.getProject(projectId),
                    projects.getChatRooms(projectId)
                ]);
                setProject(projectData);
                setChatRooms(chatRoomsData);
            } catch (err) {
                setError(err.response?.data?.detail || err.message || 'Failed to fetch project data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    if (loading) return <div className="loading">Loading project...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="annotator-project-page">
            <header className="project-page-header">
                <h2>{project.name}</h2>
                <p>{project.description}</p>
            </header>
            
            <h3>Available Chat Rooms for Annotation</h3>
            <div className="chat-room-list">
                {chatRooms.length === 0 ? (
                    <p>No chat rooms available in this project.</p>
                ) : (
                    chatRooms.map(room => (
                        <Link 
                            key={room.id}
                            to={`/projects/${projectId}/chat-rooms/${room.id}`}
                            className="chat-room-card-link"
                        >
                            <div className="chat-room-card">
                                <h4>{room.name}</h4>
                                <p>{room.description || 'No description'}</p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default AnnotatorProjectPage; 