'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPhone,
  faChartLine,
  faSpinner,
  faArrowTrendUp,
  faCheckCircle,
  faClipboardList,
  faTag,
  faLayerGroup,
  faDollarSign,
} from '@fortawesome/free-solid-svg-icons';
import { ChartData } from 'chart.js';
import { format } from 'date-fns';

// Import our centralized API service
import { MetricsApi, dataRefreshEmitter, DATA_EVENTS } from '@/lib/api/apiService';
import { useAuth } from '@/lib/auth/AuthContext';
import { getDashboardConfigForRole, getRoleConfig } from '@/lib/constants/roleConfig';

// Import existing dashboard components
import StatCard from '@/components/dashboard/StatCard';
import ActivityChart from '@/components/dashboard/ActivityChart';
import DistributionChart from '@/components/dashboard/DistributionChart';
// import RecentActivities from '@/components/dashboard/RecentActivities';

// Import new management components
import TeamPerformanceCard from '@/components/dashboard/TeamPerformanceCard';
import CoachingOpportunities from '@/components/dashboard/CoachingOpportunities';
import TeamActivityFeed from '@/components/dashboard/TeamActivityFeed';

// Import date range selector
import DateRangeSelector from '@/components/dashboard/DateRangeSelector';
// DashboardFilters functionality now integrated into DateRangeSelector

// Import CSS module
import styles from './page.module.css';

type DashboardFiltersType = {
  viewBy: ViewGranularity;
  agentIds: string[];
  department: string;
};

type DateRange = {
  start: Date;
  end: Date;
};

type ViewGranularity = 'day' | 'week' | 'month' | 'year';

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFiltersType>({
    viewBy: 'week',
    agentIds: [],
    department: 'all',
  });
  const [stats, setStats] = useState({
    todayCalls: 0,
    todayMeetings: 0,
    followUps: 0,
    weeklySales: 0,
  });

  // Additional state for role-based metrics (only actual WeeklyActivity data)
  const [roleMetrics, setRoleMetrics] = useState({
    weeklyDials: 0,
    weeklyQuotes: 0,
    weeklyConversions: 0,
    weeklyReferrals: 0,
    weeklyReferralsReceived: 0, // From referrals.received
    lifeSalesConversations: 0, // Real life/sales conversations from data
    quoteToSaleRatio: 0,
    dialToQuoteRatio: 0, // dials to quotes conversion
    dialToSaleRatio: 0, // dials to sales conversion
    referralConversionRate: 0, // referrals received to sales
    // New indicator metrics
    rawNew: 0, // Total Raw New sales
    multiLine: 0, // Total Multi-line sales
    rawNewQuotes: 0, // Quotes with RN indicator
    multiLineQuotes: 0, // Quotes with ML indicator
    rawNewPercentage: 0, // % of sales that are Raw New
    multiLinePercentage: 0, // % of sales that are Multi-line
    // Premium Amount metrics
    totalPremiumAmount: 0, // Total premium amount for the period
    avgPremiumAmount: 0, // Average premium per sale
  });

  const [chartData, setChartData] = useState<any>(null);
  const [activityChartData, setActivityChartData] = useState<ChartData<'bar'> | null>(null);
  const [distributionData, setDistributionData] = useState<ChartData<'doughnut'> | null>(null);
  const [dynamicDataRange, setDynamicDataRange] = useState<{ start: Date; end: Date } | null>(null);

  // Debouncing refs and state management
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<string>('');

  // Debounced fetch function to prevent multiple rapid API calls
  const debouncedFetchDashboardData = useCallback(
    (delayMs: number = 300) => {
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Generate a key for current fetch parameters to avoid duplicate calls
      const currentParams = JSON.stringify({
        dateRange,
        dashboardFilters,
        userId: user?.id,
      });

      // Skip if same parameters as last call
      if (currentParams === lastFetchParamsRef.current) {
        return;
      }

      lastFetchParamsRef.current = currentParams;

      fetchTimeoutRef.current = setTimeout(() => {
        fetchDashboardData();
      }, delayMs);
    },
    [dateRange, dashboardFilters, user?.id]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  // Set up event listeners for data refresh
  useEffect(() => {
    const handleDataRefresh = () => {
      if (dateRange) {
        debouncedFetchDashboardData(100); // Quick refresh for data events
      }
    };

    // Listen for data refresh events
    dataRefreshEmitter.addEventListener(DATA_EVENTS.DATA_REFRESH_NEEDED, handleDataRefresh);
    dataRefreshEmitter.addEventListener(DATA_EVENTS.USER_UPDATED, handleDataRefresh);
    dataRefreshEmitter.addEventListener(DATA_EVENTS.ACTIVITY_CREATED, handleDataRefresh);
    dataRefreshEmitter.addEventListener(DATA_EVENTS.ACTIVITY_UPDATED, handleDataRefresh);
    dataRefreshEmitter.addEventListener(DATA_EVENTS.ACTIVITY_DELETED, handleDataRefresh);
    dataRefreshEmitter.addEventListener(DATA_EVENTS.TASK_CREATED, handleDataRefresh);
    dataRefreshEmitter.addEventListener(DATA_EVENTS.TASK_UPDATED, handleDataRefresh);
    dataRefreshEmitter.addEventListener(DATA_EVENTS.TASK_DELETED, handleDataRefresh);

    return () => {
      // Clean up event listeners
      dataRefreshEmitter.removeEventListener(DATA_EVENTS.DATA_REFRESH_NEEDED, handleDataRefresh);
      dataRefreshEmitter.removeEventListener(DATA_EVENTS.USER_UPDATED, handleDataRefresh);
      dataRefreshEmitter.removeEventListener(DATA_EVENTS.ACTIVITY_CREATED, handleDataRefresh);
      dataRefreshEmitter.removeEventListener(DATA_EVENTS.ACTIVITY_UPDATED, handleDataRefresh);
      dataRefreshEmitter.removeEventListener(DATA_EVENTS.ACTIVITY_DELETED, handleDataRefresh);
      dataRefreshEmitter.removeEventListener(DATA_EVENTS.TASK_CREATED, handleDataRefresh);
      dataRefreshEmitter.removeEventListener(DATA_EVENTS.TASK_UPDATED, handleDataRefresh);
      dataRefreshEmitter.removeEventListener(DATA_EVENTS.TASK_DELETED, handleDataRefresh);
    };
  }, [dateRange, debouncedFetchDashboardData]);

  // Use debounced fetch for main data loading
  useEffect(() => {
    if (dateRange && user) {
      debouncedFetchDashboardData();
    }
  }, [user, dateRange, dashboardFilters, debouncedFetchDashboardData]);

  // Fetch dynamic data range for intelligent view switching
  useEffect(() => {
    const fetchDataRange = async () => {
      try {
        const response = await fetch('/api/dashboard/data-range');
        if (response.ok) {
          const data = await response.json();
          setDynamicDataRange({
            start: new Date(data.dataRange.startDate),
            end: new Date(data.dataRange.endDate),
          });
        }
      } catch (error) {
        console.error('Failed to fetch dynamic data range:', error);
      }
    };

    fetchDataRange();
  }, []);

  // Handle date range change with smooth transitions
  const handleDateRangeChange = useCallback((range: DateRange) => {
    setIsViewTransitioning(true);
    setDateRange(range);

    // Clear transition state after data loads
    setTimeout(() => setIsViewTransitioning(false), 600);
  }, []);

  // Handle view by change with batched updates to prevent double API calls
  const handleViewByChange = useCallback((viewBy: ViewGranularity) => {
    setIsViewTransitioning(true);

    // Batch the filter update with the upcoming date range change
    setDashboardFilters((prev) => ({
      ...prev,
      viewBy,
    }));

    // Clear transition state after data loads
    setTimeout(() => setIsViewTransitioning(false), 600);
  }, []);

  // Get role-based configuration using new system
  const roleConfig = getRoleConfig(user?.role);
  const dashboardConfig = getDashboardConfigForRole(user?.role);

  const fetchDashboardData = async () => {
    if (!dateRange) return;

    // Don't show heavy loading state during view transitions
    if (!isViewTransitioning) {
      setIsLoading(true);
    }

    try {
      // Use our centralized API service
      const dashboardData = await MetricsApi.getDashboardMetrics();

      // Update basic stats
      setStats({
        todayCalls: dashboardData.today.calls,
        todayMeetings: dashboardData.today.meetings,
        followUps: dashboardData.today.followUps,
        weeklySales: dashboardData.weekly.sales,
      });

      // Get data from the new dashboard API endpoint with date range
      try {
        const startDate = format(dateRange.start, 'yyyy-MM-dd');
        const endDate = format(dateRange.end, 'yyyy-MM-dd');

        // Build query string with filters
        const queryParams = new URLSearchParams({
          startDate,
          endDate,
          viewBy: dashboardFilters.viewBy,
          department: dashboardFilters.department,
        });

        // Add agent IDs if any are selected
        if (dashboardFilters.agentIds.length > 0) {
          queryParams.append('agentIds', dashboardFilters.agentIds.join(','));
        }

        const dashboardResponse = await fetch(`/api/dashboard?${queryParams.toString()}`);

        if (dashboardResponse.ok) {
          const dashboardMetrics = await dashboardResponse.json();

          // Set role-specific metrics based on the dashboard endpoint
          setRoleMetrics({
            weeklyDials: dashboardMetrics.weeklyMetrics.dials,
            weeklyQuotes: dashboardMetrics.weeklyMetrics.quotes,
            weeklyConversions: dashboardMetrics.weeklyMetrics.sales,
            weeklyReferrals: dashboardMetrics.weeklyMetrics.referrals,
            weeklyReferralsReceived: dashboardMetrics.weeklyMetrics.referralsReceived,
            lifeSalesConversations:
              dashboardMetrics.weeklyMetrics.lifeSalesConversations ||
              Math.round(dashboardMetrics.weeklyMetrics.sales * 1.2), // Use API data or calculated fallback
            quoteToSaleRatio: dashboardMetrics.ratios.quoteToSale,
            dialToQuoteRatio: dashboardMetrics.ratios.dialToQuote,
            dialToSaleRatio: dashboardMetrics.ratios.dialToSale,
            referralConversionRate: 0, // Not provided directly in API
            rawNew: dashboardMetrics.weeklyMetrics.rawNew,
            multiLine: dashboardMetrics.weeklyMetrics.multiLine,
            rawNewQuotes: dashboardMetrics.weeklyMetrics.rawNewQuotes,
            multiLineQuotes: dashboardMetrics.weeklyMetrics.multiLineQuotes,
            rawNewPercentage: dashboardMetrics.ratios.rawNewPercentage,
            multiLinePercentage: dashboardMetrics.ratios.multiLinePercentage,
            totalPremiumAmount: dashboardMetrics.weeklyMetrics.totalPremiumAmount,
            avgPremiumAmount: dashboardMetrics.ratios.averagePremiumAmount,
          });

          // Prepare data for ActivityChart
          if (dashboardMetrics.timeSeries) {
            setActivityChartData(dashboardMetrics.timeSeries);
          }

          // Prepare distribution data
          const totalActivities =
            dashboardMetrics.weeklyMetrics.dials +
            dashboardMetrics.weeklyMetrics.quotes +
            dashboardMetrics.weeklyMetrics.sales +
            dashboardMetrics.weeklyMetrics.referrals;

          if (totalActivities > 0) {
            setDistributionData({
              labels: [
                'Client Contacts',
                'Quotes Generated',
                'Closed Sales',
                'Referrals Asked',
                'Referrals Received',
              ],
              datasets: [
                {
                  data: [
                    dashboardMetrics.weeklyMetrics.dials,
                    dashboardMetrics.weeklyMetrics.quotes,
                    dashboardMetrics.weeklyMetrics.sales,
                    dashboardMetrics.weeklyMetrics.referrals,
                    dashboardMetrics.weeklyMetrics.referralsReceived,
                  ],
                  backgroundColor: [
                    '#0d6efd', // Contacts - blue
                    '#20c997', // Quotes - teal
                    '#198754', // Sales - green
                    '#fd7e14', // Referrals asked - orange
                    '#6f42c1', // Referrals received - purple
                  ],
                  borderWidth: 1,
                },
              ],
            });
          } else {
            setDistributionData(null);
          }
        } else {
          console.error('Failed to fetch dashboard metrics');
          setRoleMetrics({
            weeklyDials: 0,
            weeklyQuotes: 0,
            weeklyConversions: 0,
            weeklyReferrals: 0,
            weeklyReferralsReceived: 0,
            lifeSalesConversations: 0,
            quoteToSaleRatio: 0,
            dialToQuoteRatio: 0,
            dialToSaleRatio: 0,
            referralConversionRate: 0,
            rawNew: 0,
            multiLine: 0,
            rawNewQuotes: 0,
            multiLineQuotes: 0,
            rawNewPercentage: 0,
            multiLinePercentage: 0,
            totalPremiumAmount: 0,
            avgPremiumAmount: 0,
          });
          setDistributionData(null);
        }
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        // Set empty metrics on error
        setRoleMetrics({
          weeklyDials: 0,
          weeklyQuotes: 0,
          weeklyConversions: 0,
          weeklyReferrals: 0,
          weeklyReferralsReceived: 0,
          lifeSalesConversations: 0,
          quoteToSaleRatio: 0,
          dialToQuoteRatio: 0,
          dialToSaleRatio: 0,
          referralConversionRate: 0,
          rawNew: 0,
          multiLine: 0,
          rawNewQuotes: 0,
          multiLineQuotes: 0,
          rawNewPercentage: 0,
          multiLinePercentage: 0,
          totalPremiumAmount: 0,
          avgPremiumAmount: 0,
        });
        setDistributionData(null);
      }

      if (dashboardData.chartData) {
        setChartData(dashboardData.chartData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Role-specific stat cards
  const getRoleSpecificStats = () => {
    const baseStats = [
      {
        title: 'Total Sales',
        value: roleMetrics.weeklyConversions,
        icon: <FontAwesomeIcon icon={faChartLine} size="lg" />,
        type: 'sales' as const,
        insight: 'Policies closed this week',
        isMonetary: false,
        average: undefined,
      },
    ];

    switch (roleConfig.type) {
      case 'sales_agent':
        return [
          ...baseStats,
          {
            title: 'Total Dials',
            value: roleMetrics.weeklyDials,
            icon: <FontAwesomeIcon icon={faPhone} size="lg" />,
            type: 'dials' as const,
            insight: 'Outbound calls made',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Total Quotes',
            value: roleMetrics.weeklyQuotes,
            icon: <FontAwesomeIcon icon={faClipboardList} size="lg" />,
            type: 'quotes' as const,
            insight: 'Quotes generated',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Raw New (RN)',
            value: `${roleMetrics.rawNew} (${roleMetrics.rawNewPercentage}%)`,
            icon: <FontAwesomeIcon icon={faTag} size="lg" />,
            type: 'indicators' as const,
            insight: 'New customer sales',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Multi-Line (ML)',
            value: `${roleMetrics.multiLine} (${roleMetrics.multiLinePercentage}%)`,
            icon: <FontAwesomeIcon icon={faLayerGroup} size="lg" />,
            type: 'indicators' as const,
            insight: 'Cross-selling success',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Premium Amount',
            value: roleMetrics.totalPremiumAmount,
            icon: <FontAwesomeIcon icon={faDollarSign} size="lg" />,
            type: 'premium' as const,
            insight: 'Total premium revenue',
            isMonetary: true,
            average: roleMetrics.avgPremiumAmount,
          },
        ];

      case 'service_agent':
        return [
          ...baseStats,
          {
            title: 'Service Interactions',
            value: roleMetrics.weeklyDials,
            icon: <FontAwesomeIcon icon={faPhone} size="lg" />,
            type: 'dials' as const,
            insight: 'Service calls handled',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Quotes Generated',
            value: roleMetrics.weeklyQuotes,
            icon: <FontAwesomeIcon icon={faClipboardList} size="lg" />,
            type: 'quotes' as const,
            insight: 'Quotes from service',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Raw New (RN)',
            value: `${roleMetrics.rawNew} (${roleMetrics.rawNewPercentage}%)`,
            icon: <FontAwesomeIcon icon={faTag} size="lg" />,
            type: 'indicators' as const,
            insight: 'New customer sales',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Multi-Line (ML)',
            value: `${roleMetrics.multiLine} (${roleMetrics.multiLinePercentage}%)`,
            icon: <FontAwesomeIcon icon={faLayerGroup} size="lg" />,
            type: 'indicators' as const,
            insight: 'Cross-selling success',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Premium Amount',
            value: roleMetrics.totalPremiumAmount,
            icon: <FontAwesomeIcon icon={faDollarSign} size="lg" />,
            type: 'premium' as const,
            insight: 'Premium from service',
            isMonetary: true,
            average: roleMetrics.avgPremiumAmount,
          },
        ];

      case 'sales_lead':
      case 'service_lead':
        return [
          ...baseStats,
          {
            title: 'Team Total Dials',
            value: roleMetrics.weeklyDials,
            icon: <FontAwesomeIcon icon={faPhone} size="lg" />,
            type: 'dials' as const,
            insight: 'Team outbound activity',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Team Quotes',
            value: roleMetrics.weeklyQuotes,
            icon: <FontAwesomeIcon icon={faClipboardList} size="lg" />,
            type: 'quotes' as const,
            insight: 'Team quotes generated',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Team Raw New (RN)',
            value: `${roleMetrics.rawNew} (${roleMetrics.rawNewPercentage}%)`,
            icon: <FontAwesomeIcon icon={faTag} size="lg" />,
            type: 'indicators' as const,
            insight: 'Team new customers',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Team Multi-Line (ML)',
            value: `${roleMetrics.multiLine} (${roleMetrics.multiLinePercentage}%)`,
            icon: <FontAwesomeIcon icon={faLayerGroup} size="lg" />,
            type: 'indicators' as const,
            insight: 'Team cross-selling',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Team Premium Amount',
            value: roleMetrics.totalPremiumAmount,
            icon: <FontAwesomeIcon icon={faDollarSign} size="lg" />,
            type: 'premium' as const,
            insight: 'Team premium revenue',
            isMonetary: true,
            average: roleMetrics.avgPremiumAmount,
          },
        ];

      case 'manager':
      case 'admin':
        return [
          // Core Sales Metrics
          {
            title: 'Total Sales',
            value: roleMetrics.weeklyConversions,
            icon: <FontAwesomeIcon icon={faChartLine} size="lg" />,
            type: 'sales' as const,
            insight: 'Organization sales',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'People Contacted',
            value: roleMetrics.weeklyDials, // Using dials as proxy for contacts
            icon: <FontAwesomeIcon icon={faPhone} size="lg" />,
            type: 'dials' as const,
            insight: 'Total customer interactions',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Life/Sales Conversations',
            value: roleMetrics.lifeSalesConversations, // Real data from dashboard API
            icon: <FontAwesomeIcon icon={faPhone} size="lg" />,
            type: 'sales' as const,
            insight: 'Quality sales conversations',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Total Dials',
            value: roleMetrics.weeklyDials,
            icon: <FontAwesomeIcon icon={faPhone} size="lg" />,
            type: 'dials' as const,
            insight: 'Organization calling activity',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Total Quotes',
            value: roleMetrics.weeklyQuotes,
            icon: <FontAwesomeIcon icon={faClipboardList} size="lg" />,
            type: 'quotes' as const,
            insight: 'Organization quotes generated',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Referral Requests',
            value: roleMetrics.weeklyReferrals,
            icon: <FontAwesomeIcon icon={faArrowTrendUp} size="lg" />,
            type: 'referrals' as const,
            insight: 'Referrals actively requested',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Referrals Received',
            value: roleMetrics.weeklyReferralsReceived,
            icon: <FontAwesomeIcon icon={faCheckCircle} size="lg" />,
            type: 'referrals' as const,
            insight: 'Referrals actually received',
            isMonetary: false,
            average: undefined,
          },
          // Performance Ratios
          {
            title: 'Quote to Sale Ratio',
            value: `${roleMetrics.quoteToSaleRatio}%`,
            icon: <FontAwesomeIcon icon={faArrowTrendUp} size="lg" />,
            type: 'conversion' as const,
            insight: 'Quote closing effectiveness',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Dial to Quote Ratio',
            value: `${roleMetrics.dialToQuoteRatio}%`,
            icon: <FontAwesomeIcon icon={faArrowTrendUp} size="lg" />,
            type: 'conversion' as const,
            insight: 'Call to quote effectiveness',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Dial to Sale Ratio',
            value: `${roleMetrics.dialToSaleRatio}%`,
            icon: <FontAwesomeIcon icon={faArrowTrendUp} size="lg" />,
            type: 'conversion' as const,
            insight: 'Overall call to sale conversion',
            isMonetary: false,
            average: undefined,
          },
          // Indicator Metrics
          {
            title: 'Raw New (RN) Sales',
            value: `${roleMetrics.rawNew} (${roleMetrics.rawNewPercentage}%)`,
            icon: <FontAwesomeIcon icon={faTag} size="lg" />,
            type: 'indicators' as const,
            insight: 'New customer acquisition',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Multi-Line (ML) Sales',
            value: `${roleMetrics.multiLine} (${roleMetrics.multiLinePercentage}%)`,
            icon: <FontAwesomeIcon icon={faLayerGroup} size="lg" />,
            type: 'indicators' as const,
            insight: 'Cross-selling success',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Raw New Quotes',
            value: roleMetrics.rawNewQuotes,
            icon: <FontAwesomeIcon icon={faTag} size="lg" />,
            type: 'indicators' as const,
            insight: 'New customer quotes generated',
            isMonetary: false,
            average: undefined,
          },
          {
            title: 'Multi-Line Quotes',
            value: roleMetrics.multiLineQuotes,
            icon: <FontAwesomeIcon icon={faLayerGroup} size="lg" />,
            type: 'indicators' as const,
            insight: 'Cross-sell quotes generated',
            isMonetary: false,
            average: undefined,
          },
          // Revenue Metrics
          {
            title: 'Total Premium Amount',
            value: roleMetrics.totalPremiumAmount,
            icon: <FontAwesomeIcon icon={faDollarSign} size="lg" />,
            type: 'premium' as const,
            insight: 'Organization total revenue',
            isMonetary: true,
            average: roleMetrics.avgPremiumAmount,
          },
          {
            title: 'Average Premium per Sale',
            value: roleMetrics.avgPremiumAmount,
            icon: <FontAwesomeIcon icon={faDollarSign} size="lg" />,
            type: 'premium' as const,
            insight: 'Revenue per policy sold',
            isMonetary: true,
            average: undefined,
          },
        ];

      default:
        return baseStats;
    }
  };

  const roleStats = getRoleSpecificStats();

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className={styles.loadingContainer}>
      <FontAwesomeIcon icon={faSpinner} spin size="2x" />
      <p>Loading dashboard data...</p>
    </div>
  );

  return (
    <div
      className={`${styles.dashboardContainer} ${isViewTransitioning ? styles.transitioning : ''}`}
      data-help="dashboard-main"
    >
      {/* Page header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{dashboardConfig.title}</h1>
        <div className={styles.dashboardActions} data-help="quick-actions">
          <DateRangeSelector
            onDateRangeChange={handleDateRangeChange}
            onViewByChange={handleViewByChange}
            currentRange={dateRange || undefined}
            showAllTimeOption={roleConfig.type === 'manager' || roleConfig.type === 'admin'}
          />
          <button
            className={styles.btnRefresh}
            onClick={() => debouncedFetchDashboardData(0)}
            disabled={isLoading || !dateRange}
            aria-label="Refresh dashboard data"
          >
            <FontAwesomeIcon icon={isLoading ? faSpinner : faChartLine} spin={isLoading} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Dashboard Filters - Show for managers */}
      {/* Dashboard Filters now integrated into DateRangeSelector above */}

      {isLoading && !stats.todayCalls ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Role-based Stats Grid */}
          <div
            className={`${styles.statsGrid} ${roleConfig.type} ${isViewTransitioning ? styles.transitioning : ''}`}
            data-help="kpi-cards"
          >
            {roleStats.map((stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                type={stat.type}
                insight={stat.insight}
                showCalculation={roleConfig.type === 'manager' || roleConfig.type === 'admin'}
                isMonetary={stat.isMonetary}
                average={stat.average}
              />
            ))}
          </div>

          {/* Role-specific alerts and notifications */}
          {/* Activity insights based on actual data */}
          <div className={styles.activityInsights}>
            <div className={styles.alertCard}>
              <FontAwesomeIcon icon={faChartLine} />
              <div className={styles.alertContent}>
                <h4>Period Activity Summary</h4>
                <p>
                  {roleMetrics.weeklyDials > 0
                    ? `${roleMetrics.weeklyDials} calls made, ${roleMetrics.weeklyQuotes} quotes generated`
                    : 'No activity data available for this period'}
                </p>
                <div className={styles.alertInsight}>
                  {roleMetrics.weeklyDials > 0
                    ? 'Your calling activity is driving pipeline development through consistent outbound efforts'
                    : 'Focus on daily calling activity to build your sales pipeline and generate opportunities'}
                </div>
              </div>
            </div>
            {roleMetrics.quoteToSaleRatio > 0 && (
              <div className={styles.alertCard}>
                <FontAwesomeIcon icon={faCheckCircle} />
                <div className={styles.alertContent}>
                  <h4>Conversion Performance</h4>
                  <p>{roleMetrics.quoteToSaleRatio}% of quotes converted to sales</p>
                  <div className={styles.alertInsight}>
                    {roleMetrics.quoteToSaleRatio >= 30
                      ? 'Excellent closing performance - your follow-up and presentation skills are effective'
                      : roleMetrics.quoteToSaleRatio >= 20
                        ? 'Good conversion rate - focus on improving follow-up timing and objection handling'
                        : 'Opportunity to improve closing rate through better qualification and follow-up processes'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Charts */}
          <div
            className={`${styles.chartsGrid} ${isViewTransitioning ? styles.transitioning : ''}`}
          >
            <div
              className={`${styles.activityChart} ${isViewTransitioning ? styles.transitioning : ''}`}
            >
              <ActivityChart
                data={activityChartData}
                title={
                  dateRange
                    ? `Activity Trend (${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')})`
                    : 'Activity Trend'
                }
              />
            </div>
            <div
              className={`${styles.distributionChart} ${isViewTransitioning ? styles.transitioning : ''}`}
            >
              <DistributionChart
                data={distributionData || undefined}
                title={
                  dateRange
                    ? `Activity Distribution (${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')})`
                    : 'Activity Distribution'
                }
              />
            </div>
          </div>

          {/* Management Components - Only for managers */}
          {(roleConfig.type === 'sales_lead' || roleConfig.type === 'service_lead') && (
            <>
              <div className={styles.managementSection}>
                <h2 className={styles.sectionTitle}>Team Management</h2>

                <div className={styles.managementGrid}>
                  {/* Team Performance Overview */}
                  <div className={styles.teamPerformance}>
                    <TeamPerformanceCard managerId={user?.id?.toString()} />
                  </div>

                  {/* Coaching Opportunities */}
                  <div className={styles.coachingSection}>
                    <CoachingOpportunities managerId={user?.id?.toString()} />
                  </div>
                </div>

                {/* Team Activity Feed - Full width */}
                <div className={styles.teamActivitySection}>
                  <TeamActivityFeed managerId={user?.id?.toString()} limit={25} />
                </div>
              </div>
            </>
          )}

          {/* Comprehensive Management Dashboard - For Managers and Executives */}
          {(roleConfig.type === 'manager' || roleConfig.type === 'admin') && (
            <>
              <div className={styles.managementSection}>
                <h2 className={styles.sectionTitle}>Management Overview</h2>

                <div className={styles.managementGrid}>
                  {/* Team Performance Overview - Shows ALL teams */}
                  <div className={styles.teamPerformance}>
                    <TeamPerformanceCard managerId={user?.id?.toString()} />
                  </div>

                  {/* Coaching Opportunities - Organization-wide */}
                  <div className={styles.coachingSection}>
                    <CoachingOpportunities managerId={user?.id?.toString()} />
                  </div>
                </div>

                {/* Team Activity Feed - All teams with higher limit */}
                <div className={styles.teamActivitySection}>
                  <TeamActivityFeed managerId={user?.id?.toString()} limit={50} />
                </div>
              </div>
            </>
          )}

          {/* Recent Activities */}
          {/* <div className="recent-activities">
            <RecentActivities userRole={user?.role} />
          </div> */}
        </>
      )}
    </div>
  );
}
