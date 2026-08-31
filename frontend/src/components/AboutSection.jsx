import './AboutSection.css';

const AUDIENCE_CARDS = [
  {
    icon: 'groups',
    title: 'Rural Citizens',
    desc: 'Submit grievances in your native language — Hindi, Tamil, Bengali, and 19 more Indian languages.',
  },
  {
    icon: 'apartment',
    title: 'Urban Residents',
    desc: 'Track real-time status of your complaints against public services and concerned authorities.',
  },
  {
    icon: 'account_balance',
    title: 'Authorities',
    desc: 'Receive AI-categorized, pre-vetted complaints routed directly to your department.',
  },
  {
    icon: 'monitoring',
    title: 'Oversight & NGOs',
    desc: 'Access anonymized analytics and trends to identify systemic public service failures.',
  },
];

const ABOUT_TAGS = [
  '22 Indian Languages', 'AI-Powered Routing', 'End-to-End Tracking',
  'Multilingual Support', 'Free to Use', 'Student Initiative',
];

export default function AboutSection() {
  return (
    <section className="about-section" id="about-section">
      <div className="about-inner">
        {/* Left: Description */}
        <div className="about-text">
          <p className="about-eyebrow">About BhashaFlow</p>
          <h2 className="about-heading">
            Breaking Language Barriers in Public Service
          </h2>
          <p className="about-body">
            BhashaFlow is India's first AI-driven multilingual grievance redressal system.
            Citizens can file complaints in <strong style={{ color: '#ff9933' }}>any of 22 scheduled languages</strong>,
            and our AI automatically translates, categorizes, and routes them to the correct
            concerned authority — eliminating the language barrier that has long excluded
            millions of Indians from public services.
          </p>
          <p className="about-body" style={{ marginBottom: 24 }}>
            Built on the principles of <strong style={{ color: '#fff' }}>transparency</strong>,
            {' '}<strong style={{ color: '#fff' }}>accessibility</strong>, and
            {' '}<strong style={{ color: '#fff' }}>accountability</strong> — every grievance gets a
            unique tracking ID, real-time status updates, and AI-assisted resolution estimates.
          </p>
          <div className="about-tags">
            {ABOUT_TAGS.map(tag => (
              <span key={tag} className="about-tag">{tag}</span>
            ))}
          </div>
        </div>

        {/* Right: Audience Cards */}
        <div className="about-cards">
          {AUDIENCE_CARDS.map((card) => (
            <div key={card.title} className="about-card">
              <span className="about-card-icon notranslate" translate="no">
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{card.icon}</span>
              </span>
              <div className="about-card-title">{card.title}</div>
              <div className="about-card-desc">{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
