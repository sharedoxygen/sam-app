'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
  faCalendarDay,
  faSave,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faDollarSign,
  faChartBar,
  faNetworkWired,
  faStar,
  faBullseye,
} from '@fortawesome/free-solid-svg-icons';

import RevenueGenerationModalSimple from '@/components/activities/RevenueGenerationModalSimple';
import PipelineManagementModalSimple from '@/components/activities/PipelineManagementModalSimple';
import BusinessDevelopmentModalSimple from '@/components/activities/BusinessDevelopmentModalSimple';
import GoogleReviewModal from '@/components/activities/GoogleReviewModal';
import PerformanceMetricsCard from '@/components/activities/PerformanceMetricsCard';
import BackButton from '@/components/common/BackButton';
import TargetSettingModal from '@/components/weekly-performance/TargetSettingModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { useActivityData } from '@/lib/hooks/useActivityData';
import { classNames } from '@/lib/utils/classNames';
import styles from './page.module.css';
import { getPageHeaderForRole } from '@/lib/constants/roleConfig';
import DateRangeSelector from '@/components/dashboard/DateRangeSelector';

// Type definitions for daily data structure
type DailyRevenueData = {
  automotive: number;
  automotiveRN: number;
  automotiveML: number;
  automotivePremium: number;
  lifeHealth: number;
  lifeHealthRN: number;
  lifeHealthML: number;
  lifeHealthPremium: number;
  propertyFire: number;
  propertyFireRN: number;
  propertyFireML: number;
  propertyFirePremium: number;
};

type DailyPipelineData = {
  quotesAuto: number;
  quotesLife: number;
  quotesFire: number;
  quotesAutoRN: number;
  quotesAutoML: number;
  quotesLifeRN: number;
  quotesLifeML: number;
  quotesFireRN: number;
  quotesFireML: number;
  clientOutreachCalls: number;
};

type DailyBusinessData = {
  referralsRequested: number;
  referralsReceived: number;
};

type DailyGoogleReviewData = {
  reviews: Array<{
    id: string;
    clientName: string;
    reviewText?: string;
    rating?: number;
  }>;
};

type DailyDataState = {
  revenue: DailyRevenueData;
  pipeline: DailyPipelineData;
  business: DailyBusinessData;
  googleReviews: DailyGoogleReviewData;
};

export default function DailyActivity() {
  const { user } = useAuth();

  // Utility function to get progress class
  const getProgressClass = (percentage: number): string => {
    if (percentage >= 100) return styles.progress100;
    if (percentage >= 90) return styles.progress90;
    if (percentage >= 80) return styles.progress80;
    if (percentage >= 70) return styles.progress70;
    if (percentage >= 60) return styles.progress60;
    if (percentage >= 50) return styles.progress50;
    if (percentage >= 40) return styles.progress40;
    if (percentage >= 30) return styles.progress30;
    if (percentage >= 20) return styles.progress20;
    if (percentage >= 10) return styles.progress10;
    return styles.progress0;
  };
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [currentModal, setCurrentModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [performanceTargets, setPerformanceTargets] = useState<any>(null);

  // Target setting modal state
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [currentTargets, setCurrentTargets] = useState<any>(null);
  const [targetAgent, setTargetAgent] = useState<string>('');

  const {
    currentDate,
    weeklyData,
    saveStatus,
    lastSaved,
    error,
    updateActivityData,
    updateActivity,
    changeDate,
    manualSave,
    updateDayData,
    getEmptyDayActivities,
  } = useActivityData();

  // Days constant - needs to be defined before performanceMetrics
  const DAYS = [
    { key: 'monday', label: 'MON' },
    { key: 'tuesday', label: 'TUE' },
    { key: 'wednesday', label: 'WED' },
    { key: 'thursday', label: 'THU' },
    { key: 'friday', label: 'FRI' },
  ];

  // Initialize localDate to TODAY - ensures proper default date display
  const [localDate, setLocalDate] = useState(() => {
    // Always start with today's date for proper default view
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Sync the hook when localDate changes (user navigation)
  useEffect(() => {
    if (localDate !== currentDate) {
      changeDate(localDate);
    }
  }, [localDate, currentDate, changeDate]);

  // Modal states
  const [modals, setModals] = useState({
    revenue: false,
    pipeline: false,
    business: false,
    googleReview: false,
  });

  // Activity data states - now single day data instead of weekly
  const [dailyData, setDailyData] = useState<DailyDataState>({
    revenue: {
      automotive: 0,
      automotiveRN: 0,
      automotiveML: 0,
      automotivePremium: 0,
      lifeHealth: 0,
      lifeHealthRN: 0,
      lifeHealthML: 0,
      lifeHealthPremium: 0,
      propertyFire: 0,
      propertyFireRN: 0,
      propertyFireML: 0,
      propertyFirePremium: 0,
    },
    pipeline: {
      quotesAuto: 0,
      quotesLife: 0,
      quotesFire: 0,
      quotesAutoRN: 0,
      quotesAutoML: 0,
      quotesLifeRN: 0,
      quotesLifeML: 0,
      quotesFireRN: 0,
      quotesFireML: 0,
      clientOutreachCalls: 0,
    },
    business: {
      referralsRequested: 0,
      referralsReceived: 0,
    },
    googleReviews: {
      reviews: [],
    },
  });

  // Load data from weeklyData when it changes or date changes
  useEffect(() => {
    if (weeklyData) {
      // Get the day of week for the selected date
      const selectedDate = new Date(localDate);
      const dayOfWeek = selectedDate.getDay();
      const dayKey = DAYS[dayOfWeek === 0 ? 4 : dayOfWeek - 1]?.key || 'monday';

      // Extract data for the selected day from weeklyData
      const dayData = weeklyData[dayKey as keyof typeof weeklyData];

      setDailyData({
        revenue: {
          automotive: dayData?.closed?.auto || 0,
          automotiveRN: dayData?.closed?.autoRawNew || 0,
          automotiveML: dayData?.closed?.autoMultiLine || 0,
          automotivePremium: dayData?.closed?.automotivePremium || 0,
          lifeHealth: dayData?.closed?.lifeHealth || 0,
          lifeHealthRN: dayData?.closed?.lifeHealthRawNew || 0,
          lifeHealthML: dayData?.closed?.lifeHealthMultiLine || 0,
          lifeHealthPremium: dayData?.closed?.lifeHealthPremium || 0,
          propertyFire: dayData?.closed?.fire || 0,
          propertyFireRN: dayData?.closed?.fireRawNew || 0,
          propertyFireML: dayData?.closed?.fireMultiLine || 0,
          propertyFirePremium: dayData?.closed?.propertyFirePremium || 0,
        },
        pipeline: {
          quotesAuto: Math.round((dayData?.quotes || 0) * 0.4), // Round to whole numbers
          quotesLife: Math.round((dayData?.quotes || 0) * 0.35),
          quotesFire: Math.round((dayData?.quotes || 0) * 0.25),
          quotesAutoRN: Math.round((dayData?.quotesRawNew || 0) * 0.4),
          quotesAutoML: Math.round((dayData?.quotesMultiLine || 0) * 0.4),
          quotesLifeRN: Math.round((dayData?.quotesRawNew || 0) * 0.35),
          quotesLifeML: Math.round((dayData?.quotesMultiLine || 0) * 0.35),
          quotesFireRN: Math.round((dayData?.quotesRawNew || 0) * 0.25),
          quotesFireML: Math.round((dayData?.quotesMultiLine || 0) * 0.25),
          clientOutreachCalls: dayData?.dials || 0,
        },
        business: {
          referralsRequested: dayData?.referrals?.ask || 0,
          referralsReceived: dayData?.referrals?.received || 0,
        },
        googleReviews: {
          reviews: dayData?.googleReviews || [],
        },
      });
    }
  }, [weeklyData, localDate]);

  // Calculate totals for card metrics
  const getRevenueMetrics = () => {
    return [
      { label: 'Automotive Insurance', current: dailyData.revenue.automotive, target: 25 },
      { label: 'Life & Health Insurance', current: dailyData.revenue.lifeHealth, target: 15 },
      { label: 'Property & Fire Insurance', current: dailyData.revenue.propertyFire, target: 10 },
    ];
  };

  const getPipelineMetrics = () => {
    const totalQuotes =
      dailyData.pipeline.quotesAuto + dailyData.pipeline.quotesLife + dailyData.pipeline.quotesFire;
    return [
      { label: 'Total Quotes Generated', current: totalQuotes, target: 50 },
      { label: 'Auto Quotes', current: dailyData.pipeline.quotesAuto, target: 20 },
      { label: 'Life Quotes', current: dailyData.pipeline.quotesLife, target: 18 },
      { label: 'Fire Quotes', current: dailyData.pipeline.quotesFire, target: 12 },
      {
        label: 'Client Outreach Calls',
        current: dailyData.pipeline.clientOutreachCalls,
        target: 75,
      },
    ];
  };

  const getBusinessMetrics = () => {
    return [
      { label: 'Referrals Requested', current: dailyData.business.referralsRequested, target: 30 },
      { label: 'Referrals Received', current: dailyData.business.referralsReceived, target: 15 },
    ];
  };

  // Calculate performance metrics from actual activity data
  const performanceMetrics = useMemo(() => {
    // Calculate sales closed from revenue data
    const salesClosed =
      dailyData.revenue.automotive + dailyData.revenue.lifeHealth + dailyData.revenue.propertyFire;

    // Calculate indicators for sales
    const totalRawNew =
      dailyData.revenue.automotiveRN +
      dailyData.revenue.lifeHealthRN +
      dailyData.revenue.propertyFireRN;
    const totalMultiLine =
      dailyData.revenue.automotiveML +
      dailyData.revenue.lifeHealthML +
      dailyData.revenue.propertyFireML;

    // Calculate total premium amount
    const totalPremiumAmount =
      dailyData.revenue.automotivePremium +
      dailyData.revenue.lifeHealthPremium +
      dailyData.revenue.propertyFirePremium;

    // Calculate average premium per sale
    const averagePremium = salesClosed > 0 ? totalPremiumAmount / salesClosed : 0;

    // Calculate people contacted from pipeline data
    const totalQuotes =
      dailyData.pipeline.quotesAuto + dailyData.pipeline.quotesLife + dailyData.pipeline.quotesFire;
    const peopleContacted = Math.round(
      dailyData.pipeline.clientOutreachCalls * 0.35 + totalQuotes * 0.8
    );

    // Life conversations
    const lifeSalesConversations = Math.round(
      dailyData.revenue.lifeHealth * 2.0 + dailyData.pipeline.quotesLife * 0.5
    );

    // Referral requests
    const referralRequests = dailyData.business.referralsRequested;

    return {
      peopleContacted,
      lifeSalesConversations,
      salesClosed,
      referralRequests,
      rawNew: {
        count: totalRawNew,
        percentage: salesClosed > 0 ? Math.round((totalRawNew / salesClosed) * 100) : 0,
      },
      multiLine: {
        count: totalMultiLine,
        percentage: salesClosed > 0 ? Math.round((totalMultiLine / salesClosed) * 100) : 0,
      },
      premiumAmount: {
        total: totalPremiumAmount,
        average: averagePremium,
      },
      weeklyTrend: [], // Could be populated from historical data
    };
  }, [dailyData]);

  // Get role-based page configuration
  const pageHeader = getPageHeaderForRole(user?.role, 'dailyActivity');

  // Check if current user can set targets based on role hierarchy
  const canSetTargets =
    !!user?.role && ['ADMIN', 'OFFICE_MANAGER', 'SALES_LEAD', 'SERVICE_LEAD'].includes(user.role);

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    // Parse date string explicitly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Remove time component for comparison
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const compareYesterday = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );
    const compareTomorrow = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate()
    );

    if (compareDate.getTime() === compareToday.getTime()) {
      return `Today - ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
    } else if (compareDate.getTime() === compareYesterday.getTime()) {
      return `Yesterday - ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
    } else if (compareDate.getTime() === compareTomorrow.getTime()) {
      return `Tomorrow - ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  // Navigate to previous date
  const goToPreviousDate = () => {
    const currentDate = new Date(localDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setLocalDate(currentDate.toISOString().split('T')[0]);
  };

  // Navigate to next date
  const goToNextDate = () => {
    const currentDate = new Date(localDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setLocalDate(currentDate.toISOString().split('T')[0]);
  };

  // Go to today
  const goToToday = () => {
    const today = new Date();
    setLocalDate(today.toISOString().split('T')[0]);
  };

  // Check if selected date is today
  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return localDate === today;
  };

  // Check if selected date is in the future
  const isFutureDate = () => {
    const today = new Date().toISOString().split('T')[0];
    return localDate > today;
  };

  // Get save status display
  const getSaveStatusDisplay = () => {
    switch (saveStatus) {
      case 'saving':
        return {
          icon: faSpinner,
          text: 'Saving...',
          className: 'saving',
        };
      case 'saved':
        return {
          icon: faCheckCircle,
          text: 'Saved',
          className: 'saved',
        };
      case 'error':
        return {
          icon: faExclamationTriangle,
          text: 'Save Failed',
          className: 'error',
        };
      default:
        return null;
    }
  };

  // Modal handlers
  const openModal = (modal: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [modal]: true }));
  };

  const closeModal = (modal: keyof typeof modals) => {
    setModals((prev) => ({ ...prev, [modal]: false }));
  };

  // Get the day key for the selected date
  const getDayKeyForDate = (date: string) => {
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    return DAYS[dayOfWeek === 0 ? 4 : dayOfWeek - 1]?.key || 'monday';
  };

  const handleRevenueData = (data: {
    automotive: number;
    automotiveRN: number;
    automotiveML: number;
    automotivePremium: number;
    lifeHealth: number;
    lifeHealthRN: number;
    lifeHealthML: number;
    lifeHealthPremium: number;
    propertyFire: number;
    propertyFireRN: number;
    propertyFireML: number;
    propertyFirePremium: number;
  }) => {
    const dayKey = getDayKeyForDate(localDate);

    // Update local state
    setDailyData((prev) => ({
      ...prev,
      revenue: data,
    }));

    // Update weekly data through the hook
    const currentDayData = weeklyData[dayKey as keyof typeof weeklyData] || getEmptyDayActivities();

    updateDayData(dayKey as keyof typeof weeklyData, {
      ...currentDayData,
      closed: {
        auto: data.automotive,
        autoRawNew: data.automotiveRN,
        autoMultiLine: data.automotiveML,
        automotivePremium: data.automotivePremium,
        lifeHealth: data.lifeHealth,
        lifeHealthRawNew: data.lifeHealthRN,
        lifeHealthMultiLine: data.lifeHealthML,
        lifeHealthPremium: data.lifeHealthPremium,
        fire: data.propertyFire,
        fireRawNew: data.propertyFireRN,
        fireMultiLine: data.propertyFireML,
        propertyFirePremium: data.propertyFirePremium,
      },
    });
  };

  const handlePipelineData = (data: {
    quotesAuto: number;
    quotesLife: number;
    quotesFire: number;
    quotesAutoRN: number;
    quotesAutoML: number;
    quotesLifeRN: number;
    quotesLifeML: number;
    quotesFireRN: number;
    quotesFireML: number;
    clientOutreachCalls: number;
  }) => {
    const dayKey = getDayKeyForDate(localDate);

    // Update local state
    setDailyData((prev) => ({
      ...prev,
      pipeline: data,
    }));

    // Update weekly data through the hook
    const currentDayData = weeklyData[dayKey as keyof typeof weeklyData] || getEmptyDayActivities();
    const totalQuotes = data.quotesAuto + data.quotesLife + data.quotesFire;
    const totalRN = data.quotesAutoRN + data.quotesLifeRN + data.quotesFireRN;
    const totalML = data.quotesAutoML + data.quotesLifeML + data.quotesFireML;

    updateDayData(dayKey as keyof typeof weeklyData, {
      ...currentDayData,
      quotes: totalQuotes,
      quotesRawNew: totalRN,
      quotesMultiLine: totalML,
      dials: data.clientOutreachCalls,
    });
  };

  const handleBusinessData = (data: { referralsRequested: number; referralsReceived: number }) => {
    const dayKey = getDayKeyForDate(localDate);

    // Update local state
    setDailyData((prev) => ({
      ...prev,
      business: data,
    }));

    // Update weekly data through the hook
    const currentDayData = weeklyData[dayKey as keyof typeof weeklyData] || getEmptyDayActivities();

    updateDayData(dayKey as keyof typeof weeklyData, {
      ...currentDayData,
      referrals: {
        ask: data.referralsRequested,
        received: data.referralsReceived,
      },
    });
  };

  const handleGoogleReviewData = (data: { reviews: any[] }) => {
    const dayKey = getDayKeyForDate(localDate);

    // Update local state
    setDailyData((prev) => ({
      ...prev,
      googleReviews: data,
    }));

    // Update weekly data through the hook
    const currentDayData = weeklyData[dayKey as keyof typeof weeklyData] || getEmptyDayActivities();

    updateDayData(dayKey as keyof typeof weeklyData, {
      ...currentDayData,
      googleReviews: data.reviews,
    });
  };

  // Redirect if no user or unauthorized
  useEffect(() => {
    if (!user) return;

    // Only SALES, SERVICE, SALES_LEAD, SERVICE_LEAD, and OFFICE_MANAGER can access
    const allowedRoles = ['SALES', 'SERVICE', 'SALES_LEAD', 'SERVICE_LEAD', 'OFFICE_MANAGER'];
    if (!allowedRoles.includes(user.role)) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  // Fetch performance targets for the current user
  const fetchPerformanceTargets = useCallback(async () => {
    if (!user?.id || !user?.role) return;

    try {
      // Fetch targets directly from the database instead of using the service
      const response = await fetch(`/api/performance-targets?userId=${user.id}&weekStartDate=${currentDate}`);
      if (response.ok) {
        const data = await response.json();
        setPerformanceTargets(data.targets);
      } else {
        // Fallback to default targets
        const defaultTargets = {
          peopleContacted: 50,
          lifeSalesConversations: 15,
          salesClosed: 5,
          referralRequests: 10,
          premiumAmount: 10000,
          rawNew: 2,
          multiLine: 2,
          googleReviews: 2,
        };
        setPerformanceTargets(defaultTargets);
      }
    } catch (error) {
      console.error('Error fetching performance targets:', error);
      // Fallback to default targets
      const defaultTargets = {
        peopleContacted: 50,
        lifeSalesConversations: 15,
        salesClosed: 5,
        referralRequests: 10,
        premiumAmount: 10000,
        rawNew: 2,
        multiLine: 2,
        googleReviews: 2,
      };
      setPerformanceTargets(defaultTargets);
    }
  }, [user, currentDate]);

  // Load current targets for target setting modal
  const loadCurrentTargets = useCallback(async () => {
    if (!user?.id || !user?.role) return;

    try {
      // Fetch targets directly from the database instead of using the service
      const response = await fetch(`/api/performance-targets?userId=${user.id}&weekStartDate=${currentDate}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentTargets(data.targets);
      } else {
        // Fallback to default targets
        const defaultTargets = {
          peopleContacted: 50,
          lifeSalesConversations: 15,
          salesClosed: 5,
          referralRequests: 10,
          premiumAmount: 10000,
          rawNew: 2,
          multiLine: 2,
          googleReviews: 2,
        };
        setCurrentTargets(defaultTargets);
      }
    } catch (error) {
      console.error('Error loading targets:', error);
      // Fallback to default targets
      const defaultTargets = {
        peopleContacted: 50,
        lifeSalesConversations: 15,
        salesClosed: 5,
        referralRequests: 10,
        premiumAmount: 10000,
        rawNew: 2,
        multiLine: 2,
        googleReviews: 2,
      };
      setCurrentTargets(defaultTargets);
    }
  }, [user, currentDate]);

  // Handle opening target setting modal
  const handleEditTargets = useCallback(() => {
    setTargetAgent(user?.name || 'Agent');
    loadCurrentTargets();
    setShowTargetModal(true);
  }, [user?.name, loadCurrentTargets]);

  // Handle saving targets with proper data integrity
  const handleSaveTargets = useCallback(
    async (targets: any) => {
      if (!user?.id || !user?.role) return;

      try {
        const response = await fetch('/api/performance-targets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            targets,
            weekStartDate: currentDate,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save targets');
        }

        // Reload the targets
        await Promise.all([loadCurrentTargets(), fetchPerformanceTargets()]);

        setShowTargetModal(false);
      } catch (error) {
        console.error('Error saving targets:', error);
        throw error; // Re-throw to let modal handle the error
      }
    },
    [user, currentDate, loadCurrentTargets, fetchPerformanceTargets]
  );

  // Load performance targets when user changes
  useEffect(() => {
    fetchPerformanceTargets();
  }, [fetchPerformanceTargets]);

  return (
    <div className={styles.dailyActivityContainer}>
      <BackButton />

      {/* Header Section */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <FontAwesomeIcon icon={faCalendarDay} className={styles.headerIcon} />
            <div>
              <h1 className={styles.pageTitle}>{pageHeader.title || 'Daily Activity'}</h1>
              <p className={styles.pageSubtitle}>Track your daily performance metrics</p>
            </div>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{performanceMetrics.salesClosed}</span>
              <span className={styles.statLabel}>Sales Today</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                ${Math.round(performanceMetrics.premiumAmount.total).toLocaleString()}
              </span>
              <span className={styles.statLabel}>Premium Amount</span>
            </div>
            {canSetTargets && (
              <div className={styles.statItem}>
                <button
                  onClick={handleEditTargets}
                  className={styles.targetButton}
                  disabled={isLoading}
                >
                  <FontAwesomeIcon icon={faBullseye} />
                  <span>Set Targets</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      {user?.role === 'SALES' || user?.role === 'SERVICE' ? (
        <div className={styles.dateSelector}>
          <DateRangeSelector
            onDateRangeChange={({ start }: { start: Date }) =>
              setLocalDate(start.toISOString().split('T')[0])
            }
            initialRange={{ start: new Date(localDate), end: new Date(localDate) }}
            showAllTimeOption={false}
          />
        </div>
      ) : (
        <div className={styles.dateNavigation}>
          <button onClick={goToPreviousDate} className={styles.navButton} disabled={isLoading}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <div className={styles.currentDate}>
            <FontAwesomeIcon icon={faCalendarDay} className={styles.dateIcon} />
            <div className={styles.dateInfo}>
              <div className={styles.dateText}>{formatDisplayDate(localDate)}</div>
              {!isToday() && (
                <button onClick={goToToday} className={styles.todayButton}>
                  Go to Today
                </button>
              )}
            </div>
          </div>
          <button onClick={goToNextDate} className={styles.navButton} disabled={isLoading}>
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      )}

      {/* Performance Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FontAwesomeIcon icon={faDollarSign} />
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>{performanceMetrics.salesClosed}</div>
            <div className={styles.summaryLabel}>Total Sales</div>
            <div className={styles.summaryTarget}>
              Target: {performanceTargets?.salesClosed || 5}
            </div>
          </div>
          <div className={styles.summaryProgress}>
            <div
              className={`${styles.progressBar} ${getProgressClass(Math.min((performanceMetrics.salesClosed / (performanceTargets?.salesClosed || 5)) * 100, 100))}`}
            />
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FontAwesomeIcon icon={faChartBar} />
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>
              {dailyData.pipeline.quotesAuto +
                dailyData.pipeline.quotesLife +
                dailyData.pipeline.quotesFire}
            </div>
            <div className={styles.summaryLabel}>Total Quotes</div>
            <div className={styles.summaryTarget}>
              Target: {performanceTargets?.peopleContacted || 50}
            </div>
          </div>
          <div className={styles.summaryProgress}>
            <div
              className={`${styles.progressBar} ${getProgressClass(Math.min(((dailyData.pipeline.quotesAuto + dailyData.pipeline.quotesLife + dailyData.pipeline.quotesFire) / (performanceTargets?.peopleContacted || 50)) * 100, 100))}`}
            />
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FontAwesomeIcon icon={faNetworkWired} />
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>{dailyData.business.referralsRequested}</div>
            <div className={styles.summaryLabel}>Referrals</div>
            <div className={styles.summaryTarget}>
              Target: {performanceTargets?.referralRequests || 10}
            </div>
          </div>
          <div className={styles.summaryProgress}>
            <div
              className={`${styles.progressBar} ${getProgressClass(Math.min((dailyData.business.referralsRequested / (performanceTargets?.referralRequests || 10)) * 100, 100))}`}
            />
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <FontAwesomeIcon icon={faStar} />
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryValue}>{dailyData.googleReviews.reviews.length}</div>
            <div className={styles.summaryLabel}>Reviews</div>
            <div className={styles.summaryTarget}>
              Target: {performanceTargets?.googleReviews || 2}
            </div>
          </div>
          <div className={styles.summaryProgress}>
            <div
              className={`${styles.progressBar} ${getProgressClass(Math.min((dailyData.googleReviews.reviews.length / (performanceTargets?.googleReviews || 2)) * 100, 100))}`}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.contentGrid}>
        {/* Activity Input Cards */}
        <div className={styles.activitySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Activity Input</h2>
            <p className={styles.sectionSubtitle}>Click on any card to add today's activities</p>
          </div>

          <div className={styles.activityCardsGrid}>
            <div className={styles.activityInputCard} onClick={() => openModal('revenue')}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${styles.revenueIcon}`}>
                  <FontAwesomeIcon icon={faDollarSign} />
                </div>
                <div className={styles.cardTitle}>
                  <h3>Revenue Generation</h3>
                  <p>Add closed sales and premium amounts</p>
                </div>
                <div className={styles.cardValue}>
                  {dailyData.revenue.automotive +
                    dailyData.revenue.lifeHealth +
                    dailyData.revenue.propertyFire || 0}
                </div>
              </div>
              <div className={styles.cardMetrics}>
                <div className={styles.metricRow}>
                  <span>Automotive</span>
                  <span className={styles.metricValue}>{dailyData.revenue.automotive}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Life & Health</span>
                  <span className={styles.metricValue}>{dailyData.revenue.lifeHealth}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Property & Fire</span>
                  <span className={styles.metricValue}>{dailyData.revenue.propertyFire}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Total Premium</span>
                  <span className={styles.metricValue}>
                    $
                    {(
                      dailyData.revenue.automotivePremium +
                      dailyData.revenue.lifeHealthPremium +
                      dailyData.revenue.propertyFirePremium
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className={styles.cardAction}>
                <span>Click to add sales</span>
                <FontAwesomeIcon icon={faChevronRight} />
              </div>
            </div>

            <div className={styles.activityInputCard} onClick={() => openModal('pipeline')}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${styles.pipelineIcon}`}>
                  <FontAwesomeIcon icon={faChartBar} />
                </div>
                <div className={styles.cardTitle}>
                  <h3>Pipeline Management</h3>
                  <p>Track quotes and client outreach</p>
                </div>
                <div className={styles.cardValue}>
                  {dailyData.pipeline.quotesAuto +
                    dailyData.pipeline.quotesLife +
                    dailyData.pipeline.quotesFire || 0}
                </div>
              </div>
              <div className={styles.cardMetrics}>
                <div className={styles.metricRow}>
                  <span>Auto Quotes</span>
                  <span className={styles.metricValue}>{dailyData.pipeline.quotesAuto}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Life Quotes</span>
                  <span className={styles.metricValue}>{dailyData.pipeline.quotesLife}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Fire Quotes</span>
                  <span className={styles.metricValue}>{dailyData.pipeline.quotesFire}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Outreach Calls</span>
                  <span className={styles.metricValue}>
                    {dailyData.pipeline.clientOutreachCalls}
                  </span>
                </div>
              </div>
              <div className={styles.cardAction}>
                <span>Click to add quotes</span>
                <FontAwesomeIcon icon={faChevronRight} />
              </div>
            </div>

            <div className={styles.activityInputCard} onClick={() => openModal('business')}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${styles.businessIcon}`}>
                  <FontAwesomeIcon icon={faNetworkWired} />
                </div>
                <div className={styles.cardTitle}>
                  <h3>Business Development</h3>
                  <p>Track referrals and networking</p>
                </div>
                <div className={styles.cardValue}>{dailyData.business.referralsRequested || 0}</div>
              </div>
              <div className={styles.cardMetrics}>
                <div className={styles.metricRow}>
                  <span>Referrals Requested</span>
                  <span className={styles.metricValue}>
                    {dailyData.business.referralsRequested}
                  </span>
                </div>
                <div className={styles.metricRow}>
                  <span>Referrals Received</span>
                  <span className={styles.metricValue}>{dailyData.business.referralsReceived}</span>
                </div>
              </div>
              <div className={styles.cardAction}>
                <span>Click to add referrals</span>
                <FontAwesomeIcon icon={faChevronRight} />
              </div>
            </div>

            <div className={styles.activityInputCard} onClick={() => openModal('googleReview')}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${styles.reviewIcon}`}>
                  <FontAwesomeIcon icon={faStar} />
                </div>
                <div className={styles.cardTitle}>
                  <h3>Google Reviews</h3>
                  <p>Track customer feedback</p>
                </div>
                <div className={styles.cardValue}>
                  {dailyData.googleReviews.reviews.length || 0}
                </div>
              </div>
              <div className={styles.cardMetrics}>
                <div className={styles.metricRow}>
                  <span>Total Reviews</span>
                  <span className={styles.metricValue}>
                    {dailyData.googleReviews.reviews.length}
                  </span>
                </div>
                {dailyData.googleReviews.reviews.length > 0 && (
                  <div className={styles.reviewsList}>
                    {dailyData.googleReviews.reviews.slice(0, 2).map((review, index) => (
                      <div key={index} className={styles.reviewItem}>
                        <span className={styles.clientName}>{review.clientName}</span>
                        {review.rating && (
                          <span className={styles.rating}>{'★'.repeat(review.rating)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.cardAction}>
                <span>Click to add reviews</span>
                <FontAwesomeIcon icon={faChevronRight} />
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className={styles.errorBanner}>
            <FontAwesomeIcon icon={faExclamationTriangle} className={styles.errorIcon} />
            <div className={styles.errorContent}>
              <span className={styles.errorTitle}>❌ Data Not Saved</span>
              <span className={styles.errorMessage}>{error}</span>
              {error.includes('Authentication failed') && (
                <div className={styles.errorActions}>
                  <button onClick={() => window.location.reload()} className={styles.reloadButton}>
                    🔄 Refresh Page & Login Again
                  </button>
                </div>
              )}
              {error.includes('Connection failed') && (
                <div className={styles.errorActions}>
                  <button
                    onClick={manualSave}
                    className={styles.retryButton}
                    disabled={saveStatus === 'saving'}
                  >
                    🔄 Retry Save
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Status */}
        <div className={styles.saveStatusBanner}>
          <div className={styles.saveStatus}>
            <FontAwesomeIcon
              icon={
                saveStatus === 'saving'
                  ? faSpinner
                  : saveStatus === 'saved'
                    ? faCheckCircle
                    : saveStatus === 'error'
                      ? faExclamationTriangle
                      : faCheckCircle
              }
              className={classNames(
                styles.saveIcon,
                saveStatus === 'saving' && styles.spinning,
                saveStatus === 'saved' && styles.success,
                saveStatus === 'error' && styles.error
              )}
            />
            <span className={styles.saveStatusText}>
              {saveStatus === 'saving' && 'Saving changes...'}
              {saveStatus === 'saved' &&
                `Saved ${lastSaved ? new Date(lastSaved).toLocaleTimeString() : ''}`}
              {saveStatus === 'error' && (error || 'Error saving changes')}
              {saveStatus === 'idle' && 'All changes saved'}
            </span>
          </div>
          <button
            onClick={manualSave}
            className={styles.manualSaveButton}
            disabled={saveStatus === 'saving' || isLoading}
          >
            <FontAwesomeIcon icon={faSave} />
            Save All
          </button>
        </div>

        {/* Performance Metrics Card */}
        {!isLoading && (
          <div className={styles.performanceSection}>
            <PerformanceMetricsCard
              peopleContacted={performanceMetrics.peopleContacted}
              lifeSalesConversations={performanceMetrics.lifeSalesConversations}
              salesClosed={performanceMetrics.salesClosed}
              referralRequests={performanceMetrics.referralRequests}
              rawNew={performanceMetrics.rawNew}
              multiLine={performanceMetrics.multiLine}
              premiumAmount={performanceMetrics.premiumAmount}
              weeklyTrend={performanceMetrics.weeklyTrend}
              targets={performanceTargets || undefined}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <RevenueGenerationModalSimple
        isOpen={modals.revenue}
        onClose={() => closeModal('revenue')}
        onSave={handleRevenueData}
        selectedDate={localDate}
        initialData={dailyData.revenue}
      />

      <PipelineManagementModalSimple
        isOpen={modals.pipeline}
        onClose={() => closeModal('pipeline')}
        onSave={handlePipelineData}
        selectedDate={localDate}
        initialData={dailyData.pipeline}
      />

      <BusinessDevelopmentModalSimple
        isOpen={modals.business}
        onClose={() => closeModal('business')}
        onSave={handleBusinessData}
        selectedDate={localDate}
        initialData={dailyData.business}
      />

      <GoogleReviewModal
        isOpen={modals.googleReview}
        onClose={() => closeModal('googleReview')}
        onSave={handleGoogleReviewData}
        selectedDate={localDate}
        initialData={dailyData.googleReviews}
      />

      {/* Target Setting Modal - Only for authorized roles */}
      {canSetTargets && (
        <TargetSettingModal
          isOpen={showTargetModal}
          onClose={() => setShowTargetModal(false)}
          onSave={handleSaveTargets}
          currentTargets={currentTargets || undefined}
          agentName={targetAgent}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
