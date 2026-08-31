import { useState, useEffect } from 'react';
import './LanguageModal.css';

const LANGUAGES = [
  { code: 'en', name: 'English',   native: 'English' },
  { code: 'hi', name: 'Hindi',     native: 'हिंदी' },
  { code: 'bn', name: 'Bengali',   native: 'বাংলা' },
  { code: 'te', name: 'Telugu',    native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi',   native: 'मराठी' },
  { code: 'ta', name: 'Tamil',     native: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati',  native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada',   native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi',   native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia',      native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese',  native: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu',      native: 'اردو' },
  { code: 'ks', name: 'Kashmiri',  native: 'كٲشُر' },
  { code: 'kok', name: 'Konkani',  native: 'कोंकणी' },
  { code: 'mni', name: 'Manipuri', native: 'মৈতৈলোন্' },
  { code: 'ne', name: 'Nepali',    native: 'नेपाली' },
  { code: 'sa', name: 'Sanskrit',  native: 'संस्कृतम्' },
  { code: 'sd', name: 'Sindhi',    native: 'سنڌي' },
  { code: 'mai', name: 'Maithili', native: 'मैथिली' },
  { code: 'bho', name: 'Bhojpuri', native: 'भोजपुरी' },
  { code: 'doi', name: 'Dogri',    native: 'डोगरी' },
];

// Load Google Translate script dynamically
function loadGoogleTranslateScript() {
  return new Promise((resolve) => {
    if (window.google && window.google.translate) { resolve(); return; }

    // Define the callback
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element'
      );
      resolve();
    };

    // Inject the script
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  });
}

// Programmatically switch Google Translate language
function switchGoogleTranslate(langCode) {
  if (langCode === 'en') {
    // Restore to original
    const frame = document.querySelector('iframe.goog-te-menu-frame');
    if (frame) {
      try {
        const items = frame.contentWindow.document.querySelectorAll('.goog-te-menu2-item');
        if (items.length > 0) items[0].click(); // first is "Original"
      } catch { /* cross-origin, fallback to cookie */ }
    }
    // Also try combo
    const combo = document.querySelector('.goog-te-combo');
    if (combo) { combo.value = ''; combo.dispatchEvent(new Event('change')); }
    // Cookie approach
    document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
    return;
  }
  // Set cookie first (works on reload)
  document.cookie = `googtrans=/en/${langCode}; path=/`;

  // Try to switch via combo dropdown
  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = langCode;
    combo.dispatchEvent(new Event('change'));
  }
}

export default function LanguageModal({ onSelect }) {
  const [selected, setSelected] = useState('en');

  // Load Google Translate on mount
  useEffect(() => {
    loadGoogleTranslateScript();
  }, []);

  const handleContinue = () => {
    switchGoogleTranslate(selected);
    onSelect(selected);
  };

  return (
    <div className="lang-modal-overlay" role="dialog" aria-modal="true" aria-label="Select your language">
      <div className="lang-modal">
        <div className="lang-modal-header">
          <div className="lang-modal-ashoka">☸</div>
          <h1 className="lang-modal-title">Welcome to BhashaFlow</h1>
          <p className="lang-modal-subtitle">
            अपनी भाषा चुनें · Choose your preferred language to continue
          </p>
          <div className="lang-tricolor-bar">
            <span style={{ background: '#ff9933' }} />
            <span style={{ background: '#fff' }} />
            <span style={{ background: '#138808' }} />
          </div>
        </div>

        <div className="lang-grid" role="listbox" aria-label="Available languages">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`lang-card${selected === lang.code ? ' active' : ''}`}
              role="option"
              aria-selected={selected === lang.code}
              onClick={() => setSelected(lang.code)}
              id={`lang-option-${lang.code}`}
            >
              <span className="lang-card-name">{lang.name}</span>
              <span className="lang-card-native">{lang.native}</span>
            </button>
          ))}
        </div>

        <div className="lang-modal-cta">
          <button
            className="lang-continue-btn"
            id="lang-continue-btn"
            onClick={handleContinue}
          >
            Continue in {LANGUAGES.find(l => l.code === selected)?.name || 'English'} →
          </button>
          <button className="lang-skip" onClick={() => onSelect('en')}>
            Skip and continue in English
          </button>
        </div>

        {/* Hidden Google Translate widget container */}
        <div id="google_translate_element" style={{ display: 'none' }} />
      </div>
    </div>
  );
}
