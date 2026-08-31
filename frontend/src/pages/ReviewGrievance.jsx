/**
 * ReviewGrievance.jsx
 * Route: /review/:id  —  Step 4 (Review & Confirm)
 *
 * Shows the citizen a full summary of everything they entered before final submission:
 *  - Grievance text / voice transcript
 *  - Attached PDF proof (if any)
 *  - Personal & location details
 *  - Confirm & Submit button triggers the actual /api/grievance/submit call
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import StepIndicator from '../components/StepIndicator';
import NavigationGuard from '../components/NavigationGuard';
import api from '../utils/api';
import './ReviewGrievance.css';

const LOADING_MESSAGES = [
  'Translating your address…',
  'Finding nearby offices…',
  'Looking up portal links…',
  'Almost there…',
];

export default function ReviewGrievance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');

  // If page refreshed without state, redirect back
  useEffect(() => {
    if (!state) navigate(`/grievance-form/${id}`, { replace: true });
  }, [state, id, navigate]);

  if (!state) return null;

  const { form, original_text, english_summary, category, keywords, confidence_score } = state;

  const handleConfirmSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);

    let msgIdx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 2500);

    try {
      const { data } = await api.post('/api/grievance/submit', {
        grievance_id: id,
        ...form,
      });

      clearInterval(msgInterval);

      navigate(`/ai-result/${id}`, {
        state: {
          ...state,
          ...data,
        },
      });
    } catch (err) {
      clearInterval(msgInterval);
      setSubmitError(err.response?.data?.message || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <NavigationGuard grievanceId={id} />
      <motion.div
        className="review-page"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Header */}
        <section className="review-header">
          <StepIndicator currentStep={3} />
          <h1>Review Your Grievance</h1>
          <p>Please verify all the details below before final submission.</p>
        </section>

        <div className="review-content">

          {/* Section 1: Grievance Text */}
          <motion.section
            className="review-section card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="review-section-header">
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>description</span>
              <h2>Your Grievance</h2>
            </div>
            <div className="review-field">
              <span className="review-label">Original Text</span>
              <p className="review-value review-text-block">{original_text || '—'}</p>
            </div>
            {english_summary && english_summary !== original_text && (
              <div className="review-field">
                <span className="review-label">English Summary (AI Generated)</span>
                <p className="review-value review-text-block">{english_summary}</p>
              </div>
            )}
            <div className="review-chips">
              {category && (
                <span className="chip chip-primary" style={{ textTransform: 'capitalize' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>category</span>
                  {category.replace(/_/g, ' ')}
                </span>
              )}
              {confidence_score != null && (
                <span className="chip chip-primary">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>psychology</span>
                  {Math.round(confidence_score * 100)}% Confidence
                </span>
              )}
            </div>
            {keywords?.length > 0 && (
              <div className="review-keywords">
                <span className="review-label">Keywords:</span>
                <div className="review-chips">
                  {keywords.map((kw) => (
                    <span key={kw} className="chip chip-outline">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Section 2: Personal & Location Details */}
          <motion.section
            className="review-section card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="review-section-header">
              <span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>person</span>
              <h2>Personal & Location Details</h2>
            </div>
            <div className="review-details-grid">
              <div className="review-field">
                <span className="review-label">Full Name</span>
                <p className="review-value">{form.user_name || '—'}</p>
              </div>
              <div className="review-field">
                <span className="review-label">Phone Number</span>
                <p className="review-value">{form.user_phone || '—'}</p>
              </div>
              <div className="review-field">
                <span className="review-label">State</span>
                <p className="review-value">{form.state || '—'}</p>
              </div>
              <div className="review-field">
                <span className="review-label">District</span>
                <p className="review-value">{form.district || '—'}</p>
              </div>
              <div className="review-field">
                <span className="review-label">Pincode</span>
                <p className="review-value">{form.pincode || '—'}</p>
              </div>
              <div className="review-field">
                <span className="review-label">Landmark</span>
                <p className="review-value">{form.landmark || '—'}</p>
              </div>
            </div>
            <div className="review-field" style={{ marginTop: '12px' }}>
              <span className="review-label">Full Address</span>
              <p className="review-value review-text-block">{form.address || '—'}</p>
            </div>
          </motion.section>

          {/* Error Message */}
          {submitError && (
            <motion.div
              className="review-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {submitError}
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            className="review-actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(`/grievance-form/${id}`, { state })}
              disabled={submitting}
            >
              <span className="material-symbols-outlined">edit</span>
              Edit Details
            </button>

            <button
              type="button"
              className="btn btn-primary review-submit-btn"
              onClick={handleConfirmSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <motion.span
                    style={{
                      width: 18, height: 18,
                      border: '2px solid white', borderTopColor: 'transparent',
                      borderRadius: '50%', display: 'inline-block'
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                  />
                  {loadingMsg}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Confirm & Submit
                </>
              )}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
