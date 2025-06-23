import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { isAuthenticated, currentUser, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // You might want to show a loading spinner here
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to. This allows us to send them along to that page after a
        // successful login.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && !currentUser?.is_admin) {
        // If it's an admin-only route and the user is not an admin,
        // redirect them to their dashboard.
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute; 