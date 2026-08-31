import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import api from '../utils/api';
import './Dashboard.css';

const timeAgo = (date) => {
  if (!date) return 'Unknown';
  const d = Math.floor((Date.now() - new Date(date)) / 86400000);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`;
};

/* Animated counter hook */
function useCountUp(target, duration = 800, delay = 0) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (target === 0) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(timeout); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delay]);

  return count;
}

function StatCard({ label, target, icon, color, delay }) {
  const count = useCountUp(target, 700, delay);
  return (
    <motion.div
      className={`stat-card card stat-${color}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="stat-icon-wrap">
        <span className="material-symbols-outlined filled">{icon}</span>
      </div>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{count}</span>
    </motion.div>
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Citizen';

  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/auth'); return; }
    // Redirect admins to their own dashboard
    const role = localStorage.getItem('userRole');
    if (role === 'admin' || role === 'authority') { navigate('/admin', { replace: true }); return; }
    const fetchData = async () => {
      try {
        const res = await api.get('/api/grievance/recent');
        const data = res.data.grievances || [];
        setGrievances(data);
        setStats({
          total: data.length,
          inProgress: data.filter(g => ['in_progress','open','pending'].includes(g.status)).length,
          resolved:   data.filter(g => ['resolved','closed'].includes(g.status)).length,
        });
      } catch (err) {
        console.error('Failed to fetch grievances', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const statusChipClass = (status) => {
    if (!status) return 'chip chip-warning';
    if (status === 'resolved' || status === 'closed') return 'chip chip-success';
    if (status === 'in_progress') return 'chip chip-primary';
    return 'chip chip-warning';
  };

  return (
    <DashboardLayout>
      <div className="dash-page">

        {/* Hero */}
        <motion.section
          className="dash-hero"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="dash-hero-text">
            <h1 className="dash-welcome">
              Namaste, <span className="name-highlight">{userName}.</span>
            </h1>
            <p className="dash-sub">Your voice matters. Monitoring your civic contributions.</p>
          </div>
          <div className="dash-hero-action">
            <Link to="/submit" className="dash-cta">
              <span className="material-symbols-outlined">add</span>
              File Grievance
            </Link>
          </div>
        </motion.section>

        {/* Stats */}
        <div className="dash-stats">
          <StatCard label="Total Filed"   target={loading ? 0 : stats.total}      icon="description"  color="primary"   delay={100} />
          <StatCard label="In Progress"   target={loading ? 0 : stats.inProgress} icon="pending"      color="secondary" delay={200} />
          <StatCard label="Resolved"      target={loading ? 0 : stats.resolved}   icon="check_circle" color="success"   delay={300} />
        </div>

        {/* Main Grid */}
        <div className="dash-grid">

          {/* Grievances list */}
          <section>
            <div className="section-header">
              <h2>My Recent Grievances</h2>
              {!loading && grievances.length > 0 && (
                <Link to="/submit" className="btn btn-tertiary" style={{ fontSize: 12 }}>+ New</Link>
              )}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => (
                  <motion.div
                    key={i}
                    style={{ height: 76, borderRadius: 12, background: 'var(--surface-container-low)' }}
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                  />
                ))}
              </div>
            ) : grievances.length === 0 ? (
              <motion.div
                className="dash-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline)', display: 'block', marginBottom: 12 }}>inbox</span>
                <p>You haven't filed any grievances yet.</p>
                <Link to="/submit" className="btn btn-primary" style={{ display: 'inline-flex', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Submit Now
                </Link>
              </motion.div>
            ) : (
              <motion.div
                className="grievance-list"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {grievances.map(g => (
                  <motion.div key={g._id} variants={itemVariants}>
                    <Link to={`/grievance/${g._id}`} className="grievance-card">
                      <div className="grievance-card-top">
                        <h3 className="grievance-title">
                          {g.title || g.original_text?.substring(0, 80) || 'Untitled Grievance'}
                        </h3>
                        <span className={statusChipClass(g.status)}>
                          {(g.status || 'pending').replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="grievance-card-bottom">
                        <span className="grievance-dept" style={{ textTransform: 'capitalize' }}>
                          <span className="material-symbols-outlined">account_balance</span>
                          {g.category || 'General'}
                        </span>
                        <span className="grievance-date">{timeAgo(g.submitted_at)}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>

          {/* Aside */}
          <aside className="dash-aside">
            <motion.div
              className="insight-card"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              <div className="insight-header">
                <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: 'var(--saffron)' }}>psychology</span>
                <h3>AI-Powered Insights</h3>
              </div>
              <p>Your reports are actively monitored and routed to the correct departments by our AI engine.</p>
            </motion.div>

            <motion.div
              className="guidance-card"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <div className="insight-header">
                <span className="material-symbols-outlined filled" style={{ fontSize: 20, color: 'var(--emerald)' }}>menu_book</span>
                <h3>Need Guidance?</h3>
              </div>
              <p>Access the official BhashaFlow handbook for step-by-step grievance filing in your language.</p>
              <Link to="/help" className="btn btn-outline" style={{ marginTop: 14, fontSize: 13, padding: '8px 16px', textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                View Handbook
              </Link>
            </motion.div>

            {/* Tricolor accent card */}
            <motion.div
              style={{
                borderRadius: 14, overflow: 'hidden',
                border: '1px solid var(--outline-variant)'
              }}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <div style={{ display: 'flex', height: 3 }}>
                <div style={{ flex: 1, background: 'var(--saffron)' }} />
                <div style={{ flex: 0.4, background: '#fff', borderTop: '1px solid var(--outline-variant)', borderBottom: '1px solid var(--outline-variant)' }} />
                <div style={{ flex: 1, background: '#138808' }} />
              </div>
              <div style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: 12, color: 'var(--outline)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--on-surface)', fontWeight: 700 }}>Digital Sovereignty</strong><br />
                  Secure, NIC-compliant infrastructure protecting every citizen's civic voice.
                </p>
              </div>
            </motion.div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="page-footer">
          <div className="footer-brand">BhashaFlow</div>
          <p className="footer-tagline">Empowering citizens through transparent governance.</p>
          <div className="footer-links">
            <Link to="/help">Privacy Policy</Link>
            <Link to="/help">Terms of Service</Link>
            <Link to="/help">Contact Support</Link>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}