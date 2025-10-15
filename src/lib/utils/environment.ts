/**
 * Environment utility functions for Sales Activity Manager
 * Determines current environment and feature availability
 */

export type Environment = 'development' | 'test' | 'staging' | 'production';

/**
 * Get the current environment
 */
export const getCurrentEnvironment = (): Environment => {
  const nodeEnv = process.env.NODE_ENV;
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;

  // Check for explicit environment setting
  if (appEnv) {
    return appEnv as Environment;
  }

  // Check for development
  if (nodeEnv === 'development') {
    return 'development';
  }

  // For test environment deployed with deploy:clean (which runs on port 7025)
  // We'll use an environment variable that can be set at build time
  if (process.env.NEXT_PUBLIC_IS_TEST_ENV === 'true') {
    return 'test';
  }

  // Client-side check for test environment and proxy environments
  if (typeof window !== 'undefined') {
    const { hostname, port } = window.location;

    // Check for ngrok and sharedoxygen domains (proxied test environments)
    if (hostname.includes('ngrok') || hostname.includes('sharedoxygen.com')) {
      return 'test';
    }

    // Check direct port access
    if (port === '7025') {
      return 'test';
    }
    if (port === '3002') {
      return 'staging';
    }
  }

  // Check server-side port from environment
  const port = process.env.PORT;
  if (port === '7025') {
    return 'test';
  }
  if (port === '3002') {
    return 'staging';
  }

  // Default to production
  return 'production';
};

/**
 * Check if current environment is development
 */
export const isDevelopment = (): boolean => {
  return getCurrentEnvironment() === 'development';
};

/**
 * Check if current environment is test
 */
export const isTest = (): boolean => {
  return getCurrentEnvironment() === 'test';
};

/**
 * Check if current environment is staging
 */
export const isStaging = (): boolean => {
  return getCurrentEnvironment() === 'staging';
};

/**
 * Check if current environment is production
 */
export const isProduction = (): boolean => {
  return getCurrentEnvironment() === 'production';
};

/**
 * Check if feedback feature should be visible
 * Feedback is now ALWAYS visible in all environments
 */
export const isFeedbackVisible = (): boolean => {
  // Always enable feedback in all environments
  return true;
};

/**
 * Get environment-specific configuration
 */
export const getEnvironmentConfig = () => {
  const env = getCurrentEnvironment();

  return {
    environment: env,
    isDevelopment: env === 'development',
    isTest: env === 'test',
    isStaging: env === 'staging',
    isProduction: env === 'production',
    showFeedback: true,
    showDebugInfo: env === 'development',
    enableAnalytics: env === 'production' || env === 'staging',
  };
};
