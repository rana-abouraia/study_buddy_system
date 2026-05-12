import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './graphql/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import './styles/global.css';
import { ProfileModalProvider } from './context/ProfileModalContext';

// Pages
import Landing          from './pages/Landing';
import Login            from './pages/Login';
import Register         from './pages/Register';
import Dashboard        from './pages/Dashboard';
import Availability     from './pages/Availability';
import FindBuddies      from './pages/FindBuddie';
import Connections      from './pages/Connections';
import StudySessions    from './pages/StudySessions';
import Messages         from './pages/Messages';

// Onboarding pages (appear once after account creation)
import CompleteProfile  from './pages/Completeprofile';
import StudyPreferences from './pages/Studypreferences';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';

// ─── Protected Route ─────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// ─── Public Route ─────────────────────────────────────────
// Redirects logged-in users away from auth pages
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

// ─── Router ──────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* ── Onboarding flow (protected, no sidebar) ──────── */}
      {/* Step 1: Complete profile   → /onboarding/profile   */}
      {/* Step 2: Study preferences  → /onboarding/preferences */}
      <Route
        path="/onboarding/profile"
        element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>}
      />
      <Route
        path="/onboarding/preferences"
        element={<ProtectedRoute><StudyPreferences /></ProtectedRoute>}
      />

      {/* Protected routes with persistent sidebar */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard"       element={<Dashboard />} />
        <Route path="/find-buddies"    element={<FindBuddies />} />
        <Route path="/my-connections"  element={<Connections />} />
        <Route path="/study-sessions"  element={<StudySessions />} />
        <Route path="/availability"    element={<Availability />} />
        <Route path="/notifications"   element={<Notifications />} />
        <Route path="/messages"        element={<Messages />} />
        <Route path="/profile"         element={<Profile />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── App ─────────────────────────────────────────────────
export default function App() {
  return (
    <ProfileModalProvider>
    <ApolloProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
    </ProfileModalProvider>
  );
}

// ─── Full-page loader ─────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f6f4ff',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #ede9fe',
        borderTop: '3px solid #7c3aed',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}