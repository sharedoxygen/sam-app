import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuestionCircle,
  faBook,
  faMapSigns,
  faTimes,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './HelpButton.module.css';

interface HelpContent {
  title: string;
  description: string;
  quickTips: string[];
  keyFeatures: string[];
  commonIssues?: { issue: string; solution: string }[];
}

interface HelpButtonProps {
  pageContext?: string;
  position?: 'header' | 'footer' | 'sidebar';
}

// Page-specific help content
const HELP_CONTENT: Record<string, HelpContent> = {
  'dashboard-main': {
    title: 'Dashboard Overview',
    description: 'Your performance hub displaying key metrics, goals, and team insights.',
    quickTips: [
      'Check your daily goals vs actual performance',
      'Use date range selector to view historical data',
      'Click on metric cards for detailed insights',
      'Team leads can view department performance',
    ],
    keyFeatures: [
      'Performance Metrics: Sales, calls, quotes, referrals',
      'Activity Charts: Visual trends and patterns',
      'Team Management: Lead tools for coaching',
      'Quick Actions: Fast access to common tasks',
    ],
  },
  'daily-activity': {
    title: 'Daily Activity Tracking',
    description: 'Log your daily sales and service activities to track performance.',
    quickTips: [
      'Log activities immediately after completion',
      'Use RN (Raw New) for new customers',
      'Use ML (Multi-Line) for cross-selling',
      'Enter accurate premium amounts',
    ],
    keyFeatures: [
      'Revenue Generation: Track sales by product type',
      'Pipeline Management: Log calls and quotes',
      'Business Development: Track referral activity',
      'Real-time Updates: Instant performance calculation',
    ],
  },
  'sales-tasks': {
    title: 'Task & Activity Management',
    description: 'Create, manage, and track your follow-ups and client activities.',
    quickTips: [
      'Set realistic due dates for follow-ups',
      'Use priority levels to focus on high-value tasks',
      'Add detailed notes for context',
      'Check tasks first thing each morning',
    ],
    keyFeatures: [
      'Task Categories: Sales, service, follow-up, meetings',
      'Priority Management: High, medium, low urgency',
      'Client Integration: Link tasks to specific clients',
      'Progress Tracking: Monitor completion rates',
    ],
  },
  'weekly-performance': {
    title: 'Weekly Performance Analytics',
    description: 'Review weekly results, set forecasts, and analyze performance trends.',
    quickTips: [
      'Review both forecast vs actual performance',
      'Use team view to identify coaching opportunities',
      'Set realistic weekly forecasts',
      'Focus on conversion ratio improvements',
    ],
    keyFeatures: [
      'Performance Comparison: Forecast vs actual results',
      'Team Analytics: Department-wide insights',
      'Trend Analysis: Historical performance patterns',
      'Goal Setting: Weekly target management',
    ],
  },
};

export default function HelpButton({
  pageContext = 'general',
  position = 'header',
}: HelpButtonProps) {
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const helpContent = HELP_CONTENT[pageContext] || {
    title: 'Help & Support',
    description: 'Get assistance with using the Sales Activity Manager system.',
    quickTips: [
      'Use the search function to find specific information',
      'Check the user guide for detailed workflows',
      'Contact your team lead for additional support',
    ],
    keyFeatures: [
      'Comprehensive User Guide: Step-by-step instructions',
      'Role-based Help: Tailored content for your position',
      'Quick Reference: Common tasks and shortcuts',
      'Support Resources: Contact information and escalation',
    ],
  };

  const openFullGuide = () => {
    try {
      router.push('/docs/agent-guide');
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback to window.open
      window.open('/docs/agent-guide', '_blank');
    }
  };

  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  return (
    <div className={`${styles.helpContainer} ${styles[position]}`}>
      {/* Help Button */}
      <button
        className={styles.helpButton}
        onClick={toggleHelp}
        title="Get help for this page"
        aria-label="Open contextual help"
      >
        <FontAwesomeIcon icon={faQuestionCircle} />
        <span className={styles.helpLabel}>Help</span>
      </button>

      {/* Help Panel */}
      {showHelp && (
        <div className={styles.helpOverlay} onClick={() => setShowHelp(false)}>
          <div className={styles.helpPanel} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.helpHeader}>
              <div className={styles.helpTitle}>
                <FontAwesomeIcon icon={faMapSigns} className={styles.helpIcon} />
                <h3>{helpContent.title}</h3>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setShowHelp(false)}
                aria-label="Close help panel"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Content */}
            <div className={styles.helpContent}>
              <p className={styles.helpDescription}>{helpContent.description}</p>

              {/* Quick Tips */}
              <div className={styles.helpSection}>
                <h4>💡 Quick Tips</h4>
                <ul className={styles.tipsList}>
                  {helpContent.quickTips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>

              {/* Key Features */}
              <div className={styles.helpSection}>
                <h4>🎯 Key Features</h4>
                <ul className={styles.featuresList}>
                  {helpContent.keyFeatures.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>

              {/* Common Issues */}
              {helpContent.commonIssues && (
                <div className={styles.helpSection}>
                  <h4>❓ Common Issues</h4>
                  <div className={styles.issuesList}>
                    {helpContent.commonIssues.map((item, index) => (
                      <div key={index} className={styles.issueItem}>
                        <strong>Issue:</strong> {item.issue}
                        <br />
                        <strong>Solution:</strong> {item.solution}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role-based Quick Access */}
              <div className={styles.helpSection}>
                <h4>
                  🎭 For{' '}
                  {user?.role === 'SALES'
                    ? 'Sales Agents'
                    : user?.role === 'SERVICE'
                      ? 'Service Agents'
                      : user?.role === 'SALES_LEAD'
                        ? 'Sales Leads'
                        : user?.role === 'SERVICE_LEAD'
                          ? 'Service Leads'
                          : 'Your Role'}
                </h4>
                <div className={styles.roleSpecificTips}>
                  {user?.role === 'SALES' && (
                    <>
                      <p>Focus on daily calling targets and quote generation</p>
                      <p>Track RN/ML indicators for bonus qualification</p>
                    </>
                  )}
                  {user?.role === 'SERVICE' && (
                    <>
                      <p>Log service calls and identify cross-sell opportunities</p>
                      <p>Maintain high customer satisfaction scores</p>
                    </>
                  )}
                  {(user?.role === 'SALES_LEAD' || user?.role === 'SERVICE_LEAD') && (
                    <>
                      <p>Monitor team performance and provide coaching</p>
                      <p>Set realistic forecasts and track achievement</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.helpActions}>
              <button className={styles.guideButton} onClick={openFullGuide}>
                <FontAwesomeIcon icon={faBook} />
                <span>Open Full User Guide</span>
                <FontAwesomeIcon icon={faExternalLinkAlt} className={styles.externalIcon} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
