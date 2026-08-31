/**
 * BhashaFlow — Route Guards
 *
 * ProtectedRoute: requires any valid JWT (any role)
 * AdminRoute:     requires role === 'authority' | 'admin'
 */
import { Navigate } from 'react-router-dom';

function isTokenValid(token) {
  try {
    const payload = token.split('.')[1];
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    const { exp } = JSON.parse(atob(paddedPayload));
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token && isTokenValid(token) ? children : <Navigate to="/auth" replace />;
}

export function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const role  = localStorage.getItem('userRole');

  if (!token || !isTokenValid(token)) return <Navigate to="/auth" replace />;
  if (role !== 'authority' && role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}
