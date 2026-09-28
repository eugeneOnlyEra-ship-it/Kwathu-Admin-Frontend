import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoutes from './routes/PrivateRoutes';
import RoleRoute from './routes/RoleRoute';
import AdminHeader from './layout/AdminHeader';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { useAuth } from './hooks/useAuth';

import './App.css';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  // AuthContext starts every page load unresolved until it's confirmed
  // whether the stored tokens still correspond to a real session.
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-paper text-text-muted text-sm">
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<PrivateRoutes />}>
        <Route
          path="/dashboard"
          element={
            <RoleRoute>
              <AdminHeader />
              <DashboardPage />
            </RoleRoute>
          }
        />
      </Route>

      {/* Everything else — including "/" — resolves to whichever of the
          two screens above is actually reachable right now. */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}

export default App;
