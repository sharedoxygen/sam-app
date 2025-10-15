/**
 * Theme configuration for the Sales Activity Manager application
 * Defines colors, typography, layout, and other design tokens
 */

const theme = {
  colors: {
    // Primary brand colors
    primary: '#2C3E50',
    primaryHover: '#1a252f',
    primaryLight: '#34495e',

    // Metric-specific colors (as per requirements)
    metricBlue: '#2C3E50', // For contacts, dials, calls
    metricTeal: '#20c997', // For life conversations
    metricGreen: '#198754', // For sales, closed deals
    metricOrange: '#fd7e14', // For asking ratio, referrals

    // Semantic colors
    success: '#198754',
    successLight: '#d1e7dd',
    danger: '#dc3545',
    dangerLight: '#f8d7da',
    warning: '#ffc107',
    warningLight: '#fff3cd',
    info: '#0dcaf0',
    infoLight: '#d1ecf1',

    // Text colors
    textDark: '#212529',
    textMedium: '#6c757d',
    textLight: '#adb5bd',
    white: '#ffffff',

    // Background colors
    bgMain: '#f8f9fa',
    bgLight: '#e9ecef',
    bgDark: '#343a40',

    // Border colors
    borderColor: '#dee2e6',
    borderLight: '#f1f3f4',
  },

  typography: {
    fontFamily: {
      base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  layout: {
    borderRadius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
    },
    shadows: {
      sm: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
      md: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
      lg: '0 1rem 3rem rgba(0, 0, 0, 0.175)',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '3rem',
    },
    transitions: {
      fast: 'all 0.2s ease',
      normal: 'all 0.3s ease',
      slow: 'all 0.5s ease',
    },
  },

  breakpoints: {
    xs: '480px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1400px',
  },

  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
};

export default theme;
