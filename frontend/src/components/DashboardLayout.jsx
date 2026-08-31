import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function DashboardLayout({ children, isAdmin }) {
  // Auto-detect admin role from localStorage if not explicitly passed
  const autoAdmin = isAdmin !== undefined
    ? isAdmin
    : ['admin', 'authority'].includes(localStorage.getItem('userRole'));

  return (
    <div className="layout surface">
      <Sidebar isAdmin={autoAdmin} />
      <div className="layout-main">
        <TopBar />
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
