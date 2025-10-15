'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faPhone,
  faChartLine,
  faHandshake,
  faTrophy,
  faExclamationTriangle,
  faArrowUp,
  faArrowDown,
  faSpinner,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';
import styles from './TeamPerformanceCard.module.css';

interface TeamMemberMetrics {
  id: number;
  name: string;
  role: string;
  metrics: {
    dailyCalls: number;
    dailySales: number;
    weeklyTotal: number;
    conversionRate: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
    rawNew: number; // Raw New indicator count
    multiLine: number; // Multi-line indicator count
    rawNewPercentage: number; // Percentage of sales that are RN
    multiLinePercentage: number; // Percentage of sales that are ML
  };
  status: 'on-track' | 'needs-attention' | 'exceeding';
}

interface TeamPerformanceCardProps {
  managerId?: string;
}

export default function TeamPerformanceCard({ managerId }: TeamPerformanceCardProps) {
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<TeamMemberMetrics[]>([]);
  const [teamSummary, setTeamSummary] = useState({
    totalMembers: 0,
    // Today's actual metrics
    totalCallsToday: 0,
    totalMeetingsToday: 0,
    totalSalesToday: 0,
    // Weekly totals for context
    totalWeeklyCalls: 0,
    totalWeeklySales: 0,
    avgConversion: 0,
    totalRawNew: 0, // Total RN indicators across team
    totalMultiLine: 0, // Total ML indicators across team
    avgRawNewPercentage: 0, // Average RN percentage
    avgMultiLinePercentage: 0, // Average ML percentage
  });

  useEffect(() => {
    fetchTeamPerformance();
  }, [managerId]);

  const fetchTeamPerformance = async () => {
    try {
      setLoading(true);
      // Fetch team performance data
      const response = await fetch(
        `/api/team/performance${managerId ? `?managerId=${managerId}` : ''}`
      );

      if (response.ok) {
        const data = await response.json();

        // Transform the data into team member metrics
        const members: TeamMemberMetrics[] =
          data.teamMembers?.map((member: any) => ({
            id: member.userId,
            name: member.userName,
            role: member.userRole,
            metrics: {
              dailyCalls: member.todayMetrics?.calls || 0,
              dailySales: member.todayMetrics?.sales || 0,
              weeklyTotal: member.weeklyMetrics?.sales || 0,
              conversionRate: member.performanceMetrics?.conversionRate || 0,
              trend: member.trend || 'stable',
              trendValue: member.trendValue || 0,
              rawNew: member.weeklyMetrics?.rawNew || 0,
              multiLine: member.weeklyMetrics?.multiLine || 0,
              rawNewPercentage: member.weeklyMetrics?.rawNewPercentage || 0,
              multiLinePercentage: member.weeklyMetrics?.multiLinePercentage || 0,
            },
            status: getPerformanceStatus(member.performanceMetrics?.conversionRate || 0),
          })) || [];

        setTeamData(members);

        // Calculate team summary using the new API response structure
        const summary = {
          totalMembers: members.length,
          // Use the new API fields for accurate today's data
          totalCallsToday: data.summary?.totalCallsToday || 0,
          totalMeetingsToday: data.summary?.totalMeetingsToday || 0,
          totalSalesToday: data.summary?.totalSalesToday || 0,
          // Weekly totals for context
          totalWeeklyCalls: data.summary?.totalWeeklyCalls || 0,
          totalWeeklySales: data.summary?.totalWeeklySales || 0,
          avgConversion: data.summary?.avgConversion || 0,
          totalRawNew: data.summary?.totalRawNew || 0,
          totalMultiLine: data.summary?.totalMultiLine || 0,
          avgRawNewPercentage: data.summary?.avgRawNewPercentage || 0,
          avgMultiLinePercentage: data.summary?.avgMultiLinePercentage || 0,
        };

        setTeamSummary(summary);
      }
    } catch (error) {
      console.error('Error fetching team performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceStatus = (
    conversionRate: number
  ): 'on-track' | 'needs-attention' | 'exceeding' => {
    if (conversionRate >= 20) return 'exceeding';
    if (conversionRate >= 10) return 'on-track';
    return 'needs-attention';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeding':
        return '#28a745';
      case 'on-track':
        return '#17a2b8';
      case 'needs-attention':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  const getTrendIcon = (trend: string, value: number) => {
    if (trend === 'up') {
      return (
        <FontAwesomeIcon icon={faArrowUp} className={`${styles.trendIcon} ${styles.success}`} />
      );
    } else if (trend === 'down') {
      return (
        <FontAwesomeIcon icon={faArrowDown} className={`${styles.trendIcon} ${styles.danger}`} />
      );
    }
    return null;
  };

  // Generate team performance insights
  const generateTeamInsights = () => {
    if (teamData.length === 0) {
      return 'No team members to analyze. Add team members to see performance insights and coaching opportunities.';
    }

    const highPerformers = teamData.filter((m) => m.status === 'exceeding').length;
    const needsAttention = teamData.filter((m) => m.status === 'needs-attention').length;
    const avgConversion = teamSummary.avgConversion;
    const totalRN = teamSummary.totalRawNew;
    const totalML = teamSummary.totalMultiLine;

    // Performance distribution analysis
    const performanceRatio = (highPerformers / teamData.length) * 100;
    const attentionRatio = (needsAttention / teamData.length) * 100;

    if (performanceRatio > 60) {
      return `Strong team performance with ${highPerformers} high performers (${performanceRatio.toFixed(0)}%). Focus on scaling successful practices across the organization.`;
    } else if (attentionRatio > 40) {
      return `Team needs coaching support with ${needsAttention} members requiring attention. Priority: one-on-one meetings and skills development.`;
    } else if (avgConversion > 15) {
      return `Well-balanced team with ${avgConversion.toFixed(1)}% average conversion rate. ${totalRN + totalML > 0 ? `Strong indicator performance with ${totalRN} RN and ${totalML} ML sales.` : 'Focus on improving indicator tracking.'}`;
    } else if (teamSummary.totalCallsToday > 50) {
      return `High activity team with ${teamSummary.totalCallsToday} total calls today. Work on improving call quality and conversion techniques.`;
    } else {
      return `Team building phase - focus on consistent daily activity, skills training, and establishing performance benchmarks.`;
    }
  };

  if (loading) {
    return (
      <div className={`${styles.teamPerformanceCard} ${styles.loading}`}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading team performance...</p>
      </div>
    );
  }

  return (
    <div className={styles.teamPerformanceCard}>
      <div className={styles.cardHeader}>
        <h3>
          <FontAwesomeIcon icon={faUser} />
          Team Performance Overview
        </h3>
        <span className={styles.teamCount}>{teamSummary.totalMembers} members</span>
      </div>

      <div className={styles.teamSummary}>
        {/* Today's Actual Performance */}
        <div className={styles.summarySection}>
          <h4 className={styles.sectionTitle}>Today's Actuals</h4>
          <div className={styles.summaryRow}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{teamSummary.totalCallsToday}</div>
              <div className={styles.summaryLabel}>Calls Made</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{teamSummary.totalMeetingsToday}</div>
              <div className={styles.summaryLabel}>Meetings</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{teamSummary.totalSalesToday}</div>
              <div className={styles.summaryLabel}>Sales Closed</div>
            </div>
          </div>
        </div>

        {/* Weekly Context */}
        <div className={styles.summarySection}>
          <h4 className={styles.sectionTitle}>This Week</h4>
          <div className={styles.summaryRow}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{teamSummary.totalWeeklyCalls}</div>
              <div className={styles.summaryLabel}>Total Calls</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{teamSummary.totalWeeklySales}</div>
              <div className={styles.summaryLabel}>Total Sales</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{teamSummary.avgConversion.toFixed(1)}%</div>
              <div className={styles.summaryLabel}>Avg Conversion</div>
            </div>
          </div>
        </div>

        {/* Sales Indicators */}
        <div className={styles.summarySection}>
          <h4 className={styles.sectionTitle}>Sales Indicators</h4>
          <div className={styles.summaryRow}>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{teamSummary.totalRawNew}</div>
              <div className={styles.summaryLabel}>Raw New (RN)</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryValue}>{teamSummary.totalMultiLine}</div>
              <div className={styles.summaryLabel}>Multi-line (ML)</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.teamInsights}>
        <FontAwesomeIcon icon={faLightbulb} />
        {generateTeamInsights()}
      </div>

      <div className={styles.teamMembersList}>
        {teamData.length === 0 ? (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faUser} className={styles.emptyIcon} />
            <h3>No team members found</h3>
            <p>Add team members to see performance insights and coaching opportunities.</p>
          </div>
        ) : (
          teamData.map((member) => (
            <div
              key={member.id}
              className={`${styles.memberCard} ${styles[member.status.replace('-', '')]}`}
            >
              <div className={styles.memberHeader}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberAvatar}>{member.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.memberDetails}>
                    <h4>{member.name}</h4>
                    <p>{member.role}</p>
                  </div>
                </div>
                <div className={`${styles.statusBadge} ${styles[member.status.replace('-', '')]}`}>
                  {member.status === 'exceeding' && <FontAwesomeIcon icon={faTrophy} />}
                  {member.status === 'needs-attention' && (
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                  )}
                  {member.status.replace('-', ' ')}
                </div>
              </div>

              <div className={styles.memberMetrics}>
                <div className={styles.metricItem}>
                  <div className={styles.metricValue}>
                    <FontAwesomeIcon icon={faPhone} />
                    {member.metrics.dailyCalls}
                  </div>
                  <div className={styles.metricLabel}>Calls</div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricValue}>
                    <FontAwesomeIcon icon={faChartLine} />
                    {member.metrics.dailySales}
                  </div>
                  <div className={styles.metricLabel}>Sales</div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricValue}>
                    <FontAwesomeIcon icon={faHandshake} />
                    {member.metrics.conversionRate}%
                  </div>
                  <div className={styles.metricLabel}>Conversion</div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricValue}>
                    {getTrendIcon(member.metrics.trend, member.metrics.trendValue)}
                    {Math.abs(member.metrics.trendValue)}%
                  </div>
                  <div className={styles.metricLabel}>Trend</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
