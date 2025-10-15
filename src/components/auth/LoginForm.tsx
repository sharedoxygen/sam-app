'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faExclamationTriangle,
  faUser,
  faLock,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './LoginForm.module.css';

/**
 * LoginForm component that handles user authentication
 * Supports demo login with agent/password or admin/admin credentials
 */
export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the auth context to login with credentials directly
      const result = await login(username.toLowerCase(), password);

      if (result.ok) {
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        // Use error from NextAuth/CredentialsProvider if available, otherwise a generic one
        setError(result.error || 'Invalid username or password');
      }
    } catch (err: any) {
      // Catch any unexpected errors from the login process itself
      console.error('Login submission error:', err);
      setError(err.message || 'An unexpected error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.errorMessage}>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.label}>
            Username
          </label>
          <div className={styles.inputContainer}>
            <span className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faUser} />
            </span>
            <input
              type="text"
              id="username"
              className={styles.input}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputContainer}>
            <span className={styles.iconWrapper}>
              <FontAwesomeIcon icon={faLock} />
            </span>
            <input
              type="password"
              id="password"
              className={styles.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin />
              <span>Signing in...</span>
            </>
          ) : (
            'Sign In'
          )}
        </button>

        <div className={styles.footer}>
          <small>&copy; {new Date().getFullYear()} Sales Activity Manager</small>
        </div>
      </form>
    </div>
  );
}
