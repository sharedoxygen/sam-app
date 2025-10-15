'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faChevronLeft,
  faChevronRight,
  faCaretDown,
} from '@fortawesome/free-solid-svg-icons';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
  subDays,
} from 'date-fns';
import styles from './DateRangeSelector.module.css';

type DateRange = {
  start: Date;
  end: Date;
};

type PresetPeriod =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'last30Days'
  | 'last90Days'
  | 'allTime'
  | 'dataRange'
  | 'custom';

type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom';

type ViewGranularity = 'day' | 'week' | 'month' | 'year';

interface DateRangeSelectorProps {
  onDateRangeChange: (range: DateRange) => void;
  onViewByChange?: (viewBy: ViewGranularity) => void;
  initialRange?: DateRange;
  currentRange?: DateRange; // For external updates from parent
  showAllTimeOption?: boolean;
  autoExpandForYearView?: boolean;
}

const PRESET_OPTIONS: { value: PresetPeriod; label: string; periodType: PeriodType }[] = [
  { value: 'today', label: 'Today', periodType: 'custom' },
  { value: 'yesterday', label: 'Yesterday', periodType: 'custom' },
  { value: 'thisWeek', label: 'This Week', periodType: 'week' },
  { value: 'lastWeek', label: 'Last Week', periodType: 'week' },
  { value: 'thisMonth', label: 'This Month', periodType: 'month' },
  { value: 'lastMonth', label: 'Last Month', periodType: 'month' },
  { value: 'thisQuarter', label: 'This Quarter', periodType: 'quarter' },
  { value: 'lastQuarter', label: 'Last Quarter', periodType: 'quarter' },
  { value: 'thisYear', label: 'This Year', periodType: 'year' },
  { value: 'lastYear', label: 'Last Year', periodType: 'year' },
  { value: 'last30Days', label: 'Last 30 Days', periodType: 'custom' },
  { value: 'last90Days', label: 'Last 90 Days', periodType: 'custom' },
  { value: 'dataRange', label: 'Full Data Range', periodType: 'custom' },
  { value: 'allTime', label: 'All Time', periodType: 'custom' },
];

export default function DateRangeSelector({
  onDateRangeChange,
  onViewByChange,
  initialRange,
  currentRange,
  showAllTimeOption = true,
  autoExpandForYearView = false,
}: DateRangeSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetPeriod>('thisWeek');
  const [currentPeriodType, setCurrentPeriodType] = useState<PeriodType>('week');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (initialRange) return initialRange;
    const now = new Date();
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [dynamicDataRange, setDynamicDataRange] = useState<{ start: Date; end: Date } | null>(null);
  const [currentViewBy, setCurrentViewBy] = useState<ViewGranularity>('week');

  // Filter out allTime option if not needed
  const availablePresets = showAllTimeOption
    ? PRESET_OPTIONS
    : PRESET_OPTIONS.filter((opt) => opt.value !== 'allTime');

  // View By options with smart date range logic
  const viewByOptions: {
    value: ViewGranularity;
    label: string;
    icon: string;
    description: string;
  }[] = [
    { value: 'day', label: 'Daily', icon: 'D', description: 'Today only' },
    { value: 'week', label: 'Weekly', icon: 'W', description: 'Last 4 weeks' },
    { value: 'month', label: 'Monthly', icon: 'M', description: 'Current month' },
    { value: 'year', label: 'Yearly', icon: 'Y', description: 'Full data range' },
  ];

  useEffect(() => {
    onDateRangeChange(dateRange);
  }, [dateRange, onDateRangeChange]);

  // Respond to external date range changes from parent
  useEffect(() => {
    if (
      currentRange &&
      (Math.abs(currentRange.start.getTime() - dateRange.start.getTime()) > 1000 ||
        Math.abs(currentRange.end.getTime() - dateRange.end.getTime()) > 1000)
    ) {
      setDateRange(currentRange);
      setSelectedPreset('custom'); // Mark as custom when externally changed
      setCurrentPeriodType('custom');
    }
  }, [currentRange]); // Remove dateRange from dependencies to prevent loop

  // Fetch dynamic data range on component mount
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

  const calculateDateRange = (preset: PresetPeriod): DateRange => {
    switch (preset) {
      case 'today': {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);
        return { start, end };
      }
      case 'yesterday': {
        const yesterday = subDays(new Date(), 1);
        const start = startOfDay(yesterday);
        const end = endOfDay(yesterday);
        return { start, end };
      }
      case 'thisWeek': {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const end = endOfWeek(today, { weekStartsOn: 1 });
        return { start, end };
      }
      case 'lastWeek': {
        const lastWeek = subWeeks(new Date(), 1);
        const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
        return { start, end };
      }
      case 'thisMonth': {
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        return { start, end };
      }
      case 'lastMonth': {
        const lastMonth = subMonths(new Date(), 1);
        const start = startOfMonth(lastMonth);
        const end = endOfMonth(lastMonth);
        return { start, end };
      }
      case 'thisQuarter': {
        const today = new Date();
        const start = startOfQuarter(today);
        const end = endOfQuarter(today);
        return { start, end };
      }
      case 'lastQuarter': {
        const lastQuarter = subQuarters(new Date(), 1);
        const start = startOfQuarter(lastQuarter);
        const end = endOfQuarter(lastQuarter);
        return { start, end };
      }
      case 'thisYear': {
        const today = new Date();
        const start = startOfYear(today);
        const end = endOfYear(today);
        return { start, end };
      }
      case 'lastYear': {
        const lastYear = subYears(new Date(), 1);
        const start = startOfYear(lastYear);
        const end = endOfYear(lastYear);
        return { start, end };
      }
      case 'last30Days': {
        const end = endOfDay(new Date());
        const start = startOfDay(subDays(new Date(), 29));
        return { start, end };
      }
      case 'last90Days': {
        const end = endOfDay(new Date());
        const start = startOfDay(subDays(new Date(), 89));
        return { start, end };
      }
      case 'dataRange': {
        if (dynamicDataRange) {
          return {
            start: dynamicDataRange.start,
            end: dynamicDataRange.end,
          };
        }
        // Fallback if API data not loaded yet
        const start = new Date('2024-01-01');
        const end = endOfDay(new Date());
        return { start, end };
      }
      case 'allTime': {
        if (dynamicDataRange) {
          return {
            start: dynamicDataRange.start,
            end: endOfDay(new Date()),
          };
        }
        // Fallback if API data not loaded yet
        const start = new Date('2024-01-01');
        const end = endOfDay(new Date());
        return { start, end };
      }
      case 'custom':
      default:
        return dateRange;
    }
  };

  const handlePresetSelect = (preset: PresetPeriod) => {
    if (preset === 'custom') {
      setShowCustomPicker(true);
      setShowDropdown(false);
      return;
    }

    setSelectedPreset(preset);
    const option = availablePresets.find((opt) => opt.value === preset);
    if (option) {
      setCurrentPeriodType(option.periodType);
    }
    const newRange = calculateDateRange(preset);
    setDateRange(newRange);
    setShowDropdown(false);
    setShowCustomPicker(false);
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    let newStart: Date;
    let newEnd: Date;

    switch (currentPeriodType) {
      case 'week':
        if (direction === 'prev') {
          newStart = subWeeks(dateRange.start, 1);
          newEnd = subWeeks(dateRange.end, 1);
        } else {
          newStart = addWeeks(dateRange.start, 1);
          newEnd = addWeeks(dateRange.end, 1);
        }
        break;
      case 'month':
        if (direction === 'prev') {
          newStart = subMonths(dateRange.start, 1);
          newEnd = endOfMonth(newStart);
        } else {
          newStart = addMonths(dateRange.start, 1);
          newEnd = endOfMonth(newStart);
        }
        break;
      case 'quarter':
        if (direction === 'prev') {
          newStart = subQuarters(dateRange.start, 1);
          newEnd = endOfQuarter(newStart);
        } else {
          newStart = addQuarters(dateRange.start, 1);
          newEnd = endOfQuarter(newStart);
        }
        break;
      case 'year':
        if (direction === 'prev') {
          newStart = subYears(dateRange.start, 1);
          newEnd = endOfYear(newStart);
        } else {
          newStart = addYears(dateRange.start, 1);
          newEnd = endOfYear(newStart);
        }
        break;
      default: {
        // For custom ranges, shift by the same duration
        const duration = dateRange.end.getTime() - dateRange.start.getTime();
        if (direction === 'prev') {
          newEnd = new Date(dateRange.start.getTime() - 1);
          newStart = new Date(newEnd.getTime() - duration);
        } else {
          newStart = new Date(dateRange.end.getTime() + 1);
          newEnd = new Date(newStart.getTime() + duration);
        }
        break;
      }
    }

    // Don't navigate beyond today
    const today = new Date();
    if (isAfter(newStart, today)) return;

    setDateRange({ start: newStart, end: newEnd });
    setSelectedPreset('custom');
  };

  const handleCustomDateSubmit = () => {
    const start = parseISO(customStartDate);
    const end = parseISO(customEndDate);

    if (isAfter(start, end)) {
      alert('Start date must be before end date');
      return;
    }

    setDateRange({ start, end });
    setSelectedPreset('custom');
    setCurrentPeriodType('custom');
    setShowCustomPicker(false);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Smart View By handler - automatically adjusts date range
  const handleViewByChange = (viewBy: ViewGranularity) => {
    setCurrentViewBy(viewBy);

    const now = new Date();
    let newDateRange: DateRange;
    let newPreset: PresetPeriod;

    switch (viewBy) {
      case 'day':
        // For daily view, show today only
        newDateRange = {
          start: startOfDay(now),
          end: endOfDay(now),
        };
        newPreset = 'today';
        setCurrentPeriodType('custom');
        break;

      case 'week':
        // For weekly view, show last 4 weeks
        newDateRange = {
          start: startOfWeek(subWeeks(now, 3), { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
        newPreset = 'custom';
        setCurrentPeriodType('week');
        break;

      case 'month':
        // For monthly view, show current month
        newDateRange = {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
        newPreset = 'thisMonth';
        setCurrentPeriodType('month');
        break;

      case 'year':
        // For yearly view, show full data range
        if (dynamicDataRange) {
          newDateRange = {
            start: dynamicDataRange.start,
            end: dynamicDataRange.end,
          };
          newPreset = 'dataRange';
        } else {
          // Fallback: show last 2 years
          newDateRange = {
            start: startOfYear(subYears(now, 1)),
            end: endOfYear(now),
          };
          newPreset = 'custom';
        }
        setCurrentPeriodType('year');
        break;

      default:
        return;
    }

    setDateRange(newDateRange);
    setSelectedPreset(newPreset);

    // Notify parent of view change
    if (onViewByChange) {
      onViewByChange(viewBy);
    }
  };

  const formatDateRange = () => {
    if (dateRange.start.toDateString() === dateRange.end.toDateString()) {
      return format(dateRange.start, 'MMM d, yyyy');
    }
    return `${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`;
  };

  const canNavigateNext = () => {
    const today = new Date();
    return isBefore(dateRange.end, today);
  };

  return (
    <div className={styles.dateRangeSelector}>
      {/* View By Controls */}
      <div className={styles.viewByControls}>
        <span className={styles.viewByLabel}>View By:</span>
        <div className={styles.viewByButtons}>
          {viewByOptions.map((option) => (
            <button
              key={option.value}
              className={`${styles.viewByButton} ${currentViewBy === option.value ? styles.active : ''}`}
              onClick={() => handleViewByChange(option.value)}
              title={`${option.label} - ${option.description}`}
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.navigationControls}>
        {/* Previous Period Button */}
        <button
          className={styles.navButton}
          onClick={() => navigatePeriod('prev')}
          title="Previous period"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        {/* Date Range Display and Dropdown */}
        <div className="date-range-display">
          <button className={styles.selectorButton} onClick={() => setShowDropdown(!showDropdown)}>
            <FontAwesomeIcon icon={faCalendarAlt} />
            <span className={styles.dateRangeDisplay}>{formatDateRange()}</span>
            <FontAwesomeIcon icon={faCaretDown} className={styles.selectorButtonIcon} />
          </button>

          {showDropdown && (
            <div className={styles.dropdown}>
              <div className="preset-options">
                {availablePresets.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.dropdownOption} ${selectedPreset === option.value ? styles.active : ''}`}
                    onClick={() => handlePresetSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  className={`${styles.dropdownOption} ${selectedPreset === 'custom' ? styles.active : ''}`}
                  onClick={() => handlePresetSelect('custom')}
                >
                  Custom Range
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Next Period Button */}
        <button
          className={styles.navButton}
          onClick={() => navigatePeriod('next')}
          disabled={!canNavigateNext()}
          title="Next period"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      {/* Custom Date Picker Modal */}
      {showCustomPicker && (
        <div className={styles.customPicker}>
          <div className={styles.customPickerHeader}>
            <h3>Select Custom Date Range</h3>
          </div>
          <div className={styles.customPickerGrid}>
            <div className={styles.dateInputGroup}>
              <label htmlFor="start-date" className={styles.dateInputLabel}>
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                className={styles.dateInput}
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className={styles.dateInputGroup}>
              <label htmlFor="end-date" className={styles.dateInputLabel}>
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                className={styles.dateInput}
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <div className={styles.customPickerActions}>
            <button
              className={`${styles.customPickerButton} ${styles.cancel}`}
              onClick={() => {
                setShowCustomPicker(false);
                setCustomStartDate('');
                setCustomEndDate('');
              }}
            >
              Cancel
            </button>
            <button
              className={`${styles.customPickerButton} ${styles.apply}`}
              onClick={handleCustomDateSubmit}
              disabled={!customStartDate || !customEndDate}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
