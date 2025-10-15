/**
 * Style utilities to prevent common CSS variable loading issues
 * Part of the comprehensive fix for the recurring black circle rendering problem
 */

/**
 * Checks if CSS variables are properly loaded
 * This helps prevent issues where styles render before CSS variables are available
 */
export function areCSSVariablesLoaded(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary-color').trim();
    const bgLight = computedStyle.getPropertyValue('--bg-light').trim();

    // Check if critical CSS variables exist and have values
    return !!(primaryColor && bgLight);
  } catch (error) {
    console.warn('CSS variables check failed:', error);
    return false;
  }
}

/**
 * Gets a CSS variable value with fallback
 * Ensures we always have a usable value even if CSS variables aren't loaded
 */
export function getCSSVariable(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

    return value || fallback;
  } catch (error) {
    console.warn(`Failed to get CSS variable ${variableName}:`, error);
    return fallback;
  }
}

/**
 * CSS variable fallbacks for critical theme values
 * These ensure consistent styling even when CSS variables fail to load
 */
export const CSS_FALLBACKS = {
  '--primary-color': '#2C3E50',
  '--primary-dark': '#1a252f',
  '--primary-light': '#34495e',
  '--text-dark': '#1e2a3a',
  '--text-medium': '#6c757d',
  '--text-light': '#adb5bd',
  '--bg-light': '#f4f6f8',
  '--card-bg': '#ffffff',
  '--border-color': '#e8ebef',
  '--card-shadow': '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
} as const;

/**
 * Validates that essential CSS variables are loaded
 * Can be used in components to ensure proper styling
 */
export function validateCSSVariables(): boolean {
  const criticalVariables = ['--primary-color', '--bg-light', '--card-bg', '--text-dark'];

  return criticalVariables.every((variable) => {
    const value = getCSSVariable(variable, '');
    return value !== '';
  });
}
