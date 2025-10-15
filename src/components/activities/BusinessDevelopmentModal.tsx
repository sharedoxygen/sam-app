'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave } from '@fortawesome/free-solid-svg-icons';
import styles from './BusinessDevelopmentModal.module.css'; // Import CSS Module

type WeeklyBusinessData = {
  referralsRequested: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
  };
  referralsReceived: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
  };
};

type BusinessDevelopmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WeeklyBusinessData) => void;
  initialData?: WeeklyBusinessData;
};

const METRICS = [
  { key: 'referralsRequested', label: 'REFERRALS REQUESTED' },
  { key: 'referralsReceived', label: 'REFERRALS RECEIVED' },
];

const DAYS = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
];

export default function BusinessDevelopmentModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: BusinessDevelopmentModalProps) {
  const [data, setData] = useState<WeeklyBusinessData>(() => ({
    referralsRequested: {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
    },
    referralsReceived: {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
    },
  }));

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const updateValue = (metric: keyof WeeklyBusinessData, day: string, value: number) => {
    setData((prev) => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [day]: Math.max(0, value),
      },
    }));
  };

  const increment = (metric: keyof WeeklyBusinessData, day: string) => {
    const metricData = data[metric];
    const currentValue = metricData ? (metricData as any)[day] || 0 : 0;
    updateValue(metric, day, currentValue + 1);
  };

  const decrement = (metric: keyof WeeklyBusinessData, day: string) => {
    const metricData = data[metric];
    const currentValue = metricData ? (metricData as any)[day] || 0 : 0;
    updateValue(metric, day, Math.max(0, currentValue - 1));
  };

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  const getTotalForMetric = (metric: keyof WeeklyBusinessData) => {
    const metricData = data[metric];
    if (!metricData) return 0;
    return Object.values(metricData).reduce((sum, value) => sum + value, 0);
  };

  const getTotalForDay = (day: string) => {
    return METRICS.reduce((sum, metric) => {
      const metricData = data[metric.key as keyof WeeklyBusinessData];
      const value = metricData ? (metricData as any)[day] || 0 : 0;
      return sum + value;
    }, 0);
  };

  const getGrandTotal = () => {
    return METRICS.reduce(
      (sum, metric) => sum + getTotalForMetric(metric.key as keyof WeeklyBusinessData),
      0
    );
  };

  // Get formatted current date
  const getCurrentWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(today.setDate(diff));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${monthNames[monday.getMonth()]} ${monday.getDate()} - ${monthNames[friday.getMonth()]} ${friday.getDate()}, ${friday.getFullYear()}`;
  };

  // Calculate conversion rate
  const getConversionRate = () => {
    const requested = getTotalForMetric('referralsRequested');
    const received = getTotalForMetric('referralsReceived');
    if (requested === 0) return '0%';
    return `${Math.round((received / requested) * 100)}%`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContainer}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div>
              <h2 className={styles.modalTitle}>Business Development</h2>
              <p className={styles.modalSubtitle}>Referral Network & Lead Generation</p>
              <p className={styles.modalDate}>{getCurrentWeekRange()}</p>
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.metricsGrid}>
              {METRICS.map((metric) => (
                <div key={metric.key} className={styles.metricSection}>
                  <h3 className={styles.metricTitle}>{metric.label}</h3>

                  <div className={styles.daysGrid}>
                    {DAYS.map((day) => (
                      <div key={day.key} className={styles.dayColumn}>
                        <div className={styles.dayHeader}>{day.label}</div>
                        <div className={styles.valueControls}>
                          <button
                            className={`${styles.controlBtn} ${styles.decrement}`}
                            onClick={() =>
                              decrement(metric.key as keyof WeeklyBusinessData, day.key)
                            }
                          >
                            −
                          </button>
                          <div className={styles.valueDisplay}>
                            {data[metric.key as keyof WeeklyBusinessData]
                              ? (data[metric.key as keyof WeeklyBusinessData] as any)[day.key] || 0
                              : 0}
                          </div>
                          <button
                            className={`${styles.controlBtn} ${styles.increment}`}
                            onClick={() =>
                              increment(metric.key as keyof WeeklyBusinessData, day.key)
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className={styles.totalColumn}>
                      <div className={styles.dayHeader}>TOTAL</div>
                      <div className={styles.totalDisplay}>
                        {getTotalForMetric(metric.key as keyof WeeklyBusinessData)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Conversion Rate Section */}
              <div className={styles.conversionSection}>
                <h3 className={styles.metricTitle}>CONVERSION METRICS</h3>
                <div className={styles.conversionStats}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Requested</div>
                    <div className={styles.statValue}>
                      {getTotalForMetric('referralsRequested')}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Received</div>
                    <div className={styles.statValue}>{getTotalForMetric('referralsReceived')}</div>
                  </div>
                  <div className={`${styles.statCard} ${styles.conversionRate}`}>
                    <div className={styles.statLabel}>Conversion Rate</div>
                    <div className={`${styles.statValue} ${styles.rate}`}>
                      {getConversionRate()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Totals Row */}
              <div className={styles.weeklyTotals}>
                <h3 className={styles.metricTitle}>WEEKLY TOTALS</h3>
                <div className={styles.daysGrid}>
                  {DAYS.map((day) => (
                    <div key={day.key} className={styles.dayColumn}>
                      <div className={styles.dayHeader}>{day.label}</div>
                      <div className={styles.totalDisplay}>{getTotalForDay(day.key)}</div>
                    </div>
                  ))}
                  <div className={styles.totalColumn}>
                    <div className={styles.dayHeader}>TOTAL</div>
                    <div className={styles.grandTotalDisplay}>{getGrandTotal()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button className={styles.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button className={styles.btnPrimary} onClick={handleSave}>
              <FontAwesomeIcon icon={faSave} />
              Save Business Development Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
