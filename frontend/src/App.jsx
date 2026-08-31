import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
// Public
import HomePage from './pages/HomePage';
// Auth
import CitizenAuth from './pages/CitizenAuth';
import OAuthSuccess from './pages/OAuthSuccess';
import ResetPassword from './pages/ResetPassword';

// Citizen pages
import Dashboard       from './pages/Dashboard';
import SubmitGrievance from './pages/SubmitGrievance';
import VerifyGrievance from './pages/VerifyGrievance';
import GrievanceForm   from './pages/GrievanceForm';
import ReviewGrievance from './pages/ReviewGrievance';
import AIAnalysis      from './pages/AIAnalysis';
import GrievanceDetail from './pages/GrievanceDetail';
import Help            from './pages/Help';
import Settings        from './pages/Settings';

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import AdminGrievances from './pages/AdminGrievances';
import AdminAIInsights from './pages/AdminAIInsights';

// Route guards
import { ProtectedRoute, AdminRoute } from './utils/auth';

function App() {
  const location = useLocation();
  return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* ── Public ─────────────────────────────────────── */}
          <Route path="/auth"               element={<CitizenAuth />} />
          <Route path="/auth/oauth-success" element={<OAuthSuccess />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* ── Citizen (protected) ────────────────────────── */}
          <Route path="/dashboard"
            element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/submit"
            element={<ProtectedRoute><SubmitGrievance /></ProtectedRoute>} />

          {/* Step 2 of grievance flow — AI verification */}
          <Route path="/verify/:id"
            element={<ProtectedRoute><VerifyGrievance /></ProtectedRoute>} />

          {/* Step 3 — location + contact form */}
          <Route path="/grievance-form/:id"
            element={<ProtectedRoute><GrievanceForm /></ProtectedRoute>} />

          {/* Step 4 — review all details */}
          <Route path="/review/:id"
            element={<ProtectedRoute><ReviewGrievance /></ProtectedRoute>} />

          {/* Step 5 — AI result, portals, procedure */}
          <Route path="/ai-result/:id"
            element={<ProtectedRoute><AIAnalysis /></ProtectedRoute>} />

          {/* Grievance detail (citizen view) */}
          <Route path="/grievance/:id"
            element={<ProtectedRoute><GrievanceDetail /></ProtectedRoute>} />

          <Route path="/help"
            element={<ProtectedRoute><Help /></ProtectedRoute>} />

          <Route path="/settings"
            element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* ── Admin (protected + role check) ─────────────── */}
          <Route path="/admin"
            element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          <Route path="/admin/grievances"
            element={<AdminRoute><AdminGrievances /></AdminRoute>} />

          <Route path="/admin/ai-insights"
            element={<AdminRoute><AdminAIInsights /></AdminRoute>} />

          {/* ── Fallbacks ───────────────────────────────────── */}
          <Route path="/"  element={<HomePage />} />
          <Route path="*"  element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
  );
}

export default App;