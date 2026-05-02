import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './graphql/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import './styles/global.css';

// Pages
import Landing  from './pages/Landing';
import Login    from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Availability from './pages/Availability';
import PlaceholderPage from './pages/PlaceholderPage';

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
      <Route path="/" element={<Landing />} />
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Protected routes with persistent sidebar */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/find-buddies" element={<PlaceholderPage title="Find Study Buddies" description="Browse your recommended matches and discover new study partners." />} />
        <Route path="/my-connections" element={<PlaceholderPage title="My Connections" description="Manage your current connections and study groups." />} />
        <Route path="/study-sessions" element={<PlaceholderPage title="Study Sessions" description="View and manage your scheduled study sessions." />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/notifications" element={<PlaceholderPage title="Notifications" description="See important alerts and session updates." />} />
        <Route path="/messages" element={<PlaceholderPage title="Messages" description="Access your chats and study group conversations." />} />
        <Route path="/profile" element={<PlaceholderPage title="Profile" description="Edit your profile and preferences." />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── App ─────────────────────────────────────────────────
export default function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
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
