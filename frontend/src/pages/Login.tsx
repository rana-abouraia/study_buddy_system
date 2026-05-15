// src/pages/Login.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { LOGIN_MUTATION } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import type { AuthPayload, LoginFormErrors, LoginFormState } from '../types';
import styles from '../styles/pages/Login.module.css';

import brainImage from '../assets/images/login.png';
import hiveLogo from '../assets/images/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState<LoginFormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});

  const [loginMutation, { loading }] = useMutation<{ login: AuthPayload }>(
    LOGIN_MUTATION,
    {
      onCompleted: (data) => {
        login(data.login.token, data.login.user);
        navigate('/dashboard');
      },
      onError: (err) => {
        setErrors({ general: err.message || 'Invalid email or password.' });
      },
    }
  );

  const validate = (): boolean => {
    const newErrors: LoginFormErrors = {};
    if (!form.email) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email.';
    if (!form.password) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    loginMutation({ variables: { email: form.email, password: form.password } });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof LoginFormState;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Panel - image fills available space, text pinned below */}
      <div className={styles.leftPanel}>
        <img src={brainImage} alt="HiveMind Brain" className={styles.brainImage} />
        <h2 className={styles.welcomeTitle}>Welcome Back to HiveMind</h2>
        <p className={styles.welcomeText}>
          Connect with your study partners and achieve your academic goals together.
        </p>
      </div>

      {/* Right Panel */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <Link to="/" className={styles.logoLink}>
            <div className={styles.logoIcon}>
              <img src={hiveLogo} alt="HiveMind" />
            </div>
            <span className={styles.logoText}>
              <span className={styles.hive}>Hive</span>
              <span className={styles.mind}>Mind</span>
            </span>
          </Link>

          <h2 className={styles.formTitle}>Log in to your account</h2>
          <p className={styles.formSubtitle}>Welcome back! Please enter your details.</p>

          {errors.general && (
            <div className={styles.errorBanner}>{errors.general}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label htmlFor="email" className={styles.label}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@university.edu"
                value={form.email}
                onChange={handleChange}
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              />
              {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="password" className={styles.label}>Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              />
              {errors.password && <span className={styles.errorMsg}>{errors.password}</span>}
            </div>

            <div className={styles.forgotRow}>
              <a href="#" className={styles.forgotLink}>Forgot password?</a>
            </div>

            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {loading ? <Spinner /> : 'LOGIN'}
            </button>
          </form>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <p className={styles.registerText}>
            Don't have an account?{' '}
            <Link to="/register" className={styles.registerLink}>Create a new account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}
