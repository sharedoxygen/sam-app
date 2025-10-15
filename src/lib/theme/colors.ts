/**
 * Central color constants for the application
 * These should be used instead of hardcoding colors
 */

import theme from '@/styles/theme';

// Re-export theme colors for easy access
export const colors = theme.colors;

// Metric color mapping for consistency
export const METRIC_COLORS = {
  contacts: theme.colors.metricBlue,
  peopleContacted: theme.colors.metricBlue,
  dials: theme.colors.metricBlue,
  calls: theme.colors.metricBlue,
  lifeConversation: theme.colors.metricTeal,
  lifeConversations: theme.colors.metricTeal,
  peopleWithLifeConversation: theme.colors.metricTeal,
  sales: theme.colors.metricGreen,
  closed: theme.colors.metricGreen,
  weeklySales: theme.colors.metricGreen,
  askingRatio: theme.colors.metricOrange,
  referralsAsked: theme.colors.metricOrange,
  referrals: theme.colors.metricOrange,
} as const;

// Role-based theme colors
export const ROLE_THEMES = {
  ADMIN: {
    primary: theme.colors.primary,
    accent: theme.colors.metricBlue,
  },
  OFFICE_MANAGER: {
    primary: theme.colors.primary,
    accent: theme.colors.metricBlue,
  },
  SALES_LEAD: {
    primary: theme.colors.metricGreen,
    accent: theme.colors.success,
  },
  SERVICE_LEAD: {
    primary: theme.colors.metricTeal,
    accent: theme.colors.info,
  },
  SALES: {
    primary: theme.colors.metricGreen,
    accent: theme.colors.success,
  },
  SERVICE: {
    primary: theme.colors.metricTeal,
    accent: theme.colors.info,
  },
} as const;

// CSS variable names for dynamic theming
export const CSS_VARIABLES = {
  primary: '--primary-color',
  primaryDark: '--primary-dark',
  primaryLight: '--primary-light',
  textDark: '--text-dark',
  textMedium: '--text-medium',
  textLight: '--text-light',
  bgLight: '--bg-light',
  metricBlue: '--metric-blue',
  metricTeal: '--metric-teal',
  metricGreen: '--metric-green',
  metricOrange: '--metric-orange',
  success: '--success-color',
  warning: '--warning-color',
  danger: '--danger-color',
  info: '--info-color',
} as const;
