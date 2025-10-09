// src/routes/AuthGuard.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

/**
 * Props:
 *  - requireAuth: boolean (default false). If true, unauthenticated users are redirected to `redirectTo`.
 *  - requireType: 'any' | 'present' | 'absent' (default 'any')
 *      - 'present'  -> needs accountType
 *      - 'absent'   -> must NOT have accountType
 *      - 'any'      -> don't check accountType
 *  - redirectTo: string (default '/signup') used when requireAuth is true and user not authenticated.
 *
 * Behavior:
 *  - While auth provider `loading` is true -> return null to avoid flash.
 *  - If requireAuth && !currentUser -> Navigate to redirectTo
 *  - If currentUser exists:
 *      - requireType === 'present' && no type -> Navigate to /choose-account
 *      - requireType === 'absent'  && type exists -> Navigate to /{type}
 *  - Otherwise render children.
 *
 * This single component replaces SecureRoute, RequireAccountType and ChooseAccountGuard.
 */
export default function AuthGuard({
    children,
    requireAuth = false,
    requireType = "any",
    redirectTo = "/signup",
}) {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    // Avoid flashing while auth + profile are still loading
    if (loading) return null;

    // If the page requires login and there's no user, redirect
    if (requireAuth && !currentUser) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // If not logged in and requireAuth is false -> allow anonymous
    if (!currentUser) return children;

    const type = currentUser?.profile?.accountType ?? null;

    // If we require accountType present but user doesn't have it, force choose-account
    if (requireType === "present" && !type) {
        // pass where they came from so after choosing you can route back
        return <Navigate to="/choose-account" state={{ from: location }} replace />;
    }

    // If we require accountType to be absent (i.e. choose-account page),
    // but the user already has a type, then send them to their dashboard
    if (requireType === "absent" && type) {
        return <Navigate to={`/${type}`} replace />;
    }

    // All checks passed
    return children;
}
