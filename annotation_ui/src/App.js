import React, { useState, useEffect } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import './App.css';
import AuthMenu from './components/AuthMenu';
import AdminDashboard from './components/AdminDashboard';
import AnnotatorDashboard from './components/AnnotatorDashboard';
import ProjectPage from './components/ProjectPage';
import ChatRoomPage from './components/ChatRoomPage';
import AnnotatorProjectPage from './components/AnnotatorProjectPage';
import ProtectedRoute from './components/ProtectedRoute';
import AnnotatorChatRoomPage from './components/AnnotatorChatRoomPage';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage'; 
import AdminProjectPage from './components/AdminProjectPage';

function App() {
    const [theme, setTheme] = useState('dark');
    const { isAuthenticated, currentUser } = useAuth();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Annotation Tool</h1>
                <AuthMenu theme={theme} toggleTheme={toggleTheme} />
            </header>
            <main className="app-main">
                <Routes>
                    {/* Public and Auth Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={
                        !isAuthenticated ? <Navigate to="/login" /> : 
                        (currentUser?.is_admin ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />)
                    } />

                    {/* Annotator Routes */}
                    <Route 
                        path="/dashboard" 
                        element={
                            <ProtectedRoute>
                                <AnnotatorDashboard />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/projects/:projectId" 
                        element={
                            <ProtectedRoute>
                                <AnnotatorProjectPage />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/projects/:projectId/chat-rooms/:roomId" 
                        element={
                            <ProtectedRoute>
                                <AnnotatorChatRoomPage />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Admin Routes */}
                    <Route 
                        path="/admin" 
                        element={
                            <ProtectedRoute adminOnly>
                                <AdminDashboard />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/admin/projects/:projectId" 
                        element={
                            <ProtectedRoute adminOnly>
                                <AdminProjectPage />
                            </ProtectedRoute>
                        } 
                    />
                     <Route 
                        path="/admin/projects/:projectId/chat-rooms/:roomId" 
                        element={
                            <ProtectedRoute adminOnly>
                                <ChatRoomPage />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Fallback for any other route */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;