'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faExclamationTriangle,
  faUsers,
  faUserPlus,
  faUserMinus,
  faUserCheck,
} from '@fortawesome/free-solid-svg-icons';
import { Role } from '@prisma/client';
import { useAuth } from '@/lib/auth/AuthContext';
import styles from './page.module.css';

// Agent type (consistent with other pages)
type Agent = {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  managerId?: number;
  manager?: { id: number; name: string; role: Role };
};

export default function ManageTeamPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentAuthedUser } = useAuth();
  const managerIdFromParams = params?.id as string; // ID of the manager whose team is being managed

  const [manager, setManager] = useState<Agent | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Agent[]>([]);
  const [potentialMembers, setPotentialMembers] = useState<Agent[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]); // To store all agents fetched

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({}); // For add/remove button loading
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case Role.ADMIN:
        return 'Admin';
      case Role.OFFICE_MANAGER:
        return 'Manager';
      case Role.SALES_LEAD:
        return 'Sales Lead';
      case Role.SERVICE_LEAD:
        return 'Service Lead';
      case Role.SALES:
        return 'Sales Agent';
      case Role.SERVICE:
        return 'Service Agent';
      default:
        return role;
    }
  };

  const fetchData = useCallback(async () => {
    if (!managerIdFromParams || !currentAuthedUser) return;
    setLoading(true);
    setError('');
    try {
      const [managerRes, allAgentsRes] = await Promise.all([
        fetch(`/api/users/${managerIdFromParams}`),
        fetch('/api/users'),
      ]);

      if (!managerRes.ok) throw new Error('Failed to fetch manager details');
      const managerData: Agent = await managerRes.json();
      setManager(managerData);

      if (!allAgentsRes.ok) throw new Error('Failed to fetch all agents');
      const allAgentsData: Agent[] = await allAgentsRes.json();
      setAllAgents(allAgentsData);

      // Authorization check: Must be ADMIN or the manager themselves
      if (
        currentAuthedUser.role !== Role.ADMIN &&
        currentAuthedUser.id.toString() !== managerIdFromParams
      ) {
        setError('You are not authorized to manage this team.');
        setLoading(false);
        return;
      }
      // Manager must have a managerial role
      if (
        !(
          managerData.role === Role.ADMIN ||
          managerData.role === Role.OFFICE_MANAGER ||
          managerData.role === Role.SALES_LEAD ||
          managerData.role === Role.SERVICE_LEAD
        )
      ) {
        setError('This user is not a manager and cannot manage a team.');
        setManager(null); // Clear manager if not a valid role
        setLoading(false);
        return;
      }

      const team = allAgentsData.filter((a) => a.managerId === managerData.id);
      setCurrentTeam(team);

      // Determine potential members based on manager's role
      let potentials: Agent[] = [];

      if (managerData.role === Role.ADMIN) {
        potentials = allAgentsData.filter(
          (a) =>
            a.id !== managerData.id && // Not the manager themselves
            a.managerId !== managerData.id && // Not already in their team
            (a.role === Role.ADMIN ||
              a.role === Role.OFFICE_MANAGER ||
              a.role === Role.SALES_LEAD ||
              a.role === Role.SERVICE_LEAD) && // Eligible roles for an Admin to manage
            (currentAuthedUser.role === Role.ADMIN ? true : !a.managerId) // Admin can re-assign, others (if this case was possible) only see unassigned
        );
      } else if (managerData.role === Role.OFFICE_MANAGER) {
        potentials = allAgentsData.filter(
          (a) =>
            a.id !== managerData.id &&
            a.managerId !== managerData.id &&
            (a.role === Role.SALES_LEAD || a.role === Role.SERVICE_LEAD) && // Office Manager manages Leads
            (currentAuthedUser.role === Role.ADMIN || !a.managerId) // Admin can re-assign; Office Manager managing self only sees unassigned Leads
        );
      } else if (managerData.role === Role.SALES_LEAD) {
        potentials = allAgentsData.filter(
          (a) =>
            a.role === Role.SALES &&
            a.id !== managerData.id && // Not the manager themselves
            a.managerId !== managerData.id && // Not already in their team
            (currentAuthedUser.role === Role.ADMIN || !a.managerId) // Admin can re-assign, Sales Lead managing self only sees unassigned Sales agents
        );
      } else if (managerData.role === Role.SERVICE_LEAD) {
        potentials = allAgentsData.filter(
          (a) =>
            a.role === Role.SERVICE &&
            a.id !== managerData.id &&
            a.managerId !== managerData.id &&
            (currentAuthedUser.role === Role.ADMIN || !a.managerId) // Admin can re-assign, Service Lead managing self only sees unassigned Service agents
        );
      }
      setPotentialMembers(potentials);
    } catch (err: any) {
      setError(err.message || 'Error loading team data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [managerIdFromParams, currentAuthedUser]); // Removed router from deps as it's not used for redirect in this flow anymore

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTeamAction = async (agentToModifyId: number, action: 'add' | 'remove') => {
    if (!manager) return;
    setActionLoading((prev) => ({ ...prev, [`${action}-${agentToModifyId}`]: true }));
    setError('');
    setSuccessMessage('');

    const newManagerId = action === 'add' ? manager.id : null;

    try {
      const response = await fetch(`/api/users/${agentToModifyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: newManagerId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} agent.`);
      }
      setSuccessMessage(
        `Agent ${action === 'add' ? 'added to' : 'removed from'} team successfully.`
      );
      fetchData(); // Refresh data
    } catch (err: any) {
      setError(
        err.message || `An error occurred while ${action === 'add' ? 'adding' : 'removing'} agent.`
      );
      console.error(err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`${action}-${agentToModifyId}`]: false }));
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageLoadingContainer}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" /> <p>Loading team details...</p>
      </div>
    );
  }

  if (error && !manager) {
    // Critical error, e.g. auth failed, manager not found or not a manager
    return (
      <div className={styles.pageErrorContainer}>
        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
        <p>{error}</p>
        <button onClick={() => router.push('/settings/users')} className={styles.btnBack}>
          Back to Agent List
        </button>
      </div>
    );
  }
  if (!manager) {
    // Should be caught by above, but as a fallback if manager is null after loading
    return (
      <div className={styles.pageErrorContainer}>
        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
        <p>Manager details not found or user is not a valid manager.</p>
        <button onClick={() => router.push('/settings/users')} className={styles.btnBack}>
          Back to Agent List
        </button>
      </div>
    );
  }

  return (
    <div className={styles.manageTeamPageContainer}>
      <div className={styles.pageHeader}>
        <button
          onClick={() => router.push(`/settings/agents/${managerIdFromParams}`)}
          className={styles.btnBackIcon}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1>
          Manage Team for: {manager.name}{' '}
          <span
            className={`${styles.roleBadgeHeader} ${styles[manager.role.toLowerCase().replace('_', '')]}`}
          >
            {getRoleDisplayName(manager.role)}
          </span>
        </h1>
      </div>

      {error && (
        <div className={`${styles.alert} ${styles.alertDanger}`}>
          <FontAwesomeIcon icon={faExclamationTriangle} /> {error}{' '}
          <button onClick={() => setError('')} className={styles.closeAlert}>
            &times;
          </button>
        </div>
      )}
      {successMessage && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>{successMessage}</div>
      )}

      <div className={styles.teamManagementLayout}>
        <div className={`${styles.teamSection} ${styles.currentTeamSection}`}>
          <h2>
            <FontAwesomeIcon icon={faUsers} /> Current Team ({currentTeam.length})
          </h2>
          {currentTeam.length > 0 ? (
            <ul className={styles.agentList}>
              {currentTeam.map((agent) => (
                <li key={agent.id}>
                  <div>
                    <strong className={styles.agentName}>{agent.name}</strong> (@{agent.username})
                    <span
                      className={`${styles.roleBadge} ${styles[agent.role.toLowerCase().replace('_', '')]}`}
                    >
                      {getRoleDisplayName(agent.role)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleTeamAction(agent.id, 'remove')}
                    className={`${styles.btnAction} ${styles.btnRemove}`}
                    disabled={actionLoading[`remove-${agent.id}`]}
                  >
                    {actionLoading[`remove-${agent.id}`] ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      <FontAwesomeIcon icon={faUserMinus} />
                    )}{' '}
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No agents currently report to {manager.name}.</p>
          )}
        </div>

        <div className={`${styles.teamSection} ${styles.potentialMembersSection}`}>
          <h2>
            <FontAwesomeIcon icon={faUserPlus} /> Assignable Agents ({potentialMembers.length})
          </h2>
          {potentialMembers.length > 0 ? (
            <ul className={styles.agentList}>
              {potentialMembers.map((agent) => (
                <li key={agent.id}>
                  <div>
                    <strong className={styles.agentName}>{agent.name}</strong> (@{agent.username})
                    <span
                      className={`${styles.roleBadge} ${styles[agent.role.toLowerCase().replace('_', '')]}`}
                    >
                      {getRoleDisplayName(agent.role)}
                    </span>
                    {agent.managerId && allAgents.find((s) => s.id === agent.managerId) && (
                      <span className={styles.currentManagerInfo}>
                        (Reports to: {allAgents.find((s) => s.id === agent.managerId)?.name})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleTeamAction(agent.id, 'add')}
                    className={`${styles.btnAction} ${styles.btnAdd}`}
                    disabled={actionLoading[`add-${agent.id}`]}
                  >
                    {actionLoading[`add-${agent.id}`] ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      <FontAwesomeIcon icon={faUserCheck} />
                    )}{' '}
                    Assign to Team
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No other agents available to assign to {manager.name} based on current filters/roles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
