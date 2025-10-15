'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';

import { useAuth } from '@/lib/auth/AuthContext';
import RouteGuard from '@/components/auth/RouteGuard';
import styles from './MainLayout.module.css';

type MainLayoutProps = {
  children: React.ReactNode;
};

/**
 * Main layout component that provides the overall application structure
 * including header, sidebar, and main content area
 */
export default function MainLayout({ children }: MainLayoutProps) {
  // Sidebar state management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Track if we're on mobile for sidebar behavior
  const [isMobile, setIsMobile] = useState(false);

  // Listen for window resize to determine mobile/desktop view
  useEffect(() => {
    const checkIfMobile = () => {
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isSmallScreen);
    };

    // Initial check
    checkIfMobile();

    // Listen for resize events with debouncing
    let timeoutId: NodeJS.Timeout;
    const debouncedCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkIfMobile, 100);
    };

    window.addEventListener('resize', debouncedCheck);
    return () => {
      window.removeEventListener('resize', debouncedCheck);
      clearTimeout(timeoutId);
    };
  }, []);

  const { isLoading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/';

  // Toggle sidebar - memoized to prevent re-creation on every render
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []); // Empty dependency array - function never changes

  // Handle clicking outside the sidebar to close it on mobile
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Handle escape key to close sidebar on mobile
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    // Fallback event listener for toggleSidebar
    const handleToggleSidebar = () => {
      setSidebarOpen((prev) => !prev);
    };

    document.addEventListener('keydown', handleEscape);
    window.addEventListener('toggleSidebar', handleToggleSidebar);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  }, [isMobile, sidebarOpen]);

  // CRITICAL FIX: Check login page FIRST to prevent black circle issue
  // This prevents the loading spinner from showing on the login page
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Only show loading state for authenticated pages after login page check
  if (isLoading) {
    return (
      <div className={styles.authLoading}>
        <div className={styles.spinner}></div>
        <p>Loading your performance dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      {/* Header */}
      <AppHeader toggleSidebar={toggleSidebar} />

      <div className={styles.mainWrapper}>
        {/* Sidebar - always visible on desktop */}
        <Sidebar
          isActive={sidebarOpen}
          isMobile={isMobile}
          onClose={() => isMobile && setSidebarOpen(false)}
        />

        {/* Main content */}
        <div className={styles.mainContent}>
          <RouteGuard>
            <main className={styles.pageContent}>{children}</main>
          </RouteGuard>
        </div>

        {/* Sidebar overlay for mobile only */}
        {isMobile && (
          <div
            className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.active : ''}`}
            onClick={handleOverlayClick}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
