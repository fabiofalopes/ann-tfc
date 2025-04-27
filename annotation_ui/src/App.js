import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import ChatRoom from './components/ChatRoom';
import ProjectLoader from './components/ProjectLoader';
import ThreadMenu from './components/ThreadMenu';
import AuthMenu from './components/AuthMenu';
import { auth, projects, annotations } from './utils/api';
import AdminDashboard from './components/AdminDashboard';

function App() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tags, setTags] = useState({});
    const [theme, setTheme] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const [currentProject, setCurrentProject] = useState(null);
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Helper function to extract error message from various error formats
    const getErrorMessage = (error) => {
        if (typeof error === 'string') return error;
        if (error.response?.data?.detail) {
            const detail = error.response.data.detail;
            if (Array.isArray(detail)) {
                return detail.map(err => err.msg || String(err)).join(', ');
            }
            if (typeof detail === 'object' && detail.msg) {
                return detail.msg;
            }
            return String(detail);
        }
        if (error.message) return error.message;
        return 'An unexpected error occurred';
    };

    useEffect(() => {
        // Check for existing auth token
        const token = localStorage.getItem('access_token');
        if (token) {
            // Try to get current user
            auth.getCurrentUser()
                .then(user => {
                    setIsAuthenticated(true);
                    setCurrentUser(user);
                })
                .catch(err => {
                    // If token is invalid, clear it
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    setError(getErrorMessage(err));
                });
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const handleLogin = async (userData) => {
        setIsAuthenticated(true);
        setCurrentUser(userData);
        navigate('/');
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setMessages([]);
        setTags({});
        setCurrentProject(null);
        navigate('/');
    };

    const handleProjectSelect = async (project) => {
        setIsLoading(true);
        setError(null);
        
        try {
            // First get chat rooms for the project
            const chatRooms = await projects.getChatRooms(project.id);
            
            if (!chatRooms || chatRooms.length === 0) {
                setError('No chat rooms found for this project');
                return;
            }
            
            // Get messages from the first chat room (you might want to add room selection later)
            const projectMessages = await projects.getChatMessages(project.id, chatRooms[0].id);
            
            // Load existing annotations
            const projectAnnotations = await annotations.getProjectAnnotations(project.id);
            
            // Process messages and annotations
            const messagesWithTags = projectMessages.map(message => {
                const annotation = projectAnnotations.find(a => a.message_id === message.id);
                return {
                    ...message,
                    thread: annotation ? annotation.thread_id : '',
                    annotator: annotation ? annotation.annotator.email : '',
                };
            });
            
            // Process tags from annotations
            const initialTags = {};
            projectAnnotations.forEach(annotation => {
                if (!initialTags[annotation.thread_id]) {
                    initialTags[annotation.thread_id] = {
                        name: annotation.thread_id,
                        color: getRandomColor(),
                        references: projectAnnotations
                            .filter(a => a.thread_id === annotation.thread_id)
                            .map(a => a.message_id),
                        created: annotation.created_at,
                    };
                }
            });
            
            setMessages(messagesWithTags);
            setTags(initialTags);
            setCurrentProject(project);
            navigate('/chat');
        } catch (err) {
            console.error('Error:', err);
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnnotation = async (messageId, threadId) => {
        if (!isAuthenticated) {
            alert('Please login to add annotations');
            return;
        }
    
        if (threadId.trim() === '') return;
    
        try {
            // Save the annotation
            await annotations.saveBatch(currentProject.id, [{
                message_id: messageId,
                thread_id: threadId.trim(),
            }]);
            
            // Update local state
            const updatedMessages = messages.map((message) =>
                message.id === messageId
                    ? { 
                        ...message, 
                        thread: threadId.trim(),
                        annotator: currentUser.email,
                    }
                    : message
            );
            
            setMessages(updatedMessages);
            
            const updatedTags = { ...tags };
            if (!updatedTags[threadId]) {
                updatedTags[threadId] = {
                    name: threadId,
                    color: getRandomColor(),
                    references: [messageId],
                    created: new Date().toISOString(),
                };
            } else {
                if (!updatedTags[threadId].references.includes(messageId)) {
                    updatedTags[threadId].references.push(messageId);
                }
            }
            
            setTags(updatedTags);
        } catch (err) {
            console.error('Error saving annotation:', err);
            alert(err.response?.data?.detail || err.message || 'Failed to save annotation');
        }
    };

    const handleTagEdit = async (oldTagName, newTagName, newColor, newDescription) => {
        if (newTagName.trim() === '') return;

        try {
            // Update all messages with the old tag to use the new tag
            const messagesToUpdate = messages
                .filter(message => message.thread === oldTagName)
                .map(message => ({
                    message_id: message.id,
                    thread_id: newTagName.trim(),
                }));

            if (messagesToUpdate.length > 0) {
                await annotations.saveBatch(currentProject.id, messagesToUpdate);
            }

            // Update local state
            const updatedTags = { ...tags };
            if (oldTagName !== newTagName) {
                updatedTags[newTagName] = {
                    ...updatedTags[oldTagName],
                    name: newTagName,
                    color: newColor || updatedTags[oldTagName].color,
                    description: newDescription,
                };
                delete updatedTags[oldTagName];
            } else {
                updatedTags[oldTagName].color = newColor;
                updatedTags[oldTagName].description = newDescription;
            }

            setTags(updatedTags);

            const updatedMessages = messages.map((message) =>
                message.thread === oldTagName
                    ? { ...message, thread: newTagName }
                    : message
            );

            setMessages(updatedMessages);
        } catch (err) {
            console.error('Error updating tag:', err);
            alert(err.response?.data?.detail || err.message || 'Failed to update tag');
        }
    };

    const getRandomColor = () => {
        const hue = Math.floor(Math.random() * 360);
        const saturation = Math.floor(Math.random() * 20) + 50;
        const lightness = Math.floor(Math.random() * 30) + 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    return (
        <div className="App">
            <header className="App-header">
                <div className="header-controls">
                    {isAuthenticated && (
                        <>
                            <button onClick={handleLogout}>Logout</button>
                            <button onClick={toggleTheme}>
                                {theme === 'light' ? '🌙' : '☀️'}
                            </button>
                        </>
                    )}
                </div>
            </header>

            {error && <div className="error-message">{error}</div>}

            <Routes>
                <Route
                    path="/login"
                    element={
                        isAuthenticated ? (
                            <Navigate to="/" replace />
                        ) : (
                            <AuthMenu onLogin={handleLogin} />
                        )
                    }
                />
                <Route
                    path="/"
                    element={
                        isAuthenticated ? (
                            currentUser?.is_admin ? (
                                <AdminDashboard />
                            ) : (
                                <ProjectLoader
                                    onProjectSelect={handleProjectSelect}
                                    isLoading={isLoading}
                                    error={error}
                                />
                            )
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/chat"
                    element={
                        isAuthenticated ? (
                            <div className="chat-container">
                                <ChatRoom
                                    messages={messages}
                                    onAnnotation={handleAnnotation}
                                    tags={tags}
                                />
                                <ThreadMenu
                                    tags={tags}
                                    onTagEdit={handleTagEdit}
                                    isLoading={isLoading}
                                    error={error}
                                />
                            </div>
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Routes>
        </div>
    );
}

export default App;