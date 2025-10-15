'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuestionCircle,
  faLifeRing,
  faLightbulb,
  faGraduationCap,
  faCommentDots,
  faKeyboard,
} from '@fortawesome/free-solid-svg-icons';
import SmartHelpSystem from './SmartHelpSystem';
import ContextualHint from './ContextualHint';
import styles from './SmartHelpButton.module.css';

interface SmartHelpButtonProps {
  variant?: 'floating' | 'inline' | 'embedded';
  showKeyboardShortcut?: boolean;
  contextualHints?: boolean;
  showProgress?: boolean;
}

export default function SmartHelpButton({
  variant = 'floating',
  showKeyboardShortcut = true,
  contextualHints = true,
  showProgress = false,
}: SmartHelpButtonProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showHelpHint, setShowHelpHint] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [helpProgress, setHelpProgress] = useState(0);

  // Check for new users and show progressive help
  useEffect(() => {
    const isNewUser = !localStorage.getItem('hasSeenHelp');
    const interactionCount = parseInt(localStorage.getItem('helpInteractions') || '0');

    if (isNewUser && interactionCount < 3) {
      setTimeout(() => setShowHelpHint(true), 3000); // Show hint after 3 seconds
    }

    setHasUserInteracted(interactionCount > 0);
    setHelpProgress(Math.min((interactionCount / 5) * 100, 100)); // Progress out of 5 interactions
  }, []);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'h') {
        e.preventDefault();
        openHelp();
      }
    };

    if (showKeyboardShortcut) {
      document.addEventListener('keydown', handleKeyboard);
      return () => document.removeEventListener('keydown', handleKeyboard);
    }
  }, [showKeyboardShortcut]);

  const openHelp = () => {
    setIsHelpOpen(true);
    setShowHelpHint(false);

    // Track help usage
    const interactions = parseInt(localStorage.getItem('helpInteractions') || '0');
    localStorage.setItem('helpInteractions', (interactions + 1).toString());
    localStorage.setItem('hasSeenHelp', 'true');
    setHasUserInteracted(true);
  };

  const closeHelp = () => {
    setIsHelpOpen(false);
  };

  const dismissHint = () => {
    setShowHelpHint(false);
    localStorage.setItem('hasSeenHelp', 'true');
  };

  if (variant === 'inline') {
    return (
      <div className={styles.inlineContainer}>
        <button onClick={openHelp} className={styles.inlineButton}>
          <FontAwesomeIcon icon={faLifeRing} />
          <span>Need Help?</span>
          {showKeyboardShortcut && <span className={styles.keyboardShortcut}>⌘⇧H</span>}
        </button>

        {contextualHints && (
          <ContextualHint type="tip" placement="right">
            Click here for interactive help and tutorials
          </ContextualHint>
        )}

        <SmartHelpSystem isVisible={isHelpOpen} onClose={closeHelp} />
      </div>
    );
  }

  if (variant === 'embedded') {
    return (
      <div className={styles.embeddedContainer}>
        <div className={styles.helpCard}>
          <div className={styles.helpCardHeader}>
            <FontAwesomeIcon icon={faGraduationCap} />
            <h3>Getting Started</h3>
          </div>

          <div className={styles.helpOptions}>
            <button onClick={openHelp} className={styles.helpOption}>
              <FontAwesomeIcon icon={faLightbulb} />
              <div>
                <strong>Quick Tips</strong>
                <span>Context-aware help for this page</span>
              </div>
            </button>

            <button onClick={openHelp} className={styles.helpOption}>
              <FontAwesomeIcon icon={faGraduationCap} />
              <div>
                <strong>Interactive Tour</strong>
                <span>Step-by-step guided walkthrough</span>
              </div>
            </button>

            <button
              onClick={() => {
                try {
                  window.open('/docs/agent-guide', '_blank');
                } catch (error) {
                  console.error('Failed to open guide:', error);
                  alert('Unable to open user guide. Please try again.');
                }
              }}
              className={styles.helpOption}
            >
              <FontAwesomeIcon icon={faCommentDots} />
              <div>
                <strong>Complete Guide</strong>
                <span>Comprehensive documentation</span>
              </div>
            </button>
          </div>

          {showProgress && (
            <div className={styles.progressSection}>
              <div className={styles.progressLabel}>
                Your Help Journey: {Math.round(helpProgress)}% Complete
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  data-progress={Math.round(helpProgress / 20) * 20}
                />
              </div>
            </div>
          )}
        </div>

        <SmartHelpSystem isVisible={isHelpOpen} onClose={closeHelp} />
      </div>
    );
  }

  // Default floating variant
  return (
    <>
      {/* Main floating help button */}
      <div className={`${styles.floatingContainer} ${hasUserInteracted ? styles.experienced : ''}`}>
        <button
          onClick={openHelp}
          className={`${styles.floatingButton} ${showHelpHint ? styles.pulsing : ''}`}
          aria-label="Get help and support"
          title={`Get help (${showKeyboardShortcut ? '⌘⇧H' : 'Click for help'})`}
        >
          <FontAwesomeIcon icon={faQuestionCircle} />

          {/* Progress indicator for new users */}
          {showProgress && !hasUserInteracted && (
            <div className={styles.progressRing}>
              <svg width="56" height="56" className={styles.progressSvg}>
                <circle
                  cx="28"
                  cy="28"
                  r="25"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="2"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="25"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray={`${helpProgress * 1.57} 157`}
                  strokeDashoffset="0"
                  transform="rotate(-90 28 28)"
                />
              </svg>
            </div>
          )}
        </button>

        {/* Keyboard shortcut indicator */}
        {showKeyboardShortcut && (
          <div className={styles.keyboardIndicator}>
            <FontAwesomeIcon icon={faKeyboard} />
            <span>⌘⇧H</span>
          </div>
        )}
      </div>

      {/* Progressive hint for new users */}
      {showHelpHint && (
        <div className={styles.helpHint}>
          <div className={styles.hintContent}>
            <div className={styles.hintIcon}>
              <FontAwesomeIcon icon={faLightbulb} />
            </div>
            <div className={styles.hintText}>
              <strong>👋 Need help getting started?</strong>
              <p>Click the ? button for interactive tips and tutorials!</p>
            </div>
            <button onClick={dismissHint} className={styles.hintDismiss}>
              ×
            </button>
          </div>
          <div className={styles.hintArrow} />
        </div>
      )}

      <SmartHelpSystem isVisible={isHelpOpen} onClose={closeHelp} />
    </>
  );
}
