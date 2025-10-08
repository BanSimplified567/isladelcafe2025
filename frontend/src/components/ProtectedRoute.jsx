import useAuthStore from '@store/authStore';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userData } = useAuthStore();
  if (!isAuthenticated || !userData || !allowedRoles.includes(userData.role)) {
    return <Navigate to={allowedRoles.includes('customer') ? '/' : '/loginadmin'} replace />;
  }
  return children;
};

export default ProtectedRoute;
