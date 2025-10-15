'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStream,
  faPhone,
  faHandshake,
  faFileContract,
  faUserPlus,
  faEnvelope,
  faCalendarCheck,
  faCheckCircle,
  faSpinner,
  faFilter,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import styles from './TeamActivityFeed.module.css';

interface TeamActivity {
  id: number;
  timestamp: string;
  userId: number;
  userName: string;
  type: 'call' | 'sale' | 'quote' | 'referral' | 'email' | 'meeting';
  description: string;
  clientName?: string;
  value?: number;
  productType?: string;
  status?: 'completed' | 'scheduled' | 'in-progress';
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
}

interface TeamActivityFeedProps {
  managerId?: string;
  limit?: number;
}

export default function TeamActivityFeed({ managerId, limit = 20 }: TeamActivityFeedProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
    fetchTeamActivities();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchTeamActivities, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [managerId, filter, agentFilter, departmentFilter, autoRefresh]);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/users/team');
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchTeamActivities = async () => {
    try {
      setLoading(activities.length === 0); // Only show loading on initial load

      // Build query params
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(managerId && { managerId }),
        ...(filter !== 'all' && { type: filter }),
        ...(agentFilter !== 'all' && { agentId: agentFilter }),
        ...(departmentFilter !== 'all' && { department: departmentFilter }),
      });

      const response = await fetch(`/api/team/activities?${params}`);

      if (response.ok) {
        const data = await response.json();

        // Transform activities for display
        const transformedActivities: TeamActivity[] =
          data.activities?.map((activity: any) => ({
            id: activity.id,
            timestamp: activity.date || activity.createdAt,
            userId: activity.UserId,
            userName: activity.User?.name || 'Unknown',
            type: activity.type,
            description: generateDescription(activity),
            clientName: activity.clientName,
            value: activity.value,
            productType: activity.insuranceType,
            status: activity.status || 'completed',
          })) || [];

        setActivities(transformedActivities);
      }
    } catch (error) {
      console.error('Error fetching team activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDescription = (activity: any): string => {
    switch (activity.type) {
      case 'call':
        return `Made a ${activity.duration || 0} minute call`;
      case 'sale':
        return `Closed a ${activity.insuranceType || 'insurance'} policy`;
      case 'quote':
        return `Generated a quote for ${activity.insuranceType || 'insurance'}`;
      case 'referral':
        return `Received a referral`;
      case 'email':
        return `Sent follow-up email`;
      case 'meeting':
        return `Completed client meeting`;
      default:
        return activity.notes || 'Completed activity';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return faPhone;
      case 'sale':
        return faCheckCircle;
      case 'quote':
        return faFileContract;
      case 'referral':
        return faUserPlus;
      case 'email':
        return faEnvelope;
      case 'meeting':
        return faCalendarCheck;
      default:
        return faHandshake;
    }
  };

  const filteredActivities =
    filter === 'all' ? activities : activities.filter((a) => a.type === filter);

  if (loading && activities.length === 0) {
    return (
      <div className={styles.loading}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading team activities...</p>
      </div>
    );
  }

  return (
    <div className={styles.teamActivityFeed}>
      <div className={styles.feedHeader}>
        <h3>
          <FontAwesomeIcon icon={faStream} />
          Team Activity Feed
        </h3>
        <div className={styles.feedControls}>
          {/* Activity Type Filters */}
          <div className={styles.filterSection}>
            <span className={styles.filterLabel}>Activity:</span>
            <div className={styles.filterButtons}>
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                All
              </button>
              <button
                className={filter === 'sale' ? 'active' : ''}
                onClick={() => setFilter('sale')}
              >
                Sales
              </button>
              <button
                className={filter === 'call' ? 'active' : ''}
                onClick={() => setFilter('call')}
              >
                Calls
              </button>
              <button
                className={filter === 'quote' ? 'active' : ''}
                onClick={() => setFilter('quote')}
              >
                Quotes
              </button>
            </div>
          </div>

          {/* Department Filter - Only for Office Manager */}
          {user?.role === 'OFFICE_MANAGER' && (
            <div className={styles.filterSection}>
              <span className={styles.filterLabel}>Department:</span>
              <div className={styles.filterButtons}>
                <button
                  className={departmentFilter === 'all' ? 'active' : ''}
                  onClick={() => setDepartmentFilter('all')}
                >
                  All
                </button>
                <button
                  className={departmentFilter === 'sales' ? 'active' : ''}
                  onClick={() => setDepartmentFilter('sales')}
                >
                  Sales
                </button>
                <button
                  className={departmentFilter === 'service' ? 'active' : ''}
                  onClick={() => setDepartmentFilter('service')}
                >
                  Service
                </button>
              </div>
            </div>
          )}

          {/* Agent Filter - For Leads and Office Manager */}
          {(user?.role === 'SALES_LEAD' ||
            user?.role === 'SERVICE_LEAD' ||
            user?.role === 'OFFICE_MANAGER') &&
            teamMembers.length > 0 && (
              <div className={styles.filterSection}>
                <span className={styles.filterLabel}>
                  <FontAwesomeIcon icon={faUsers} />
                  Agent:
                </span>
                <select
                  className={styles.filterSelect}
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                >
                  <option value="all">All Agents</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id.toString()}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

          <button
            className={`${styles.autoRefresh} ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          >
            <FontAwesomeIcon icon={faSpinner} spin={autoRefresh} />
          </button>
        </div>
      </div>

      <div className={styles.activitiesTimeline}>
        {filteredActivities.length === 0 ? (
          <div className={styles.noActivities}>
            <FontAwesomeIcon icon={faFilter} size="2x" />
            <p>No activities found</p>
            <span>Try adjusting your filters</span>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} className={styles.activityEntry}>
              <div className={styles.activityTime}>
                <span className={styles.timeAgo}>
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
                <span className={styles.exactTime}>
                  {format(new Date(activity.timestamp), 'h:mm a')}
                </span>
              </div>

              <div className={`${styles.activityIcon} ${styles[activity.type] || styles.default}`}>
                <FontAwesomeIcon icon={getActivityIcon(activity.type)} />
              </div>

              <div className={styles.activityDetails}>
                <div className={styles.activityHeader}>
                  <span className={styles.userName}>{activity.userName}</span>
                  <span className={styles.activityType}>{activity.type}</span>
                </div>

                <div className={styles.activityDescription}>
                  {activity.description}
                  {activity.clientName && (
                    <span className={styles.clientName}> with {activity.clientName}</span>
                  )}
                </div>

                {activity.value && (
                  <div className={styles.activityValue}>${activity.value.toLocaleString()}</div>
                )}

                {activity.productType && (
                  <span
                    className={`${styles.productBadge} ${styles[activity.type] || styles.default}`}
                  >
                    {activity.productType}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
