'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLightbulb,
  faExclamationCircle,
  faChartLine,
  faPhone,
  faHandshake,
  faArrowRight,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import styles from './CoachingOpportunities.module.css';

interface CoachingInsight {
  userId: number;
  userName: string;
  type: 'low-conversion' | 'low-activity' | 'declining-performance' | 'missed-targets';
  severity: 'high' | 'medium' | 'low';
  metric: string;
  value: number;
  recommendation: string;
  trend?: number;
}

interface CoachingOpportunitiesProps {
  managerId?: string;
}

export default function CoachingOpportunities({ managerId }: CoachingOpportunitiesProps) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<CoachingInsight[]>([]);

  useEffect(() => {
    fetchCoachingInsights();
  }, [managerId]);

  const fetchCoachingInsights = async () => {
    try {
      setLoading(true);

      // Fetch team performance data to analyze
      const response = await fetch(
        `/api/team/performance${managerId ? `?managerId=${managerId}` : ''}`
      );

      if (response.ok) {
        const data = await response.json();

        // Analyze team data for coaching opportunities
        const coachingNeeds: CoachingInsight[] = [];

        data.teamMembers?.forEach((member: any) => {
          // Check for low conversion rates
          if (member.performanceMetrics?.conversionRate < 10) {
            coachingNeeds.push({
              userId: member.userId,
              userName: member.userName,
              type: 'low-conversion',
              severity: member.performanceMetrics.conversionRate < 5 ? 'high' : 'medium',
              metric: 'Conversion Rate',
              value: member.performanceMetrics.conversionRate,
              recommendation: 'Schedule a call review session to improve closing techniques',
              trend: member.trendValue,
            });
          }

          // Check for low activity
          if (member.todayMetrics?.calls < 20) {
            coachingNeeds.push({
              userId: member.userId,
              userName: member.userName,
              type: 'low-activity',
              severity: member.todayMetrics.calls < 10 ? 'high' : 'medium',
              metric: 'Daily Calls',
              value: member.todayMetrics.calls,
              recommendation: 'Check in about daily activity goals and any blockers',
            });
          }

          // Check for declining performance
          if (member.trend === 'down' && Math.abs(member.trendValue) > 20) {
            coachingNeeds.push({
              userId: member.userId,
              userName: member.userName,
              type: 'declining-performance',
              severity: Math.abs(member.trendValue) > 30 ? 'high' : 'medium',
              metric: 'Performance Trend',
              value: member.trendValue,
              recommendation: 'One-on-one meeting to discuss recent challenges',
              trend: member.trendValue,
            });
          }

          // Check for missed weekly targets
          if (member.weeklyMetrics?.sales < 5) {
            coachingNeeds.push({
              userId: member.userId,
              userName: member.userName,
              type: 'missed-targets',
              severity: member.weeklyMetrics.sales < 2 ? 'high' : 'low',
              metric: 'Weekly Sales',
              value: member.weeklyMetrics.sales,
              recommendation: 'Review pipeline and provide sales support',
            });
          }
        });

        // Sort by severity
        coachingNeeds.sort((a, b) => {
          const severityOrder = { high: 0, medium: 1, low: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        });

        setInsights(coachingNeeds.slice(0, 5)); // Show top 5 opportunities
      }
    } catch (error) {
      console.error('Error fetching coaching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'low-conversion':
        return faChartLine;
      case 'low-activity':
        return faPhone;
      case 'declining-performance':
        return faExclamationCircle;
      case 'missed-targets':
        return faHandshake;
      default:
        return faLightbulb;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'low-conversion':
        return 'Low Conversion';
      case 'low-activity':
        return 'Low Activity';
      case 'declining-performance':
        return 'Declining Performance';
      case 'missed-targets':
        return 'Below Target';
      default:
        return 'Needs Attention';
    }
  };

  // Generate coaching insights summary
  const generateCoachingInsights = () => {
    if (insights.length === 0) {
      return 'Excellent team performance! No urgent coaching needs identified. Continue monitoring for proactive development opportunities.';
    }

    const highSeverity = insights.filter((i) => i.severity === 'high').length;
    const conversionIssues = insights.filter((i) => i.type === 'low-conversion').length;
    const activityIssues = insights.filter((i) => i.type === 'low-activity').length;
    const performanceDeclines = insights.filter((i) => i.type === 'declining-performance').length;

    if (highSeverity > 2) {
      return `Urgent attention needed: ${highSeverity} high-priority coaching opportunities identified. Schedule immediate one-on-one meetings to address performance gaps.`;
    } else if (conversionIssues > 1) {
      return `Focus on sales training: ${conversionIssues} team members need help with conversion techniques. Consider group training on objection handling and closing skills.`;
    } else if (activityIssues > 1) {
      return `Activity coaching priority: ${activityIssues} team members need support with daily calling discipline. Review goals and remove barriers to productivity.`;
    } else if (performanceDeclines > 0) {
      return `Performance trend monitoring: ${performanceDeclines} team members showing declining metrics. Early intervention can prevent further drops.`;
    } else {
      return `Balanced coaching focus: ${insights.length} development opportunities spanning multiple areas. Regular check-ins will maintain team momentum.`;
    }
  };

  if (loading) {
    return (
      <div className={`${styles.coachingOpportunities} ${styles.loading}`}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Analyzing team performance...</p>
      </div>
    );
  }

  return (
    <div className={styles.coachingOpportunities}>
      <div className={styles.header}>
        <FontAwesomeIcon icon={faLightbulb} className={styles.headerIcon} />
        <h3 className={styles.title}>Coaching Opportunities</h3>
      </div>

      <div className={styles.insightsSummary}>{generateCoachingInsights()}</div>

      {insights.length === 0 ? (
        <div className={styles.emptyState}>
          <FontAwesomeIcon icon={faLightbulb} className={styles.emptyIcon} />
          <h3>Great job! No immediate coaching needs identified.</h3>
          <p>Your team is performing well!</p>
        </div>
      ) : (
        <div className={styles.opportunitiesList}>
          {insights.map((insight, index) => (
            <div
              key={`${insight.userId}-${insight.type}`}
              className={`${styles.opportunityCard} ${styles[insight.severity]}`}
            >
              <div className={styles.opportunityHeader}>
                <div className={styles.opportunityInfo}>
                  <div className={`${styles.opportunityIcon} ${styles[insight.severity]}`}>
                    <FontAwesomeIcon icon={getTypeIcon(insight.type)} />
                  </div>
                  <div className={styles.opportunityDetails}>
                    <h4 className={styles.agentName}>{insight.userName}</h4>
                    <p className={`${styles.opportunityType} ${styles[insight.severity]}`}>
                      {getTypeLabel(insight.type)}
                    </p>
                  </div>
                </div>
                <div className={`${styles.severityBadge} ${styles[insight.severity]}`}>
                  {insight.severity}
                </div>
              </div>

              <div className={styles.metricValue}>
                <span className={styles.metricLabel}>{insight.metric}:</span>
                <span className={styles.metricNumber}>{insight.value}</span>
                {insight.trend && (
                  <span
                    className={`${styles.trendIndicator} ${insight.trend < 0 ? styles.negative : styles.positive}`}
                  >
                    {insight.trend > 0 ? '+' : ''}
                    {insight.trend}%
                  </span>
                )}
              </div>

              <div className={styles.recommendation}>
                <FontAwesomeIcon icon={faArrowRight} className={styles.recommendationIcon} />
                <p className={styles.recommendationText}>{insight.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
