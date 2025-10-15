'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp, faArrowDown, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import styles from './MetricsCard.module.css';

export type MetricsCardProps = {
  metricId: string;
  title: string;
  value: number;
  type: string;
  color?: string;
  previousValue?: number;
  showControls?: boolean;
  onMetricChange?: (metricId: string, newValue: number) => void;
  enableIncrement?: boolean;
  enableDecrement?: boolean;
  isPercentage?: boolean;
  isLoading?: boolean;
};

/**
 * Reusable metrics card component
 */
export default function MetricsCard({
  metricId,
  title,
  value,
  type,
  color,
  previousValue,
  showControls = false,
  onMetricChange,
  enableIncrement = true,
  enableDecrement = true,
  isPercentage = false,
  isLoading = false,
}: MetricsCardProps) {
  const calculatePercentChange = () => {
    if (previousValue === undefined || previousValue === 0) return null;
    const diff = value - previousValue;
    const percentChange = (diff / previousValue) * 100;
    return {
      diff,
      percent: Math.abs(percentChange).toFixed(1),
      isPositive: diff > 0,
    };
  };

  const handleIncrement = () => {
    if (onMetricChange && enableIncrement) {
      onMetricChange(metricId, value + 1);
    }
  };

  const handleDecrement = () => {
    if (onMetricChange && enableDecrement && value > 0) {
      onMetricChange(metricId, value - 1);
    }
  };

  const percentChange = calculatePercentChange();

  if (isLoading) {
    return (
      <div className={`${styles.metricsCard} ${styles.loading}`}>
        <div className={styles.metricsCardHeader}>
          <h3 className={styles.metricsCardTitle}>{title}</h3>
        </div>
        <div className={styles.metricsCardBody}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.metricsCard}>
      <div className={styles.metricsCardHeader}>
        <h3 className={styles.metricsCardTitle}>{title}</h3>
        {percentChange && (
          <div
            className={`${styles.metricsTrend} ${percentChange.isPositive ? styles.positive : styles.negative}`}
            title={`${percentChange.isPositive ? 'Increased' : 'Decreased'} by ${percentChange.diff} (${percentChange.percent}%)`}
          >
            <FontAwesomeIcon icon={percentChange.isPositive ? faArrowUp : faArrowDown} size="xs" />
            <span>{percentChange.percent}%</span>
          </div>
        )}
      </div>

      <div className={styles.metricsCardBody}>
        <div className={`${styles.metricsCardValue} ${color ? styles.withCustomColor : ''}`}>
          {value}
          {isPercentage ? '%' : ''}
        </div>

        {showControls && onMetricChange && (
          <div className={styles.metricsControls}>
            <button
              type="button"
              className={`${styles.btnControl} decrement`}
              onClick={handleDecrement}
              disabled={!enableDecrement || value <= 0}
              aria-label={`Decrease ${title}`}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <button
              type="button"
              className={`${styles.btnControl} increment`}
              onClick={handleIncrement}
              disabled={!enableIncrement}
              aria-label={`Increase ${title}`}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// Test comment
