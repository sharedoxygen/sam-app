'use client';

import React from 'react';
import styles from './PageContainer.module.css';

type PageContainerProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  loadingMessage?: string;
};

/**
 * PageContainer component that provides consistent layout and styling for all pages
 * This follows the requirements for proper project headers, consistent styling
 * and professional business language for all pages
 */
export default function PageContainer({
  children,
  title,
  subtitle,
  icon,
  actions,
  loading = false,
  loadingMessage = 'Loading data...',
}: PageContainerProps) {
  return (
    <div className={styles.pageContainer}>
      {/* Page header */}
      <header className={styles.pageHeader}>
        <div className={styles.pageTitleGroup}>
          {icon && <div className={styles.pageIcon}>{icon}</div>}
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
          </div>
        </div>

        {/* Optional page actions (buttons, filters, etc.) */}
        {actions && <div className={styles.pageActions}>{actions}</div>}
      </header>

      {/* Page content */}
      <div className={styles.pageContent}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{loadingMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
