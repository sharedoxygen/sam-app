import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

// Types for activity data
export type DayActivities = {
  closed: {
    auto: number;
    lifeHealth: number;
    fire: number;
    // Indicator counts for closed sales
    autoRawNew?: number;
    autoMultiLine?: number;
    lifeHealthRawNew?: number;
    lifeHealthMultiLine?: number;
    fireRawNew?: number;
    fireMultiLine?: number;
    // Premium amounts for each product line
    automotivePremium?: number;
    lifeHealthPremium?: number;
    propertyFirePremium?: number;
  };
  quotes: number;
  quotesRawNew?: number; // Quotes that were Raw New
  quotesMultiLine?: number; // Quotes that were Multi-line
  dials: number;
  referrals: {
    ask: number;
    received: number;
  };
  rawNew: number; // Raw New (RN) indicator
  multiLine: number; // Multi-line indicator
  googleReviews?: any[]; // Google reviews for the day
};

export type WeeklyActivityData = {
  monday: DayActivities;
  tuesday: DayActivities;
  wednesday: DayActivities;
  thursday: DayActivities;
  friday: DayActivities;
};

export type ActivityDataEntry = {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  weekStartDate: string; // Monday of the week
  data: WeeklyActivityData;
  lastModified: string;
  createdAt: string;
};

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// API functions
const activityAPI = {
  // Save activity data to backend
  async save(entry: ActivityDataEntry): Promise<ActivityDataEntry> {
    try {
      // Get authentication headers for the request
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add credentials for session authentication
      const response = await fetch('/api/weekly-activities', {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies for session authentication
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Activity save failed with status:', response.status, 'Error:', errorText);

        // Provide specific error messages for common issues
        if (response.status === 401) {
          throw new Error(
            `Authentication failed: Your session may have expired. Please refresh the page and log in again.`
          );
        } else if (response.status === 403) {
          throw new Error(`Access denied: You don't have permission to save this data.`);
        } else {
          throw new Error(`Failed to save: ${response.status} - ${errorText}`);
        }
      }

      return await response.json();
    } catch (error) {
      console.error('API save error:', error);
      // Don't fallback to localStorage for saves - this creates false sense of persistence
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide user-friendly error messages
      if (errorMessage.includes('Authentication failed')) {
        throw new Error(`🔐 ${errorMessage}`);
      } else if (
        errorMessage.includes('Failed to connect') ||
        errorMessage.includes('NetworkError')
      ) {
        throw new Error(
          `🌐 Connection failed: Unable to reach server. Check your internet connection and try again.`
        );
      } else {
        throw new Error(`💾 Save failed: ${errorMessage}`);
      }
    }
  },

  // Load activity data from backend
  async load(userId: string, date: string): Promise<ActivityDataEntry | null> {
    try {
      const response = await fetch(`/api/weekly-activities?date=${date}&userId=${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No data found
        }
        throw new Error(`Failed to load: ${response.statusText}`);
      }

      const data = await response.json();
      return data; // API returns null if no data found
    } catch (error) {
      console.error('API load error:', error);
      // Fallback to local storage if API fails
      return this.loadLocal(userId, date);
    }
  },

  // Load activity data for a date range
  async loadRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ActivityDataEntry[]> {
    try {
      const response = await fetch(
        `/api/weekly-activities?start=${startDate}&end=${endDate}&userId=${userId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to load range: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API load range error:', error);
      return [];
    }
  },

  // Local storage fallback
  saveLocal(entry: ActivityDataEntry): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `activity_${entry.userId}_${entry.date}`;
        localStorage.setItem(key, JSON.stringify(entry));
      }
    } catch (error) {
      console.warn('Unable to save to localStorage:', error);
    }
  },

  loadLocal(userId: string, date: string): ActivityDataEntry | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `activity_${userId}_${date}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.warn('Unable to load from localStorage:', error);
    }
    return null;
  },
};

// Utility functions
const getWeekStartDate = (date: string): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const getEmptyDayActivities = (): DayActivities => ({
  closed: {
    auto: 0,
    lifeHealth: 0,
    fire: 0,
    autoRawNew: 0,
    autoMultiLine: 0,
    lifeHealthRawNew: 0,
    lifeHealthMultiLine: 0,
    fireRawNew: 0,
    fireMultiLine: 0,
    automotivePremium: 0,
    lifeHealthPremium: 0,
    propertyFirePremium: 0,
  },
  quotes: 0,
  quotesRawNew: 0,
  quotesMultiLine: 0,
  dials: 0,
  referrals: { ask: 0, received: 0 },
  rawNew: 0,
  multiLine: 0,
  googleReviews: [],
});

const getEmptyWeeklyData = (): WeeklyActivityData => ({
  monday: getEmptyDayActivities(),
  tuesday: getEmptyDayActivities(),
  wednesday: getEmptyDayActivities(),
  thursday: getEmptyDayActivities(),
  friday: getEmptyDayActivities(),
});

// Main hook for activity data management
export const useActivityData = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [weeklyData, setWeeklyData] = useState<WeeklyActivityData>(getEmptyWeeklyData());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-save functionality
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load data for current date
  const loadData = useCallback(
    async (date: string) => {
      if (!user?.id) return;

      const userId = String(user.id); // Convert to string for API consistency
      setIsLoading(true);
      setError(null);

      try {
        // For individual users, use the existing logic
        const data = await activityAPI.load(userId, date);
        if (data) {
          setWeeklyData(data.data);
          setLastSaved(data.lastModified);
        } else {
          // No data found, start with empty data
          setWeeklyData(getEmptyWeeklyData());
          setLastSaved(null);
        }
      } catch (err) {
        setError('Failed to load activity data');
        console.error('Load error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  // Save data
  const saveData = useCallback(
    async (data?: WeeklyActivityData) => {
      if (!user?.id) {
        setSaveStatus('error');
        setError('User not authenticated. Please log in again.');
        return;
      }

      const userId = String(user.id); // Convert to string for API consistency
      const dataToSave = data || weeklyData;
      setSaveStatus('saving');
      setError(null);

      try {
        const entry: ActivityDataEntry = {
          userId,
          date: currentDate,
          weekStartDate: getWeekStartDate(currentDate),
          data: dataToSave,
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        const savedEntry = await activityAPI.save(entry);
        setLastSaved(savedEntry.lastModified);
        setSaveStatus('saved');

        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        setSaveStatus('error');
        console.error('Save error:', err);

        // Check for specific error types and provide clear feedback
        if (err instanceof Error) {
          if (err.message.includes('401')) {
            setError('Session expired. Please log in again.');
          } else if (err.message.includes('403')) {
            setError('You do not have permission to save this data.');
          } else if (
            err.message.includes('Failed to connect') ||
            err.message.includes('NetworkError')
          ) {
            setError(
              '❌ Server connection failed. Your data is NOT saved. Please check your connection and try again.'
            );
          } else if (err.message.includes('Failed to save to server')) {
            setError(err.message); // Use the detailed error message from API
          } else {
            setError(`❌ Save failed: ${err.message}. Your data may not be persisted.`);
          }
        } else {
          setError('❌ Unknown error occurred. Your data is NOT saved. Please try again.');
        }
      }
    },
    [user?.id, currentDate, weeklyData]
  );

  // Auto-save with debouncing
  const autoSave = useCallback(
    (data: WeeklyActivityData) => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }

      const timeout = setTimeout(() => {
        saveData(data);
      }, 2000); // Auto-save after 2 seconds of inactivity

      setAutoSaveTimeout(timeout);
    },
    [autoSaveTimeout, saveData]
  );

  // Update activity data
  const updateActivityData = useCallback(
    (newData: WeeklyActivityData) => {
      setWeeklyData(newData);
      autoSave(newData);
    },
    [autoSave]
  );

  // Update specific day's data
  const updateDayData = useCallback(
    (day: keyof WeeklyActivityData, dayData: DayActivities) => {
      const newWeeklyData = {
        ...weeklyData,
        [day]: dayData,
      };
      updateActivityData(newWeeklyData);
    },
    [weeklyData, updateActivityData]
  );

  // Update specific activity for a day
  const updateActivity = useCallback(
    (
      day: keyof WeeklyActivityData,
      category: keyof DayActivities,
      subcategory: string | null,
      value: number
    ) => {
      const newData = { ...weeklyData };

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
        if (category === 'quotes') {
          newData[day].quotes = value;
        } else if (category === 'dials') {
          newData[day].dials = value;
        }
      }

      updateActivityData(newData);
    },
    [weeklyData, updateActivityData]
  );

  // Change date and load data
  const changeDate = useCallback(
    async (newDate: string) => {
      setCurrentDate(newDate);
      await loadData(newDate);
    },
    [loadData]
  );

  // Manual save
  const manualSave = useCallback(() => {
    saveData();
  }, [saveData]);

  // Load data when date or user changes
  useEffect(() => {
    if (user?.id && currentDate) {
      loadData(currentDate);
    }
  }, [user?.id, currentDate, loadData]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  // Bulk operations
  const loadDateRange = useCallback(
    async (startDate: string, endDate: string) => {
      if (!user?.id) return [];

      const userId = String(user.id); // Convert to string for API consistency
      try {
        return await activityAPI.loadRange(userId, startDate, endDate);
      } catch (err) {
        setError('Failed to load date range');
        return [];
      }
    },
    [user?.id]
  );

  return {
    // State
    currentDate,
    weeklyData,
    saveStatus,
    lastSaved,
    isLoading,
    error,

    // Actions
    updateActivityData,
    updateDayData,
    updateActivity,
    changeDate,
    manualSave,
    loadDateRange,

    // Utilities
    getEmptyDayActivities,
    getEmptyWeeklyData,
  };
};
