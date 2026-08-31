/**
 * VerifyGrievance.jsx
 * Route: /verify/:id  —  Step 2 of 3
 *
 * FIX: No longer depends exclusively on location.state.
 * If state is missing (refresh / direct URL), fetches from GET /api/grievance/:id.
 * Removed fake fallback "Kya yeh sahi hai?" — shows a loading spinner until real data arrives.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import StepIndicator from '../components/StepIndicator';
import NavigationGuard from '../components/NavigationGuard';
import PopupModal from '../components/PopupModal';
import './VerifyGrievance.css';

const pageVariants = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: 0.25 } },
};

const cardVariants = {
  initial: { opacity: 0, scale: 0.94, y: 24 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { delay: 0.15, duration: 0.5, type: 'spring', stiffness: 280, damping: 28 } },
};

export default function VerifyGrievance() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { state } = useLocation();

  // ── Data state ────────────────────────────────────────────────
  const [verifyData, setVerifyData] = useState(state || null);
  const [dataLoading, setDataLoading] = useState(!state);
  const [fetchError, setFetchError]   = useState('');

  // Navigation guard — warns user if they try to leave the flow
  const guardId = verifyData?.grievance_id || id;

  // ── Action state ──────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [answered, setAnswered] = useState(false);

  // Popup state
  const [popup, setPopup] = useState({ open: false, type: 'info', title: '', message: '' });
  const closePopup = () => setPopup(p => ({ ...p, open: false }));
  const showPopup = (type, title, message) => setPopup({ open: true, type, title, message });

  // ── Fallback fetch if navigated directly without state ────────
  useEffect(() => {
    if (state) return; // already have data from navigation

    const fetchData = async () => {
      try {
        const res = await api.get(`/api/grievance/${id}`);
        const { grievance, ai_analysis } = res.data;

        // Reconstruct the same shape SubmitGrievance would have passed
        setVerifyData({
          grievance_id:          grievance._id,
          verification_sentence: ai_analysis?.verification_sentence || '',
          detected_language:     ai_analysis?.detected_language || grievance.original_language || 'en-IN',
          category:              grievance.category || 'other',
          keywords:              ai_analysis?.keywords || [],
          english_summary:       ai_analysis?.english_summary || grievance.title || '',
          original_text:          grievance.original_text || '',
          confidence_score:      ai_analysis?.confidence_score,
        });
      } catch (err) {
        setFetchError('Could not load grievance data. Please go back and try again.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [id, state]);

  const handleConfirm = async (confirmed) => {
    setLoading(true);
    setAnswered(true);
    try {
      const { data } = await api.post('/api/grievance/confirm', {
        grievance_id: id,
        confirmed,
      });

      if (!confirmed || data.retry) {
        navigate('/submit', { state: { prefillText: verifyData?.original_text || '' } });
      } else {
        // Forward verifyData so GrievanceForm has it for the next step
        navigate(`/grievance-form/${id}`, { state: verifyData });
      }
    } catch (err) {
      console.error('Confirm error:', err);
      showPopup('error', 'Something Went Wrong', 'Could not process your response. Please try again.');
      setLoading(false);
      setAnswered(false);
    }
  };

  // ── Loading state ─────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="verify-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div
            style={{ width: 40, height: 40, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
          />
          <p style={{ color: 'var(--on-surface-variant)' }}>Loading your grievance…</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (fetchError || !verifyData) {
    return (
      <div className="verify-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ padding: '32px', textAlign: 'center', maxWidth: 400 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--error)' }}>error</span>
          <p style={{ marginTop: 16, marginBottom: 24 }}>{fetchError || 'Grievance data not available.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/submit')}>
            Back to Submit
          </button>
        </div>
      </div>
    );
  }

  const { verification_sentence, category, detected_language, keywords } = verifyData;

  // ── No verification sentence means Gemini fallback fired ─────
  if (!verification_sentence) {
    return (
      <div className="verify-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="card" style={{ padding: '32px', textAlign: 'center', maxWidth: 400 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--saffron)' }}>warning</span>
          <p style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>AI analysis incomplete</p>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: 24 }}>
            The AI could not fully analyze your grievance right now. You can proceed anyway or retry.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={() => navigate('/submit', { state: { prefillText: verifyData?.original_text || '' } })}>Retry</button>
            <button className="btn btn-primary" onClick={() => navigate(`/grievance-form/${id}`, { state: verifyData })}>
              Proceed Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="verify-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <NavigationGuard grievanceId={guardId} />
      {/* Brand header */}
      <motion.div
        className="verify-brand"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <StepIndicator currentStep={1} />
      </motion.div>

      {/* Main card */}
      <motion.div className="verify-card card" variants={cardVariants} initial="initial" animate="animate">

        {/* AI icon + label */}
        <div className="verify-ai-row">
          <motion.span
            className="material-symbols-outlined filled"
            style={{ fontSize: 32, color: 'var(--saffron)' }}
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            psychology
          </motion.span>
          <div>
            <p className="verify-ai-label">AI Understanding</p>
            <p className="verify-ai-sub">Here is what our AI understood from your complaint</p>
          </div>
        </div>

        {/* Verification sentence */}
        <motion.div
          className="verify-sentence-wrap"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <span className="verify-quote-icon material-symbols-outlined">format_quote</span>
          <p className="verify-sentence">{verification_sentence}</p>
        </motion.div>

        {/* Chips */}
        <motion.div
          className="verify-chips"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          <span className="chip chip-primary">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>category</span>
            {category}
          </span>
          <span className="chip chip-secondary">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>translate</span>
            {detected_language}
          </span>
        </motion.div>

        {/* Keywords */}
        {keywords?.length > 0 && (
          <motion.div
            className="verify-keywords"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <p className="verify-keywords-label">Key terms detected:</p>
            <div className="verify-keywords-row">
              {keywords.map((kw, i) => (
                <motion.span
                  key={kw}
                  className="chip chip-primary"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.06 }}
                >
                  {kw}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Yes / No buttons */}
        <AnimatePresence>
          {!answered && (
            <motion.div
              className="verify-actions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: 0.75 }}
            >
              <p className="verify-question">Is this understanding correct?</p>
              <div className="verify-btns">
                <motion.button
                  className="btn verify-btn-yes"
                  onClick={() => handleConfirm(true)}
                  disabled={loading}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  Haan / Yes
                </motion.button>
                <motion.button
                  className="btn verify-btn-no"
                  onClick={() => handleConfirm(false)}
                  disabled={loading}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="material-symbols-outlined">cancel</span>
                  Nahi / No
                </motion.button>
              </div>
              <p className="verify-hint">
                Tap <strong>No</strong> if the AI misunderstood — you can describe it again.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state after button tap */}
        <AnimatePresence>
          {answered && loading && (
            <motion.div
              className="verify-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="verify-spinner"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              />
              <p>Processing…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
