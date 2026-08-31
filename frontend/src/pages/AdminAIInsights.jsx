import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import api from '../utils/api';
import './AdminDashboard.css'; // Reuse styles

function StatCard({ label, target, icon, color, desc, delay }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now) => {
        const p = Math.min((now - start) / 700, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setCount(Math.round(e * target));
        if (p < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, delay]);
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

export default function AdminAIInsights() {
  const [stats, setStats] = useState({ total_ai_analyses: 0, avg_confidence: 0, categories_analyzed: 0, portals_found: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/api/admin/ai-insights');
        setStats(res.data || { total_ai_analyses: 0, avg_confidence: 0, categories_analyzed: 0, portals_found: 0 });
      } catch (err) {
        console.error('Failed to fetch AI insights', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

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
            <h1>AI Insights</h1>
            <p className="admin-sub">Analytics on AI-powered grievance processing</p>
          </div>
        </motion.section>

        <div className="admin-stats">
          <StatCard label="AI Analyses" target={stats.total_ai_analyses || 0} icon="psychology" color="primary" desc="Grievances processed by AI" delay={100} />
          <StatCard label="Avg Confidence" target={stats.avg_confidence ? `${Math.round(stats.avg_confidence * 100)}%` : 'N/A'} icon="verified" color="emerald" desc="AI classification accuracy" delay={200} />
          <StatCard label="Categories" target={stats.categories_analyzed || 0} icon="category" color="secondary" desc="Unique categories identified" delay={300} />
          <StatCard label="Portals Found" target={stats.portals_found || 0} icon="domain" color="saffron" desc="Government portals suggested" delay={400} />
        </div>

        <motion.div
          className="admin-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="admin-card-title">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary-container)' }}>analytics</span>
            AI Performance Overview
          </div>
          <p style={{ color: 'var(--outline)', fontSize: 13, textAlign: 'center', padding: '20px' }}>
            Detailed AI analytics and trends will be displayed here.
          </p>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}