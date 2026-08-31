import { useState, useEffect } from 'react';
import LanguageModal from '../components/LanguageModal';
import PublicNavBar from '../components/PublicNavBar';
import ScrollProgressBar from '../components/ScrollProgressBar';
import HeroSection from '../components/HeroSection';
import StatsSection from '../components/StatsSection';
import AboutSection from '../components/AboutSection';
import GrievanceCTA from '../components/GrievanceCTA';
import PublicFooter from '../components/PublicFooter';
import './HomePage.css';

export default function HomePage() {
  const [langSelected, setLangSelected] = useState(() => {
    return !!sessionStorage.getItem('bf_lang_selected');
  });
  const [selectedLang, setSelectedLang] = useState(() => {
    return localStorage.getItem('bf_lang') || 'en';
  });

  const handleLanguageSelect = (langCode) => {
    sessionStorage.setItem('bf_lang_selected', '1');
    localStorage.setItem('bf_lang', langCode);
    setSelectedLang(langCode);
    setLangSelected(true);
  };

  return (
    <div className="homepage" id="homepage-root">
      {!langSelected && (
        <LanguageModal onSelect={handleLanguageSelect} />
      )}
      <ScrollProgressBar />
      <PublicNavBar selectedLang={selectedLang} onLangChange={handleLanguageSelect} />
      <main>
        <HeroSection />
        <StatsSection />
        <AboutSection />
        <GrievanceCTA />
      </main>
      <PublicFooter />
    </div>
  );
}
