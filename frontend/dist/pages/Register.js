import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { REGISTER_MUTATION } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import styles from './Register.module.css';
import hiveLogo from '../assets/images/logo.png';
const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6)
        strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/))
        strength++;
    if (password.match(/[0-9]/))
        strength++;
    if (password.match(/[^a-zA-Z0-9]/))
        strength++;
    switch (strength) {
        case 0: return { level: 0, label: 'Empty', color: '#E8E0D0' };
        case 1: return { level: 1, label: 'Weak', color: '#E11D48' };
        case 2: return { level: 2, label: 'Fair', color: '#F59E0B' };
        case 3: return { level: 3, label: 'Good', color: '#0891B2' };
        default: return { level: 4, label: 'Strong', color: '#16A34A' };
    }
};
export default function Register() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        university: '',
        academicYear: '',
    });
    const [errors, setErrors] = useState({});
    const [registerMutation, { loading }] = useMutation(REGISTER_MUTATION, {
        onCompleted: (data) => {
            login(data.register.token, data.register.user);
            navigate('/onboarding/profile');
        },
        onError: (err) => {
            setErrors({ general: err.message || 'Registration failed. Please try again.' });
        },
    });
    const passwordStrength = getPasswordStrength(form.password);
    const validate = () => {
        const newErrors = {};
        if (!form.fullName)
            newErrors.fullName = 'Full name is required.';
        if (!form.email)
            newErrors.email = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(form.email))
            newErrors.email = 'Enter a valid email.';
        if (!form.password)
            newErrors.password = 'Password is required.';
        else if (form.password.length < 6)
            newErrors.password = 'Password must be at least 6 characters.';
        if (!form.confirmPassword)
            newErrors.confirmPassword = 'Please confirm your password.';
        else if (form.password !== form.confirmPassword)
            newErrors.confirmPassword = 'Passwords do not match.';
        if (!form.university)
            newErrors.university = 'University is required.';
        if (!form.academicYear)
            newErrors.academicYear = 'Academic year is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate())
            return;
        setErrors({});
        // Split full name into first and last name
        const nameParts = form.fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        registerMutation({
            variables: {
                firstName,
                lastName,
                email: form.email,
                password: form.password,
                university: form.university,
                academicYear: form.academicYear,
            },
        });
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    };
    return (_jsx("div", { className: styles.container, children: _jsxs("div", { className: styles.card, children: [_jsxs(Link, { to: "/", className: styles.logo, children: [_jsx("div", { className: styles.logoIcon, children: _jsx("img", { src: hiveLogo, alt: "HiveMind", width: 32, height: 32 }) }), _jsx("span", { className: styles.logoText, children: "HiveMind" })] }), _jsx("h2", { className: styles.title, children: "Create your account" }), _jsx("p", { className: styles.subtitle, children: "Join thousands of students finding their perfect study partners" }), errors.general && (_jsx("div", { className: styles.errorBanner, children: errors.general })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { className: styles.label, children: "Full Name" }), _jsx("input", { name: "fullName", type: "text", placeholder: "John Doe", value: form.fullName, onChange: handleChange, className: `${styles.input} ${errors.fullName ? styles.inputError : ''}` }), errors.fullName && _jsx("span", { className: styles.errorMsg, children: errors.fullName })] }), _jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { className: styles.label, children: "Email" }), _jsx("input", { name: "email", type: "email", placeholder: "you@university.edu", value: form.email, onChange: handleChange, className: `${styles.input} ${errors.email ? styles.inputError : ''}` }), errors.email && _jsx("span", { className: styles.errorMsg, children: errors.email })] }), _jsxs("div", { className: styles.twoCol, children: [_jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { className: styles.label, children: "Password" }), _jsx("input", { name: "password", type: "password", placeholder: "Create a password", value: form.password, onChange: handleChange, className: `${styles.input} ${errors.password ? styles.inputError : ''}` }), errors.password && _jsx("span", { className: styles.errorMsg, children: errors.password })] }), _jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { className: styles.label, children: "Confirm Password" }), _jsx("input", { name: "confirmPassword", type: "password", placeholder: "Confirm your password", value: form.confirmPassword, onChange: handleChange, className: `${styles.input} ${errors.confirmPassword ? styles.inputError : ''}` }), errors.confirmPassword && _jsx("span", { className: styles.errorMsg, children: errors.confirmPassword })] })] }), form.password && (_jsxs("div", { className: styles.strengthContainer, children: [_jsx("div", { className: styles.strengthBar, children: _jsx("div", { className: styles.strengthFill, style: {
                                            width: `${(passwordStrength.level / 4) * 100}%`,
                                            backgroundColor: passwordStrength.color
                                        } }) }), _jsxs("div", { className: styles.strengthLabel, children: [_jsx("span", { style: { color: passwordStrength.color }, children: passwordStrength.label }), _jsx("span", { children: "password" })] })] })), _jsxs("div", { className: styles.twoCol, children: [_jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { className: styles.label, children: "University" }), _jsx("input", { name: "university", type: "text", placeholder: "Your university", value: form.university, onChange: handleChange, className: `${styles.input} ${errors.university ? styles.inputError : ''}` }), errors.university && _jsx("span", { className: styles.errorMsg, children: errors.university })] }), _jsxs("div", { className: styles.fieldGroup, children: [_jsx("label", { className: styles.label, children: "Academic Year" }), _jsxs("select", { name: "academicYear", value: form.academicYear, onChange: handleChange, className: `${styles.select} ${errors.academicYear ? styles.inputError : ''}`, children: [_jsx("option", { value: "", children: "Select year" }), _jsx("option", { value: "1st Year", children: "1st Year" }), _jsx("option", { value: "2nd Year", children: "2nd Year" }), _jsx("option", { value: "3rd Year", children: "3rd Year" }), _jsx("option", { value: "4th Year", children: "4th Year" }), _jsx("option", { value: "Graduate", children: "Graduate" })] }), errors.academicYear && _jsx("span", { className: styles.errorMsg, children: errors.academicYear })] })] }), _jsxs("div", { className: styles.termsText, children: ["By creating an account, you agree to our", ' ', _jsx("a", { href: "#", children: "Terms of Service" }), " and", ' ', _jsx("a", { href: "#", children: "Privacy Policy" })] }), _jsx("button", { type: "submit", className: styles.submitBtn, disabled: loading, children: loading ? _jsx(Spinner, {}) : 'CREATE ACCOUNT' })] }), _jsxs("p", { className: styles.switchText, children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", className: styles.switchLink, children: "Log in" })] })] }) }));
}
function Spinner() {
    return _jsx("span", { className: styles.spinner });
}
