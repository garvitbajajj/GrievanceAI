/**
 * OAuthSuccess.jsx
 * Route: /auth/oauth-success
 *
 * Supabase redirects here after Google sign-in. supabase-js picks the session
 * out of the URL on load; we then load the profile and route by role.
 * It is never shown to the user — it flashes for one frame at most.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabase';
import { saveProfile, homeForRole } from '../utils/api';

export default function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth?error=oauth_failed', { replace: true });
        return;
      }
      localStorage.setItem('token', session.access_token);
      try {
        const user = await saveProfile();
        navigate(homeForRole(user.role), { replace: true });
      } catch {
        navigate('/auth?error=oauth_failed', { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--background)',
      }}
    >
      {/* Simple spinner — barely visible since navigation is near-instant */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid var(--outline-variant)',
          borderTopColor: 'var(--primary-container)',
        }}
      />
      <p style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-body)', fontSize: 'var(--body-md)' }}>
        Signing you in…
      </p>
    </motion.div>
  );
}