/**
 * OAuthSuccess.jsx
 * Route: /auth/oauth-success
 *
 * Google redirects the browser here after OAuth with the JWT in the URL hash:
 *   http://localhost:3000/auth/oauth-success#token=xxx&name=Rajesh&role=citizen
 *
 * This page reads the hash, stores the token, and navigates to /dashboard.
 * It is never shown to the user — it flashes for one frame at most.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // window.location.hash → "#token=xxx&name=Rajesh&role=citizen"
    const hash = window.location.hash.slice(1); // strip the leading '#'
    const params = new URLSearchParams(hash);

    const token = params.get('token');
    const name  = params.get('name');
    const role  = params.get('role');

    if (!token) {
      // Something went wrong — send back to auth with an error flag
      navigate('/auth?error=oauth_failed', { replace: true });
      return;
    }

    // Store exactly the same keys the rest of the app uses
    localStorage.setItem('token', token);
    localStorage.setItem('userName', decodeURIComponent(name || 'Citizen'));
    localStorage.setItem('userRole', role || 'citizen');

    // Clear the hash from the URL so the token is never visible in history
    window.history.replaceState(null, '', window.location.pathname);

    // Redirect to the right dashboard based on role
    if (role === 'authority' || role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
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