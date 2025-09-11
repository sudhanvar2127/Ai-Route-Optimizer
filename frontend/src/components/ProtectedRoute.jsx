import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { token, loading } = useAuth();

    // Show a loading message or spinner while we check the auth status
    if (loading) {
        return <div>Loading...</div>;
    }

    // If the user is authenticated (has a token), render the requested component
    if (token) {
        return children;
    }

    // If the user is not authenticated, redirect them to the login page
    return <Navigate to="/login" />;
};

export default ProtectedRoute;