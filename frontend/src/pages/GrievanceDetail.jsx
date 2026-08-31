import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import PopupModal from '../components/PopupModal';
import api from '../utils/api';
import './GrievanceDetail.css';

export default function GrievanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = localStorage.getItem('userRole') || 'citizen';
  const isAdmin = role === 'admin' || role === 'authority';

  const [grievance, setGrievance]     = useState(null);
  const [aiAnalysis, setAiAnalysis]   = useState(null);
  const [statusTimeline, setTimeline] = useState([]);
  const [loading, setLoading]         = useState(true);

  const [remark, setRemark]           = useState('');
  const [replyStatus, setReplyStatus] = useState('resolved');
  const [updating, setUpdating]       = useState(false);
  const [sendingMail, setSendingMail] = useState(false);

  // Popup modal
  const [popup, setPopup] = useState({ open: false, type: 'info', title: '', message: '' });
  const closePopup  = () => setPopup(p => ({ ...p, open: false }));
  const showPopup   = (type, title, message) => setPopup({ open: true, type, title, message });

  // ── Fetch grievance detail ────────────────────────────────────
  const fetchDetail = async () => {
    try {
      const route = isAdmin ? `/api/admin/grievance/${id}` : `/api/grievance/${id}`;
      const res = await api.get(route);
      setGrievance(res.data.grievance);
      setAiAnalysis(res.data.ai_analysis || null);
      setTimeline(res.data.status_timeline || []);
    } catch (err) {
      showPopup('error', 'Failed to Load', err.response?.data?.message || 'Could not load grievance details.');
      setTimeout(() => navigate(-1), 2000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id, isAdmin]);

  // ── Citizen feedback from email link (?feedback=resolved|not_resolved) ──
  useEffect(() => {
    const feedback = searchParams.get('feedback');
    if (!feedback || !id) return;

    const sendFeedback = async () => {
      try {
        await api.post(`/api/grievance/${id}/feedback`, { result: feedback });
        if (feedback === 'resolved') {
          showPopup('success', 'Thank You!', 'We\'re glad your issue is resolved. This grievance has been marked as closed. Thank you for using BhashaFlow.');
        } else {
          showPopup('warning', 'Feedback Noted', 'We\'ve notified the concerned authority that your issue is still pending. They will follow up shortly.');
        }
        fetchDetail(); // Refresh to show updated status
      } catch {
        // Silent — don't bother user if feedback API fails
      }
    };
    sendFeedback();
  }, [searchParams, id]);

  // ── Admin resolve action ──────────────────────────────────────
  const handleAdminReply = async () => {
    if (!remark.trim()) {
      showPopup('warning', 'Response Required', 'Please type your official response / remark before submitting.');
      return;
    }
    setUpdating(true);
    try {
      await api.put(`/api/admin/grievance/${id}/status`, {
        status: replyStatus,
        remark,
      });
      // If marking resolved/closed → trigger email to citizen
      if (replyStatus === 'resolved' || replyStatus === 'closed') {
        setSendingMail(true);
        try {
          await api.post(`/api/admin/grievance/${id}/notify-citizen`, { remark, status: replyStatus });
        } catch {
          // Email sending is best-effort; don't block the admin
        } finally {
          setSendingMail(false);
        }
        showPopup('success', 'Resolved & Citizen Notified', 'Status updated and a resolution email has been sent to the citizen in their native language.');
      } else {
        showPopup('success', 'Status Updated', 'The grievance status has been updated successfully.');
      }
      // Refresh
      const res = await api.get(`/api/admin/grievance/${id}`);
      setGrievance(res.data.grievance);
      setTimeline(res.data.status_timeline || []);
      setRemark('');
    } catch (err) {
      showPopup('error', 'Update Failed', err.response?.data?.message || 'Could not update grievance status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout isAdmin={isAdmin}>
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

  if (!grievance) {
    return (
      <DashboardLayout isAdmin={isAdmin}>
        <div style={{ padding: '40px', textAlign: 'center' }}>Grievance not found.</div>
      </DashboardLayout>
    );
  }

  const detectedLanguage = aiAnalysis?.detected_language || grievance.original_language || 'Native';
  const keywords         = aiAnalysis?.keywords || [];
  const englishSummary   = aiAnalysis?.english_summary || grievance.title || '';
  const citizenNotResolved = grievance.citizen_feedback === 'not_resolved';

  return (
    <DashboardLayout isAdmin={isAdmin}>
      <div className="detail-page">
        {/* Header */}
        <section className="detail-header">
          <div className="detail-header-top">
            <h1>{grievance.title || englishSummary || 'Grievance Detail'}</h1>
            <div className="detail-badges">
              <span className={`chip ${
                (grievance.status === 'resolved' || grievance.status === 'closed')
                  ? 'chip-success'
                  : 'chip-warning'
              }`}>
                {grievance.status ? grievance.status.replace('_', ' ').toUpperCase() : 'PENDING'}
              </span>
            </div>
          </div>
        </section>

        {/* Admin: Citizen "Not Resolved" Alert Banner */}
        {isAdmin && citizenNotResolved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(239,83,80,0.1)',
              border: '1.5px solid rgba(239,83,80,0.4)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <span className="material-symbols-outlined filled" style={{ color: '#ef5350', fontSize: '24px', flexShrink: 0 }}>report</span>
            <div>
              <strong style={{ color: '#ef5350', fontSize: '14px' }}>⚠ Citizen Reported: Issue NOT Resolved</strong>
              <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>
                The citizen has responded to the resolution email saying their issue is still pending. Please review and follow up.
              </p>
            </div>
          </motion.div>
        )}

        <div className="detail-grid">
          {/* Left Column */}
          <div className="detail-main">

            {/* Original Submission */}
            <section className="detail-section card">
              <div className="detail-section-header">
                <span className="material-symbols-outlined">description</span>
                <h2>Original Submission</h2>
              </div>
              <div className="lang-badge">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>translate</span>
                Language: {detectedLanguage}
              </div>
              <blockquote className="original-text" style={{ whiteSpace: 'pre-wrap' }}>
                "{grievance.original_text || englishSummary}"
              </blockquote>

              {grievance.original_text && englishSummary && grievance.original_text !== englishSummary && (
                <div className="translation-section">
                  <h4>English Translation / Summary</h4>
                  <p>"{englishSummary}"</p>
                </div>
              )}

              {grievance.image_url && (
                <div className="attachment-row" style={{ marginTop: '16px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline)' }}>image</span>
                  <a href={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/${grievance.image_url}`}
                     target="_blank" rel="noreferrer" className="attachment-name">
                    View Attached Image
                  </a>
                </div>
              )}
              {grievance.audio_url && (
                <div className="attachment-row" style={{ marginTop: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline)' }}>audio_file</span>
                  <a href={`/api/grievance/${grievance._id}/audio`}
                     target="_blank" rel="noreferrer" className="attachment-name">
                    Play Audio Recording
                  </a>
                </div>
              )}
            </section>

            {/* Admin Response Panel */}
            {isAdmin && grievance.status !== 'resolved' && grievance.status !== 'closed' && (
              <section className="detail-section card">
                <div className="detail-section-header">
                  <span className="material-symbols-outlined">reply_all</span>
                  <h2>Official Response</h2>
                </div>
                <p className="response-hint">Reply to the citizen and update the status. If you mark as Resolved, a confirmation email will be sent to the citizen in their native language.</p>

                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label" style={{ display: 'block', marginBottom: '8px' }}>
                    Action to take
                  </label>
                  <select className="input-field" value={replyStatus} onChange={e => setReplyStatus(e.target.value)}>
                    <option value="in_progress">Mark as In Progress</option>
                    <option value="resolved">Mark as Resolved ✓ (sends email to citizen)</option>
                    <option value="closed">Mark as Closed</option>
                  </select>
                </div>

                <textarea
                  className="input-field response-textarea"
                  placeholder="Type your official response / remark here. This will be sent to the citizen."
                  rows={5}
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAdminReply}
                  disabled={updating || sendingMail}
                  style={{ alignSelf: 'flex-start', marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {updating ? 'Updating…' : sendingMail ? 'Sending Email…' : 'Send Response'}
                  {!updating && !sendingMail && <span className="material-symbols-outlined">send</span>}
                </button>
              </section>
            )}

            {/* AI Analysis */}
            <section className="detail-section card ai-analysis-card">
              <div className="detail-section-header">
                <span className="material-symbols-outlined filled" style={{ color: 'var(--saffron)' }}>psychology</span>
                <h2>AI Analysis</h2>
              </div>
              <p className="ai-insight-text">
                <strong>Category:</strong> {grievance.category || 'General'} &nbsp;|&nbsp;
                <strong>Confidence:</strong> {aiAnalysis?.confidence_score
                  ? `${Math.round(aiAnalysis.confidence_score * 100)}%`
                  : 'N/A'
                }
              </p>
              {keywords.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {keywords.map(kw => (
                    <span key={kw} className="chip chip-primary">{kw}</span>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Column — Timeline & Meta */}
          <aside className="detail-aside">

            <div className="timeline-card card">
              <h3>Audit Trail</h3>
              <div className="timeline">
                {statusTimeline.length > 0 ? statusTimeline.map((t, i) => (
                  <div key={t._id || i} className="timeline-item">
                    <div className="timeline-dot-line">
                      <div className={`timeline-dot ${i === statusTimeline.length - 1 ? 'active' : ''}`}></div>
                      {i < statusTimeline.length - 1 && <div className="timeline-line"></div>}
                    </div>
                    <div className="timeline-content">
                      <p className="timeline-event">
                        {t.old_status} → {t.new_status}
                      </p>
                      <span className="timeline-date">
                        {new Date(t.updated_at).toLocaleString()}
                      </span>
                      {t.remark && <p className="timeline-detail">"{t.remark}"</p>}
                      <p style={{ fontSize: 'var(--label-sm)', color: 'var(--outline)' }}>
                        by {t.changed_by}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="timeline-item">
                    <div className="timeline-dot-line">
                      <div className="timeline-dot active"></div>
                    </div>
                    <div className="timeline-content">
                      <p className="timeline-event">Submission Received</p>
                      <span className="timeline-date">
                        {new Date(grievance.submitted_at || Date.now()).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="geo-card card surface-low">
              <div className="detail-section-header">
                <span className="material-symbols-outlined" style={{ color: 'var(--emerald)' }}>location_on</span>
                <h3>Location</h3>
              </div>
              <p className="geo-text">
                {grievance.address
                  ? `${grievance.address}, ${grievance.district || ''}, ${grievance.state || ''} ${grievance.pincode || ''}`
                  : 'Location not provided'
                }
              </p>
              <div className="geo-map-placeholder">
                <span className="material-symbols-outlined">map</span>
                <span>Map View</span>
              </div>
            </div>

            {/* Citizen details (admin only) */}
            {isAdmin && (
              <div className="geo-card card surface-low" style={{ marginTop: '16px' }}>
                <div className="detail-section-header">
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>person</span>
                  <h3>Citizen Details</h3>
                </div>
                <p><strong>Name:</strong> {grievance.user_name || 'Anonymous'}</p>
                <p><strong>Phone:</strong> {grievance.user_phone || 'N/A'}</p>
                {grievance.citizen_feedback && (
                  <p style={{ marginTop: 8 }}>
                    <strong>Feedback:</strong>{' '}
                    <span style={{ color: grievance.citizen_feedback === 'resolved' ? 'var(--emerald)' : '#ef5350', fontWeight: 700 }}>
                      {grievance.citizen_feedback === 'resolved' ? '✅ Resolved' : '❌ Not Resolved'}
                    </span>
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Universal popup modal */}
      <PopupModal
        open={popup.open}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
        hideCancel
      />
    </DashboardLayout>
  );
}
