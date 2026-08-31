import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './HeroSection.css';

// Individual floating characters from Indian scripts
const FLOATING_CHARS = [
  'अ', 'आ', 'இ', 'উ', 'ক', 'న', 'ప', 'మ', 'ಅ', 'ಕ',
  'ম', 'ত', 'स', 'ओ', 'ண', 'ధ', 'ਸ', 'ગ', 'ഗ',
  'ज', 'ர', 'ल', 'ড', 'ह', 'ம', 'శ', 'ب', 'ખ',
  'भ', 'द', 'ত', 'ప', 'ಮ', 'ച', 'ع', 'न', 'ச',
  'ভ', 'ర', 'ಜ', 'സ', 'ق', 'ય', 'ম', 'ల',
  'क', 'ன', 'శ', 'ت', 'ર', 'ம', 'ള', 'ద', 'ন',
];

// Generate random particle configs
function generateParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    char: FLOATING_CHARS[i % FLOATING_CHARS.length],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 16 + Math.random() * 48,
    opacity: 0.04 + Math.random() * 0.1,
    driftDuration: 20 + Math.random() * 25,
    driftDelay: Math.random() * -30,
    parallaxFactor: 15 + Math.random() * 55, // px shift per unit mouse offset
  }));
}

const PARTICLES = generateParticles(50);

export default function HeroSection() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');
  const heroRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentPos = useRef(PARTICLES.map(() => ({ x: 0, y: 0 })));
  const particleEls = useRef([]);
  const animFrame = useRef(null);

  const handleSubmitClick = () => {
    sessionStorage.setItem('bf_from_home', '1');
    if (isLoggedIn) navigate('/submit');
    else navigate('/auth');
  };

  // Track mouse in normalized coords (-0.5 to 0.5)
  const onMouseMove = useCallback((e) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    mousePos.current = {
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    };
  }, []);

  // Smooth lerp animation loop for parallax
  useEffect(() => {
    let active = true;
    const lerp = (a, b, t) => a + (b - a) * t;

    const tick = () => {
      if (!active) return;
      const { x: mx, y: my } = mousePos.current;
      particleEls.current.forEach((el, i) => {
        if (!el) return;
        const p = PARTICLES[i];
        const targetX = mx * p.parallaxFactor;
        const targetY = my * p.parallaxFactor;
        const cur = currentPos.current[i];
        cur.x = lerp(cur.x, targetX, 0.06);
        cur.y = lerp(cur.y, targetY, 0.06);
        el.style.transform = `translate(${cur.x}px, ${cur.y}px)`;
      });
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(animFrame.current); };
  }, []);

  return (
    <section className="hero" id="hero-section" onMouseMove={onMouseMove} ref={heroRef}>
      {/* Glows */}
      <div className="hero-glow hero-glow-saffron" />
      <div className="hero-glow hero-glow-blue" />

      {/* Ashoka Chakra bg watermark */}
      <div className="hero-chakra-bg" aria-hidden="true">
        <span className="hero-chakra-symbol">☸</span>
      </div>

      {/* Floating characters — different sizes, mouse-reactive */}
      <div className="hero-float-canvas" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={p.id}
            ref={el => { particleEls.current[i] = el; }}
            className="hero-float-char notranslate"
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

      {/* Main content */}
      <div className="hero-content">
        <h1 className="hero-title">
          Your Voice,{' '}
          <span className="hero-title-accent">Our Priority</span>
          <br />
          Grievances Solved with AI
        </h1>

        <p className="hero-subtitle">
          BhashaFlow is a student-built, AI-powered platform for multilingual citizen grievances.
          Submit complaints in <strong style={{ color: '#ff9933' }}>any Indian language</strong> — our AI understands, translates, and routes
          them to the right authority, fast and transparently.
        </p>

        <div className="hero-cta-group">
          <button
            className="hero-cta-primary"
            id="hero-submit-grievance-btn"
            onClick={handleSubmitClick}
          >
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 20 }}>edit_note</span>
            Submit a Grievance
          </button>
          <button
            className="hero-cta-secondary"
            id="hero-learn-more-btn"
            onClick={() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 20 }}>info</span>
            Learn More
          </button>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="hero-scroll-hint" aria-hidden="true">
        <span className="hero-scroll-arrow notranslate" translate="no">↓</span>
        Scroll
      </div>

      {/* Tricolor bar */}
      <div className="hero-tricolor" aria-hidden="true">
        <span style={{ background: '#ff9933' }} />
        <span style={{ background: '#ffffff' }} />
        <span style={{ background: '#138808' }} />
      </div>
    </section>
  );
}
