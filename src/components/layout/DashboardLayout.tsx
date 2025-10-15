'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import { useAuth } from '@/lib/auth/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarActive, setSidebarActive] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Handle sidebar state for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarActive(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const toggleSidebar = () => {
    setSidebarActive(!sidebarActive);
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 768) {
      setSidebarActive(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null; // Optionally render a spinner
  }

  return (
    <div className="app-container">
      <AppHeader toggleSidebar={toggleSidebar} />

      <div className="content-container">
        {/* Mobile Overlay */}
        {sidebarActive && <div className="overlay active" onClick={closeSidebarOnMobile} />}

        <Sidebar isActive={sidebarActive} />

        <main className="main-content" onClick={closeSidebarOnMobile}>
          {children}
        </main>
      </div>
    </div>
  );
}
