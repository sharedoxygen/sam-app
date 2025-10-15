'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faUsers,
  faCheckCircle,
  faExclamationTriangle,
  faPhone,
  faUser,
  faArrowTrendUp,
  faTag,
  faLayerGroup,
  faDollarSign,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';
import { WeeklyMetrics } from '@/lib/weekly-performance/types';
import { formatMetricValue, getPerformanceStatus } from '@/lib/weekly-performance/utils';
import styles from './PerformanceMetricsCard.module.css';

type PerformanceData = {
  peopleContacted: { actual: number; forecast: number; percentage: number; variance: number };
  lifeSalesConversations: {
    actual: number;
    forecast: number;
    percentage: number;
    variance: number;
  };
  sales: { actual: number; forecast: number; percentage: number; variance: number };
  referralRequests: { actual: number; forecast: number; percentage: number; variance: number };
  premiumAmount?: { actual: number; forecast: number; percentage: number; variance: number };
};

interface PerformanceMetricsCardProps {
  title: string;
  metrics: WeeklyMetrics;
  performanceData?: PerformanceData | null;
  isTeamSummary?: boolean;
  userRole?: string;
  canSetTargets?: boolean;
  onEditTargets?: () => void;
}

export default function PerformanceMetricsCard({
  title,
  metrics,
  performanceData,
  isTeamSummary = false,
  userRole,
  canSetTargets,
  onEditTargets,
}: PerformanceMetricsCardProps) {
  // Check if all targets are zero (not set)
  const allTargetsZero =
    !performanceData &&
    metrics.peopleContacted === 0 &&
    metrics.lifeSalesConversations === 0 &&
    metrics.sales === 0 &&
    metrics.referralRequests === 0;

  // Helper function to get target display text
  const getTargetDisplayText = (value: number) => {
    if (value === 0) {
      if (canSetTargets) {
        return 'Not set - Click edit to set targets';
      }
      return 'Not set by manager';
    }
    return 'Planned interaction target';
  };

  // Helper function to get metric value display
  const getMetricValueDisplay = (value: number) => {
    if (value === 0 && allTargetsZero) {
      return canSetTargets ? '—' : '—';
    }
    return formatMetricValue(value);
  };

  return (
    <div className={styles.metricsCard}>
      <div className={styles.metricsHeader}>
        <div className={styles.headerContent}>
          <h3 className={styles.cardTitle}>
            <FontAwesomeIcon icon={isTeamSummary ? faUsers : faChartLine} />
            {title}
          </h3>
          {isTeamSummary && (
            <p className={styles.cardSubtitle}>Aggregated analytics across team members</p>
          )}
          {!isTeamSummary && !performanceData && allTargetsZero && (
            <p className={styles.cardSubtitle}>
              {canSetTargets
                ? '⚠️ Performance targets not set - Click edit to configure targets for agents'
                : '⚠️ Performance targets not yet configured by your manager'}
            </p>
          )}
          {!isTeamSummary && !performanceData && !allTargetsZero && (
            <p className={styles.cardSubtitle}>
              Target metrics derived from planned agent interactions
            </p>
          )}
          {!isTeamSummary && performanceData && (
            <p className={styles.cardSubtitle}>
              Analytics calculated from actual agent interactions vs targets
            </p>
          )}
        </div>
        {!isTeamSummary && canSetTargets && onEditTargets && (
          <button
            className={styles.editTargetsBtn}
            onClick={onEditTargets}
            title="Edit performance targets"
          >
            <FontAwesomeIcon icon={faEdit} />
            {allTargetsZero ? 'Set Targets' : 'Edit Targets'}
          </button>
        )}
        {isTeamSummary && (
          <div className={styles.teamBadge}>
            <FontAwesomeIcon icon={faUsers} />
            Team Analytics
          </div>
        )}
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricItemContacts}>
          <div className={styles.metricIcon}>
            <FontAwesomeIcon icon={faPhone} />
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>People Contacted</div>
            <div className={styles.metricValue}>
              {getMetricValueDisplay(metrics.peopleContacted)}
            </div>
            {performanceData && (
              <div
                className={`${styles.metricPerformance} ${getPerformanceStatus(performanceData.peopleContacted.percentage).class}`}
              >
                <FontAwesomeIcon
                  icon={
                    getPerformanceStatus(performanceData.peopleContacted.percentage).icon ===
                    'faCheckCircle'
                      ? faCheckCircle
                      : faExclamationTriangle
                  }
                />
                {performanceData.peopleContacted.percentage.toFixed(1)}% of target
              </div>
            )}
            {!performanceData && (
              <div className={styles.metricTarget}>
                {getTargetDisplayText(metrics.peopleContacted)}
              </div>
            )}
          </div>
        </div>

        <div className={styles.metricItemConversations}>
          <div className={styles.metricIcon}>
            <FontAwesomeIcon icon={faUser} />
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Life/Sales Conversations</div>
            <div className={styles.metricValue}>
              {getMetricValueDisplay(metrics.lifeSalesConversations)}
            </div>
            {performanceData && (
              <div
                className={`${styles.metricPerformance} ${getPerformanceStatus(performanceData.lifeSalesConversations.percentage).class}`}
              >
                <FontAwesomeIcon
                  icon={
                    getPerformanceStatus(performanceData.lifeSalesConversations.percentage).icon ===
                    'faCheckCircle'
                      ? faCheckCircle
                      : faExclamationTriangle
                  }
                />
                {performanceData.lifeSalesConversations.percentage.toFixed(1)}% of target
              </div>
            )}
            {!performanceData && (
              <div className={styles.metricTarget}>
                {getTargetDisplayText(metrics.lifeSalesConversations)}
              </div>
            )}
          </div>
        </div>

        <div className={styles.metricItemSales}>
          <div className={styles.metricIcon}>
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Sales Closed</div>
            <div className={styles.metricValue}>{getMetricValueDisplay(metrics.sales)}</div>
            {performanceData && (
              <div
                className={`${styles.metricPerformance} ${getPerformanceStatus(performanceData.sales.percentage).class}`}
              >
                <FontAwesomeIcon
                  icon={
                    getPerformanceStatus(performanceData.sales.percentage).icon === 'faCheckCircle'
                      ? faCheckCircle
                      : faExclamationTriangle
                  }
                />
                {performanceData.sales.percentage.toFixed(1)}% of target
              </div>
            )}
            {!performanceData && (
              <div className={styles.metricTarget}>{getTargetDisplayText(metrics.sales)}</div>
            )}
          </div>
        </div>

        <div className={styles.metricItemReferrals}>
          <div className={styles.metricIcon}>
            <FontAwesomeIcon icon={faArrowTrendUp} />
          </div>
          <div className={styles.metricContent}>
            <div className={styles.metricLabel}>Referral Requests</div>
            <div className={styles.metricValue}>
              {getMetricValueDisplay(metrics.referralRequests)}
            </div>
            {performanceData && (
              <div
                className={`${styles.metricPerformance} ${getPerformanceStatus(performanceData.referralRequests.percentage).class}`}
              >
                <FontAwesomeIcon
                  icon={
                    getPerformanceStatus(performanceData.referralRequests.percentage).icon ===
                    'faCheckCircle'
                      ? faCheckCircle
                      : faExclamationTriangle
                  }
                />
                {performanceData.referralRequests.percentage.toFixed(1)}% of target
              </div>
            )}
            {!performanceData && (
              <div className={styles.metricTarget}>
                {getTargetDisplayText(metrics.referralRequests)}
              </div>
            )}
          </div>
        </div>

        {/* Premium Amount Metric */}
        {metrics.premiumAmount !== undefined && (
          <div className={styles.metricItemPremium}>
            <div className={styles.metricIcon}>
              <FontAwesomeIcon icon={faDollarSign} />
            </div>
            <div className={styles.metricContent}>
              <div className={styles.metricLabel}>Premium Amount</div>
              <div className={styles.metricValue}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(metrics.premiumAmount || 0)}
              </div>
              {performanceData && performanceData.premiumAmount && (
                <div
                  className={`${styles.metricPerformance} ${getPerformanceStatus(performanceData.premiumAmount.percentage).class}`}
                >
                  <FontAwesomeIcon
                    icon={
                      getPerformanceStatus(performanceData.premiumAmount.percentage).icon ===
                      'faCheckCircle'
                        ? faCheckCircle
                        : faExclamationTriangle
                    }
                  />
                  {performanceData.premiumAmount.percentage.toFixed(1)}% of target
                </div>
              )}
              {!performanceData && (
                <div className={styles.metricTarget}>
                  {getTargetDisplayText(metrics.premiumAmount || 0)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Indicators Section for Raw New and Multi-line - Always show if metrics exist */}
      <div className={styles.indicatorsSection}>
        <h4 className={styles.indicatorsTitle}>Sales Record Indicators</h4>
        <div className={styles.indicatorsGrid}>
          <div className={styles.indicatorItem}>
            <div className={styles.indicatorIconRn}>
              <FontAwesomeIcon icon={faTag} />
            </div>
            <div className={styles.indicatorContent}>
              <div className={styles.indicatorLabel}>Raw New (RN)</div>
              <div className={styles.indicatorValue}>
                <span className={styles.indicatorCount}>{metrics.rawNew || 0}</span>
                {metrics.sales && metrics.sales > 0 && (
                  <span className={styles.indicatorPercentage}>
                    ({Math.round(((metrics.rawNew || 0) / metrics.sales) * 100)}% of sales)
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.indicatorItem}>
            <div className={styles.indicatorIconMl}>
              <FontAwesomeIcon icon={faLayerGroup} />
            </div>
            <div className={styles.indicatorContent}>
              <div className={styles.indicatorLabel}>Multi-line (ML)</div>
              <div className={styles.indicatorValue}>
                <span className={styles.indicatorCount}>{metrics.multiLine || 0}</span>
                {metrics.sales && metrics.sales > 0 && (
                  <span className={styles.indicatorPercentage}>
                    ({Math.round(((metrics.multiLine || 0) / metrics.sales) * 100)}% of sales)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
