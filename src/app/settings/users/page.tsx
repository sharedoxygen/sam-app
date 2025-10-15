'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrash,
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faUsers,
  faFilter,
  faDownload,
  faSitemap,
  faList,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import styles from './page.module.css';

// Import new components and utilities
import { Agent, getRoleDisplayName, getRoleColorClass, getRoleIcon } from './utils/roleHelpers';
import { useAgents } from './hooks/useAgents';
import { OrgChart } from './components/OrgChart';

// Form data type for agent creation
type AgentFormData = {
  username: string;
  password?: string;
  confirmPassword?: string;
  name: string;
  email: string;
  role: string;
  managerId: string;
};

export default function AgentsPage() {
  const { user: currentAgent } = useAuth();
  const router = useRouter();
  const { agents, loading, error, setError, deleteAgent } = useAgents();
  const [successMessage, setSuccessMessage] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (currentAgent?.role !== Role.ADMIN) {
      router.push('/dashboard');
    }
  }, [currentAgent, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
  };

  const handleDelete = async (agentId: number) => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.'))
      return;

    const result = await deleteAgent(agentId);
    if (result.success) {
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setError(result.message);
    }
  };

  const getPotentialManagers = (agentRole: string) => {
    return agents.filter((potentialManager) => {
      switch (agentRole) {
        case Role.SALES:
          return potentialManager.role === Role.SALES_LEAD;
        case Role.SERVICE:
          return potentialManager.role === Role.SERVICE_LEAD;
        case Role.SALES_LEAD:
        case Role.SERVICE_LEAD:
          return potentialManager.role === 'OFFICE_MANAGER' || potentialManager.role === Role.ADMIN;
        case 'OFFICE_MANAGER':
          return potentialManager.role === Role.ADMIN;
        default:
          return false;
      }
    });
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.email && agent.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || agent.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleExportAgents = () => {
    const csvHeaders = ['Username', 'Name', 'Email', 'Role', 'Manager', 'Created At'];
    const csvData = filteredAgents.map((agent) => [
      agent.username,
      agent.name,
      agent.email || '',
      getRoleDisplayName(agent.role),
      agent.manager?.name || '',
      new Date(agent.createdAt).toLocaleDateString(),
    ]);
    const csvContent = [csvHeaders, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agents_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const navigateToAgentDetail = (agentId: number) => {
    router.push(`/settings/agents/${agentId}`);
  };

  const handleMouseEnter = (agent: Agent, event: React.MouseEvent) => {
    setHoveredAgent(agent);
    setMousePosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredAgent(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredAgent) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    }
  };

  return (
    <div className={styles.agentManagementContainer}>
      <div className={styles.agentManagementHeader}>
        <div className={styles.headerTitle}>
          <h1>Agent Management</h1>
          <p className={styles.pageSubtitle}>
            Manage your team members and organizational structure
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <FontAwesomeIcon icon={faList} />
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'hierarchy' ? styles.active : ''}`}
              onClick={() => setViewMode('hierarchy')}
              title="Hierarchy View"
            >
              <FontAwesomeIcon icon={faSitemap} />
            </button>
          </div>
          <button className={styles.btnExport} onClick={handleExportAgents}>
            <FontAwesomeIcon icon={faDownload} />
            Export
          </button>
          {(currentAgent?.role === 'ADMIN' || currentAgent?.role === 'OFFICE_MANAGER') && (
            <button className={styles.btnAdd} onClick={() => router.push('/settings/agents/new')}>
              <FontAwesomeIcon icon={faPlus} />
              Add Agent
            </button>
          )}
        </div>
      </div>

      <div className={styles.agentControls}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search agents by name, username, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <FontAwesomeIcon icon={faFilter} className={styles.filterIcon} />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Roles</option>
              <option value={Role.ADMIN}>Administrators</option>
              <option value={Role.SALES_LEAD}>Sales Leads</option>
              <option value={Role.SERVICE_LEAD}>Service Leads</option>
              <option value={Role.SALES}>Sales Agents</option>
              <option value={Role.SERVICE}>Service Agents</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <span>{error}</span>
          <button onClick={() => setError('')} className={styles.closeBtn}>
            &times;
          </button>
        </div>
      )}
      {successMessage && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <FontAwesomeIcon icon={faCheckCircle} />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className={styles.closeBtn}>
            &times;
          </button>
        </div>
      )}

      <div className={styles.mainContent}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" /> <p>Loading agents...</p>
          </div>
        ) : viewMode === 'hierarchy' ? (
          <>
            <OrgChart
              agents={filteredAgents}
              onAgentClick={navigateToAgentDetail}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
            />

            {/* Hover Tooltip */}
            {hoveredAgent && (
              <div
                ref={(el) => {
                  if (el) {
                    el.style.left = `${mousePosition.x + 15}px`;
                    el.style.top = `${mousePosition.y - 10}px`;
                  }
                }}
                className={`${styles.agentTooltip} ${styles.agentTooltipPositioned}`}
              >
                <div className={styles.tooltipContent}>
                  <div className={styles.tooltipHeader}>
                    <FontAwesomeIcon
                      icon={getRoleIcon(hoveredAgent.role)}
                      className={styles.tooltipIcon}
                    />
                    <div>
                      <h4>{hoveredAgent.name}</h4>
                      <p>{getRoleDisplayName(hoveredAgent.role)}</p>
                    </div>
                  </div>
                  <div className={styles.tooltipBody}>
                    <div className={styles.tooltipItem}>
                      <span className={styles.label}>Username:</span>
                      <span className={styles.value}>@{hoveredAgent.username}</span>
                    </div>
                    {hoveredAgent.email && (
                      <div className={styles.tooltipItem}>
                        <span className={styles.label}>Email:</span>
                        <span className={styles.value}>{hoveredAgent.email}</span>
                      </div>
                    )}
                    {hoveredAgent.manager && (
                      <div className={styles.tooltipItem}>
                        <span className={styles.label}>Reports to:</span>
                        <span className={styles.value}>{hoveredAgent.manager.name}</span>
                      </div>
                    )}
                    <div className={styles.tooltipItem}>
                      <span className={styles.label}>Joined:</span>
                      <span className={styles.value}>
                        {new Date(hoveredAgent.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className={styles.tooltipFooter}>
                    <small>Click for details</small>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.agentCardsContainer}>
            <div className={styles.cardsHeader}>
              <h3>Team Members ({filteredAgents.length})</h3>
              {searchTerm && (
                <span className={styles.searchResults}>
                  Showing {filteredAgents.length} of {agents.length} agents
                </span>
              )}
            </div>
            <div className={styles.agentCardsGrid}>
              {filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={styles.agentCard}
                    onClick={() => navigateToAgentDetail(agent.id)}
                  >
                    <div className={styles.agentCardHeader}>
                      <div className={styles.agentCardAvatar}>
                        <FontAwesomeIcon icon={getRoleIcon(agent.role)} />
                      </div>
                      <div className={styles.agentCardInfo}>
                        <h4 className={styles.agentCardName}>{agent.name}</h4>
                        <p className={styles.agentCardUsername}>@{agent.username}</p>
                        <span className={`${styles.roleBadge} ${getRoleColorClass(agent.role)}`}>
                          {getRoleDisplayName(agent.role)}
                        </span>
                      </div>
                      <div className={styles.agentCardStatus}>
                        <div className={`${styles.statusIndicator} ${styles.active}`}></div>
                      </div>
                    </div>
                    <div className={styles.agentCardMeta}>
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Joined</span>
                        <span className={styles.metaValue}>
                          {new Date(agent.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {agent.manager && (
                        <div className={styles.metaItem}>
                          <span className={styles.metaLabel}>Reports to</span>
                          <span className={styles.metaValue}>{agent.manager.name}</span>
                        </div>
                      )}
                    </div>
                    <div className={styles.agentCardActions}>
                      <button
                        className={`${styles.btnCardAction} ${styles.btnDelete}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(agent.id);
                        }}
                        disabled={agent.id === currentAgent?.id}
                        title="Delete Agent"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noAgentsCard}>
                  <div className={styles.noAgentsIcon}>
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                  <h4>No Team Members Found</h4>
                  <p>
                    {searchTerm || filterRole !== 'all'
                      ? 'No agents match your current search criteria.'
                      : 'Get started by adding your first agent.'}
                  </p>
                  <button
                    className={styles.btnAddFirst}
                    onClick={() => router.push('/settings/agents/new')}
                  >
                    <FontAwesomeIcon icon={faPlus} /> Add First Agent
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
