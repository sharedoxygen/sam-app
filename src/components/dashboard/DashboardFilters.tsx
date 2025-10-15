'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faUser,
  faBuilding,
  faCheck,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import styles from './DashboardFilters.module.css';

export type ViewGranularity = 'day' | 'week' | 'month' | 'year';
export type Department = 'all' | 'sales' | 'service';

export interface DashboardFilters {
  viewBy: ViewGranularity;
  agentIds: number[];
  department: Department;
}

interface Agent {
  id: number;
  name: string;
  role: string;
  department: 'sales' | 'service';
}

interface DashboardFiltersProps {
  onFiltersChange: (filters: DashboardFilters) => void;
  initialFilters?: DashboardFilters;
  isManager?: boolean;
  userRole?: string;
}

export default function DashboardFilters({
  onFiltersChange,
  initialFilters = {
    viewBy: 'week',
    agentIds: [],
    department: 'all',
  },
  isManager = false,
  userRole,
}: DashboardFiltersProps) {
  const getDepartmentForRole = (role?: string): Department => {
    if (role === 'SALES_LEAD') return 'sales';
    if (role === 'SERVICE_LEAD') return 'service';
    return initialFilters.department;
  };

  const getInitialFilters = (): DashboardFilters => {
    const roleDepartment = getDepartmentForRole(userRole);
    return {
      ...initialFilters,
      department: roleDepartment,
    };
  };

  const [filters, setFilters] = useState<DashboardFilters>(getInitialFilters());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [agentSearchTerm, setAgentSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const canChangeDepartment = userRole === 'ADMIN' || userRole === 'OFFICE_MANAGER';

  const getDepartmentDisplayName = (department: Department): string => {
    switch (department) {
      case 'sales':
        return 'Sales Department';
      case 'service':
        return 'Service Department';
      default:
        return 'All Departments';
    }
  };

  useEffect(() => {
    if (isManager) {
      fetchAgents();
    }
  }, [isManager]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/team');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewByChange = (viewBy: ViewGranularity) => {
    setFilters((prev) => ({ ...prev, viewBy }));
  };

  const handleDepartmentChange = (department: Department) => {
    if (!canChangeDepartment) return;

    setFilters((prev) => ({
      ...prev,
      department,
      agentIds: [],
    }));
  };

  const toggleAgent = (agentId: number) => {
    setFilters((prev) => ({
      ...prev,
      agentIds: prev.agentIds.includes(agentId)
        ? prev.agentIds.filter((id) => id !== agentId)
        : [...prev.agentIds, agentId],
    }));
  };

  const clearAgentSelection = () => {
    setFilters((prev) => ({ ...prev, agentIds: [] }));
  };

  const selectAllAgents = () => {
    const filteredAgents = getFilteredAgents();
    setFilters((prev) => ({
      ...prev,
      agentIds: filteredAgents.map((agent) => agent.id),
    }));
  };

  const getFilteredAgents = () => {
    let filtered = agents;

    if (filters.department !== 'all') {
      filtered = filtered.filter((agent) => agent.department === filters.department);
    }

    if (agentSearchTerm) {
      filtered = filtered.filter((agent) =>
        agent.name.toLowerCase().includes(agentSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getSelectedAgentNames = () => {
    const selectedAgents = agents.filter((agent) => filters.agentIds.includes(agent.id));
    if (selectedAgents.length === 0) return 'All Agents';
    if (selectedAgents.length === 1) return selectedAgents[0].name;
    return `${selectedAgents.length} agents selected`;
  };

  const viewOptions: { value: ViewGranularity; label: string; icon: string; tooltip: string }[] = [
    {
      value: 'day',
      label: 'Daily',
      icon: 'D',
      tooltip: 'Daily aggregation - Auto sets current week range',
    },
    {
      value: 'week',
      label: 'Weekly',
      icon: 'W',
      tooltip: 'Weekly aggregation - Auto sets current month range',
    },
    {
      value: 'month',
      label: 'Monthly',
      icon: 'M',
      tooltip: 'Monthly aggregation - Auto sets 6 month range',
    },
    {
      value: 'year',
      label: 'Yearly',
      icon: 'Y',
      tooltip: 'Yearly aggregation - Auto sets full data range',
    },
  ];

  const departmentOptions: { value: Department; label: string }[] = [
    { value: 'all', label: 'All Departments' },
    { value: 'sales', label: 'Sales Team' },
    { value: 'service', label: 'Service Team' },
  ];

  return (
    <div className={styles.dashboardFilters}>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>
          <FontAwesomeIcon icon={faCalendarDays} />
          <span>View By</span>
        </label>
        <div className={styles.viewToggle}>
          {viewOptions.map((option) => (
            <button
              key={option.value}
              className={`${styles.viewOption} ${filters.viewBy === option.value ? styles.active : ''}`}
              onClick={() => handleViewByChange(option.value)}
              title={option.tooltip}
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>

      {isManager && (
        <>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <FontAwesomeIcon icon={faBuilding} />
              <span>Department</span>
            </label>
            {canChangeDepartment ? (
              <select
                className={styles.filterSelect}
                value={filters.department}
                onChange={(e) => handleDepartmentChange(e.target.value as Department)}
              >
                {departmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className={styles.departmentDisplay}>
                {getDepartmentDisplayName(filters.department)}
              </div>
            )}
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <FontAwesomeIcon icon={faUser} />
              <span>Agent</span>
            </label>
            <div className={styles.agentSelector}>
              <button
                className={styles.agentDropdownToggle}
                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
              >
                <span>{getSelectedAgentNames()}</span>
                <FontAwesomeIcon icon={faChevronDown} />
              </button>

              {showAgentDropdown && (
                <div className={styles.agentDropdown}>
                  <div className={styles.agentDropdownHeader}>
                    <input
                      type="text"
                      placeholder="Search agents..."
                      value={agentSearchTerm}
                      onChange={(e) => setAgentSearchTerm(e.target.value)}
                      className={styles.agentSearchInput}
                    />
                    <div className={styles.agentDropdownActions}>
                      <button
                        className={`${styles.agentActionBtn} ${styles.selectAll}`}
                        onClick={selectAllAgents}
                      >
                        Select All
                      </button>
                      <button
                        className={`${styles.agentActionBtn} ${styles.clear}`}
                        onClick={clearAgentSelection}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className={styles.agentList}>
                    {loading ? (
                      <div className={styles.loadingState}>Loading agents...</div>
                    ) : getFilteredAgents().length === 0 ? (
                      <div className={styles.emptyState}>No agents found</div>
                    ) : (
                      getFilteredAgents().map((agent) => (
                        <button
                          key={agent.id}
                          className={styles.agentItem}
                          onClick={() => toggleAgent(agent.id)}
                        >
                          <div
                            className={`${styles.agentCheckbox} ${filters.agentIds.includes(agent.id) ? styles.checked : ''}`}
                          >
                            {filters.agentIds.includes(agent.id) && (
                              <FontAwesomeIcon icon={faCheck} />
                            )}
                          </div>
                          <div className={styles.agentInfo}>
                            <div className={styles.agentName}>{agent.name}</div>
                            <div className={styles.agentRole}>{agent.role}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
