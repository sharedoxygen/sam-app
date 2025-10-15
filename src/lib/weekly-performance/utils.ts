import { DateRange, AccessLevel } from './types';

// Get week start and end dates for display
export const getWeekDates = (offset = 0): DateRange => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

  const weekStart = new Date(now);
  weekStart.setDate(diff + offset * 7);
  // Ensure we're working with start of day in local timezone
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatDateShort = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Format the date for API calls - ensure local date
  const formatForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(weekStart),
    endDate: formatDate(weekEnd),
    startDateShort: formatDateShort(weekStart),
    endDateShort: formatDateShort(weekEnd),
    weekStartDate: formatForAPI(weekStart),
    weekEndDate: formatForAPI(weekEnd),
  };
};

// Get role-based access permissions for agent interaction analytics
export const getAccessLevel = (userRole?: string): AccessLevel => {
  if (!userRole) return 'none';

  const role = userRole.toUpperCase();
  // Admin can see all agents across all teams and departments
  if (role === 'ADMIN') return 'all';
  // Managers (Leads) can see all agents in their department/region (conceptually)
  // For this simplified model, Leads see their team.
  if (role === 'SALES_LEAD' || role === 'SERVICE_LEAD') return 'team'; // Was 'department' for SUPERVISOR
  // Individual agents can only see their own performance
  return 'individual';
};

// Check if user can view team analytics (multiple agents)
export const canViewTeamAnalytics = (userRole?: string): boolean => {
  if (!userRole) return false;
  const role = userRole.toUpperCase();
  return (
    role === 'ADMIN' ||
    role === 'SALES_LEAD' || // Added
    role === 'SERVICE_LEAD' // Added
    // Removed role === 'SUPERVISOR'
  );
};

// Get analytics scope description based on role
export const getAnalyticsScope = (userRole?: string): string => {
  if (!userRole) return 'Your Interaction Analytics';

  const role = userRole.toUpperCase();
  if (role === 'ADMIN') return 'Organization-wide Agent Interaction Analytics';
  // Removed SUPERVISOR case
  if (role === 'SALES_LEAD') return 'Sales Team Interaction Analytics';
  if (role === 'SERVICE_LEAD') return 'Service Team Interaction Analytics';
  return 'Your Agent Interaction Analytics';
};

// Get detailed analytics description based on role
export const getAnalyticsDescription = (userRole?: string): string => {
  if (!userRole) return 'Analytics derived from your daily interactions and activities';

  const role = userRole.toUpperCase();
  if (role === 'ADMIN') {
    return 'Comprehensive analytics calculated from all agent interactions across the entire organization';
  }
  // Removed SUPERVISOR case
  if (role === 'SALES_LEAD') {
    return "Performance metrics calculated from your sales team's daily interactions and activities";
  }
  if (role === 'SERVICE_LEAD') {
    return "Service metrics derived from your team's customer interactions and support activities";
  }
  return 'Performance analytics calculated from your daily interactions, calls, and activities';
};

// Check if user can edit forecasts
export const canEditForecasts = (userRole?: string): boolean => {
  if (!userRole) return false;
  // All users can edit their own forecasts
  // Managers can also edit others' forecasts (handled in team management views)
  return true;
};

// Format metric values
export const formatMetricValue = (value: number): string => {
  if (value === 0) return '0';
  return value.toLocaleString();
};

// Get performance status based on percentage
export const getPerformanceStatus = (percentage: number) => {
  if (percentage >= 100) return { class: 'success', icon: 'faCheckCircle' };
  if (percentage >= 80) return { class: 'warning', icon: 'faExclamationTriangle' };
  return { class: 'danger', icon: 'faExclamationTriangle' };
};
