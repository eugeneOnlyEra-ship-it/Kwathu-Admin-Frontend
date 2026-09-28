import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Everything behind PrivateRoutes in this app is admin-only — there's no
 * student or landlord home to send anyone else to, so a non-admin session
 * (shouldn't normally happen: /auth/admin-login already rejects non-admins)
 * just goes back to the login screen.
 */
export default function RoleRoute({ children }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
