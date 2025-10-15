'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/free-solid-svg-icons';
import { useTheme, getThemeDisplayName } from '@/lib/theme/ThemeContext';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={styles.themeToggle}
      title={`Current theme: ${getThemeDisplayName(theme)} - Click to switch`}
      aria-label={`Switch theme from ${getThemeDisplayName(theme)}`}
    >
      <FontAwesomeIcon icon={faPalette} />
      <span className={styles.themeLabel}>{getThemeDisplayName(theme)}</span>
    </button>
  );
}
