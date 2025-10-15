'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarWeek } from '@fortawesome/free-solid-svg-icons';
import WeeklyActivityGrid from '@/components/weekly/WeeklyActivityGrid';
import BackButton from '@/components/common/BackButton';

// Import CSS module
import styles from './page.module.css';

export default function WeeklySummary() {
  // State for week tracking
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  // Professional business title for the page with project header as per requirements
  const pageTitle = 'Weekly Performance Summary';

  // BackButton component is now imported directly

  // Get week start and end dates for display
  const getWeekDates = (offset = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday

    const weekStart = new Date(now);
    weekStart.setDate(diff + offset * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Only count weekdays (Monday to Friday)

    const formatDate = (date: Date) => {
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    };

    return {
      startDate: formatDate(weekStart),
      endDate: formatDate(weekEnd),
    };
  };

  // Current week dates
  const { startDate, endDate } = getWeekDates(weekOffset);

  // Handle week navigation
  const navigateWeek = (direction: number) => {
    setWeekOffset((prev) => prev + direction);
  };

  // Handle data changes from the grid
  const handleActivityChange = (data: any) => {
    console.log('Weekly activity data updated:', data);
    // Here you would typically save this data to your backend
  };

  // Handle totals changes
  const handleTotalsChange = (data: any) => {
    console.log('Weekly totals updated:', data);
    // Here you would typically save this data to your backend
  };

  // Handle ratios changes
  const handleRatiosChange = (data: any) => {
    console.log('Weekly ratios updated:', data);
    // Here you would typically save this data to your backend
  };

  return (
    <div className={styles.weeklySummaryContainer}>
      {/* Page header with title */}
      <div className={styles.pageHeader}>
        <h1 className="page-title">{pageTitle}</h1>
        <BackButton />
      </div>

      {/* Week navigation */}
      <div className={styles.weekNavigation}>
        <button
          className={styles.btnWeekNav}
          onClick={() => navigateWeek(-1)}
          aria-label="Previous week"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <div className={styles.weekDateRange}>
          <span className={styles.calendarIcon}>
            <FontAwesomeIcon icon={faCalendarWeek} />
          </span>
          <h3>
            Week of {startDate} - {endDate}
          </h3>
        </div>

        <button
          className={styles.btnWeekNav}
          onClick={() => navigateWeek(1)}
          aria-label="Next week"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Weekly Activity Grid - implements image 3's spreadsheet-like view */}
      <div className={styles.activityGridWrapper}>
        {loading ? (
          <div className={styles.loadingIndicator}>
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading weekly data...</p>
          </div>
        ) : (
          <WeeklyActivityGrid
            allowEdit={true}
            onActivityChange={handleActivityChange}
            onTotalsChange={handleTotalsChange}
            onRatiosChange={handleRatiosChange}
          />
        )}
      </div>
    </div>
  );
}
