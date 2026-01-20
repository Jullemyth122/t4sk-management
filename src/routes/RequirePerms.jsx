import React from 'react';
import useHasPerm from '../hooks/useHasPerm';
// import { Navigate } from 'react-router-dom'; // Optional: if we want to redirect

/**
 * Blocks rendering of children if user lacks permissions.
 * 
 * Use this inside a Context that provides `roles` and `currentBusinessId` 
 * OR pass them explicitly if they aren't globally available.
 * 
 * Since this is often used in Routes where we might not have business context loaded yet,
 * it serves as a logic gate.
 */
const RequirePerms = ({ perms, children, roles = [], businessId = null, fallback = null }) => {
    const { can } = useHasPerm(roles, businessId);

    const hasAccess = can(perms);

    if (!hasAccess) {
        if (fallback) return fallback;
        return (
            <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                <h3>Access Denied</h3>
                <p>You do not have permission to view this content.</p>
                <div style={{ fontSize: '0.8em', marginTop: 10, opacity: 0.7 }}>
                     Missing: {Array.isArray(perms) ? perms.join(', ') : perms}
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default RequirePerms;
