'use client';

import styles from './AppLogo.module.css';

/**
 * Professional, minimalist logo for Sales Activity Manager
 * Clean geometric design suitable for executive presentations
 */
export default function AppLogo({ size = 40 }: { size?: number }) {
  return (
    <div className={styles.appLogoContainer}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.appLogoSvg}
      >
        {/* Modern minimalist design - ascending bars forming 'S' shape */}
        {/* Represents growth, analytics, and professionalism */}

        {/* Background subtle frame */}
        <rect
          x="6"
          y="6"
          width="28"
          height="28"
          rx="3"
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />

        {/* Ascending bar chart with professional spacing */}
        <rect x="10" y="24" width="3.5" height="8" fill="rgba(255, 255, 255, 0.9)" rx="1" />
        <rect x="15" y="20" width="3.5" height="12" fill="rgba(255, 255, 255, 0.9)" rx="1" />
        <rect x="20" y="15" width="3.5" height="17" fill="rgba(255, 255, 255, 0.95)" rx="1" />
        <rect x="25" y="12" width="3.5" height="20" fill="rgba(255, 255, 255, 1)" rx="1" />

        {/* Subtle accent line showing trend */}
        <path
          d="M11.75 28 L16.75 24 L21.75 19 L26.75 16"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="2 2"
        />
      </svg>
    </div>
  );
}
