'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChevronLeft } from '@fortawesome/free-solid-svg-icons';

interface BackButtonProps {
  href?: string;
  onClick?: () => void;
  text?: string;
  variant?: 'primary' | 'secondary' | 'minimal';
  icon?: 'arrow' | 'chevron';
  className?: string;
}

/**
 * Universal Back Button Component
 * Automatically styled for all themes (default, dark, State Farm)
 * Expert-level consistency across the entire application
 */
export default function BackButton({
  href = '/dashboard',
  onClick,
  text = 'Back to Dashboard',
  variant = 'primary',
  icon = 'arrow',
  className = '',
}: BackButtonProps) {
  const iconComponent = icon === 'chevron' ? faChevronLeft : faArrowLeft;

  const buttonClasses = ['back-nav-link', variant !== 'primary' ? variant : '', className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className="back-icon">
        <FontAwesomeIcon icon={iconComponent} />
      </span>
      <span>{text}</span>
    </>
  );

  if (onClick) {
    return (
      <div className="back-nav">
        <button
          type="button"
          className={buttonClasses.replace('back-nav-link', 'back-button')}
          onClick={onClick}
          aria-label={text}
        >
          {content}
        </button>
      </div>
    );
  }

  return (
    <div className="back-nav">
      <Link href={href} className={buttonClasses} aria-label={text}>
        {content}
      </Link>
    </div>
  );
}
