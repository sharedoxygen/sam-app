'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPhone,
  faUsers,
  faHandshake,
  faArrowTrendUp,
  faChartLine,
  faPercentage,
  faExclamationTriangle,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Import CSS module
import styles from './ModernPerformanceCharts.module.css';

// Performance metrics type
type PerformanceMetric = {
  actual: number;
  forecast: number;
  percentage: number;
  variance: number;
};

type PerformanceMetrics = {
  peopleContacted: PerformanceMetric;
  lifeSalesConversations: PerformanceMetric;
  sales: PerformanceMetric;
  referralRequests: PerformanceMetric;
};

// Weekly forecast data structure
type WeeklyForecast = {
  peopleContacted: number;
  lifeSalesConversations: number;
  sales: number;
  referralRequests: number;
};

type ModernPerformanceChartsProps = {
  forecast: WeeklyForecast;
  actual: WeeklyForecast;
  performanceMetrics: PerformanceMetrics;
  userRole: string;
};

export default function ModernPerformanceCharts({
  forecast,
  actual,
  performanceMetrics,
  userRole,
}: ModernPerformanceChartsProps) {
  // Modern color palette
  const colors = {
    primary: '#4a90e2',
    primaryGradient: 'linear-gradient(135deg, #4a90e2, #357abd)',
    success: '#28a745',
    successGradient: 'linear-gradient(135deg, #28a745, #20c997)',
    warning: '#fd7e14',
    warningGradient: 'linear-gradient(135deg, #fd7e14, #e8690b)',
    danger: '#dc3545',
    dangerGradient: 'linear-gradient(135deg, #dc3545, #c82333)',
    info: '#20c997',
    infoGradient: 'linear-gradient(135deg, #20c997, #17a2b8)',
    gray: '#6c757d',
    light: '#f8f9fa',
    dark: '#343a40',
  };

  // KPI metrics configuration
  const kpiMetrics = [
    {
      key: 'peopleContacted',
      title: 'People Contacted',
      icon: faPhone,
      color: colors.primary,
      gradient: colors.primaryGradient,
    },
    {
      key: 'lifeSalesConversations',
      title: 'Life/Sales Conversations',
      icon: faUsers,
      color: colors.info,
      gradient: colors.infoGradient,
    },
    {
      key: 'sales',
      title: 'Sales Closed',
      icon: faHandshake,
      color: colors.success,
      gradient: colors.successGradient,
    },
    {
      key: 'referralRequests',
      title: 'Referral Requests',
      icon: faArrowTrendUp,
      color: colors.warning,
      gradient: colors.warningGradient,
    },
  ];

  // Get performance status - simplified to text and color, icon handled by card
  const getPerformanceStatus = (percentage: number) => {
    if (percentage >= 100) return { text: 'Excellent', color: colors.success };
    if (percentage >= 80) return { text: 'Good', color: colors.info };
    if (percentage >= 60) return { text: 'Fair', color: colors.warning }; // Changed from warning to fair for text
    return { text: 'Poor', color: colors.danger };
  };

  // Modern chart options
  const modernChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'normal' as const,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6c757d',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
            weight: 'normal' as const,
          },
          color: '#6c757d',
        },
      },
    },
  };

  // Performance comparison chart
  const performanceComparisonData = useMemo(() => {
    const labels = kpiMetrics.map((metric) => metric.title);
    const forecastValues = kpiMetrics.map((metric) => forecast[metric.key as keyof WeeklyForecast]);
    const actualValues = kpiMetrics.map((metric) => actual[metric.key as keyof WeeklyForecast]);

    return {
      labels,
      datasets: [
        {
          label: 'Target',
          data: forecastValues,
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          borderColor: colors.primary,
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Actual',
          data: actualValues,
          backgroundColor: 'rgba(40, 167, 69, 0.8)',
          borderColor: colors.success,
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [forecast, actual, kpiMetrics, colors]);

  // Achievement trend chart
  const achievementTrendData = useMemo(() => {
    const labels = kpiMetrics.map((metric) => metric.title);
    const percentages = kpiMetrics.map(
      (metric) => performanceMetrics[metric.key as keyof PerformanceMetrics].percentage
    );

    return {
      labels,
      datasets: [
        {
          label: 'Achievement %',
          data: percentages,
          borderColor: colors.primary,
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: colors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  }, [performanceMetrics, kpiMetrics, colors]);

  // Performance distribution chart
  const performanceDistributionData = useMemo(() => {
    const achievements = kpiMetrics.map(
      (metric) => performanceMetrics[metric.key as keyof PerformanceMetrics].percentage
    );
    const labels = kpiMetrics.map((metric) => metric.title);

    return {
      labels,
      datasets: [
        {
          data: achievements,
          backgroundColor: kpiMetrics.map((metric) => metric.color),
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    };
  }, [performanceMetrics, kpiMetrics]);

  // Render KPI card - updated to look more like StatCard
  const renderKPICard = (metric: any) => {
    const performanceData = performanceMetrics[metric.key as keyof PerformanceMetrics];
    if (!performanceData) return null; // Should not happen if data is correct

    const status = getPerformanceStatus(performanceData.percentage);

    // Determine an icon for the status, similar to StatCard trends
    let statusIcon = faCheckCircle;
    if (performanceData.percentage < 80 && performanceData.percentage >= 60)
      statusIcon = faExclamationTriangle;
    else if (performanceData.percentage < 60) statusIcon = faExclamationTriangle; // Could use a different one for poor if desired

    return (
      <div
        key={metric.key}
        className={styles.styledKpiCard}
        ref={(el) => {
          if (el) {
            el.style.setProperty('--metric-color', metric.color);
            el.style.setProperty('--status-color', status.color);
          }
        }}
      >
        <div className={styles.kpiCardHeader}>
          <h3 className={styles.kpiCardTitle}>{metric.title}</h3>
          <div className={`${styles.kpiMetricIcon} ${styles.withDynamicColor}`}>
            <FontAwesomeIcon icon={metric.icon} size="lg" />
          </div>
        </div>
        <p className={`${styles.kpiCardValue} ${styles.withDynamicColor}`}>
          {performanceData.actual}
          <span className={styles.kpiTargetValue}> (Target: {performanceData.forecast})</span>
        </p>
        <div className={styles.kpiAchievementDetails}>
          <div
            className={`${styles.kpiPerformanceText} ${styles.withDynamicColor} ${status.text.toLowerCase()}`}
          >
            <FontAwesomeIcon icon={statusIcon} />
            <span>
              {status.text} ({performanceData.percentage.toFixed(1)}%)
            </span>
          </div>
          <div
            className={`${styles.kpiVariance} ${performanceData.variance >= 0 ? styles.positive : styles.negative}`}
          >
            (Variance: {performanceData.variance >= 0 ? '+' : ''}
            {performanceData.variance})
          </div>
        </div>
        {/* Simplified Progress Bar */}
        <div className={styles.kpiProgressBarContainer}>
          <div
            className={`${styles.kpiProgressBarFill} ${styles.withDynamicColor}`}
            ref={(el) => {
              if (el) {
                el.style.width = `${Math.min(performanceData.percentage, 100)}%`;
              }
            }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.modernPerformanceCharts}>
      {/* KPI Overview Cards - Using new class name */}
      <div className={styles.kpiOverview}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            {/* <FontAwesomeIcon icon={faBullseye} /> */}
            Agent Interaction Metrics
          </h3>
          {/* <p className="section-description">
            Metrics calculated and derived from actual agent interactions and daily activities
          </p> */}
        </div>
        <div className={styles.kpiGrid}>{kpiMetrics.map(renderKPICard)}</div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsSection}>
        <div className={styles.chartsGrid}>
          {/* Performance Comparison Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div className={styles.chartTitle}>
                <FontAwesomeIcon icon={faChartLine} />
                <h4>Target vs Actual Interactions</h4>
              </div>
              <p className={styles.chartDescription}>
                Compare planned interaction targets with results calculated from actual agent
                activities
              </p>
            </div>
            <div className={styles.chartContainer}>
              <Bar data={performanceComparisonData} options={modernChartOptions} />
            </div>
          </div>

          {/* Achievement Trend Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div className={styles.chartTitle}>
                <FontAwesomeIcon icon={faArrowTrendUp} />
                <h4>Interaction Achievement Trend</h4>
              </div>
              <p className={styles.chartDescription}>
                Track achievement percentages calculated from agent interactions across all
                categories
              </p>
            </div>
            <div className={styles.chartContainer}>
              <Line data={achievementTrendData} options={modernChartOptions} />
            </div>
          </div>

          {/* Performance Distribution */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div className={styles.chartTitle}>
                <FontAwesomeIcon icon={faPercentage} />
                <h4>Interaction Analytics Distribution</h4>
              </div>
              <p className={styles.chartDescription}>
                Performance breakdown calculated from agent interactions, organized by activity
                category
              </p>
            </div>
            <div className={styles.chartContainer}>
              <Doughnut
                data={performanceDistributionData}
                options={{
                  ...modernChartOptions,
                  plugins: {
                    ...modernChartOptions.plugins,
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                          size: 11,
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
