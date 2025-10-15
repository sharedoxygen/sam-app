'use client';

import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faChartLine,
  faUsers,
  faPhone,
  faBullseye,
  faDollarSign,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDebouncedCallback, usePerformanceMonitor } from '@/lib/utils/performance';
import { Role } from '@prisma/client';
import styles from './DashboardPageContent.module.css'; // Import CSS Module

// Lazy load heavy components
const TeamPerformanceCard = lazy(() => import('@/components/dashboard/TeamPerformanceCard'));
const TeamActivityFeed = lazy(() => import('@/components/dashboard/TeamActivityFeed'));
const CoachingOpportunities = lazy(() => import('@/components/dashboard/CoachingOpportunities'));
const DistributionChart = lazy(() => import('@/components/dashboard/DistributionChart'));
const ActivityChart = lazy(() => import('@/components/dashboard/ActivityChart'));
const PremiumByDepartmentCard = lazy(
  () => import('@/components/dashboard/PremiumByDepartmentCard')
);
const PerformanceMetricsCard = lazy(
  () => import('@/components/weekly-performance/PerformanceMetricsCard')
);

// Loading fallback component
const ComponentLoader = ({ name }: { name: string }) => (
  <div className={styles.loadingCard}>
    <FontAwesomeIcon icon={faSpinner} spin size="lg" />
    <p>Loading {name}...</p>
  </div>
);

interface DashboardMetrics {
  totalCalls: number;
  totalSales: number;
  conversionRate: number;
  teamSize: number;
  totalPremiumAmount: number;
  averagePremiumAmount: number;
  weeklyMetrics?: {
    peopleContacted: number;
    lifeSalesConversations: number;
    sales: number;
    referralRequests: number;
    premiumAmount: number;
  };
}

interface DashboardPageContentProps {
  initialData?: any;
  isManager: boolean;
}

export default function DashboardPageContent({
  initialData,
  isManager,
}: DashboardPageContentProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCalls: 0,
    totalSales: 0,
    conversionRate: 0,
    teamSize: 0,
    totalPremiumAmount: 0,
    averagePremiumAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Performance monitoring in development
  const { renderCount } = usePerformanceMonitor(
    'DashboardPageContent',
    process.env.NODE_ENV === 'development'
  );

  // Check if user is admin
  const isAdmin = user?.role === Role.ADMIN;

  // Check if user is a lead role
  const isLead = user?.role === Role.SALES_LEAD || user?.role === Role.SERVICE_LEAD;

  // Debounced data fetching to prevent excessive API calls
  const debouncedFetchData = useDebouncedCallback(
    async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard');
        if (response.ok) {
          const data = await response.json();
          setMetrics({
            totalCalls: data.totalCalls || 0,
            totalSales: data.totalSales || 0,
            conversionRate: data.conversionRate || 0,
            teamSize: data.teamSize || 0,
            totalPremiumAmount: data.weeklyMetrics?.totalPremiumAmount || 0,
            averagePremiumAmount: data.ratios?.averagePremiumAmount || 0,
            weeklyMetrics: data.weeklyMetrics || undefined,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    },
    300, // 300ms debounce
    [user?.id]
  );

  useEffect(() => {
    if (user?.id) {
      debouncedFetchData();
    }
  }, [user?.id, debouncedFetchData]);

  // Memoize role-based component visibility
  const componentVisibility = useMemo(
    () => ({
      showPerformanceMetrics: true,
      showPremiumByDepartment: isAdmin,
      showTeamPerformance: isManager || isLead,
      showTeamActivity: isManager || isLead,
      showCoaching: isManager || isLead,
      showCharts: true,
    }),
    [isAdmin, isManager, isLead]
  );

  // Memoize quick stats based on role
  const quickStats = useMemo(() => {
    const baseStats = [
      {
        title: 'Total Calls',
        value: metrics.totalCalls,
        icon: faPhone,
        color: '#4a90e2',
      },
      {
        title: 'Total Sales',
        value: metrics.totalSales,
        icon: faBullseye,
        color: '#28a745',
      },
      {
        title: 'Conversion Rate',
        value: `${metrics.conversionRate.toFixed(1)}%`,
        icon: faChartLine,
        color: '#17a2b8',
      },
    ];

    // Add premium amount for admin
    if (isAdmin) {
      baseStats.push({
        title: 'Total Premium',
        value: `$${metrics.totalPremiumAmount.toLocaleString()}`,
        icon: faDollarSign,
        color: '#28a745',
      });
    }

    // Add team size for managers
    if (isManager || isLead) {
      baseStats.push({
        title: 'Team Size',
        value: metrics.teamSize,
        icon: faUsers,
        color: '#6f42c1',
      });
    }

    return baseStats;
  }, [metrics, isAdmin, isManager, isLead]);

  if (loading) {
    return (
      <div className={styles.dashboardLoading}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContent}>
      {/* Performance indicator in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.devPerformanceIndicator}>Renders: {renderCount}</div>
      )}

      {/* Quick Stats Row */}
      <div className={styles.statsRow}>
        {quickStats.map((stat) => (
          <div key={stat.title} className={styles.statCard}>
            <div
              ref={(el) => {
                if (el) {
                  el.style.setProperty('--stat-color', stat.color);
                }
              }}
              className={`${styles.statIcon} ${styles.withDynamicColor}`}
            >
              <FontAwesomeIcon icon={stat.icon} />
            </div>
            <div className={styles.statInfo}>
              <h3>{stat.value}</h3>
              <p>{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* Performance Metrics for Admin */}
        {componentVisibility.showPerformanceMetrics && metrics.weeklyMetrics && (
          <div className={styles.performanceSection}>
            <Suspense fallback={<ComponentLoader name="Performance Metrics" />}>
              <PerformanceMetricsCard
                title="Organization Performance Metrics"
                metrics={metrics.weeklyMetrics}
                isTeamSummary={true}
              />
            </Suspense>
          </div>
        )}

        {/* Premium by Department for Admin */}
        {componentVisibility.showPremiumByDepartment && (
          <div className={styles.premiumSection}>
            <Suspense fallback={<ComponentLoader name="Premium by Department" />}>
              <PremiumByDepartmentCard />
            </Suspense>
          </div>
        )}

        {/* Charts Section */}
        {componentVisibility.showCharts && (
          <div className={styles.chartSection}>
            <Suspense fallback={<ComponentLoader name="Activity Chart" />}>
              <ActivityChart data={initialData?.activityData} />
            </Suspense>

            <Suspense fallback={<ComponentLoader name="Distribution Chart" />}>
              <DistributionChart data={initialData?.distributionData} />
            </Suspense>
          </div>
        )}

        {/* Management Section - Only for managers/leads */}
        {componentVisibility.showTeamPerformance && (
          <div className={styles.managementSection}>
            <Suspense fallback={<ComponentLoader name="Team Performance" />}>
              <TeamPerformanceCard managerId={user?.id?.toString()} />
            </Suspense>
          </div>
        )}

        {/* Activity Feed */}
        {componentVisibility.showTeamActivity && (
          <div className={styles.activitySection}>
            <Suspense fallback={<ComponentLoader name="Team Activity" />}>
              <TeamActivityFeed />
            </Suspense>
          </div>
        )}

        {/* Coaching Opportunities */}
        {componentVisibility.showCoaching && (
          <div className={styles.coachingSection}>
            <Suspense fallback={<ComponentLoader name="Coaching Insights" />}>
              <CoachingOpportunities />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
