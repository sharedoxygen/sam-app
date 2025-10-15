'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faPercentage } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from './DailyActivityGrid.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Daily activity data type for grid
type DailyGridData = {
  monday: DayActivities;
  tuesday: DayActivities;
  wednesday: DayActivities;
  thursday: DayActivities;
  friday: DayActivities;
};

// Activities for a single day
type DayActivities = {
  closed: {
    auto: number;
    lifeHealth: number;
    fire: number;
  };
  quotes: number;
  dials: number;
  referrals: {
    ask: number;
    received: number;
  };
};

// Performance metrics type - now calculated from activities
type PerformanceMetrics = {
  monday: DayPerformance;
  tuesday: DayPerformance;
  wednesday: DayPerformance;
  thursday: DayPerformance;
  friday: DayPerformance;
};

// Performance for a single day - derived metrics
type DayPerformance = {
  peopleContacted: number; // Calculated from dials + meetings
  lifeSalesConversations: number; // Calculated from interactions
  sales: number; // Sum of all closed sales
  askingRatio: number; // Calculated ratio of referral asks to contacts
};

type DailyActivityGridProps = {
  initialGridData?: DailyGridData;
  initialPerformanceData?: PerformanceMetrics;
  onDataChange?: (data: DailyGridData) => void;
  onPerformanceChange?: (data: PerformanceMetrics) => void;
  allowEdit?: boolean;
};

/**
 * Executive dashboard for daily activity tracking and performance analytics
 * - Top section: Executive performance dashboard with charts and KPIs
 * - Bottom section: Activity data entry (closed sales by type, quotes, dials, referrals)
 */
export default function DailyActivityGrid({
  initialGridData,
  initialPerformanceData,
  onDataChange,
  onPerformanceChange,
  allowEdit = true,
}: DailyActivityGridProps) {
  const { user } = useAuth();

  // Get role-based labels
  const getRoleBasedLabels = () => {
    if (!user?.role) return { activity: 'Activity', activityType: 'activity' };

    const role = user.role.toUpperCase();
    if (role.includes('SALES')) {
      return { activity: 'Sales Activity', activityType: 'sales-activity' };
    } else if (role.includes('SERVICE')) {
      return { activity: 'Service Activity', activityType: 'service-activity' };
    } else {
      return { activity: 'Activity', activityType: 'activity' };
    }
  };

  const roleLabels = getRoleBasedLabels();

  // Initialize with empty data or provided data
  const getEmptyDayActivities = (): DayActivities => ({
    closed: { auto: 0, lifeHealth: 0, fire: 0 },
    quotes: 0,
    dials: 0,
    referrals: { ask: 0, received: 0 },
  });

  const getEmptyDayPerformance = (): DayPerformance => ({
    peopleContacted: 0,
    lifeSalesConversations: 0,
    sales: 0,
    askingRatio: 0,
  });

  const getEmptyGridData = (): DailyGridData => ({
    monday: getEmptyDayActivities(),
    tuesday: getEmptyDayActivities(),
    wednesday: getEmptyDayActivities(),
    thursday: getEmptyDayActivities(),
    friday: getEmptyDayActivities(),
  });

  const getEmptyPerformanceData = (): PerformanceMetrics => ({
    monday: getEmptyDayPerformance(),
    tuesday: getEmptyDayPerformance(),
    wednesday: getEmptyDayPerformance(),
    thursday: getEmptyDayPerformance(),
    friday: getEmptyDayPerformance(),
  });

  // State for grid data
  const [gridData, setGridData] = useState<DailyGridData>(initialGridData || getEmptyGridData());

  // Update grid data when initialGridData changes (from external source)
  useEffect(() => {
    if (initialGridData) {
      setGridData(initialGridData);
    }
  }, [initialGridData]);

  // Calculate performance metrics from activity data
  const calculatedPerformanceData = useMemo(() => {
    const calculateDayMetrics = (dayData: DayActivities): DayPerformance => {
      const totalSales = dayData.closed.auto + dayData.closed.lifeHealth + dayData.closed.fire;

      // Enhanced contact calculation based on role
      const role = user?.role?.toUpperCase() || '';
      let peopleContacted: number;

      if (role.includes('SALES')) {
        // Sales agents: Higher contact rate from dials, quotes represent warm leads
        peopleContacted = Math.round(dayData.dials * 0.35 + dayData.quotes * 0.8);
      } else if (role.includes('SERVICE')) {
        // Service agents: Different contact pattern, more existing client interactions
        peopleContacted = Math.round(dayData.dials * 0.45 + dayData.quotes * 0.6);
      } else {
        // General calculation
        peopleContacted = Math.round(dayData.dials * 0.3 + dayData.quotes * 0.5);
      }

      // Enhanced life sales conversations calculation
      let lifeSalesConversations: number;

      if (role.includes('SALES')) {
        // Sales agents: Life conversations driven by prospecting and closing
        lifeSalesConversations = Math.round(
          dayData.closed.lifeHealth * 2.0 + dayData.quotes * 0.25 + dayData.dials * 0.1
        );
      } else if (role.includes('SERVICE')) {
        // Service agents: Life conversations from cross-selling opportunities
        lifeSalesConversations = Math.round(
          dayData.closed.lifeHealth * 1.8 + dayData.quotes * 0.3 + dayData.dials * 0.15
        );
      } else {
        // General calculation
        lifeSalesConversations = Math.round(dayData.closed.lifeHealth * 1.5 + dayData.quotes * 0.2);
      }

      // Enhanced asking ratio with role-specific expectations
      const askingRatio =
        peopleContacted > 0 ? Math.round((dayData.referrals.ask / peopleContacted) * 100) : 0;

      return {
        peopleContacted,
        lifeSalesConversations,
        sales: totalSales,
        askingRatio,
      };
    };

    return {
      monday: calculateDayMetrics(gridData.monday),
      tuesday: calculateDayMetrics(gridData.tuesday),
      wednesday: calculateDayMetrics(gridData.wednesday),
      thursday: calculateDayMetrics(gridData.thursday),
      friday: calculateDayMetrics(gridData.friday),
    };
  }, [gridData, user?.role]);

  // Create chart data for performance dashboard
  const chartData = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const performanceMetrics = calculatedPerformanceData;

    return {
      // Weekly trend line chart
      weeklyTrend: {
        labels: days,
        datasets: [
          {
            label: 'Client Contact Volume',
            data: [
              performanceMetrics.monday.peopleContacted,
              performanceMetrics.tuesday.peopleContacted,
              performanceMetrics.wednesday.peopleContacted,
              performanceMetrics.thursday.peopleContacted,
              performanceMetrics.friday.peopleContacted,
            ],
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Life Conversations',
            data: [
              performanceMetrics.monday.lifeSalesConversations,
              performanceMetrics.tuesday.lifeSalesConversations,
              performanceMetrics.wednesday.lifeSalesConversations,
              performanceMetrics.thursday.lifeSalesConversations,
              performanceMetrics.friday.lifeSalesConversations,
            ],
            borderColor: '#20c997',
            backgroundColor: 'rgba(32, 201, 151, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Sales Closures',
            data: [
              performanceMetrics.monday.sales,
              performanceMetrics.tuesday.sales,
              performanceMetrics.wednesday.sales,
              performanceMetrics.thursday.sales,
              performanceMetrics.friday.sales,
            ],
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            tension: 0.4,
          },
        ],
      },

      // Performance distribution doughnut chart
      distribution: {
        labels: ['Client Contacts', 'Life Conversations', 'Sales Closures', 'Referral Requests'],
        datasets: [
          {
            data: [
              Object.values(performanceMetrics).reduce((sum, day) => sum + day.peopleContacted, 0),
              Object.values(performanceMetrics).reduce(
                (sum, day) => sum + day.lifeSalesConversations,
                0
              ),
              Object.values(performanceMetrics).reduce((sum, day) => sum + day.sales, 0),
              Object.values(gridData).reduce((sum, day) => sum + day.referrals.ask, 0),
            ],
            backgroundColor: ['#0d6efd', '#20c997', '#198754', '#fd7e14'],
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
    };
  }, [calculatedPerformanceData, gridData]);

  // Handle activity change
  const handleActivityChange = (
    day: keyof DailyGridData,
    category: keyof DayActivities,
    subcategory: string | null,
    value: number
  ) => {
    const newData = { ...gridData };

    if (subcategory) {
      // Handle nested values (closed, referrals)
      if (category === 'closed') {
        newData[day].closed = {
          ...newData[day].closed,
          [subcategory]: value,
        };
      } else if (category === 'referrals') {
        newData[day].referrals = {
          ...newData[day].referrals,
          [subcategory]: value,
        };
      }
    } else {
      // Handle direct values (quotes, dials)
      // Use a type-safe approach for direct properties
      if (category === 'quotes') {
        newData[day].quotes = value;
      } else if (category === 'dials') {
        newData[day].dials = value;
      }
    }

    setGridData(newData);
    if (onDataChange) {
      onDataChange(newData);
    }
  };

  // Export functionality for the Export Data button
  const handleExportData = () => {
    try {
      // Combine performance and activity data
      const exportData = {
        performanceMetrics: calculatedPerformanceData,
        activities: gridData,
        exportDate: new Date().toISOString(),
        weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      };

      // Convert to CSV format
      const csvContent = generateCSV(exportData);

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `${roleLabels.activityType}-data-${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      // In a real app, you'd show a user-friendly error message
    }
  };

  // Generate CSV content from data
  const generateCSV = (data: any) => {
    const lines = [];

    // Add header
    lines.push(`${roleLabels.activity} Analytics Export`);
    lines.push(`Export Date: ${new Date().toLocaleDateString()}`);
    lines.push('Generated from calculated performance metrics');
    lines.push('');

    // Performance Metrics section
    lines.push('CALCULATED PERFORMANCE METRICS');
    lines.push('Metric,Monday,Tuesday,Wednesday,Thursday,Friday,Weekly Total');
    lines.push(
      `Client Contact Volume,${data.performanceMetrics.monday.peopleContacted},${data.performanceMetrics.tuesday.peopleContacted},${data.performanceMetrics.wednesday.peopleContacted},${data.performanceMetrics.thursday.peopleContacted},${data.performanceMetrics.friday.peopleContacted},${Object.values(data.performanceMetrics).reduce((sum: number, day: any) => sum + day.peopleContacted, 0)}`
    );
    lines.push(
      `Life Insurance Sales Conversations,${data.performanceMetrics.monday.lifeSalesConversations},${data.performanceMetrics.tuesday.lifeSalesConversations},${data.performanceMetrics.wednesday.lifeSalesConversations},${data.performanceMetrics.thursday.lifeSalesConversations},${data.performanceMetrics.friday.lifeSalesConversations},${Object.values(data.performanceMetrics).reduce((sum: number, day: any) => sum + day.lifeSalesConversations, 0)}`
    );
    lines.push(
      `Sales Closures,${data.performanceMetrics.monday.sales},${data.performanceMetrics.tuesday.sales},${data.performanceMetrics.wednesday.sales},${data.performanceMetrics.thursday.sales},${data.performanceMetrics.friday.sales},${Object.values(data.performanceMetrics).reduce((sum: number, day: any) => sum + day.sales, 0)}`
    );
    lines.push(
      `Referral Request Rate (%),${data.performanceMetrics.monday.askingRatio},${data.performanceMetrics.tuesday.askingRatio},${data.performanceMetrics.wednesday.askingRatio},${data.performanceMetrics.thursday.askingRatio},${data.performanceMetrics.friday.askingRatio},${Math.round(Object.values(data.performanceMetrics).reduce((sum: number, day: any) => sum + day.askingRatio, 0) / 5)}`
    );
    lines.push('');

    // Activities section
    lines.push(`${roleLabels.activity.toUpperCase()} ACTIVITIES (SOURCE DATA)`);
    lines.push('Activity Type,Monday,Tuesday,Wednesday,Thursday,Friday,Weekly Total');

    // Calculate weekly totals for each activity type
    const autoTotal =
      data.activities.monday.closed.auto +
      data.activities.tuesday.closed.auto +
      data.activities.wednesday.closed.auto +
      data.activities.thursday.closed.auto +
      data.activities.friday.closed.auto;
    const lifeTotal =
      data.activities.monday.closed.lifeHealth +
      data.activities.tuesday.closed.lifeHealth +
      data.activities.wednesday.closed.lifeHealth +
      data.activities.thursday.closed.lifeHealth +
      data.activities.friday.closed.lifeHealth;
    const fireTotal =
      data.activities.monday.closed.fire +
      data.activities.tuesday.closed.fire +
      data.activities.wednesday.closed.fire +
      data.activities.thursday.closed.fire +
      data.activities.friday.closed.fire;
    const quotesTotal =
      data.activities.monday.quotes +
      data.activities.tuesday.quotes +
      data.activities.wednesday.quotes +
      data.activities.thursday.quotes +
      data.activities.friday.quotes;
    const dialsTotal =
      data.activities.monday.dials +
      data.activities.tuesday.dials +
      data.activities.wednesday.dials +
      data.activities.thursday.dials +
      data.activities.friday.dials;
    const askTotal =
      data.activities.monday.referrals.ask +
      data.activities.tuesday.referrals.ask +
      data.activities.wednesday.referrals.ask +
      data.activities.thursday.referrals.ask +
      data.activities.friday.referrals.ask;
    const receivedTotal =
      data.activities.monday.referrals.received +
      data.activities.tuesday.referrals.received +
      data.activities.wednesday.referrals.received +
      data.activities.thursday.referrals.received +
      data.activities.friday.referrals.received;

    lines.push(
      `Automotive Insurance,${data.activities.monday.closed.auto},${data.activities.tuesday.closed.auto},${data.activities.wednesday.closed.auto},${data.activities.thursday.closed.auto},${data.activities.friday.closed.auto},${autoTotal}`
    );
    lines.push(
      `Life & Health Insurance,${data.activities.monday.closed.lifeHealth},${data.activities.tuesday.closed.lifeHealth},${data.activities.wednesday.closed.lifeHealth},${data.activities.thursday.closed.lifeHealth},${data.activities.friday.closed.lifeHealth},${lifeTotal}`
    );
    lines.push(
      `Property & Fire Insurance,${data.activities.monday.closed.fire},${data.activities.tuesday.closed.fire},${data.activities.wednesday.closed.fire},${data.activities.thursday.closed.fire},${data.activities.friday.closed.fire},${fireTotal}`
    );
    lines.push(
      `Quotes Generated,${data.activities.monday.quotes},${data.activities.tuesday.quotes},${data.activities.wednesday.quotes},${data.activities.thursday.quotes},${data.activities.friday.quotes},${quotesTotal}`
    );
    lines.push(
      `Client Outreach Calls,${data.activities.monday.dials},${data.activities.tuesday.dials},${data.activities.wednesday.dials},${data.activities.thursday.dials},${data.activities.friday.dials},${dialsTotal}`
    );
    lines.push(
      `Referrals Requested,${data.activities.monday.referrals.ask},${data.activities.tuesday.referrals.ask},${data.activities.wednesday.referrals.ask},${data.activities.thursday.referrals.ask},${data.activities.friday.referrals.ask},${askTotal}`
    );
    lines.push(
      `Referrals Received,${data.activities.monday.referrals.received},${data.activities.tuesday.referrals.received},${data.activities.wednesday.referrals.received},${data.activities.thursday.referrals.received},${data.activities.friday.referrals.received},${receivedTotal}`
    );

    return lines.join('\n');
  };

  // Value changer component for cells with increment/decrement controls
  const ValueChanger = ({
    value,
    onChange,
    min = 0,
    max = 999,
  }: {
    value: number;
    onChange: (newValue: number) => void;
    min?: number;
    max?: number;
  }) => {
    const increment = () => {
      if (value < max && allowEdit) {
        onChange(value + 1);
      }
    };

    const decrement = () => {
      if (value > min && allowEdit) {
        onChange(value - 1);
      }
    };

    return (
      <div className={styles.valueChanger}>
        {allowEdit && (
          <button
            className={styles.btnControl}
            onClick={decrement}
            aria-label="Decrease value"
            disabled={value <= min}
          >
            <FontAwesomeIcon icon={faPercentage} />
          </button>
        )}
        <span className={styles.value}>{value}</span>
        {allowEdit && (
          <button
            className={styles.btnControl}
            onClick={increment}
            aria-label="Increase value"
            disabled={value >= max}
          >
            <FontAwesomeIcon icon={faPercentage} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={styles.dailyActivityGridContainer}>
      {/* Main Activity Entry Section */}
      <div className={styles.activityEntryMain}>
        <div className={styles.entryHeader}>
          <h2 className={styles.entryTitle}>Daily Activity Entry</h2>
          <p className={styles.entrySubtitle}>Quick entry for today's activities</p>
        </div>

        {/* Daily Activities Section - Enhanced with Modern Business UI */}
        <div className={styles.dailyActivitiesSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.headerContent}>
              <h3 className={styles.sectionTitle}>{roleLabels.activity}</h3>
              <p className={styles.sectionSubtitle}>
                Weekly performance tracking & pipeline management
              </p>
            </div>
          </div>

          <div className={styles.activitiesGridModern}>
            {/* Revenue Generation Section */}
            <div className={styles.activityCategoryCard}>
              <div className={styles.cardHeader}>
                <h4 className={styles.categoryTitle}>Revenue Generation</h4>
                <span className={styles.categorySubtitle}>Closed Sales by Product Line</span>
              </div>
              <div className={styles.metricsRow}>
                <div className={styles.metricGroup}>
                  <label className={styles.metricLabel}>Automotive Insurance</label>
                  <div className={styles.daysGrid}>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map(
                      (day) => (
                        <div key={`auto-${day}`} className={styles.dayValueCard}>
                          <span className={styles.dayLabel}>{day.slice(0, 3).toUpperCase()}</span>
                          <ValueChanger
                            value={gridData[day].closed.auto}
                            onChange={(value) => handleActivityChange(day, 'closed', 'auto', value)}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className={styles.metricGroup}>
                  <label className={styles.metricLabel}>Life & Health Insurance</label>
                  <div className={styles.daysGrid}>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map(
                      (day) => (
                        <div key={`life-${day}`} className={styles.dayValueCard}>
                          <span className={styles.dayLabel}>{day.slice(0, 3).toUpperCase()}</span>
                          <ValueChanger
                            value={gridData[day].closed.lifeHealth}
                            onChange={(value) =>
                              handleActivityChange(day, 'closed', 'lifeHealth', value)
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className={styles.metricGroup}>
                  <label className={styles.metricLabel}>Property & Fire Insurance</label>
                  <div className={styles.daysGrid}>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map(
                      (day) => (
                        <div key={`fire-${day}`} className={styles.dayValueCard}>
                          <span className={styles.dayLabel}>{day.slice(0, 3).toUpperCase()}</span>
                          <ValueChanger
                            value={gridData[day].closed.fire}
                            onChange={(value) => handleActivityChange(day, 'closed', 'fire', value)}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Management Section */}
            <div className={styles.activityCategoryCard}>
              <div className={styles.cardHeader}>
                <h4 className={styles.categoryTitle}>Pipeline Management</h4>
                <span className={styles.categorySubtitle}>Quotes Generated & Client Outreach</span>
              </div>
              <div className={styles.metricsRow}>
                <div className={styles.metricGroup}>
                  <label className={styles.metricLabel}>Quotes Generated</label>
                  <div className={styles.daysGrid}>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map(
                      (day) => (
                        <div key={`quotes-${day}`} className={styles.dayValueCard}>
                          <span className={styles.dayLabel}>{day.slice(0, 3).toUpperCase()}</span>
                          <ValueChanger
                            value={gridData[day].quotes}
                            onChange={(value) => handleActivityChange(day, 'quotes', null, value)}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className={styles.metricGroup}>
                  <label className={styles.metricLabel}>Client Outreach Calls</label>
                  <div className={styles.daysGrid}>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map(
                      (day) => (
                        <div key={`dials-${day}`} className={styles.dayValueCard}>
                          <span className={styles.dayLabel}>{day.slice(0, 3).toUpperCase()}</span>
                          <ValueChanger
                            value={gridData[day].dials}
                            onChange={(value) => handleActivityChange(day, 'dials', null, value)}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Development Section */}
            <div className={styles.activityCategoryCard}>
              <div className={styles.cardHeader}>
                <h4 className={styles.categoryTitle}>Business Development</h4>
                <span className={styles.categorySubtitle}>Referral Network & Lead Generation</span>
              </div>
              <div className={styles.metricsRow}>
                <div className={styles.metricGroup}>
                  <label className={styles.metricLabel}>Referrals Requested</label>
                  <div className={styles.daysGrid}>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map(
                      (day) => (
                        <div key={`ref-ask-${day}`} className={styles.dayValueCard}>
                          <span className={styles.dayLabel}>{day.slice(0, 3).toUpperCase()}</span>
                          <ValueChanger
                            value={gridData[day].referrals.ask}
                            onChange={(value) =>
                              handleActivityChange(day, 'referrals', 'ask', value)
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className={styles.metricGroup}>
                  <label className={styles.metricLabel}>Referrals Received</label>
                  <div className={styles.daysGrid}>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).map(
                      (day) => (
                        <div key={`ref-rec-${day}`} className={styles.dayValueCard}>
                          <span className={styles.dayLabel}>{day.slice(0, 3).toUpperCase()}</span>
                          <ValueChanger
                            value={gridData[day].referrals.received}
                            onChange={(value) =>
                              handleActivityChange(day, 'referrals', 'received', value)
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Performance Dashboard Sidebar */}
      <div className={styles.performanceSidebar}>
        <div className={styles.sidebarHeader}>
          <h3 className={styles.sidebarTitle}>
            <FontAwesomeIcon icon={faPhone} className={styles.titleIcon} />
            Performance Overview
          </h3>
          <button className={styles.exportBtnSmall} onClick={handleExportData}>
            <FontAwesomeIcon icon={faPercentage} />
          </button>
        </div>

        {/* Compact KPI Summary */}
        <div className={styles.kpiSummary}>
          <div className={styles.kpiItem}>
            <div className={styles.kpiValue}>
              {Object.values(calculatedPerformanceData).reduce(
                (sum, day) => sum + day.peopleContacted,
                0
              )}
            </div>
            <div className={styles.kpiLabel}>Client Contacts</div>
          </div>
          <div className={styles.kpiItem}>
            <div className={styles.kpiValue}>
              {Object.values(calculatedPerformanceData).reduce((sum, day) => sum + day.sales, 0)}
            </div>
            <div className={styles.kpiLabel}>Sales Closed</div>
          </div>
          <div className={styles.kpiItem}>
            <div className={styles.kpiValue}>
              {Math.round(
                Object.values(calculatedPerformanceData).reduce(
                  (sum, day) => sum + day.askingRatio,
                  0
                ) / 5
              )}
              %
            </div>
            <div className={styles.kpiLabel}>Referral Rate</div>
          </div>
        </div>

        {/* Compact Chart */}
        <div className={styles.compactChart}>
          <h4 className={styles.chartTitle}>Weekly Trend</h4>
          <div className={styles.chartWrapperSmall}>
            <Line
              data={chartData.weeklyTrend}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    display: false,
                  },
                  x: {
                    display: false,
                  },
                },
                elements: {
                  point: {
                    radius: 2,
                  },
                  line: {
                    borderWidth: 2,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
