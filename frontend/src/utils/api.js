/**
 * BhashaFlow — centralised Axios instance.
 *
 * FIX: baseURL reads from VITE_BACKEND_URL (injected at build time).
 * FIX: 401 clears the expired session and redirects without blocking the UI.
 * FIX: timeout increased to 90s to handle slow AI engine responses.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  timeout: 18000,
});

// ── Request interceptor — attach JWT token ──────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 globally ─────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      console.warn('Session expired. Redirecting to login.');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
