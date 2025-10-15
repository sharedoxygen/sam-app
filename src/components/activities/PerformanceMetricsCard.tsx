'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faComments,
  faTag,
  faLayerGroup,
  faQuestionCircle,
  faSpinner,
  faClock,
  faCheckCircle,
  faExclamationTriangle,
  faPhone,
  faDollarSign,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { getMetricDescriptionByTitle } from '@/lib/constants/metricDescriptions';
import styles from './PerformanceMetricsCard.module.css';
import { areCSSVariablesLoaded } from '@/lib/utils/styleUtils';

interface MetricItem {
  label: string;
  icon: any;
  current: number;
  target: number;
  color: string;
  gradient: string;
  description: any;
  isMonetary?: boolean;
  average?: number;
}

interface PerformanceMetricsProps {
  peopleContacted: number;
  lifeSalesConversations: number;
  salesClosed: number;
  referralRequests: number;
  rawNew?: {
    count: number;
    percentage: number;
  };
  multiLine?: {
    count: number;
    percentage: number;
  };
  premiumAmount?: {
    total: number;
    average: number;
  };
  weeklyTrend?: number[];
  targets?: {
    peopleContacted?: number;
    lifeSalesConversations?: number;
    salesClosed?: number;
    referralRequests?: number;
    premiumAmount?: number;
    rawNew?: number;
    multiLine?: number;
  };
}

export default function PerformanceMetricsCard({
  peopleContacted,
  lifeSalesConversations,
  salesClosed,
  referralRequests,
  rawNew,
  multiLine,
  premiumAmount,
  weeklyTrend = [],
  targets = {},
}: PerformanceMetricsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [cssVariablesLoaded, setCssVariablesLoaded] = useState(false);

  const getDefaultDescription = (label: string): string => {
    const descriptions: Record<string, string> = {
      'People Contacted':
        'The number of potential clients you reached out to through calls, emails, or in-person meetings.',
      'Life/Sales Conversations':
        'Meaningful discussions with prospects about their insurance needs and product offerings.',
      'Sales Closed':
        'Successfully completed sales transactions resulting in new policies or coverage.',
      'Referral Requests':
        'The number of times you asked existing clients for referrals to new potential customers.',
      'Premium Amount':
        'Total monetary value of premiums generated from closed sales and policy renewals.',
      'Raw New (RN)':
        'Sales to customers who have never had insurance coverage before - high-value new business.',
      'Multi-Line (ML)':
        'Sales involving customers who purchase multiple types of insurance products.',
    };
    return descriptions[label] || 'Performance metric tracking your daily activities and results.';
  };

  useEffect(() => {
    const checkCSSVariables = () => {
      if (areCSSVariablesLoaded()) {
        setCssVariablesLoaded(true);
      } else {
        // Retry after a short delay
        setTimeout(checkCSSVariables, 100);
      }
    };

    checkCSSVariables();
  }, []);

  const calculatePercentage = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.round((current / target) * 100);
  };

  const getStatusColor = (current: number, target: number) => {
    const percentage = calculatePercentage(current, target);
    if (percentage >= 100) return '#28a745'; // Success green
    if (percentage >= 75) return '#20c997'; // Info teal
    if (percentage >= 50) return '#ffc107'; // Warning yellow
    return '#dc3545'; // Danger red
  };

  // Get performance status with proper icons and colors
  const getPerformanceStatus = (current: number, target: number) => {
    const percentage = calculatePercentage(current, target);
    if (percentage >= 100) {
      return {
        icon: faCheckCircle,
        text: 'Goal Achieved',
        color: '#28a745',
        class: 'success',
      };
    }
    if (percentage >= 75) {
      return {
        icon: faSpinner,
        text: 'Nearly There',
        color: '#20c997',
        class: 'info',
      };
    }
    if (percentage >= 50) {
      return {
        icon: faClock,
        text: 'In Progress',
        color: '#ffc107',
        class: 'warning',
      };
    }
    return {
      icon: faExclamationTriangle,
      text: 'Below Target',
      color: '#fd7e14',
      class: 'belowTarget',
    };
  };

  // Core metrics always available
  const metrics: MetricItem[] = [
    {
      label: 'People Contacted',
      icon: faPhone,
      current: peopleContacted,
      target: targets?.peopleContacted || 0, // Must be set by manager
      color: '#0d6efd',
      gradient: 'linear-gradient(135deg, #0d6efd, #6610f2)',
      description: getMetricDescriptionByTitle('People Contacted'),
      isMonetary: false,
    },
    {
      label: 'Life/Sales Conversations',
      icon: faComments,
      current: lifeSalesConversations,
      target: targets?.lifeSalesConversations || 0, // Must be set by manager
      color: '#20c997',
      gradient: 'linear-gradient(135deg, #20c997, #0dcaf0)',
      description: getMetricDescriptionByTitle('Life/Sales Conversations'),
      isMonetary: false,
    },
    {
      label: 'Sales Closed',
      icon: faCheckCircle,
      current: salesClosed,
      target: targets?.salesClosed || 0, // Must be set by manager
      color: '#198754',
      gradient: 'linear-gradient(135deg, #198754, #20c997)',
      description: getMetricDescriptionByTitle('Sales Closed'),
      isMonetary: false,
    },
    {
      label: 'Referral Requests',
      icon: faUserPlus,
      current: referralRequests,
      target: targets?.referralRequests || 0, // Must be set by manager
      color: '#fd7e14',
      gradient: 'linear-gradient(135deg, #fd7e14, #ffc107)',
      description: getMetricDescriptionByTitle('Referral Requests'),
      isMonetary: false,
    },
  ];

  // Add Premium Amount as a metric if available
  if (premiumAmount && premiumAmount.total > 0) {
    metrics.push({
      label: 'Premium Amount',
      icon: faDollarSign,
      current: Math.round(premiumAmount.total),
      target: targets?.premiumAmount || 0, // Target must be set by manager
      color: '#28a745',
      gradient: 'linear-gradient(135deg, #28a745, #20c997)',
      description: getMetricDescriptionByTitle('Premium Amount'),
      isMonetary: true,
      average: premiumAmount.average,
    });
  } else {
    // Always render Premium Amount card for grid alignment
    metrics.push({
      label: 'Premium Amount',
      icon: faDollarSign,
      current: 0,
      target: targets?.premiumAmount || 0, // Target must be set by manager
      color: '#28a745',
      gradient: 'linear-gradient(135deg, #28a745, #20c997)',
      description: getMetricDescriptionByTitle('Premium Amount'),
      isMonetary: true,
      average: 0,
    });
  }

  // Add Raw New (RN) as a metric card
  if (rawNew) {
    metrics.push({
      label: 'Raw New (RN)',
      icon: faTag,
      current: rawNew.count,
      target: targets?.rawNew || 0, // Must be set by manager
      color: '#6610f2',
      gradient: 'linear-gradient(135deg, #6610f2, #5a0fcf)',
      description: {
        detailedDescription:
          'Sales to customers who have never had insurance coverage before. These are high-value prospects as they represent completely new business.',
      },
    });
  } else {
    metrics.push({
      label: 'Raw New (RN)',
      icon: faTag,
      current: 0,
      target: targets?.rawNew || 0, // Must be set by manager
      color: '#6610f2',
      gradient: 'linear-gradient(135deg, #6610f2, #5a0fcf)',
      description: {
        detailedDescription: 'Sales to customers who have never had insurance coverage before.',
      },
    });
  }

  // Add Multi-Line (ML) as a metric card
  if (multiLine) {
    metrics.push({
      label: 'Multi-Line (ML)',
      icon: faLayerGroup,
      current: multiLine.count,
      target: targets?.multiLine || 0, // Must be set by manager
      color: '#6610f2',
      gradient: 'linear-gradient(135deg, #6610f2, #5a0fcf)',
      description: {
        detailedDescription:
          'Sales involving customers who purchase more than one type of insurance. Indicates successful cross-selling and higher customer value.',
      },
    });
  } else {
    metrics.push({
      label: 'Multi-Line (ML)',
      icon: faLayerGroup,
      current: 0,
      target: targets?.multiLine || 0, // Must be set by manager
      color: '#6610f2',
      gradient: 'linear-gradient(135deg, #6610f2, #5a0fcf)',
      description: {
        detailedDescription:
          'Sales involving customers who purchase more than one type of insurance.',
      },
    });
  }

  const getTotalPerformance = () => {
    const totalCurrent = metrics.reduce((sum, metric) => sum + metric.current, 0);
    const totalTarget = metrics.reduce((sum, metric) => sum + metric.target, 0);
    if (totalTarget === 0) return 0; // Avoid division by zero for overall performance
    return calculatePercentage(totalCurrent, totalTarget);
  };

  return (
    <div className={styles['performance-metrics-card']}>
      <div className={styles['card-header']}>
        <div className={styles['card-title-section']}>
          <div className={styles['card-icon']}>
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className={styles['card-title-info']}>
            <h3 className={styles['card-title']}>Performance Metrics</h3>
            <p className={styles['card-subtitle']}>Weekly Activity Performance Overview</p>
          </div>
        </div>
        <div className={styles['overall-performance']}>
          <div
            ref={(el) => {
              if (el && cssVariablesLoaded) {
                const progressValue = getTotalPerformance();
                el.style.setProperty('--progress', progressValue.toString());
                const status = getPerformanceStatus(progressValue, 100);
                el.style.setProperty('--progress-color', status.color);
              }
            }}
            className={`${styles['performance-circle']} ${styles['with-progress']} ${styles['overallMetricCircle']}`}
          >
            <span className={styles['performance-percentage']}>{getTotalPerformance()}%</span>
          </div>
          <span className={styles['performance-label']}>Overall</span>
        </div>
      </div>

      <div className={styles['metrics-grid']}>
        {metrics.map((metric, index) => {
          const status = getPerformanceStatus(metric.current, metric.target);
          return (
            <div
              key={index}
              className={styles['metric-item']}
              onMouseEnter={() => setActiveTooltip(`metric-${index}`)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div className={styles['metric-header']}>
                <div
                  className={`${styles['metric-icon']} ${styles['with-dynamic-color']}`}
                  ref={(el) => {
                    if (el && cssVariablesLoaded) {
                      el.style.setProperty('--metric-color', metric.color);
                      el.style.setProperty('--metric-gradient', metric.gradient);
                    }
                  }}
                >
                  <FontAwesomeIcon icon={metric.icon} />
                </div>
                <div
                  className={styles['info-icon-container']}
                  onMouseEnter={() => setActiveTooltip(`info-${index}`)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <FontAwesomeIcon icon={faQuestionCircle} className={styles['info-icon']} />
                </div>
              </div>

              <div className={styles['metric-content']}>
                <span
                  className={`${styles['current-value']} ${styles['with-dynamic-color']}`}
                  ref={(el) => {
                    if (el && cssVariablesLoaded) {
                      el.style.setProperty('--metric-color', metric.color);
                    }
                  }}
                >
                  {metric.isMonetary
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(metric.current)
                    : metric.current}
                </span>
                <span className={styles['target-value']}>
                  /{' '}
                  {metric.isMonetary
                    ? new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(metric.target)
                    : metric.target}
                </span>
              </div>

              <div className={styles['metric-title']}>
                {metric.label}
                {metric.isMonetary && metric.average && (
                  <div className={styles['metric-subtitle']}>
                    Avg:{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(metric.average)}{' '}
                    per sale
                  </div>
                )}
              </div>

              <div className={styles['progress-container']}>
                <div className={styles['progress-track']}>
                  <div
                    ref={(el) => {
                      if (el && cssVariablesLoaded) {
                        el.style.width = `${calculatePercentage(metric.current, metric.target)}%`;
                        el.style.setProperty('--progress-color', status.color);
                        el.style.setProperty('--progress-gradient', metric.gradient);
                      }
                    }}
                    className={`${styles['progress-fill']} ${styles['with-dynamic-color']}`}
                  ></div>
                </div>
                <span
                  className={`${styles['metric-percentage']} ${styles['with-dynamic-color']}`}
                  ref={(el) => {
                    if (el && cssVariablesLoaded) {
                      el.style.setProperty('--metric-color', status.color);
                    }
                  }}
                >
                  {calculatePercentage(metric.current, metric.target)}%
                </span>
              </div>

              <div
                className={`${styles['metric-indicator']} ${styles[status.class]}`}
                ref={(el) => {
                  if (el && cssVariablesLoaded) {
                    el.style.setProperty('--status-color', status.color);
                  }
                }}
              >
                <FontAwesomeIcon
                  icon={status.icon}
                  className={`${styles['indicator-icon']} ${styles['with-dynamic-color']} ${status.icon === faSpinner ? styles['spinning'] : ''}`}
                />
                <span className={styles['indicator-text']}>{status.text}</span>
              </div>

              {/* Metric Tooltip */}
              {activeTooltip === `metric-${index}` && (
                <div className={`${styles['metric-tooltip']} ${styles['visible']}`}>
                  <div className={styles['tooltip-content']}>
                    <div className={styles['tooltip-header']}>
                      <strong>{metric.label}</strong>
                      <span className={styles['tooltip-close']}>&times;</span>
                    </div>
                    <div className={styles['tooltip-body']}>
                      <p>
                        Current: <strong>{metric.current}</strong>
                      </p>
                      <p>
                        Target: <strong>{metric.target}</strong>
                      </p>
                      <p>
                        Progress:{' '}
                        <strong>{calculatePercentage(metric.current, metric.target)}%</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Tooltip */}
              {activeTooltip === `info-${index}` && (
                <div className={`${styles['metric-tooltip']} ${styles['visible']}`}>
                  <div className={styles['tooltip-content']}>
                    <div className={styles['tooltip-header']}>
                      <strong>{metric.label}</strong>
                      <span className={styles['metric-category']}>KPI</span>
                    </div>
                    <div className={styles['tooltip-description']}>
                      {metric.description?.detailedDescription ||
                        getDefaultDescription(metric.label)}
                    </div>
                    {metric.isMonetary && (
                      <div className={styles['tooltip-example']}>
                        <strong>Note:</strong> Premium amounts should reflect actual revenue
                        generated from closed sales.
                      </div>
                    )}
                    {metric.label.includes('RN') && (
                      <div className={styles['tooltip-example']}>
                        <strong>Example:</strong> A customer who has never had insurance coverage
                        before purchasing their first policy.
                      </div>
                    )}
                    {metric.label.includes('ML') && (
                      <div className={styles['tooltip-example']}>
                        <strong>Example:</strong> A customer who purchases auto insurance AND life
                        insurance from you.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {weeklyTrend.length > 0 && (
        <div className={styles['trend-section']}>
          <h4 className={styles['trend-title']}>Weekly Trend</h4>
          <div className={styles['trend-chart']}>
            {weeklyTrend.map((value, index) => {
              const colors = [
                '#4f46e5', // Monday - Indigo
                '#06b6d4', // Tuesday - Cyan
                '#10b981', // Wednesday - Emerald
                '#f59e0b', // Thursday - Amber
                '#ef4444', // Friday - Red
              ];

              return (
                <div
                  key={index}
                  ref={(el) => {
                    if (el && cssVariablesLoaded) {
                      el.style.setProperty(
                        '--trend-gradient',
                        `linear-gradient(135deg, ${colors[index]}, ${colors[index]}dd)`
                      );
                    }
                  }}
                  className={styles['trend-bar']}
                >
                  <div
                    ref={(el) => {
                      if (el && cssVariablesLoaded) {
                        el.style.height = `${Math.max((value / Math.max(...weeklyTrend, 1)) * 100, 8)}%`;
                      }
                    }}
                    className={`${styles['trend-fill']} ${styles['with-dynamic-gradient']}`}
                  />
                  <span className={styles['trend-day']}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
