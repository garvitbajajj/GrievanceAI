import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import './Help.css';

const FAQS = [
  {
    question: "How do I submit a new grievance?",
    answer: "Navigate to the 'Submit New' section from the sidebar. You can type or record your grievance in any of the 22+ supported languages. Our AI will automatically translate and categorize it."
  },
  {
    question: "How long does AI routing take?",
    answer: "Our AI engine processes and routes your grievance almost instantly (usually within 2-5 seconds) once submitted. You will immediately see the assigned department in your dashboard."
  },
  {
    question: "Is my personal data secure?",
    answer: "Yes. BhashaFlow uses NIC-compliant infrastructure with end-to-end encryption. Your personal identifiers are masked during the AI categorization phase to prevent bias and protect your identity."
  },
  {
    question: "Can I edit a grievance after submission?",
    answer: "No, once a grievance is submitted and assigned a unique ID, it cannot be edited to maintain the integrity of the civic record. However, you can add follow-up comments on the grievance detail page."
  }
];

function FAQItem({ faq }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="faq-item">
      <button 
        className="faq-question" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span>{faq.question}</span>
        <span className="material-symbols-outlined">expand_more</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="faq-answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="faq-answer-inner">
              {faq.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Help() {
  return (
    <DashboardLayout>
      <div className="help-page">
        <header className="help-header">
          <h1 className="help-title">Help Center</h1>
          <p className="help-sub">Find answers, learn how to use the portal, and contact support.</p>
        </header>

        <div className="help-grid">
          {/* Main FAQ Section */}
          <motion.section 
            className="faq-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2>
              <span className="material-symbols-outlined filled">quiz</span>
              Frequently Asked Questions
            </h2>
            <div className="faq-list">
              {FAQS.map((faq, idx) => (
                <FAQItem key={idx} faq={faq} />
              ))}
            </div>
          </motion.section>

          {/* Aside Cards */}
          <aside className="help-aside">
            <motion.div 
              className="help-card"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className="help-card-header">
                <span className="material-symbols-outlined filled" style={{ color: 'var(--emerald)' }}>menu_book</span>
                <h3>User Handbook</h3>
              </div>
              <p>Need detailed instructions? Download the official BhashaFlow handbook for a complete step-by-step guide.</p>
              <a href="/BhashaFlow_User_Handbook.pdf" download className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}>
                <span className="material-symbols-outlined">download</span>
                Download PDF
              </a>
            </motion.div>

            <motion.div 
              className="help-card"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="help-card-header">
                <span className="material-symbols-outlined filled" style={{ color: 'var(--saffron)' }}>support_agent</span>
                <h3>Contact Support</h3>
              </div>
              <p>Experiencing technical issues or need direct assistance? Our engineering team is here to help you.</p>
              <a href="mailto:bhashaflow@technicalsupport.com" className="contact-email">
                bhashaflow@technicalsupport.com
              </a>
            </motion.div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
