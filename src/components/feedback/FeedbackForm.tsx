'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots,
  faPaperPlane,
  faTimes,
  faExclamationTriangle,
  faLightbulb,
  faComment,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './FeedbackForm.module.css';

type FeedbackType = 'ENHANCEMENT' | 'BUG' | 'GENERAL';

interface FeedbackFormData {
  name: string;
  pageTitle: string;
  type: FeedbackType;
  description: string;
}

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialPageTitle?: string;
}

export default function FeedbackForm({
  isOpen,
  onClose,
  initialPageTitle = '',
}: FeedbackFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FeedbackFormData>({
    name: '',
    pageTitle: initialPageTitle,
    type: 'GENERAL',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Partial<FeedbackFormData>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Auto-populate user name and current page title
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        name: user?.name || '',
        pageTitle: initialPageTitle || document.title || '',
      }));
      setSubmitStatus('idle');
      setErrors({});
      setApiError(null);
    }
  }, [isOpen, user?.name, initialPageTitle]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FeedbackFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.pageTitle.trim()) {
      newErrors.pageTitle = 'Page title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FeedbackFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear API error when user modifies the form
    if (apiError) {
      setApiError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setApiError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        // Try to parse the error message from the API response
        try {
          const errorData = await response.json();
          setApiError(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        } catch {
          setApiError(`HTTP ${response.status}: ${response.statusText}`);
        }
        setSubmitStatus('error');
        return;
      }

      setSubmitStatus('success');

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          name: user?.name || '',
          pageTitle: '',
          type: 'GENERAL',
          description: '',
        });
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setApiError('Network error. Please check your connection and try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFeedbackTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case 'ENHANCEMENT':
        return faLightbulb;
      case 'BUG':
        return faExclamationTriangle;
      case 'GENERAL':
        return faComment;
      default:
        return faComment;
    }
  };

  const getFeedbackTypeColorClass = (type: FeedbackType) => {
    switch (type) {
      case 'ENHANCEMENT':
        return styles.selectIconEnhancement;
      case 'BUG':
        return styles.selectIconBug;
      case 'GENERAL':
        return styles.selectIconGeneral;
      default:
        return styles.selectIconGeneral;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContainer}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div className={styles.headerContent}>
              <FontAwesomeIcon icon={faCommentDots} className={styles.headerIcon} />
              <div>
                <h2 className={styles.modalTitle}>User Feedback</h2>
                <p className={styles.modalSubtitle}>Help us improve the application</p>
              </div>
            </div>
            <button className={styles.closeButton} onClick={onClose} type="button">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.modalBody}>
            {/* Name Field */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.formLabel}>
                Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`${styles.formInput} ${errors.name ? styles.inputError : ''}`}
                placeholder="Your full name"
                disabled={isSubmitting}
              />
              {errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
            </div>

            {/* Page Title Field */}
            <div className={styles.formGroup}>
              <label htmlFor="pageTitle" className={styles.formLabel}>
                Page Title <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                id="pageTitle"
                value={formData.pageTitle}
                onChange={(e) => handleInputChange('pageTitle', e.target.value)}
                className={`${styles.formInput} ${errors.pageTitle ? styles.inputError : ''}`}
                placeholder="Page or feature you're providing feedback about"
                disabled={isSubmitting}
              />
              {errors.pageTitle && <span className={styles.errorMessage}>{errors.pageTitle}</span>}
            </div>

            {/* Feedback Type Dropdown */}
            <div className={styles.formGroup}>
              <label htmlFor="type" className={styles.formLabel}>
                Feedback Type <span className={styles.required}>*</span>
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className={styles.formSelect}
                  disabled={isSubmitting}
                >
                  <option value="GENERAL">General Feedback</option>
                  <option value="ENHANCEMENT">Enhancement Request</option>
                  <option value="BUG">Bug Report</option>
                </select>
                <FontAwesomeIcon
                  icon={getFeedbackTypeIcon(formData.type)}
                  className={`${styles.selectIcon} ${getFeedbackTypeColorClass(formData.type)}`}
                />
              </div>
            </div>

            {/* Description Field */}
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.formLabel}>
                Description <span className={styles.required}>*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`${styles.formTextarea} ${errors.description ? styles.inputError : ''}`}
                placeholder="Please provide detailed feedback. For bugs, include steps to reproduce. For enhancements, describe the desired functionality."
                rows={6}
                disabled={isSubmitting}
              />
              <div className={styles.textareaFooter}>
                <span
                  className={`${styles.charCount} ${formData.description.length < 10 ? styles.charCountWarning : styles.charCountValid}`}
                >
                  {formData.description.length}/10 characters minimum
                </span>
                {errors.description && (
                  <span className={styles.errorMessage}>{errors.description}</span>
                )}
              </div>
            </div>

            {/* Submit Status Messages */}
            {submitStatus === 'success' && (
              <div className={styles.successMessage}>
                <FontAwesomeIcon icon={faPaperPlane} />
                Thank you! Your feedback has been submitted successfully.
              </div>
            )}

            {submitStatus === 'error' && (
              <div className={styles.errorMessage}>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {apiError || 'Failed to submit feedback. Please try again.'}
              </div>
            )}

            {/* Form Actions */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={isSubmitting || submitStatus === 'success'}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
