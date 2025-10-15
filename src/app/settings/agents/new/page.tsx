'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSave,
  faSpinner,
  faExclamationTriangle,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { Role } from '@prisma/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { UserApi, User } from '@/lib/api/apiService';

// Form data type for agent creation
type NewAgentFormData = {
  username: string;
  password?: string;
  confirmPassword?: string;
  name: string;
  email: string;
  role: string;
  managerId: string;
};

export default function NewAgentPage() {
  const router = useRouter();
  const { user: currentAuthedUser } = useAuth();
  const [allAgents, setAllAgents] = useState<User[]>([]); // For manager dropdown
  const [formData, setFormData] = useState<NewAgentFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: Role.SALES, // Default role
    managerId: '',
  });
  const [loading, setLoading] = useState(false); // For form submission
  const [pageLoading, setPageLoading] = useState(true); // For fetching initial data like managers
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Helper function (can be moved to a shared utils file later)
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case Role.ADMIN:
        return 'Administrator';
      case Role.OFFICE_MANAGER:
        return 'Manager';
      case Role.SALES_LEAD:
        return 'Sales Lead';
      case Role.SERVICE_LEAD:
        return 'Service Lead';
      case Role.SALES:
        return 'Sales Agent';
      case Role.SERVICE:
        return 'Service Agent';
      default:
        return role;
    }
  };

  useEffect(() => {
    // Restrict access if not admin
    if (currentAuthedUser?.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }

    const fetchManagers = async () => {
      setPageLoading(true);
      try {
        const allUsersData = await UserApi.getUsers();
        setAllAgents(allUsersData);
      } catch (err: any) {
        setError(err.message || 'Error loading manager data.');
        console.error(err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchManagers();
  }, [currentAuthedUser, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const getPotentialManagers = (agentRole: string) => {
    return allAgents.filter((potentialManager) => {
      switch (agentRole) {
        case Role.SALES:
          return potentialManager.role === Role.SALES_LEAD;
        case Role.SERVICE:
          return potentialManager.role === Role.SERVICE_LEAD;
        case Role.SALES_LEAD:
        case Role.SERVICE_LEAD:
          return potentialManager.role === 'OFFICE_MANAGER' || potentialManager.role === Role.ADMIN;
        case 'OFFICE_MANAGER':
          return potentialManager.role === Role.ADMIN;
        default:
          return false;
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.password || formData.password !== formData.confirmPassword) {
      setError('Passwords do not match or password is empty.');
      return;
    }
    if (!formData.username.trim() || !formData.name.trim()) {
      setError('Username and Full Name are required.');
      return;
    }

    setLoading(true);
    try {
      await UserApi.createUser({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        email: formData.email || undefined,
        role: formData.role,
        managerId: formData.managerId ? parseInt(formData.managerId) : undefined,
      });

      setSuccessMessage('Agent created successfully! Redirecting...');
      // Clear form or redirect
      setTimeout(() => {
        router.push('/settings/users'); // Redirect to agent list page
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred during agent creation.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading && !currentAuthedUser) {
    // Wait for auth context
    return (
      <div className="page-loading-container">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading...</p>
      </div>
    );
  }

  if (currentAuthedUser?.role !== Role.ADMIN) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="new-agent-page-container">
      <div className="page-header">
        <button onClick={() => router.push('/settings/users')} className="btn-back-icon">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1>
          <FontAwesomeIcon icon={faUserPlus} /> Create New Agent
        </h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
          <button onClick={() => setError('')} className="close-alert">
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <FontAwesomeIcon icon={faUserPlus} /> {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="agent-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="(Optional)"
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              {Object.values(Role).map((roleValue) => (
                <option key={roleValue} value={roleValue}>
                  {getRoleDisplayName(roleValue)}
                </option>
              ))}
            </select>
          </div>
          {formData.role !== Role.ADMIN && (
            <div className="form-group">
              <label htmlFor="managerId">Manager</label>
              <select
                id="managerId"
                name="managerId"
                value={formData.managerId}
                onChange={handleInputChange}
              >
                <option value="">Select a manager (optional)</option>
                {getPotentialManagers(formData.role).map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({getRoleDisplayName(manager.role)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => router.push('/settings/users')}
            className="btn-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={loading || pageLoading}>
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Creating...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} /> Create Agent
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
