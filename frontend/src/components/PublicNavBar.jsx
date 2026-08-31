import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './PublicNavBar.css';

const LANG_LABELS = {
  en: 'English', hi: 'हिंदी', bn: 'বাংলা', te: 'తెలుగు',
  mr: 'मराठी', ta: 'தமிழ்', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ', or: 'ଓଡ଼ିଆ', ur: 'اردو',
};

export default function PublicNavBar({ selectedLang, onLangChange }) {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');
  const userName = localStorage.getItem('userName');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleAccountClick = () => {
    if (isLoggedIn) navigate('/dashboard');
    else navigate('/auth');
  };

  return (
    <nav className={`public-navbar${scrolled ? ' scrolled' : ''}`} id="public-navbar">
      {/* Brand */}
      <Link to="/" className="navbar-brand" id="navbar-brand-link">
        <div className="navbar-logo-mark notranslate" translate="no">भ</div>
        <div className="navbar-brand-text">
          <span className="navbar-brand-name">BhashaFlow</span>
          <span className="navbar-brand-tagline">Citizen Grievance Portal</span>
        </div>
      </Link>

      {/* Nav Links */}
      <ul className="navbar-links">
        <li><Link to="/" className={isActive('/')} id="nav-home">Home</Link></li>
        <li><Link to="/#about" className="" id="nav-about" onClick={(e) => {
          e.preventDefault();
          document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
        }}>About</Link></li>
        <li><Link to="/#how" className="" id="nav-how" onClick={(e) => {
          e.preventDefault();
          document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
        }}>How It Works</Link></li>
        {location.pathname !== '/' && (
          <li><Link to="/" className="" id="nav-back-home">← Back to Home</Link></li>
        )}
      </ul>

      {/* Right Actions */}
      <div className="navbar-actions">
        <button
          className="navbar-lang-btn"
          id="navbar-lang-toggle"
          onClick={() => {
            sessionStorage.removeItem('bf_lang_selected');
            window.location.reload();
          }}
          title="Change Language"
        >
          <span className="notranslate" translate="no">🌐</span> 
          <span className="navbar-lang-text">{LANG_LABELS[selectedLang] || 'English'}</span>
        </button>

        <button
          className="navbar-login-btn"
          id="navbar-account-btn"
          onClick={handleAccountClick}
        >
          {isLoggedIn ? (
            <><span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 16 }}>account_circle</span> {userName || 'My Account'}</>
          ) : (
            <><span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 16 }}>login</span> Login / Register</>
          )}
        </button>
      </div>
    </nav>
  );
}
