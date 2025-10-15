'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faEdit,
  faSave,
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faUserTie,
  faUsers,
  faUser,
  faSitemap,
  faEnvelope,
  faIdCard,
  faCalendarPlus,
  faClock,
  faBuilding,
  faChartBar,
  faUserCircle,
  faKey,
  faLock,
} from '@fortawesome/free-solid-svg-icons';
import { Role } from '@prisma/client'; // Assuming Role enum is accessible
import { useAuth } from '@/lib/auth/AuthContext'; // For manager checks if needed, or current user context
import { UserApi, User } from '@/lib/api/apiService'; // Use centralized API
import styles from './page.module.css';

// Form data type for agent editing
type AgentFormData = {
  username: string;
  name: string;
  email: string;
  role: string;
  managerId: string;
  password?: string; // Optional: for changing password
  confirmPassword?: string;
};

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentAuthedUser } = useAuth();
  const agentId = params?.id as string; // Ensure agentId is string

  const [agent, setAgent] = useState<User | null>(null);
  const [directReports, setDirectReports] = useState<User[]>([]);
  const [allAgentsForManagerDropdown, setAllAgentsForManagerDropdown] = useState<User[]>([]); // Renamed for clarity
  const [formData, setFormData] = useState<AgentFormData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Helper functions (copied from original users/page.tsx for now)
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case Role.ADMIN:
        return 'Administrator';
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case Role.ADMIN:
        return faUserTie;
      case Role.SALES_LEAD:
      case Role.SERVICE_LEAD:
        return faUsers;
      default:
        return faUser;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case Role.ADMIN:
        return '#dc3545'; // Red
      case Role.SALES_LEAD:
        return '#007bff'; // Blue
      case Role.SERVICE_LEAD:
        return '#28a745'; // Green
      case Role.SALES:
        return '#17a2b8'; // Cyan
      case Role.SERVICE:
        return '#6f42c1'; // Purple
      case Role.OFFICE_MANAGER:
        return '#fd7e14'; // Orange
      default:
        return '#6c757d'; // Gray
    }
  };

  // Determine based on role if manager assignment can be assigned. Simplified logic.
  const needsManager = (role: string) => {
    return ![Role.ADMIN as string].includes(role);
  };

  // Determine if current user can edit the agent (simplified logic)
  const canEdit = useCallback(() => {
    if (!currentAuthedUser || !agent) return false;
    return (
      currentAuthedUser.role === Role.ADMIN ||
      parseInt(currentAuthedUser.id as string, 10) === agent.id ||
      (currentAuthedUser.role === Role.SALES_LEAD &&
        agent.managerId === parseInt(currentAuthedUser.id as string, 10)) ||
      (currentAuthedUser.role === Role.SERVICE_LEAD &&
        agent.managerId === parseInt(currentAuthedUser.id as string, 10))
    );
  }, [currentAuthedUser, agent]);

  // Check if the current agent is a manager-type role
  const canManageTeam = useCallback(() => {
    if (!agent) return false;
    return [Role.ADMIN as string, Role.SALES_LEAD as string, Role.SERVICE_LEAD as string].includes(
      agent.role
    );
  }, [agent]);

  // Navigate to manage team page
  const handleManageTeam = () => {
    if (agent?.id) {
      router.push(`/settings/agents/${agent.id}/manage-team`);
    }
  };

  // Define potential managers based on role
  const getPotentialManagers = (agentRole: string) => {
    return allAgentsForManagerDropdown.filter((potentialManager) => {
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

  // Fetch agent details and all agents (for manager list)
  useEffect(() => {
    if (!agentId) {
      setError('Agent ID not found.');
      setLoading(false);
      return;
    }
    // Ensure currentAuthedUser is loaded before proceeding if auth checks are critical early
    if (!currentAuthedUser) {
      setLoading(true); // Or show a specific loading state for auth
      return;
    }

    const fetchAgentData = async () => {
      setLoading(true);
      try {
        const agentData = await UserApi.getUser(parseInt(agentId));
        if (!agentData) throw new Error('Agent not found');

        setAgent(agentData);
        setFormData({
          username: agentData.username,
          name: agentData.name,
          email: agentData.email || '',
          role: agentData.role,
          managerId: agentData.managerId?.toString() || '',
        });

        // Fetch all agents for manager dropdown AND for finding direct reports
        const allAgentsData = await UserApi.getUsers();
        setAllAgentsForManagerDropdown(allAgentsData);

        // Filter for direct reports if the current agent is a manager type
        if (
          agentData.role === Role.ADMIN ||
          agentData.role === Role.SALES_LEAD ||
          agentData.role === Role.SERVICE_LEAD
        ) {
          const reports = allAgentsData.filter((a) => a.managerId === agentData.id);
          setDirectReports(reports);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading agent data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId, currentAuthedUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
    // If role changes, reset managerId as potential managers might change
    if (name === 'role' && formData) {
      setFormData((prev) => (prev ? { ...prev, managerId: '' } : null));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !agent) return;
    if (
      currentAuthedUser?.role !== Role.ADMIN &&
      currentAuthedUser?.id !== agent.id &&
      currentAuthedUser?.id !== agent.managerId
    ) {
      setError('You are not authorized to perform this action.');
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setFormLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const updateData: any = {
        username: formData.username,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        managerId: formData.managerId ? parseInt(formData.managerId) : null,
      };

      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }

      const updatedAgent = await UserApi.updateUser(agent.id, updateData);
      setAgent(updatedAgent);
      setSuccessMessage('Agent updated successfully.');
      setIsEditing(false);

      // Clear password fields after save
      setFormData((prev) =>
        prev
          ? {
              ...prev,
              password: '',
              confirmPassword: '',
            }
          : null
      );
    } catch (err: any) {
      setError(err.message || 'Error updating agent.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (!agent) return;

    setFormData({
      username: agent.username,
      name: agent.name,
      email: agent.email || '',
      role: agent.role,
      managerId: agent.managerId?.toString() || '',
      password: '',
      confirmPassword: '',
    });
    setIsEditing(false);
    setError('');
  };

  const getPotentialManagersForCurrentRole = () => {
    if (!formData) return [];
    return getPotentialManagers(formData.role);
  };

  const RoleStats = () => {
    if (directReports.length === 0 || !canManageTeam()) {
      return null;
    }

    const salesCount = directReports.filter((rep) => rep.role === Role.SALES).length;
    const serviceCount = directReports.filter((rep) => rep.role === Role.SERVICE).length;
    const leadCount = directReports.filter(
      (rep) => rep.role === Role.SALES_LEAD || rep.role === Role.SERVICE_LEAD
    ).length;

    return (
      <div className={styles.teamOverviewCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIconContainer}>
            <FontAwesomeIcon icon={faSitemap} className={styles.cardIcon} />
          </div>
          <div className={styles.cardTitleSection}>
            <h3 className={styles.cardTitle}>Team Overview</h3>
            <p className={styles.cardSubtitle}>Performance and structure insights</p>
          </div>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{directReports.length}</span>
              <span className={styles.statLabel}>Direct Reports</span>
            </div>
          </div>
          {salesCount > 0 && (
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <FontAwesomeIcon icon={faChartBar} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{salesCount}</span>
                <span className={styles.statLabel}>Sales Agents</span>
              </div>
            </div>
          )}
          {serviceCount > 0 && (
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <FontAwesomeIcon icon={faUser} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{serviceCount}</span>
                <span className={styles.statLabel}>Service Agents</span>
              </div>
            </div>
          )}
          {leadCount > 0 && (
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <FontAwesomeIcon icon={faUserTie} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statValue}>{leadCount}</span>
                <span className={styles.statLabel}>Team Leads</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.pageLoadingContainer}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading agent details...</p>
      </div>
    );
  }

  if (!agent || !formData) {
    return (
      <div className={styles.pageErrorContainer}>
        <FontAwesomeIcon icon={faExclamationTriangle} size="2x" />
        <p>Agent data could not be loaded or form data is missing.</p>
        <button onClick={() => router.push('/settings/users')} className={styles.btnBack}>
          Back to Agent List
        </button>
      </div>
    );
  }

  return (
    <div className={styles.agentDetailPageContainer}>
      {/* Modern Header */}
      <div className={styles.modernPageHeader}>
        <div className={styles.headerLeft}>
          <button onClick={() => router.push('/settings/users')} className={styles.btnBackModern}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div className={styles.headerInfo}>
            <h1 className={styles.pageTitle}>Agent Profile</h1>
            <p className={styles.pageSubtitle}>{agent.name}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {!isEditing && canEdit() && (
            <button
              onClick={() => {
                // Ensure form data is re-initialized with latest agent data before editing
                setFormData({
                  username: agent.username,
                  name: agent.name,
                  email: agent.email || '',
                  role: agent.role,
                  managerId: agent.managerId?.toString() || '',
                  password: '',
                  confirmPassword: '',
                });
                setIsEditing(true);
              }}
              className={styles.btnAction}
              disabled={formLoading}
            >
              <FontAwesomeIcon icon={faEdit} /> Edit Agent
            </button>
          )}
          {!isEditing && canManageTeam() && (
            <button
              onClick={handleManageTeam}
              className={`${styles.btnAction} ${styles.btnSecondary}`}
              disabled={formLoading}
            >
              <FontAwesomeIcon icon={faUsers} /> Manage Team
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className={styles.alertError}>
          <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
          <button onClick={() => setError('')} className={styles.closeAlert}>
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className={styles.alertSuccess}>
          <FontAwesomeIcon icon={faCheckCircle} /> {successMessage}
          <button onClick={() => setSuccessMessage('')} className={styles.closeAlert}>
            &times;
          </button>
        </div>
      )}

      <div className={styles.modernContentLayout}>
        {!isEditing ? (
          <>
            {/* Agent Info Card */}
            <div className={styles.agentInfoCard}>
              <div className={styles.cardHeader}>
                <div className={styles.agentProfileSection}>
                  <div
                    className={styles.agentAvatar}
                    ref={(el) => {
                      if (el) {
                        el.style.setProperty('--role-color', getRoleColor(agent.role));
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faUserCircle} />
                  </div>
                  <div className={styles.agentMeta}>
                    <h2 className={styles.agentName}>{agent.name}</h2>
                    <div
                      className={styles.roleBadgeModern}
                      ref={(el) => {
                        if (el) {
                          el.style.setProperty('--role-color', getRoleColor(agent.role));
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={getRoleIcon(agent.role)} />
                      {getRoleDisplayName(agent.role)}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.infoGridModern}>
                <div className={styles.infoItemModern}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                  <div className={styles.infoContent}>
                    <span className={styles.infoLabel}>Username</span>
                    <span className={styles.infoValue}>{agent.username}</span>
                  </div>
                </div>

                <div className={styles.infoItemModern}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </div>
                  <div className={styles.infoContent}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{agent.email || 'Not provided'}</span>
                  </div>
                </div>

                {agent.manager && (
                  <div className={styles.infoItemModern}>
                    <div className={styles.infoIcon}>
                      <FontAwesomeIcon icon={faBuilding} />
                    </div>
                    <div className={styles.infoContent}>
                      <span className={styles.infoLabel}>Reports To</span>
                      <span className={styles.infoValue}>{agent.manager.name}</span>
                    </div>
                  </div>
                )}

                <div className={styles.infoItemModern}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faCalendarPlus} />
                  </div>
                  <div className={styles.infoContent}>
                    <span className={styles.infoLabel}>Created</span>
                    <span className={styles.infoValue}>
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className={styles.infoItemModern}>
                  <div className={styles.infoIcon}>
                    <FontAwesomeIcon icon={faClock} />
                  </div>
                  <div className={styles.infoContent}>
                    <span className={styles.infoLabel}>Last Updated</span>
                    <span className={styles.infoValue}>
                      {new Date(agent.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Overview */}
            {RoleStats()}

            {/* Direct Reports */}
            {directReports.length > 0 && (
              <div className={styles.directReportsCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconContainer}>
                    <FontAwesomeIcon icon={faUsers} className={styles.cardIcon} />
                  </div>
                  <div className={styles.cardTitleSection}>
                    <h3 className={styles.cardTitle}>Direct Reports ({directReports.length})</h3>
                    <p className={styles.cardSubtitle}>Team members reporting to this agent</p>
                  </div>
                </div>
                <div className={styles.reportsGrid}>
                  {directReports.map((report) => (
                    <div
                      key={report.id}
                      className={styles.reportCard}
                      onClick={() => router.push(`/settings/agents/${report.id}`)}
                    >
                      <div
                        className={styles.reportAvatar}
                        ref={(el) => {
                          if (el) {
                            el.style.setProperty('--role-color', getRoleColor(report.role));
                          }
                        }}
                      >
                        <FontAwesomeIcon icon={getRoleIcon(report.role)} />
                      </div>
                      <div className={styles.reportInfo}>
                        <span className={styles.reportName}>{report.name}</span>
                        <span
                          className={styles.reportRole}
                          ref={(el) => {
                            if (el) {
                              el.style.setProperty('--role-color', getRoleColor(report.role));
                            }
                          }}
                        >
                          {getRoleDisplayName(report.role)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.editFormCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconContainer}>
                <FontAwesomeIcon icon={faEdit} className={styles.cardIcon} />
              </div>
              <div className={styles.cardTitleSection}>
                <h3 className={styles.cardTitle}>Edit Agent Details</h3>
                <p className={styles.cardSubtitle}>Update agent information and settings</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.modernForm}>
              <div className={styles.formGridModern}>
                <div className={styles.formGroupModern}>
                  <label htmlFor="name" className={styles.formLabel}>
                    <FontAwesomeIcon icon={faUser} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className={styles.formGroupModern}>
                  <label htmlFor="username" className={styles.formLabel}>
                    <FontAwesomeIcon icon={faIdCard} />
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div className={styles.formGroupModern}>
                  <label htmlFor="email" className={styles.formLabel}>
                    <FontAwesomeIcon icon={faEnvelope} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Enter email address"
                  />
                </div>

                <div className={styles.formGroupModern}>
                  <label htmlFor="role" className={styles.formLabel}>
                    <FontAwesomeIcon icon={faUserTie} />
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className={styles.formSelect}
                    required
                  >
                    {Object.values(Role).map(
                      (roleValue) =>
                        (currentAuthedUser?.role === Role.ADMIN || roleValue !== Role.ADMIN) && (
                          <option key={roleValue} value={roleValue}>
                            {getRoleDisplayName(roleValue)}
                          </option>
                        )
                    )}
                  </select>
                </div>

                {needsManager(formData.role) && (
                  <div className={styles.formGroupModern}>
                    <label htmlFor="managerId" className={styles.formLabel}>
                      <FontAwesomeIcon icon={faBuilding} />
                      Manager
                    </label>
                    <select
                      id="managerId"
                      name="managerId"
                      value={formData.managerId}
                      onChange={handleInputChange}
                      className={styles.formSelect}
                    >
                      <option value="">Select a manager</option>
                      {getPotentialManagersForCurrentRole().map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name} ({getRoleDisplayName(manager.role)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={styles.formGroupModern}>
                  <label htmlFor="password" className={styles.formLabel}>
                    <FontAwesomeIcon icon={faKey} />
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password || ''}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Enter new password"
                  />
                </div>

                <div className={styles.formGroupModern}>
                  <label htmlFor="confirmPassword" className={styles.formLabel}>
                    <FontAwesomeIcon icon={faLock} />
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword || ''}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className={styles.btnCancel}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.btnSave} disabled={formLoading}>
                  {formLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
