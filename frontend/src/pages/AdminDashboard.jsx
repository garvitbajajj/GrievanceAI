import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import api from '../utils/api';
import './AdminDashboard.css';

const timeAgo = (date) => {
  if (!date) return '';
  const d = Math.floor((Date.now() - new Date(date)) / 86400000);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`;
};

/* Animated counter */
function useCountUp(target, duration = 700, delay = 0) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!target) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setCount(Math.round(e * target));
        if (p < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(timeout); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delay]);
  return count;
}

function StatCard({ label, target, icon, color, desc, delay }) {
  const count = useCountUp(typeof target === 'number' ? target : 0, 700, delay);
  return (
    <motion.div
      className={`admin-stat-card stat-${color}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="admin-stat-top">
        <div className="admin-stat-icon-wrap">
          <span className="material-symbols-outlined filled">{icon}</span>
        </div>
        <span className="admin-stat-label">{label}</span>
      </div>
      <span className="admin-stat-value">
        {typeof target === 'number' ? count : target}
      </span>
      <p className="admin-stat-desc">{desc}</p>
    </motion.div>
  );
}

const categoryColors = [
  'var(--primary-container)', 'var(--saffron)', 'var(--emerald)', '#c084fc', 'var(--outline)',
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats]           = useState({ total: 0, by_status: {}, by_category: {}, avg_resolution_hours: 0 });
  const [grievances, setGrievances] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList]   = useState(true);
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage]         = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Role guard handled by AdminRoute in App.jsx

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/admin/stats');
        setStats(res.data || { total: 0, by_status: {}, by_category: {}, avg_resolution_hours: 0 });
      } catch { /* ignore */ } finally { setLoadingStats(false); }
    };
    fetch();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoadingList(true);
      try {
        const res = await api.get('/api/admin/grievances', { params: { status: filterStatus, category: filterCategory, page } });
        setGrievances(res.data.grievances || []);
        setTotalPages(Math.max(1, res.data.pagination?.total_pages || 1));
      } catch { /* ignore */ } finally { setLoadingList(false); }
    };
    fetch();
  }, [filterStatus, filterCategory, page, refreshKey]);

  const categoriesList = Object.entries(stats.by_category || {}).map(([name, count], i) => ({
    name, count,
    pct: stats.total ? Math.round((count / stats.total) * 100) : 0,
    color: categoryColors[i % categoryColors.length],
  }));

  return (
    <DashboardLayout isAdmin>
      <div className="admin-page">

        {/* Header */}
        <motion.section
          className="admin-header"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="admin-header-left">
            <h1>Administrative Dashboard</h1>
            <p className="admin-sub">Real-time grievance status overview</p>
          </div>
          <div className="admin-header-badge">
            <span className="material-symbols-outlined">shield</span>
            System Active
          </div>
        </motion.section>

        {/* Stats */}
        <div className="admin-stats">
          <StatCard label="Total Tracked"       target={stats.total || 0}                icon="pending_actions"  color="primary"   desc="All platform interactions"          delay={100} />
          <StatCard label="Pending Review"      target={stats.by_status?.pending || 0}   icon="warning"          color="error"     desc="Awaiting triage or assignment"      delay={200} />
          <StatCard label="Avg. Resolution"     target={stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : 'N/A'} icon="schedule" color="secondary" desc="Across resolved grievances" delay={300} />
        </div>

        <div className="admin-grid">
          {/* Categories */}
          <motion.div
            className="admin-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="admin-card-title">
              <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>pie_chart</span>
              Categories Breakdown
            </div>
            <div className="category-list" style={{ opacity: loadingStats ? 0.4 : 1 }}>
              {categoriesList.length > 0 ? categoriesList.map((c, i) => (
                <motion.div
                  key={c.name}
                  className="category-item"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                >
                  <div className="category-info">
                    <div className="category-dot" style={{ background: c.color }} />
                    <span className="category-name" style={{ textTransform: 'capitalize' }}>
                      {c.name} ({c.count})
                    </span>
                  </div>
                  <div className="category-bar-wrap">
                    <div className="category-bar-bg">
                      <motion.div
                        className="category-bar-fill"
                        style={{ background: c.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${c.pct}%` }}
                        transition={{ delay: 0.5 + i * 0.06, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                      />
                    </div>
                    <span className="category-pct">{c.pct}%</span>
                  </div>
                </motion.div>
              )) : (
                <p style={{ color: 'var(--outline)', fontSize: 13 }}>No category data available.</p>
              )}
            </div>
          </motion.div>

          {/* Grievance Inbox */}
          <motion.div
            className="admin-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="admin-card-title" style={{ marginBottom: 0 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>inbox</span>
                Grievance Inbox
              </div>
              <div className="pagination-row">
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>‹</button>
                <span className="pagination-label">{page} / {totalPages}</span>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPage(page + 1)} disabled={page >= totalPages}>›</button>
              </div>
            </div>

            <div className="urgent-table" style={{ opacity: loadingList ? 0.4 : 1 }}>
              <div className="urgent-header-row">
                <span>View</span>
                <span>Title</span>
                <span>Category</span>
                <span>Status</span>
                <span>Lang</span>
                <span>Time</span>
              </div>
              {grievances.length > 0 ? grievances.map((g, i) => (
                <motion.div
                  key={g._id}
                  className="urgent-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <span>
                    <Link to={`/grievance/${g._id}`} className="btn btn-tertiary" style={{ padding: '4px 6px', fontSize: 12 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                    </Link>
                  </span>
                  <span className="urgent-title" title={g.title || ''}>
                    {g.title || g.original_text?.substring(0, 55) || 'No title'}
                  </span>
                  <span className="urgent-dept">{g.category || 'General'}</span>
                  <span className={`chip ${(g.status === 'resolved' || g.status === 'closed') ? 'chip-success' : 'chip-warning'}`} style={{ fontSize: 10 }}>
                    {(g.status || 'PENDING').toUpperCase()}
                  </span>
                  <span className="chip chip-primary" style={{ fontSize: 10 }}>
                    {g.original_language || 'EN'}
                  </span>
                  <span className="urgent-time">{timeAgo(g.submitted_at)}</span>
                </motion.div>
              )) : (
                <p style={{ padding: '16px', textAlign: 'center', color: 'var(--outline)', fontSize: 13 }}>
                  No grievances match criteria.
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div
          className="filters-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <div className="admin-card-title" style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>tune</span>
            Filters
          </div>
          <div className="filters-grid">
            <div className="field-group">
              <label className="input-label">Category</label>
              <select className="input-field" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); setRefreshKey(k => k + 1); }}>
                <option value="">All Categories</option>
                {['water','roads','electricity','sanitation','education','healthcare','other'].map(c => (
                  <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="input-label">Status</label>
              <select className="input-field" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); setRefreshKey(k => k + 1); }}>
                <option value="">All Statuses</option>
                {['pending','processing','open','in_progress','resolved','closed'].map(s => (
                  <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        <footer className="page-footer">
          <p className="footer-tagline">© 2025 BhashaFlow Governance Initiative. All rights reserved.</p>
          <div className="footer-links">
            <Link to="/help">Help Center</Link>
            <Link to="/settings">Settings</Link>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
}