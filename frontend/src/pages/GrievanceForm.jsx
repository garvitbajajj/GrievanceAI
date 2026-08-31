/**
 * GrievanceForm.jsx
 * Route: /grievance-form/:id  —  Step 3 of 3
 *
 * FIX: No longer depends exclusively on location.state.
 * If prevState is missing (refresh / direct URL), fetches from GET /api/grievance/:id.
 * Added error handling UI for API failures.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import StepIndicator from '../components/StepIndicator';
import NavigationGuard from '../components/NavigationGuard';
import api from '../utils/api';
import './GrievanceForm.css';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

const fieldVariants = {
  initial: { opacity: 0, y: 12 },
  animate: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.07 } }),
};

const LOADING_MESSAGES = [
  'Translating your address…',
  'Finding nearby offices…',
  'Looking up portal links…',
  'Almost there…',
];

export default function GrievanceForm() {
  const { id }               = useParams();
  const navigate             = useNavigate();
  const { state: prevState } = useLocation();

  // ── Prior step data (carries english_summary, category etc. forward) ──
  const [stepData, setStepData]   = useState(prevState || null);
  const [dataLoading, setDataLoading] = useState(!prevState);
  const [fetchError, setFetchError]   = useState('');

  // ── Form state — initialize from prevState.form if coming back from Review ──
  const [form, setForm] = useState(() => {
    if (prevState?.form) {
      return { ...prevState.form };
    }
    return {
      user_name: '', user_phone: '+91 ', state: '',
      district: '', pincode: '', address: '', landmark: '',
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loadingMsg, setLoadingMsg]   = useState('');

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Auto-save form details to backend (debounced) ──────────────
  const saveTimerRef = useRef(null);
  useEffect(() => {
    // Skip auto-save if form is completely empty
    const hasAnyData = Object.values(form).some((v) => v && v.trim());
    if (!hasAnyData) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.patch(`/api/grievance/${id}/details`, form).catch(() => {});
    }, 1500); // save 1.5s after last keystroke

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [form, id]);

  // ── Fallback fetch if no state (refresh / direct URL / dashboard return) ──
  useEffect(() => {
    if (prevState && !prevState.form) {
      // Have AI data from previous step but no form yet — still try to fetch saved details
    } else if (prevState?.form) {
      return; // Already have form data from Review page edit
    }

    const fetchData = async () => {
      try {
        const res = await api.get(`/api/grievance/${id}`);
        const { grievance, ai_analysis } = res.data;

        if (!prevState) {
          setStepData({
            grievance_id:     grievance._id,
            english_summary:  ai_analysis?.english_summary || grievance.title || '',
            category:         grievance.category || 'other',
            keywords:         ai_analysis?.keywords || [],
            confidence_score: ai_analysis?.confidence_score,
            detected_language: ai_analysis?.detected_language || grievance.original_language || 'en-IN',
            verification_sentence: ai_analysis?.verification_sentence || '',
            original_text:    grievance.original_text || '',
          });
        }

        // Populate form with any previously saved details
        setForm((prev) => ({
          user_name:  grievance.user_name  || prev.user_name  || '',
          user_phone: grievance.user_phone || prev.user_phone || '+91 ',
          state:      grievance.state      || prev.state      || '',
          district:   grievance.district   || prev.district   || '',
          pincode:    grievance.pincode    || prev.pincode    || '',
          address:    grievance.address    || prev.address    || '',
          landmark:   grievance.landmark   || prev.landmark   || '',
        }));
      } catch (err) {
        if (!prevState) {
          setFetchError('Could not load grievance data. Please go back and resubmit.');
        }
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [id, prevState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!form.state || !form.district || !form.pincode || !form.address) {
      setSubmitError('Please fill in State, District, Pincode and Address.');
      return;
    }

    // Navigate to review page — no API call yet
    navigate(`/review/${id}`, {
      state: {
        ...stepData,
        form,
      },
    });
  };

  // ── Loading state ─────────────────────────────────────────────
  if (dataLoading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <motion.div
              style={{ width: 40, height: 40, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
            />
            <p style={{ color: 'var(--on-surface-variant)' }}>Loading your grievance…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Fetch error ───────────────────────────────────────────────
  if (fetchError) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="card" style={{ padding: '32px', textAlign: 'center', maxWidth: 400 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--error)' }}>error</span>
            <p style={{ margin: '16px 0 24px' }}>{fetchError}</p>
            <button className="btn btn-primary" onClick={() => navigate('/submit')}>
              Back to Submit
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const fields = [
    { label: 'Your Full Name',      field: 'user_name',  type: 'text', placeholder: 'Rajesh Kumar',   half: true,  custom: 0 },
    { label: 'Phone Number',        field: 'user_phone', type: 'tel',  placeholder: '+91 98XXXXXXXX', half: true,  custom: 1 },
    { label: 'District',            field: 'district',   type: 'text', placeholder: 'e.g. Gurugram',  half: true,  custom: 3 },
    { label: 'Pincode',             field: 'pincode',    type: 'text', placeholder: '122001',         half: true,  custom: 4 },
    { label: 'Landmark (optional)', field: 'landmark',   type: 'text', placeholder: 'Near city hall', half: false, custom: 6 },
  ];

  return (
    <DashboardLayout>
      <NavigationGuard grievanceId={id} />
      <motion.div
        className="gform-page"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header */}
        <section className="gform-header">
          <StepIndicator currentStep={2} />
          <h1>Tell us where you are</h1>
          <p>Fill in your location so we can suggest the right offices and portals near you.</p>

          {/* Show category/priority from prior step if available */}
          {stepData && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {stepData.category && (
                <span className="chip chip-primary" style={{ textTransform: 'capitalize' }}>
                  {stepData.category.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          )}
        </section>

        <form onSubmit={handleSubmit} className="gform-form">
          <div className="gform-grid">
            <div className="gform-main">

              {/* State dropdown */}
              <motion.div className="field-group" custom={2} variants={fieldVariants} initial="initial" animate="animate">
                <label className="input-label">State / Union Territory</label>
                <select className="input-field" value={form.state} onChange={set('state')} required>
                  <option value="">Select your state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </motion.div>

              {/* Half-width fields */}
              <div className="gform-row">
                {fields.filter(f => f.half).map((f) => (
                  <motion.div key={f.field} className="field-group" custom={f.custom} variants={fieldVariants} initial="initial" animate="animate">
                    <label className="input-label">{f.label}</label>
                    {f.field === 'user_phone' ? (
                      <input
                        type="tel"
                        className="input-field"
                        value={form[f.field]?.startsWith('+91 ') ? form[f.field] : '+91 ' + (form[f.field] || '').replace(/^(\+91\s*|\+91)/, '')}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (!val.startsWith('+91 ')) {
                            if (val.length < 4) {
                              val = '+91 ';
                            } else {
                              val = '+91 ' + val.replace(/^(\+91\s*|\+91)/, '');
                            }
                          }
                          setForm(prev => ({ ...prev, user_phone: val }));
                        }}
                        placeholder="+91 98XXXXXXXX"
                      />
                    ) : (
                      <input
                        type={f.type}
                        className="input-field"
                        value={form[f.field]}
                        onChange={set(f.field)}
                        placeholder={f.placeholder}
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Address */}
              <motion.div className="field-group" custom={5} variants={fieldVariants} initial="initial" animate="animate">
                <label className="input-label">Full Address</label>
                <textarea
                  className="input-field gform-textarea"
                  value={form.address}
                  onChange={set('address')}
                  placeholder="House no., street, mohalla, ward… (any language)"
                  rows={3}
                  required
                />
                <p className="gform-hint">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', color: 'var(--emerald)' }}>translate</span>
                  {' '}You can type in your language — we will translate it automatically.
                </p>
              </motion.div>

              {/* Landmark */}
              {fields.filter(f => !f.half).map((f) => (
                <motion.div key={f.field} className="field-group" custom={f.custom} variants={fieldVariants} initial="initial" animate="animate">
                  <label className="input-label">{f.label}</label>
                  <input
                    type={f.type}
                    className="input-field"
                    value={form[f.field]}
                    onChange={set(f.field)}
                    placeholder={f.placeholder}
                  />
                </motion.div>
              ))}

              {/* Inline error message */}
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'var(--error-container, #fdecea)',
                    color: 'var(--error)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                  {submitError}
                </motion.div>
              )}

              {/* Submit button */}
              <motion.button
                type="submit"
                className="btn btn-primary gform-submit"
                disabled={submitting}
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.97 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {submitting ? (
                  <>
                    <motion.span
                      className="gform-spinner"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                    />
                    {loadingMsg}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">search</span>
                    Find Nearby Help
                  </>
                )}
              </motion.button>
            </div>

            {/* Right column info cards */}
            <aside className="gform-aside">
              <motion.div
                className="card surface-low gform-info"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <div className="gform-info-icon">
                  <span className="material-symbols-outlined filled" style={{ color: 'var(--primary-container)', fontSize: 24 }}>location_on</span>
                </div>
                <h3>Why we need this</h3>
                <p>Your location helps us:</p>
                <ul className="gform-info-list">
                  <li>Find the nearest government offices for your issue</li>
                  <li>Link the correct state portal and helpline</li>
                  <li>Route your grievance to the right authority</li>
                </ul>
              </motion.div>

              <motion.div
                className="card surface-low gform-info"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
              >
                <div className="gform-info-icon">
                  <span className="material-symbols-outlined filled" style={{ color: 'var(--saffron)', fontSize: 24 }}>shield</span>
                </div>
                <h3>Your data is safe</h3>
                <p>Your personal details are encrypted and used only for grievance routing.</p>
              </motion.div>
            </aside>
          </div>
        </form>
      </motion.div>
    </DashboardLayout>
  );
}