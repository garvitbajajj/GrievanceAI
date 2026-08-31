import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from 'react-router-dom';
import PopupModal from '../components/PopupModal';
import api from '../utils/api';
import './CitizenAuth.css';

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showP, setShowP] = useState(false);
  const [showC, setShowC] = useState(false);
  const [loading, setLoading] = useState(false);

  const { token } = useParams();
  const navigate = useNavigate();

  // Popup state
  const [popup, setPopup] = useState({ open: false, type: 'info', title: '', message: '' });
  const closePopup = () => setPopup(p => ({ ...p, open: false }));
  const showPopup = (type, title, message) => setPopup({ open: true, type, title, message });

  const onReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showPopup('warning', 'Passwords Don\'t Match', 'Please make sure both password fields are identical.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(`/api/auth/reset-password/${token}`, { password });
      showPopup('success', 'Password Reset', data.message || 'Your password has been reset successfully. Redirecting to login…');
      setTimeout(() => navigate('/auth'), 2500);
    } catch (err) {
      showPopup('error', 'Reset Failed', err.response?.data?.message || 'Could not reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="auth-page" variants={pageVariants} initial="initial" animate="animate">
      <div className="auth-left">
        <div className="auth-left-content">
          <motion.div
            className="auth-logo-area"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <div className="auth-logo-badge">
              <span className="material-symbols-outlined filled">language</span>
            </div>
            <h1 className="auth-logo-text">BhashaFlow</h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <p className="auth-tagline">Secure Account Recovery.</p>
            <p className="auth-subtitle">
              Set a strong new password to protect your citizen profile.
            </p>
          </motion.div>

          <div className="tricolor-bar">
            <div className="bar saffron" />
            <div className="bar white" />
            <div className="bar green" />
          </div>
        </div>
      </div>

      <div className="auth-right">
        <motion.div
          className="auth-form-container"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <form onSubmit={onReset} className="auth-form">
            <div className="form-header">
              <h2>Set New Password</h2>
              <p>Type in your new secure password below.</p>
            </div>

            <div className="field-group">
              <label htmlFor="rp" className="input-label">New Password</label>
              <div className="input-wrapper">
                <span className="material-symbols-outlined input-icon">lock</span>
                <input id="rp" type={showP ? "text" : "password"} className="input-field has-icon"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters" required minLength={8} />
                <button type="button" className="toggle-eye" onClick={() => setShowP(v => !v)}>
                  <span className="material-symbols-outlined">{showP ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="rc" className="input-label">Confirm Password</label>
              <div className="input-wrapper">
                <span className="material-symbols-outlined input-icon">verified_user</span>
                <input id="rc" type={showC ? "text" : "password"} className="input-field has-icon"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password" required />
                <button type="button" className="toggle-eye" onClick={() => setShowC(v => !v)}>
                  <span className="material-symbols-outlined">{showC ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{ marginTop: '20px' }}
            >
              {loading ? 'Saving…' : 'Reset Password'}
              <span className="material-symbols-outlined">check_circle</span>
            </motion.button>
          </form>
        </motion.div>
      </div>

      <PopupModal
        open={popup.open}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
        hideCancel
      />
    </motion.div>
  );
}
