import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './GrievanceCTA.css';

// "Tell us your issue" in different Indian languages
const MULTILINGUAL_PHRASES = [
  { text: 'Tell us your issue',          lang: 'en' },
  { text: 'हमें अपनी समस्या बताएं',       lang: 'hi' },
  { text: 'আমাদের আপনার সমস্যা বলুন',    lang: 'bn' },
  { text: 'మీ సమస్యను మాకు చెప్పండి',   lang: 'te' },
  { text: 'आम्हाला तुमची समस्या सांगा',   lang: 'mr' },
  { text: 'உங்கள் பிரச்சனையை சொல்லுங்கள்', lang: 'ta' },
  { text: 'ਸਾਡੇ ਨਾਲ ਆਪਣੀ ਸਮੱਸਿਆ ਸਾਂਝੀ ਕਰੋ', lang: 'pa' },
  { text: 'ನಿಮ್ಮ ಸಮಸ್ಯೆ ನಮಗೆ ತಿಳಿಸಿ',     lang: 'kn' },
  { text: 'നിങ്ങളുടെ പ്രശ്നം ഞങ്ങളോട് പറയൂ', lang: 'ml' },
  { text: 'અમને તમારી સમસ્યા જણાવો',      lang: 'gu' },
  { text: 'ਸਾਨੂੰ ਦੱਸੋ ਤੁਹਾਡੀ ਸਮੱਸਿਆ',    lang: 'pa' },
  { text: 'আপোনাৰ সমস্যা আমাক কওক',       lang: 'as' },
];

const INTERVAL_MS = 2200;

export default function GrievanceCTA() {
  const navigate = useNavigate();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % MULTILINGUAL_PHRASES.length);
        setFade(true);
      }, 300);
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitClick = () => {
    sessionStorage.setItem('bf_from_home', '1');
    if (isLoggedIn) navigate('/submit');
    else navigate('/auth');
  };

  const current = MULTILINGUAL_PHRASES[currentIdx];

  return (
    <section className="cta-section" id="cta-section">
      {/* Decorative rings */}
      <div className="cta-ring cta-ring-1" aria-hidden="true" />
      <div className="cta-ring cta-ring-2" aria-hidden="true" />
      <div className="cta-ring cta-ring-3" aria-hidden="true" />
      <div className="cta-glow" aria-hidden="true" />

      <div className="cta-inner">
        <div className="cta-eyebrow">
          <span className="cta-eyebrow-dot" />
          Citizen Grievance Portal · BhashaFlow
        </div>

        {/* Rotating multilingual text */}
        <div className="cta-rotating-text-wrap notranslate" translate="no" aria-live="polite" aria-label="Multilingual call to action">
          <div
            className="cta-rotating-text"
            key={currentIdx}
            lang={current.lang}
            style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease' }}
          >
            {current.text}
          </div>
        </div>

        <p className="cta-subtitle">
          File your complaint in <strong style={{ color: '#ff9933' }}>any Indian language</strong>.
          Our AI will translate, verify, and route it to the right department — free of cost.
        </p>

        <button
          className="cta-submit-btn"
          id="cta-submit-grievance-btn"
          onClick={handleSubmitClick}
        >
          <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 22 }}>edit_note</span>
          Submit Your Grievance
          <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 22 }}>arrow_forward</span>
        </button>

        <p className="cta-note">
          {isLoggedIn ? (
            <>Logged in · <Link to="/dashboard">Go to Dashboard →</Link></>
          ) : (
            <>New user? <Link to="/auth">Register for free</Link> to start tracking your complaints.</>
          )}
        </p>
      </div>
    </section>
  );
}
