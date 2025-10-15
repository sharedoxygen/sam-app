'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { getNavigationForRole } from '@/lib/constants/roleConfig';
import styles from './Sidebar.module.css'; // Import CSS Module

type SidebarProps = {
  isActive: boolean;
  isMobile?: boolean;
  onClose?: () => void;
};

/**
 * Sidebar navigation component that displays the main app navigation menu
 * and adapts to mobile and desktop views with role-based navigation
 */
export default function Sidebar({ isActive, isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Handle logout from sidebar
  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    void logout();
    // Close sidebar on mobile after logout
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Get role-based navigation items
  const navigationItems = getNavigationForRole(user?.role);

  const sidebarClasses = [styles.sidebar, isActive ? styles.active : ''].join(' ').trim();

  return (
    <>
      <aside className={sidebarClasses}>
        {/* Main Navigation */}
        <nav className={styles.sidebarNav}>
          <ul className={styles.navMenu}>
            {navigationItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`${styles.navLink} ${
                    item.isActive?.(pathname) ? styles.navLinkActive : ''
                  }`}
                  onClick={isMobile ? onClose : undefined}
                >
                  <FontAwesomeIcon icon={item.icon} className={styles.menuIcon} />
                  <span className={styles.menuText}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <ul className={styles.navMenu}>
            <li>
              <a href="#" className={styles.logoutLink} onClick={handleLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} className={styles.menuIcon} />
                <span className={styles.menuText}>Logout</span>
              </a>
            </li>
          </ul>

          {/* Branding at the very bottom */}
          <div className={styles.sidebarBranding}>
            <span className={styles.brandingText}>
              <FontAwesomeIcon icon={faInfoCircle} className={styles.brandingIcon} />
              Developed by{' '}
              <a
                href="https://sharedoxygen.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.brandingLink}
              >
                Shared Oxygen, LLC
              </a>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
