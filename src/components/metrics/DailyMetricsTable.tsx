'use client';

import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { WeeklyData, DateUtils } from '@/lib/api/apiService';
import MetricsCard from './MetricsCard';
import styles from './DailyMetricsTable.module.css';

type DailyMetricsTableProps = {
  weeklyData: WeeklyData;
  weekStartDate: string;
  weekEndDate: string;
  activeDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  onDaySelect: (day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday') => void;
  onNavigateWeek: (offset: number) => void;
  onUpdateMetric: (day: string, metricName: string, value: number) => void;
  isLoading?: boolean;
  allowEdit?: boolean;
};

/**
 * Reusable component for displaying daily metrics in a table format
 * with days of the week on the left side (per requirements)
 */
export default function DailyMetricsTable({
  weeklyData,
  weekStartDate,
  weekEndDate,
  activeDay,
  onDaySelect,
  onNavigateWeek,
  onUpdateMetric,
  isLoading = false,
  allowEdit = true,
}: DailyMetricsTableProps) {
  // Get all metrics for the active day
  const activeDayData = useMemo(() => {
    return weeklyData[activeDay];
  }, [weeklyData, activeDay]);

  // Format dates for display
  const formattedDate = (day: string) => {
    const dayData = weeklyData[day as keyof WeeklyData];
    if (!dayData?.date) return '';
    return DateUtils.formatDate(dayData.date, 'short');
  };

  // Handle day selection
  const handleDaySelect = (day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday') => {
    onDaySelect(day);
  };

  // Handle metric update
  const handleMetricUpdate = (metricName: string, value: number) => {
    onUpdateMetric(activeDay, metricName, value);
  };

  return (
    <div className={styles.dailyMetricsContainer}>
      {/* Week Navigation */}
      <div className={styles.weekNavigation}>
        <button
          className={styles.btnWeekNav}
          onClick={() => onNavigateWeek(-1)}
          aria-label="Previous week"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h3 className={styles.weekRange}>
          {weekStartDate} - {weekEndDate}
        </h3>
        <button
          className={styles.btnWeekNav}
          onClick={() => onNavigateWeek(1)}
          aria-label="Next week"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Metrics Table */}
      <div className={styles.metricsTableContainer}>
        {isLoading ? (
          <div className={styles.metricsLoading}>
            <div className={styles.spinnerBorder} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading metrics data...</p>
          </div>
        ) : (
          <div className={styles.metricsContent}>
            {/* Day selection sidebar */}
            <div className={styles.daySelector}>
              <div
                className={`${styles.dayItem} ${activeDay === 'monday' ? styles.active : ''}`}
                onClick={() => handleDaySelect('monday')}
              >
                <div className={styles.dayName}>Monday</div>
                <div className={styles.dayDate}>{formattedDate('monday')}</div>
              </div>
              <div
                className={`${styles.dayItem} ${activeDay === 'tuesday' ? styles.active : ''}`}
                onClick={() => handleDaySelect('tuesday')}
              >
                <div className={styles.dayName}>Tuesday</div>
                <div className={styles.dayDate}>{formattedDate('tuesday')}</div>
              </div>
              <div
                className={`${styles.dayItem} ${activeDay === 'wednesday' ? styles.active : ''}`}
                onClick={() => handleDaySelect('wednesday')}
              >
                <div className={styles.dayName}>Wednesday</div>
                <div className={styles.dayDate}>{formattedDate('wednesday')}</div>
              </div>
              <div
                className={`${styles.dayItem} ${activeDay === 'thursday' ? styles.active : ''}`}
                onClick={() => handleDaySelect('thursday')}
              >
                <div className={styles.dayName}>Thursday</div>
                <div className={styles.dayDate}>{formattedDate('thursday')}</div>
              </div>
              <div
                className={`${styles.dayItem} ${activeDay === 'friday' ? styles.active : ''}`}
                onClick={() => handleDaySelect('friday')}
              >
                <div className={styles.dayName}>Friday</div>
                <div className={styles.dayDate}>{formattedDate('friday')}</div>
              </div>
            </div>

            {/* Metrics cards for the selected day */}
            <div className={styles.metricsGrid}>
              <h3 className={styles.metricsDayTitle}>
                {activeDayData.dayOfWeek}{' '}
                <span className={styles.metricsDate}>
                  ({DateUtils.formatDate(activeDayData.date, 'medium')})
                </span>
              </h3>

              <div className={styles.metricsSection}>
                <h4 className={styles.sectionTitle}>Activity Metrics</h4>
                <div className={styles.metricsRow}>
                  <MetricsCard
                    metricId="peopleContacted"
                    title="People Contacted"
                    value={activeDayData.peopleContacted}
                    type="contacts"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) =>
                      handleMetricUpdate('peopleContacted', value)
                    }
                  />
                  <MetricsCard
                    metricId="peopleWithLifeConversation"
                    title="Life Conversations"
                    value={activeDayData.peopleWithLifeConversation}
                    type="life conversations"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) =>
                      handleMetricUpdate('peopleWithLifeConversation', value)
                    }
                  />
                  <MetricsCard
                    metricId="sales"
                    title="Sales"
                    value={activeDayData.sales}
                    type="sales"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) => handleMetricUpdate('sales', value)}
                  />
                  <MetricsCard
                    metricId="askingRatio"
                    title="Asking Ratio"
                    value={activeDayData.askingRatio}
                    type="asking ratio"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) => handleMetricUpdate('askingRatio', value)}
                  />
                </div>
              </div>

              <div className={styles.metricsSection}>
                <h4 className={styles.sectionTitle}>Quotes</h4>
                <div className={styles.metricsRow}>
                  <MetricsCard
                    metricId="quotesAuto"
                    title="Auto"
                    value={activeDayData.quotesAuto}
                    type="quotes"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) => handleMetricUpdate('quotesAuto', value)}
                  />
                  <MetricsCard
                    metricId="quotesLife"
                    title="Life/Health"
                    value={activeDayData.quotesLife}
                    type="quotes"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) => handleMetricUpdate('quotesLife', value)}
                  />
                  <MetricsCard
                    metricId="quotesFire"
                    title="Fire"
                    value={activeDayData.quotesFire}
                    type="quotes"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) => handleMetricUpdate('quotesFire', value)}
                  />
                </div>
              </div>

              <div className={styles.metricsSection}>
                <h4 className={styles.sectionTitle}>Closed Sales</h4>
                <div className={styles.metricsRow}>
                  <MetricsCard
                    metricId="closedAuto"
                    title="Auto"
                    value={activeDayData.closedAuto}
                    type="closed"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) => handleMetricUpdate('closedAuto', value)}
                  />
                  <MetricsCard
                    metricId="closedLife"
                    title="Life/Health"
                    value={activeDayData.closedLife}
                    type="closed"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) => handleMetricUpdate('closedLife', value)}
                  />
                  <MetricsCard
                    metricId="closedFire"
                    title="Fire"
                    value={activeDayData.closedFire}
                    type="closed"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) => handleMetricUpdate('closedFire', value)}
                  />
                </div>
              </div>

              <div className={styles.metricsSection}>
                <h4 className={styles.sectionTitle}>Referrals</h4>
                <div className={styles.metricsRow}>
                  <MetricsCard
                    metricId="referralsAsked"
                    title="Asked"
                    value={activeDayData.referralsAsked}
                    type="referrals"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) =>
                      handleMetricUpdate('referralsAsked', value)
                    }
                  />
                  <MetricsCard
                    metricId="referralsReceived"
                    title="Received"
                    value={activeDayData.referralsReceived}
                    type="referrals"
                    showControls={allowEdit}
                    onMetricChange={(metricId, value) =>
                      handleMetricUpdate('referralsReceived', value)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
