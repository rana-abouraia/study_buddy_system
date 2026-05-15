import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/Login.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { LOGIN_MUTATION } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/pages/Login.module.css';
import brainImage from '../assets/images/login.png';
import hiveLogo from '../assets/images/logo.png';
export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loginMutation, { loading }] = useMutation(LOGIN_MUTATION, {
        onCompleted: (data) => {
            login(data.login.token, data.login.user);
            navigate('/dashboard');
        },
        onError: (err) => {
            setErrors({ general: err.message || 'Invalid email or password.' });
        },
    });
    const validate = () => {
        const newErrors = {};
        if (!form.email)
            newErrors.email = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(form.email))
            newErrors.email = 'Enter a valid email.';
        if (!form.password)
            newErrors.password = 'Password is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate())
            return;
        setErrors({});
        loginMutation({ variables: { email: form.email, password: form.password } });
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        const fieldName = name;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[fieldName]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    };
    return (_jsxs("div", { className: styles.container, children: [_jsxs("div", { className: styles.leftPanel, children: [_jsx("img", { src: brainImage, alt: "HiveMind Brain", className: styles.brainImage }), _jsx("h2", { className: styles.welcomeTitle, children: "Welcome Back to HiveMind" }), _jsx("p", { className: styles.welcomeText, children: "Connect with your study partners and achieve your academic goals together." })] }), _jsx("div", { className: styles.rightPanel, children: _jsxs("div", { className: styles.formContainer, children: [_jsxs(Link, { to: "/", className: styles.logoLink, children: [_jsx("div", { className: styles.logoIcon, children: _jsx("img", { src: hiveLogo, alt: "HiveMind" }) }), _jsxs("span", { className: styles.logoText, children: [_jsx("span", { className: styles.hive, children: "Hive" }), _jsx("span", { className: styles.mind, children: "Mind" })] })] }), _jsx("h2", { className: styles.formTitle, children: "Log in to your account" }), _jsx("p", { className: styles.formSubtitle, children: "Welcome back! Please enter your details." }), errors.general && (_jsx("div", { className: styles.errorBanner, children: errors.general })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { htmlFor: "email", className: styles.label, children: "Email" }), _jsx("input", { id: "email", name: "email", type: "email", placeholder: "you@university.edu", value: form.email, onChange: handleChange, className: `${styles.input} ${errors.email ? styles.inputError : ''}` }), errors.email && _jsx("span", { className: styles.errorMsg, children: errors.email })] }), _jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { htmlFor: "password", className: styles.label, children: "Password" }), _jsx("input", { id: "password", name: "password", type: "password", placeholder: "Enter your password", value: form.password, onChange: handleChange, className: `${styles.input} ${errors.password ? styles.inputError : ''}` }), errors.password && _jsx("span", { className: styles.errorMsg, children: errors.password })] }), _jsx("div", { className: styles.forgotRow, children: _jsx("a", { href: "#", className: styles.forgotLink, children: "Forgot password?" }) }), _jsx("button", { type: "submit", className: styles.loginBtn, disabled: loading, children: loading ? _jsx(Spinner, {}) : 'LOGIN' })] }), _jsx("div", { className: styles.divider, children: _jsx("span", { children: "or" }) }), _jsxs("p", { className: styles.registerText, children: ["Don't have an account?", ' ', _jsx(Link, { to: "/register", className: styles.registerLink, children: "Create a new account" })] })] }) })] }));
}
function Spinner() {
    return _jsx("span", { className: styles.spinner });
}
