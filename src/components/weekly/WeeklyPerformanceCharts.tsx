'use client';

import React from 'react';
import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut, PolarArea } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar,
  faChartLine,
  faChartPie,
  faBullseye,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Import CSS module
import styles from './WeeklyPerformanceCharts.module.css';

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

type WeeklyPerformanceChartsProps = {
  forecast: WeeklyForecast;
  actual: WeeklyForecast;
  performanceMetrics: PerformanceMetrics;
  userRole: string;
};

export default function WeeklyPerformanceCharts({
  forecast,
  actual,
  performanceMetrics,
  userRole,
}: WeeklyPerformanceChartsProps) {
  // Color scheme based on themes
  const colors = {
    primary: 'rgba(74, 144, 226, 0.8)',
    primaryLight: 'rgba(74, 144, 226, 0.3)',
    success: 'rgba(25, 135, 84, 0.8)',
    successLight: 'rgba(25, 135, 84, 0.3)',
    warning: 'rgba(253, 126, 20, 0.8)',
    warningLight: 'rgba(253, 126, 20, 0.3)',
    info: 'rgba(32, 201, 151, 0.8)',
    infoLight: 'rgba(32, 201, 151, 0.3)',
    danger: 'rgba(220, 53, 69, 0.8)',
    dangerLight: 'rgba(220, 53, 69, 0.3)',
  };

  // Generate performance insights
  const generatePerformanceInsights = () => {
    const avgPerformance =
      (performanceMetrics.peopleContacted.percentage +
        performanceMetrics.lifeSalesConversations.percentage +
        performanceMetrics.sales.percentage +
        performanceMetrics.referralRequests.percentage) /
      4;

    const salesPerformance = performanceMetrics.sales.percentage;
    const activityPerformance = performanceMetrics.peopleContacted.percentage;
    const conversionPerformance = performanceMetrics.lifeSalesConversations.percentage;

    if (avgPerformance >= 100) {
      return `Outstanding week! Exceeded forecast targets with ${avgPerformance.toFixed(0)}% overall achievement. You're demonstrating exceptional performance across all metrics.`;
    } else if (salesPerformance >= 100) {
      return `Excellent sales performance at ${salesPerformance.toFixed(0)}% of target! Your conversion skills are strong - maintain this momentum while ensuring consistent activity levels.`;
    } else if (activityPerformance >= 100 && salesPerformance < 80) {
      return `High activity levels detected (${activityPerformance.toFixed(0)}% of target) but sales below expectation. Focus on improving call quality and closing techniques.`;
    } else if (avgPerformance >= 80) {
      return `Good progress at ${avgPerformance.toFixed(0)}% of weekly targets. You're on track - maintain consistency and focus on areas showing gaps to finish strong.`;
    } else if (avgPerformance >= 60) {
      return `Moderate performance at ${avgPerformance.toFixed(0)}% of targets. Increase daily activity and review your approach to close the gap to forecast.`;
    } else {
      return `Performance needs attention at ${avgPerformance.toFixed(0)}% of targets. Consider reviewing your strategy and seeking coaching support to improve results.`;
    }
  };

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // Radar chart specific options
  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `${context.label}: ${context.parsed}%`,
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 120,
        ticks: {
          stepSize: 20,
        },
      },
    },
  };

  // Forecast vs Actual Bar Chart
  const forecastVsActualData = useMemo(() => {
    const metrics = ['People Contacted', 'Life Conversations', 'Sales', 'Referrals'];
    const forecastValues = [
      forecast.peopleContacted,
      forecast.lifeSalesConversations,
      forecast.sales,
      forecast.referralRequests,
    ];
    const actualValues = [
      actual.peopleContacted,
      actual.lifeSalesConversations,
      actual.sales,
      actual.referralRequests,
    ];

    return {
      labels: metrics,
      datasets: [
        {
          label: 'Forecast Target',
          data: forecastValues,
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          borderWidth: 2,
        },
        {
          label: 'Actual Achievement',
          data: actualValues,
          backgroundColor: colors.success,
          borderColor: colors.success,
          borderWidth: 2,
        },
      ],
    };
  }, [forecast, actual, colors]);

  // Performance Achievement Doughnut Chart
  const achievementData = useMemo(() => {
    const achievements = [
      performanceMetrics.peopleContacted.percentage,
      performanceMetrics.lifeSalesConversations.percentage,
      performanceMetrics.sales.percentage,
      performanceMetrics.referralRequests.percentage,
    ];

    return {
      labels: ['People Contacted', 'Life Conversations', 'Sales', 'Referrals'],
      datasets: [
        {
          data: achievements,
          backgroundColor: [colors.primary, colors.info, colors.success, colors.warning],
          borderColor: [colors.primary, colors.info, colors.success, colors.warning],
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [performanceMetrics, colors]);

  // Variance Line Chart
  const varianceData = useMemo(() => {
    const metrics = ['People Contacted', 'Life Conversations', 'Sales', 'Referrals'];
    const variances = [
      performanceMetrics.peopleContacted.variance,
      performanceMetrics.lifeSalesConversations.variance,
      performanceMetrics.sales.variance,
      performanceMetrics.referralRequests.variance,
    ];

    return {
      labels: metrics,
      datasets: [
        {
          label: 'Performance Variance',
          data: variances,
          borderColor: colors.info,
          backgroundColor: colors.infoLight,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: colors.info,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
        },
      ],
    };
  }, [performanceMetrics, colors]);

  // PolarArea Chart for Overall Performance
  const radarData = useMemo(() => {
    const percentages = [
      performanceMetrics.peopleContacted.percentage,
      performanceMetrics.lifeSalesConversations.percentage,
      performanceMetrics.sales.percentage,
      performanceMetrics.referralRequests.percentage,
    ];

    return {
      labels: ['People Contacted', 'Life Conversations', 'Sales', 'Referrals'],
      datasets: [
        {
          label: 'Achievement %',
          data: percentages,
          backgroundColor: [colors.primary, colors.info, colors.success, colors.warning],
          borderColor: [colors.primary, colors.info, colors.success, colors.warning],
          borderWidth: 2,
        },
      ],
    };
  }, [performanceMetrics, colors]);

  // Get role-specific insights
  const getRoleInsights = () => {
    const role = userRole.toUpperCase();

    // Advanced calculations for better business insights
    const totalContacts = actual.peopleContacted || 1; // Avoid division by zero
    const totalSales = actual.sales || 0;
    const totalConversations = actual.lifeSalesConversations || 0;
    const totalReferrals = actual.referralRequests || 0;

    // Calculate advanced metrics
    const salesVelocity = totalSales / Math.max(totalContacts, 1);
    const conversationQuality = totalSales / Math.max(totalConversations, 1);
    const referralEffectiveness = totalReferrals / Math.max(totalContacts, 1);
    const engagementDepth = totalConversations / Math.max(totalContacts, 1);

    if (role.includes('SALES')) {
      // Sales-focused calculations
      const prospectingEfficiency = (totalConversations / Math.max(totalContacts, 1)) * 100;
      const closingPower = (totalSales / Math.max(totalConversations, 1)) * 100;
      const networkGrowth = (totalReferrals / Math.max(totalSales, 1)) * 100;

      return {
        title: 'Sales Performance Intelligence',
        insights: [
          {
            metric: 'Prospecting Efficiency',
            value: `${Math.round(prospectingEfficiency)}%`,
            description: 'Contacts converted to meaningful sales conversations',
            trend:
              prospectingEfficiency > 25
                ? 'excellent'
                : prospectingEfficiency > 15
                  ? 'good'
                  : 'needs-focus',
          },
          {
            metric: 'Closing Power',
            value: `${Math.round(closingPower)}%`,
            description: 'Sales conversations converted to closed deals',
            trend: closingPower > 30 ? 'excellent' : closingPower > 20 ? 'good' : 'needs-focus',
          },
          {
            metric: 'Network Multiplication',
            value: `${Math.round(networkGrowth)}%`,
            description: 'Referral requests per sale (network growth rate)',
            trend: networkGrowth > 150 ? 'excellent' : networkGrowth > 100 ? 'good' : 'needs-focus',
          },
        ],
      };
    } else if (role.includes('SERVICE')) {
      // Service-focused calculations
      const serviceToSalesConversion = (totalSales / Math.max(totalContacts, 1)) * 100;
      const crossSellSuccess = (totalConversations / Math.max(totalContacts, 1)) * 100;
      const clientAdvocacy = (totalReferrals / Math.max(totalContacts, 1)) * 100;

      return {
        title: 'Service Excellence Intelligence',
        insights: [
          {
            metric: 'Service-to-Sales Conversion',
            value: `${Math.round(serviceToSalesConversion)}%`,
            description: 'Service interactions that generate new sales',
            trend:
              serviceToSalesConversion > 15
                ? 'excellent'
                : serviceToSalesConversion > 8
                  ? 'good'
                  : 'needs-focus',
          },
          {
            metric: 'Cross-Sell Mastery',
            value: `${Math.round(crossSellSuccess)}%`,
            description: 'Service contacts expanded to product conversations',
            trend:
              crossSellSuccess > 40 ? 'excellent' : crossSellSuccess > 25 ? 'good' : 'needs-focus',
          },
          {
            metric: 'Client Advocacy Rate',
            value: `${Math.round(clientAdvocacy)}%`,
            description: 'Service interactions that generate referral requests',
            trend: clientAdvocacy > 20 ? 'excellent' : clientAdvocacy > 12 ? 'good' : 'needs-focus',
          },
        ],
      };
    } else {
      // General agent calculations with business focus
      const overallEfficiency = (totalSales / Math.max(totalContacts, 1)) * 100;
      const engagementQuality = (totalConversations / Math.max(totalContacts, 1)) * 100;
      const businessDevelopment = (totalReferrals / Math.max(totalContacts, 1)) * 100;

      return {
        title: 'Agent Performance Intelligence',
        insights: [
          {
            metric: 'Contact-to-Sale Efficiency',
            value: `${Math.round(overallEfficiency)}%`,
            description: 'Overall conversion from contacts to closed sales',
            trend:
              overallEfficiency > 12 ? 'excellent' : overallEfficiency > 7 ? 'good' : 'needs-focus',
          },
          {
            metric: 'Engagement Quality Index',
            value: `${Math.round(engagementQuality)}%`,
            description: 'Contacts that develop into meaningful conversations',
            trend:
              engagementQuality > 30
                ? 'excellent'
                : engagementQuality > 20
                  ? 'good'
                  : 'needs-focus',
          },
          {
            metric: 'Business Development Rate',
            value: `${Math.round(businessDevelopment)}%`,
            description: 'Contacts that generate referral opportunities',
            trend:
              businessDevelopment > 15
                ? 'excellent'
                : businessDevelopment > 10
                  ? 'good'
                  : 'needs-focus',
          },
        ],
      };
    }
  };

  const roleInsights = getRoleInsights();

  return (
    <div className={styles.weeklyPerformanceCharts}>
      <div className={styles.chartsHeader}>
        <h2>Weekly Performance Analysis</h2>
        <span className={styles.userRole}>{userRole}</span>
      </div>

      {/* Add performance insights */}
      <div className={styles.performanceInsights}>
        <div className={styles.insightText}>
          <FontAwesomeIcon icon={faLightbulb} />
          {generatePerformanceInsights()}
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Forecast vs Actual Chart */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartBar} />
            <h3>Forecast vs Actual Performance</h3>
          </div>
          <div className={styles.chartWrapper}>
            <Bar data={forecastVsActualData} options={chartOptions} />
          </div>
          <div className={styles.chartInsight}>
            <FontAwesomeIcon icon={faLightbulb} />
            <span>
              {performanceMetrics.sales.actual >= performanceMetrics.sales.forecast
                ? 'Exceeding sales forecast shows strong execution and market opportunity.'
                : `Gap of ${performanceMetrics.sales.forecast - performanceMetrics.sales.actual} sales remaining to reach target.`}
            </span>
          </div>
        </div>

        {/* Achievement Percentage Chart */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartPie} />
            <h3>Achievement Distribution</h3>
          </div>
          <div className={styles.chartWrapper}>
            <Doughnut data={achievementData} options={chartOptions} />
          </div>
          <div className={styles.chartInsight}>
            <FontAwesomeIcon icon={faLightbulb} />
            <span>
              {performanceMetrics.sales.percentage > 90
                ? 'Balanced high performance across all key metrics demonstrates consistent execution.'
                : 'Focus on underperforming areas to achieve balanced growth across all activities.'}
            </span>
          </div>
        </div>

        {/* Performance Variance Chart */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faChartLine} />
            <h3>Performance Variance Trend</h3>
          </div>
          <div className={styles.chartWrapper}>
            <Line data={varianceData} options={chartOptions} />
          </div>
          <div className={styles.chartInsight}>
            <FontAwesomeIcon icon={faLightbulb} />
            <span>
              {Math.abs(performanceMetrics.sales.variance) < 10
                ? 'Minimal variance indicates consistent performance and accurate forecasting.'
                : `${performanceMetrics.sales.variance > 0 ? 'Positive' : 'Negative'} variance suggests ${
                    performanceMetrics.sales.variance > 0
                      ? 'opportunity to raise targets'
                      : 'need for strategy adjustment'
                  }.`}
            </span>
          </div>
        </div>

        {/* Weekly Target Radar */}
        <div className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <FontAwesomeIcon icon={faBullseye} />
            <h3>Target Achievement Radar</h3>
          </div>
          <div className={styles.chartWrapper}>
            <PolarArea data={radarData} options={radarOptions} />
          </div>
          <div className={styles.chartInsight}>
            <FontAwesomeIcon icon={faLightbulb} />
            <span>
              Radar view reveals{' '}
              {Object.values(performanceMetrics).filter((m) => m.percentage >= 100).length} metrics
              exceeding targets. Focus energy on underperforming areas for balanced growth.
            </span>
          </div>
        </div>
      </div>

      {/* Role-based Insights Section */}
      <div className={styles.insightsSection}>
        <h4 className={styles.insightsTitle}>{roleInsights.title}</h4>
        <div className={styles.insightsGrid}>
          {roleInsights.insights.map((insight, index) => (
            <div key={index} className={styles.insightCard}>
              <div className={styles.insightValue}>{insight.value}</div>
              <div className={styles.insightMetric}>{insight.metric}</div>
              <div className={styles.insightDescription}>{insight.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
