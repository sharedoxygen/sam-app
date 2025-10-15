'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faWrench, faBars, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { getRoleConfig } from '@/lib/constants/roleConfig';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AppLogo from '@/components/ui/AppLogo';
import NotificationIndicator from '@/components/notifications/NotificationBanner';
import Link from 'next/link';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  toggleSidebar: () => void;
}

/**
 * Application header component that includes the navigation toggle,
 * app title, agent name, and theme toggle with role-based customization
 */
export default function AppHeader({ toggleSidebar }: AppHeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Don't show the header at all on the login page
  if (pathname === '/') {
    return null;
  }

  // Get role-based configuration
  const roleConfig = getRoleConfig(user?.role);

  // Get agent name from user data, fallback to default
  const agentName = user?.name || user?.username || 'Demo Agent';

  // Get role-based app title
  const getAppTitle = () => {
    const baseTitle = 'Sales Activity Manager';

    if (!user?.role) return baseTitle;

    switch (roleConfig.type) {
      case 'sales_lead':
        return 'Sales Team Activity Manager';
      case 'service_lead':
        return 'Service Team Activity Manager';
      case 'sales_agent':
        return 'Sales Activity Manager';
      case 'service_agent':
        return 'Service Activity Manager';
      default:
        return baseTitle;
    }
  };

  // Check if we should show back button (not on dashboard)
  const showBackButton = pathname !== '/dashboard';

  const handleBack = () => {
    router.back();
  };

  return (
    <header className={styles.appHeader}>
      <div className={styles.headerContainer}>
        {/* Left side - Hamburger menu, Back button, Logo and title */}
        <div className={styles.headerLeft}>
          {/* Mobile hamburger menu */}
          <button
            className={styles.hamburgerMenu}
            onClick={() => {
              // Try direct function call first, fallback to custom event
              if (typeof toggleSidebar === 'function') {
                toggleSidebar();
              } else {
                window.dispatchEvent(new CustomEvent('toggleSidebar'));
              }
            }}
            aria-label="Toggle navigation menu"
            type="button"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>

          {/* Back button for mobile */}
          {showBackButton && (
            <button
              className={styles.backButton}
              onClick={handleBack}
              aria-label="Go back"
              type="button"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
          )}

          <AppLogo />
          <h1 className={styles.appTitle}>{getAppTitle()}</h1>
        </div>

        {/* Right side - Settings, Agent Management, Agent info and theme toggle */}
        <div className={styles.headerRight}>
          {/* Admin Utilities (ADMIN only) */}
          {user?.role === 'ADMIN' && (
            <Link href="/admin/utilities" className={styles.headerLink} aria-label="Utilities">
              <span className={styles.desktopOnly}>
                <FontAwesomeIcon icon={faWrench} className="me-1" />
                Utilities
              </span>
              <span className={styles.mobileOnly}>
                <FontAwesomeIcon icon={faWrench} title="Utilities" />
              </span>
            </Link>
          )}

          {/* Notification Indicator */}
          <NotificationIndicator />

          {/* Settings */}
          <Link href="/settings" className={styles.headerLink} aria-label="Settings">
            <span className={styles.desktopOnly}>
              <FontAwesomeIcon icon={faCog} className="me-1" /> Settings
            </span>
            <span className={styles.mobileOnly}>
              <FontAwesomeIcon icon={faCog} title="Settings" />
            </span>
          </Link>
          {/* Agent info with role display */}
          <div className={styles.agentInfo}>
            <FontAwesomeIcon icon={roleConfig.icon} className={styles.agentIcon} />
            <span className={styles.agentName}>{agentName}</span>
            <span className={styles.agentRole}>{roleConfig.displayName}</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
