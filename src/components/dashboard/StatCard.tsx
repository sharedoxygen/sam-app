// 'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign } from '@fortawesome/free-solid-svg-icons';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  type:
    | 'sales'
    | 'dials'
    | 'quotes'
    | 'premium'
    | 'referrals'
    | 'conversion'
    | 'indicators'
    | 'default';
  insight?: string;
  showCalculation?: boolean;
  isMonetary?: boolean;
  average?: number;
}

export default function StatCard({
  title,
  value,
  icon,
  type = 'default',
  insight,
  isMonetary = false,
  average,
}: StatCardProps) {
  const displayValue =
    typeof value === 'number' && isMonetary
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)
      : value;

  return (
    <div className={`${styles.statCard} ${styles[type]}`}>
      <div className={styles.statHeader}>
        <div className={styles.statIcon}>
          {isMonetary ? <FontAwesomeIcon icon={faDollarSign} /> : icon}
        </div>
        <div className={styles.statTitle}>{title}</div>
      </div>

      <div className={`${styles.statValue} ${styles.withDynamicColor}`}>{displayValue}</div>

      {average && isMonetary && (
        <div className={styles.statAverage}>
          Avg:{' '}
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(average)}
        </div>
      )}

      {insight && <div className={styles.statInsight}>{insight}</div>}
    </div>
  );
}
