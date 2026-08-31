import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import PopupModal from './PopupModal';
import './TopBar.css';

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotif, setShowNotif]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [leaveConfirm, setLeaveConfirm]   = useState({ open: false, pendingPath: null });

  // KEEP THIS: Protection logic
  const isFlowPath = (path) =>
    path.startsWith('/verify/') || path.startsWith('/grievance-form/') || path.startsWith('/review/');

  const getFlowGrievanceId = () => {
    const match = location.pathname.match(/^\/(verify|grievance-form|review)\/([^/]+)/);
    return match ? match[2] : null;
  };

  const handleBreadcrumbClick = (e, path) => {
    if (!isFlowPath(location.pathname) || isFlowPath(path)) return;
    e.preventDefault();
    setLeaveConfirm({ open: true, pendingPath: path });
  };

  const handleLeaveConfirmed = async () => {
    const { pendingPath } = leaveConfirm;
    setLeaveConfirm({ open: false, pendingPath: null });
    const grievanceId = getFlowGrievanceId();
    try {
      if (grievanceId) await api.delete(`/api/grievance/${grievanceId}`);
    } catch { /* best effort */ }
    navigate(pendingPath);
  };
  
  // KEEP YASH'S VERSION: Better names
  const getBreadcrumbs = () => {
    const path = location.pathname;
    // Check if user came from the public home page (no auth session stored in sessionStorage for from-home)
    const fromHome = sessionStorage.getItem('bf_from_home') === '1';
    const homeOrDash = fromHome ? { name: 'Home', path: '/' } : { name: 'Dashboard', path: '/dashboard' };
    if (path.includes('dashboard'))      return [{ name: 'Dashboard' }];
    if (path.includes('submit'))         return [homeOrDash, { name: 'Submit Grievance' }];
    if (path.includes('verify'))         return [homeOrDash, { name: 'AI Verification' }];
    if (path.includes('grievance-form')) return [homeOrDash, { name: 'Your Details' }];
    if (path.includes('review'))         return [homeOrDash, { name: 'Review & Confirm' }];
    if (path.includes('ai-result'))      return [{ name: 'Dashboard', path: '/dashboard' }, { name: 'AI Analysis' }];
    if (path.includes('admin'))          return [{ name: 'Admin Portal' }];
    if (path.includes('grievance'))      return [{ name: 'Dashboard', path: '/dashboard' }, { name: 'Grievance Detail' }];
    return [];
  };

  const breadcrumbs = getBreadcrumbs();
  const userName = localStorage.getItem('userName') || 'Citizen';
  const userRole = localStorage.getItem('userRole');

  // Utility to convert date to human-readable format
  const timeAgo = (date) => {
    if (!date) return '';
    const d = Math.floor((Date.now() - new Date(date)) / 86400000);
    return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d}d ago`;
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        let res;
        if (userRole === 'admin' || userRole === 'authority') {
          res = await api.get('/api/admin/grievances?page=1&limit=5&status=pending');
          const notifs = res.data.grievances.map(g => ({
            id: g._id,
            message: `New grievance: ${g.title || 'Untitled'}`,
            time: timeAgo(g.submitted_at),
            link: `/grievance/${g._id}`,
            unread: true
          }));
          setNotifications(notifs);
          setUnreadCount(notifs.length);
        } else {
          res = await api.get('/api/grievance/recent');
          const grievances = res.data.grievances || [];
          const notifs = grievances.filter(g => g.status !== 'resolved' && g.status !== 'closed').map(g => ({
            id: g._id,
            message: `Update on grievance: ${g.title || 'Untitled'} - ${g.status}`,
            time: timeAgo(g.submitted_at),
            link: `/grievance/${g._id}`,
            unread: true
          }));
          setNotifications(notifs);
          setUnreadCount(notifs.length);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    fetchNotifications();
  }, [userRole]);

  return (
    <>
    <header className="topbar">
      <div className="breadcrumbs">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.name} className="crumb-wrap">
            {i > 0 && (
              <span className="material-symbols-outlined separator">chevron_right</span>
            )}
            {crumb.path ? (
              <Link to={crumb.path} className="crumb link" onClick={(e) => handleBreadcrumbClick(e, crumb.path)}>{crumb.name}</Link>
            ) : (
              <span className="crumb current">{crumb.name}</span>
            )}
          </span>
        ))}
      </div>

      <div className="topbar-actions">
        <div className="notif-container">
          <button className="icon-btn" aria-label="Notifications" onClick={() => setShowNotif(!showNotif)}>
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && <span className="notif-dot" />}
          </button>
          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <h4>Notifications</h4>
                <button onClick={() => setUnreadCount(0)}>Mark all read</button>
              </div>
              <div className="notif-list">
                {notifications.length > 0 ? notifications.map(notif => (
                  <Link key={notif.id} to={notif.link} className="notif-item" onClick={() => setShowNotif(false)}>
                    <p>{notif.message}</p>
                    <span>{notif.time}</span>
                  </Link>
                )) : (
                  <p className="no-notifs">No new notifications</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-profile">
          <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
          <span className="username">{userName}</span>
        </div>
      </div>
    </header>

    {/* Leave flow confirm popup */}
    <PopupModal
      open={leaveConfirm.open}
      type="confirm"
      title="Leave Grievance?"
      message="If you leave now, your in-progress grievance will be deleted. This cannot be undone."
      confirmLabel="Yes, Leave"
      cancelLabel="Stay Here"
      onConfirm={handleLeaveConfirmed}
      onClose={() => setLeaveConfirm({ open: false, pendingPath: null })}
    />
    </>
  );
}