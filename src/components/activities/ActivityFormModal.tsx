'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { ClientSelector } from '@/components/common/ClientSelector';
import styles from './ActivityFormModal.module.css'; // Import CSS Module

type Activity = {
  id?: number;
  type: string;
  clientName: string;
  duration: number;
  notes: string;
  date: string;
  time: string;
};

type ActivityFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: Omit<Activity, 'id'>) => Promise<void> | void;
  currentActivity: Activity | null;
  title?: string;
};

const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentActivity,
  title = 'Activity',
}) => {
  const [formData, setFormData] = useState<Omit<Activity, 'id'>>({
    type: 'call',
    clientName: '',
    duration: 15,
    notes: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize form with current activity data when editing
  useEffect(() => {
    if (currentActivity) {
      setFormData({
        type: currentActivity.type,
        clientName: currentActivity.clientName,
        duration: currentActivity.duration,
        notes: currentActivity.notes,
        date: currentActivity.date,
        time: currentActivity.time,
      });
    } else {
      // Reset form when creating new activity
      setFormData({
        type: 'call',
        clientName: '',
        duration: 15,
        notes: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      });
    }
    setErrors({});
  }, [currentActivity, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleClientChange = (clientName: string) => {
    setFormData((prev) => ({ ...prev, clientName }));
    // Clear error when client is selected
    if (errors.clientName) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.clientName;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    if (formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving activity:', error);
      setErrors((prev) => ({ ...prev, submit: 'Failed to save activity. Please try again.' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContainer}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h5 className="modal-title">{currentActivity ? `Edit ${title}` : `New ${title}`}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.modalBody}>
              {errors.submit && <div className="alert alert-danger mb-3">{errors.submit}</div>}

              <div className="form-group mb-3">
                <label htmlFor="activityType" className="form-label">
                  Activity Type
                </label>
                <select
                  id="activityType"
                  name="type"
                  className="form-select"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="follow-up">Follow-up</option>
                </select>
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Client Name</label>
                <ClientSelector
                  value={formData.clientName}
                  onChange={handleClientChange}
                  placeholder="Select or type client name..."
                  required={true}
                  error={errors.clientName}
                />
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="activityDate" className="form-label">
                    Date
                  </label>
                  <input
                    type="date"
                    id="activityDate"
                    name="date"
                    className={`form-control ${errors.date ? 'is-invalid' : ''}`}
                    value={formData.date}
                    onChange={handleChange}
                  />
                  {errors.date && <div className="invalid-feedback">{errors.date}</div>}
                </div>
                <div className="col-md-6">
                  <label htmlFor="activityTime" className="form-label">
                    Time
                  </label>
                  <input
                    type="time"
                    id="activityTime"
                    name="time"
                    className={`form-control ${errors.time ? 'is-invalid' : ''}`}
                    value={formData.time}
                    onChange={handleChange}
                  />
                  {errors.time && <div className="invalid-feedback">{errors.time}</div>}
                </div>
              </div>

              <div className="form-group mb-3">
                <label htmlFor="activityDuration" className="form-label">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="activityDuration"
                  name="duration"
                  className={`form-control ${errors.duration ? 'is-invalid' : ''}`}
                  value={formData.duration}
                  onChange={handleChange}
                  min="1"
                  step="1"
                />
                {errors.duration && <div className="invalid-feedback">{errors.duration}</div>}
              </div>

              <div className="form-group mb-3">
                <label htmlFor="activityNotes" className="form-label">
                  Notes
                </label>
                <textarea
                  id="activityNotes"
                  name="notes"
                  className="form-control"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter details about the activity"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} className="me-2" />
                    Save Activity
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityFormModal;
