import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import StepIndicator from '../components/StepIndicator';
import PopupModal from '../components/PopupModal';
import api from '../utils/api';
import './SubmitGrievance.css';

const TABS = [
  { id: 'text',  label: 'Type',  icon: 'edit_note' },
  { id: 'voice', label: 'Speak', icon: 'mic'       },
];

function TabSlider({ activeTab }) {
  const idx = TABS.findIndex(t => t.id === activeTab);
  return (
    <motion.div
      className="submit-tab-slider"
      animate={{ left: `calc(${idx * 50}% + 4px)`, width: 'calc(50% - 4px)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 38 }}
    />
  );
}

/* Animated waveform bars */
function Waveform() {
  const bars = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="waveform">
      {bars.map((i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{ animationDelay: `${(i * 0.07) % 0.8}s` }}
        />
      ))}
    </div>
  );
}

export default function SubmitGrievance() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [activeTab, setActiveTab] = useState('text');

  // Text tab
  const [text, setText] = useState(state?.prefillText || '');

  // Voice tab
  const [isRecording, setIsRecording]   = useState(false);
  const [audioBlob, setAudioBlob]       = useState(null);
  const [audioUrl, setAudioUrl]         = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const timerRef         = useRef(null);

  // File upload
  const [files, setFiles]     = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);

  // Popup modal state
  const [popup, setPopup] = useState({ open: false, type: 'info', title: '', message: '' });
  const closePopup = () => setPopup(p => ({ ...p, open: false }));
  const showPopup = (type, title, message) => setPopup({ open: true, type, title, message });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      showPopup('error', 'Microphone Access Denied', err.message || 'Please allow microphone access in your browser settings to use voice input.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.stream)
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };

  const validateInput = () => {
    if (activeTab === 'text' && !text.trim()) return false;
    if (activeTab === 'voice' && !audioBlob) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateInput()) {
      showPopup('warning', 'Input Required', 'Please type your grievance or record a voice message before submitting.');
      return;
    }
    const formData = new FormData();
    if (activeTab === 'text')  formData.append('text', text);
    if (activeTab === 'voice') formData.append('audio', audioBlob, 'recording.webm');
    if (files.length > 0)      formData.append('image', files[0]);
    setSubmitting(true);
    try {
      const res = await api.post('/api/grievance/ingest', formData);
      navigate(`/verify/${res.data.grievance_id}`, { state: res.data });
    } catch (err) {
      const errorCode = err.response?.data?.error;
      if (errorCode === 'AI_ENGINE_UNAVAILABLE' || err.response?.status === 503) {
        showPopup(
          'warning',
          'AI Engine is Busy',
          'Many citizens are currently submitting grievances. Our AI is processing them — please wait a moment and try again. Your grievance has been saved safely.'
        );
      } else {
        showPopup('error', 'Submission Failed', err.response?.data?.message || 'Something went wrong. Please try again in a moment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        className="submit-page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      >
        <section className="submit-header">
          <StepIndicator currentStep={0} />
          <h1>Submit Your Grievance</h1>
          <p>Type or speak your complaint in any Indian language — our AI handles translation and routing automatically.</p>
        </section>

        <form onSubmit={handleSubmit}>
          <div className="submit-grid">
            <div className="submit-main">

              {/* Tab switcher */}
              <div style={{ position: 'relative' }}>
                <div className="submit-tabs">
                  <TabSlider activeTab={activeTab} />
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`submit-tab ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className="material-symbols-outlined">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                {activeTab === 'text' ? (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="field-group"
                  >
                    <label className="input-label">Describe Your Grievance</label>
                    <textarea
                      className="grievance-textarea"
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Type in Hindi, Tamil, Telugu, English, or any Indian language... our AI will understand and translate automatically."
                      maxLength={2000}
                    />
                    <p className="char-count">{text.length} / 2000</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="voice"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="voice-zone">
                      {/* Timer */}
                      <div className={`voice-timer ${isRecording ? 'recording' : ''}`}>
                        {formatTime(recordingTime)}
                      </div>

                      {/* Waveform (only while recording) */}
                      <AnimatePresence>
                        {isRecording && (
                          <motion.div
                            initial={{ opacity: 0, scaleY: 0 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            exit={{ opacity: 0, scaleY: 0 }}
                          >
                            <Waveform />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Record button */}
                      <button
                        type="button"
                        className={`voice-record-btn ${isRecording ? 'active' : 'idle'}`}
                        onClick={isRecording ? stopRecording : startRecording}
                      >
                        <span className="material-symbols-outlined">
                          {isRecording ? 'stop' : 'mic'}
                        </span>
                      </button>

                      <p style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
                        {isRecording ? 'Tap to stop recording' : audioBlob ? 'Recording saved — tap mic to re-record' : 'Tap to start speaking'}
                      </p>

                      {audioUrl && !isRecording && (
                        <motion.audio
                          src={audioUrl}
                          controls
                          style={{ width: '100%', borderRadius: 8 }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload zone */}
              <div className="field-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Attach Proof
                  <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--outline)', textTransform: 'none', letterSpacing: 0 }}>(PDF, optional)</span>
                </label>
                <div
                  className={`upload-zone ${dragging ? 'dragging' : ''} ${files.length > 0 ? 'has-files' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileRef}
                    style={{ display: 'none' }}
                    accept="application/pdf"
                    onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])}
                  />
                  <span className="material-symbols-outlined upload-icon">
                    {files.length > 0 ? 'check_circle' : 'cloud_upload'}
                  </span>
                  <p className="upload-text">
                    {files.length > 0
                      ? `${files.length} file attached`
                      : 'Drop PDF here or click to browse'}
                  </p>
                  <p className="upload-hint">Max 10MB · PDF only</p>
                  {files.length > 0 && (
                    <div className="file-list">
                      {files.map((f, i) => (
                        <span key={i} className="chip chip-success" style={{ fontSize: 12 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>attach_file</span>
                          {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                className="submit-btn"
                disabled={submitting}
                whileHover={{ scale: submitting ? 1 : 1.015 }}
                whileTap={{ scale: submitting ? 1 : 0.98 }}
              >
                {submitting ? (
                  <>
                    <motion.span
                      style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    />
                    AI is reading your grievance…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">send</span>
                    Submit Grievance
                  </>
                )}
              </motion.button>

              <div className="security-badge">
                <span className="material-symbols-outlined">lock</span>
                Secure submission — NIC-compliant, end-to-end encrypted.
              </div>
            </div>

            {/* Aside */}
            <aside className="submit-aside">
              {[
                { icon: 'translate', color: 'var(--primary-container)', title: '22+ Languages Supported', body: 'Write in Hindi, Tamil, Telugu, Bengali, Marathi, or any scheduled Indian language.' },
                { icon: 'psychology', color: 'var(--saffron)', title: 'AI Verification', body: 'Our AI reads your grievance and confirms it understood correctly before routing.' },
                { icon: 'verified_user', color: 'var(--emerald)', title: 'Safe & Anonymous', body: 'Your personal details are never shared publicly. Only the assigned authority sees them.' },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  className="info-card"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <div className="info-card-header">
                    <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: card.color }}>{card.icon}</span>
                    <h3>{card.title}</h3>
                  </div>
                  <p>{card.body}</p>
                </motion.div>
              ))}
            </aside>
          </div>
        </form>
      </motion.div>

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