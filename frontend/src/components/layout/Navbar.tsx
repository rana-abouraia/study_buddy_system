import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
      {/* Logo */}
      <Link to="/" className={styles.logo}>
        <div className={styles.logoIcon}>
          <BrainIcon />
        </div>
        HiveMind
      </Link>

      {/* Actions */}
      <div className={styles.actions}>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="btn-ghost">Dashboard</Link>
            <button className="btn-ghost" onClick={handleLogout}>Log Out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost">LOG IN</Link>
            <Link to="/register" className="btn-pill">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function BrainIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M13 3c-4.42 0-8 3.58-8 8H3l3.89 3.89.07.14L11 11H9c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4c-1.1 0-2.1-.45-2.83-1.17L8.7 15.3C9.84 16.36 11.34 17 13 17c3.31 0 6-2.69 6-6s-2.69-6-6-6zm-1 9v-4l-1.5 1.5-1.06-1.06L12 5.88l2.56 2.56L13.5 9.5 12 8v4h-0z"/>
    </svg>
  );
}
