'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeType = 'default' | 'statefarm' | 'dark';

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'agent-activity-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('default');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeType;
        if (savedTheme && ['default', 'statefarm', 'dark'].includes(savedTheme)) {
          setThemeState(savedTheme);
        }
      }
    } catch (error) {
      console.warn('Unable to access localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Update CSS variables and localStorage when theme changes
  useEffect(() => {
    if (!isInitialized) return;

    const root = document.documentElement;
    const body = document.body;

    // Remove all theme classes from both root and body
    root.classList.remove('theme-default', 'theme-statefarm', 'theme-dark');
    body.classList.remove('theme-default', 'theme-statefarm', 'theme-dark');

    // Apply the new theme class to both
    const themeClass = `theme-${theme}`;
    root.classList.add(themeClass);
    body.classList.add(themeClass);

    // Force a style recalculation by setting a CSS property directly
    root.style.setProperty('--theme-applied', theme);

    console.log('Theme changed to:', theme);
    console.log('Applied class:', themeClass);
    console.log('Root classes:', root.className);
    console.log('Body classes:', body.className);

    // Save to localStorage with error handling
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch (error) {
      console.warn('Unable to save theme to localStorage:', error);
    }
  }, [theme, isInitialized]);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const themeOrder: ThemeType[] = ['default', 'statefarm', 'dark'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const getThemeDisplayName = (theme: ThemeType): string => {
  switch (theme) {
    case 'default':
      return 'Default';
    case 'statefarm':
      return 'State Farm';
    case 'dark':
      return 'Dark Mode';
    default:
      return 'Default';
  }
};
