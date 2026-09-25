import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import api from '../utils/api';
import AdminFilters from '../components/AdminFilters';
import { categoryLabel } from '../data/options';
import './AdminDashboard.css'; // Reuse styles

const timeAgo = (date) => {
  if (!date) return '';
  const d = Math.floor((Date.now() - new Date(date)) / 86400000);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`;
};

export default function AdminGrievances() {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', status: '', language: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/admin/grievances', { params: { ...filters, page, limit: 20 } });
        setGrievances(res.data.grievances || []);
        setTotalPages(res.data.pagination?.total_pages || 1);
      } catch (err) {
        console.error('Failed to fetch grievances', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [filters, page, refreshKey]);

  return (
    <DashboardLayout isAdmin>
      <div className="admin-page">
        <motion.section
          className="admin-header"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="admin-header-left">
            <h1>All Grievances</h1>
            <p className="admin-sub">Manage and review all platform grievances</p>
          </div>
        </motion.section>

        <div className="filters-card">
          <div className="admin-card-title" style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>tune</span>
            Filters
          </div>
          <AdminFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); setRefreshKey(k => k + 1); }} />
        </div>

        <motion.div
          className="admin-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="admin-card-title" style={{ marginBottom: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--saffron)' }}>description</span>
              Grievances List
            </div>
            <div className="pagination-row">
              <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>‹</button>
              <span className="pagination-label">{page} / {totalPages}</span>
              <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPage(page + 1)} disabled={page >= totalPages}>›</button>
            </div>
          </div>

          <div className="urgent-table" style={{ opacity: loading ? 0.4 : 1 }}>
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
                <span className="urgent-dept">{categoryLabel(g.category)}</span>
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
    </DashboardLayout>
  );
}