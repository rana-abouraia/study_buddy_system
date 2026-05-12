import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/images/logo.png';
import styles from '../../styles/components/layout/Navbar.module.css';
export default function Navbar() {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate('/');
    };
    return (_jsxs("nav", { className: styles.nav, children: [_jsxs(Link, { to: "/", className: styles.logo, children: [_jsx("img", { src: logo, alt: "HiveMind Logo", className: styles.logoImage }), "HiveMind"] }), _jsx("div", { className: styles.actions, children: isAuthenticated ? (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/dashboard", className: styles.dashboardBtn, children: "Dashboard" }), _jsx("button", { className: styles.logoutBtn, onClick: handleLogout, children: "Log Out" })] })) : (_jsxs(_Fragment, { children: [_jsx(Link, { to: "/login", className: styles.loginBtn, children: "LOG IN" }), _jsx(Link, { to: "/register", className: styles.signupBtn, children: "Sign Up" })] })) })] }));
}
