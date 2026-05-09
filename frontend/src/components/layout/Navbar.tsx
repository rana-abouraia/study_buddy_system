import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={styles.nav}>
      {/* Logo with image */}
      <Link to="/" className={styles.logo}>
        <img src={logo} alt="HiveMind Logo" className={styles.logoImage} />
        HiveMind
      </Link>

      {/* Actions */}
      <div className={styles.actions}>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className={styles.dashboardBtn}>Dashboard</Link>
            <button className={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.loginBtn}>LOG IN</Link>
            <Link to="/register" className={styles.signupBtn}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}