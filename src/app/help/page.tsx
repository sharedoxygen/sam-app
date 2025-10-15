'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuestionCircle,
  faLightbulb,
  faBook,
  faKeyboard,
  faGraduationCap,
  faCommentDots,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { getPageHeaderForRole } from '@/lib/constants/roleConfig';
import SmartHelpSystem from '@/components/help/SmartHelpSystem';
import SmartHelpButton from '@/components/help/SmartHelpButton';
import BackButton from '@/components/common/BackButton';
import styles from './Help.module.css';

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic';

export default function HelpPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [isHelpSystemOpen, setIsHelpSystemOpen] = useState(false);

  // Get role-based page configuration
  const pageHeader = getPageHeaderForRole(user?.role, 'salesTasks');

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'h') {
        e.preventDefault();
        setIsHelpSystemOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, []);

  const helpSections = [
    {
      id: 'overview',
      title: 'Getting Started',
      icon: faGraduationCap,
      description: 'Learn the basics of using the Sales Activity Manager',
    },
    {
      id: 'features',
      title: 'Key Features',
      icon: faLightbulb,
      description: 'Discover powerful features to boost your productivity',
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      icon: faKeyboard,
      description: 'Master keyboard shortcuts for faster navigation',
    },
    {
      id: 'guide',
      title: 'Complete User Guide',
      icon: faBook,
      description: 'Comprehensive documentation and tutorials',
    },
  ];

  const keyboardShortcuts = [
    { keys: '⌘/Ctrl + Shift + H', description: 'Open/Close Help System' },
    { keys: '⌘/Ctrl + Shift + D', description: 'Go to Dashboard' },
    { keys: '⌘/Ctrl + Shift + A', description: 'Go to Daily Activity' },
    { keys: '⌘/Ctrl + Shift + T', description: 'Go to My Tasks' },
    { keys: 'Esc', description: 'Close modals and overlays' },
  ];

  const quickTips = {
    ADMIN: [
      'Monitor organization-wide performance from the Executive Dashboard',
      'Use the analytics to identify trends and coaching opportunities',
      'Review team performance data to make strategic decisions',
    ],
    OFFICE_MANAGER: [
      'Monitor both sales and service teams from your dashboard',
      'Use Team Performance view to identify coaching opportunities',
      'Track organizational goals and metrics across all departments',
    ],
    SALES_LEAD: [
      'Monitor your sales team performance and provide coaching',
      'Use forecasting tools to set realistic weekly targets',
      'Track individual agent performance and identify improvement areas',
    ],
    SERVICE_LEAD: [
      'Monitor service quality and customer satisfaction metrics',
      'Track team performance and identify training opportunities',
      'Use analytics to optimize service delivery processes',
    ],
    SALES: [
      'Log all your calls, meetings, and client interactions daily',
      'Use My Tasks to track follow-ups and opportunities',
      'Monitor your performance against weekly and monthly goals',
    ],
    SERVICE: [
      'Record all customer service interactions and resolutions',
      'Track customer satisfaction and feedback scores',
      'Use cross-selling opportunities during service calls',
    ],
  };

  const roleTips = user?.role ? quickTips[user.role as keyof typeof quickTips] || [] : [];

  return (
    <div className={styles.helpPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <BackButton />
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <FontAwesomeIcon icon={faQuestionCircle} className={styles.pageIcon} />
            <div>
              <h1>Help & Documentation</h1>
              <p>Get help and learn how to maximize your productivity</p>
            </div>
          </div>
          <button onClick={() => setIsHelpSystemOpen(true)} className={styles.smartHelpButton}>
            <FontAwesomeIcon icon={faLightbulb} />
            Smart Help
            <span className={styles.shortcut}>⌘⇧H</span>
          </button>
        </div>
      </div>

      <div className={styles.helpContent}>
        {/* Quick Access Cards */}
        <div className={styles.quickAccess}>
          {helpSections.map((section) => (
            <div
              key={section.id}
              className={`${styles.helpCard} ${activeSection === section.id ? styles.active : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <div className={styles.cardIcon}>
                <FontAwesomeIcon icon={section.icon} />
              </div>
              <div className={styles.cardContent}>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Content Sections */}
        <div className={styles.contentSection}>
          {activeSection === 'overview' && (
            <div className={styles.sectionContent}>
              <h2>Getting Started</h2>

              {user?.role && (
                <div className={styles.roleSpecific}>
                  <h3>Tips for {user.role.replace('_', ' ')} Role</h3>
                  <ul className={styles.tipsList}>
                    {roleTips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={styles.embeddedHelp}>
                <SmartHelpButton variant="embedded" showProgress={true} contextualHints={true} />
              </div>
            </div>
          )}

          {activeSection === 'features' && (
            <div className={styles.sectionContent}>
              <h2>Key Features</h2>
              <div className={styles.featureGrid}>
                <div className={styles.feature}>
                  <h4>📊 Performance Analytics</h4>
                  <p>Track your performance with detailed analytics and insights</p>
                </div>
                <div className={styles.feature}>
                  <h4>📅 Activity Tracking</h4>
                  <p>Log and manage all your daily activities and interactions</p>
                </div>
                <div className={styles.feature}>
                  <h4>🎯 Goal Management</h4>
                  <p>Set, track, and achieve your sales and service goals</p>
                </div>
                <div className={styles.feature}>
                  <h4>👥 Team Collaboration</h4>
                  <p>Collaborate with your team and share insights</p>
                </div>
                <div className={styles.feature}>
                  <h4>📈 Forecasting</h4>
                  <p>Plan ahead with intelligent forecasting tools</p>
                </div>
                <div className={styles.feature}>
                  <h4>📱 Mobile Friendly</h4>
                  <p>Access your data from any device, anywhere</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'shortcuts' && (
            <div className={styles.sectionContent}>
              <h2>Keyboard Shortcuts</h2>
              <p>Speed up your workflow with these handy keyboard shortcuts:</p>

              <div className={styles.shortcutList}>
                {keyboardShortcuts.map((shortcut, index) => (
                  <div key={index} className={styles.shortcutItem}>
                    <code className={styles.shortcutKeys}>{shortcut.keys}</code>
                    <span className={styles.shortcutDescription}>{shortcut.description}</span>
                  </div>
                ))}
              </div>

              <div className={styles.shortcutNote}>
                <p>
                  <strong>Note:</strong> Use Cmd (⌘) on Mac or Ctrl on Windows/Linux
                </p>
              </div>
            </div>
          )}

          {activeSection === 'guide' && (
            <div className={styles.sectionContent}>
              <h2>Complete User Guide</h2>
              <p>Access comprehensive documentation and step-by-step tutorials.</p>

              <div className={styles.guideActions}>
                <button
                  onClick={() => window.open('/docs/agent-guide', '_blank')}
                  className={styles.guideButton}
                >
                  <FontAwesomeIcon icon={faBook} />
                  Open Complete Guide
                </button>

                <button onClick={() => setIsHelpSystemOpen(true)} className={styles.guideButton}>
                  <FontAwesomeIcon icon={faCommentDots} />
                  Interactive Help
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Smart Help System Modal */}
      <SmartHelpSystem isVisible={isHelpSystemOpen} onClose={() => setIsHelpSystemOpen(false)} />
    </div>
  );
}
