'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import styles from './BusinessDevelopmentModalSimple.module.css'; // Import CSS Module

type DailyBusinessData = {
  referralsRequested: number;
  referralsReceived: number;
};

type BusinessDevelopmentModalSimpleProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DailyBusinessData) => void;
  selectedDate: string;
  initialData?: DailyBusinessData;
};

const BUSINESS_METRICS = [
  {
    key: 'referralsRequested',
    label: 'Referrals Requested',
    icon: '🤝',
    color: '#fd7e14',
    target: 6,
    description: 'Number of referrals you asked for today',
  },
  {
    key: 'referralsReceived',
    label: 'Referrals Received',
    icon: '🎯',
    color: '#28a745',
    target: 3,
    description: 'New referrals received from your network',
  },
];

export default function BusinessDevelopmentModalSimple({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  initialData,
}: BusinessDevelopmentModalSimpleProps) {
  const [data, setData] = useState<DailyBusinessData>({
    referralsRequested: 0,
    referralsReceived: 0,
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    } else {
      setData({
        referralsRequested: 0,
        referralsReceived: 0,
      });
    }
  }, [initialData, selectedDate]);

  const updateValue = (metric: keyof DailyBusinessData, value: number) => {
    setData((prev) => ({
      ...prev,
      [metric]: Math.max(0, value),
    }));
  };

  const increment = (metric: keyof DailyBusinessData) => {
    updateValue(metric, data[metric] + 1);
  };

  const decrement = (metric: keyof DailyBusinessData) => {
    updateValue(metric, Math.max(0, data[metric] - 1));
  };

  const handleInputChange = (metric: keyof DailyBusinessData, value: string) => {
    const numValue = parseInt(value) || 0;
    updateValue(metric, numValue);
  };

  const handleSave = () => {
    onSave(data);
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

  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0; // Avoid division by zero
    return Math.min((current / target) * 100, 100);
  };

  const getReferralEfficiency = () => {
    if (data.referralsRequested === 0) return 0;
    return Math.round((data.referralsReceived / data.referralsRequested) * 100);
  };

  const getTotalReferralActivity = () => {
    return data.referralsRequested + data.referralsReceived;
  };

  if (!isOpen) return null;

  return (
    <div className={styles['modal-backdrop']}>
      <div className={styles['modal-container']}>
        <div className={styles['modal-content']}>
          <div className={styles['modal-header']}>
            <div className={styles['header-content']}>
              <h2 className={styles['modal-title']}>Business Development</h2>
              <p className={styles['modal-subtitle']}>Track your referral activity for</p>
              <p className={styles['modal-date']}>{formatDate(selectedDate)}</p>
            </div>
            <button className={styles['close-button']} onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className={styles['modal-body']}>
            {/* Summary Stats */}
            <div className={styles['summary-stats']}>
              <div className={`${styles['stat-card']} ${styles.primary}`}>
                <div className={styles['stat-icon']}>🚀</div>
                <div className={styles['stat-content']}>
                  <h3 className={styles['stat-value']}>{getTotalReferralActivity()}</h3>
                  <p className={styles['stat-label']}>Total Referral Activity</p>
                </div>
              </div>

              {data.referralsRequested > 0 && (
                <div className={`${styles['stat-card']} ${styles.success}`}>
                  <div className={styles['stat-icon']}>📈</div>
                  <div className={styles['stat-content']}>
                    <h3 className={styles['stat-value']}>{getReferralEfficiency()}%</h3>
                    <p className={styles['stat-label']}>Success Rate</p>
                  </div>
                </div>
              )}
            </div>

            {/* Metric Cards */}
            <div className={styles['metric-cards']}>
              {BUSINESS_METRICS.map((metric) => {
                const value = data[metric.key as keyof DailyBusinessData];
                const progressPercentage = getProgressPercentage(value, metric.target);

                return (
                  <div key={metric.key} className={styles['metric-card']}>
                    <div className={styles['metric-header']}>
                      <div className={styles['metric-info']}>
                        <span className={styles['metric-card-icon']}>{metric.icon}</span>
                        <div>
                          <h4 className={styles['metric-name']}>{metric.label}</h4>
                          <p className={styles['metric-description']}>{metric.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className={styles['input-section']}>
                      <div className={styles['input-controls']}>
                        <button
                          className={`${styles['control-btn']} ${styles.decrement}`}
                          onClick={() => decrement(metric.key as keyof DailyBusinessData)}
                          disabled={value === 0}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>

                        <input
                          type="number"
                          className={styles['value-input']}
                          value={value}
                          onChange={(e) =>
                            handleInputChange(metric.key as keyof DailyBusinessData, e.target.value)
                          }
                          min="0"
                        />

                        <button
                          className={`${styles['control-btn']} ${styles.increment}`}
                          onClick={() => increment(metric.key as keyof DailyBusinessData)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      </div>

                      <div className={styles['progress-section']}>
                        <div className={styles['progress-bar']}>
                          <div
                            className={`${styles['progress-fill']} ${styles['with-dynamic-color']}`}
                            ref={(el) => {
                              if (el) {
                                el.style.width = `${progressPercentage}%`;
                                el.style.setProperty('--progress-color', metric.color);
                              }
                            }}
                          />
                        </div>
                        <span
                          className={`${styles['progress-text']} ${styles['with-dynamic-color']}`}
                          ref={(el) => {
                            if (el) {
                              el.style.setProperty('--progress-color', metric.color);
                            }
                          }}
                        >
                          {value} / {metric.target} ({Math.round(progressPercentage)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tips Section */}
            <div className={styles['tips-section']}>
              <h4 className={styles['tips-title']}>💡 Pro Tips</h4>
              <ul className={styles['tips-list']}>
                <li>Ask for referrals after successful policy closings</li>
                <li>Follow up on referrals within 24 hours</li>
                <li>Thank clients who provide referrals</li>
              </ul>
            </div>
          </div>

          <div className={styles['modal-footer']}>
            <button className={styles['btn-secondary']} onClick={onClose}>
              Cancel
            </button>
            <button className={styles['btn-primary']} onClick={handleSave}>
              <FontAwesomeIcon icon={faSave} />
              Save Business Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
