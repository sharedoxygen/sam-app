/**
 * Styling utility functions for consistent component styling
 */
import theme from './theme';

/**
 * Creates consistent class names for metrics based on type
 * Following the color requirements: blue for contacts, teal for life conversations,
 * green for sales, orange for asking ratio
 */
export const getMetricColor = (metricType: string): string => {
  switch (metricType.toLowerCase()) {
    case 'contacts':
    case 'people contacted':
    case 'dials':
    case 'calls':
      return theme.colors.metricBlue;
    case 'life conversation':
    case 'life conversations':
    case 'people with life conversation':
      return theme.colors.metricTeal;
    case 'sales':
    case 'closed':
    case 'weekly sales':
      return theme.colors.metricGreen;
    case 'asking ratio':
    case 'referrals asked':
    case 'referrals':
      return theme.colors.metricOrange;
    default:
      return theme.colors.primary;
  }
};

/**
 * Creates a standardized card style object for consistent card styling
 */
export const createCardStyle = (options?: {
  padding?: 'sm' | 'md' | 'lg';
  elevation?: 'sm' | 'md' | 'lg';
  margin?: 'sm' | 'md' | 'lg' | 'none';
  height?: string;
}) => {
  const { padding = 'md', elevation = 'sm', margin = 'md', height = 'auto' } = options || {};

  const getPadding = () => {
    switch (padding) {
      case 'sm':
        return '0.75rem';
      case 'lg':
        return '1.75rem';
      default:
        return '1.25rem';
    }
  };

  const getMargin = () => {
    switch (margin) {
      case 'sm':
        return '0.75rem';
      case 'lg':
        return '1.75rem';
      case 'none':
        return '0';
      default:
        return '1.25rem';
    }
  };

  const getShadow = () => {
    switch (elevation) {
      case 'md':
        return theme.layout.shadows.md;
      case 'lg':
        return theme.layout.shadows.lg;
      default:
        return theme.layout.shadows.sm;
    }
  };

  return {
    backgroundColor: theme.colors.white,
    borderRadius: theme.layout.borderRadius.md,
    boxShadow: getShadow(),
    padding: getPadding(),
    marginBottom: getMargin(),
    height,
  };
};

/**
 * Creates standardized button styles for consistent button styling
 */
export const createButtonStyle = (
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark',
  options?: {
    size?: 'sm' | 'md' | 'lg';
    outline?: boolean;
    fullWidth?: boolean;
  }
) => {
  const { size = 'md', outline = false, fullWidth = false } = options || {};

  // Get the background color based on variant
  const getBackgroundColor = () => {
    if (outline) return 'transparent';

    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.textMedium;
      case 'success':
        return theme.colors.success;
      case 'danger':
        return theme.colors.danger;
      case 'warning':
        return theme.colors.warning;
      case 'info':
        return theme.colors.info;
      case 'light':
        return theme.colors.bgLight;
      case 'dark':
        return theme.colors.textDark;
      default:
        return theme.colors.primary;
    }
  };

  // Get the text color based on variant
  const getTextColor = () => {
    if (outline) {
      switch (variant) {
        case 'primary':
          return theme.colors.primary;
        case 'secondary':
          return theme.colors.textMedium;
        case 'success':
          return theme.colors.success;
        case 'danger':
          return theme.colors.danger;
        case 'warning':
          return theme.colors.warning;
        case 'info':
          return theme.colors.info;
        case 'light':
          return theme.colors.bgLight;
        case 'dark':
          return theme.colors.textDark;
        default:
          return theme.colors.primary;
      }
    }

    // For non-outline buttons
    return ['light'].includes(variant) ? theme.colors.textDark : theme.colors.white;
  };

  // Get border color for outline buttons
  const getBorderColor = () => {
    if (!outline) return 'transparent';

    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.textMedium;
      case 'success':
        return theme.colors.success;
      case 'danger':
        return theme.colors.danger;
      case 'warning':
        return theme.colors.warning;
      case 'info':
        return theme.colors.info;
      case 'light':
        return theme.colors.bgLight;
      case 'dark':
        return theme.colors.textDark;
      default:
        return theme.colors.primary;
    }
  };

  // Get padding based on size
  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '0.25rem 0.5rem';
      case 'lg':
        return '0.5rem 1rem';
      default:
        return '0.375rem 0.75rem';
    }
  };

  // Get font size based on size
  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return theme.typography.fontSize.xs;
      case 'lg':
        return theme.typography.fontSize.lg;
      default:
        return theme.typography.fontSize.md;
    }
  };

  return {
    backgroundColor: getBackgroundColor(),
    color: getTextColor(),
    border: `1px solid ${getBorderColor()}`,
    borderRadius: theme.layout.borderRadius.sm,
    padding: getPadding(),
    fontSize: getFontSize(),
    fontWeight: theme.typography.fontWeight.medium,
    cursor: 'pointer',
    transition: theme.layout.transitions.fast,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : 'auto',
    textDecoration: 'none',
    boxShadow: 'none',
    '&:hover': {
      opacity: 0.9,
    },
    '&:focus': {
      outline: 'none',
      boxShadow: `0 0 0 0.2rem rgba(${variant === 'primary' ? '211, 0, 0, 0.25' : '0, 123, 255, 0.25'})`,
    },
    '&:disabled': {
      opacity: 0.65,
      pointerEvents: 'none',
    },
  };
};

/**
 * Creates standardized input styles for consistent form control styling
 */
export const createInputStyle = (options?: {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled';
  isValid?: boolean;
  isInvalid?: boolean;
  fullWidth?: boolean;
}) => {
  const {
    size = 'md',
    variant = 'default',
    isValid = false,
    isInvalid = false,
    fullWidth = true,
  } = options || {};

  // Get padding based on size
  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '0.25rem 0.5rem';
      case 'lg':
        return '0.5rem 1rem';
      default:
        return '0.375rem 0.75rem';
    }
  };

  // Get font size based on size
  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return theme.typography.fontSize.sm;
      case 'lg':
        return theme.typography.fontSize.lg;
      default:
        return theme.typography.fontSize.md;
    }
  };

  // Get background color based on variant
  const getBackgroundColor = () => {
    if (variant === 'filled') return '#f3f3f3';
    return theme.colors.white;
  };

  // Get border color based on validation state
  const getBorderColor = () => {
    if (isInvalid) return theme.colors.danger;
    if (isValid) return theme.colors.success;
    return '#ced4da';
  };

  return {
    display: 'block',
    width: fullWidth ? '100%' : 'auto',
    padding: getPadding(),
    fontSize: getFontSize(),
    fontWeight: theme.typography.fontWeight.normal,
    lineHeight: theme.typography.lineHeight.normal,
    color: theme.colors.textDark,
    backgroundColor: getBackgroundColor(),
    backgroundClip: 'padding-box',
    border: `1px solid ${getBorderColor()}`,
    borderRadius: theme.layout.borderRadius.sm,
    transition: theme.layout.transitions.fast,
    '&:focus': {
      outline: 0,
      borderColor: theme.colors.primary,
      boxShadow: `0 0 0 0.2rem rgba(211, 0, 0, 0.25)`,
    },
    '&::placeholder': {
      color: theme.colors.textLight,
      opacity: 1,
    },
    '&:disabled': {
      backgroundColor: '#e9ecef',
      opacity: 1,
    },
  };
};

/**
 * Gets the appropriate class for a day of the week
 * Used for highlighting the current day in daily/weekly views
 */
export const getDayClass = (currentDay: string, activeDay: string): string => {
  if (currentDay.toLowerCase() === activeDay.toLowerCase()) {
    return 'active-day';
  }
  return '';
};

/**
 * Applies media query helpers for responsive design
 */
export const mediaQueries = {
  xs: `@media (max-width: ${theme.breakpoints.xs})`,
  sm: `@media (max-width: ${theme.breakpoints.sm})`,
  md: `@media (max-width: ${theme.breakpoints.md})`,
  lg: `@media (max-width: ${theme.breakpoints.lg})`,
  xl: `@media (max-width: ${theme.breakpoints.xl})`,
  xxl: `@media (max-width: ${theme.breakpoints.xxl})`,
};
