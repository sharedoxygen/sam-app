'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faChartPie,
  faChartBar,
  faDollarSign,
  faUsers,
  faCalendarWeek,
} from '@fortawesome/free-solid-svg-icons';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  Filler,
} from 'chart.js';
import { useAuth } from '@/lib/auth/AuthContext';
import { Role } from '@prisma/client';
import { getPageHeaderForRole } from '@/lib/constants/roleConfig';
import styles from './page.module.css';

// Import CSS module

export const dynamic = 'force-dynamic';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PremiumTrendData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    fill?: boolean;
  }[];
}

interface AgentPerformanceData {
  agentName: string;
  department: string;
  totalPremium: number;
  salesCount: number;
  conversionRate: number;
  activityCompletionRate: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<
    'premium-trends' | 'agent-performance' | 'activity-completion' | 'department-comparison'
  >('premium-trends');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [premiumTrendData, setPremiumTrendData] = useState<ChartData<'line'>>({ datasets: [] });
  const [agentPerformanceData, setAgentPerformanceData] = useState<AgentPerformanceData[]>([]);
  const [activityCompletionData, setActivityCompletionData] = useState<ChartData<'doughnut'>>({
    datasets: [],
  });
  const [departmentComparisonData, setDepartmentComparisonData] = useState<ChartData<'bar'>>({
    datasets: [],
  });
  const [summary, setSummary] = useState<any>(null);

  // Get role-based page configuration
  const pageHeader = getPageHeaderForRole(user?.role, 'reports');

  // Check if user is a lead role
  const isLead = user?.role === Role.SALES_LEAD || user?.role === Role.SERVICE_LEAD;
  const isAdmin = user?.role === Role.ADMIN;

  // Redirect if no user or unauthorized (ADMIN users cannot access reports)
  useEffect(() => {
    if (!user) return;

    // Only SALES and SERVICE agents can access reports (leads get same metrics in dashboard)
    const allowedRoles = ['SALES', 'SERVICE'];
    if (!allowedRoles.includes(user.role)) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  useEffect(() => {
    fetchReportData(reportType, dateRange);
  }, [reportType, dateRange, user]);

  const fetchReportData = async (type: string, range: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range, type });

      const endpoint = '/api/reports/enhanced';
      const response = await fetch(`${endpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();

      // Process data based on report type
      if (type === 'premium-trends') {
        setPremiumTrendData({
          labels: data.labels || [],
          datasets: [
            {
              label: 'Total Premium',
              data: data.totalPremium || [],
              borderColor: '#28a745',
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              tension: 0.4,
              fill: true,
            },
            ...(isAdmin || isLead
              ? [
                  {
                    label: 'Sales Department',
                    data: data.salesPremium || [],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4,
                    fill: false,
                  },
                  {
                    label: 'Service Department',
                    data: data.servicePremium || [],
                    borderColor: '#6f42c1',
                    backgroundColor: 'rgba(111, 66, 193, 0.1)',
                    tension: 0.4,
                    fill: false,
                  },
                ]
              : []),
          ],
        });
        setSummary(data.summary);
      } else if (type === 'agent-performance') {
        setAgentPerformanceData(data.agents || []);
        setSummary(data.summary);
      } else if (type === 'activity-completion') {
        const completionData = data.completion || {};
        setActivityCompletionData({
          labels: ['Completed', 'In Progress', 'Not Started'],
          datasets: [
            {
              data: [
                completionData.completed || 0,
                completionData.inProgress || 0,
                completionData.notStarted || 0,
              ],
              backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        });
        setSummary(data.summary);
      } else if (type === 'department-comparison') {
        const deptData = data.departments || {};
        setDepartmentComparisonData({
          labels: ['Sales', 'Service'],
          datasets: [
            {
              label: 'Total Premium',
              data: [deptData.sales?.totalPremium || 0, deptData.service?.totalPremium || 0],
              backgroundColor: '#28a745',
            },
            {
              label: 'Total Activities',
              data: [deptData.sales?.totalActivities || 0, deptData.service?.totalActivities || 0],
              backgroundColor: '#0d6efd',
            },
            {
              label: 'Conversion Rate (%)',
              data: [deptData.sales?.conversionRate || 0, deptData.service?.conversionRate || 0],
              backgroundColor: '#6f42c1',
            },
          ],
        });
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      // Set empty data on error
      setPremiumTrendData({ labels: [], datasets: [] });
      setAgentPerformanceData([]);
      setActivityCompletionData({ labels: [], datasets: [] });
      setDepartmentComparisonData({ labels: [], datasets: [] });
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'premium-trends':
        return faDollarSign;
      case 'agent-performance':
        return faUsers;
      case 'activity-completion':
        return faChartPie;
      case 'department-comparison':
        return faChartBar;
      default:
        return faChartBar;
    }
  };

  const getReportTitle = () => {
    const typeTitle =
      {
        'premium-trends': 'Premium Trends',
        'agent-performance': 'Agent Performance',
        'activity-completion': 'Activity Completion',
        'department-comparison': 'Department Comparison',
      }[reportType] || 'Report';

    let rangeTitle = '';
    switch (dateRange) {
      case 'week':
        rangeTitle = 'Weekly';
        break;
      case 'month':
        rangeTitle = 'Monthly';
        break;
      case 'quarter':
        rangeTitle = 'Quarterly';
        break;
      case 'year':
        rangeTitle = 'Annual';
        break;
    }

    return `${rangeTitle} ${typeTitle}`;
  };

  const handleExportReport = () => {
    try {
      const csvContent = generateReportCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `${reportType}-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const generateReportCSV = () => {
    const lines = [];
    const title = getReportTitle();

    lines.push(title);
    lines.push(`Generated on: ${new Date().toLocaleDateString()}`);
    lines.push('');

    if (reportType === 'premium-trends') {
      lines.push('Premium Trend Data');
      lines.push('Period,Total Premium,Sales Premium,Service Premium');
      premiumTrendData.labels?.forEach((label, index) => {
        const total = premiumTrendData.datasets[0]?.data[index] || 0;
        const sales = premiumTrendData.datasets[1]?.data[index] || 0;
        const service = premiumTrendData.datasets[2]?.data[index] || 0;
        lines.push(`${label},${total},${sales},${service}`);
      });
    } else if (reportType === 'agent-performance') {
      lines.push('Agent Performance Data');
      lines.push(
        'Agent Name,Department,Total Premium,Sales Count,Conversion Rate,Activity Completion Rate'
      );
      agentPerformanceData.forEach((agent) => {
        lines.push(
          `${agent.agentName},${agent.department},${agent.totalPremium},${agent.salesCount},${agent.conversionRate}%,${agent.activityCompletionRate}%`
        );
      });
    }

    return lines.join('\n');
  };

  const premiumChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
  };

  const activityChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="page-title mb-1">{pageHeader.title}</h1>
        <button className="btn btn-outline-secondary" onClick={handleExportReport}>
          <FontAwesomeIcon icon={faDownload} className="me-2" />
          Export
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Report Type</label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${reportType === 'premium-trends' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setReportType('premium-trends')}
                >
                  <FontAwesomeIcon icon={faDollarSign} className="me-2" />
                  Premium Trends
                </button>
                <button
                  type="button"
                  className={`btn ${reportType === 'agent-performance' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setReportType('agent-performance')}
                >
                  <FontAwesomeIcon icon={faUsers} className="me-2" />
                  Agent Performance
                </button>
                <button
                  type="button"
                  className={`btn ${reportType === 'activity-completion' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setReportType('activity-completion')}
                >
                  <FontAwesomeIcon icon={faChartPie} className="me-2" />
                  Activity Completion
                </button>
                {(isAdmin || isLead) && (
                  <button
                    type="button"
                    className={`btn ${reportType === 'department-comparison' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setReportType('department-comparison')}
                  >
                    <FontAwesomeIcon icon={faChartBar} className="me-2" />
                    Departments
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Date Range</label>
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn ${dateRange === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDateRange('week')}
                >
                  Week
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDateRange('month')}
                >
                  Month
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'quarter' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDateRange('quarter')}
                >
                  Quarter
                </button>
                <button
                  type="button"
                  className={`btn ${dateRange === 'year' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setDateRange('year')}
                >
                  Year
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading report data...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards for current report */}
          {summary && (
            <div className="row g-3 mb-4">
              {reportType === 'premium-trends' && (
                <>
                  <div className="col-6 col-md-3">
                    <div className="card text-center shadow-sm">
                      <div className="card-body">
                        <div className="fs-4 fw-bold text-success">
                          ${(summary.totalPremium || 0).toLocaleString()}
                        </div>
                        <div className="text-muted">Total Premium</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card text-center shadow-sm">
                      <div className="card-body">
                        <div className="fs-4 fw-bold text-primary">{summary.growthRate || 0}%</div>
                        <div className="text-muted">Growth Rate</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card text-center shadow-sm">
                      <div className="card-body">
                        <div className="fs-4 fw-bold text-info">
                          ${(summary.averagePremium || 0).toLocaleString()}
                        </div>
                        <div className="text-muted">Avg Premium</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card text-center shadow-sm">
                      <div className="card-body">
                        <div className="fs-4 fw-bold text-warning">{summary.totalSales || 0}</div>
                        <div className="text-muted">Total Sales</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {reportType === 'activity-completion' && (
                <>
                  <div className="col-6 col-md-3">
                    <div className="card text-center shadow-sm">
                      <div className="card-body">
                        <div className="fs-4 fw-bold text-success">
                          {summary.completionRate || 0}%
                        </div>
                        <div className="text-muted">Completion Rate</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card text-center shadow-sm">
                      <div className="card-body">
                        <div className="fs-4 fw-bold text-primary">
                          {summary.totalActivities || 0}
                        </div>
                        <div className="text-muted">Total Activities</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card text-center shadow-sm">
                      <div className="card-body">
                        <div className="fs-4 fw-bold text-info">{summary.averagePerAgent || 0}</div>
                        <div className="text-muted">Avg per Agent</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card text-center shadow-sm">
                      <div className="card-body">
                        <div className="fs-4 fw-bold text-warning">{summary.activeAgents || 0}</div>
                        <div className="text-muted">Active Agents</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Charts Section */}
          <div className="row g-4">
            {reportType === 'premium-trends' && (
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <FontAwesomeIcon icon={faDollarSign} className="me-2" />
                      Premium Revenue Trends
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className={styles.chartContainer400}>
                      <Line data={premiumTrendData} options={premiumChartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportType === 'agent-performance' && (
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <FontAwesomeIcon icon={faUsers} className="me-2" />
                      Agent Performance Comparison
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead>
                          <tr>
                            <th>Agent Name</th>
                            <th>Department</th>
                            <th className="text-end">Total Premium</th>
                            <th className="text-center">Sales</th>
                            <th className="text-center">Conversion Rate</th>
                            <th className="text-center">Activity Completion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentPerformanceData.map((agent, index) => (
                            <tr key={index}>
                              <td className="fw-medium">{agent.agentName}</td>
                              <td>
                                <span
                                  className={`badge ${agent.department === 'Sales' ? 'bg-primary' : 'bg-info'}`}
                                >
                                  {agent.department}
                                </span>
                              </td>
                              <td className="text-end">${agent.totalPremium.toLocaleString()}</td>
                              <td className="text-center">{agent.salesCount}</td>
                              <td className="text-center">
                                <span
                                  className={`badge ${agent.conversionRate >= 15 ? 'bg-success' : agent.conversionRate >= 10 ? 'bg-warning' : 'bg-danger'}`}
                                >
                                  {agent.conversionRate}%
                                </span>
                              </td>
                              <td className="text-center">
                                <div className={`progress ${styles.progressBar}`}>
                                  <div
                                    className={`progress-bar ${styles.progressBarFill}`}
                                    role="progressbar"
                                    ref={(el) => {
                                      if (el) {
                                        el.style.setProperty(
                                          '--progress-width',
                                          `${agent.activityCompletionRate}%`
                                        );
                                        el.style.width = `var(--progress-width)`;
                                      }
                                    }}
                                    aria-valuenow={agent.activityCompletionRate}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  >
                                    {agent.activityCompletionRate}%
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportType === 'activity-completion' && (
              <>
                <div className="col-md-6">
                  <div className="card shadow-sm">
                    <div className="card-header">
                      <h5 className="mb-0">
                        <FontAwesomeIcon icon={faChartPie} className="me-2" />
                        Activity Completion Status
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className={styles.chartContainer300}>
                        <Doughnut data={activityCompletionData} options={activityChartOptions} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card shadow-sm">
                    <div className="card-header">
                      <h5 className="mb-0">
                        <FontAwesomeIcon icon={faCalendarWeek} className="me-2" />
                        Weekly Activity Trends
                      </h5>
                    </div>
                    <div className="card-body">
                      <div className="list-group">
                        <div className="list-group-item d-flex justify-content-between align-items-center">
                          <span>Calls Made</span>
                          <span className="badge bg-primary rounded-pill">
                            {summary?.weeklyStats?.calls || 0}
                          </span>
                        </div>
                        <div className="list-group-item d-flex justify-content-between align-items-center">
                          <span>Meetings Scheduled</span>
                          <span className="badge bg-success rounded-pill">
                            {summary?.weeklyStats?.meetings || 0}
                          </span>
                        </div>
                        <div className="list-group-item d-flex justify-content-between align-items-center">
                          <span>Quotes Generated</span>
                          <span className="badge bg-info rounded-pill">
                            {summary?.weeklyStats?.quotes || 0}
                          </span>
                        </div>
                        <div className="list-group-item d-flex justify-content-between align-items-center">
                          <span>Sales Closed</span>
                          <span className="badge bg-warning rounded-pill">
                            {summary?.weeklyStats?.sales || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {reportType === 'department-comparison' && (
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <FontAwesomeIcon icon={faChartBar} className="me-2" />
                      Department Performance Comparison
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className={styles.chartContainer400}>
                      <Bar
                        data={departmentComparisonData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
