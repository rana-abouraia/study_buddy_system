import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';
import styles from './DashboardLayout.module.css';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/find-buddies', label: 'Find Buddies', icon: '🔍' },
  { to: '/my-connections', label: 'My Connections', icon: '👥' },
  { to: '/study-sessions', label: 'Study Sessions', icon: '📅' },
  { to: '/availability', label: 'Availability', icon: '⏰' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/messages', label: 'Messages', icon: '💬' },
  { to: '/profile', label: 'Profile', icon: '🙍' },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <p className={styles.footerLabel}>Log Out</p>
          <div
            className={styles.profileSummary}
            role="button"
            tabIndex={0}
            onClick={handleLogout}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                handleLogout();
              }
            }}
          >
            <div className={styles.profileAvatar}>{initials || '??'}</div>
            <div>
              <p className={styles.profileName}>{user?.firstName} {user?.lastName}</p>
              <p className={styles.profileDetail}>{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <div className={styles.searchBar}>
            <span className={styles.searchIcon}>🔎</span>
            <input type="search" placeholder="Search study buddies, sessions..." />
          </div>
          <div className={styles.topActions}>
            <button className={styles.notificationButton} type="button">
              🔔
            </button>
            <div className={styles.profileCard}>
              <div className={styles.avatarCircle}>{initials || '??'}</div>
              <div>
                <p className={styles.userName}>{user?.firstName} {user?.lastName}</p>
                <p className={styles.userEmail}>{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.pageBody}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
