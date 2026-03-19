// PublicRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const PublicRoute = ({ children }) => {
    const { currentUser } = useAuth();

    if (currentUser) {
        const type = currentUser?.profile?.accountType;
        
        // If they don't have an account type yet
        if (!type) {
             // If unverified, guide them to verification.
             if (!currentUser.emailVerified) {
                 return <Navigate to="/verify-email" replace />;
             }
             // Otherwise, choose account
             return <Navigate to="/choose-account" replace />;
        }
        
        // If accountType exists, send them to their dashboard
        return <Navigate to={`/${type}`} replace />;
    }
    return children;
};

export default PublicRoute;
