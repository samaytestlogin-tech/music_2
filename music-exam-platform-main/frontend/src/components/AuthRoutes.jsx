import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Loading spinner used during authentication checks
 */
export const FullPageSpinner = () => (
    <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fdfcff 0%, #f3f0ff 100%)'
    }}>
        <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(139, 92, 246, 0.1)',
            borderTop: '3px solid var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }}></div>
    </div>
);

/**
 * Handles logic for public pages (like Login).
 * If authenticated, redirects to the appropriate dashboard.
 */
export const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <FullPageSpinner />;

    if (user) {
        const routes = {
            student: '/student/dashboard',
            evaluator: '/evaluator/dashboard',
            admin: '/admin/dashboard',
            cross_examiner: '/cross-examiner/dashboard'
        };
        // Fallback to student dashboard if role is unknown, to prevent infinite redirect loop on /
        return <Navigate to={routes[user.role] || '/student/dashboard'} replace />;
    }

    return children;
};

/**
 * Handles logic for protected pages.
 * If not authenticated, redirects to Login.
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return <FullPageSpinner />;

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
};
