/**
 * GrievanceAI — centralised Axios instance for the Supabase `api` Edge Function.
 *
 * baseURL points at <project>/functions/v1, so calls keep their /api/... paths.
 * Timeout is 90s because a grievance with audio/attachments goes through Gemini.
 * 401 clears the expired session and redirects without blocking the UI.
 */
import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
  timeout: 90000,
});

// ── Request interceptor — attach the (auto-refreshed) Supabase access token ──
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

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

/** After Supabase sign-in: load the profile and cache what the UI reads from localStorage. */
export async function saveProfile() {
  const { data } = await api.get('/api/auth/profile');
  const user = data.user;
  localStorage.setItem('userName', user.name || 'Citizen');
  localStorage.setItem('userRole', user.role);
  localStorage.setItem('userEmail', user.email || '');
  if (user.preferred_language) localStorage.setItem('language', user.preferred_language);
  return user;
}

export const homeForRole = (role) => (role === 'authority' || role === 'admin' ? '/admin' : '/dashboard');

export default api;
