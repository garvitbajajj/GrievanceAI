/**
 * GrievanceAI — Route Guards + session helpers
 *
 * ProtectedRoute: requires a signed-in session (any role)
 * AdminRoute:     requires role === 'authority' | 'admin'
 *
 * Token expiry isn't checked here: supabase-js refreshes the token on load,
 * and the API's 401 handler (utils/api.js) sends truly expired sessions to /auth.
 */
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/auth" replace />;
}

export function AdminRoute({ children }) {
  const role = localStorage.getItem('userRole');

  if (!localStorage.getItem('token')) return <Navigate to="/auth" replace />;
  if (role !== 'authority' && role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}
