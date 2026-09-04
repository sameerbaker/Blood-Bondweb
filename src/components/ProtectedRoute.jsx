import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, bootstrapping, role } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-danger" role="status" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    const userRole = (role || '').toLowerCase();
    const allowed = roles.map((r) => r.toLowerCase());
    if (!allowed.includes(userRole)) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return children;
}
