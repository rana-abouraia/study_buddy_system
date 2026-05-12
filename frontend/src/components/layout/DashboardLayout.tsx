import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { gql, useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';
import type { NotificationBadgeData } from '../../types';
import { countUnreadNotifications, isConnectedMatchNotification, isSelfMatchNotification } from '../../utils/notifications';
import styles from '../../styles/components/layout/DashboardLayout.module.css';

// Custom SVG icon components - all black, no background
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const FindBuddiesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ConnectionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <path d="M17 3.5a4 4 0 0 1 0 7" />
  </svg>
);

const StudySessionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>
);

const AvailabilityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const NotificationsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const MessagesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

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

const GET_NOTIFICATION_BADGE = gql`
  query NotificationBadge {
    myNotifications(limit: 100) {
      id
      type
      title
      message
      isRead
      createdAt
    }
    getMyBuddies
    getAllUsers {
      id
      firstName
      lastName
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

  const { data: notificationBadgeData } = useQuery<NotificationBadgeData>(GET_NOTIFICATION_BADGE, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
  });

  const badgeNotifications = notificationBadgeData?.myNotifications ?? [];
  const badgeUsersById = new Map(
    (notificationBadgeData?.getAllUsers ?? []).map((badgeUser) => [
      badgeUser.id,
      badgeUser,
    ])
  );
  const unreadCount = notificationBadgeData?.myNotifications
    ? countUnreadNotifications(
      badgeNotifications.filter(
        (notification) => (
          !isSelfMatchNotification(notification, user) &&
          !isConnectedMatchNotification(notification, notificationBadgeData?.getMyBuddies ?? [], badgeUsersById)
        )
      )
    )
    : notificationBadgeData?.unreadNotificationsCount ?? 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get('dashboardSearch') ?? '').trim();
    navigate(query ? `/dashboard?search=${encodeURIComponent(query)}` : '/dashboard');
  };

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brandSection}>
          <img src={logo} alt="HiveMind logo" className={styles.brandLogo} />
          <div>
            <p className={styles.brandTitle}>HiveMind</p>
            <p className={styles.brandSubtitle}>Study dashboard</p>
          </div>
        </div>

        <nav className={styles.navList}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <span className={styles.navIcon}>
                <item.icon />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className={`${styles.mainContent} ${isMessagesPage ? styles.messagesMain : ''}`}>
        {!isMessagesPage ? (
          <div className={styles.topBar}>
            <form className={styles.searchBar} onSubmit={handleSearch}>
              <span className={styles.searchIcon}>
                <SearchIcon />
              </span>
              <input
                key={searchValue}
                name="dashboardSearch"
                type="search"
                placeholder="Search study buddies, sessions..."
                defaultValue={searchValue}
              />
            </form>
            <div className={styles.topActions}>
              <button
                className={styles.notificationButton}
                type="button"
                onClick={handleNotificationClick}
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <button
                className={styles.logoutButton}
                onClick={handleLogout}
                type="button"
              >
                <div className={styles.logoutAvatar}>
                  {initials || '??'}
                </div>
                <div className={styles.logoutInfo}>
                  <p className={styles.logoutName}>{user?.firstName} {user?.lastName}</p>
                  <p className={styles.logoutEmail}>{user?.email}</p>
                </div>
                <div className={styles.logoutIcon}>
                  <LogoutIcon />
                </div>
              </button>
            </div>
          </div>
        ) : null}
        <div className={`${styles.pageBody} ${isMessagesPage ? styles.messagesBody : ''}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
