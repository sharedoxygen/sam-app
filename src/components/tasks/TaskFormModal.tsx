'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faTimes,
  faSpinner,
  faHandshake,
  faWrench,
  faPhone,
  faEnvelope,
  faCalendarAlt,
  faUserPlus,
  faTags,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { Task, CreateTaskRequest } from '@/types/api';
import styles from '@/styles/TaskFormModal.module.css';

// Enhanced task interface for the form
interface EnhancedTaskForm {
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  category: 'sales' | 'service' | 'follow-up' | 'meeting' | 'call' | 'email';
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  estimatedValue: string;
  tags: string[];
  lastContactDate: string;
  nextFollowUpDate: string;
  assignedToUserId?: number;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
}

type TaskFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: CreateTaskRequest) => Promise<void> | void;
  currentTask: Task | null;
};

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, currentTask }) => {
  const { user } = useAuth();

  // Category configurations with colors and icons
  const categoryConfig = {
    sales: { icon: faHandshake, color: '#28a745', label: 'Sales Opportunity' },
    service: { icon: faWrench, color: '#007bff', label: 'Service Request' },
    call: { icon: faPhone, color: '#ffc107', label: 'Phone Call' },
    email: { icon: faEnvelope, color: '#6f42c1', label: 'Email Communication' },
    meeting: { icon: faCalendarAlt, color: '#fd7e14', label: 'Client Meeting' },
    'follow-up': { icon: faUserPlus, color: '#dc3545', label: 'Follow-up Activity' },
  };

  const [formData, setFormData] = useState<EnhancedTaskForm>({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    isCompleted: false,
    category: 'sales',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    estimatedValue: '',
    tags: [],
    lastContactDate: '',
    nextFollowUpDate: '',
    assignedToUserId: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  useEffect(() => {
    if (currentTask) {
      setFormData({
        title: currentTask.title,
        description: currentTask.description || '',
        dueDate: currentTask.dueDate,
        priority: currentTask.priority,
        isCompleted: currentTask.isCompleted,
        category: currentTask.category || 'sales',
        clientName: currentTask.clientName || '',
        clientEmail: currentTask.clientEmail || '',
        clientPhone: currentTask.clientPhone || '',
        estimatedValue: currentTask.estimatedValue || '',
        tags: currentTask.tags || [],
        lastContactDate: currentTask.lastContactDate || '',
        nextFollowUpDate: currentTask.nextFollowUpDate || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        isCompleted: false,
        category: 'sales',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        estimatedValue: '',
        tags: [],
        lastContactDate: '',
        nextFollowUpDate: '',
      });
    }
    setErrors({});
    setTagInput('');
  }, [currentTask, isOpen, user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCategorySelect = (category: EnhancedTaskForm['category']) => {
    setFormData((prev) => ({ ...prev, category }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Activity title is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (formData.clientEmail && !/\S+@\S+\.\S+/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
    }

    if (formData.estimatedValue && isNaN(Number(formData.estimatedValue))) {
      newErrors.estimatedValue = 'Please enter a valid number';
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
    // Clear any previous errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.submit;
      return newErrors;
    });

    // Convert enhanced form data to task format for API
    const taskData: CreateTaskRequest = {
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      priority: formData.priority,
      isCompleted: formData.isCompleted,
      category: formData.category,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      estimatedValue: formData.estimatedValue,
      tags: formData.tags,
      lastContactDate: formData.lastContactDate,
      nextFollowUpDate: formData.nextFollowUpDate,
    };

    try {
      await onSave(taskData);
      // Only close on successful save - parent component won't see this success case
      onClose();
      setSubmitting(false);
    } catch (error) {
      console.error('TaskFormModal: Save failed, letting parent handle feedback:', error);
      setSubmitting(false);
      // Re-throw error so parent component can catch it and display feedback
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles['modal-backdrop']}>
      <div className={styles['modal-container']}>
        <div className={styles['modal-content']}>
          <div className={styles['modal-header']}>
            <h5 className={styles['modal-title']}>
              {currentTask ? 'Edit Activity' : 'Create New Activity'}
            </h5>
            <button
              type="button"
              className={styles['close-button']}
              onClick={onClose}
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles['modal-body']}>
              {errors.submit && <div className={styles['error-message']}>{errors.submit}</div>}

              {/* Category Selection */}
              <div className={styles['form-group']}>
                <label>Activity Category</label>
                <div className={styles['category-grid']}>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      className={`${styles['category-card']} ${
                        formData.category === key ? styles.selected : ''
                      } ${styles[`category-${key}`]}`}
                      onClick={() => handleCategorySelect(key as EnhancedTaskForm['category'])}
                    >
                      <div className={`${styles['category-icon']} ${styles[`icon-${key}`]}`}>
                        <FontAwesomeIcon icon={config.icon} />
                      </div>
                      <span className={styles['category-label']}>{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Information */}
              <div className={styles['form-group']}>
                <label htmlFor="title">Activity Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  className={errors.title ? styles.error : ''}
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter activity title"
                />
                {errors.title && <div className={styles['field-error']}>{errors.title}</div>}
              </div>

              <div className={styles['form-group']}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Enter activity description"
                />
              </div>

              {/* Client Information */}
              <div className={styles['section-header']}>
                <FontAwesomeIcon icon={faUser} />
                <span>Client Information</span>
              </div>

              <div className={styles['form-row']}>
                <div className={`${styles['form-group']} ${styles.half}`}>
                  <label htmlFor="clientName">Client Name *</label>
                  <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    className={errors.clientName ? styles.error : ''}
                    value={formData.clientName}
                    onChange={handleChange}
                    placeholder="Enter client name"
                  />
                  {errors.clientName && (
                    <div className={styles['field-error']}>{errors.clientName}</div>
                  )}
                </div>
                <div className={`${styles['form-group']} ${styles.half}`}>
                  <label htmlFor="clientEmail">Client Email</label>
                  <input
                    type="email"
                    id="clientEmail"
                    name="clientEmail"
                    className={errors.clientEmail ? styles.error : ''}
                    value={formData.clientEmail}
                    onChange={handleChange}
                    placeholder="client@example.com"
                  />
                  {errors.clientEmail && (
                    <div className={styles['field-error']}>{errors.clientEmail}</div>
                  )}
                </div>
              </div>

              <div className={styles['form-row']}>
                <div className={`${styles['form-group']} ${styles.half}`}>
                  <label htmlFor="clientPhone">Client Phone</label>
                  <input
                    type="tel"
                    id="clientPhone"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className={`${styles['form-group']} ${styles.half}`}>
                  <label htmlFor="estimatedValue">Estimated Value ($)</label>
                  <input
                    type="number"
                    id="estimatedValue"
                    name="estimatedValue"
                    className={errors.estimatedValue ? styles.error : ''}
                    value={formData.estimatedValue}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                  {errors.estimatedValue && (
                    <div className={styles['field-error']}>{errors.estimatedValue}</div>
                  )}
                </div>
              </div>

              {/* Activity Details */}
              <div className={styles['section-header']}>
                <FontAwesomeIcon icon={faCalendarAlt} />
                <span>Activity Details</span>
              </div>

              <div className={styles['form-row']}>
                <div className={`${styles['form-group']} ${styles.half}`}>
                  <label htmlFor="dueDate">Due Date *</label>
                  <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    className={errors.dueDate ? styles.error : ''}
                    value={formData.dueDate}
                    onChange={handleChange}
                  />
                  {errors.dueDate && <div className={styles['field-error']}>{errors.dueDate}</div>}
                </div>
                <div className={`${styles['form-group']} ${styles.half}`}>
                  <label htmlFor="priority">Priority</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className={styles['form-row']}>
                <div className={`${styles['form-group']} ${styles.half}`}>
                  <label htmlFor="lastContactDate">Last Contact Date</label>
                  <input
                    type="date"
                    id="lastContactDate"
                    name="lastContactDate"
                    value={formData.lastContactDate}
                    onChange={handleChange}
                  />
                </div>
                <div className={`${styles['form-group']} ${styles.half}`}>
                  <label htmlFor="nextFollowUpDate">Next Follow-up Date</label>
                  <input
                    type="date"
                    id="nextFollowUpDate"
                    name="nextFollowUpDate"
                    value={formData.nextFollowUpDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className={styles['form-group']}>
                <label>Tags</label>
                <div className={styles['tags-input-container']}>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagInputKeyPress}
                    placeholder="Add a tag and press Enter"
                    className={styles['tag-input']}
                  />
                  <button type="button" onClick={handleAddTag} className={styles['add-tag-button']}>
                    <FontAwesomeIcon icon={faTags} />
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className={styles['tags-container']}>
                    {formData.tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className={styles['remove-tag']}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className={styles['form-group']}>
                <div className={styles['checkbox-container']}>
                  <input
                    type="checkbox"
                    id="isCompleted"
                    name="isCompleted"
                    checked={formData.isCompleted}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isCompleted: e.target.checked }))
                    }
                    className={styles['checkbox-input']}
                  />
                  <label htmlFor="isCompleted" className={styles['checkbox-label']}>
                    Mark as completed
                  </label>
                </div>
              </div>
            </div>

            <div className={styles['modal-footer']}>
              <button type="button" className={styles['cancel-button']} onClick={onClose}>
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button type="submit" className={styles['save-button']} disabled={submitting}>
                {submitting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} /> Save Activity
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

export default TaskFormModal;
