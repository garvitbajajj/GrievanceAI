import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from 'react-router-dom';
import PopupModal from '../components/PopupModal';
import api from '../utils/api';
import './CitizenAuth.css';

/* ── Animation variants ──────────────────────────────────── */
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

const panelVariants = {
  initial: { opacity: 0, x: -32 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 } },
};

const formVariants = {
  enter: (dir) => ({ opacity: 0, x: dir === "login" ? -20 : 20, filter: 'blur(4px)' }),
  show:  { opacity: 1, x: 0, filter: 'blur(0px)', transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:  (dir) => ({ opacity: 0, x: dir === "login" ? 20 : -20, filter: 'blur(4px)', transition: { duration: 0.2 } }),
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

/* Language words cycling in the ticker */
const LANG_WORDS = [
  { word: 'आपकी आवाज़', lang: 'Hindi' },
  { word: 'உங்கள் குரல்', lang: 'Tamil' },
  { word: 'మీ గొంతు', lang: 'Telugu' },
  { word: 'আপনার কণ্ঠ', lang: 'Bengali' },
  { word: 'നിന്റെ ശബ്ദം', lang: 'Malayalam' },
  { word: 'ನಿಮ್ಮ ಧ್ವನಿ', lang: 'Kannada' },
  { word: 'तुमची आवाज', lang: 'Marathi' },
];

/* Floating Indian script characters for background */
const AUTH_FLOAT_CHARS = [
  'अ', 'আ', 'இ', 'ప', 'ক', 'ಅ', 'മ', 'ੳ', 'ગ', 'ନ',
  'ज', 'ர', 'స', 'ড', 'ह', 'ம', 'ب', 'ય', 'ள',
  'भ', 'ত', 'ల', 'ಮ', 'ച', 'ع', 'ச', 'న', 'ভ',
  'శ', 'ت', 'ર', 'ம', 'ദ', 'ন', 'क', 'ன', 'ద',
];

const AUTH_PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  char: AUTH_FLOAT_CHARS[i % AUTH_FLOAT_CHARS.length],
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 14 + Math.random() * 38,
  opacity: 0.04 + Math.random() * 0.08,
  driftDuration: 18 + Math.random() * 24,
  driftDelay: Math.random() * -25,
  parallaxFactor: 10 + Math.random() * 40,
}));

/* Ashoka Chakra SVG spokes */
function AshokaChakreSVG() {
  const spokes = Array.from({ length: 24 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="200" cy="200" r="190" stroke="white" strokeWidth="6" />
      <circle cx="200" cy="200" r="28" stroke="white" strokeWidth="6" fill="none" />
      {spokes.map(i => {
        const angle = (i * 15 * Math.PI) / 180;
        const x1 = 200 + 30 * Math.cos(angle);
        const y1 = 200 + 30 * Math.sin(angle);
        const x2 = 200 + 185 * Math.cos(angle);
        const y2 = 200 + 185 * Math.sin(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="2.5" />;
      })}
      <circle cx="200" cy="200" r="140" stroke="white" strokeWidth="2" strokeDasharray="8 6" />
    </svg>
  );
}

/* Google SVG Icon */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

/* Tab slider component */
function TabSlider({ mode }) {
  const tabs = ['login', 'signup'];
  const idx = tabs.indexOf(mode);
  return (
    <motion.div
      className="auth-tab-slider"
      animate={{ left: `calc(${idx * 50}% + 4px)`, width: 'calc(50% - 8px)' }}
      transition={{ type: 'spring', stiffness: 400, damping: 38 }}
    />
  );
}

export default function CitizenAuth() {
  const [mode, setMode]     = useState("login");
  const [lEmail, setLEmail] = useState("");
  const [lPass, setLPass]   = useState("");
  const [fEmail, setFEmail] = useState("");
  const [showL, setShowL]   = useState(false);
  const [sName, setSName]   = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPass, setSPass]   = useState("");
  const [sConf, setSConf]   = useState("");
  const [showP, setShowP]   = useState(false);

  // Floating chars parallax
  const leftPanelRef = useRef(null);
  const authMousePos = useRef({ x: 0, y: 0 });
  const authCurrentPos = useRef(AUTH_PARTICLES.map(() => ({ x: 0, y: 0 })));
  const authParticleEls = useRef([]);
  const authAnimFrame = useRef(null);

  const onAuthMouseMove = useCallback((e) => {
    if (!leftPanelRef.current) return;
    const rect = leftPanelRef.current.getBoundingClientRect();
    authMousePos.current = {
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    };
  }, []);

  useEffect(() => {
    let active = true;
    const lerp = (a, b, t) => a + (b - a) * t;
    const tick = () => {
      if (!active) return;
      const { x: mx, y: my } = authMousePos.current;
      authParticleEls.current.forEach((el, i) => {
        if (!el) return;
        const p = AUTH_PARTICLES[i];
        const targetX = mx * p.parallaxFactor;
        const targetY = my * p.parallaxFactor;
        const cur = authCurrentPos.current[i];
        cur.x = lerp(cur.x, targetX, 0.06);
        cur.y = lerp(cur.y, targetY, 0.06);
        el.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
      });
      authAnimFrame.current = requestAnimationFrame(tick);
    };
    authAnimFrame.current = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(authAnimFrame.current); };
  }, []);
  const [showC, setShowC]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const [modalContent, setModalContent] = useState(null);

  // Popup modal state
  const [popup, setPopup] = useState({ open: false, type: 'info', title: '', message: '' });
  const closePopup = () => setPopup(p => ({ ...p, open: false }));
  const showPopup = (type, title, message) => setPopup({ open: true, type, title, message });

  const openModal = (e, type) => {
    e.preventDefault();
    setModalContent(type);
  };

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      setOauthError('Google sign-in failed. Please try again or use email/password.');
    }
  }, [searchParams]);

  const saveSession = (data) => {
    localStorage.setItem('token',    data.token);
    localStorage.setItem('userName', data.user.name);
    localStorage.setItem('userRole', data.user.role);
    localStorage.setItem('userEmail', data.user.email || '');
    if (data.user.preferred_language) {
      localStorage.setItem('language', data.user.preferred_language);
    }
  };

  const redirectByRole = (role) => {
    if (role === 'authority' || role === 'admin') navigate('/admin');
    else navigate('/dashboard');
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email: lEmail, password: lPass });
      saveSession(data);
      redirectByRole(data.user.role);
    } catch (err) {
      showPopup('error', 'Login Failed', err.response?.data?.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email: fEmail });
      showPopup('success', 'Reset Link Sent', data.message || 'A password reset link has been sent to your email address.');
      setMode("login");
    } catch (err) {
      showPopup('error', 'Request Failed', err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (e) => {
    e.preventDefault();
    if (sPass !== sConf) { showPopup('warning', 'Passwords Don\'t Match', 'Please make sure both password fields are identical.'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/register', { name: sName, email: sEmail, password: sPass });
      showPopup('success', 'Account Created!', 'Your account has been created successfully. Please sign in with your credentials.');
      setMode("login");
    } catch (err) {
      showPopup('error', 'Registration Failed', err.response?.data?.message || 'Could not create account. The email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  return (
    <motion.div className="auth-page" variants={pageVariants} initial="initial" animate="animate">

      {/* ── Left Panel ── */}
      <motion.div className="auth-left" variants={panelVariants} initial="initial" animate="animate" ref={leftPanelRef} onMouseMove={onAuthMouseMove}>
        {/* Rotating Ashoka Chakra watermark */}
        <div className="auth-chakra-wrap">
          <AshokaChakreSVG />
        </div>

        {/* Floating Indian script characters */}
        <div className="auth-float-canvas" aria-hidden="true">
          {AUTH_PARTICLES.map((p, i) => (
            <span
              key={p.id}
              ref={el => { authParticleEls.current[i] = el; }}
              className="auth-float-char notranslate"
              translate="no"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                fontSize: `${p.size}px`,
                opacity: p.opacity,
                animationDuration: `${p.driftDuration}s`,
                animationDelay: `${p.driftDelay}s`,
              }}
            >
              {p.char}
            </span>
          ))}
        </div>

        <div className="auth-left-content">
          {/* Brand */}
          <motion.div
            className="auth-logo-area"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="auth-logo-badge">
              <span className="material-symbols-outlined filled">language</span>
            </div>
            <h1 className="auth-logo-text">Bhasha<span>Flow</span></h1>
          </motion.div>

          {/* Language ticker */}
          <motion.div
            className="auth-lang-ticker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <span className="auth-lang-ticker-label">Your voice in</span>
            <div className="auth-lang-ticker-track">
              <div className="auth-lang-ticker-inner">
                {[...LANG_WORDS, LANG_WORDS[0]].map((l, i) => (
                  <div key={i} className="auth-lang-word">{l.word}</div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <p className="auth-tagline">
              Digital sovereignty<br />
              for <em>every</em> citizen.
            </p>
            <p className="auth-subtitle">
              File grievances in 22+ Indian languages. Our AI routes, translates, and tracks your civic concerns to the right authorities.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            className="auth-features"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {[
              { icon: 'translate',     title: '22+ Languages',        desc: 'Hindi, Tamil, Telugu, Bengali & more' },
              { icon: 'psychology',    title: 'AI-Powered Routing',   desc: 'Smart categorization & department mapping' },
            ].map((f) => (
              <motion.div key={f.title} className="auth-feature" variants={staggerItem}>
                <div className="auth-feature-dot">
                  <span className="material-symbols-outlined">{f.icon}</span>
                </div>
                <p className="auth-feature-text">
                  <strong>{f.title}</strong>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Tricolor */}
          <motion.div
            className="tricolor-bar"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{ originX: 0 }}
          >
            <div className="bar saffron" />
            <div className="bar white" />
            <div className="bar green" />
          </motion.div>
        </div>
      </motion.div>

      {/* ── Right Panel ── */}
      <div className="auth-right">
        <motion.div
          className="auth-form-container"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Tab Switcher */}
          {mode !== "forgot" && (
            <div className="auth-tabs" style={{ position: 'relative' }}>
              <TabSlider mode={mode} />
              {[["login", "Sign In"], ["signup", "Create Account"]].map(([m, label]) => (
                <button
                  key={m}
                  className={`auth-tab ${mode === m ? 'active' : ''}`}
                  onClick={() => setMode(m)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* OAuth error */}
          <AnimatePresence>
            {oauthError && (
              <motion.div
                className="oauth-error-banner"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                {oauthError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forms */}
          <AnimatePresence mode="wait" custom={mode}>
            {mode === "login" ? (
              <motion.form
                key="login"
                custom="login"
                variants={formVariants}
                initial="enter"
                animate="show"
                exit="exit"
                onSubmit={onLogin}
                className="auth-form"
              >
                <div className="form-header">
                  <h2>Welcome back</h2>
                  <p>Access your grievance dashboard and track your civic concerns.</p>
                </div>

                <motion.button
                  type="button"
                  onClick={onGoogleLogin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-google"
                >
                  <GoogleIcon />
                  Continue with Google
                </motion.button>

                <div className="auth-divider"><span>or sign in with email</span></div>

                <div className="field-group">
                  <label htmlFor="le" className="input-label">Email Address</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">mail</span>
                    <input id="le" type="email" className="input-field has-icon"
                      value={lEmail} onChange={e => setLEmail(e.target.value)}
                      placeholder="citizen@gov.in" required />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="lp" className="input-label">Password</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">lock</span>
                    <input id="lp" type={showL ? "text" : "password"} className="input-field has-icon"
                      value={lPass} onChange={e => setLPass(e.target.value)}
                      placeholder="Enter your password" required />
                    <button type="button" className="toggle-eye" onClick={() => setShowL(v => !v)}>
                      <span className="material-symbols-outlined">{showL ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="forgot-row">
                  <button type="button" className="forgot-btn" onClick={() => setMode("forgot")}>
                    Forgot Password?
                  </button>
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                  {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                  {loading && (
                    <motion.span
                      style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    />
                  )}
                </motion.button>

                <p className="auth-switch">
                  New to the portal?{" "}
                  <button type="button" onClick={() => setMode("signup")}>Create an Account</button>
                </p>
              </motion.form>

            ) : mode === "forgot" ? (
              <motion.form
                key="forgot"
                variants={formVariants}
                initial="enter"
                animate="show"
                exit="exit"
                onSubmit={onForgot}
                className="auth-form"
              >
                <div className="form-header">
                  <h2>Reset password</h2>
                  <p>Enter your email to receive a secure reset link.</p>
                </div>

                <div className="field-group">
                  <label htmlFor="fe" className="input-label">Email Address</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">mail</span>
                    <input id="fe" type="email" className="input-field has-icon"
                      value={fEmail} onChange={e => setFEmail(e.target.value)}
                      placeholder="citizen@gov.in" required />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                  <span className="material-symbols-outlined">send</span>
                </motion.button>

                <p className="auth-switch">
                  Remember your password?{" "}
                  <button type="button" onClick={() => setMode("login")}>Back to Sign In</button>
                </p>
              </motion.form>

            ) : (
              <motion.form
                key="signup"
                custom="signup"
                variants={formVariants}
                initial="enter"
                animate="show"
                exit="exit"
                onSubmit={onSignup}
                className="auth-form"
              >
                <div className="form-header">
                  <h2>Join BhashaFlow</h2>
                  <p>Register to raise issues in your native language.</p>
                </div>

                <motion.button
                  type="button"
                  onClick={onGoogleLogin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-google"
                >
                  <GoogleIcon />
                  Sign up with Google
                </motion.button>

                <div className="auth-divider"><span>or create account with email</span></div>

                <div className="field-group">
                  <label htmlFor="sn" className="input-label">Full Name</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">person</span>
                    <input id="sn" type="text" className="input-field has-icon"
                      value={sName} onChange={e => setSName(e.target.value)}
                      placeholder="Rajesh Kumar" required />
                  </div>
                </div>

                <div className="field-group">
                  <label htmlFor="se" className="input-label">Email Address</label>
                  <div className="input-wrapper">
                    <span className="material-symbols-outlined input-icon">mail</span>
                    <input id="se" type="email" className="input-field has-icon"
                      value={sEmail} onChange={e => setSEmail(e.target.value)}
                      placeholder="citizen@gov.in" required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field-group">
                    <label htmlFor="sp" className="input-label">Password</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined input-icon">lock</span>
                      <input id="sp" type={showP ? "text" : "password"} className="input-field has-icon"
                        value={sPass} onChange={e => setSPass(e.target.value)}
                        placeholder="Min. 8 chars" required minLength={8} />
                      <button type="button" className="toggle-eye" onClick={() => setShowP(v => !v)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showP ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="field-group">
                    <label htmlFor="sc" className="input-label">Confirm</label>
                    <div className="input-wrapper">
                      <span className="material-symbols-outlined input-icon">verified_user</span>
                      <input id="sc" type={showC ? "text" : "password"} className="input-field has-icon"
                        value={sConf} onChange={e => setSConf(e.target.value)}
                        placeholder="Re-enter" required />
                      <button type="button" className="toggle-eye" onClick={() => setShowC(v => !v)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showC ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? 'Creating…' : 'Create Account'}
                  {!loading && <span className="material-symbols-outlined">arrow_forward</span>}
                  {loading && (
                    <motion.span
                      style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    />
                  )}
                </motion.button>

                <p className="auth-switch">
                  Already registered?{" "}
                  <button type="button" onClick={() => setMode("login")}>Sign in</button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="auth-footer">
          <a href="#" onClick={(e) => openModal(e, 'privacy')}>Privacy Policy</a>
          <a href="#" onClick={(e) => openModal(e, 'terms')}>Terms of Service</a>
          <a href="#" onClick={(e) => openModal(e, 'support')}>Contact Support</a>
          <p>© 2025 BhashaFlow — A Multilingual Civic Engagement Initiative.</p>
        </div>
      </div>

      {/* ── Modal overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {modalContent && (
          <motion.div 
            className="auth-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalContent(null)}
          >
            <motion.div 
              className="auth-modal-content"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="auth-modal-close" onClick={() => setModalContent(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
              {modalContent === 'privacy' && (
                <>
                  <h3>Privacy Policy</h3>
                  <p>Welcome to <strong>BhashaFlow</strong>. This Privacy Policy describes how we handle the information you provide when using our Multilingual Grievance Redressal platform. We recognize that digital sovereignty is a fundamental right, and your privacy is our highest priority.</p>
                  <ul>
                    <li><strong>Data Collection:</strong> We collect your grievance text, selected language, and optional audio inputs solely for processing and resolving your issues.</li>
                    <li><strong>AI & Translation:</strong> Our AI-powered engine translates and routes your grievance to the correct government department. We ensure all NLP (Natural Language Processing) and translation models process your data securely.</li>
                    <li><strong>Data Protection:</strong> All records are securely stored on compliant infrastructure with end-to-end encryption. Your personal identifiers are masked during the AI categorization phase to prevent bias and protect your identity.</li>
                  </ul>
                  <p>By using BhashaFlow, you agree to our data practices designed to empower your voice while safeguarding your personal information.</p>
                </>
              )}
              {modalContent === 'terms' && (
                <>
                  <h3>Terms of Service</h3>
                  <p>By accessing and using <strong>BhashaFlow</strong>, you agree to comply with our Terms of Service. Our mission is to bridge the language gap between citizens and administration through advanced technology.</p>
                  <ul>
                    <li><strong>Appropriate Use:</strong> BhashaFlow must only be used to file legitimate grievances, feedback, or civic issues. Abuse, spamming, or filing false reports may lead to account suspension.</li>
                    <li><strong>System Integrity:</strong> Users are prohibited from attempting to disrupt our AI-routing mechanisms, API endpoints, or database infrastructure.</li>
                    <li><strong>Service Availability:</strong> While we strive for 99.9% uptime, BhashaFlow is provided "as is". We reserve the right to perform scheduled maintenance to improve our language models and routing algorithms.</li>
                  </ul>
                  <p>Your continuous use of the platform constitutes your acceptance of these terms, ensuring a respectful and efficient environment for all citizens.</p>
                </>
              )}
              {modalContent === 'support' && (
                <>
                  <h3>Contact Support</h3>
                  <p>Experiencing technical difficulties or need help navigating BhashaFlow? Our support team is here to assist you.</p>
                  <p>Whether you're facing issues with account creation, language translation errors, or grievance tracking, please provide us with detailed information so our engineers can quickly resolve the problem.</p>
                  <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface-container)', borderRadius: '8px' }}>
                    <strong>Technical Support Email:</strong><br/>
                    <a href="mailto:bhashaflow@technicalsupport.com" style={{ fontSize: '1.1em', fontWeight: 'bold' }}>bhashaflow@technicalsupport.com</a>
                  </div>
                  <p style={{ marginTop: '16px', fontSize: '0.9em', color: 'var(--on-surface-variant)' }}>Our standard response time is 24-48 hours during regular business days.</p>
                </>
              )}
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
        hideCancel
      />
    </motion.div>
  );
}