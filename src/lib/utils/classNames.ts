/**
 * Utility function to conditionally join class names
 * Filters out falsy values and joins the remaining strings
 *
 * @param classes - List of class names (can be strings, undefined, null, or false)
 * @returns Joined class names string
 *
 * @example
 * classNames('base', isActive && 'active', error && 'error')
 * classNames(styles.button, isPrimary && styles.primary)
 */
export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Utility function to conditionally join CSS module classes with global classes
 * Useful when mixing CSS modules with Bootstrap or other global CSS
 *
 * @param moduleClasses - Object containing CSS module classes
 * @param conditionals - Object mapping class names to conditions
 * @param globalClasses - Additional global classes to always include
 * @returns Joined class names string
 *
 * @example
 * cx(styles, {
 *   active: isActive,
 *   error: hasError,
 *   loading: isLoading
 * }, 'global-class')
 */
export function cx(
  moduleClasses: Record<string, string>,
  conditionals: Record<string, boolean | undefined | null> = {},
  ...globalClasses: string[]
): string {
  const moduleClassList = Object.entries(conditionals)
    .filter(([_, condition]) => condition)
    .map(([className]) => moduleClasses[className])
    .filter(Boolean);

  return classNames(...moduleClassList, ...globalClasses);
}

// Alias for brevity
export const cn = classNames;
