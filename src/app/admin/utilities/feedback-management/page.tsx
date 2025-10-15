'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots,
  faExclamationTriangle,
  faLightbulb,
  faComment,
} from '@fortawesome/free-solid-svg-icons';
import styles from './page.module.css';

interface FeedbackItem {
  id: number;
  name: string;
  pageTitle: string;
  type: 'ENHANCEMENT' | 'BUG' | 'GENERAL';
  description: string;
  status: 'OPEN' | 'CLOSED' | 'REVIEW' | 'IMPLEMENTED' | 'IN_PROGRESS';
  createdAt: string;
  User?: {
    name: string;
    role: string;
  };
}

interface FeedbackResponse {
  feedback: FeedbackItem[];
  pagination: {
    page: number;
    total: number;
    pages: number;
  };
}

// Safe data access helper functions
const safeGetProperty = (obj: any, path: string, defaultValue: any = '') => {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

const isValidFeedbackItem = (item: any): item is FeedbackItem => {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    typeof item.pageTitle === 'string' &&
    typeof item.description === 'string' &&
    typeof item.createdAt === 'string' &&
    ['ENHANCEMENT', 'BUG', 'GENERAL'].includes(item.type) &&
    ['OPEN', 'CLOSED', 'REVIEW', 'IMPLEMENTED', 'IN_PROGRESS'].includes(item.status)
  );
};

function FeedbackManagementContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Handle authentication check
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    if (!user || user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }

    setAuthChecked(true);
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authChecked && user?.role === 'ADMIN') {
      fetchFeedback();
    }
  }, [authChecked, user]);

  // Show loading while auth is being checked
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

  // This should not render if user is not admin (due to useEffect redirect above)
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/feedback');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: FeedbackResponse = await response.json();

      // Safely process the feedback data
      const validFeedback = Array.isArray(data?.feedback)
        ? data.feedback.filter(isValidFeedbackItem)
        : [];

      setFeedback(validFeedback);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load feedback';
      setError(`Failed to load feedback: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (feedbackId: number, newStatus: string) => {
    try {
      setUpdatingStatus(feedbackId);
      setError(null);

      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Update local state with the updated feedback
      setFeedback((prev) =>
        prev.map((item) => (item.id === feedbackId ? { ...item, status: newStatus as any } : item))
      );
    } catch (err) {
      console.error('Error updating status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(`Failed to update feedback status: ${errorMessage}`);

      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'BUG':
        return faExclamationTriangle;
      case 'ENHANCEMENT':
        return faLightbulb;
      default:
        return faComment;
    }
  };

  const renderFeedbackRow = (item: FeedbackItem) => {
    const userName = safeGetProperty(item, 'User.name', 'Unknown User');
    const userRole = safeGetProperty(item, 'User.role', 'Unknown Role');
    const feedbackType = item.type || 'GENERAL';
    const feedbackStatus = item.status || 'OPEN';
    const createdDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : 'Unknown Date';

    return (
      <tr key={item.id}>
        <td className={styles.dateCell}>{createdDate}</td>
        <td>
          <span
            className={`${styles.typeCell} ${styles[`type${feedbackType.charAt(0) + feedbackType.slice(1).toLowerCase()}`] || styles.typeGeneral}`}
          >
            <FontAwesomeIcon icon={getFeedbackIcon(feedbackType)} className="me-2" />
            {feedbackType}
          </span>
        </td>
        <td>
          <div className={styles.userCell}>
            <strong>{userName}</strong>
            <br />
            <small className="text-muted">{userRole}</small>
          </div>
        </td>
        <td className={styles.pageCell}>{item.pageTitle || 'Unknown Page'}</td>
        <td className={styles.statusCell}>
          <select
            value={feedbackStatus}
            onChange={(e) => updateStatus(item.id, e.target.value)}
            disabled={updatingStatus === item.id}
            className={styles.statusSelect}
          >
            <option value="OPEN">Open</option>
            <option value="REVIEW">Review</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IMPLEMENTED">Implemented</option>
            <option value="CLOSED">Closed</option>
          </select>
        </td>
        <td className={styles.descriptionCell}>{item.description || 'No description'}</td>
      </tr>
    );
  };

  if (loading) return <div className="container py-4">Loading...</div>;
  if (error) return <div className="container py-4 text-danger">Error: {error}</div>;

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-4">
        <FontAwesomeIcon icon={faCommentDots} className={`me-3 ${styles.headerIcon}`} />
        <div>
          <h1 className="mb-1">Feedback Management</h1>
          <p className="text-muted mb-0">View and manage user feedback submissions</p>
        </div>
      </div>

      {feedback.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <FontAwesomeIcon icon={faCommentDots} size="3x" className="mb-3" />
          <p>No feedback submissions yet.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>User</th>
                <th>Page</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>{feedback.map(renderFeedbackRow)}</tbody>
          </table>
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
    console.error('Feedback Management Error:', error, errorInfo);
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
              There was an error loading the feedback management page. Please try refreshing the
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
export default function FeedbackManagement() {
  return (
    <ErrorBoundary>
      <FeedbackManagementContent />
    </ErrorBoundary>
  );
}
