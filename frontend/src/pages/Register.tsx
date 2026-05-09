import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { REGISTER_MUTATION } from '../graphql/mutations';
import { useAuth } from '../context/AuthContext';
import { AuthPayload } from '../types';
import styles from './Register.module.css';

import hiveLogo from '../assets/images/logo.png';

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  university: string;
  academicYear: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  university?: string;
  academicYear?: string;
  general?: string;
}

const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;
  
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

  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    academicYear: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const [registerMutation, { loading }] = useMutation<{ register: AuthPayload }>(
    REGISTER_MUTATION,
    {
      onCompleted: (data) => {
        login(data.register.token, data.register.user);
        navigate('/onboarding/profile');
      },
      onError: (err) => {
        setErrors({ general: err.message || 'Registration failed. Please try again.' });
      },
    }
  );

  const passwordStrength = getPasswordStrength(form.password);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.fullName) newErrors.fullName = 'Full name is required.';
    if (!form.email) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email.';
    
    if (!form.password) newErrors.password = 'Password is required.';
    else if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    
    if (!form.university) newErrors.university = 'University is required.';
    if (!form.academicYear) newErrors.academicYear = 'Academic year is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <img src={hiveLogo} alt="HiveMind" width={32} height={32} />
          </div>
          <span className={styles.logoText}>HiveMind</span>
        </Link>

        <h2 className={styles.title}>Create your account</h2>
        <p className={styles.subtitle}>Join thousands of students finding their perfect study partners</p>

        {errors.general && (
          <div className={styles.errorBanner}>{errors.general}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Full Name</label>
            <input
              name="fullName"
              type="text"
              placeholder="John Doe"
              value={form.fullName}
              onChange={handleChange}
              className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
            />
            {errors.fullName && <span className={styles.errorMsg}>{errors.fullName}</span>}
          </div>

          {/* Email */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Email</label>
            <input
              name="email"
              type="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={handleChange}
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            />
            {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
          </div>

          {/* Password & Confirm Password - 2 columns */}
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Password</label>
              <input
                name="password"
                type="password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              />
              {errors.password && <span className={styles.errorMsg}>{errors.password}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              />
              {errors.confirmPassword && <span className={styles.errorMsg}>{errors.confirmPassword}</span>}
            </div>
          </div>

          {/* Password Strength Bar */}
          {form.password && (
            <div className={styles.strengthContainer}>
              <div className={styles.strengthBar}>
                <div 
                  className={styles.strengthFill} 
                  style={{ 
                    width: `${(passwordStrength.level / 4) * 100}%`,
                    backgroundColor: passwordStrength.color
                  }} 
                />
              </div>
              <div className={styles.strengthLabel}>
                <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                <span>password</span>
              </div>
            </div>
          )}

          {/* University & Academic Year - 2 columns */}
          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>University</label>
              <input
                name="university"
                type="text"
                placeholder="Your university"
                value={form.university}
                onChange={handleChange}
                className={`${styles.input} ${errors.university ? styles.inputError : ''}`}
              />
              {errors.university && <span className={styles.errorMsg}>{errors.university}</span>}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Academic Year</label>
              <select
                name="academicYear"
                value={form.academicYear}
                onChange={handleChange}
                className={`${styles.select} ${errors.academicYear ? styles.inputError : ''}`}
              >
                <option value="">Select year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Graduate">Graduate</option>
              </select>
              {errors.academicYear && <span className={styles.errorMsg}>{errors.academicYear}</span>}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className={styles.termsText}>
            By creating an account, you agree to our{' '}
            <a href="#">Terms of Service</a> and{' '}
            <a href="#">Privacy Policy</a>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <Spinner /> : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.switchLink}>Log in</Link>
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return <span className={styles.spinner} />;
}