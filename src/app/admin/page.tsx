'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faChartLine,
  faCog,
  faServer,
  faDatabase,
  faExclamationTriangle,
  faCheckCircle,
  faUserShield,
  faChartBar,
  faRefresh,
  faPlus,
  faEdit,
  faBell,
  faCalendarWeek,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';

// Import CSS module
import styles from './page.module.css';

// Type definitions
interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalActivities: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  storageUsed: number;
  storageLimit: number;
}

interface UserStats {
  admins: number;
  salesLeads: number;
  serviceLeads: number;
  salesAgents: number;
  serviceAgents: number;
}

interface ActivityMetrics {
  todayActivities: number;
  weeklyActivities: number;
  monthlyActivities: number;
  averagePerUser: number;
}

interface RecentActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  user: string;
  status: 'success' | 'warning' | 'error';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // State management
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalActivities: 0,
    systemHealth: 'healthy',
    storageUsed: 0,
    storageLimit: 100,
  });
  const [userStats, setUserStats] = useState<UserStats>({
    admins: 0,
    salesLeads: 0,
    serviceLeads: 0,
    salesAgents: 0,
    serviceAgents: 0,
  });
  const [activityMetrics, setActivityMetrics] = useState<ActivityMetrics>({
    todayActivities: 0,
    weeklyActivities: 0,
    monthlyActivities: 0,
    averagePerUser: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user?.role !== Role.ADMIN) {
      router.push('/dashboard');
      return;
    }
    fetchDashboardData();
  }, [user, router]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch users data
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const users = await usersResponse.json();

        // Calculate user statistics
        const userRoleCounts = users.reduce((acc: any, user: any) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        setUserStats({
          admins: userRoleCounts[Role.ADMIN] || 0,
          salesLeads: userRoleCounts[Role.SALES_LEAD] || 0,
          serviceLeads: userRoleCounts[Role.SERVICE_LEAD] || 0,
          salesAgents: userRoleCounts[Role.SALES] || 0,
          serviceAgents: userRoleCounts[Role.SERVICE] || 0,
        });

        setSystemStats((prev) => ({
          ...prev,
          totalUsers: users.length,
          activeUsers: users.filter((u: any) => u.isActive !== false).length,
        }));
      }

      // Fetch real activity metrics from the API
      try {
        // Get activities count for different periods
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);

        // Fetch today's activities
        const todayResponse = await fetch(
          `/api/activities?start=${today.toISOString().split('T')[0]}&end=${today.toISOString().split('T')[0]}`
        );
        const todayData = await todayResponse.json();
        const todayActivities = todayData.totalActivities || 0;

        // Fetch weekly activities
        const weeklyResponse = await fetch(
          `/api/activities?start=${weekAgo.toISOString().split('T')[0]}&end=${today.toISOString().split('T')[0]}`
        );
        const weeklyData = await weeklyResponse.json();
        const weeklyActivities = weeklyData.totalActivities || 0;

        // Fetch monthly activities
        const monthlyResponse = await fetch(
          `/api/activities?start=${monthAgo.toISOString().split('T')[0]}&end=${today.toISOString().split('T')[0]}`
        );
        const monthlyData = await monthlyResponse.json();
        const monthlyActivities = monthlyData.totalActivities || 0;

        // Calculate average per user
        const userCount = systemStats.activeUsers || 1;
        const averagePerUser = Math.round(weeklyActivities / userCount / 7);

        setActivityMetrics({
          todayActivities,
          weeklyActivities,
          monthlyActivities,
          averagePerUser,
        });
      } catch (error) {
        console.error('Error fetching activity metrics:', error);
        // Set default values if API fails
        setActivityMetrics({
          todayActivities: 0,
          weeklyActivities: 0,
          monthlyActivities: 0,
          averagePerUser: 0,
        });
      }

      // Get system health and storage from environment or default values
      setSystemStats((prev) => ({
        ...prev,
        systemHealth: 'healthy',
        storageUsed: 35, // In a real app, this would come from your storage monitoring
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh dashboard data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Get health status color
  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#28a745';
      case 'warning':
        return '#ffc107';
      case 'critical':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faServer} spin size="3x" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1 className="page-title">
              <FontAwesomeIcon icon={faUserShield} />
              Admin Dashboard
            </h1>
            <p className="page-subtitle">System administration and organization management</p>
          </div>
          <div className="header-actions">
            <button className="btn-refresh" onClick={handleRefresh} disabled={refreshing}>
              <FontAwesomeIcon icon={faRefresh} spin={refreshing} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card primary">
          <div className="stat-icon">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="stat-info">
            <h3>{systemStats.totalUsers}</h3>
            <p>Total Users</p>
            <span className="stat-detail">{systemStats.activeUsers} active</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="stat-info">
            <h3>{activityMetrics.todayActivities}</h3>
            <p>Today's Activities</p>
            <span className="stat-detail">+{activityMetrics.averagePerUser} avg/user</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <FontAwesomeIcon icon={faDatabase} />
          </div>
          <div className="stat-info">
            <h3>{systemStats.storageUsed}%</h3>
            <p>Storage Used</p>
            <span className="stat-detail">
              {systemStats.storageLimit - systemStats.storageUsed}% available
            </span>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles[systemStats.systemHealth]}`}>
          <div className={`${styles.statIcon} ${styles[systemStats.systemHealth]}`}>
            <FontAwesomeIcon
              icon={systemStats.systemHealth === 'healthy' ? faCheckCircle : faExclamationTriangle}
            />
          </div>
          <div className={styles.statInfo}>
            <h3 className={`${styles[systemStats.systemHealth]}`}>
              {systemStats.systemHealth.charAt(0).toUpperCase() + systemStats.systemHealth.slice(1)}
            </h3>
            <p>System Health</p>
            <span className={styles.statDetail}>All services operational</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-grid">
        {/* User Management Panel */}
        <div className="panel user-management">
          <div className="panel-header">
            <h3>
              <FontAwesomeIcon icon={faUsers} />
              User Management
            </h3>
            <Link href="/settings/users" className="panel-action">
              <FontAwesomeIcon icon={faEdit} />
              Manage
            </Link>
          </div>
          <div className="panel-content">
            <div className="user-breakdown">
              <div className="role-stat">
                <span className="role-badge admin">{userStats.admins}</span>
                <span className="role-label">Administrators</span>
              </div>
              <div className="role-stat">
                <span className="role-badge lead">{userStats.salesLeads}</span>
                <span className="role-label">Sales Leads</span>
              </div>
              <div className="role-stat">
                <span className="role-badge lead">{userStats.serviceLeads}</span>
                <span className="role-label">Service Leads</span>
              </div>
              <div className="role-stat">
                <span className="role-badge agent">{userStats.salesAgents}</span>
                <span className="role-label">Sales Agents</span>
              </div>
              <div className="role-stat">
                <span className="role-badge agent">{userStats.serviceAgents}</span>
                <span className="role-label">Service Agents</span>
              </div>
            </div>
            <div className="panel-actions">
              <Link href="/settings/users" className="btn-panel">
                <FontAwesomeIcon icon={faPlus} />
                Add User
              </Link>
            </div>
          </div>
        </div>

        {/* System Analytics Panel */}
        <div className="panel analytics">
          <div className="panel-header">
            <h3>
              <FontAwesomeIcon icon={faChartBar} />
              System Metrics
            </h3>
          </div>
          <div className="panel-content">
            <div className="analytics-metrics">
              <div className="metric">
                <span className="metric-value">{activityMetrics.weeklyActivities}</span>
                <span className="metric-label">Weekly Activities</span>
              </div>
              <div className="metric">
                <span className="metric-value">{activityMetrics.monthlyActivities}</span>
                <span className="metric-label">Monthly Activities</span>
              </div>
              <div className="metric">
                <span className="metric-value">{activityMetrics.averagePerUser}</span>
                <span className="metric-label">Avg per User</span>
              </div>
            </div>
            <div className="panel-actions">
              <button className="btn-panel" onClick={handleRefresh}>
                <FontAwesomeIcon icon={faRefresh} />
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="panel quick-actions">
          <div className="panel-header">
            <h3>
              <FontAwesomeIcon icon={faCog} />
              Quick Actions
            </h3>
          </div>
          <div className="panel-content">
            <div className="action-grid">
              <Link href="/settings/users" className="action-item">
                <FontAwesomeIcon icon={faUsers} />
                <span>Manage Users</span>
              </Link>
              <Link href="/weekly-performance" className="action-item">
                <FontAwesomeIcon icon={faCalendarWeek} />
                <span>Performance</span>
              </Link>
              <Link href="/settings" className="action-item">
                <FontAwesomeIcon icon={faCog} />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent System Activities */}
        <div className="panel recent-activities">
          <div className="panel-header">
            <h3>
              <FontAwesomeIcon icon={faBell} />
              Recent System Activity
            </h3>
          </div>
          <div className="panel-content">
            <div className="activity-list">
              <p>Recent activity display has been removed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
