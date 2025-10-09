import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const SecureRoute = ({ children }) => {
    const { currentUser } = useAuth();
    
    // If the user is logged in, redirect them to the dashboard.
    if (!currentUser) {
        return <Navigate to={`/signup`} replace />;
    }
    // Otherwise, render the children (login or register components).
    return children;
};

export default SecureRoute;
