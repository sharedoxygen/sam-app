'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLightbulb,
  faInfo,
  faGraduationCap,
  faTimes,
  faChevronDown,
  faChevronUp,
  faSearch,
  faBook,
  faRocket,
  faArrowRight,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './SmartHelpSystem.module.css';

interface HelpContent {
  title: string;
  description: string;
  tips?: string[];
  relatedActions?: Array<{
    label: string;
    action: string;
    path?: string;
  }>;
  videoUrl?: string;
}

interface SmartHelpSystemProps {
  isVisible: boolean;
  onClose: () => void;
}

const helpContentMap: Record<string, HelpContent> = {
  'quick-actions': {
    title: 'Quick Actions Help',
    description: 'Fast access to your most common daily tasks.',
    tips: [
      'Use keyboard shortcuts: Ctrl+A for new activity, Ctrl+T for new task',
      'Recent activities auto-populate for faster logging',
      'Click and hold buttons for additional options',
    ],
    relatedActions: [
      { label: 'Log Activity', action: 'navigate', path: '/daily-activity' },
      { label: 'Create Task', action: 'navigate', path: '/sales-tasks' },
      { label: 'View Reports', action: 'navigate', path: '/weekly-performance' },
    ],
  },
  'performance-metrics': {
    title: 'Performance Metrics Guide',
    description: 'Track your daily and weekly performance targets.',
    tips: [
      'Green indicators show you&apos;re meeting targets',
      'Red indicators highlight areas needing attention',
      'Click any metric for detailed breakdown',
    ],
    relatedActions: [
      { label: 'View Detailed Reports', action: 'navigate', path: '/weekly-performance' },
      { label: 'Set Goals', action: 'navigate', path: '/weekly-performance' },
      { label: 'Compare with Team', action: 'navigate', path: '/dashboard' },
    ],
  },
  'activity-tracking': {
    title: 'Activity Tracking Help',
    description: 'Log and organize all your daily work activities.',
    tips: [
      'Log activities immediately for best accuracy',
      'Use templates for recurring activity types',
      'Add notes for future reference and follow-ups',
    ],
    relatedActions: [
      { label: 'Create Activity Template', action: 'navigate', path: '/daily-activity' },
      { label: 'Export Activities', action: 'navigate', path: '/weekly-performance' },
      { label: 'Schedule Follow-up', action: 'navigate', path: '/sales-tasks' },
    ],
  },
  dashboard: {
    title: 'Dashboard Overview',
    description: 'Your personalized performance hub.',
    tips: [
      'Dashboard updates in real-time as you log activities',
      'Customize widget layout by dragging and dropping',
      'Set up alerts for important metrics',
    ],
    relatedActions: [
      { label: 'Customize Layout', action: 'navigate', path: '/dashboard' },
      { label: 'Set Alerts', action: 'navigate', path: '/dashboard' },
      { label: 'Export Dashboard', action: 'navigate', path: '/weekly-performance' },
    ],
  },
};

export default function SmartHelpSystem({ isVisible, onClose }: SmartHelpSystemProps) {
  const [activeContent, setActiveContent] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTips, setExpandedTips] = useState<boolean>(false);
  const [showGettingStarted, setShowGettingStarted] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(0);
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const { user } = useAuth();
  const router = useRouter();

  // Check if user is new (simplified logic)
  const [isNewUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('hasCompletedOnboarding');
    }
    return false;
  });

  // Interactive Tour Steps
  const tourSteps = [
    {
      title: 'Welcome to Your Dashboard',
      description: 'This is your performance hub where you can track daily metrics and goals.',
      path: '/dashboard',
      target: '.dashboard-main',
    },
    {
      title: 'Daily Activity Tracking',
      description: 'Log your daily sales activities, calls, and customer interactions here.',
      path: '/daily-activity',
      target: '.activity-grid',
    },
    {
      title: 'Performance Analytics',
      description: 'View detailed reports and compare your performance with goals.',
      path: '/weekly-performance',
      target: '.performance-charts',
    },
    {
      title: 'Task Management',
      description: 'Manage your follow-ups, appointments, and to-do items.',
      path: '/sales-tasks',
      target: '.task-list',
    },
  ];

  useEffect(() => {
    // Auto-detect context based on current page
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('daily-activity')) {
        setActiveContent('activity-tracking');
      } else if (path.includes('dashboard')) {
        setActiveContent('dashboard');
      } else if (path.includes('reports') || path.includes('weekly-performance')) {
        setActiveContent('performance-metrics');
      }
    }
  }, []);

  const handleStartInteractiveTour = () => {
    setIsTourActive(true);
    setTourStep(0);
    setShowGettingStarted(true);

    if (typeof window !== 'undefined') {
      localStorage.setItem('hasCompletedOnboarding', 'true');
    }

    // Navigate to the first tour step
    if (tourSteps[0]?.path) {
      router.push(tourSteps[0].path);
      onClose(); // Close help modal to show the tour

      // Start the actual tour after a brief delay
      setTimeout(() => {
        startTourHighlight();
      }, 1000);
    }
  };

  const startTourHighlight = () => {
    // Basic tour highlighting - could be enhanced with a library like intro.js
    if (typeof window !== 'undefined') {
      const currentStep = tourSteps[tourStep];
      const element = document.querySelector(currentStep?.target || 'body');

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight effect using our CSS module class
        element.classList.add('tour-highlight');

        // Show tour tooltip
        showTourTooltip(currentStep);
      }
    }
  };

  const showTourTooltip = (step: any) => {
    // Simple alert for now - could be enhanced with custom tooltip
    const message = `${step.title}\n\n${step.description}\n\nStep ${tourStep + 1} of ${tourSteps.length}`;

    if (confirm(`${message}\n\nContinue to next step?`)) {
      nextTourStep();
    } else {
      endTour();
    }
  };

  const nextTourStep = () => {
    if (tourStep < tourSteps.length - 1) {
      const nextStep = tourStep + 1;
      setTourStep(nextStep);

      // Navigate to next step
      if (tourSteps[nextStep]?.path) {
        router.push(tourSteps[nextStep].path);
        setTimeout(() => {
          startTourHighlight();
        }, 1000);
      }
    } else {
      endTour();
    }
  };

  const endTour = () => {
    setIsTourActive(false);
    setTourStep(0);

    // Remove any tour highlights
    if (typeof window !== 'undefined') {
      document.querySelectorAll('.tour-highlight').forEach((el) => {
        el.classList.remove('tour-highlight');
      });
    }

    alert("🎉 Tour completed! You're ready to start using the Sales Activity Manager.");
  };

  const handleActionClick = (action: { label: string; action: string; path?: string }) => {
    try {
      if (action.action === 'navigate' && action.path) {
        router.push(action.path);
        onClose(); // Close the help modal after navigation
      } else {
        // Handle other action types in the future
        console.log('Action not implemented:', action);
        alert(`"${action.label}" feature coming soon!`);
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      alert(`Unable to perform "${action.label}". Please try again.`);
    }
  };

  const filteredContent = Object.entries(helpContentMap).filter(
    ([key, content]) =>
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentContent = helpContentMap[activeContent];

  if (!isVisible) return null;

  return (
    <div className={styles.helpOverlay}>
      <div className={styles.helpPanel}>
        {/* Header */}
        <div className={styles.helpHeader}>
          <div className={styles.helpTitle}>
            <FontAwesomeIcon icon={faLightbulb} />
            <span>Smart Help</span>
            {isTourActive && (
              <span className={styles.tourBadge}>
                Tour: Step {tourStep + 1}/{tourSteps.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* New User Welcome */}
        {isNewUser && !showGettingStarted && (
          <div className={styles.newUserWelcome}>
            <div className={styles.welcomeIcon}>
              <FontAwesomeIcon icon={faRocket} />
            </div>
            <h3>Welcome to Sales Activity Manager!</h3>
            <p>Let's get you started with a quick tour of the essential features.</p>
            <button onClick={handleStartInteractiveTour} className={styles.startTourButton}>
              <FontAwesomeIcon icon={faGraduationCap} />
              Start Quick Tour
            </button>
          </div>
        )}

        {/* Search */}
        <div className={styles.searchContainer}>
          <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Quick Access Buttons */}
        <div className={styles.quickAccess}>
          <button
            onClick={() => {
              try {
                window.open('/docs/agent-guide', '_blank');
              } catch (error) {
                console.error('Failed to open guide:', error);
                alert('Unable to open user guide. Please try again.');
              }
            }}
            className={styles.quickAccessButton}
          >
            <FontAwesomeIcon icon={faBook} />
            Complete User Guide
          </button>
          <button onClick={handleStartInteractiveTour} className={styles.quickAccessButton}>
            <FontAwesomeIcon icon={faPlay} />
            Interactive Tour
          </button>
        </div>

        {/* Content Area */}
        <div className={styles.contentArea}>
          {searchQuery ? (
            // Search Results
            <div className={styles.searchResults}>
              <h4>Search Results ({filteredContent.length})</h4>
              {filteredContent.map(([contentKey, content]) => (
                <div
                  key={contentKey}
                  className={styles.searchResult}
                  onClick={() => {
                    setActiveContent(contentKey);
                    setSearchQuery('');
                  }}
                >
                  <h5>{content.title}</h5>
                  <p>{content.description}</p>
                </div>
              ))}
            </div>
          ) : (
            // Contextual Content
            <div className={styles.contextualContent}>
              <div className={styles.contentHeader}>
                <FontAwesomeIcon icon={faInfo} />
                <h3>{currentContent.title}</h3>
              </div>

              <p className={styles.contentDescription}>{currentContent.description}</p>

              {/* Tips Section */}
              {currentContent.tips && (
                <div className={styles.tipsSection}>
                  <button
                    onClick={() => setExpandedTips(!expandedTips)}
                    className={styles.tipsToggle}
                  >
                    <FontAwesomeIcon icon={faLightbulb} />
                    <span>Pro Tips ({currentContent.tips.length})</span>
                    <FontAwesomeIcon icon={expandedTips ? faChevronUp : faChevronDown} />
                  </button>

                  {expandedTips && (
                    <ul className={styles.tipsList}>
                      {currentContent.tips.map((tip, index) => (
                        <li key={index} className={styles.tipItem}>
                          💡 {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Related Actions */}
              {currentContent.relatedActions && (
                <div className={styles.relatedActions}>
                  <h4>Related Actions</h4>
                  <div className={styles.actionButtons}>
                    {currentContent.relatedActions.map((action, index) => (
                      <button
                        key={index}
                        className={styles.actionButton}
                        onClick={() => handleActionClick(action)}
                      >
                        {action.label}
                        <FontAwesomeIcon icon={faArrowRight} className={styles.actionIcon} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Role-specific Content */}
              <div className={styles.roleSpecificSection}>
                <h4>
                  🎭 For{' '}
                  {user?.role === 'SALES'
                    ? 'Sales Agents'
                    : user?.role === 'SERVICE'
                      ? 'Service Agents'
                      : user?.role === 'SALES_LEAD'
                        ? 'Sales Team Leads'
                        : user?.role === 'SERVICE_LEAD'
                          ? 'Service Team Leads'
                          : user?.role === 'OFFICE_MANAGER'
                            ? 'Office Managers'
                            : user?.role === 'ADMIN'
                              ? 'Administrators'
                              : 'Your Role'}
                </h4>
                <div className={styles.roleSpecificContent}>
                  {user?.role === 'SALES' && (
                    <>
                      <div className={styles.roleItem}>
                        📞 <strong>Daily Focus:</strong> Achieve calling targets and generate
                        quality quotes
                      </div>
                      <div className={styles.roleItem}>
                        💰 <strong>Bonus Tracking:</strong> Use RN (Raw New) and ML (Multi-Line)
                        indicators for qualification
                      </div>
                      <div className={styles.roleItem}>
                        📊 <strong>Performance:</strong> Monitor conversion rates and pipeline
                        development
                      </div>
                    </>
                  )}
                  {user?.role === 'SERVICE' && (
                    <>
                      <div className={styles.roleItem}>
                        🛠️ <strong>Service Excellence:</strong> Log service calls and maintain
                        customer satisfaction
                      </div>
                      <div className={styles.roleItem}>
                        🔄 <strong>Cross-selling:</strong> Identify opportunities during service
                        interactions
                      </div>
                      <div className={styles.roleItem}>
                        📈 <strong>Growth:</strong> Focus on customer retention and account
                        expansion
                      </div>
                    </>
                  )}
                  {user?.role === 'SALES_LEAD' && (
                    <>
                      <div className={styles.roleItem}>
                        👥 <strong>Team Leadership:</strong> Monitor sales team performance and
                        provide coaching
                      </div>
                      <div className={styles.roleItem}>
                        🎯 <strong>Forecasting:</strong> Set realistic weekly/monthly targets and
                        track achievement
                      </div>
                      <div className={styles.roleItem}>
                        📊 <strong>Analytics:</strong> Use team insights to identify coaching
                        opportunities
                      </div>
                    </>
                  )}
                  {user?.role === 'SERVICE_LEAD' && (
                    <>
                      <div className={styles.roleItem}>
                        🎯 <strong>Service Management:</strong> Oversee service quality and team
                        development
                      </div>
                      <div className={styles.roleItem}>
                        📈 <strong>Performance:</strong> Monitor service metrics and customer
                        satisfaction scores
                      </div>
                      <div className={styles.roleItem}>
                        🔄 <strong>Process Improvement:</strong> Identify opportunities for service
                        optimization
                      </div>
                    </>
                  )}
                  {user?.role === 'OFFICE_MANAGER' && (
                    <>
                      <div className={styles.roleItem}>
                        🏢 <strong>Office Operations:</strong> Oversee both sales and service
                        department performance
                      </div>
                      <div className={styles.roleItem}>
                        📊 <strong>Strategic Oversight:</strong> Monitor overall office metrics and
                        goal achievement
                      </div>
                      <div className={styles.roleItem}>
                        👥 <strong>Leadership:</strong> Support team leads and ensure operational
                        excellence
                      </div>
                    </>
                  )}
                  {user?.role === 'ADMIN' && (
                    <>
                      <div className={styles.roleItem}>
                        ⚙️ <strong>System Administration:</strong> Manage user access, roles, and
                        system configuration
                      </div>
                      <div className={styles.roleItem}>
                        📊 <strong>Global Analytics:</strong> Access comprehensive reports across
                        all departments
                      </div>
                      <div className={styles.roleItem}>
                        🔧 <strong>Platform Management:</strong> Configure system settings and
                        maintain data integrity
                      </div>
                    </>
                  )}
                  {!user?.role && (
                    <div className={styles.roleItem}>
                      🔗 <strong>Getting Started:</strong> Log in to see personalized tips for your
                      role
                    </div>
                  )}
                  {/* Fallback for unmatched roles */}
                  {user?.role &&
                    ![
                      'SALES',
                      'SERVICE',
                      'SALES_LEAD',
                      'SERVICE_LEAD',
                      'OFFICE_MANAGER',
                      'ADMIN',
                    ].includes(user.role) && (
                      <div className={styles.roleItem}>
                        🎯 <strong>Role-specific guidance</strong> for {user.role} is being
                        prepared. Check back soon!
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Context Tabs */}
        <div className={styles.contextTabs}>
          {Object.entries(helpContentMap).map(([key, content]) => (
            <button
              key={key}
              onClick={() => setActiveContent(key)}
              className={`${styles.contextTab} ${activeContent === key ? styles.active : ''}`}
            >
              {content.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
