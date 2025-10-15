'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faUser, faStar } from '@fortawesome/free-solid-svg-icons';
import styles from './GoogleReviewModal.module.css';

type GoogleReviewEntry = {
  id: string;
  clientName: string;
  reviewText?: string;
  rating?: number;
};

type DailyGoogleReviewData = {
  reviews: GoogleReviewEntry[];
};

type GoogleReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DailyGoogleReviewData) => void;
  selectedDate: string;
  initialData?: DailyGoogleReviewData;
};

export default function GoogleReviewModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  initialData,
}: GoogleReviewModalProps) {
  const [data, setData] = useState<DailyGoogleReviewData>({
    reviews: [],
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    } else {
      setData({
        reviews: [],
      });
    }
  }, [initialData, selectedDate]);

  const addReview = () => {
    const newReview: GoogleReviewEntry = {
      id: Date.now().toString(),
      clientName: '',
      reviewText: '',
      rating: 5,
    };

    setData((prev) => ({
      ...prev,
      reviews: [...prev.reviews, newReview],
    }));
  };

  const removeReview = (id: string) => {
    setData((prev) => ({
      ...prev,
      reviews: prev.reviews.filter((review) => review.id !== id),
    }));
  };

  const updateReview = (id: string, field: keyof GoogleReviewEntry, value: string | number) => {
    setData((prev) => ({
      ...prev,
      reviews: prev.reviews.map((review) =>
        review.id === id ? { ...review, [field]: value } : review
      ),
    }));
  };

  const handleSave = () => {
    // Filter out reviews without client names
    const validReviews = data.reviews.filter((review) => review.clientName.trim() !== '');

    onSave({
      reviews: validReviews,
    });
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTotalReviews = () => {
    return data.reviews.filter((review) => review.clientName.trim() !== '').length;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.modalTitle}>
              <FontAwesomeIcon icon={faStar} />
              Google Reviews Tracking
            </h2>
            <p className={styles.modalSubtitle}>
              Track Google reviews received on {formatDate(selectedDate)}
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryContent}>
              <FontAwesomeIcon icon={faStar} className={styles.summaryIcon} />
              <div className={styles.summaryText}>
                <h3>{getTotalReviews()}</h3>
                <p>Google Reviews Today</p>
              </div>
            </div>
          </div>

          <div className={styles.reviewsSection}>
            <div className={styles.sectionHeader}>
              <h3>Review Entries</h3>
              <button className={styles.addButton} onClick={addReview}>
                <FontAwesomeIcon icon={faPlus} />
                Add Review
              </button>
            </div>

            {data.reviews.length === 0 ? (
              <div className={styles.emptyState}>
                <FontAwesomeIcon icon={faStar} className={styles.emptyIcon} />
                <p>No Google reviews recorded today.</p>
                <p>Click "Add Review" to start tracking reviews for quarterly bonuses.</p>
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {data.reviews.map((review, index) => (
                  <div key={review.id} className={styles.reviewEntry}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewNumber}>#{index + 1}</div>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeReview(review.id)}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    </div>

                    <div className={styles.reviewFields}>
                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                          <FontAwesomeIcon icon={faUser} />
                          Client Name *
                        </label>
                        <input
                          type="text"
                          className={styles.fieldInput}
                          value={review.clientName}
                          onChange={(e) => updateReview(review.id, 'clientName', e.target.value)}
                          placeholder="Enter client's full name"
                          required
                        />
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                          <FontAwesomeIcon icon={faStar} />
                          Rating
                        </label>
                        <select
                          className={styles.fieldSelect}
                          value={review.rating || 5}
                          onChange={(e) =>
                            updateReview(review.id, 'rating', parseInt(e.target.value))
                          }
                        >
                          <option value={5}>⭐⭐⭐⭐⭐ (5 stars)</option>
                          <option value={4}>⭐⭐⭐⭐ (4 stars)</option>
                          <option value={3}>⭐⭐⭐ (3 stars)</option>
                          <option value={2}>⭐⭐ (2 stars)</option>
                          <option value={1}>⭐ (1 star)</option>
                        </select>
                      </div>

                      <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Review Text (Optional)</label>
                        <textarea
                          className={styles.fieldTextarea}
                          value={review.reviewText || ''}
                          onChange={(e) => updateReview(review.id, 'reviewText', e.target.value)}
                          placeholder="Brief excerpt or notes about the review..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            <FontAwesomeIcon icon={faStar} />
            Save Reviews ({getTotalReviews()})
          </button>
        </div>
      </div>
    </div>
  );
}
