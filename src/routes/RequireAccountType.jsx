// RequireAccountType.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function RequireAccountType({ children }) {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <Navigate to="/signup" replace />;
    }

    const type = currentUser?.profile?.accountType;
    if (!type) {
        return <Navigate to="/choose-account" replace />;
    }

    return children;
}
