/**
 * GrievanceAI — Supabase client (auth only; data goes through the `api` Edge Function).
 */
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// The rest of the app reads the session from these localStorage keys, so keep
// them in sync as Supabase signs in, refreshes and signs out.
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    localStorage.setItem('token', session.access_token);
  } else if (event === 'SIGNED_OUT') {
    ['token', 'userName', 'userRole', 'userEmail'].forEach((k) => localStorage.removeItem(k));
  }
});
