import { Link } from 'react-router-dom';
import './PublicFooter.css';

export default function PublicFooter() {
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="public-footer" id="public-footer">
      <div className="public-footer-inner">
        {/* Brand */}
        <div className="footer-brand-col">
          <div className="footer-logo">
            <div className="footer-logo-mark">भ</div>
            <span className="footer-brand-name">BhashaFlow</span>
          </div>
          <p className="footer-brand-desc">
            India's multilingual AI-powered citizen grievance portal. Breaking language barriers
            in public service, one complaint at a time.
          </p>
          <div className="footer-tricolor">
            <span style={{ background: '#ff9933' }} />
            <span style={{ background: '#fff' }} />
            <span style={{ background: '#138808' }} />
          </div>
        </div>

        {/* Quick Links — scroll to sections or navigate */}
        <div>
          <div className="footer-col-title">Quick Links</div>
          <ul className="footer-links-list">
            <li><a href="#hero-section" onClick={scrollTo('hero-section')}>Home</a></li>
            <li><a href="#about-section" onClick={scrollTo('about-section')}>About</a></li>
            <li><Link to="/auth">Login / Register</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
          </ul>
        </div>

        {/* Services — actual app routes */}
        <div>
          <div className="footer-col-title">Services</div>
          <ul className="footer-links-list">
            <li><Link to="/submit">Submit Grievance</Link></li>
            <li><Link to="/dashboard">Track Status</Link></li>
            <li><Link to="/help">Help Center</Link></li>
            <li><Link to="/settings">Settings</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <div className="footer-col-title">Legal & Info</div>
          <ul className="footer-links-list">
            <li><a href="#about-section" onClick={scrollTo('about-section')}>About BhashaFlow</a></li>
            <li><a href="#stats-section" onClick={scrollTo('stats-section')}>Statistics</a></li>
            <li><a href="#cta-section" onClick={scrollTo('cta-section')}>Submit</a></li>
            <li><Link to="/help">Help & FAQ</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <p className="footer-copyright">
          © 2025 BhashaFlow Governance Initiative. All rights reserved.
        </p>
        <div className="footer-bottom-links">
          <a href="#hero-section" onClick={scrollTo('hero-section')}>Back to Top</a>
          <Link to="/help">Help</Link>
          <Link to="/auth">Login</Link>
        </div>
        <div className="footer-india-badge">
          🇮🇳 Made for Bharat
        </div>
      </div>
    </footer>
  );
}
