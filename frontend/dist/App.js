import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './graphql/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import './styles/global.css';
import { ProfileModalProvider } from './context/ProfileModalContext';
// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Availability from './pages/Availability';
import FindBuddies from './pages/FindBuddies';
import Connections from './pages/Connections';
import StudySessions from './pages/StudySessions';
import Messages from './pages/Messages';
// Onboarding pages (appear once after account creation)
import CompleteProfile from './pages/Completeprofile';
import StudyPreferences from './pages/Studypreferences';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
// ─── Protected Route ─────────────────────────────────────
function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading)
        return _jsx(PageLoader, {});
    return isAuthenticated ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
}
// ─── Public Route ─────────────────────────────────────────
// Redirects logged-in users away from auth pages
function PublicRoute({ children }) {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading)
        return _jsx(PageLoader, {});
    return isAuthenticated ? _jsx(Navigate, { to: "/dashboard", replace: true }) : _jsx(_Fragment, { children: children });
}
// ─── Router ──────────────────────────────────────────────
function AppRoutes() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Landing, {}) }), _jsx(Route, { path: "/login", element: _jsx(PublicRoute, { children: _jsx(Login, {}) }) }), _jsx(Route, { path: "/register", element: _jsx(PublicRoute, { children: _jsx(Register, {}) }) }), _jsx(Route, { path: "/onboarding/profile", element: _jsx(ProtectedRoute, { children: _jsx(CompleteProfile, {}) }) }), _jsx(Route, { path: "/onboarding/preferences", element: _jsx(ProtectedRoute, { children: _jsx(StudyPreferences, {}) }) }), _jsxs(Route, { element: _jsx(ProtectedRoute, { children: _jsx(DashboardLayout, {}) }), children: [_jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/find-buddies", element: _jsx(FindBuddies, {}) }), _jsx(Route, { path: "/my-connections", element: _jsx(Connections, {}) }), _jsx(Route, { path: "/study-sessions", element: _jsx(StudySessions, {}) }), _jsx(Route, { path: "/availability", element: _jsx(Availability, {}) }), _jsx(Route, { path: "/notifications", element: _jsx(Notifications, {}) }), _jsx(Route, { path: "/messages", element: _jsx(Messages, {}) }), _jsx(Route, { path: "/profile", element: _jsx(Profile, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
// ─── App ─────────────────────────────────────────────────
export default function App() {
    return (_jsx(ProfileModalProvider, { children: _jsx(ApolloProvider, { client: client, children: _jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsx(AppRoutes, {}) }) }) }) }));
}
// ─── Full-page loader ─────────────────────────────────────
function PageLoader() {
    return (_jsx("div", { style: {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: '#f6f4ff',
        }, children: _jsx("div", { style: {
                width: 40, height: 40,
                border: '3px solid #ede9fe',
                borderTop: '3px solid #7c3aed',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
            } }) }));
}
