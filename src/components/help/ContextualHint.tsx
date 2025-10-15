'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInfoCircle,
  faLightbulb,
  faExclamationTriangle,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import styles from './ContextualHint.module.css';

interface ContextualHintProps {
  type?: 'info' | 'tip' | 'warning' | 'success';
  title?: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'always';
  className?: string;
}

const iconMap = {
  info: faInfoCircle,
  tip: faLightbulb,
  warning: faExclamationTriangle,
  success: faCheckCircle,
};

export default function ContextualHint({
  type = 'info',
  title,
  children,
  placement = 'top',
  trigger = 'hover',
  className = '',
}: ContextualHintProps) {
  const [isVisible, setIsVisible] = useState(trigger === 'always');

  const handleMouseEnter = () => {
    if (trigger === 'hover') setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') setIsVisible(false);
  };

  const handleClick = () => {
    if (trigger === 'click') setIsVisible(!isVisible);
  };

  return (
    <div className={`${styles.hintContainer} ${className}`}>
      <div
        className={`${styles.hintTrigger} ${styles[type]}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <FontAwesomeIcon icon={iconMap[type]} />
      </div>

      {isVisible && (
        <div className={`${styles.hintTooltip} ${styles[placement]} ${styles[type]}`}>
          {title && <div className={styles.hintTitle}>{title}</div>}
          <div className={styles.hintContent}>{children}</div>
        </div>
      )}
    </div>
  );
}
