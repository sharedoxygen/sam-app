'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faUsers,
  faChevronDown,
  faChevronUp,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import styles from './PremiumByDepartmentCard.module.css';

interface AgentPremium {
  id: number;
  name: string;
  role: string;
  premiumAmount: number;
  salesCount: number;
  averagePremium: number;
}

interface DepartmentData {
  department: string;
  totalPremium: number;
  totalSales: number;
  averagePremium: number;
  agentCount: number;
  agents: AgentPremium[];
}

interface PremiumByDepartmentCardProps {
  dateRange?: { start: Date; end: Date };
  refreshTrigger?: number;
}

export default function PremiumByDepartmentCard({
  dateRange,
  refreshTrigger,
}: PremiumByDepartmentCardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartmentPremiums();
  }, [dateRange, refreshTrigger]);

  const fetchDepartmentPremiums = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange) {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }

      const response = await fetch(`/api/dashboard/premium-by-department?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch department premiums');
      }

      const data = await response.json();
      setDepartmentData(data.departments || []);
    } catch (err) {
      console.error('Error fetching department premiums:', err);
      setError('Failed to load premium data');
    } finally {
      setLoading(false);
    }
  };

  const toggleDepartment = (department: string) => {
    setExpandedDepartment(expandedDepartment === department ? null : department);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loadingState}>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Loading premium data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <div className={styles.errorState}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const totalPremium = departmentData.reduce((sum, dept) => sum + dept.totalPremium, 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>
            <FontAwesomeIcon icon={faChartLine} className={styles.titleIcon} />
            Premium by Department
          </h3>
          <div className={styles.totalPremium}>
            <span className={styles.totalLabel}>Total Premium:</span>
            <span className={styles.totalAmount}>{formatCurrency(totalPremium)}</span>
          </div>
        </div>
      </div>

      <div className={styles.departments}>
        {departmentData.map((dept) => (
          <div key={dept.department} className={styles.departmentSection}>
            <div
              className={styles.departmentHeader}
              onClick={() => toggleDepartment(dept.department)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  toggleDepartment(dept.department);
                }
              }}
            >
              <div className={styles.departmentInfo}>
                <div className={styles.departmentMain}>
                  <h4 className={styles.departmentName}>{dept.department} Department</h4>
                  <span className={styles.departmentPremium}>
                    {formatCurrency(dept.totalPremium)}
                  </span>
                </div>
                <div className={styles.departmentStats}>
                  <span className={styles.stat}>
                    <FontAwesomeIcon icon={faUsers} className={styles.statIcon} />
                    {dept.agentCount} agents
                  </span>
                  <span className={styles.stat}>{dept.totalSales} sales</span>
                  <span className={styles.stat}>Avg: {formatCurrency(dept.averagePremium)}</span>
                </div>
              </div>
              <FontAwesomeIcon
                icon={expandedDepartment === dept.department ? faChevronUp : faChevronDown}
                className={styles.expandIcon}
              />
            </div>

            {expandedDepartment === dept.department && (
              <div className={styles.agentsList}>
                <div className={styles.agentsHeader}>
                  <span className={styles.agentName}>Agent</span>
                  <span className={styles.agentSales}>Sales</span>
                  <span className={styles.agentAverage}>Avg Premium</span>
                  <span className={styles.agentTotal}>Total Premium</span>
                </div>
                {dept.agents.map((agent) => (
                  <div key={agent.id} className={styles.agentRow}>
                    <div className={styles.agentInfo}>
                      <span className={styles.agentName}>{agent.name}</span>
                      <span className={styles.agentRole}>{agent.role}</span>
                    </div>
                    <span className={styles.agentSales}>{agent.salesCount}</span>
                    <span className={styles.agentAverage}>
                      {formatCurrency(agent.averagePremium)}
                    </span>
                    <span className={styles.agentTotal}>{formatCurrency(agent.premiumAmount)}</span>
                  </div>
                ))}
                {dept.agents.length === 0 && (
                  <div className={styles.noAgents}>No agents with premium data</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
