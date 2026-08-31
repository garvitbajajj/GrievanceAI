import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGrievanceFlow } from '../context/GrievanceFlowContext';
import LeaveFlowModal from './LeaveFlowModal';
import api from '../utils/api';
import './Sidebar.css';

let isFirstSidebarLoad = true;

export default function Sidebar({ isAdmin = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isInFlow, activeGrievanceId, exitFlow } = useGrievanceFlow();

  const [showModal, setShowModal]   = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);

  // Disable initial animation after first mount to prevent re-animation on route/state changes
  useEffect(() => {
    isFirstSidebarLoad = false;
  }, []);

  const isFlowPath = (path) =>
    path.startsWith('/verify/') ||
    path.startsWith('/grievance-form/') ||
    path.startsWith('/review/') ||
    path === '/submit';

  const closeMobile = () => setMobileOpen(false);

  const handleNavClick = (e, path) => {
    closeMobile();
    if (isInFlow && !isFlowPath(path)) {
      e.preventDefault();
      setPendingPath(path);
      setShowModal(true);
    }
  };

  const handleStay = () => { setShowModal(false); setPendingPath(null); };

  const handleLeave = async () => {
    setDeleting(true);
    try {
      if (activeGrievanceId) await api.delete(`/api/grievance/${activeGrievanceId}`);
    } catch { /* best effort */ }
    exitFlow();
    setDeleting(false);
    setShowModal(false);
    navigate(pendingPath || '/dashboard');
    setPendingPath(null);
  };

  const handleLogout = () => {
    closeMobile();
    if (isInFlow) { setPendingPath('__logout__'); setShowModal(true); return; }
    doLogout();
  };

  const doLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    window.location.href = '/auth';
  };

  const handleLeaveLogout = async () => {
    setDeleting(true);
    try {
      if (activeGrievanceId) await api.delete(`/api/grievance/${activeGrievanceId}`);
    } catch { /* best effort */ }
    exitFlow();
    setDeleting(false);
    setShowModal(false);
    doLogout();
  };

  const citizenLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Submit New', path: '/submit',    icon: 'add_circle' },
  ];

  const adminLinks = [
    { name: 'Overview',        path: '/admin',             icon: 'dashboard'   },
    { name: 'All Grievances',  path: '/admin/grievances',  icon: 'description' },
    { name: 'AI Insights',     path: '/admin/ai-insights', icon: 'psychology'  },
  ];

  // Citizens see Help + Settings; Admins see Settings only
  const citizenCommonLinks = [
    { name: 'Help',     path: '/help',     icon: 'help'     },
    { name: 'Settings', path: '/settings', icon: 'settings' },
  ];
  const adminSystemLinks = [
    { name: 'Settings',  path: '/settings',  icon: 'settings' },
  ];

  const commonLinks = isAdmin ? adminSystemLinks : citizenCommonLinks;

  const links = isAdmin ? adminLinks : citizenLinks;
  const userName = localStorage.getItem('userName') || 'Citizen';

  const renderSidebarContent = () => (
    <>
      {/* Brand */}
      <div className="sidebar-brand surface-highest">
        <div className="sidebar-brand-icon">
          <span className="material-symbols-outlined filled">language</span>
        </div>
        <div className="sidebar-brand-text">
          <h2>BhashaFlow</h2>
          <span className="subtitle">{isAdmin ? 'Admin Portal' : 'Citizen Portal'}</span>
        </div>
        {/* Mobile close button */}
        <button
          onClick={closeMobile}
          style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--outline)',
            display: 'none', padding: 4
          }}
          className="sidebar-close-btn"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="nav-section-label">Main</span>
        {links.map((link, i) => {
          const isActive =
            location.pathname === link.path ||
            (location.pathname.startsWith(link.path) &&
             link.path !== '/dashboard' && link.path !== '/admin');
          return (
            <motion.div
              key={link.name}
              initial={isFirstSidebarLoad ? { opacity: 0, x: -16 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: isFirstSidebarLoad ? i * 0.05 + 0.1 : 0 }}
            >
              <Link
                to={link.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, link.path)}
              >
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                  {link.icon}
                </span>
                {link.name}
              </Link>
            </motion.div>
          );
        })}

        <div className="nav-divider" />

        <span className="nav-section-label">{isAdmin ? 'System' : 'General'}</span>
        {commonLinks.map((link, i) => {
          const isActive = location.pathname === link.path;
          return (
            <motion.div
              key={link.name}
              initial={isFirstSidebarLoad ? { opacity: 0, x: -16 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: isFirstSidebarLoad ? (links.length + i) * 0.05 + 0.1 : 0 }}
            >
              <Link
                to={link.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={(e) => handleNavClick(e, link.path)}
              >
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                  {link.icon}
                </span>
                {link.name}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        {isAdmin && (
          <div className="operational-health">
            <span className="health-title">Operational Health</span>
            <div className="health-bar-bg">
              <motion.div
                className="health-bar-fill"
                initial={isFirstSidebarLoad ? { width: 0 } : false}
                animate={{ width: '88%' }}
                transition={isFirstSidebarLoad ? { delay: 0.8, duration: 1, ease: [0.4, 0, 0.2, 1] } : { duration: 0 }}
              />
            </div>
            <span className="health-value">88% Capacity</span>
          </div>
        )}

        {/* User profile */}
        <div className="user-profile-sidebar" onClick={() => setShowUserMenu(!showUserMenu)}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--primary-fixed)', color: 'var(--on-primary-fixed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 12, flexShrink: 0
          }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName}
          </span>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--outline)', marginLeft: 'auto' }}>
            {showUserMenu ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        {showUserMenu && (
          <div className="user-menu">
            <Link to="/settings" className="user-menu-item" onClick={() => setShowUserMenu(false)}>
              <span className="material-symbols-outlined">settings</span>
              Settings
            </Link>
            {!isAdmin && (
              <Link to="/help" className="user-menu-item" onClick={() => setShowUserMenu(false)}>
                <span className="material-symbols-outlined">help</span>
                Help
              </Link>
            )}
            <button onClick={handleLogout} className="user-menu-item logout">
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sidebar-overlay open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`sidebar surface-highest ${mobileOpen ? 'open' : ''}`}>
        {renderSidebarContent()}
      </aside>

      <LeaveFlowModal
        open={showModal}
        onStay={handleStay}
        onLeave={pendingPath === '__logout__' ? handleLeaveLogout : handleLeave}
        loading={deleting}
      />
    </>
  );
}