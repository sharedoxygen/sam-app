'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faPhone,
  faUser,
  faChartLine,
  faArrowTrendUp,
  faDollarSign,
  faSave,
  faSpinner,
  faBullseye,
  faStar,
} from '@fortawesome/free-solid-svg-icons';
import { PerformanceTargets } from '@/lib/services/performanceTargetService';
import styles from './TargetSettingModal.module.css';

interface TargetSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (targets: Partial<PerformanceTargets>) => Promise<void>;
  currentTargets?: PerformanceTargets;
  agentName?: string;
  isLoading?: boolean;
}

export default function TargetSettingModal({
  isOpen,
  onClose,
  onSave,
  currentTargets,
  agentName = 'Agent',
  isLoading = false,
}: TargetSettingModalProps) {
  const [targets, setTargets] = useState<Partial<PerformanceTargets>>({
    peopleContacted: 0,
    lifeSalesConversations: 0,
    salesClosed: 0,
    referralRequests: 0,
    premiumAmount: 0,
    rawNew: 0,
    multiLine: 0,
    googleReviews: 0,
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update local state when currentTargets change
  useEffect(() => {
    if (currentTargets) {
      setTargets({
        peopleContacted: currentTargets.peopleContacted || 0,
        lifeSalesConversations: currentTargets.lifeSalesConversations || 0,
        salesClosed: currentTargets.salesClosed || 0,
        referralRequests: currentTargets.referralRequests || 0,
        premiumAmount: currentTargets.premiumAmount || 0,
        rawNew: currentTargets.rawNew || 0,
        multiLine: currentTargets.multiLine || 0,
        googleReviews: currentTargets.googleReviews || 0,
      });
    }
  }, [currentTargets]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setSaving(false);
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof PerformanceTargets, value: string) => {
    const numValue = parseInt(value) || 0;

    // Validation
    const newErrors = { ...errors };
    if (numValue < 0) {
      newErrors[field] = 'Value must be positive';
    } else if (field === 'premiumAmount' && numValue > 99000000) {
      newErrors[field] = 'Premium amount cannot exceed $99,000,000';
    } else {
      delete newErrors[field];
    }

    setErrors(newErrors);
    setTargets((prev) => ({ ...prev, [field]: numValue }));
  };

  const handleSave = async () => {
    // Validate all fields
    const newErrors: Record<string, string> = {};

    Object.entries(targets).forEach(([field, value]) => {
      if (typeof value === 'number' && value < 0) {
        newErrors[field] = 'Value must be positive';
      }
      if (field === 'premiumAmount' && typeof value === 'number' && value > 99000000) {
        newErrors[field] = 'Premium amount cannot exceed $99,000,000';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave(targets);
      onClose();
    } catch (error) {
      console.error('Error saving targets:', error);
      // Could add error handling here
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <h2 className={styles.modalTitle}>
              <FontAwesomeIcon icon={faBullseye} />
              Set Performance Targets
            </h2>
            <p className={styles.modalSubtitle}>
              Configure weekly performance targets for {agentName}
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose} disabled={saving}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.targetsGrid}>
            {/* People Contacted */}
            <div className={styles.targetField}>
              <label className={styles.fieldLabel}>
                <FontAwesomeIcon icon={faPhone} className={styles.fieldIcon} />
                People Contacted (Weekly)
              </label>
              <input
                type="number"
                min="0"
                value={targets.peopleContacted || ''}
                onChange={(e) => handleInputChange('peopleContacted', e.target.value)}
                className={`${styles.fieldInput} ${errors.peopleContacted ? styles.fieldError : ''}`}
                placeholder="e.g., 50"
                disabled={saving}
              />
              {errors.peopleContacted && (
                <span className={styles.errorMessage}>{errors.peopleContacted}</span>
              )}
            </div>

            {/* Life/Sales Conversations */}
            <div className={styles.targetField}>
              <label className={styles.fieldLabel}>
                <FontAwesomeIcon icon={faUser} className={styles.fieldIcon} />
                Life/Sales Conversations (Weekly)
              </label>
              <input
                type="number"
                min="0"
                value={targets.lifeSalesConversations || ''}
                onChange={(e) => handleInputChange('lifeSalesConversations', e.target.value)}
                className={`${styles.fieldInput} ${errors.lifeSalesConversations ? styles.fieldError : ''}`}
                placeholder="e.g., 15"
                disabled={saving}
              />
              {errors.lifeSalesConversations && (
                <span className={styles.errorMessage}>{errors.lifeSalesConversations}</span>
              )}
            </div>

            {/* Sales Closed */}
            <div className={styles.targetField}>
              <label className={styles.fieldLabel}>
                <FontAwesomeIcon icon={faChartLine} className={styles.fieldIcon} />
                Sales Closed (Weekly)
              </label>
              <input
                type="number"
                min="0"
                value={targets.salesClosed || ''}
                onChange={(e) => handleInputChange('salesClosed', e.target.value)}
                className={`${styles.fieldInput} ${errors.salesClosed ? styles.fieldError : ''}`}
                placeholder="e.g., 3"
                disabled={saving}
              />
              {errors.salesClosed && (
                <span className={styles.errorMessage}>{errors.salesClosed}</span>
              )}
            </div>

            {/* Referral Requests */}
            <div className={styles.targetField}>
              <label className={styles.fieldLabel}>
                <FontAwesomeIcon icon={faArrowTrendUp} className={styles.fieldIcon} />
                Referral Requests (Weekly)
              </label>
              <input
                type="number"
                min="0"
                value={targets.referralRequests || ''}
                onChange={(e) => handleInputChange('referralRequests', e.target.value)}
                className={`${styles.fieldInput} ${errors.referralRequests ? styles.fieldError : ''}`}
                placeholder="e.g., 10"
                disabled={saving}
              />
              {errors.referralRequests && (
                <span className={styles.errorMessage}>{errors.referralRequests}</span>
              )}
            </div>

            {/* Premium Amount */}
            <div className={styles.targetField}>
              <label className={styles.fieldLabel}>
                <FontAwesomeIcon icon={faDollarSign} className={styles.fieldIcon} />
                Premium Amount Target (Weekly)
              </label>
              <input
                type="number"
                min="0"
                value={targets.premiumAmount || ''}
                onChange={(e) => handleInputChange('premiumAmount', e.target.value)}
                className={`${styles.fieldInput} ${errors.premiumAmount ? styles.fieldError : ''}`}
                placeholder="e.g., 50000"
                disabled={saving}
              />
              {errors.premiumAmount && (
                <span className={styles.errorMessage}>{errors.premiumAmount}</span>
              )}
            </div>

            {/* Raw New Sales */}
            <div className={styles.targetField}>
              <label className={styles.fieldLabel}>
                <FontAwesomeIcon icon={faArrowTrendUp} className={styles.fieldIcon} />
                Raw New Sales Target (Weekly)
              </label>
              <input
                type="number"
                min="0"
                value={targets.rawNew || ''}
                onChange={(e) => handleInputChange('rawNew', e.target.value)}
                className={`${styles.fieldInput} ${errors.rawNew ? styles.fieldError : ''}`}
                placeholder="e.g., 5"
                disabled={saving}
              />
              {errors.rawNew && <span className={styles.errorMessage}>{errors.rawNew}</span>}
            </div>

            {/* Multi-Line Sales */}
            <div className={styles.targetField}>
              <label className={styles.fieldLabel}>
                <FontAwesomeIcon icon={faChartLine} className={styles.fieldIcon} />
                Multi-Line Sales Target (Weekly)
              </label>
              <input
                type="number"
                min="0"
                value={targets.multiLine || ''}
                onChange={(e) => handleInputChange('multiLine', e.target.value)}
                className={`${styles.fieldInput} ${errors.multiLine ? styles.fieldError : ''}`}
                placeholder="e.g., 3"
                disabled={saving}
              />
              {errors.multiLine && <span className={styles.errorMessage}>{errors.multiLine}</span>}
            </div>

            {/* Google Reviews */}
            <div className={styles.targetField}>
              <label className={styles.fieldLabel}>
                <FontAwesomeIcon icon={faStar} className={styles.fieldIcon} />
                Google Reviews Target (Weekly)
              </label>
              <input
                type="number"
                min="0"
                value={targets.googleReviews || ''}
                onChange={(e) => handleInputChange('googleReviews', e.target.value)}
                className={`${styles.fieldInput} ${errors.googleReviews ? styles.fieldError : ''}`}
                placeholder="e.g., 2"
                disabled={saving}
              />
              {errors.googleReviews && (
                <span className={styles.errorMessage}>{errors.googleReviews}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving || Object.keys(errors).length > 0}
          >
            <FontAwesomeIcon
              icon={saving ? faSpinner : faSave}
              className={saving ? styles.spinning : ''}
            />
            {saving ? 'Saving...' : 'Save Targets'}
          </button>
        </div>
      </div>
    </div>
  );
}
