'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShieldAlt,
    faSearch,
    faFilter,
    faDownload,
    faRefresh,
    faUser,
    faDatabase,
    faCog,
    faExclamationTriangle,
    faInfoCircle,
    faCalendarAlt,
    faChartBar,
    faEye,
    faFileExport,
} from '@fortawesome/free-solid-svg-icons';
import styles from './page.module.css';

interface AuditLog {
    id: number;
    tableName: string;
    recordId: number;
    action: string;
    changes?: any;
    userId: number;
    userAgent?: string;
    ipAddress?: string;
    endpoint?: string;
    metadata?: any;
    createdAt: string;
    User: {
        id: number;
        name: string;
        username: string;
        role: string;
    };
}

interface AuditStats {
    actionStats: Array<{ action: string; count: number }>;
    topUsers: Array<{ userId: number; activityCount: number }>;
    totalEvents: number;
}

interface FilterOptions {
    userId?: string;
    tableName?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
}

function AuditLogsContent() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    // State management
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    // Filter state
    const [filters, setFilters] = useState<FilterOptions>({
        page: 1,
        limit: 25,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 25,
        total: 0,
        pages: 0,
    });

    // Available filter options
    const actionTypes = [
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
        'ACCESS_DENIED', 'PASSWORD_CHANGE', 'ROLE_CHANGE',
        'DATA_EXPORT', 'BACKUP_CREATE', 'SYSTEM_CONFIG_CHANGE'
    ];

    const tableNames = [
        'User', 'Activity', 'Task', 'Client', 'Feedback',
        'WeeklyActivity', 'System'
    ];

    // Authentication check
    useEffect(() => {
        if (authLoading) return;

        if (!user || user.role !== 'ADMIN') {
            router.replace('/');
            return;
        }

        setAuthChecked(true);
    }, [user, authLoading, router]);

    useEffect(() => {
        if (authChecked && user?.role === 'ADMIN') {
            fetchAuditLogs();
            fetchAuditStats();
        }
    }, [authChecked, user, filters]);

    if (authLoading || !authChecked) {
        return (
            <div className="container py-4">
                <div className="d-flex justify-content-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!user || user.role !== 'ADMIN') {
        return null;
    }

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.tableName) params.append('tableName', filters.tableName);
            if (filters.action) params.append('action', filters.action);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            params.append('page', filters.page.toString());
            params.append('limit', filters.limit.toString());

            const response = await fetch(`/api/audit-logs?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setLogs(data.logs || []);
            setPagination(data.pagination || { page: 1, limit: 25, total: 0, pages: 0 });
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditStats = async () => {
        try {
            const response = await fetch('/api/audit-logs/stats?days=30');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setStats(data.stats);
        } catch (err) {
            console.error('Error fetching audit stats:', err);
            // Don't set error state for stats - it's not critical
        }
    };

    const handleFilterChange = (key: keyof FilterOptions, value: string | number) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: key !== 'page' ? 1 : (typeof value === 'number' ? value : parseInt(value.toString())), // Reset to page 1 when other filters change
        }));
    };

    const clearFilters = () => {
        setFilters({ page: 1, limit: 25 });
    };

    const exportLogs = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.tableName) params.append('tableName', filters.tableName);
            if (filters.action) params.append('action', filters.action);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            params.append('limit', '1000'); // Export more records

            const response = await fetch(`/api/audit-logs?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Export failed');
            }

            const data = await response.json();

            // Convert to CSV
            const csv = convertToCSV(data.logs);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();

            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting logs:', err);
            setError('Failed to export audit logs');
        }
    };

    const convertToCSV = (logs: AuditLog[]): string => {
        const headers = [
            'Timestamp', 'User', 'Action', 'Table', 'Record ID',
            'IP Address', 'User Agent', 'Endpoint'
        ];

        const rows = logs.map(log => [
            new Date(log.createdAt).toISOString(),
            `${log.User.name} (${log.User.username})`,
            log.action,
            log.tableName,
            log.recordId.toString(),
            log.ipAddress || '',
            log.userAgent || '',
            log.endpoint || ''
        ]);

        return [headers, ...rows]
            .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
            .join('\n');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'LOGIN':
            case 'LOGOUT':
                return faUser;
            case 'CREATE':
            case 'UPDATE':
            case 'DELETE':
                return faDatabase;
            case 'ACCESS_DENIED':
                return faExclamationTriangle;
            case 'SYSTEM_CONFIG_CHANGE':
                return faCog;
            default:
                return faInfoCircle;
        }
    };

    const getActionColor = (action: string): string => {
        switch (action) {
            case 'CREATE':
                return '#28a745';
            case 'UPDATE':
                return '#17a2b8';
            case 'DELETE':
                return '#dc3545';
            case 'LOGIN':
                return '#28a745';
            case 'LOGOUT':
                return '#6c757d';
            case 'ACCESS_DENIED':
                return '#dc3545';
            default:
                return '#007bff';
        }
    };

    if (loading && logs.length === 0) {
        return <div className="container py-4">Loading audit logs...</div>;
    }

    return (
        <div className="container-fluid py-4">
            {/* Header */}
            <div className={styles.header}>
                <div className="d-flex align-items-center">
                    <FontAwesomeIcon icon={faShieldAlt} className={`me-3 ${styles.headerIcon}`} />
                    <div>
                        <h1 className="mb-1">System Audit Logs</h1>
                        <p className="text-muted mb-0">Track and monitor all system activities and user actions</p>
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-primary"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <FontAwesomeIcon icon={faFilter} className="me-2" />
                        Filters
                    </button>
                    <button
                        className="btn btn-outline-success"
                        onClick={exportLogs}
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon={faDownload} className="me-2" />
                        Export
                    </button>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => {
                            fetchAuditLogs();
                            fetchAuditStats();
                        }}
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon={faRefresh} className="me-2" />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    {error}
                    <button
                        className="btn-close ms-auto"
                        onClick={() => setError(null)}
                        aria-label="Close"
                    ></button>
                </div>
            )}

            {/* Statistics Cards */}
            {stats && (
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{stats.totalEvents}</div>
                            <div className={styles.statLabel}>Total Events (30 days)</div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{stats.actionStats.length}</div>
                            <div className={styles.statLabel}>Action Types</div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{stats.topUsers.length}</div>
                            <div className={styles.statLabel}>Active Users</div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>
                                {Math.round(stats.totalEvents / 30)}
                            </div>
                            <div className={styles.statLabel}>Avg Daily Events</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters Panel */}
            {showFilters && (
                <div className={styles.filtersPanel}>
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label htmlFor="userIdFilter" className="form-label">User ID</label>
                            <input
                                type="number"
                                id="userIdFilter"
                                className="form-control"
                                value={filters.userId || ''}
                                onChange={(e) => handleFilterChange('userId', e.target.value)}
                                placeholder="Filter by user ID"
                            />
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="tableNameFilter" className="form-label">Table</label>
                            <select
                                id="tableNameFilter"
                                className="form-select"
                                value={filters.tableName || ''}
                                onChange={(e) => handleFilterChange('tableName', e.target.value)}
                            >
                                <option value="">All Tables</option>
                                {tableNames.map(table => (
                                    <option key={table} value={table}>{table}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="actionFilter" className="form-label">Action</label>
                            <select
                                id="actionFilter"
                                className="form-select"
                                value={filters.action || ''}
                                onChange={(e) => handleFilterChange('action', e.target.value)}
                            >
                                <option value="">All Actions</option>
                                {actionTypes.map(action => (
                                    <option key={action} value={action}>{action}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="startDateFilter" className="form-label">Start Date</label>
                            <input
                                type="date"
                                id="startDateFilter"
                                className="form-control"
                                value={filters.startDate || ''}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="endDateFilter" className="form-label">End Date</label>
                            <input
                                type="date"
                                id="endDateFilter"
                                className="form-control"
                                value={filters.endDate || ''}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label htmlFor="limitFilter" className="form-label">Per Page</label>
                            <select
                                id="limitFilter"
                                className="form-select"
                                value={filters.limit}
                                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="col-md-6 d-flex align-items-end">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Logs Table */}
            <div className="table-responsive">
                <table className="table table-striped table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>Timestamp</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Table</th>
                            <th>Record</th>
                            <th>IP Address</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td className={styles.timestampCell}>
                                    {formatDate(log.createdAt)}
                                </td>
                                <td>
                                    <div className={styles.userCell}>
                                        <strong>{log.User.name}</strong>
                                        <br />
                                        <small className="text-muted">
                                            {log.User.username} ({log.User.role})
                                        </small>
                                    </div>
                                </td>
                                <td>
                                    <span
                                        className={styles.actionBadge}
                                        ref={(el) => {
                                            if (el) {
                                                el.style.setProperty('--action-color', getActionColor(log.action));
                                            }
                                        }}
                                    >
                                        <FontAwesomeIcon icon={getActionIcon(log.action)} className="me-1" />
                                        {log.action}
                                    </span>
                                </td>
                                <td>{log.tableName}</td>
                                <td>#{log.recordId}</td>
                                <td>
                                    <code className={styles.ipAddress}>
                                        {log.ipAddress || 'N/A'}
                                    </code>
                                </td>
                                <td>
                                    <div className={styles.detailsCell}>
                                        {log.endpoint && (
                                            <div className="mb-1">
                                                <small><strong>Endpoint:</strong> {log.endpoint}</small>
                                            </div>
                                        )}
                                        {log.changes && (
                                            <button
                                                className="btn btn-sm btn-outline-info"
                                                onClick={() => {
                                                    // Show changes in a modal or expandable area
                                                    alert(JSON.stringify(log.changes, null, 2));
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faEye} className="me-1" />
                                                View Changes
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <nav aria-label="Audit logs pagination">
                    <ul className="pagination justify-content-center">
                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button
                                className="page-link"
                                onClick={() => handleFilterChange('page', pagination.page - 1)}
                                disabled={pagination.page === 1}
                            >
                                Previous
                            </button>
                        </li>

                        {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(
                                pagination.pages - 4,
                                pagination.page - 2
                            )) + i;

                            return (
                                <li
                                    key={pageNum}
                                    className={`page-item ${pagination.page === pageNum ? 'active' : ''}`}
                                >
                                    <button
                                        className="page-link"
                                        onClick={() => handleFilterChange('page', pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                </li>
                            );
                        })}

                        <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                            <button
                                className="page-link"
                                onClick={() => handleFilterChange('page', pagination.page + 1)}
                                disabled={pagination.page === pagination.pages}
                            >
                                Next
                            </button>
                        </li>
                    </ul>
                    <div className="text-center text-muted">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} entries
                    </div>
                </nav>
            )}

            {logs.length === 0 && !loading && (
                <div className="text-center py-5 text-muted">
                    <FontAwesomeIcon icon={faShieldAlt} size="3x" className="mb-3" />
                    <p>No audit logs found for the selected criteria.</p>
                </div>
            )}
        </div>
    );
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Audit Logs Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="container py-4">
                    <div className="alert alert-danger" role="alert">
                        <h4 className="alert-heading">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                            Something went wrong
                        </h4>
                        <p>
                            There was an error loading the audit logs page. Please try refreshing the page.
                        </p>
                        <hr />
                        <button className="btn btn-outline-danger" onClick={() => window.location.reload()}>
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Main Export with Error Boundary
export default function AuditLogs() {
    return (
        <ErrorBoundary>
            <AuditLogsContent />
        </ErrorBoundary>
    );
} 