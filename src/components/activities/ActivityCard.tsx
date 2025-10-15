'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import MetricsCard from '@/components/metrics/MetricsCard';
import styles from './ActivityCard.module.css'; // Import CSS Module

export type ActivityCardProps = {
  title: string;
  subtitle: string;
  icon: any; // FontAwesomeIconDefinition
  iconColor?: string;
  metrics: {
    label: string;
    current?: number;
    value?: number | string;
    target?: number;
    unit?: string;
    isMonetary?: boolean;
  }[];
  onEdit?: () => void;
  onClick?: () => void;
  color?: string;
  readOnly?: boolean;
};

export default function ActivityCard({
  title,
  subtitle,
  icon,
  iconColor,
  metrics,
  onEdit,
  onClick,
  color = 'var(--primary-color)',
  readOnly = false,
}: ActivityCardProps) {
  const handleClick = () => {
    if (readOnly) return;
    if (onClick) onClick();
    if (onEdit) onEdit();
  };

  return (
    <div
      ref={(el) => {
        if (el) {
          el.style.setProperty('--activity-color', color);
          if (iconColor) {
            el.style.setProperty('--icon-color', iconColor);
          }
        }
      }}
      className={`${styles.activityCard} ${readOnly ? styles.readOnly : ''}`}
      onClick={handleClick}
    >
      <div className={styles.cardHeader}>
        <div
          className={`${styles.cardIcon} ${styles.withDynamicColor} ${iconColor ? styles.customIconColor : ''}`}
        >
          <FontAwesomeIcon icon={icon} />
        </div>
        <div className={styles.cardTitleSection}>
          <h3 className={styles.cardTitle}>{title}</h3>
          <p className={styles.cardSubtitle}>{subtitle}</p>
          {readOnly && <span className={styles.readOnlyBadge}>View Only</span>}
        </div>
      </div>

      <div
        className={styles.metricsContainer}
        ref={(el) => {
          if (el) {
            el.style.setProperty('--metric-color', color);
            el.style.setProperty('--metric-margin-bottom', '0.5rem');
            el.style.setProperty('--metric-cursor', readOnly ? 'default' : 'pointer');
          }
        }}
      >
        {metrics.map((metric, index) => {
          // Handle different value types
          let displayValue: number;
          let displayTitle = metric.label;

          if (metric.value !== undefined) {
            if (typeof metric.value === 'string') {
              if (metric.isMonetary) {
                displayTitle = `${metric.label}: ${metric.value}`;
                displayValue = 0; // Don't show numeric value for monetary metrics, only formatted title
              } else {
                // For non-monetary string values, extract number or use 0
                const numericMatch = metric.value.toString().match(/[\d,]+/);
                displayValue = numericMatch ? parseInt(numericMatch[0].replace(/,/g, ''), 10) : 0;
              }
            } else {
              displayValue = metric.value;
            }
          } else {
            displayValue = metric.current || 0;
          }

          const targetValue = metric.target || 0;

          return (
            <MetricsCard
              key={index}
              metricId={`${title.toLowerCase().replace(/\s+/g, '-')}-${metric.label.toLowerCase().replace(/\s+/g, '-')}`}
              title={displayTitle}
              value={displayValue}
              type="counter"
              color={color}
              previousValue={targetValue}
            />
          );
        })}
      </div>
    </div>
  );
}
