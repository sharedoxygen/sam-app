'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import MetricsCard from './MetricsCard';
import styles from './DailyMetricsDisplay.module.css';

// Define types for the daily metrics with specific business requirements
type MetricType =
  | 'contacts' // Blue
  | 'life conversations' // Teal
  | 'sales' // Green
  | 'asking ratio' // Orange
  | 'quotes'
  | 'closed'
  | 'dials'
  | 'referrals';

// Map for metric colors based on business requirements - using in component styles
export const METRIC_COLORS = {
  contacts: 'var(--metric-blue)', // Blue for contacts
  'life conversations': 'var(--metric-teal)', // Teal for life conversations
  sales: 'var(--metric-green)', // Green for sales
  'asking ratio': 'var(--metric-orange)', // Orange for asking ratio
  quotes: 'var(--metric-yellow)', // Yellow for quotes
  closed: 'var(--metric-green)', // Green for closed sales
  dials: 'var(--primary-color)', // Primary color for dials
  referrals: 'var(--metric-blue)', // Blue for referrals
};

// Types for specific metric groups
type QuotesMetrics = {
  auto: number;
  life: number;
  fire: number;
};

type ClosedMetrics = {
  auto: number;
  life: number;
  fire: number;
};

type ReferralMetrics = {
  asked: number;
  received: number;
};

// Props for the component
type DailyMetricsDisplayProps = {
  date: string;
  contactsMetric: number;
  lifeConversationsMetric: number;
  salesMetric: number;
  askingRatioMetric: number;
  quotesMetrics: QuotesMetrics;
  closedMetrics: ClosedMetrics;
  dialsMetric: number;
  referralsMetrics: ReferralMetrics;
  onDateChange: (date: string) => void;
  onMetricChange: (metricId: string, newValue: number) => void;
  isLoading?: boolean;
};

/**
 * Daily Metrics Display component following the business requirements:
 * - Focus on weekdays only (Monday-Friday)
 * - Color-coded metrics (blue for contacts, teal for life conversations, green for sales, orange for asking ratio)
 * - Direct increment/decrement controls without confirmation prompts
 */
export default function DailyMetricsDisplay({
  date,
  contactsMetric,
  lifeConversationsMetric,
  salesMetric,
  askingRatioMetric,
  quotesMetrics,
  closedMetrics,
  dialsMetric,
  referralsMetrics,
  onDateChange,
  onMetricChange,
  isLoading = false,
}: DailyMetricsDisplayProps) {
  // Format the current date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formattedDate = formatDate(date);

  /**
   * Navigate to the previous business day (Monday-Friday only)
   * Skips weekends as per business requirements
   */
  const navigateToPreviousDay = () => {
    const currentDate = new Date(date);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate days to subtract based on current day
    let daysToSubtract = 1;

    // If Monday, go back to Friday (3 days)
    if (dayOfWeek === 1) {
      daysToSubtract = 3;
    }
    // If Sunday (edge case), go back to Friday (2 days)
    else if (dayOfWeek === 0) {
      daysToSubtract = 2;
    }

    const previousDate = new Date(currentDate);
    previousDate.setDate(currentDate.getDate() - daysToSubtract);

    // Format and set the new date
    onDateChange(previousDate.toISOString().split('T')[0]);
  };

  /**
   * Navigate to the next business day (Monday-Friday only)
   * Skips weekends as per business requirements
   */
  const navigateToNextDay = () => {
    const currentDate = new Date(date);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate days to add based on current day
    let daysToAdd = 1;

    // If Friday, go forward to Monday (3 days)
    if (dayOfWeek === 5) {
      daysToAdd = 3;
    }
    // If Saturday (edge case), go forward to Monday (2 days)
    else if (dayOfWeek === 6) {
      daysToAdd = 2;
    }

    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + daysToAdd);

    // Format and set the new date
    onDateChange(nextDate.toISOString().split('T')[0]);
  };

  // Set today's date (if it's a weekend, choose the previous Friday or next Monday)
  const navigateToToday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const targetDate = new Date(today);

    // If weekend, adjust to closest business day
    if (dayOfWeek === 0) {
      // Sunday
      targetDate.setDate(today.getDate() + 1); // Next Monday
    } else if (dayOfWeek === 6) {
      // Saturday
      targetDate.setDate(today.getDate() - 1); // Previous Friday
    }

    onDateChange(targetDate.toISOString().split('T')[0]);
  };

  // Check if current date is a weekend (0 = Sunday, 6 = Saturday)
  const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;

  return (
    <div className={styles.dailyMetricsDisplay}>
      {/* Date Navigation */}
      <div className={styles.dateNavigation}>
        <button
          className={styles.btnDateNav}
          onClick={navigateToPreviousDay}
          aria-label="Previous business day"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <div className={styles.currentDate}>
          <span className={styles.dateIcon}>
            <FontAwesomeIcon icon={faCalendarAlt} />
          </span>
          <h3>{formattedDate}</h3>
          {isWeekend && (
            <div className={styles.weekendAlert}>
              Weekend days are not tracked. Please select a weekday.
            </div>
          )}
        </div>

        <div className={styles.dateActions}>
          <button className={styles.btnToday} onClick={navigateToToday}>
            Today
          </button>
          <button className={styles.btnNext} onClick={navigateToNextDay}>
            Next Day
          </button>
        </div>

        <button
          className={styles.btnDateNav}
          onClick={navigateToNextDay}
          aria-label="Next business day"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={styles.loadingState}>
          <FontAwesomeIcon icon={faCalendarAlt} className={styles.loadingIcon} spin />
          <p>Loading daily metrics...</p>
        </div>
      )}

      {/* Weekend State */}
      {isWeekend && !isLoading && (
        <div className={styles.weekendState}>
          <FontAwesomeIcon icon={faCalendarAlt} className={styles.weekendIcon} />
          <h3>Weekend Day Selected</h3>
          <p>
            Business metrics are tracked Monday through Friday only.
            <br />
            Please select a weekday to view or enter daily activity data.
          </p>
        </div>
      )}

      {/* Metrics Grid - Only show on weekdays and when not loading */}
      {!isWeekend && !isLoading && (
        <div className={styles.metricsGrid}>
          {/* Core Activity Metrics */}
          <div className={styles.metricsSection}>
            <h3 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faCalendarAlt} className={styles.sectionIcon} />
              Core Activity
            </h3>
            <div className={styles.metricsRow}>
              <MetricsCard
                metricId="contacts"
                title="Contacts"
                value={contactsMetric}
                type="contacts"
                color={METRIC_COLORS.contacts}
                onMetricChange={onMetricChange}
                showControls={true}
                enableIncrement={true}
                enableDecrement={true}
              />
              <MetricsCard
                metricId="life_conversations"
                title="Life Conversations"
                value={lifeConversationsMetric}
                type="life conversations"
                color={METRIC_COLORS['life conversations']}
                onMetricChange={onMetricChange}
                showControls={true}
                enableIncrement={true}
                enableDecrement={true}
              />
              <MetricsCard
                metricId="sales"
                title="Sales"
                value={salesMetric}
                type="sales"
                color={METRIC_COLORS.sales}
                onMetricChange={onMetricChange}
                showControls={true}
                enableIncrement={true}
                enableDecrement={true}
              />
            </div>
          </div>

          {/* Performance Metrics */}
          <div className={styles.metricsSection}>
            <h3 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faCalendarAlt} className={styles.sectionIcon} />
              Performance
            </h3>
            <div className={styles.metricsRow}>
              <MetricsCard
                metricId="asking_ratio"
                title="Asking Ratio"
                value={askingRatioMetric}
                type="asking ratio"
                color={METRIC_COLORS['asking ratio']}
                onMetricChange={onMetricChange}
                showControls={true}
                enableIncrement={true}
                enableDecrement={true}
                isPercentage={true}
              />
              <MetricsCard
                metricId="dials"
                title="Dials"
                value={dialsMetric}
                type="dials"
                color={METRIC_COLORS.dials}
                onMetricChange={onMetricChange}
                showControls={true}
                enableIncrement={true}
                enableDecrement={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
