'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots,
  faExclamationTriangle,
  faLightbulb,
  faComment,
  faEdit,
  faTrash,
  faTimes,
  faSave,
  faPlus,
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
}

interface EditModalProps {
  feedback: FeedbackItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFeedback: Partial<FeedbackItem>) => void;
  isSaving: boolean;
}

function EditModal({ feedback, isOpen, onClose, onSave, isSaving }: EditModalProps) {
  const [formData, setFormData] = useState<{
    name: string;
    pageTitle: string;
    type: 'ENHANCEMENT' | 'BUG' | 'GENERAL';
    description: string;
  }>({
    name: '',
    pageTitle: '',
    type: 'GENERAL',
    description: '',
  });

  useEffect(() => {
    if (feedback) {
      setFormData({
        name: feedback.name,
        pageTitle: feedback.pageTitle,
        type: feedback.type,
        description: feedback.description,
      });
    }
  }, [feedback]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen || !feedback) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Edit Feedback</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label htmlFor="edit-name">Title</label>
            <input
              id="edit-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="edit-page">Page/Feature</label>
            <input
              id="edit-page"
              type="text"
              value={formData.pageTitle}
              onChange={(e) => setFormData({ ...formData, pageTitle: e.target.value })}
              required
              className={styles.formInput}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="edit-type">Type</label>
            <select
              id="edit-type"
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as typeof formData.type })
              }
              required
              className={styles.formSelect}
            >
              <option value="GENERAL">General Feedback</option>
              <option value="ENHANCEMENT">Enhancement Request</option>
              <option value="BUG">Bug Report</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className={styles.formTextarea}
            />
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className={styles.saveButton}>
              <FontAwesomeIcon icon={faSave} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Form state for creating new feedback
  const [newFeedback, setNewFeedback] = useState({
    name: '',
    pageTitle: '',
    type: 'GENERAL' as const,
    description: '',
  });

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const fetchMyFeedback = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feedback?my=true');
      if (!response.ok) throw new Error('Failed to fetch feedback');

      const data = await response.json();
      setFeedback(data.feedback || []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load your feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeedback),
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      // Reset form and refresh list
      setNewFeedback({ name: '', pageTitle: '', type: 'GENERAL', description: '' });
      setShowCreateForm(false);
      await fetchMyFeedback();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (updatedData: Partial<FeedbackItem>) => {
    if (!editingFeedback) return;

    setIsSaving(true);
    setError(null); // Clear any previous errors

    try {
      const response = await fetch(`/api/feedback/${editingFeedback.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        // Try to get detailed error message from API
        let errorMessage = 'Failed to update feedback';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing API error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      setEditingFeedback(null);
      await fetchMyFeedback();
    } catch (err) {
      console.error('Error updating feedback:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update feedback';
      setError(`Update failed: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (feedbackId: number) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    setIsDeleting(feedbackId);
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete feedback');

      await fetchMyFeedback();
    } catch (err) {
      console.error('Error deleting feedback:', err);
      setError('Failed to delete feedback');
    } finally {
      setIsDeleting(null);
    }
  };

  const getFeedbackIcon = (type: string) => {
    switch (type) {
      case 'ENHANCEMENT':
        return faLightbulb;
      case 'BUG':
        return faExclamationTriangle;
      default:
        return faComment;
    }
  };

  if (!user) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>
          <FontAwesomeIcon icon={faCommentDots} className={styles.headerIcon} />
          Feedback Center
        </h1>
        <p>Share your feedback and manage your submissions</p>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          {error}
          <button onClick={() => setError(null)} className={styles.closeAlert}>
            ×
          </button>
        </div>
      )}

      {/* Create New Feedback Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Submit New Feedback</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={styles.toggleButton}
          >
            <FontAwesomeIcon icon={showCreateForm ? faTimes : faPlus} />
            {showCreateForm ? 'Cancel' : 'New Feedback'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateSubmit} className={styles.feedbackForm}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Title *</label>
                <input
                  id="name"
                  type="text"
                  value={newFeedback.name}
                  onChange={(e) => setNewFeedback({ ...newFeedback, name: e.target.value })}
                  required
                  className={styles.formInput}
                  placeholder="Brief title for your feedback"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="pageTitle">Page/Feature *</label>
                <input
                  id="pageTitle"
                  type="text"
                  value={newFeedback.pageTitle}
                  onChange={(e) => setNewFeedback({ ...newFeedback, pageTitle: e.target.value })}
                  required
                  className={styles.formInput}
                  placeholder="Which page or feature?"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="type">Feedback Type *</label>
              <select
                id="type"
                value={newFeedback.type}
                onChange={(e) =>
                  setNewFeedback({
                    ...newFeedback,
                    type: e.target.value as typeof newFeedback.type,
                  })
                }
                required
                className={styles.formSelect}
              >
                <option value="GENERAL">General Feedback</option>
                <option value="ENHANCEMENT">Enhancement Request</option>
                <option value="BUG">Bug Report</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                value={newFeedback.description}
                onChange={(e) => setNewFeedback({ ...newFeedback, description: e.target.value })}
                required
                rows={4}
                className={styles.formTextarea}
                placeholder="Provide detailed feedback..."
              />
            </div>

            <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>

      {/* My Feedback Section */}
      <div className={styles.section}>
        <h2>My Feedback</h2>

        {loading ? (
          <div className={styles.loading}>Loading your feedback...</div>
        ) : feedback.length === 0 ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faCommentDots} size="3x" className={styles.emptyIcon} />
            <h3>No feedback submitted yet</h3>
            <p>Click "New Feedback" above to share your thoughts and suggestions.</p>
          </div>
        ) : (
          <div className={styles.feedbackList}>
            {feedback.map((item) => (
              <div key={item.id} className={styles.feedbackCard}>
                <div className={styles.feedbackHeader}>
                  <div className={styles.feedbackTitle}>
                    <FontAwesomeIcon
                      icon={getFeedbackIcon(item.type)}
                      className={styles.feedbackTypeIcon}
                    />
                    <h3>{item.name}</h3>
                  </div>
                  <div className={styles.feedbackActions}>
                    <button
                      onClick={() => setEditingFeedback(item)}
                      className={styles.editButton}
                      title="Edit feedback"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting === item.id}
                      className={styles.deleteButton}
                      title="Delete feedback"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                <div className={styles.feedbackMeta}>
                  <span className={styles.feedbackType}>{item.type}</span>
                  <span className={styles.feedbackPage}>{item.pageTitle}</span>
                  <span
                    className={`${styles.feedbackStatus} ${styles[`status${item.status.charAt(0) + item.status.slice(1).toLowerCase().replace('_', '')}`] || ''}`}
                  >
                    {item.status}
                  </span>
                  <span className={styles.feedbackDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className={styles.feedbackDescription}>{item.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditModal
        feedback={editingFeedback}
        isOpen={!!editingFeedback}
        onClose={() => setEditingFeedback(null)}
        onSave={handleEdit}
        isSaving={isSaving}
      />
    </div>
  );
}
