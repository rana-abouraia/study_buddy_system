import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';
import { countUnreadNotifications } from '../../utils/notifications';
import styles from './DashboardLayout.module.css';
// Custom SVG icon components - all black, no background
const DashboardIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "3", y: "3", width: "7", height: "7" }), _jsx("rect", { x: "14", y: "3", width: "7", height: "7" }), _jsx("rect", { x: "14", y: "14", width: "7", height: "7" }), _jsx("rect", { x: "3", y: "14", width: "7", height: "7" })] }));
const FindBuddiesIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] }));
const ConnectionsIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" }), _jsx("path", { d: "M17 3.5a4 4 0 0 1 0 7" })] }));
const StudySessionsIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), _jsx("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), _jsx("line", { x1: "3", y1: "10", x2: "21", y2: "10" }), _jsx("path", { d: "M8 14h.01" }), _jsx("path", { d: "M12 14h.01" }), _jsx("path", { d: "M16 14h.01" }), _jsx("path", { d: "M8 18h.01" }), _jsx("path", { d: "M12 18h.01" }), _jsx("path", { d: "M16 18h.01" })] }));
const AvailabilityIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }));
const NotificationsIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), _jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })] }));
const MessagesIcon = () => (_jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) }));
const ProfileIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" })] }));
const SearchIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }));
const BellIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), _jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })] }));
const LogoutIcon = () => (_jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), _jsx("polyline", { points: "16 17 21 12 16 7" }), _jsx("line", { x1: "21", y1: "12", x2: "9", y2: "12" })] }));
const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { to: '/find-buddies', label: 'Find Buddies', icon: FindBuddiesIcon },
    { to: '/my-connections', label: 'My Connections', icon: ConnectionsIcon },
    { to: '/study-sessions', label: 'Study Sessions', icon: StudySessionsIcon },
    { to: '/availability', label: 'Availability', icon: AvailabilityIcon },
    { to: '/notifications', label: 'Notifications', icon: NotificationsIcon },
    { to: '/messages', label: 'Messages', icon: MessagesIcon },
    { to: '/profile', label: 'Profile', icon: ProfileIcon },
];
const GET_NOTIFICATION_BADGE = gql `
  query NotificationBadge {
    myNotifications(limit: 100) {
      id
      type
      title
      message
      isRead
      createdAt
    }
    unreadNotificationsCount
  }
`;
export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
    const isMessagesPage = location.pathname === '/messages';
    const searchParams = new URLSearchParams(location.search);
    const searchValue = searchParams.get('search') ?? '';
    const { data: notificationBadgeData } = useQuery(GET_NOTIFICATION_BADGE, {
        fetchPolicy: 'cache-and-network',
        pollInterval: 30000,
    });
    const unreadCount = notificationBadgeData?.myNotifications
        ? countUnreadNotifications(notificationBadgeData.myNotifications)
        : notificationBadgeData?.unreadNotificationsCount ?? 0;
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    const handleNotificationClick = () => {
        navigate('/notifications');
    };
    const handleSearch = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const query = String(formData.get('dashboardSearch') ?? '').trim();
        navigate(query ? `/dashboard?search=${encodeURIComponent(query)}` : '/dashboard');
    };
    return (_jsxs("div", { className: styles.page, children: [_jsxs("aside", { className: styles.sidebar, children: [_jsxs("div", { className: styles.brandSection, children: [_jsx("img", { src: logo, alt: "HiveMind logo", className: styles.brandLogo }), _jsxs("div", { children: [_jsx("p", { className: styles.brandTitle, children: "HiveMind" }), _jsx("p", { className: styles.brandSubtitle, children: "Study dashboard" })] })] }), _jsx("nav", { className: styles.navList, children: navItems.map((item) => (_jsxs(NavLink, { to: item.to, className: ({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`, children: [_jsx("span", { className: styles.navIcon, children: _jsx(item.icon, {}) }), _jsx("span", { children: item.label })] }, item.to))) })] }), _jsxs("main", { className: `${styles.mainContent} ${isMessagesPage ? styles.messagesMain : ''}`, children: [!isMessagesPage ? (_jsxs("div", { className: styles.topBar, children: [_jsxs("form", { className: styles.searchBar, onSubmit: handleSearch, children: [_jsx("span", { className: styles.searchIcon, children: _jsx(SearchIcon, {}) }), _jsx("input", { name: "dashboardSearch", type: "search", placeholder: "Search study buddies, sessions...", defaultValue: searchValue }, searchValue)] }), _jsxs("div", { className: styles.topActions, children: [_jsxs("button", { className: styles.notificationButton, type: "button", onClick: handleNotificationClick, children: [_jsx(BellIcon, {}), unreadCount > 0 && (_jsx("span", { className: styles.notificationBadge, children: unreadCount > 99 ? '99+' : unreadCount }))] }), _jsxs("button", { className: styles.logoutButton, onClick: handleLogout, type: "button", children: [_jsx("div", { className: styles.logoutAvatar, children: initials || '??' }), _jsxs("div", { className: styles.logoutInfo, children: [_jsxs("p", { className: styles.logoutName, children: [user?.firstName, " ", user?.lastName] }), _jsx("p", { className: styles.logoutEmail, children: user?.email })] }), _jsx("div", { className: styles.logoutIcon, children: _jsx(LogoutIcon, {}) })] })] })] })) : null, _jsx("div", { className: `${styles.pageBody} ${isMessagesPage ? styles.messagesBody : ''}`, children: _jsx(Outlet, {}) })] })] }));
}
