'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullhorn,
  faPlus,
  faUsers,
  faExclamationTriangle,
  faLightbulb,
  faInfoCircle,
  faCog,
  faServer,
  faTimes,
  faSave,
  faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';
import styles from './page.module.css';

interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: 'MAINTENANCE' | 'FEATURE' | 'UPDATE' | 'ANNOUNCEMENT' | 'ALERT' | 'GENERAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetRoles: string[];
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  readCount?: number;
  totalUsers?: number;
  readPercentage?: number;
}

interface CreateNotificationForm {
  title: string;
  message: string;
  type: 'MAINTENANCE' | 'FEATURE' | 'UPDATE' | 'ANNOUNCEMENT' | 'ALERT' | 'GENERAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetRoles: string[];
  expiresAt: string;
}

function SystemNotificationsContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateNotificationForm>({
    title: '',
    message: '',
    type: 'GENERAL',
    priority: 'NORMAL',
    targetRoles: [],
    expiresAt: '',
  });

  // Handle authentication check
  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }

    setAuthChecked(true);
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authChecked && user?.role === 'ADMIN') {
      fetchNotifications();
    }
  }, [authChecked, user]);

  if (authLoading || !authChecked) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notifications?admin=true');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create notification');
      }

      // Reset form and refresh list
      setFormData({
        title: '',
        message: '',
        type: 'GENERAL',
        priority: 'NORMAL',
        targetRoles: [],
        expiresAt: '',
      });
      setShowCreateForm(false);
      await fetchNotifications();
    } catch (err) {
      console.error('Error creating notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to create notification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (field: keyof CreateNotificationForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MAINTENANCE':
        return faServer;
      case 'FEATURE':
        return faLightbulb;
      case 'UPDATE':
        return faCog;
      case 'ANNOUNCEMENT':
        return faBullhorn;
      case 'ALERT':
        return faExclamationTriangle;
      default:
        return faInfoCircle;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const availableRoles = [
    'ADMIN',
    'OFFICE_MANAGER',
    'SALES_LEAD',
    'SERVICE_LEAD',
    'SALES',
    'SERVICE',
  ];

  if (loading) return <div className="container py-4">Loading...</div>;

  return (
    <div className="container py-4">
      <div className={styles.header}>
        <div className="d-flex align-items-center">
          <FontAwesomeIcon icon={faBullhorn} className={`me-3 ${styles.headerIcon}`} />
          <div>
            <h1 className="mb-1">System Notifications</h1>
            <p className="text-muted mb-0">Broadcast announcements and alerts to users</p>
          </div>
        </div>
        <button
          className={`btn btn-primary ${styles.createBtn}`}
          onClick={() => setShowCreateForm(true)}
        >
          <FontAwesomeIcon icon={faPlus} className="me-2" />
          New Notification
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
          <button
            className="btn-close ms-auto"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Create Notification Modal */}
      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Create System Notification</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateForm(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className={styles.modalBody}>
              <div className="mb-3">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="Notification title..."
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Message *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => handleFormChange('message', e.target.value)}
                  placeholder="Notification message..."
                  required
                />
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                  >
                    <option value="GENERAL">General</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="FEATURE">New Feature</option>
                    <option value="UPDATE">System Update</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="ALERT">Alert</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => handleFormChange('priority', e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Target Roles (leave empty for all users)</label>
                <div className={styles.roleCheckboxes}>
                  {availableRoles.map((role) => (
                    <div key={role} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`role-${role}`}
                        checked={formData.targetRoles.includes(role)}
                        onChange={() => handleRoleToggle(role)}
                      />
                      <label className="form-check-label" htmlFor={`role-${role}`}>
                        {role.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={formData.expiresAt}
                  onChange={(e) => handleFormChange('expiresAt', e.target.value)}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary me-2"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} className="me-2" />
                      Create Notification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faBullhorn} size="3x" className="mb-3 text-muted" />
          <h3>No notifications yet</h3>
          <p className="text-muted">
            Create your first system notification to communicate with users.
          </p>
        </div>
      ) : (
        <div className={styles.notificationsList}>
          {notifications.map((notification) => (
            <div key={notification.id} className={styles.notificationCard}>
              <div className={styles.cardHeader}>
                <div className={styles.notificationInfo}>
                  <div className={styles.titleRow}>
                    <FontAwesomeIcon
                      icon={getNotificationIcon(notification.type)}
                      className={`${styles.typeIcon} ${styles[notification.priority.toLowerCase()]}`}
                    />
                    <h4>{notification.title}</h4>
                    <span
                      className={`${styles.priorityBadge} ${styles[notification.priority.toLowerCase()]}`}
                    >
                      {notification.priority}
                    </span>
                  </div>
                  <div className={styles.metadata}>
                    <span className={styles.type}>{notification.type}</span>
                    <span className={styles.created}>
                      Created: {formatDate(notification.createdAt)}
                    </span>
                    {notification.expiresAt && (
                      <span className={styles.expires}>
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                        Expires: {formatDate(notification.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.readStats}>
                  <div className={styles.readCount}>
                    <FontAwesomeIcon icon={faUsers} />
                    <span>
                      {notification.readCount || 0} / {notification.totalUsers || 0} read
                    </span>
                  </div>
                  <div className={styles.readPercentage}>{notification.readPercentage || 0}%</div>
                </div>
              </div>

              <div className={styles.cardBody}>
                <p>{notification.message}</p>

                {notification.targetRoles && notification.targetRoles.length > 0 && (
                  <div className={styles.targetRoles}>
                    <strong>Target Roles:</strong>
                    {notification.targetRoles.map((role) => (
                      <span key={role} className={styles.roleBadge}>
                        {role.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('System Notifications Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-4">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              Something went wrong
            </h4>
            <p>
              There was an error loading the system notifications page. Please try refreshing the
              page.
            </p>
            <hr />
            <button className="btn btn-outline-danger" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main Export with Error Boundary
export default function SystemNotifications() {
  return (
    <ErrorBoundary>
      <SystemNotificationsContent />
    </ErrorBoundary>
  );
}
