import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import ChatRoom from './components/ChatRoom';
import ProjectLoader from './components/ProjectLoader';
import ThreadMenu from './components/ThreadMenu';
import AuthMenu from './components/AuthMenu';
import { auth, projects, annotations } from './utils/api';
import AdminDashboard from './components/AdminDashboard';
import ProjectList from './components/ProjectList';
import ChatRoomList from './components/ChatRoomList';
import MessageList from './components/MessageList';
import ProjectPage from './components/ProjectPage';
import ChatRoomPage from './components/ChatRoomPage';

function App() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tags, setTags] = useState({});
    const [theme, setTheme] = useState('dark');
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
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    return (
        <div className="App">
            <header className="App-header">
                <div className="header-controls">
                    {isAuthenticated && (
                        <>
                            <button onClick={handleLogout}>Logout</button>
                            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                                {theme === 'dark' ? (
                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
                                    </svg>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main>
                <Routes>
                    <Route path="/" element={
                        isAuthenticated ? (
                            <Navigate to="/admin" />
                        ) : (
                            <AuthMenu onLogin={handleLogin} />
                        )
                    } />
                    <Route path="/admin" element={
                        isAuthenticated ? (
                            <AdminDashboard />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    <Route path="/admin/projects" element={
                        isAuthenticated ? (
                            <ProjectList />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    <Route path="/admin/projects/:projectId" element={
                        isAuthenticated ? (
                            <ProjectPage />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    <Route path="/admin/projects/:projectId/chat-rooms/:chatRoomId" element={
                        isAuthenticated ? (
                            <ChatRoomPage />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    <Route path="/chat" element={
                        isAuthenticated ? (
                            <ChatRoom
                                messages={messages}
                                onAnnotation={handleAnnotation}
                                tags={tags}
                                onTagEdit={handleTagEdit}
                            />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                    <Route path="/threads" element={
                        isAuthenticated ? (
                            <ThreadMenu
                                tags={tags}
                                onTagEdit={handleTagEdit}
                            />
                        ) : (
                            <Navigate to="/" />
                        )
                    } />
                </Routes>
            </main>
        </div>
    );
}

export default App;