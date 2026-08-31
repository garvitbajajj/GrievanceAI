import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import PopupModal from '../components/PopupModal';
import api from '../utils/api';
import './Settings.css';

export default function Settings() {
  const [userName, setUserName]       = useState('');
  const [email, setEmail]             = useState('');
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode]       = useState(() => localStorage.getItem('darkMode') === 'true');
  const [language, setLanguage]       = useState('en');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Security States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword]     = useState('');
  const [newPassword, setNewPassword]             = useState('');
  const [confirmPassword, setConfirmPassword]     = useState('');
  const [passLoading, setPassLoading]             = useState(false);

  const [show2FAModal, setShow2FAModal]         = useState(false);
  const [qrCodeUrl, setQrCodeUrl]               = useState('');
  const [twoFactorToken, setTwoFactorToken]     = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled]         = useState(false);

  // Popup modal
  const [popup, setPopup] = useState({ open: false, type: 'info', title: '', message: '' });
  const closePopup  = () => setPopup(p => ({ ...p, open: false }));
  const showPopup   = (type, title, message) => setPopup({ open: true, type, title, message });

  // ── Load profile from backend API on mount ──────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/api/auth/profile');
        const user = res.data.user;
        setUserName(user.name || '');
        setEmail(user.email || '');
        setLanguage(user.preferred_language || 'en');
        setIs2FAEnabled(user.isTwoFactorEnabled || false);
        // Sync localStorage for components that read from it
        localStorage.setItem('userName', user.name || '');
        localStorage.setItem('userEmail', user.email || '');
      } catch {
        // Fallback to localStorage if API fails (e.g. token expired)
        setUserName(localStorage.getItem('userName') || '');
        setEmail(localStorage.getItem('userEmail') || '');
        setLanguage(localStorage.getItem('language') || 'en');
      }
      // Local-only prefs
      const storedNotif = localStorage.getItem('notifications') !== 'false';
      const storedDark  = localStorage.getItem('darkMode') === 'true';
      setNotifications(storedNotif);
      setDarkMode(storedDark);
      if (storedDark) document.body.classList.add('dark-theme');
      else document.body.classList.remove('dark-theme');
      setProfileLoading(false);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const markDirty = () => setHasUnsavedChanges(true);

  const toggleDarkMode = (e) => {
    const isDark = e.target.checked;
    setDarkMode(isDark);
    markDirty();
    if (isDark) document.body.classList.add('dark-theme');
    else        document.body.classList.remove('dark-theme');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Save profile to MongoDB via backend
      const res = await api.put('/api/auth/profile', {
        name: userName,
        email: email,
        preferred_language: language,
      });

      // Also sync localStorage for frontend components
      localStorage.setItem('userName',      userName);
      localStorage.setItem('userEmail',     email);
      localStorage.setItem('notifications', notifications);
      localStorage.setItem('darkMode',      darkMode);
      localStorage.setItem('language',      language);

      setHasUnsavedChanges(false);
      showPopup('success', 'Settings Saved', res.data?.message || 'Your profile and preferences have been updated successfully.');
    } catch (err) {
      showPopup('error', 'Save Failed', err.response?.data?.message || 'Could not save settings. Please try again.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showPopup('error', 'Passwords Do Not Match', 'New password and confirm password must be identical.');
      return;
    }
    if (newPassword.length < 6) {
      showPopup('warning', 'Password Too Short', 'New password must be at least 6 characters long.');
      return;
    }
    setPassLoading(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword });
      showPopup('success', 'Password Updated', 'Your password has been changed successfully. Please use the new password next time you log in.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showPopup('error', 'Password Change Failed', err.response?.data?.message || 'Incorrect current password or server error.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleGenerate2FA = async () => {
    setTwoFactorLoading(true);
    try {
      const res = await api.post('/api/auth/2fa/generate');
      setQrCodeUrl(res.data.qrCodeUrl);
      setShow2FAModal(true);
    } catch {
      showPopup('error', '2FA Setup Failed', 'Could not generate 2FA setup. Please try again later.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setTwoFactorLoading(true);
    try {
      await api.post('/api/auth/2fa/verify', { token: twoFactorToken });
      showPopup('success', '2FA Enabled', 'Two-Factor Authentication is now active on your account.');
      setIs2FAEnabled(true);
      setShow2FAModal(false);
    } catch (err) {
      showPopup('error', 'Invalid Code', err.response?.data?.message || 'The 6-digit code was incorrect. Please try again.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <motion.div
            style={{ width: 40, height: 40, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="settings-page">
        <header className="settings-header">
          <h1 className="settings-title">Account Settings</h1>
          <p className="settings-sub">Manage your profile, preferences, and security settings.</p>
        </header>

        <form onSubmit={handleSave} className="settings-form-wrapper">
          {/* Profile Section */}
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="settings-section-header">
              <span className="material-symbols-outlined filled">person</span>
              <h2>Profile Information</h2>
            </div>

            <div className="settings-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    value={userName}
                    onChange={(e) => { setUserName(e.target.value); markDirty(); }}
                    placeholder="Your full name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); markDirty(); }}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Preferences Section */}
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="settings-section-header">
              <span className="material-symbols-outlined filled">tune</span>
              <h2>Preferences</h2>
            </div>

            <div className="settings-form">
              <div className="form-group" style={{ maxWidth: '300px' }}>
                <label htmlFor="language">Default Language</label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => { setLanguage(e.target.value); markDirty(); }}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="mr">Marathi (मराठी)</option>
                  <option value="gu">Gujarati (ગુજરાતી)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                  <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4>Email Notifications</h4>
                  <p>Receive updates about your grievance status and resolution emails.</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => { setNotifications(e.target.checked); markDirty(); }}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item" style={{ borderTop: '1px solid var(--outline-variant)' }}>
                <div className="setting-info">
                  <h4>Dark Mode</h4>
                  <p>Switch to a dark UI theme for low-light environments. Changes apply instantly.</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={toggleDarkMode}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </motion.section>

          {/* Security Section */}
          <motion.section
            className="settings-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="settings-section-header">
              <span className="material-symbols-outlined filled">security</span>
              <h2>Security</h2>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Password</h4>
                <p>Ensure your account is using a long, random password to stay secure.</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </button>
            </div>

            <div className="setting-item" style={{ borderTop: '1px solid var(--outline-variant)' }}>
              <div className="setting-info">
                <h4>Two-Factor Authentication (2FA)</h4>
                <p>Add an extra layer of security using Google Authenticator or Authy.</p>
              </div>
              {is2FAEnabled ? (
                <button type="button" className="btn btn-outline" disabled style={{ color: 'var(--emerald)', borderColor: 'var(--emerald)' }}>
                  <span className="material-symbols-outlined">check_circle</span> Enabled
                </button>
              ) : (
                <button type="button" className="btn btn-primary" style={{ background: 'var(--emerald)' }} onClick={handleGenerate2FA} disabled={twoFactorLoading}>
                  {twoFactorLoading ? 'Generating...' : 'Enable 2FA'}
                </button>
              )}
            </div>
          </motion.section>

          <div className="settings-actions">
            <button type="button" className="btn btn-tertiary" onClick={() => {
              if (!hasUnsavedChanges) { window.history.back(); return; }
              showPopup('confirm', 'Discard Changes?', 'You have unsaved changes. Are you sure you want to go back?');
              // Handled via confirm popup — for simplicity we close on OK
            }}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* ── Password Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div className="auth-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPasswordModal(false)}>
            <motion.div className="auth-modal-content" initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
              <button className="auth-modal-close" onClick={() => setShowPasswordModal(false)}><span className="material-symbols-outlined">close</span></button>
              <h3>Change Password</h3>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required placeholder="Enter current password" />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength="6" placeholder="Min 6 characters" />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat new password" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={passLoading} style={{ marginTop: '8px' }}>
                  {passLoading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2FA Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {show2FAModal && (
          <motion.div className="auth-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShow2FAModal(false)}>
            <motion.div className="auth-modal-content" initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
              <button className="auth-modal-close" onClick={() => setShow2FAModal(false)}><span className="material-symbols-outlined">close</span></button>
              <h3>Set Up Two-Factor Authentication</h3>
              <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '16px', lineHeight: 1.6 }}>
                Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>, then enter the 6-digit code below.
              </p>
              {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '180px', height: '180px', margin: '0 auto 16px', display: 'block', borderRadius: '12px', border: '3px solid var(--outline-variant)' }} />}
              <form onSubmit={handleVerify2FA} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label>6-Digit Authenticator Code</label>
                  <input
                    type="text"
                    value={twoFactorToken}
                    onChange={e => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength="6"
                    placeholder="000000"
                    style={{ letterSpacing: '6px', textAlign: 'center', fontSize: '20px', fontWeight: '800' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={twoFactorLoading} style={{ background: 'var(--emerald)' }}>
                  {twoFactorLoading ? 'Verifying…' : 'Verify & Enable'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Universal popup */}
      <PopupModal
        open={popup.open}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
        hideCancel={popup.type !== 'confirm'}
        onConfirm={popup.type === 'confirm' ? () => { closePopup(); window.history.back(); } : undefined}
      />
    </DashboardLayout>
  );
}
