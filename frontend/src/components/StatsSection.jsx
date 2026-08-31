import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import './StatsSection.css';

// Count-up hook (reused from AdminDashboard pattern)
function useCountUp(target, duration = 1800) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  const startedRef = useRef(false);

  const start = () => {
    if (startedRef.current || !target) return;
    startedRef.current = true;
    const startTime = performance.now();
    const animate = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(Math.round(ease * target));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return [count, start];
}

// Material icon name, label, color accent
const STAT_DEFS = [
  { key: 'total',      icon: 'description',    label: 'Total Grievances', color: '#ff9933', desc: 'Registered on the platform' },
  { key: 'resolved',   icon: 'check_circle',   label: 'Cases Resolved',   color: '#4ade80', desc: 'Successfully closed' },
  { key: 'pending',    icon: 'pending_actions', label: 'Active Cases',     color: '#60a5fa', desc: 'Awaiting resolution' },
  { key: 'categories', icon: 'category',        label: 'Categories',       color: '#c084fc', desc: 'Service domains covered' },
];

function StatCard({ icon, label, value, suffix, color, desc }) {
  const [count, start] = useCountUp(value);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) start(); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className="public-stat-card" ref={ref}>
      <div className="public-stat-card-icon-wrap" style={{ color }}>
        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 28, color }}>
          {icon}
        </span>
      </div>
      <span className="public-stat-card-value notranslate" translate="no">
        {count.toLocaleString('en-IN')}
        {suffix && <span className="public-stat-card-value-suffix">{suffix}</span>}
      </span>
      <span className="public-stat-card-label">{label}</span>
      <span className="public-stat-card-desc">{desc}</span>
      <div className="public-stat-card-accent-bar" style={{ background: color }} />
    </div>
  );
}

export default function StatsSection() {
  const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0, categories: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        
        const res = await fetch(`${baseUrl}/api/public/stats`);
        
        if (res.ok) {
          const d = await res.json();
          setStats({
            total: d.total || 0,
            resolved: (d.by_status?.resolved || 0) + (d.by_status?.closed || 0),
            pending: (d.by_status?.pending || 0) + (d.by_status?.processing || 0) + (d.by_status?.open || 0) + (d.by_status?.in_progress || 0),
            categories: Object.keys(d.by_category || {}).length || 0,
          });
          return;
        }
      } catch {
        console.warn('Failed to fetch public stats');
      }
    };
    fetchStats();
  }, []);

  const statValues = [
    { ...STAT_DEFS[0], value: stats.total,      suffix: '' },
    { ...STAT_DEFS[1], value: stats.resolved,    suffix: '' },
    { ...STAT_DEFS[2], value: stats.pending,     suffix: '' },
    { ...STAT_DEFS[3], value: stats.categories,  suffix: '' },
  ];

  return (
    <section className="stats-section" id="stats-section">
      <div className="stats-inner">
        <p className="stats-label notranslate" translate="no">Platform Statistics</p>
        <h2 className="stats-heading">Making Governance Transparent</h2>
        <div className="stats-grid">
          {statValues.map((s) => (
            <StatCard
              key={s.key}
              icon={s.icon}
              label={s.label}
              value={s.value}
              suffix={s.suffix}
              color={s.color}
              desc={s.desc}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
